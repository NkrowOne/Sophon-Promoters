/**
 * Prueba de extremo a extremo contra una base de datos y un servidor reales.
 *
 * Los tests unitarios cubren el motor de devengo, pero no dicen nada de la
 * cadena que de verdad protege el dinero: **migración → código de activación →
 * OTP → sesión → aislamiento del margen**. Cada eslabón se ha comprobado por
 * separado y ninguno junto, y ahí es donde aparecen los fallos caros: una
 * cookie que no viaja, un `select` que se lleva de más, un 401 donde debía
 * haber datos.
 *
 * No usa la API de Sophon ni el SMTP: el OTP se siembra directamente con la
 * misma función de hash que usa la aplicación, que es lo que permite recorrer
 * el flujo entero sin un servidor de correo.
 *
 * Uso:
 *
 *   DATABASE_URL=... APP_URL_PRUEBA=http://127.0.0.1:3001 \
 *   TELEGRAM_BOT_TOKEN=... PIMIENTA_OTP=... CLAVE_CIFRADO=... \
 *   npm run prueba:e2e
 *
 * La base de datos debe ser DESECHABLE: el script escribe agentes y sesiones.
 */

import { createHmac } from "node:crypto";

import { PrismaClient } from "@prisma/client";

import { formatearCodigo, hashOtp, normalizarCodigo, normalizarEmail } from "../lib/cripto.ts";

const BASE = (process.env["APP_URL_PRUEBA"] ?? "http://127.0.0.1:3001").replace(/\/+$/, "");
const TOKEN = process.env["TELEGRAM_BOT_TOKEN"] ?? "";
const TELEGRAM_ID = 987_654_321;
const EMAIL = "agente.prueba@example.com";

const db = new PrismaClient();

let fallos = 0;
function comprobar(titulo: string, condicion: boolean, nota = ""): void {
  console.log(`${condicion ? "✓" : "✗"} ${titulo}${nota ? ` — ${nota}` : ""}`);
  if (!condicion) fallos++;
}

/**
 * Detalle de una respuesta fallida.
 *
 * Un `✗ ... — 400` obliga a repetir la llamada a mano para saber qué pasó. El
 * mensaje del servidor es justo lo que ahorra ese viaje, y estas rutas ya lo
 * devuelven redactado para que lo lea una persona.
 */
async function detalle(r: Response): Promise<string> {
  if (r.ok) return "";
  const cuerpo = (await r.clone().json().catch(() => null)) as { error?: string } | null;
  return `${r.status} ${cuerpo?.error ?? ""}`.trim();
}

/**
 * Firma un `initData` como lo haría Telegram.
 *
 * Sin esto no se puede probar nada: la aplicación exige la firma en TODAS las
 * rutas del agente, que es precisamente la propiedad que se quiere verificar.
 */
function firmarInitData(usuario: object): string {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify(usuario),
  });
  const cadena = [...params.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const clave = createHmac("sha256", "WebAppData").update(TOKEN).digest();
  params.set("hash", createHmac("sha256", clave).update(cadena).digest("hex"));
  return params.toString();
}

