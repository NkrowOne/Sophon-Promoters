/**
 * Avisos del bot.
 *
 * Van en las dos direcciones, y esa simetría es el punto:
 *
 *  - **Hacia arriba**: el superadmin se entera de que hay algo que pagar. El
 *    aviso lleva todo lo necesario para hacer la transferencia sin abrir el
 *    panel —importe, red y wallet completa—.
 *  - **Hacia abajo**: el agente se entera de que le han pagado. Antes no había
 *    nada: el agente pedía su dinero y la única forma de saber si había salido
 *    era abrir la cartera y mirar. Un cobro que solo se descubre mirando es un
 *    cobro que se pregunta por privado, y eso lo acaba pagando el superadmin en
 *    tiempo.
 *
 * Ninguna de estas funciones puede tumbar la operación que las provoca. Si
 * Telegram no responde, la solicitud ya está registrada y el panel la muestra
 * igual; perder el aviso es un inconveniente, perder el retiro no.
 */

import { cadenas } from "../i18n.ts";
import { idiomaGuardado } from "../idiomas.ts";

/**
 * Dónde vive la Bot API.
 *
 * Configurable porque si no, esta capa **no se puede probar**: eran tres
 * funciones de aviso con cero cobertura, y son el único canal por el que la
 * aplicación le habla al agente. Con la constante fija, comprobar que un
 * barrido diario manda un mensaje y no cuarenta y ocho exige o llamar a
 * Telegram de verdad o no comprobarlo, y lo segundo es lo que estaba pasando.
 *
 * Telegram admite además servidores locales de la Bot API, así que esto no es
 * solo un gancho de pruebas. La variable la pone el operador, igual que el
 * token: quien pueda cambiarla ya tiene el token.
 */
const API_TELEGRAM = process.env["TELEGRAM_API_URL"] ?? "https://api.telegram.org";

