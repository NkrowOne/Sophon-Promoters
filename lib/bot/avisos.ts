/**
 * Avisos del bot al superadmin.
 *
 * El aviso de retiro es la vía por la que el superadmin se entera de que hay
 * algo que pagar, así que lleva **todo lo necesario para hacer la transferencia
 * sin abrir el panel**: importe, red y wallet completa.
 *
 * Ninguna de estas funciones puede tumbar la operación que las provoca. Si
 * Telegram no responde, la solicitud de retiro ya está registrada y el panel la
 * muestra igual; perder el aviso es un inconveniente, perder el retiro no.
 */

const API_TELEGRAM = "https://api.telegram.org";

async function enviar(texto: string): Promise<void> {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  const destino = process.env["TELEGRAM_SUPERADMIN_ID"];
  if (!token || !destino) {
    console.warn("[bot] sin TELEGRAM_BOT_TOKEN o TELEGRAM_SUPERADMIN_ID: aviso omitido");
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
