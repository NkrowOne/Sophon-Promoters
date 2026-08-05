import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { revisarEntorno } from "../lib/entorno.ts";

/**
 * La revisión del entorno, que ahora decide si el proceso arranca.
 *
 * Existe porque cada variable se leía donde hacía falta y su ausencia aparecía
 * en el peor momento posible: `PIMIENTA_OTP` en mitad de un alta,
 * `CLAVE_CIFRADO` al pulsar «solicitar retiro». Un despliegue incompleto
 * arrancaba verde y fallaba días después, sobre un usuario real.
 *
 * Lo que se comprueba aquí no es que `process.env` funcione, sino las dos
 * decisiones que hacen útil la revisión: que **el formato** cuente tanto como
 * la presencia —una clave de 31 bytes pasa cualquier `if (!clave)` y revienta
 * en el primer cifrado— y que **esencial y de función no se mezclen**, porque
 * de esa distinción depende que el contenedor se niegue a arrancar o solo lo
 * avise.
 */

const ESENCIALES = ["DATABASE_URL", "TELEGRAM_BOT_TOKEN", "CLAVE_CIFRADO", "PIMIENTA_OTP"];

/** Deja el entorno en un estado conocido y lo restaura al terminar. */
function con(entorno: Record<string, string | undefined>, fn: () => void): void {
  const previo = { ...process.env };
  try {
    for (const clave of Object.keys(process.env)) {
      if (clave.startsWith("SOPHON_") || clave.startsWith("TELEGRAM_")) delete process.env[clave];
    }
    for (const c of [...ESENCIALES, "APP_URL", "CRON_SECRET", "SMTP_HOST"]) delete process.env[c];
    // Asignando en bloque, un `undefined` acaba escribiendo la CADENA
    // "undefined" en `process.env` —Node convierte todo a texto—, con lo que la
    // variable que se quería quitar se quedaba puesta y con valor. Es el motivo
    // por el que hay que borrar clave a clave.
    for (const [clave, valor] of Object.entries(entorno)) {
      if (valor === undefined) delete process.env[clave];
      else process.env[clave] = valor;
    }
    fn();
  } finally {
    for (const clave of Object.keys(process.env)) delete process.env[clave];
    Object.assign(process.env, previo);
  }
}

const CLAVE_BUENA = Buffer.alloc(32, 3).toString("base64");

const COMPLETO = {
  DATABASE_URL: "postgresql://x:x@localhost:5432/x",
  TELEGRAM_BOT_TOKEN: "123:abc",
  CLAVE_CIFRADO: CLAVE_BUENA,
  PIMIENTA_OTP: "pimienta",
  APP_URL: "https://promoters.example.com",
  TELEGRAM_WEBHOOK_SECRET: "s",
  TELEGRAM_SUPERADMIN_ID: "1",
  CRON_SECRET: "s",
  SMTP_HOST: "smtp.example.com",
  SOPHON_EMAIL: "a@example.com",
  SOPHON_PASSWORD: "x",
};

describe("revisión del entorno", () => {
  it("con todo puesto no falta nada", () => {
    con(COMPLETO, () => {
      const r = revisarEntorno();
      assert.deepEqual(r.faltanEsenciales, []);
      assert.deepEqual(r.faltanDeFuncion, []);
    });
  });

  it("cada esencial que falta se reporta con lo que deja de funcionar", () => {
    for (const clave of ESENCIALES) {
      con({ ...COMPLETO, [clave]: undefined }, () => {
        const r = revisarEntorno();
        assert.equal(r.faltanEsenciales.length, 1, `${clave} debería faltar`);
        assert.ok(r.faltanEsenciales[0]?.startsWith(clave));
        // El mensaje dice QUÉ se pierde, no solo el nombre: un log que solo
        // nombra la variable obliga a ir a buscar para qué era.
        assert.ok(
          (r.faltanEsenciales[0]?.length ?? 0) > clave.length + 20,
          "el aviso tiene que explicar qué deja de funcionar",
        );
      });
    }
  });

  it("una clave de cifrado del tamaño equivocado cuenta como que falta", () => {
    // 31 bytes: pasa cualquier comprobación de presencia y revienta en el
    // primer `createCipheriv`, o sea en el primer retiro que alguien pida.
    con({ ...COMPLETO, CLAVE_CIFRADO: Buffer.alloc(31, 1).toString("base64") }, () => {
      const r = revisarEntorno();
      assert.equal(r.faltanEsenciales.length, 1);
      assert.match(r.faltanEsenciales[0] ?? "", /CLAVE_CIFRADO/);
      assert.match(r.faltanEsenciales[0] ?? "", /31 bytes/);
    });
  });

  it("lo blanco no cuenta como puesto", () => {
    // Un panel de despliegue con la casilla vacía deja la variable definida y
    // con espacios. Sin `trim`, eso pasaría por buena y fallaría más adelante.
    con({ ...COMPLETO, PIMIENTA_OTP: "   " }, () => {
      assert.equal(revisarEntorno().faltanEsenciales.length, 1);
    });
  });

  it("lo de función no contamina lo esencial", () => {
    // Esta es la distinción de la que depende que el contenedor arranque: sin
    // SMTP no se puede dar de alta a nadie nuevo, pero los agentes que ya
    // existen siguen viendo su dinero. Tratarlo como esencial dejaría la
    // aplicación caída por una pieza que solo se usa una vez por agente.
    con({ ...COMPLETO, SMTP_HOST: undefined, CRON_SECRET: undefined }, () => {
      const r = revisarEntorno();
      assert.deepEqual(r.faltanEsenciales, []);
      assert.equal(r.faltanDeFuncion.length, 2);
    });
  });
});
