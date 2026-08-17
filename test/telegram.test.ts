import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import {
  ErrorInitData,
  esRtl,
  idiomaDesdeTelegram,
  IDIOMA_DE_RESPALDO,
  IDIOMA_DEL_OPERADOR,
  validarInitData,
} from "../lib/auth/telegram.ts";
// `idiomaGuardado` no se reexporta desde `auth/telegram.ts`: lo usa el servidor
// para leer la columna, no para validar nada de Telegram.
import { idiomaGuardado } from "../lib/idiomas.ts";
import { formatearMicros } from "../lib/devengo/dinero.ts";

const TOKEN_BOT = "123456:PRUEBA-no-es-un-token-real";
const AHORA_MS = Date.UTC(2026, 6, 25, 12, 0, 0);

/**
 * Construye un initData firmado como lo haría Telegram.
 *
 * Se serializa con `encodeURIComponent` y NO con `URLSearchParams`, que es lo
 * que hace Telegram de verdad y lo que distingue los dos formatos: el analizador
 * de consultas escribe el espacio como `+`, y `encodeURIComponent` como `%20`.
 * Con `URLSearchParams` a los dos lados el error se cancelaba solo y la prueba
 * no podía ver el fallo.
 *
 * `excluirDeLaFirma` deja campos fuera del resumen: así se puede fabricar tanto
 * el initData de un cliente que mete `signature` en el hash como el de uno que
 * no. Ver `CANDIDATOS` en `lib/auth/telegram.ts`.
 */