async function principal(): Promise<void> {
  if (!TOKEN) {
    console.error("Falta TELEGRAM_BOT_TOKEN: sin él no se puede firmar el initData.");
    process.exit(1);
  }

  const initData = firmarInitData({ id: TELEGRAM_ID, first_name: "Prueba" });
  const emailNormalizado = normalizarEmail(EMAIL);

  // ── Limpieza previa: la prueba tiene que poder repetirse ──────────────────
  await db.sesionAgente.deleteMany({ where: { agente: { emailNormalizado } } });
  await db.codigoOtp.deleteMany({ where: { emailNormalizado } });
  await db.codigoActivacion.deleteMany({ where: { creadoPorId: "prueba-e2e" } });
  await db.agente.deleteMany({ where: { emailNormalizado } });

  // ── 1. La migración creó lo que el código espera ──────────────────────────
  const tablas = await db.$queryRaw<{ count: bigint }[]>`
    SELECT count(*)::bigint FROM information_schema.tables WHERE table_schema = 'public'
      AND table_name NOT LIKE '\\_prisma%'`;
  comprobar("la migración crea las 15 tablas", Number(tablas[0]?.count ?? 0) === 15,
    `${tablas[0]?.count} encontradas`);

  // ── 2. Sin firma no se entra ──────────────────────────────────────────────
  const sinFirma = await fetch(`${BASE}/api/agente/resumen`);
  comprobar("sin initData la API responde 401", sinFirma.status === 401);

  const firmaFalsa = await fetch(`${BASE}/api/agente/resumen`, {
    headers: { "x-telegram-init-data": initData.replace(/hash=\w/, "hash=0") },
  });
  comprobar("con firma manipulada responde 401", firmaFalsa.status === 401);

  // ── 3. Código de activación ───────────────────────────────────────────────
  // Se siembra SIEMPRE la forma canónica y se canjea la forma con guiones, que
  // es exactamente lo que el bot enseña y lo que el agente teclea. Esta pareja
  // es la que estaba rota: se guardaba con guion y se buscaba sin él.
  const codigo = normalizarCodigo("PRUEBA-E2E");
  await db.codigoActivacion.create({
    data: {
      codigo,
      expiraEn: new Date(Date.now() + 3_600_000),
      creadoPorId: "prueba-e2e",
    },
  });
  const comoLoTeclea = formatearCodigo(codigo);

  const conCodigoMalo = await fetch(`${BASE}/api/auth/codigo`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-telegram-init-data": initData },
    body: JSON.stringify({ codigo: "NO-EXISTE", email: EMAIL }),
  });
  comprobar("un código inexistente se rechaza", conCodigoMalo.status === 400);

  // El envío del OTP se salta a propósito: exige SMTP. Se siembra el registro
  // con la MISMA función de hash que usa la aplicación, así que lo que se
  // prueba después es la verificación real, no una simulada.
  const otp = "424242";
  await db.codigoOtp.create({
    data: {
      emailNormalizado,
      codigoHash: hashOtp(otp, emailNormalizado),
      proposito: "VINCULAR_CUENTA",
      telegramId: BigInt(TELEGRAM_ID),
      expiraEn: new Date(Date.now() + 600_000),
    },
  });

  // ── 4. OTP equivocado y OTP bueno ─────────────────────────────────────────
  const otpMalo = await fetch(`${BASE}/api/auth/otp`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-telegram-init-data": initData },
    body: JSON.stringify({ codigo: comoLoTeclea, email: EMAIL, otp: "000000" }),
  });
  comprobar("un OTP equivocado se rechaza", otpMalo.status === 400);

  const alta = await fetch(`${BASE}/api/auth/otp`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-telegram-init-data": initData },
    body: JSON.stringify({ codigo: comoLoTeclea, email: EMAIL, otp }),
  });
  comprobar("el OTP bueno completa el alta", alta.ok, await detalle(alta));

  const cookie = (alta.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  comprobar("el alta devuelve cookie de sesión", cookie.includes("="));

  const invitacion = await db.codigoActivacion.findUnique({ where: { codigo } });
  comprobar("el código de activación queda consumido", invitacion?.usosActuales === 1);

  // ── 5. La sesión abre la API, y sin margen del superadmin ─────────────────
  const cabeceras = { "x-telegram-init-data": initData, cookie };

  const resumen = await fetch(`${BASE}/api/agente/resumen`, { headers: cabeceras });
  comprobar("con sesión la API responde 200", resumen.ok, await detalle(resumen));

  const cuerpo = await resumen.text();
  // La prueba de aislamiento se hace sobre el JSON CRUDO, no sobre el objeto
  // ya parseado: así también atrapa un campo colado dentro de un anidado que
  // nadie estaba mirando.
  const filtrado = ["gananciaTotal", "gananciaSuperadmin", "superadmin", "myEarning"].filter(
    (campo) => cuerpo.includes(campo),
  );
  comprobar("la respuesta no lleva el margen del superadmin", filtrado.length === 0,
    filtrado.join(", "));

  // ── 6. El corte por época invalida la sesión al instante ──────────────────
  await db.agente.update({
    where: { emailNormalizado },
    data: { epocaSesion: { increment: 1 } },
  });
  const trasCorte = await fetch(`${BASE}/api/agente/resumen`, { headers: cabeceras });
  comprobar("subir la época corta la sesión al instante", trasCorte.status === 401);

  // ── 7. Un segundo alta con el mismo Telegram no prospera ──────────────────
  await db.agente.update({
    where: { emailNormalizado },
    data: { epocaSesion: { decrement: 1 } },
  });
  // Con el código ya gastado, quien salta primero es el guardia del código.
  const gastado = await fetch(`${BASE}/api/auth/codigo`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-telegram-init-data": initData },
    body: JSON.stringify({ codigo: comoLoTeclea, email: "otro@example.com" }),
  });
  comprobar("un código ya canjeado no vale para nadie más", gastado.status === 400);

  // Y con uno recién generado, el que salta es el del Telegram ya vinculado,
  // que es el caso que de verdad importa: un agente registrado no puede
  // crearse una segunda cuenta aunque tenga un código bueno en la mano.
  const otroCodigo = normalizarCodigo("PRUEBA-E2E-2");
  await db.codigoActivacion.create({
    data: {
      codigo: otroCodigo,
      expiraEn: new Date(Date.now() + 3_600_000),
      creadoPorId: "prueba-e2e",
    },
  });
  const repetida = await fetch(`${BASE}/api/auth/codigo`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-telegram-init-data": initData },
    body: JSON.stringify({ codigo: formatearCodigo(otroCodigo), email: "otro@example.com" }),
  });
  comprobar("un Telegram ya vinculado no puede darse de alta otra vez",
    repetida.status === 409, await detalle(repetida));

  console.log(
    `\n${fallos === 0 ? "Todo en verde." : `${fallos === 1 ? "1 comprobación falló" : `${fallos} comprobaciones fallaron`}.`}`,
  );
}

/**
 * Un fallo no puede llevarse por delante el resto del informe.
 *
 * La primera versión reventaba con el volcado de Prisma en cuanto un paso
 * dependía de otro que había fallado, y el volcado tapaba las comprobaciones
 * que sí habían corrido —justo la información que hacía falta para saber qué
 * estaba roto—. Ahora se resume el error en una línea y se cierra el informe.
 */
try {
  await principal();
} catch (e) {
  fallos++;
  console.log(`\n✗ la prueba se interrumpió: ${e instanceof Error ? e.message.split("\n")[0] : e}`);
} finally {
  await db.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}
