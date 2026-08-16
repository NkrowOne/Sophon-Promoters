import { Bot, InlineKeyboard, type Context } from "grammy";

import { db } from "../db.ts";
import { crearEnlaceDeEntrada, MINUTOS_CANJE } from "../auth/admin.ts";
import { formatearCodigo, generarCodigoActivacion, leerWallet, normalizarEmail } from "../cripto.ts";
import { enviarOtp, probarSmtp } from "../correo.ts";
import { formatearMicros } from "../devengo/dinero.ts";
import { cadenas, type Cadenas } from "../i18n.ts";
import { idiomaDesdeTelegram } from "../idiomas.ts";
import { esOperador } from "../operador.ts";
import { tokenBot } from "./token.ts";

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
 * Todos los comandos de gestión son del Operador. La comprobación se hace
 * contra `TELEGRAM_OPERADOR_ID` en cada uno, no una sola vez al arrancar: un
 * middleware global que se olvidara de cubrir un comando nuevo sería un agujero
 * silencioso.
 */

/** Vigencia por defecto de un código de activación. */
const DIAS_CODIGO = 7;
const MAX_DIAS_CODIGO = 90;

let instancia: Bot | null = null;

export function bot(): Bot {
  if (instancia) return instancia;

  // Por `tokenBot()` y no por `process.env` a pelo: aquí se leía sin recortar y
  // en `validarInitData` también, así que un espacio de más rompía la firma de
  // la Mini App mientras el bot seguía contestando. Ver `lib/bot/token.ts`.
  const token = tokenBot();
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

function urlMiniApp(): string {
  return (process.env["APP_URL"] ?? "").replace(/\/+$/, "");
}

function escapar(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * El menú: cada sección de la Mini App con su propia puerta.
 *
 * Antes el bot abría siempre la raíz, así que para renovar un PRO había que
 * abrir la app y navegar hasta la cola. Telegram permite que cada botón
 * `web_app` apunte a una URL distinta, así que el menú puede ser un índice
 * real de la aplicación en vez de un solo botón de «abrir».
 *
 * El orden no es alfabético: es el de la jornada de un agente. Captar primero,
 * después su red, y al final el dinero y el histórico.
 *
 * **`/pro` ya no está en la lista.** Estaba en segundo lugar bajo la premisa
 * «primero lo que exige actuar hoy: dar de alta y renovar», y esa premisa era
 * falsa. Dar el PRO es una consecuencia del alta —cada una concede un año—, no
 * un trabajo aparte que el agente venga a hacer; ponerlo por delante de `/red`
 * hacía que el menú le pidiera a diario algo que casi nunca toca.
 *
 * El comando `/pro` SIGUE existiendo: se registra aparte, más abajo, justo
 * porque el bucle que crea un comando por sección ya no lo cubre. Se retira del
 * menú, no del bot.
 */
const SECCIONES = [
  { ruta: "/activar", etiqueta: (t: Cadenas) => t.activarWebmaster },
  { ruta: "/red", etiqueta: (t: Cadenas) => t.red },
  { ruta: "/cartera", etiqueta: (t: Cadenas) => t.cartera },
  { ruta: "/historico", etiqueta: (t: Cadenas) => t.historico },
] as const;

/**
 * Rutas alcanzables por comando aunque no estén en el menú.
 *
 * `/pro` es la única superficie donde se ven juntos todos los PRO apagados, y
 * con veinte webmasters eso deja de ser un lujo. Deja de ser un destino de menú
 * y pasa a ser un atajo, que es distinto de desaparecer.
 */
const ATAJOS = [{ ruta: "/pro", etiqueta: (t: Cadenas) => t.colaRenovaciones }] as const;

/** Todo lo que tiene comando propio: el menú más los atajos. */
const CON_COMANDO = [...SECCIONES, ...ATAJOS];

/**
 * El idioma de quien escribe.
 *
 * Sale del `language_code` del propio update, igual que la Mini App lo saca de
 * `initDataUnsafe`: elegir catálogo no autoriza nada, así que no hace falta
 * ningún dato firmado. Y no hace falta ir a la base de datos, que es lo que
 * habría convertido cada `/red` en una consulta extra solo para saber en qué
 * idioma escribir un rótulo.
 */
function idiomaDe(ctx: Context): Cadenas {
  return cadenas(idiomaDesdeTelegram(ctx.from?.language_code));
}

/**
 * Teclado del menú.
 *
 * Telegram solo acepta botones de Mini App sobre HTTPS: en desarrollo, con
 * `APP_URL` en http, un botón `web_app` hace que la API rechace el mensaje
 * ENTERO. Por eso devuelve `undefined` y quien llama manda el enlace en texto,
 * de modo que el bot sigue siendo usable mientras se desarrolla.
 */
function menu(url: string, t: Cadenas): InlineKeyboard | undefined {
  if (!url.startsWith("https://")) return undefined;
  const k = new InlineKeyboard();
  SECCIONES.forEach((s, i) => {
    k.webApp(s.etiqueta(t), `${url}${s.ruta}`);
    // Dos por fila: los rótulos son cortos y cinco botones a lo ancho de un
    // móvil se cortarían.
    if (i % 2 === 1) k.row();
  });
  return k;
}

/**
 * Enlace profundo: `/start red` abre la Mini App directamente en esa pantalla.
 *
 * Telegram entrega el parámetro de `t.me/elbot?start=red` como argumento del
 * comando. Existía a medias —se recogía y no se usaba—, así que un enlace
 * compartido para «mira tu red» abría la portada y dejaba al agente navegando
 * a mano hasta donde ya se le había dicho que fuera.
 *
 * Solo se aceptan rutas conocidas: el parámetro viene de una URL que puede
 * escribir cualquiera, y concatenarlo sin filtrar dejaría abrir la Mini App en
 * una ruta arbitraria del dominio.
 *
 * La lista es `CON_COMANDO` y no `SECCIONES` porque un atajo tiene que poder
 * enlazarse. `/pro` salió del menú justamente para llegar a él por enlace en vez
 * de por navegación, así que dejarlo fuera de aquí lo habría hecho inalcanzable
 * por el único camino que le queda.
 */
function seccionDeParametro(parametro: string | undefined) {
  if (!parametro) return null;
  const ruta = `/${parametro.trim().toLowerCase()}`;
  return CON_COMANDO.find((s) => s.ruta === ruta) ?? null;
}


function registrar(b: Bot): void {
  b.command("start", async (ctx) => {
    const url = urlMiniApp();
    const id = ctx.from?.id;
    const t = idiomaDe(ctx);

    // Un agente ya vinculado entra directo; uno nuevo necesita saber que hace
    // falta un código antes de abrir nada, o se topará con el alta sin entender
    // qué se le pide.
    const vinculado = id
      ? await db.agente.findUnique({
          where: { telegramId: BigInt(id) },
          select: { id: true, nombreVisible: true, estado: true, idioma: true },
        })
      : null;

    if (!url) {
      await ctx.reply(t.botSinPublicar);
      return;
    }

    if (vinculado?.estado === "SUSPENDIDO") {
      await ctx.reply(t.botSuspendido);
      return;
    }

    // El idioma persistido se refresca aquí: es el único momento en que el
    // servidor ve el `language_code` actual de alguien que ya tiene cuenta, y
    // sin esto un agente que cambia el idioma de Telegram seguiría recibiendo
    // los avisos de pago en el que tenía el día que se dio de alta.
    const idiomaActual = idiomaDesdeTelegram(ctx.from?.language_code);
    if (vinculado && vinculado.idioma !== idiomaActual) {
      await db.agente.update({ where: { id: vinculado.id }, data: { idioma: idiomaActual } });
    }

    const seguro = url.startsWith("https://");

    // `/start red` abre esa pantalla y no la portada.
    const seccion = seccionDeParametro(ctx.match?.trim() || undefined);
    if (vinculado && seccion && seguro) {
      await ctx.reply(seccion.etiqueta(t), {
        reply_markup: new InlineKeyboard().webApp(seccion.etiqueta(t), `${url}${seccion.ruta}`),
      });
      return;
    }

    /*
     * EL OPERADOR NO ES UN AGENTE.
     *
     * Sin esto se llevaba la pantalla de un agente nuevo —«necesitas un código
     * de activación»— y un botón que le abría el alta. O sea: la aplicación le
     * pedía a su dueño que se diera de alta en su propio producto, con un código
     * que tendría que generarse a sí mismo.
     *
     * La Mini App es del agente y el Operador tiene otra superficie: sus
     * comandos y el panel. Se comprueba ANTES de la rama del no vinculado y
     * DESPUÉS de la del vinculado, porque las dos cosas no se excluyen: si algún
     * día el Operador se diera de alta también como agente, lo que quiere al
     * escribir /start es su red, no este índice.
     *
     * En español, como el resto de lo suyo: el panel tampoco se traduce, y lo
     * usa una sola persona.
     */
    if (!vinculado && esOperador(id)) {
      await ctx.reply(
        [
          "<b>Sophon Promoters</b>",
          "",
          "Eres el Operador. Desde aquí gestionas la aplicación:",
          "",
          "/codigo — generar un código de activación para un agente",
          "/agentes — agentes dados de alta",
          "/retiros — retiros pendientes de pagar",
          "/panel — abrir el panel web",
        ].join("\n"),
        { parse_mode: "HTML" },
      );
      return;
    }

    // Un agente vinculado recibe el índice completo; uno nuevo, una sola puerta
    // —el alta—, porque las demás no le sirven todavía y ofrecérselas sería
    // mandarle a cinco pantallas que solo pueden decirle que no tiene cuenta.
    const teclado = !seguro
      ? undefined
      : vinculado
        ? menu(url, t)
        : new InlineKeyboard().webApp(t.botVincularCuenta, `${url}/alta`);

    const texto = vinculado
      ? t.botHola(escapar(vinculado.nombreVisible))
      : [
          `<b>${t.botTitulo}</b>`,
          "",
          t.botNecesitasCodigo,
          t.botCuandoLoTengas,
        ].join("\n");

    await ctx.reply(seguro ? texto : `${texto}\n\n${escapar(url)}`, {
      parse_mode: "HTML",
      reply_markup: teclado,
    });
  });

  // Un comando por sección además del teclado: en Telegram mucha gente escribe
  // el comando antes de buscar el botón, y un menú que solo existe como teclado
  // se pierde en cuanto el chat avanza tres mensajes.
  //
  // Se recorre `CON_COMANDO` y no `SECCIONES` para que `/pro` siga respondiendo
  // aunque ya no salga en el teclado. Antes esta lista era la misma que la del
  // menú, así que sacar una ruta del menú le habría borrado el comando de paso.
  for (const seccion of CON_COMANDO) {
    b.command(seccion.ruta.slice(1), async (ctx) => {
      const url = urlMiniApp();
      const t = idiomaDe(ctx);
      if (!url) {
        await ctx.reply(t.botSinPublicar);
        return;
      }
      const etiqueta = seccion.etiqueta(t);
      const destino = `${url}${seccion.ruta}`;
      const teclado = destino.startsWith("https://")
        ? new InlineKeyboard().webApp(etiqueta, destino)
        : undefined;
      await ctx.reply(teclado ? etiqueta : `${etiqueta}\n${destino}`, {
        reply_markup: teclado,
      });
    });
  }

  b.command("panel", async (ctx) => {
    if (!esOperador(ctx.from?.id)) return;

    const enlace = await crearEnlaceDeEntrada(BigInt(ctx.from!.id));
    if (!enlace) {
      await ctx.reply("Falta APP_URL: el panel no tiene URL publicada.");
      return;
    }

    await ctx.reply(
      [
        enlace,
        "",
        `Un solo uso. Caduca en ${MINUTOS_CANJE} minutos.`,
        "Generar otro invalida este.",
      ].join("\n"),
      // Sin previsualización: Telegram la genera abriendo la URL, y eso
      // gastaría el enlace de un solo uso antes de que nadie lo tocara.
      { link_preview_options: { is_disabled: true } },
    );
  });

  /*
   * POR QUÉ NO SE VERIFICA EL ACCESO, EN LA PANTALLA DEL OPERADOR.
   *
   * «Telegram no ha verificado tu acceso» es un 401 con cinco causas posibles y
   * ninguna distinguible desde fuera. El motivo se escribe en el registro del
   * servidor, pero eso obliga a tener abierto el panel de despliegue en el mismo
   * instante en que alguien abre la app, con el móvil en la otra mano.
   *
   * Este comando abre `/diagnostico`, que lo dice en dos segundos y mirando las
   * dos mitades del circuito. Va con botón `web_app` y no como enlace: la mitad
   * de la respuesta es si Telegram entrega el `initData`, y eso solo pasa cuando
   * la app se abre desde dentro de Telegram. Un enlace normal abriría el
   * navegador y daría siempre el mismo «no hay initData», que es la respuesta
   * equivocada a la pregunta.
   *
   * Solo el Operador, como `/panel`: no es una pantalla de agente.
   */
  b.command("diagnostico", async (ctx) => {
    if (!esOperador(ctx.from?.id)) return;

    const url = urlMiniApp();
    if (!url.startsWith("https://")) {
      await ctx.reply("Falta APP_URL en HTTPS: sin ella no hay Mini App que diagnosticar.");
      return;
    }

    await ctx.reply("Ábrelo desde aquí, no por enlace: hace falta que lo abra Telegram.", {
      reply_markup: new InlineKeyboard().webApp("Diagnóstico", `${url}/diagnostico`),
    });
  });

  /*
   * ¿ENTRA EL SERVIDOR EN EL CORREO? Preguntado desde producción.
   *
   * El síntoma real fue `535 Authentication Failed` en mitad de un alta: un
   * agente que no puede entrar, un error en el registro y ninguna forma de
   * probar la credencial sin volver a pedirle a alguien que se dé de alta.
   * Peor todavía, ese 535 dice exactamente lo mismo para cuatro causas
   * distintas —usuario sin el dominio, un espacio de más en la contraseña, la
   * contraseña de la cuenta donde hace falta una de aplicación, o un buzón que
   * no puede enviar—, así que sin poder repetirlo a voluntad se prueban las
   * cuatro a ciegas.
   *
   * `verify()` abre la conexión, negocia el cifrado y hace el AUTH SIN mandar
   * ningún correo, así que se puede repetir todas las veces que haga falta.
   * Con un argumento —`/correo yo@ejemplo.com`— manda además uno de prueba, que
   * es la otra mitad: autenticar y poder entregar no son lo mismo.
   */
  b.command("correo", async (ctx) => {
    if (!esOperador(ctx.from?.id)) return;

    const destino = ctx.match?.trim();
    const r = await probarSmtp();
    if (!r.ok) {
      await ctx.reply(`No entra:\n\n${r.detalle}`);
      return;
    }

    if (!destino) {
      await ctx.reply(
        `Autentica bien: ${r.detalle}.\n\n` +
          "Para probar la entrega de verdad: /correo tu@dirección.com",
      );
      return;
    }

    try {
      // El mismo camino EXACTO que el alta: misma plantilla, misma imagen
      // incrustada, mismo remitente. Una prueba con un envío simplificado
      // podría pasar y dejar el de verdad rebotando por el adjunto.
      // El código y los minutos son de mentira: aquí solo se mira si sale y
      // llega. La caducidad de verdad la pone la ruta del alta.
      await enviarOtp({ email: destino, codigo: "000000", minutosValidez: 10 });
      await ctx.reply(`Enviado a ${destino}. Si no llega, mira la carpeta de correo no deseado.`);
    } catch (e) {
      await ctx.reply(`Autentica pero no entrega:\n\n${e instanceof Error ? e.message : e}`);
    }
  });

  b.command("ayuda", async (ctx) => {
    if (!esOperador(ctx.from?.id)) {
      const url = urlMiniApp();
      const t = idiomaDe(ctx);
      await ctx.reply(
        [
          t.botCadaComando,
          "",
          // `CON_COMANDO`: la ayuda enumera lo que responde, no lo que sale en
          // el teclado. Un comando que existe y no se lista es un comando que
          // nadie usa.
          ...CON_COMANDO.map((s) => `/${s.ruta.slice(1)} — ${s.etiqueta(t).toLowerCase()}`),
          "",
          t.botOStart,
        ].join("\n"),
        { reply_markup: menu(url, t) },
      );
      return;
    }
    await ctx.reply(
      [
        "<b>Comandos</b>",
        "",
        "/codigo — genera un código de activación",
        "/codigo correo@ejemplo.com — solo canjeable con ese correo",
        `/codigo correo@ejemplo.com 30 — vigencia de 30 días (máx. ${MAX_DIAS_CODIGO})`,
        "/agentes — agentes dados de alta y su devengo",
        "/retiros — solicitudes pendientes y su wallet",
        "/panel — enlace de entrada al panel",
        "",
        "<i>Aprobar y marcar como pagado solo se hace desde el panel.</i>",
      ].join("\n"),
      { parse_mode: "HTML" },
    );
  });

  b.command("codigo", async (ctx) => {
    if (!esOperador(ctx.from?.id)) return;

    const partes = (ctx.match ?? "").trim().split(/\s+/).filter(Boolean);
    const posibleEmail = partes.find((p) => p.includes("@"));
    const posibleDias = partes.find((p) => /^\d+$/.test(p));

    if (posibleEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(posibleEmail)) {
      await ctx.reply("Formato de correo no válido.");
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
        actorTipo: "OPERADOR",
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
          ? `Canjeable solo por ${escapar(posibleEmail)}.`
          : "Canjeable por cualquiera que lo reciba.",
        `Caduca en ${dias} ${dias === 1 ? "día" : "días"}. Un solo uso.`,
      ].join("\n"),
      { parse_mode: "HTML" },
    );
  });

  b.command("agentes", async (ctx) => {
    if (!esOperador(ctx.from?.id)) return;

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
      await ctx.reply("Sin agentes registrados. Los códigos de activación se generan con /codigo.");
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
          return `${escapar(a.nombreVisible)}${marca}\n<code>${escapar(a.emailNormalizado)}</code> · ${a._count.webmasters} ${a._count.webmasters === 1 ? "webmaster" : "webmasters"} · ${formatearMicros(saldo.get(a.id) ?? 0n)}`;
        }),
      ].join("\n"),
      { parse_mode: "HTML" },
    );
  });

  b.command("retiros", async (ctx) => {
    if (!esOperador(ctx.from?.id)) return;

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
            // Descifrada: en la base está cifrada y aquí se manda entera, que
            // es como el Operador la copia para pagar desde el móvil.
            `${r.red} · <code>${escapar(leerWallet(r.wallet))}</code>`,
            `<i>${r.estado.toLowerCase()} desde el ${r.solicitadoEn.toISOString().slice(0, 10)}</i>`,
          ].join("\n"),
        ),
        "",
        "<i>El pago se marca en el panel.</i>",
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
    const t = idiomaDe(ctx);
    if (ctx.message.text.startsWith("/")) {
      await ctx.reply(t.botComandoDesconocido);
      return;
    }
    await ctx.reply(t.botUsaStart);
  });

  b.catch((err) => {
    // Un fallo tratando una actualización no puede propagarse: Telegram
    // reintentaría la misma actualización en bucle.
    console.error("[bot] error tratando una actualización", err.error);
  });
}
