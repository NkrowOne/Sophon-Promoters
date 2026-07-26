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

import { Prisma, PrismaClient } from "@prisma/client";

import { formatearCodigo, hashOtp, normalizarCodigo, normalizarEmail } from "../lib/cripto.ts";

const BASE = (process.env["APP_URL_PRUEBA"] ?? "http://127.0.0.1:3001").replace(/\/+$/, "");
const TOKEN = process.env["TELEGRAM_BOT_TOKEN"] ?? "";
/**
 * Identidad propia de la prueba.
 *
 * Reservada y reconocible para que la limpieza no arrastre datos de nadie más
 * si esto se ejecuta contra una base de datos que ya tiene algo dentro.
 */
const TELEGRAM_ID = 987_654_321;
const EMAIL = "e2e@prueba.local";

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

  // `language_code` va dentro del initData FIRMADO: es de ahí de donde el alta
  // saca el idioma que persiste, y es lo que decidirá en qué lengua se le avisa
  // al agente de que se le ha pagado.
  const initData = firmarInitData({
    id: TELEGRAM_ID,
    first_name: "Prueba",
    language_code: "pt-BR",
  });
  const emailNormalizado = normalizarEmail(EMAIL);

  // ── Limpieza previa: la prueba tiene que poder repetirse ──────────────────
  //
  // En orden de dependencia y borrando primero lo que cuelga del agente. La
  // base de datos NO deja borrar un agente que tenga asientos —el ledger es
  // append-only y un asiento sin dueño no significa nada—, así que una limpieza
  // ingenua se estrella contra esa clave ajena. Aquí eso no debería pasar,
  // porque esta identidad no devenga nada, pero la prueba tiene que poder
  // ejecutarse dos veces seguidas pase lo que pase entre medias.
  const previo = await db.agente.findUnique({
    where: { emailNormalizado },
    select: { id: true },
  });
  if (previo) {
    await db.sesionAgente.deleteMany({ where: { agenteId: previo.id } });
    await db.asientoComision.deleteMany({ where: { agenteId: previo.id } });
    await db.concesionPro.deleteMany({ where: { agenteId: previo.id } });
    await db.solicitudRetiro.deleteMany({ where: { agenteId: previo.id } });
    await db.intentoVinculacion.deleteMany({ where: { agenteId: previo.id } });
    await db.webmaster.updateMany({ where: { agenteId: previo.id }, data: { agenteId: null } });
    await db.codigoActivacion.updateMany({
      where: { agenteId: previo.id },
      data: { agenteId: null },
    });
  }
  await db.codigoOtp.deleteMany({ where: { emailNormalizado } });
  await db.codigoActivacion.deleteMany({ where: { creadoPorId: "prueba-e2e" } });
  await db.agente.deleteMany({ where: { emailNormalizado } });
  // El Telegram de la prueba puede haber quedado atado a otro correo si una
  // ejecución anterior se interrumpió a medias. Se DESATA, no se borra: ese
  // agente puede tener asientos, y el ledger no permite —ni debe permitir—
  // borrar al dueño de un devengo. Lo que la prueba necesita es que el Telegram
  // esté libre, no que la cuenta desaparezca.
  await db.agente.updateMany({
    where: { telegramId: BigInt(TELEGRAM_ID), emailNormalizado: { not: emailNormalizado } },
    data: { telegramId: null },
  });

  // ── 1. La migración creó lo que el código espera ──────────────────────────
  //
  // La lista esperada sale del propio esquema, no de un número escrito a mano.
  // La primera versión comprobaba «son 15 tablas» y se rompió en cuanto se
  // añadió una decimosexta: un recuento fijo solo sabe decir que algo cambió,
  // no si la migración se olvidó de un modelo, que es lo que de verdad importa.
  const esperadas = Prisma.dmmf.datamodel.models.map((m) => m.dbName ?? m.name);
  const presentes = await db.$queryRaw<{ table_name: string }[]>`
    SELECT table_name::text FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name NOT LIKE '\\_prisma%'`;
  const nombres = new Set(presentes.map((t) => t.table_name));
  const faltan = esperadas.filter((t) => !nombres.has(t));
  comprobar(
    `la migración crea las ${esperadas.length} tablas del esquema`,
    faltan.length === 0,
    faltan.length ? `faltan: ${faltan.join(", ")}` : `${nombres.size} en la base de datos`,
  );

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

  // El idioma tiene que quedar guardado y NORMALIZADO: llega «pt-BR» y se
  // almacena «pt». Sin esto, `cadenas("pt-BR")` devolvería `undefined` y el
  // aviso de «te hemos pagado» reventaría justo en el momento del cobro.
  const reciente = await db.agente.findUnique({
    where: { emailNormalizado },
    select: { idioma: true },
  });
  comprobar(
    "el alta guarda el idioma del initData firmado",
    reciente?.idioma === "pt",
    `idioma = ${reciente?.idioma}`,
  );

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

  // ── 8. El panel está cerrado sin sesión ───────────────────────────────────
  // Se comprueban TODAS las páginas, no una de muestra: el guardia está en cada
  // una por separado —a propósito, para que una página nueva no herede la
  // protección sin declararla— y eso significa que también hay que verificarlo
  // en cada una.
  for (const ruta of ["/admin", "/admin/agentes", "/admin/retiros"]) {
    const r = await fetch(`${BASE}${ruta}`);
    const html = await r.text();
    comprobar(
      `${ruta} no enseña nada sin sesión`,
      html.includes("Necesitas entrar") && !html.includes("Tu margen"),
    );
  }

  // ── 9. Un enlace de entrada inventado no abre el panel ────────────────────
  const inventado = await fetch(`${BASE}/admin/entrar?t=noexisteestetoken`, {
    redirect: "manual",
  });
  comprobar(
    "un enlace de entrada inventado no abre sesión",
    (inventado.headers.get("location") ?? "").includes("/admin/cerrado"),
    inventado.headers.get("location") ?? "",
  );

  // ── 10. El disponible: lo que sale de la ventana se puede retirar ─────────
  //
  // Es la comprobación del fallo que tenía parado todo el dinero: `estaCerrado`
  // comparaba con `>` estricto contra una ventana que empieza exactamente en
  // hoy−7, así que ningún asiento llegaba nunca a CONSOLIDADO y el disponible de
  // todos los agentes era cero. Aquí se mide el circuito entero —devengar,
  // consolidar, ver saldo— porque el fallo era invisible en cada pieza suelta.
  {
    const { saldos } = await import("../lib/api/agente.ts");
    const { barrerRegistros, hoyContable } = await import("../lib/sync/registros.ts");
    const hoy = hoyContable();
    const hace = (d: number) => new Date(Date.parse(`${hoy}T00:00:00Z`) - d * 86_400_000);

    const agente = await db.agente.findUnique({ where: { emailNormalizado: EMAIL } });
    if (agente) {
      await db.asientoComision.create({
        data: {
          agenteId: agente.id,
          tipo: "CPA",
          estado: "PROVISIONAL",
          importeMicros: 42_000_000n,
          fechaDevengo: hace(20),
          claveIdempotencia: `e2e-vencido:${Date.now()}`,
        },
      });

      const antes = await saldos(agente.id);
      comprobar("un asiento vencido nace sin poder retirarse", antes.disponibleMicros === 0n);

      const r = await barrerRegistros(clienteFalsoSinDatos(), { desde: hoy, hasta: hoy });
      comprobar(
        "el barrido lo consolida",
        (r?.asientosConsolidados ?? 0) >= 1,
        `${r?.asientosConsolidados} consolidados`,
      );

      const despues = await saldos(agente.id);
      comprobar(
        "y entonces SÍ está disponible para retirar",
        despues.disponibleMicros === 42_000_000n,
        `${despues.disponibleMicros} micros`,
      );
    }
  }

  // ── 11. Sin tarifa en vigor, el barrido lo DICE ───────────────────────────
  //
  // Este es el defecto que estuvo en el repositorio desde el primer día sin que
  // nada lo delatara: `TarifaVersion` tenía un lector y ningún escritor, así que
  // en una base de datos nueva el motor guardaba las filas diarias y no emitía
  // un solo asiento. Los barridos terminaban en verde, los registros crecían en
  // pantalla y lo único que faltaba era el dinero de los agentes.
  //
  // No se comprueba que el devengo funcione —eso ya lo cubren los tests del
  // motor—, sino que el estado roto sea OBSERVABLE. Que fuera invisible es lo
  // que lo mantuvo vivo, y una prueba de que se ve es lo único que impide que
  // vuelva.
  const tarifasVivas = await db.tarifaVersion.count({ where: { validaHasta: null } });
  if (tarifasVivas === 0) {
    const { barrerRegistros } = await import("../lib/sync/registros.ts");
    const r = await barrerRegistros(clienteFalsoSinDatos(), {
      desde: "2026-01-01",
      hasta: "2026-01-01",
    });
    comprobar("sin tarifa, el barrido avisa con `sinTarifa`", r?.sinTarifa === true);
    comprobar("y no devenga nada", r?.asientosCreados === 0);
  } else {
    comprobar(
      "hay tarifa en vigor, así que el motor puede devengar",
      true,
      `${tarifasVivas} versión(es)`,
    );
  }

  console.log(
    `\n${fallos === 0 ? "Todo en verde." : `${fallos === 1 ? "1 comprobación falló" : `${fallos} comprobaciones fallaron`}.`}`,
  );
}

/**
 * Un cliente de Sophon que no devuelve ninguna fila.
 *
 * Basta para lo que se comprueba: si el barrido detecta la falta de tarifa
 * antes de tocar nada, no hacen falta datos. Y así la prueba no depende de la
 * API real, que es lo que la haría fallar por motivos ajenos.
 */
function clienteFalsoSinDatos() {
  return {
    async *todosLosRegistros() {},
  } as never;
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
  // La primera línea NO sirve: los errores de Prisma empiezan con un salto de
  // línea y el informe salía diciendo «se interrumpió:» y nada más. Se busca
  // la primera línea con contenido.
  const motivo =
    e instanceof Error
      ? (e.message.split("\n").find((l) => l.trim()) ?? e.name).trim()
      : String(e);
  console.log(`\n✗ la prueba se interrumpió: ${motivo}`);
} finally {
  await db.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}
