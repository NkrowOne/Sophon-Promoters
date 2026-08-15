import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pimientaOtp, secretoCron, secretoWebhook } from "../lib/secretos.ts";

/**
 * Los secretos que la aplicación deriva en vez de pedir.
 *
 * `PIMIENTA_OTP`, `TELEGRAM_WEBHOOK_SECRET` y `CRON_SECRET` eran tres variables
 * de entorno más, y las dos últimas fallaban **en silencio** cuando faltaban:
 * sin la del webhook, `/api/bot` respondía 503 a Telegram y el bot quedaba mudo
 * sin un solo error que mirar —el fallo consiste precisamente en que no llega
 * ninguna petición—; sin la del cron, los barridos respondían 503 y nadie
 * devengaba nada mientras el panel enseñaba ceros con toda normalidad.
 *
 * Lo que se fija aquí no es que HMAC funcione, sino las tres decisiones del
 * envoltorio, que son las que pueden estar mal sin que nada avise:
 *
 *  1. Lo declarado MANDA: un despliegue que ya tiene su valor no cambia de
 *     comportamiento, y sus OTP en vuelo siguen valiendo.
 *  2. Cada uso sale de una raíz distinta y con etiqueta distinta, así que
 *     conocer uno no ayuda a adivinar los demás.
 *  3. Es DETERMINISTA: la misma raíz da el mismo secreto en cada arranque y en
 *     cada réplica. Si no lo fuera, el bot dejaría de reconocer a Telegram al
 *     reiniciar el contenedor.
 */

const CLAVE = Buffer.alloc(32, 9).toString("base64");
const TOKEN = "123456:AAH-fake-bot-token";

function con(entorno: Record<string, string | undefined>, fn: () => void): void {
  const previo = { ...process.env };
  try {
    for (const c of ["CLAVE_CIFRADO", "PIMIENTA_OTP", "TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET", "CRON_SECRET"]) {
      delete process.env[c];
    }
    for (const [k, v] of Object.entries(entorno)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fn();
  } finally {
    for (const k of Object.keys(process.env)) delete process.env[k];
    Object.assign(process.env, previo);
  }
}

describe("secretos derivados", () => {
  it("lo declarado manda, y se devuelve tal cual", () => {
    // Es lo que garantiza que un despliegue ya configurado no cambie de
    // comportamiento al desplegar esto.
    con({ CLAVE_CIFRADO: CLAVE, TELEGRAM_BOT_TOKEN: TOKEN, PIMIENTA_OTP: "la-mia", CRON_SECRET: "el-mio", TELEGRAM_WEBHOOK_SECRET: "el-suyo" }, () => {
      assert.equal(pimientaOtp(), "la-mia");
      assert.equal(secretoCron(), "el-mio");
      assert.equal(secretoWebhook(), "el-suyo");
    });
  });

  it("sin declarar, se derivan y son estables entre arranques", () => {
    // Un secreto que cambiara en cada arranque dejaría al bot sin reconocer a
    // Telegram tras cada reinicio del contenedor.
    con({ CLAVE_CIFRADO: CLAVE, TELEGRAM_BOT_TOKEN: TOKEN }, () => {
      assert.equal(pimientaOtp(), pimientaOtp());
      assert.equal(secretoCron(), secretoCron());
      assert.equal(secretoWebhook(), secretoWebhook());
    });
  });

  it("los tres son DISTINTOS entre sí", () => {
    // Misma raíz, etiquetas distintas: si dos coincidieran, quien consiguiera el
    // secreto del cron —que viaja en una cabecera— tendría la pimienta de los OTP.
    con({ CLAVE_CIFRADO: CLAVE, TELEGRAM_BOT_TOKEN: TOKEN }, () => {
      const tres = new Set([pimientaOtp(), secretoCron(), secretoWebhook()]);
      assert.equal(tres.size, 3);
    });
  });

  it("cambiar la raíz cambia el secreto", () => {
    let uno = "";
    con({ CLAVE_CIFRADO: CLAVE, TELEGRAM_BOT_TOKEN: TOKEN }, () => {
      uno = pimientaOtp();
    });
    con({ CLAVE_CIFRADO: Buffer.alloc(32, 1).toString("base64"), TELEGRAM_BOT_TOKEN: TOKEN }, () => {
      assert.notEqual(pimientaOtp(), uno);
    });
  });

  it("el del webhook sale del TOKEN DEL BOT, no de la clave maestra", () => {
    /*
     * Es deliberado y tiene consecuencia: rotar el token del bot obliga de todas
     * formas a volver a registrar el webhook, así que atarlo ahí hace que el
     * secreto caduque solo, justo cuando debe. Si saliera de la clave maestra,
     * rotar esa clave dejaría al bot rechazando a Telegram hasta que alguien se
     * acordara de re-registrarlo.
     */
    let conTokenA = "";
    con({ CLAVE_CIFRADO: CLAVE, TELEGRAM_BOT_TOKEN: TOKEN }, () => {
      conTokenA = secretoWebhook() ?? "";
    });
    // Cambia la clave maestra: el secreto del webhook NO se mueve.
    con({ CLAVE_CIFRADO: Buffer.alloc(32, 4).toString("base64"), TELEGRAM_BOT_TOKEN: TOKEN }, () => {
      assert.equal(secretoWebhook(), conTokenA);
    });
    // Cambia el token: sí se mueve.
    con({ CLAVE_CIFRADO: CLAVE, TELEGRAM_BOT_TOKEN: "999:otro" }, () => {
      assert.notEqual(secretoWebhook(), conTokenA);
    });
  });

  it("el del webhook cabe en lo que Telegram acepta", () => {
    // Telegram acota `secret_token` a 1-256 caracteres de A-Z a-z 0-9 _ -.
    // Un valor fuera de ese alfabeto hace que `setWebhook` falle al desplegar.
    con({ CLAVE_CIFRADO: CLAVE, TELEGRAM_BOT_TOKEN: TOKEN }, () => {
      const s = secretoWebhook() ?? "";
      assert.ok(s.length >= 1 && s.length <= 256);
      assert.match(s, /^[A-Za-z0-9_-]+$/);
    });
  });

  it("sin token del bot no hay secreto de webhook que derivar", () => {
    // Y entonces `/api/bot` tiene que seguir apagándose, no abrirse.
    con({ CLAVE_CIFRADO: CLAVE }, () => {
      assert.equal(secretoWebhook(), null);
    });
  });

  it("sin clave maestra, la pimienta falla en vez de usar una vacía", () => {
    // Derivar de una raíz ausente daría un HMAC con clave vacía: determinista,
    // idéntico en todas las instalaciones del mundo y por tanto inútil.
    con({ TELEGRAM_BOT_TOKEN: TOKEN }, () => {
      assert.throws(() => pimientaOtp(), /CLAVE_CIFRADO/);
    });
  });
});