function firmar(
  campos: Record<string, string>,
  tokenBot = TOKEN_BOT,
  excluirDeLaFirma: readonly string[] = [],
): string {
  const cadena = Object.entries(campos)
    .filter(([k]) => !excluirDeLaFirma.includes(k))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const claveSecreta = createHmac("sha256", "WebAppData").update(tokenBot).digest();
  const hash = createHmac("sha256", claveSecreta).update(cadena).digest("hex");
  return Object.entries({ ...campos, hash })
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

function campos(sobre: Record<string, string> = {}): Record<string, string> {
  return {
    auth_date: String(Math.floor(AHORA_MS / 1000)),
    user: JSON.stringify({ id: 987654321, first_name: "Marta", language_code: "es" }),
    ...sobre,
  };
}

const ahora = () => AHORA_MS;

test("acepta un initData correctamente firmado", () => {
  const r = validarInitData(firmar(campos()), TOKEN_BOT, { ahora });
  assert.equal(r.usuario.id, 987654321);
  assert.equal(r.usuario.first_name, "Marta");
});

test("REGRESIÓN: rechaza un initData con el usuario manipulado", () => {
  // El ataque evidente: abrir la Mini App fuera de Telegram y cambiar el id
  // para suplantar a otro agente. Sin verificar la firma, funcionaría.
  const original = firmar(campos());
  const p = new URLSearchParams(original);
  p.set("user", JSON.stringify({ id: 111, first_name: "Intruso" }));
  assert.throws(() => validarInitData(p.toString(), TOKEN_BOT, { ahora }), ErrorInitData);
});

test("rechaza una firma de otro bot", () => {
  const ajeno = firmar(campos(), "999999:otro-token");
  assert.throws(() => validarInitData(ajeno, TOKEN_BOT, { ahora }), /firma/);
});

test("rechaza initData sin firma o vacío", () => {
  assert.throws(() => validarInitData("", TOKEN_BOT, { ahora }), /vacío/);
  assert.throws(() => validarInitData("user=%7B%7D", TOKEN_BOT, { ahora }), /sin firma/);
});

test("REGRESIÓN: rechaza un initData caducado", () => {
  // Telegram no invalida el initData por su cuenta: sin ventana de frescura,
  // una cadena capturada valdría indefinidamente.
  const viejo = firmar(campos({ auth_date: String(Math.floor(AHORA_MS / 1000) - 90_000) }));
  assert.throws(() => validarInitData(viejo, TOKEN_BOT, { ahora }), /caducado/);
});

test("rechaza un auth_date en el futuro pero tolera deriva de reloj", () => {
  const futuro = firmar(campos({ auth_date: String(Math.floor(AHORA_MS / 1000) + 600) }));
  assert.throws(() => validarInitData(futuro, TOKEN_BOT, { ahora }), /futuro/);

  const derivaLeve = firmar(campos({ auth_date: String(Math.floor(AHORA_MS / 1000) + 30) }));
  assert.doesNotThrow(() => validarInitData(derivaLeve, TOKEN_BOT, { ahora }));
});

test("extrae el start_param, que transporta el código de activación", () => {
  const r = validarInitData(firmar(campos({ start_param: "ABCDE-FGHJK" })), TOKEN_BOT, { ahora });
  assert.equal(r.startParam, "ABCDE-FGHJK");
});

/*
 * ── EL FALLO QUE TUMBÓ LA MINI APP EN PRODUCCIÓN ──
 *
 * Telegram Desktop 9.6 mandaba `auth_date, hash, query_id, signature, user`, y
 * nosotros quitábamos `signature` antes de calcular el resumen. La firma no
 * cuadraba NUNCA: toda la Mini App respondía «Telegram no ha verificado tu
 * acceso» mientras el bot contestaba con normalidad, o sea con el token bueno.
 *
 * La prueba que había —«ignora el campo signature al calcular el hash»— fijaba
 * justo la suposición equivocada, y encima no podía fallar: firmaba SIN
 * signature y verificaba SIN signature. Coherente consigo misma y con la
 * realidad no.
 */
const CON_FIRMA = campos({ query_id: "AAHdF6IQAAAAAN0Xoh", signature: "Zm9vYmFy_x-Y" });

test("REGRESIÓN: acepta el initData de un cliente que mete signature en el hash", () => {
  const r = validarInitData(firmar(CON_FIRMA), TOKEN_BOT, { ahora });
  assert.equal(r.variante, "con-signature");
  assert.equal(r.usuario.id, 987654321);
});

test("acepta también el de un cliente que la deja fuera", () => {
  const r = validarInitData(firmar(CON_FIRMA, TOKEN_BOT, ["signature"]), TOKEN_BOT, { ahora });
  assert.equal(r.variante, "sin-signature");
});

test("aceptar las dos formas no deja pasar una firma falsa", () => {
  // Es lo único que importa de admitir dos candidatos: las dos siguen siendo el
  // mismo HMAC con el mismo token, así que sin el token no entra ninguna.
  assert.throws(() => validarInitData(firmar(CON_FIRMA, "999:otro"), TOKEN_BOT, { ahora }), /firma/);
});

test("REGRESIÓN: un «+» dentro de un valor no rompe la firma", () => {
  /*
   * `URLSearchParams` implementa el formato de los formularios HTML, donde `+`
   * ES un espacio. El initData no es un formulario: Telegram lo compone con
   * `encodeURIComponent`, que escribe el espacio como `%20` y deja el `+` tal
   * cual. Al analizarlo con `URLSearchParams`, cualquier valor con un `+`
   * llegaba al resumen convertido en espacio y la firma fallaba para esa
   * persona en concreto —y solo para esa, que es lo que lo hacía indetectable—.
   */
  const conMas = campos({ user: JSON.stringify({ id: 5, first_name: "C+C", language_code: "es" }) });
  const r = validarInitData(firmar(conMas), TOKEN_BOT, { ahora });
  assert.equal(r.usuario.first_name, "C+C");
});

test("un espacio de verdad sigue leyéndose como espacio", () => {
  const conEspacio = campos({ user: JSON.stringify({ id: 6, first_name: "Ana Mari" }) });
  const r = validarInitData(firmar(conEspacio), TOKEN_BOT, { ahora });
  assert.equal(r.usuario.first_name, "Ana Mari");
});

test("elige idioma entre los cinco soportados y cae al inglés", () => {
  assert.equal(idiomaDesdeTelegram("es-ES"), "es");
  assert.equal(idiomaDesdeTelegram("ar"), "ar");
  assert.equal(idiomaDesdeTelegram("pt-BR"), "pt");
  assert.equal(idiomaDesdeTelegram("it"), "it");

  // Los dos casos del respaldo, y son distintos: uno es un idioma que no
  // tenemos y el otro es un cliente que no dice ninguno.
  assert.equal(idiomaDesdeTelegram("ja"), "en");
  assert.equal(idiomaDesdeTelegram(null), "en");
  assert.equal(idiomaDesdeTelegram(undefined), "en");
  assert.equal(idiomaDesdeTelegram(""), "en");
});

test("lo guardado en Agente.idioma cae al mismo respaldo que el language_code", () => {
  // La columna es TEXT: puede traer una fila anterior a la migración, un idioma
  // retirado o algo puesto a mano. Cae al respaldo del AGENTE —a quien se le va
  // a escribir— y no al del Operador.
  assert.equal(idiomaGuardado("pt"), "pt");
  assert.equal(idiomaGuardado("fr"), IDIOMA_DE_RESPALDO);
  assert.equal(idiomaGuardado(null), IDIOMA_DE_RESPALDO);
  assert.equal(idiomaGuardado(""), IDIOMA_DE_RESPALDO);
  assert.equal(IDIOMA_DE_RESPALDO, "en");
});

test("el respaldo del agente y el del Operador no son la misma cosa", () => {
  /*
   * Eran una sola constante, y mientras las dos respuestas fueron «español» la
   * mezcla no se notaba. Al pasar el respaldo del agente al inglés, un único
   * nombre habría arrastrado con él al panel del Operador —que no se traduce— y
   * su dinero habría pasado a «55,842.05 $» sin que nadie lo pidiera.
   *
   * Esta prueba es lo que impide que alguien las vuelva a fundir «porque son lo
   * mismo»: no lo son, y aquí está escrito por qué.
   */
  assert.equal(IDIOMA_DE_RESPALDO, "en");
  assert.equal(IDIOMA_DEL_OPERADOR, "es");
  assert.notEqual(IDIOMA_DE_RESPALDO, IDIOMA_DEL_OPERADOR);

  // El panel llama a `formatearMicros` sin idioma en unos treinta y cinco
  // sitios. Su valor por defecto tiene que seguir siendo el del Operador.
  assert.equal(formatearMicros(55_842_050_000n), formatearMicros(55_842_050_000n, 2, "es"));
  assert.equal(formatearMicros(55_842_050_000n), "55.842,05 $");
});

test("solo el árabe invierte el layout", () => {
  assert.equal(esRtl("ar"), true);
  assert.equal(esRtl("es"), false);
  assert.equal(esRtl("en"), false);
});
