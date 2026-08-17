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
import { esRtl, IDIOMA_DE_RESPALDO, type Idioma } from "./idiomas.ts";

const global_ = globalThis as unknown as { transporte?: Transporter; marca?: Buffer };

/**
 * Los colores de la casa, resueltos.
 *
 * Es la única duplicación deliberada del sistema visual, y la impone el medio:
 * Gmail descarta las hojas de estilo y Outlook renderiza con el motor de Word,
 * así que aquí no hay `var(--campo)` que valga. Cada uno lleva al lado el token
 * del que sale, que es lo que ata este fichero a `app/(miniapp)/globals.css`
 * cuando la paleta se mueve — como acaba de pasar: estos cinco eran el espresso
 * y el papel crema de la versión anterior.
 */
const CAMPO = "#f9d027"; // --campo · --brand
const CAMPO_TINTA = "#1a1206"; // --campo-tinta · --brand-foreground
const CAMPO_CANTO = "#a8850b"; // --campo-canto · --brand-edge
const TEXTO = "#17171a"; // --texto · --neutral-900
const TEXTO_APOYO = "#5f5f67"; // --tinta-apoyo · --neutral-600
const BORDE = "#e1e1e4"; // --borde · --neutral-200
const PAPEL = "#f5f5f6"; // --superficie-alta · --neutral-50
const TARJETA = "#ffffff"; // --card

/**
 * Una variable del SMTP, recortada.
 *
 * Lo mismo que pasó con el token del bot, y aquí duele más rápido: una
 * contraseña con un espacio o un salto de línea al final llega al servidor tal
 * cual y este contesta `535 Authentication Failed`, que es exactamente el error
 * que da una contraseña equivocada. Se pierde la tarde mirando la contraseña
 * buena. `lib/entorno.ts` avisa aparte y por su nombre de cualquier variable así.
 */
function ajuste(nombre: string): string | undefined {
  const v = process.env[nombre]?.trim();
  return v && v.length > 0 ? v : undefined;
}

/** Cómo está montado el transporte. Lo enseña el diagnóstico; nunca la contraseña. */
export function ajustesSmtp(): { host?: string; puerto: number; usuario?: string; seguro: boolean } {
  const puerto = Number(ajuste("SMTP_PORT") ?? 587);
  return {
    host: ajuste("SMTP_HOST"),
    puerto,
    usuario: ajuste("SMTP_USER"),
    seguro: puerto === 465,
  };
}

function transporte(): Transporter {
  if (global_.transporte) return global_.transporte;

  const { host, puerto, usuario, seguro } = ajustesSmtp();
  if (!host) throw new Error("Falta SMTP_HOST: no se pueden enviar códigos por correo.");

  const t = nodemailer.createTransport({
    host,
    port: puerto,
    // 465 es SMTPS implícito; el resto negocia STARTTLS.
    secure: seguro,
    /*
     * STARTTLS obligatorio en los puertos que no son el 465.
     *
     * Sin esto nodemailer negocia el cifrado si el servidor lo ofrece y sigue en
     * claro si no lo ofrece. O sea que un servidor mal configurado —o alguien
     * en medio que borre el anuncio de STARTTLS, que es el ataque clásico de
     * degradación— se lleva la contraseña del correo por la red sin cifrar. El
     * fallo correcto aquí es no enviar.
     */
    requireTLS: !seguro,
    auth: usuario ? { user: usuario, pass: process.env["SMTP_PASSWORD"]?.trim() ?? "" } : undefined,
  });

  global_.transporte = t;
  return t;
}

/**
 * Prueba la autenticación contra el servidor de correo, sin mandar nada.
 *
 * `verify` abre la conexión, negocia el cifrado y hace el `AUTH`. Es lo que
 * separa «el servidor no me deja entrar» de «el servidor no me responde», que
 * desde el error de un envío no se distingue.
 *
 * Devuelve el motivo en vez de lanzarlo: quien la llama la usa para enseñarlo.
 */
