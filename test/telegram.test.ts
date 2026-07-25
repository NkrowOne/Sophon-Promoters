import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import {
  ErrorInitData,
  esRtl,
  idiomaDesdeTelegram,
  validarInitData,
} from "../lib/auth/telegram.ts";

const TOKEN_BOT = "123456:PRUEBA-no-es-un-token-real";
const AHORA_MS = Date.UTC(2026, 6, 25, 12, 0, 0);

/** Construye un initData firmado como lo haría Telegram. */
function firmar(campos: Record<string, string>, tokenBot = TOKEN_BOT): string {
  const cadena = Object.entries(campos)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const claveSecreta = createHmac("sha256", "WebAppData").update(tokenBot).digest();
  const hash = createHmac("sha256", claveSecreta).update(cadena).digest("hex");
  const p = new URLSearchParams(campos);
  p.set("hash", hash);
  return p.toString();
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

test("ignora el campo signature al calcular el hash", () => {
  // Telegram añade `signature` en clientes nuevos y no entra en el HMAC clásico.
  const base = firmar(campos());
  const p = new URLSearchParams(base);
  p.set("signature", "loquesea");
  assert.doesNotThrow(() => validarInitData(p.toString(), TOKEN_BOT, { ahora }));
});

test("elige idioma entre los cinco soportados y cae a español", () => {
  assert.equal(idiomaDesdeTelegram("es-ES"), "es");
  assert.equal(idiomaDesdeTelegram("ar"), "ar");
  assert.equal(idiomaDesdeTelegram("pt-BR"), "pt");
  assert.equal(idiomaDesdeTelegram("it"), "it");
  assert.equal(idiomaDesdeTelegram("ja"), "es");
  assert.equal(idiomaDesdeTelegram(null), "es");
});

test("solo el árabe invierte el layout", () => {
  assert.equal(esRtl("ar"), true);
  assert.equal(esRtl("es"), false);
  assert.equal(esRtl("en"), false);
});
