import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { generarOtp, hashOtp, normalizarCodigo, normalizarEmail } from "@/lib/cripto";
import { ajustesSmtp, enviarOtp } from "@/lib/correo";
import { cadenas } from "@/lib/i18n";
import { idiomaDesdeTelegram } from "@/lib/idiomas";
import { decidirEntrada } from "@/lib/auth/entrada";
import { telegramDeLaPeticion } from "@/lib/auth/sesion";

/**
 * Paso 1 de la entrada: identificar el correo y mandar el OTP.
 *
 * ── DOS CAMINOS, UNA SOLA PUERTA ──
 *
 * Antes esta ruta hacía una sola cosa: canjear un código de activación. Eso
 * dejaba fuera al agente que YA está dado de alta y solo ha perdido la sesión,
 * que es el caso más frecuente de todos. Peor: había un 409 explícito
 * (`errTelegramYaVinculado`) que le cerraba la puerta en la cara —«esta cuenta
 * de Telegram ya está vinculada»— cuando lo que quería era precisamente entrar
 * en ESA cuenta. La única salida era escribir al Operador para pedir un código
 * de activación nuevo por haber cerrado la app.
 *
 * Ahora la ruta responde a una pregunta antes de decidir: **¿este correo ya
 * tiene cuenta?**
 *
 *   sí  → es una vuelta. Se manda el OTP y punto. Sin código de activación,
 *         que es papel de alta y no de llave.
 *   no  → es un alta. Hace falta el código de activación; si no viene, se
 *         contesta `paso: "codigo"` y la pantalla despliega el campo.
 *
 * Por eso `codigo` es opcional en el cuerpo: la primera llamada de la pantalla
 * lleva solo el correo.
 *
 * ── LO QUE ESTO ENSEÑA, Y POR QUÉ SE ACEPTA ──
 *
 * Contestar `paso: "codigo"` revela si un correo está registrado. Es una fuga
 * real y hay que nombrarla en vez de fingir que no está. Lo que la acota:
 *
 *  1. No se llega aquí sin un `initData` FIRMADO por Telegram. Quien pregunta
 *     tiene una cuenta de Telegram real detrás, no un script anónimo.
 *  2. Sondear no manda correo: la rama del correo desconocido no toca SMTP.
 *  3. El sondeo no abre nada. Aunque se acierte con el correo de otro, el OTP
 *     va a SU buzón y `/api/auth/otp` comprueba que el Telegram que verifica es
 *     el mismo del agente.
 *  4. Y ni siquiera se manda ese correo: si el correo pertenece a otro Telegram,
 *     esta ruta corta ANTES de enviar (`errCorreoYaVinculado`). Sin eso, un
 *     código de activación válido servía para bombardear buzones ajenos con
 *     OTPs, que es lo que decía el hallazgo #36 de la auditoría.
 *
 * Lo que se gana a cambio —que un agente vuelva a entrar solo con su correo— es
 * el requisito del producto.
 */

export const dynamic = "force-dynamic";

const MINUTOS_OTP = 10;
/** Tiempo mínimo entre envíos al mismo correo, para no convertirlo en un ariete. */
const SEGUNDOS_REENVIO = 60;
/**
 * Y un tope por CUENTA DE TELEGRAM, que el de por correo no cubre.
 *
 * El freno de 60 s mira el último OTP *de ese correo*. Con la entrada por
 * correo solo, un mismo Telegram puede recorrer una lista de direcciones sin
 * chocar con él ni una vez, porque cada correo estrena su propio contador. Esto
 * pone un techo a lo que una sola cuenta puede disparar en total.
 */
const MAX_OTP_POR_TELEGRAM = 5;
const VENTANA_TELEGRAM_MINUTOS = 15;