async function enviarA(destino: string | null, texto: string): Promise<void> {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token || !destino) {
    console.warn("[bot] sin token o sin destinatario: aviso omitido");
    return;
  }

  try {
    const r = await fetch(`${API_TELEGRAM}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: destino,
        text: texto,
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) console.warn("[bot] Telegram rechazó el aviso:", r.status, await r.text());
  } catch (e) {
    console.warn("[bot] no se pudo enviar el aviso:", e);
  }
}

async function enviar(texto: string): Promise<void> {
  await enviarA(process.env["TELEGRAM_SUPERADMIN_ID"] ?? null, texto);
}

function escapar(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function avisarRetiroAlSuperadmin(datos: {
  agente: string;
  email: string;
  importe: string;
  red: string;
  wallet: string;
  id: string;
}): Promise<void> {
  await enviar(
    [
      "<b>Solicitud de retiro</b>",
      "",
      `Agente: ${escapar(datos.agente)}`,
      `Correo: ${escapar(datos.email)}`,
      `Importe: <b>${escapar(datos.importe)}</b>`,
      `Red: ${escapar(datos.red)} · USDT`,
      // En bloque de código para poder copiarla de un toque.
      `Wallet: <code>${escapar(datos.wallet)}</code>`,
      "",
      `<i>Solicitud ${escapar(datos.id)}</i>`,
    ].join("\n"),
  );
}

/**
 * El agente se entera de cómo acabó su retiro, en su idioma.
 *
 * Sin `telegramId` no hay a dónde mandarlo —un agente puede haberse dado de alta
 * y no tener Telegram vinculado— y la función se calla: no es un error, es un
 * canal que ese agente no tiene.
 *
 * El importe llega ya formateado por quien llama. Formatearlo aquí obligaría a
 * este módulo a saber de micros, y este módulo solo sabe de mensajes.
 */
export async function avisarRetiroResueltoAlAgente(datos: {
  telegramId: bigint | null;
  idioma: string;
  estado: "PAGADO" | "APROBADO" | "RECHAZADO";
  importe: string;
  red: string;
  wallet: string;
  referencia?: string | null;
  motivo?: string | null;
}): Promise<void> {
  if (datos.telegramId === null) return;
  const t = cadenas(idiomaGuardado(datos.idioma));

  const lineas =
    datos.estado === "PAGADO"
      ? [
          `<b>${escapar(t.botRetiroPagado(datos.importe))}</b>`,
          "",
          escapar(t.botRetiroPagadoRed(datos.red, datos.wallet)),
          // La referencia va en bloque de código: es lo que el agente pega en un
          // explorador de bloques para comprobar por sí mismo que salió.
          ...(datos.referencia
            ? [`${escapar(t.botRetiroReferencia(""))}<code>${escapar(datos.referencia)}</code>`]
            : []),
        ]
      : datos.estado === "APROBADO"
        ? [escapar(t.botRetiroAprobado(datos.importe))]
        : [
            `<b>${escapar(t.botRetiroRechazado(datos.importe))}</b>`,
            ...(datos.motivo ? ["", escapar(t.botMotivo(datos.motivo))] : []),
          ];

  await enviarA(String(datos.telegramId), lineas.join("\n"));
}

/**
 * Su red se está apagando, y el agente no lo va a ver si no entra.
 *
 * Es el único aviso de la aplicación que habla del TRABAJO y no del dinero. Los
 * otros dos avisan de un retiro —o sea, de algo ya ganado—, y ese desequilibrio
 * era el problema: la aplicación empujaba a cobrar y no a vender.
 *
 * **Un mensaje, no uno por webmaster.** Con seis webmasters parados, seis
 * mensajes seguidos es exactamente lo que hace que alguien silencie un bot, y
 * silenciarlo se lleva por delante también el aviso de que le han pagado.
 *
 * Se listan como mucho seis y el resto se resume. Una lista de veinte correos en
 * un móvil no se lee: se cierra.
 */
export async function avisarRedApagadaAlAgente(datos: {
  telegramId: bigint | null;
  idioma: string;
  apagados: readonly { email: string; dias: number }[];
  incidencias: readonly { email: string; estado: string }[];
  total: number;
}): Promise<void> {
  if (datos.telegramId === null) return;
  if (datos.apagados.length === 0 && datos.incidencias.length === 0) return;

  const t = cadenas(idiomaGuardado(datos.idioma));
  const MAXIMO = 6;
  const lineas: string[] = [`<b>${escapar(t.botRedTitulo)}</b>`];

  if (datos.apagados.length > 0) {
    lineas.push("", escapar(t.botRedParados(datos.apagados.length, datos.total)));
    for (const w of datos.apagados.slice(0, MAXIMO)) {
      lineas.push(`· ${escapar(w.email)} — ${escapar(t.botRedDiasParado(w.dias))}`);
    }
    if (datos.apagados.length > MAXIMO) {
      lineas.push(escapar(t.botRedYOtros(datos.apagados.length - MAXIMO)));
    }
  }

  if (datos.incidencias.length > 0) {
    lineas.push("", escapar(t.botRedIncidencias(datos.incidencias.length)));
    for (const w of datos.incidencias.slice(0, MAXIMO)) {
      lineas.push(`· ${escapar(w.email)}`);
    }
    if (datos.incidencias.length > MAXIMO) {
      lineas.push(escapar(t.botRedYOtros(datos.incidencias.length - MAXIMO)));
    }
  }

  lineas.push("", `<i>${escapar(t.botRedComoVerlo)}</i>`);
  await enviarA(String(datos.telegramId), lineas.join("\n"));
}

/**
 * Ha alcanzado un hito y ha cobrado el bono.
 *
 * Es el momento de la recompensa, y por eso llega por Telegram en vez de esperar
 * a que el agente abra la aplicación: un premio que hay que ir a buscar no premia
 * nada.
 *
 * Sin felicitaciones ni exclamaciones, igual que el resto de la aplicación: se
 * dice qué ha alcanzado, cuánto ha cobrado y qué queda por delante. La regla de
 * voz de `lib/i18n.ts` es explícita sobre esto, y un «¡Enhorabuena!» en una
 * herramienta de trabajo suena a promoción de casino.
 */
export async function avisarBonoAlAgente(datos: {
  telegramId: bigint | null;
  idioma: string;
  registros: number;
  importe: string;
  siguiente: { faltan: number; premio: string } | null;
}): Promise<void> {
  if (datos.telegramId === null) return;
  const t = cadenas(idiomaGuardado(datos.idioma));

  await enviarA(
    String(datos.telegramId),
    [
      `<b>${escapar(t.bonoGanado(datos.importe))}</b>`,
      "",
      escapar(t.registrosEsteMes(datos.registros)),
      escapar(
        datos.siguiente
          ? t.faltanParaElBono(datos.siguiente.faltan, datos.siguiente.premio)
          : t.bonoMaximoAlcanzado,
      ),
    ].join("\n"),
  );
}

/** Aviso de descuadre en la conciliación: no debe pasar desapercibido. */
export async function avisarDescuadre(datos: {
  concepto: string;
  descuadre: string;
  detalle?: string;
}): Promise<void> {
  await enviar(
    [
      "<b>Descuadre en la conciliación</b>",
      "",
      `Concepto: ${escapar(datos.concepto)}`,
      `Diferencia: <b>${escapar(datos.descuadre)}</b>`,
      datos.detalle ? `\n${escapar(datos.detalle)}` : "",
      "",
      "<i>Revísalo antes de aprobar más retiros.</i>",
    ].join("\n"),
  );
}
