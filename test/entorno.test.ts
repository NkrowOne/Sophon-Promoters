import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { revisarEntorno } from "../lib/entorno.ts";
import { esOperador, usaNombreAntiguo } from "../lib/operador.ts";

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

// `PIMIENTA_OTP` salió de aquí al pasar a derivarse: ver `lib/secretos.ts`.
const ESENCIALES = ["DATABASE_URL", "TELEGRAM_BOT_TOKEN", "CLAVE_CIFRADO"];

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
  TELEGRAM_OPERADOR_ID: "1",
  CRON_SECRET: "s",
  SMTP_HOST: "smtp.example.com",
  SOPHON_EMAIL: "a@example.com",
  SOPHON_PASSWORD: "x",
  // 12 caracteres es el mínimo con el que la clave del Operador cuenta como
  // puesta. Por debajo se ignora entera, así que aquí tiene que ir una válida.
  CLAVE_OPERADOR: "clave-de-doce-o-mas",
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
    con({ ...COMPLETO, DATABASE_URL: "   " }, () => {
      assert.equal(revisarEntorno().faltanEsenciales.length, 1);
    });
  });

  it("lo de función no contamina lo esencial", () => {
    // Esta es la distinción de la que depende que el contenedor arranque: sin
    // SMTP no se puede dar de alta a nadie nuevo, pero los agentes que ya
    // existen siguen viendo su dinero. Tratarlo como esencial dejaría la
    // aplicación caída por una pieza que solo se usa una vez por agente.
    con({ ...COMPLETO, SMTP_HOST: undefined, SOPHON_EMAIL: undefined }, () => {
      const r = revisarEntorno();
      assert.deepEqual(r.faltanEsenciales, []);
      assert.equal(r.faltanDeFuncion.length, 2);
    });
  });

  it("la clave del Operador demasiado corta se reporta como apagada", () => {
    /*
     * Es el caso que motivó meterla aquí. Sin este aviso, una clave mal puesta
     * en el panel de despliegue se comporta EXACTAMENTE igual que una clave mal
     * tecleada: el campo contesta «formato de correo no válido» y ya. No hay
     * forma de distinguir «me he equivocado al escribir» de «la variable no
     * está», y se pierde una tarde buscando en el sitio equivocado.
     *
     * Y va en «de función» y no en «esencial» porque sin ella el panel sigue
     * teniendo su otra puerta: tirar el arranque por esto sería peor.
     */
    con({ ...COMPLETO, CLAVE_OPERADOR: "corta" }, () => {
      const r = revisarEntorno();
      assert.deepEqual(r.faltanEsenciales, []);
      assert.equal(r.faltanDeFuncion.length, 1);
      assert.match(r.faltanDeFuncion[0] ?? "", /CLAVE_OPERADOR/);
      assert.match(r.faltanDeFuncion[0] ?? "", /12/);
    });
  });

  it("y sin declarar también, en vez de callarse", () => {
    con({ ...COMPLETO, CLAVE_OPERADOR: undefined }, () => {
      const r = revisarEntorno();
      assert.equal(r.faltanDeFuncion.length, 1);
      assert.match(r.faltanDeFuncion[0] ?? "", /CLAVE_OPERADOR/);
    });
  });
});

/**
 * El nombre de la variable del Operador cambió, y el valor no vive aquí.
 *
 * `TELEGRAM_SUPERADMIN_ID` pasó a `TELEGRAM_OPERADOR_ID` al renombrar el rol.
 * Renombrarla en el código y ya está tenía un problema que no se ve desde el
 * repositorio: **el valor está en el panel de Skyway**. Un despliegue con el
 * nombre nuevo en el código y el viejo en el panel deja al Operador sin panel,
 * sin comandos del bot y sin avisos de retiro —y los tres fallan EN SILENCIO:
 * el bot ignora el comando y el panel contesta «sesión requerida»—.
 *
 * De ahí el respaldo. Y de ahí que se avise al arrancar: un respaldo que no se
 * cuenta se queda para siempre.
 */
describe("el nombre antiguo de la variable del Operador", () => {
  const OPERADOR = "1234567890";
  const OTRO = "9999999999";

  it("vale el nombre nuevo", () => {
    con({ ...COMPLETO, TELEGRAM_OPERADOR_ID: OPERADOR }, () => {
      assert.equal(esOperador(Number(OPERADOR)), true);
      assert.equal(usaNombreAntiguo(), false);
    });
  });

  it("vale el antiguo, y se avisa de que es de transición", () => {
    con({ ...COMPLETO, TELEGRAM_OPERADOR_ID: undefined, TELEGRAM_SUPERADMIN_ID: OPERADOR }, () => {
      assert.equal(esOperador(Number(OPERADOR)), true, "un despliegue sin actualizar sigue entrando");
      assert.deepEqual(revisarEntorno().faltanDeFuncion, [], "no puede contarse como que falta");
      assert.equal(usaNombreAntiguo(), true, "y tiene que poder avisarse");
    });
  });

  it("el nuevo MANDA sobre el antiguo", () => {
    // Si alguien pone los dos con valores distintos, gana el nuevo: es el que
    // se ha escrito a propósito.
    con({ ...COMPLETO, TELEGRAM_OPERADOR_ID: OPERADOR, TELEGRAM_SUPERADMIN_ID: OTRO }, () => {
      assert.equal(esOperador(Number(OPERADOR)), true);
      assert.equal(esOperador(Number(OTRO)), false);
    });
  });

  it("sin ninguno de los dos, no hay Operador y se dice", () => {
    con({ ...COMPLETO, TELEGRAM_OPERADOR_ID: undefined }, () => {
      assert.equal(esOperador(Number(OPERADOR)), false, "sin declarar, nadie es Operador");
      assert.equal(revisarEntorno().faltanDeFuncion.length, 1);
    });
  });

  it("la comparación es en TEXTO, no en número", () => {
    // Un id de Telegram cabe en un bigint pero no siempre en el entero seguro
    // de JavaScript. Compararlo como número metería un redondeo en un control
    // de acceso, que es el peor sitio posible para uno.
    const grande = "9007199254740993"; // Number.MAX_SAFE_INTEGER + 2
    con({ ...COMPLETO, TELEGRAM_OPERADOR_ID: grande }, () => {
      assert.equal(esOperador(BigInt(grande)), true);
      assert.equal(esOperador(BigInt("9007199254740992")), false, "un vecino no puede colarse");
    });
  });
});