const Cuerpo = z.object({
  // Opcional: el primer paso de la pantalla manda SOLO el correo. Solo se exige
  // cuando el correo no tiene cuenta, o sea cuando de verdad es un alta.
  codigo: z.string().min(4).max(32).optional(),
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

  const emailNormalizado = normalizarEmail(parseado.data.email);
  const telegramId = BigInt(usuario.id);

  /*
   * La pregunta que decide todo lo demás. Va la PRIMERA, antes de mirar ningún
   * código: un agente que vuelve no tiene ninguno que enseñar, y hacerle pasar
   * por la validación de la invitación era justamente el muro.
   */
  const existente = await db.agente.findUnique({
    where: { emailNormalizado },
    select: { telegramId: true, estado: true },
  });

  const codigo = parseado.data.codigo ? normalizarCodigo(parseado.data.codigo) : null;

  // El reparto lo hace `lib/auth/entrada.ts`, que es el MISMO que aplica
  // `/api/auth/otp`: escrito dos veces, las dos rutas acabarían opinando
  // distinto sobre el mismo correo en cuanto alguien tocara una sola.
  const camino = decidirEntrada({ existente, telegramId, codigo });

  if (camino.via === "correo_ajeno") {
    return NextResponse.json(
      { error: t.errCorreoYaVinculado, apoyo: t.errCorreoYaVinculadoApoyo },
      { status: 409 },
    );
  }

  /*
   * Una cuenta parada se dice AQUÍ, no después.
   *
   * Mandarle el OTP a un agente suspendido es hacerle recorrer el correo, el
   * teclado y la espera para chocar al final con «tu cuenta está parada». El
   * mensaje es el mismo que ve en la app; lo que cambia es cuándo lo lee.
   */
  if (camino.via === "cuenta_parada") {
    return NextResponse.json(
      { error: t.errSuspendido, apoyo: t.errSuspendidoApoyo },
      { status: 403 },
    );
  }

  /*
   * Correo desconocido y sin código: no es un fallo, es el primer paso.
   *
   * Se contesta 200 con `paso: "codigo"` y la pantalla despliega el campo del
   * código de activación. Un 400 diría que el agente ha hecho algo mal, y lo
   * único que ha hecho es ser nuevo.
   */
  if (camino.via === "pide_codigo") {
    return NextResponse.json({ ok: true, paso: "codigo", registrado: false });
  }

  if (camino.via === "alta") {
    const invitacion = await db.codigoActivacion.findUnique({ where: { codigo: camino.codigo } });
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

    /*
     * Un Telegram ya vinculado no abre una cuenta SEGUNDA.
     *
     * Esta comprobación se ha quedado, pero ya solo vive en la rama del alta.
     * Antes cubría las dos y era el muro: al agente que volvía a su propia
     * cuenta le decía «este Telegram ya está vinculado a x@y.com», que es
     * verdad y no le servía de nada. Ahora, cuando salta, salta por lo que de
     * verdad describe —estás intentando abrir una cuenta nueva teniendo una— y
     * el apoyo dice la salida: escribe ESE correo.
     */
    const yaVinculado = await db.agente.findUnique({
      where: { telegramId },
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
  }

  // Techo por cuenta de Telegram: el freno de 60 s es por correo y no ve a quien
  // recorre direcciones distintas.
  const desdeTelegram = await db.codigoOtp.count({
    where: {
      telegramId,
      creadoEn: { gt: new Date(Date.now() - VENTANA_TELEGRAM_MINUTOS * 60_000) },
    },
  });
  if (desdeTelegram >= MAX_OTP_POR_TELEGRAM) {
    return NextResponse.json(
      { error: t.errDemasiadosEnvios, apoyo: t.errDemasiadosEnviosApoyo },
      { status: 429 },
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
      telegramId,
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
      // Distinguidas en el registro: una es un alta y la otra una vuelta, y
      // cuando haya que contar cuántos agentes entraron de verdad, mezclarlas
      // haría creer que la red crece cada vez que alguien reinstala Telegram.
      accion: existente ? "sesion.otp_enviado" : "alta.otp_enviado",
      recurso: emailNormalizado,
      detalle: { telegramId: String(usuario.id), codigoInvitacion: codigo },
    },
  });

  return NextResponse.json({
    ok: true,
    paso: "otp",
    registrado: Boolean(existente),
    email: parseado.data.email,
    minutosValidez: MINUTOS_OTP,
  });
}
