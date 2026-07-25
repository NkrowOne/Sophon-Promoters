/**
 * Envío de correo para los códigos de un solo uso.
 *
 * El correo es el identificador del agente y la única vía de recuperación, así
 * que este módulo es parte del camino crítico de acceso. Se mantiene lo más
 * simple posible a propósito: un transporte SMTP y una plantilla.
 */

import nodemailer, { type Transporter } from "nodemailer";

const global_ = globalThis as unknown as { transporte?: Transporter };

function transporte(): Transporter {
  if (global_.transporte) return global_.transporte;

  const host = process.env["SMTP_HOST"];
  if (!host) throw new Error("Falta SMTP_HOST: no se pueden enviar códigos por correo.");

  const t = nodemailer.createTransport({
    host,
    port: Number(process.env["SMTP_PORT"] ?? 587),
    // 465 es SMTPS implícito; el resto negocia STARTTLS.
    secure: Number(process.env["SMTP_PORT"] ?? 587) === 465,
    auth: process.env["SMTP_USER"]
      ? { user: process.env["SMTP_USER"], pass: process.env["SMTP_PASSWORD"] ?? "" }
      : undefined,
  });

  global_.transporte = t;
  return t;
}

/**
 * Envía el código de verificación.
 *
 * El texto dice la caducidad y qué hacer si no lo pidió: un correo con un código
 * y sin contexto es indistinguible de un intento de suplantación, y el agente
 * necesita poder reconocerlo.
 */
export async function enviarOtp(params: {
  email: string;
  codigo: string;
  minutosValidez: number;
}): Promise<void> {
  const { email, codigo, minutosValidez } = params;
  const remitente = process.env["SMTP_REMITENTE"] ?? "Sophon Promoters <no-reply@localhost>";

  const texto = [
    `Tu código de verificación es ${codigo}`,
    "",
    `Caduca en ${minutosValidez} minutos y solo sirve una vez.`,
    "",
    "Si no has pedido entrar en Sophon Promoters, ignora este correo:",
    "sin el código nadie puede acceder a tu cuenta.",
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:420px;color:#10151a">
      <p style="font-size:11px;letter-spacing:.14em;font-weight:600;color:#6b7681;margin:0 0 12px">
        SOPHON PROMOTERS
      </p>
      <p style="margin:0 0 8px">Tu código de verificación:</p>
      <p style="font-family:ui-monospace,monospace;font-size:34px;font-weight:600;
                letter-spacing:.12em;margin:0 0 12px">${codigo}</p>
      <p style="color:#6b7681;font-size:13px;margin:0 0 20px">
        Caduca en ${minutosValidez} minutos y solo sirve una vez.
      </p>
      <p style="color:#6b7681;font-size:13px;margin:0">
        Si no has pedido entrar, ignora este correo: sin el código nadie puede
        acceder a tu cuenta.
      </p>
    </div>`;

  await transporte().sendMail({
    from: remitente,
    to: email,
    subject: `${codigo} es tu código de acceso`,
    text: texto,
    html,
  });
}

/**
 * Avisa al agente de que su retiro cambió de estado. No es crítico —el bot y la
 * propia app también lo muestran—, así que un fallo aquí no debe tumbar la
 * operación que lo provocó.
 */
export async function enviarAvisoRetiro(params: {
  email: string;
  importe: string;
  estado: string;
  motivo?: string | null;
}): Promise<void> {
  try {
    await transporte().sendMail({
      from: process.env["SMTP_REMITENTE"] ?? "Sophon Promoters <no-reply@localhost>",
      to: params.email,
      subject: `Tu retiro de ${params.importe} está ${params.estado.toLowerCase()}`,
      text: [
        `Tu solicitud de retiro de ${params.importe} está ${params.estado.toLowerCase()}.`,
        params.motivo ? `\nMotivo: ${params.motivo}` : "",
      ].join(""),
    });
  } catch (e) {
    console.warn("[correo] no se pudo avisar del retiro:", e);
  }
}
