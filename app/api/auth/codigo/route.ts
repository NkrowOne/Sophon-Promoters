import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { generarOtp, hashOtp, normalizarCodigo, normalizarEmail } from "@/lib/cripto";
import { ajustesSmtp, enviarOtp } from "@/lib/correo";
import { cadenas } from "@/lib/i18n";
import { idiomaDesdeTelegram } from "@/lib/idiomas";
import { telegramDeLaPeticion } from "@/lib/auth/sesion";

/**
 * Paso 1 del alta: canjear el código de activación y pedir el OTP.
 *
 * El código lo genera el Operador desde el bot y se lo pasa al agente. Aquí se
 * valida, se reserva y se manda el código de un solo uso al correo que el agente
 * declara, que será su identificador a partir de entonces.
 */

export const dynamic = "force-dynamic";

const MINUTOS_OTP = 10;
/** Tiempo mínimo entre envíos al mismo correo, para no convertirlo en un ariete. */
const SEGUNDOS_REENVIO = 60;

const Cuerpo = z.object({
  codigo: z.string().min(4).max(32),
  email: z.string().email().max(254),
  nombre: z.string().trim().min(1).max(80).optional(),
});

export async function POST(peticion: Request): Promise<NextResponse> {
  // El initData prueba que la petición sale de Telegram de verdad. Sin él,
  // cualquiera podría quemar códigos de activación desde fuera.
  const usuario = telegramDeLaPeticion(peticion);
  // El agente todavía no existe, así que no hay `Agente.idioma` que leer: el
  // idioma sale del `language_code` que Telegram firma en el initData, el mismo
  // que se persistirá al crear la cuenta en el paso 2.
  const idioma = idiomaDesdeTelegram(usuario?.language_code);
  const t = cadenas(idioma);
  if (!usuario) {
    return NextResponse.json(
      { error: t.errSinTelegram, apoyo: t.errSinTelegramApoyo },
      { status: 401 },
    );
  }

  const parseado = Cuerpo.safeParse(await peticion.json().catch(() => null));
  if (!parseado.success) {
    return NextResponse.json(
      { error: t.errFormatoCodigoCorreo, apoyo: t.errFormatoCodigoCorreoApoyo },
      { status: 400 },
    );
  }

  const codigo = normalizarCodigo(parseado.data.codigo);
  const emailNormalizado = normalizarEmail(parseado.data.email);

  const invitacion = await db.codigoActivacion.findUnique({ where: { codigo } });
  if (!invitacion || invitacion.anuladoEn || invitacion.expiraEn < new Date()) {
    return NextResponse.json(
      { error: t.errCodigoNoVale, apoyo: t.teLoDaElOperador },
      { status: 400 },
    );
  }
  if (invitacion.usosActuales >= invitacion.usosMaximos) {
    return NextResponse.json(
      { error: t.errCodigoUsado, apoyo: t.errCodigoUsadoApoyo },
      { status: 400 },
    );
  }
  // Un código puede emitirse para un correo concreto; entonces solo vale para él.
  if (invitacion.emailDestino && normalizarEmail(invitacion.emailDestino) !== emailNormalizado) {
    return NextResponse.json(
      { error: t.errCodigoOtroCorreo, apoyo: t.errCodigoOtroCorreoApoyo },
      { status: 400 },
    );
  }

  // Un Telegram ya vinculado no puede darse de alta otra vez: si el agente
  // perdió el acceso, la vía es recuperación, no un alta nueva.
  const yaVinculado = await db.agente.findUnique({
    where: { telegramId: BigInt(usuario.id) },
    select: { emailNormalizado: true },
  });
  if (yaVinculado) {
    return NextResponse.json(
      {
        error: t.errTelegramYaVinculado(yaVinculado.emailNormalizado),
        apoyo: t.errTelegramYaVinculadoApoyo,
      },
      { status: 409 },
    );
  }

  const ultimo = await db.codigoOtp.findFirst({
    where: { emailNormalizado, proposito: "VINCULAR_CUENTA", consumidoEn: null },
    orderBy: { creadoEn: "desc" },
  });
  if (ultimo && Date.now() - ultimo.creadoEn.getTime() < SEGUNDOS_REENVIO * 1000) {
    const faltan = Math.ceil(
      (SEGUNDOS_REENVIO * 1000 - (Date.now() - ultimo.creadoEn.getTime())) / 1000,
    );
    return NextResponse.json({ error: t.errEsperaParaOtroCodigo(faltan) }, { status: 429 });
  }

  const otp = generarOtp();
  await db.codigoOtp.create({
    data: {
      emailNormalizado,
      // Con pimienta del entorno: un volcado de la tabla no permite probar
      // códigos de seis dígitos contra ella.
      codigoHash: hashOtp(otp, emailNormalizado),
      proposito: "VINCULAR_CUENTA",
      telegramId: BigInt(usuario.id),
      expiraEn: new Date(Date.now() + MINUTOS_OTP * 60_000),
    },
  });

  try {
    // El idioma viaja al correo: es el único mensaje de todo el alta que sale
    // fuera de la aplicación, y era el único que no estaba traducido.
    await enviarOtp({
      email: parseado.data.email,
      codigo: otp,
      minutosValidez: MINUTOS_OTP,
      idioma,
    });
  } catch (e) {
    /*
     * CONTRA QUÉ servidor ha fallado, y no solo que ha fallado.
     *
     * La traza de nodemailer dice `535 Authentication Failed` y nada más: no
     * dice a qué host se estaba conectando ni con qué usuario, que es
     * justamente lo que hay que comparar con el panel de despliegue. El
     * usuario es una dirección de correo del Operador —no un secreto— y la
     * contraseña no sale por ningún lado.
     */
    const s = ajustesSmtp();
    console.error(
      `[auth] fallo al enviar el OTP por ${s.host ?? "(sin SMTP_HOST)"}:${s.puerto} ` +
        `como ${s.usuario ?? "(sin SMTP_USER)"}`,
      e,
    );
    return NextResponse.json(
      { error: t.errCorreoNoEnviado, apoyo: t.errCorreoNoEnviadoApoyo },
      { status: 502 },
    );
  }

  await db.auditoria.create({
    data: {
      actorTipo: "SISTEMA",
      accion: "alta.otp_enviado",
      recurso: emailNormalizado,
      detalle: { telegramId: String(usuario.id), codigoInvitacion: codigo },
    },
  });

  return NextResponse.json({
    ok: true,
    email: parseado.data.email,
    minutosValidez: MINUTOS_OTP,
  });
}