export async function probarSmtp(): Promise<{ ok: boolean; detalle: string }> {
  const { host, puerto, usuario } = ajustesSmtp();
  if (!host) return { ok: false, detalle: "falta SMTP_HOST" };
  const donde = `${host}:${puerto}${usuario ? ` como ${usuario}` : " sin usuario"}`;
  try {
    await transporte().verify();
    return { ok: true, detalle: `entra en ${donde}` };
  } catch (e) {
    const codigo = (e as { responseCode?: number }).responseCode;
    const mensaje = e instanceof Error ? e.message : String(e);
    /*
     * El 535 es el que se lleva las tardes, porque dice lo mismo para cuatro
     * causas distintas. Las cuatro salen aquí escritas, y en el orden en que
     * conviene descartarlas.
     *
     * La primera es la primera por un motivo: es la que da una contraseña
     * CORRECTA. Con la verificación en dos pasos activada, ningún servidor de
     * correo acepta la contraseña de siempre por SMTP —el protocolo no tiene
     * dónde meter el segundo factor—, así que responde 535 igual que si
     * estuviera mal escrita. Uno se queda mirando una contraseña buena.
     * Purelymail lo dice con todas las letras en su página de configuración
     * técnica; Google y Microsoft hacen lo mismo.
     */
    const pista =
      codigo === 535
        ? "\n\nEl servidor rechaza el usuario o la contraseña. Repasa, por este orden:\n" +
          "· ¿Tienes verificación en dos pasos en ese buzón? Entonces la contraseña " +
          "normal NO vale por SMTP aunque sea correcta: hay que crear una contraseña " +
          "de aplicación y poner esa en SMTP_PASSWORD.\n" +
          "· SMTP_USER tiene que ser la dirección ENTERA, con el @dominio.\n" +
          "· ¿Sobra un espacio o un salto de línea al final de la contraseña?\n" +
          "· Que ese buzón exista y pueda enviar."
        : "";
    return { ok: false, detalle: `${donde}\n${mensaje}${pista}` };
  }
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
 * La PLANTILLA, separada del envío.
 *
 * Se ha sacado de `enviarOtp` para que se pueda mirar sin un servidor de correo
 * delante: `scripts/vista-correo.mjs` la pinta a un fichero y `test/correo.test.ts`
 * la comprueba. Un correo que solo se ve mandándolo es un correo que no se
 * revisa nunca — y este es el camino crítico de acceso al producto.
 *
 * `marcaIncrustada` dice si hay logotipo que referenciar por `cid:`. Va como
 * parámetro y no se lee aquí dentro porque la plantilla no debe tocar el disco:
 * es lo que la hace pura y comprobable.
 */
export function plantillaOtp(params: {
  codigo: string;
  minutosValidez: number;
  idioma?: Idioma;
  marcaIncrustada: boolean;
}): { html: string; texto: string; asunto: string } {
  const { codigo, minutosValidez, marcaIncrustada: logotipo } = params;
  const idioma = params.idioma ?? IDIOMA_DE_RESPALDO;
  const t = cadenas(idioma);
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

  /*
   * Maquetación de correo, no de página.
   *
   * Tabla y anchos en atributos: Outlook de escritorio renderiza con el motor
   * de Word y descarta `max-width` en un `div`. `dir` en la raíz para que el
   * árabe se lea desde la derecha, incluida la posición de la marca.
   *
   * ══ CÓMO SE COPIA EL CÓDIGO ══
   *
   * No hay botón de copiar, y no es un olvido: **un correo no ejecuta
   * JavaScript**. Ni Gmail, ni Apple Mail, ni Outlook, ni AMP for Email dan
   * acceso al portapapeles. Cualquier cosa con forma de botón que pusiéramos
   * aquí sería un botón que no hace nada, que es peor que no tenerlo.
   *
   * Lo que sí se puede hacer es que el gesto que YA existe —mantener pulsado—
   * seleccione exactamente el código y nada más. Tres cosas lo consiguen, y las
   * tres están abajo:
   *
   *  1. **El código va SOLO en su celda**, sin una palabra pegada. La selección
   *     por defecto de un pulsado largo es por palabra, así que un código sin
   *     vecinos se selecciona entero al primer intento en cualquier cliente,
   *     incluidos los que descartan todo el CSS.
   *  2. **`user-select: all`** donde se respeta (Apple Mail, Gmail web): un
   *     toque selecciona el bloque completo en vez de una palabra.
   *  3. **La caja es grande** —22 px de relleno— porque el objetivo del pulsado
   *     largo es la caja, no los seis dígitos.
   *
   * La otra mitad del gesto vive en la aplicación: el paso del OTP tiene un
   * botón «Pegar» que lee el portapapeles de una vez (`app/(miniapp)/alta`).
   * Entre los dos, traer el código del correo son dos toques.
   *
   * Y sigue estando en el ASUNTO, que es lo más rápido de todo: se lee desde la
   * notificación sin abrir nada.
   */
  const html = `<div dir="${rtl ? "rtl" : "ltr"}" style="background:${PAPEL};padding:32px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr><td align="center">
      <!-- La TARJETA. Es el objeto que el sistema visual levanta del papel; en
           correo la sombra no es fiable, así que lo que la separa es el filete
           de 1 px, que sí entiende todo el mundo. -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="440"
             style="width:440px;max-width:100%;background:${TARJETA};border:1px solid ${BORDE};border-radius:16px;color:${TEXTO}">
        <tr><td style="padding:28px 28px 26px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td align="${inicio}" style="padding:0 0 22px">
                ${
                  logotipo
                    ? `<img src="cid:${CID_MARCA}" width="52" height="52" alt="Sophon"
                         style="display:block;border:0;border-radius:12px">`
                    : `<span style="font-size:17px;font-weight:700;letter-spacing:-.01em">Sophon Promoters</span>`
                }
              </td>
            </tr>
            <tr>
              <td align="${inicio}" style="padding:0 0 14px;font-size:15px;line-height:22px;color:${TEXTO_APOYO}">
                ${t.correoOtpTuCodigo}
              </td>
            </tr>
            <tr>
              <td align="${inicio}" style="padding:0 0 10px">
                <!-- El código va en LTR siempre, también en árabe: una secuencia
                     de seis dígitos que se teclea de izquierda a derecha no se
                     reordena, y el algoritmo bidi la dejaría igual pero la caja
                     no.

                     El text-indent iguala al letter-spacing y NO sobra: el
                     espacio entre letras se añade DETRÁS de cada carácter,
                     incluido el último, así que un texto centrado con tracking
                     queda descentrado media unidad hacia la izquierda. Es el
                     mismo defecto que tenía el campo del OTP en la aplicación,
                     y se arregla igual. -->
                <div dir="ltr" style="background:${CAMPO};background-image:linear-gradient(135deg,#fbda4e 0%,#f9d027 52%,#e5bc10 100%);color:${CAMPO_TINTA};border:1px solid ${CAMPO_CANTO};border-radius:14px;padding:22px 16px;font-family:ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:.18em;text-indent:.18em;text-align:center;-webkit-user-select:all;-moz-user-select:all;-ms-user-select:all;user-select:all">${codigo}</div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 0 20px;font-size:13px;line-height:19px;color:${TEXTO_APOYO}">
                ${t.correoOtpTocaParaCopiar}
              </td>
            </tr>
            <tr>
              <td align="${inicio}" style="padding:0 0 20px;font-size:14px;line-height:21px;color:${TEXTO_APOYO}">
                ${t.correoOtpCaduca(minutosValidez)}
              </td>
            </tr>
            <tr>
              <td align="${inicio}" style="border-top:1px solid ${BORDE};padding:18px 0 0;font-size:13px;line-height:20px;color:${TEXTO_APOYO}">
                ${t.correoOtpNoPedido}
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`;

  return { html, texto, asunto: t.correoOtpAsunto(codigo) };
}

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
  const { email, codigo, minutosValidez, idioma } = params;
  const remitente = process.env["SMTP_REMITENTE"] ?? "Sophon Promoters <no-reply@localhost>";

  const logotipo = await marca();
  const { html, texto, asunto } = plantillaOtp({
    codigo,
    minutosValidez,
    idioma,
    marcaIncrustada: logotipo !== null,
  });

  await transporte().sendMail({
    from: remitente,
    to: email,
    subject: asunto,
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
