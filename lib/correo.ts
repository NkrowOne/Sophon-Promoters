/**
 * El correo del código de un solo uso.
 *
 * Es el camino crítico de acceso: el correo es el identificador del agente y la
 * única vía de recuperación, así que este módulo decide si alguien puede entrar
 * o no. Se mantiene simple a propósito —un transporte SMTP y una plantilla— y
 * eso no es lo mismo que descuidado. Tres cosas que sí importan aquí:
 *
 *  1. **Va en el idioma del agente.** Estaba escrito en español dentro de este
 *     fichero, con lo que un agente italiano recibía la aplicación traducida y,
 *     en el único punto del que depende poder entrar, un correo que no lee. El
 *     idioma ya se conocía: sale del `language_code` que Telegram firma.
 *  2. **Lleva la marca, e incrustada.** Un correo con un código y sin nada que
 *     lo identifique es indistinguible de un intento de suplantación, que es
 *     justo la forma que tiene el fraude por correo. La imagen viaja DENTRO del
 *     mensaje (`cid:`) y no enlazada: los clientes bloquean las imágenes
 *     remotas por defecto, así que un logotipo enlazado no se ve precisamente
 *     en el correo donde hace falta que se vea.
 *  3. **Se maqueta como se maquetan los correos**, no como una página. Estilos
 *     en línea y tablas: Gmail descarta las hojas de estilo, y los clientes de
 *     escritorio no entienden flex ni grid.
 *
 * Se ha ido `enviarAvisoRetiro`. Estaba escrita, en español, sin plantilla…
 * **y no la llamaba nadie**: el aviso de que un retiro cambia de estado sale por
 * el bot (`avisarRetiroResueltoAlAgente`), que llega al mismo sitio y en el
 * idioma correcto. Un segundo canal que no se usa no es redundancia, es una
 * pieza que envejece sin que nadie se entere.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import nodemailer, { type Transporter } from "nodemailer";

import { cadenas } from "./i18n.ts";
import { esRtl, IDIOMA_POR_DEFECTO, type Idioma } from "./idiomas.ts";

const global_ = globalThis as unknown as { transporte?: Transporter; marca?: Buffer };

/** Los colores de la casa, los mismos que `--campo` y `--placa` en `globals.css`. */
const CAMPO = "#f9d027";
const CAMPO_TINTA = "#1a1206";
const TEXTO = "#1f1710";
const TEXTO_APOYO = "#6e5b4a";
const BORDE = "#eadfc6";

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
 * El PNG de la marca, leído una vez por proceso.
 *
 * Lo genera `scripts/iconos.mjs` de la misma geometría que el isotipo de la
 * interfaz, así que no puede quedarse con una versión vieja de la marca.
 *
 * Si no está, el correo sale igual y sin logotipo: quedarse sin poder entrar en
 * la aplicación porque falta un adorno sería un intercambio absurdo. Por eso
 * devuelve `null` en vez de lanzar.
 */
async function marca(): Promise<Buffer | null> {
  if (global_.marca) return global_.marca;
  try {
    const datos = await readFile(join(process.cwd(), "public", "marca-correo.png"));
    global_.marca = datos;
    return datos;
  } catch {
    console.warn("[correo] no se ha encontrado public/marca-correo.png; el correo sale sin marca");
    return null;
  }
}

/** Identificador de la imagen incrustada. Se referencia desde el HTML como `cid:`. */
const CID_MARCA = "marca@sophon-promoters";

/**
 * Envía el código de verificación.
 *
 * El texto dice la caducidad y qué hacer si no lo pidió el destinatario: sin
 * ese contexto, un código suelto no se distingue de un intento de suplantación
 * y el agente no tiene forma de reconocerlo.
 */
export async function enviarOtp(params: {
  email: string;
  codigo: string;
  minutosValidez: number;
  /** El del agente. Sale del `language_code` firmado en el `initData`. */
  idioma?: Idioma;
}): Promise<void> {
  const { email, codigo, minutosValidez } = params;
  const idioma = params.idioma ?? IDIOMA_POR_DEFECTO;
  const t = cadenas(idioma);
  const remitente = process.env["SMTP_REMITENTE"] ?? "Sophon Promoters <no-reply@localhost>";
  const rtl = esRtl(idioma);
  const inicio = rtl ? "right" : "left";

  const texto = [
    t.correoOtpTuCodigo,
    codigo,
    "",
    t.correoOtpCaduca(minutosValidez),
    "",
    t.correoOtpNoPedido,
  ].join("\n");

  const logotipo = await marca();

  /*
   * Maquetación de correo, no de página.
   *
   * Tabla y anchos en atributos: Outlook de escritorio renderiza con el motor
   * de Word y descarta `max-width` en un `div`. `dir` en la raíz para que el
   * árabe se lea desde la derecha, incluida la posición de la marca.
   *
   * El código va en su propia caja sobre el campo de marca: es lo único que hay
   * que copiar del mensaje, y separarlo del texto lo hace localizable de un
   * vistazo entre las notificaciones de una bandeja llena.
   */
  const html = `<div dir="${rtl ? "rtl" : "ltr"}" style="background:#ffffff;padding:24px 0">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="440"
             style="width:440px;max-width:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${TEXTO}">
        <tr>
          <td align="${inicio}" style="padding:0 0 20px">
            ${
              logotipo
                ? `<img src="cid:${CID_MARCA}" width="56" height="56" alt="Sophon"
                     style="display:block;border:0;border-radius:13px">`
                : ""
            }
          </td>
        </tr>
        <tr>
          <td align="${inicio}" style="padding:0 0 12px;font-size:15px;line-height:22px">
            ${t.correoOtpTuCodigo}
          </td>
        </tr>
        <tr>
          <td align="${inicio}" style="padding:0 0 16px">
            <!-- El código va en LTR siempre, también en árabe: una secuencia de
                 seis dígitos que se teclea de izquierda a derecha no se
                 reordena, y el algoritmo bidi la dejaría igual pero el separador
                 de la caja no. -->
            <div dir="ltr" style="background:${CAMPO};color:${CAMPO_TINTA};border-radius:12px;
                        padding:16px 20px;font-family:ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace;
                        font-size:32px;font-weight:700;letter-spacing:.18em;text-align:center">
              ${codigo}
            </div>
          </td>
        </tr>
        <tr>
          <td align="${inicio}" style="padding:0 0 22px;font-size:13px;line-height:20px;color:${TEXTO_APOYO}">
            ${t.correoOtpCaduca(minutosValidez)}
          </td>
        </tr>
        <tr>
          <td align="${inicio}" style="border-top:1px solid ${BORDE};padding:16px 0 0;
                     font-size:13px;line-height:20px;color:${TEXTO_APOYO}">
            ${t.correoOtpNoPedido}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</div>`;

  await transporte().sendMail({
    from: remitente,
    to: email,
    subject: t.correoOtpAsunto(codigo),
    text: texto,
    html,
    ...(logotipo
      ? {
          attachments: [
            {
              filename: "sophon.png",
              content: logotipo,
              cid: CID_MARCA,
              // `inline` y no adjunto: sin esto, algunos clientes enseñan un
              // clip de «archivo adjunto» además de pintar la imagen.
              contentDisposition: "inline" as const,
            },
          ],
        }
      : {}),
  });
}
