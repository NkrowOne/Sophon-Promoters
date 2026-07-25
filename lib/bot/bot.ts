import { Bot, InlineKeyboard } from "grammy";

import { db } from "../db.ts";
import { formatearCodigo, generarCodigoActivacion, normalizarEmail } from "../cripto.ts";
import { formatearMicros } from "../devengo/dinero.ts";

/**
 * El bot.
 *
 * Hace tres cosas y ninguna más:
 *
 *  1. **Abre la Mini App.** Es la puerta de entrada del agente.
 *  2. **Genera códigos de activación**, que es la única forma de darse de alta.
 *  3. **Cuenta lo que hay que mirar**: retiros pendientes y estado de la red.
 *
 * Lo que NO hace, a propósito: **cambiar el estado de un retiro**. Aprobar o
 * marcar como pagado mueve dinero real, y una conversación de chat es el peor
 * sitio para eso —un toque accidental sobre un botón antiguo, sin poder ver el
 * saldo ni el histórico al lado—. Esas acciones viven en el panel, que es donde
 * se ve el contexto completo. El bot avisa; el panel decide.
 *
 * Todos los comandos de gestión son del superadmin. La comprobación se hace
 * contra `TELEGRAM_SUPERADMIN_ID` en cada uno, no una sola vez al arrancar: un
 * middleware global que se olvidara de cubrir un comando nuevo sería un agujero
 * silencioso.
 */

/** Vigencia por defecto de un código de activación. */
const DIAS_CODIGO = 7;
const MAX_DIAS_CODIGO = 90;

let instancia: Bot | null = null;

export function bot(): Bot {
  if (instancia) return instancia;

  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) throw new Error("falta TELEGRAM_BOT_TOKEN");

  // `TELEGRAM_API_ROOT` permite apuntar a un servidor Bot API propio, que es
  // una opción real de Telegram y además lo que hace posible ejercitar los
  // comandos sin hablar con la API pública.
  const raiz = process.env["TELEGRAM_API_ROOT"];
  const b = new Bot(token, raiz ? { client: { apiRoot: raiz } } : undefined);
  registrar(b);
  instancia = b;
  return b;
}

function esSuperadmin(id: number | undefined): boolean {
  const declarado = process.env["TELEGRAM_SUPERADMIN_ID"];
  return Boolean(declarado && id !== undefined && String(id) === declarado.trim());
}

function urlMiniApp(): string {
  return (process.env["APP_URL"] ?? "").replace(/\/+$/, "");
}

