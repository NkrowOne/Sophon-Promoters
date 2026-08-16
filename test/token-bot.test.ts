import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";

import { idBot, pegaDelToken, tokenBot } from "../lib/bot/token.ts";
import { secretoWebhook } from "../lib/secretos.ts";
import { validarInitData } from "../lib/auth/telegram.ts";

/**
 * El token del bot, y el espacio en blanco que partía la instalación en dos.
 *
 * El defecto no era teórico. El token se leía en cinco módulos y dos de ellos
 * NO lo recortaban: `lib/bot/bot.ts`, que construye el cliente de grammY, y
 * `lib/auth/sesion.ts`, que verifica la firma de la Mini App. Con un salto de
 * línea de más —lo que se lleva cualquier valor pegado en un panel de
 * despliegue— el resultado era una instalación rota por la mitad y en silencio:
 *
 *  · El BOT seguía funcionando. `fetch` resuelve la URL con el analizador de la
 *    especificación WHATWG, que borra tabuladores y saltos de línea de la URL
 *    entera antes de nada, así que `…/bot<token>\n/getMe` llega a Telegram
 *    perfectamente formada. Esto se comprueba abajo, porque es la mitad del
 *    problema: sin ello, el token malo se habría notado al instante.
 *
 *  · La MINI APP no autenticaba ni una petición. Ahí el token es la clave de un
 *    HMAC, y un byte de más da un resumen completamente distinto.
 *
 * El síntoma que veía el operador era «Telegram no ha verificado tu acceso» en
 * una aplicación cuyo bot respondía con normalidad, y nada en los registros.
 */

const SECRETO = "AAHfakeBotTokenParaLasPruebas1234567";
const LIMPIO = `123456789:${SECRETO}`;

function con(valor: string | undefined, fn: () => void): void {
  const previo = process.env["TELEGRAM_BOT_TOKEN"];
  try {
    if (valor === undefined) delete process.env["TELEGRAM_BOT_TOKEN"];
    else process.env["TELEGRAM_BOT_TOKEN"] = valor;
    fn();
  } finally {
    if (previo === undefined) delete process.env["TELEGRAM_BOT_TOKEN"];
    else process.env["TELEGRAM_BOT_TOKEN"] = previo;
  }
}

/** Firma un initData como lo haría Telegram, para poder verificarlo después. */
function firmar(token: string, campos: Record<string, string>): string {
  const cadena = Object.entries(campos)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const clave = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", clave).update(cadena).digest("hex");
  const p = new URLSearchParams(campos);
  p.set("hash", hash);
  return p.toString();
}

describe("el token del bot", () => {
  it("se recorta al leerlo", () => {
    for (const sucio of [` ${LIMPIO}`, `${LIMPIO} `, `${LIMPIO}\n`, `\t${LIMPIO}\r\n`]) {
      con(sucio, () => assert.equal(tokenBot(), LIMPIO));
    }
  });

  it("un valor vacío o de solo espacios es no tenerlo", () => {
    con("", () => assert.equal(tokenBot(), null));
    con("   \n", () => assert.equal(tokenBot(), null));
    con(undefined, () => assert.equal(tokenBot(), null));
  });

  it("expone el id público del bot y nunca el secreto", () => {
    con(`${LIMPIO}\n`, () => {
      assert.equal(idBot(), "123456789");
      assert.ok(!idBot()?.includes(SECRETO));
    });
    // Sin forma reconocible no se inventa un id.
    con("esto-no-es-un-token", () => assert.equal(idBot(), null));
  });

  it("señala el espacio sobrante por su nombre, y calla cuando está bien", () => {
    con(LIMPIO, () => assert.equal(pegaDelToken(), null));
    con(undefined, () => assert.match(pegaDelToken() ?? "", /no está puesto/));
    con(`${LIMPIO}\n`, () => assert.match(pegaDelToken() ?? "", /espacios o saltos de línea/));
    con("123456789", () => assert.match(pegaDelToken() ?? "", /forma/));
  });

  /*
   * ── LA MITAD QUE ENGAÑABA ──
   *
   * Que el bot siguiera vivo con el token sucio es lo que hacía imposible
   * sospechar del token. Se fija aquí para que quede escrito por qué.
   */
  it("un salto de línea en el token NO rompe la URL de la Bot API", () => {
    const url = new URL(`https://api.telegram.org/bot${LIMPIO}\n/getMe`);
    assert.equal(url.href, `https://api.telegram.org/bot${LIMPIO}/getMe`);
  });

  it("pero SÍ rompe la firma del initData, y por eso hay que recortar en los dos sitios", () => {
    const campos = {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 42, first_name: "Ada" }),
    };
    const initData = firmar(LIMPIO, campos);

    // Con el token tal cual venía del panel: la verificación se cae.
    assert.throws(() => validarInitData(initData, `${LIMPIO}\n`), /firma de initData inválida/);
    // Con el que devuelve el accesor: entra.
    con(`${LIMPIO}\n`, () => {
      assert.equal(validarInitData(initData, tokenBot()!).usuario.id, 42);
    });
  });

  it("el secreto del webhook sale del token recortado, así que no depende del pegado", () => {
    let sucio: string | null = null;
    let limpio: string | null = null;
    con(`${LIMPIO}\n`, () => (sucio = secretoWebhook()));
    con(LIMPIO, () => (limpio = secretoWebhook()));
    assert.ok(limpio);
    assert.equal(sucio, limpio);
  });
});