function escapar(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function registrar(b: Bot): void {
  b.command("start", async (ctx) => {
    const url = urlMiniApp();
    const id = ctx.from?.id;

    // Un agente ya vinculado entra directo; uno nuevo necesita saber que hace
    // falta un código antes de abrir nada, o se topará con el alta sin entender
    // qué se le pide.
    const vinculado = id
      ? await db.agente.findUnique({
          where: { telegramId: BigInt(id) },
          select: { nombreVisible: true, estado: true },
        })
      : null;

    if (!url) {
      await ctx.reply("La aplicación aún no está publicada. Avisa al superadmin.");
      return;
    }

    // Telegram solo acepta botones de Mini App sobre HTTPS. En desarrollo
    // —APP_URL con http— el botón haría que la API rechazara el mensaje entero,
    // así que se manda el enlace en texto y el bot sigue siendo usable.
    const seguro = url.startsWith("https://");
    const teclado = seguro
      ? new InlineKeyboard().webApp(
          vinculado ? "Abrir mi panel" : "Vincular mi cuenta",
          vinculado ? url : `${url}/alta`,
        )
      : undefined;

    if (vinculado?.estado === "SUSPENDIDO") {
      await ctx.reply(
        "Tu cuenta está suspendida. Escribe al superadmin para reactivarla.",
      );
      return;
    }

    const texto = vinculado
      ? `Hola, ${escapar(vinculado.nombreVisible)}. Abre el panel para ver tu red y lo que llevas ganado.`
      : [
          "<b>Sophon Promoters</b>",
          "",
          "Para entrar necesitas un código de activación del superadmin.",
          "Cuando lo tengas, ábrelo aquí y vincula tu correo.",
        ].join("\n");

    await ctx.reply(seguro ? texto : `${texto}\n\n${escapar(url)}`, {
      parse_mode: "HTML",
      reply_markup: teclado,
    });
  });

  b.command("ayuda", async (ctx) => {
    if (!esSuperadmin(ctx.from?.id)) {
      await ctx.reply(
        "Usa /start para abrir la aplicación. Si algo no cuadra, escribe al superadmin.",
      );
      return;
    }
    await ctx.reply(
      [
        "<b>Comandos</b>",
        "",
        "/codigo — genera un código de activación",
        "/codigo correo@ejemplo.com — solo canjeable con ese correo",
        `/codigo correo@ejemplo.com 30 — y válido 30 días (máx. ${MAX_DIAS_CODIGO})`,
        "/agentes — quién hay dado de alta y qué mueve",
        "/retiros — solicitudes pendientes, con su wallet",
        "",
        "<i>Aprobar y marcar como pagado se hace en el panel, no aquí: mover",
        "dinero desde un chat es demasiado fácil de hacer sin querer.</i>",
      ].join("\n"),
      { parse_mode: "HTML" },
    );
  });

  b.command("codigo", async (ctx) => {
    if (!esSuperadmin(ctx.from?.id)) return;

    const partes = (ctx.match ?? "").trim().split(/\s+/).filter(Boolean);
    const posibleEmail = partes.find((p) => p.includes("@"));
    const posibleDias = partes.find((p) => /^\d+$/.test(p));

    if (posibleEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(posibleEmail)) {
      await ctx.reply("Ese correo no tiene buena pinta. Revísalo.");
      return;
    }

    const dias = Math.min(Number(posibleDias ?? DIAS_CODIGO) || DIAS_CODIGO, MAX_DIAS_CODIGO);
    const codigo = generarCodigoActivacion();

    await db.codigoActivacion.create({
      data: {
        codigo,
        emailDestino: posibleEmail ? normalizarEmail(posibleEmail) : null,
        expiraEn: new Date(Date.now() + dias * 86_400_000),
        creadoPorId: String(ctx.from?.id ?? "desconocido"),
      },
    });

    await db.auditoria.create({
      data: {
        actorTipo: "SUPERADMIN",
        actorId: String(ctx.from?.id ?? ""),
        accion: "codigo.generado",
        recurso: codigo,
        detalle: { emailDestino: posibleEmail ?? null, dias },
      },
    });

    await ctx.reply(
      [
        // Se guarda sin guiones y se enseña con ellos: así se dicta por teléfono
        // sin equivocarse y da igual que el agente los escriba o no, porque la
        // ruta de alta normaliza antes de buscar.
        // En bloque de código para copiarlo de un toque y reenviarlo tal cual.
        `<code>${formatearCodigo(codigo)}</code>`,
        "",
        posibleEmail
          ? `Solo lo puede canjear ${escapar(posibleEmail)}.`
          : "Lo puede canjear cualquiera que lo tenga: mándalo por privado.",
        `Caduca en ${dias} ${dias === 1 ? "día" : "días"}. Un solo uso.`,
      ].join("\n"),
      { parse_mode: "HTML" },
    );
  });

  b.command("agentes", async (ctx) => {
    if (!esSuperadmin(ctx.from?.id)) return;

    const agentes = await db.agente.findMany({
      orderBy: { creadoEn: "desc" },
      take: 30,
      select: {
        id: true,
        emailNormalizado: true,
        nombreVisible: true,
        estado: true,
        _count: { select: { webmasters: true } },
      },
    });

    if (agentes.length === 0) {
      await ctx.reply("Todavía no hay ningún agente. Genera un código con /codigo.");
      return;
    }

    // Lo devengado sale de los asientos, en UNA consulta agrupada: pedirlo
    // agente por agente convertiría treinta agentes en treinta viajes a la
    // base de datos por cada vez que se escribe el comando.
    const porAgente = await db.asientoComision.groupBy({
      by: ["agenteId"],
      where: { agenteId: { in: agentes.map((a) => a.id) }, estado: { not: "ANULADO" } },
      _sum: { importeMicros: true },
    });
    const saldo = new Map(porAgente.map((a) => [a.agenteId, a._sum.importeMicros ?? 0n]));

    await ctx.reply(
      [
        `<b>Agentes</b> (${agentes.length})`,
        "",
        ...agentes.map((a) => {
          const marca = a.estado === "ACTIVO" ? "" : ` · ${a.estado.toLowerCase()}`;
          return `${escapar(a.nombreVisible)}${marca}\n<code>${escapar(a.emailNormalizado)}</code> · ${a._count.webmasters} wm · ${formatearMicros(saldo.get(a.id) ?? 0n)}`;
        }),
      ].join("\n"),
      { parse_mode: "HTML" },
    );
  });

  b.command("retiros", async (ctx) => {
    if (!esSuperadmin(ctx.from?.id)) return;

    const pendientes = await db.solicitudRetiro.findMany({
      where: { estado: { in: ["SOLICITADO", "APROBADO"] } },
      orderBy: { solicitadoEn: "asc" },
      take: 20,
      select: {
        id: true,
        importeMicros: true,
        red: true,
        wallet: true,
        estado: true,
        solicitadoEn: true,
        agente: { select: { nombreVisible: true, emailNormalizado: true } },
      },
    });

    if (pendientes.length === 0) {
      await ctx.reply("No hay retiros pendientes.");
      return;
    }

    const total = pendientes.reduce((a, r) => a + r.importeMicros, 0n);

    await ctx.reply(
      [
        `<b>Retiros pendientes</b> · ${formatearMicros(total)}`,
        "",
        ...pendientes.map((r) =>
          [
            `${escapar(r.agente.nombreVisible)} — <b>${formatearMicros(r.importeMicros)}</b>`,
            `${r.red} · <code>${escapar(r.wallet)}</code>`,
            `<i>${r.estado.toLowerCase()} desde el ${r.solicitadoEn.toISOString().slice(0, 10)}</i>`,
          ].join("\n"),
        ),
        "",
        "<i>Márcalos como pagados en el panel.</i>",
      ].join("\n\n"),
      { parse_mode: "HTML" },
    );
  });

  // Cualquier otro mensaje: una sola salida útil en vez de silencio.
  //
  // Solo en chats privados. Si alguien añade el bot a un grupo, responder a
  // cada mensaje suelto lo convierte en spam, y en un grupo además no hay
  // ninguna acción que el bot pueda ofrecer: los botones de Mini App y los
  // comandos de gestión son de uno a uno.
  b.on("message:text", async (ctx) => {
    if (ctx.chat.type !== "private") return;
    if (ctx.message.text.startsWith("/")) {
      await ctx.reply("No conozco ese comando. Prueba /ayuda.");
      return;
    }
    await ctx.reply("Usa /start para abrir la aplicación.");
  });

  b.catch((err) => {
    // Un fallo tratando una actualización no puede propagarse: Telegram
    // reintentaría la misma actualización en bucle.
    console.error("[bot] error tratando una actualización", err.error);
  });
}
