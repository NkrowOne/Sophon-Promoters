/**
 * Sesión del panel de Operador.
 *
 * **Sin contraseña, a propósito.** El bot manda un enlace de un solo uso al
 * Telegram del Operador, que ya es el ancla de confianza de toda la
 * aplicación: `TELEGRAM_OPERADOR_ID` decide quién puede generar códigos de
 * activación y quién recibe los avisos de retiro. Añadir una contraseña de
 * entorno sería una credencial más que rotar y que filtrar, sin cubrir ningún
 * riesgo que el control de ese Telegram no cubriera ya.
 *
 * Tres decisiones que hacen que el enlace sea seguro pese a viajar por un chat:
 *
 *  1. **Un solo uso**: el token de canje se borra al gastarlo, así que un
 *     enlace reenviado sin querer ya no abre nada.
 *  2. **Vida corta**: quince minutos para canjearlo. Un chat es un historial
 *     permanente y un enlace de ayer no puede seguir sirviendo.
 *  3. **La sesión también caduca pronto** —doce horas—. Al panel se entra a
 *     hacer algo concreto; una sesión eterna en un portátil abierto es
 *     exactamente lo que no debe quedarse ahí.
 */

import { cookies } from "next/headers";

import { db } from "../db.ts";
import { generarTokenSesion, hashToken } from "../cripto.ts";

// La política de la cookie vive en `cookie-admin.ts`, sin dependencias, para que
// se pueda probar con Node pelado. Se reexporta para no mover los llamantes.
export {
  COOKIE_ADMIN,
  COOKIE_DESDE_TELEGRAM,
  HORAS_SESION_ADMIN,
  MINUTOS_CANJE,
  opcionesCookieAdmin,
  opcionesMarcaTelegram,
} from "./cookie-admin.ts";
import { COOKIE_ADMIN, HORAS_SESION_ADMIN, MINUTOS_CANJE } from "./cookie-admin.ts";

// La comprobación vive en `lib/operador.ts`, que es quien acepta también el
// nombre antiguo de la variable mientras los despliegues se actualizan. Se
// reexporta para no cambiar los sitios de llamada que ya la piden de aquí.
export { esOperador } from "../operador.ts";
import { esOperador } from "../operador.ts";

/**
 * Crea un enlace de entrada de un solo uso.
 *
 * Devuelve la URL completa. El token en claro solo existe aquí y en el mensaje
 * de Telegram: en base de datos se guarda su hash.
 */
export async function crearEnlaceDeEntrada(telegramId: bigint): Promise<string | null> {
  const base = (process.env["APP_URL"] ?? "").replace(/\/+$/, "");
  if (!base) return null;

  // Se invalidan los enlaces anteriores sin canjear: si el Operador pide uno
  // nuevo es porque el anterior no le sirve, y dejarlo vivo solo amplía la
  // ventana en la que un mensaje viejo sigue abriendo el panel.
  await db.sesionAdmin.deleteMany({ where: { telegramId, canjeadoEn: null } });

  const { token: canje, hash: canjeHash } = generarTokenSesion();
  const { hash: tokenHash } = generarTokenSesion();

  await db.sesionAdmin.create({
    data: {
      tokenHash,
      canjeHash,
      telegramId,
      expiraEn: new Date(Date.now() + MINUTOS_CANJE * 60_000),
    },
  });

  return `${base}/admin/entrar?t=${canje}`;
}

/**
 * Canjea el enlace y devuelve el token de sesión en claro, o `null`.
 *
 * El token de sesión se genera aquí y no al crear el enlace: si se hubiera
 * creado antes, habría existido —aunque fuera solo en la base de datos— una
 * sesión utilizable desde el instante en que se mandó el mensaje.
 */
export async function canjearEnlace(canje: string, ip?: string | null): Promise<string | null> {
  const fila = await db.sesionAdmin.findUnique({
    where: { canjeHash: hashToken(canje) },
    select: { id: true, expiraEn: true, canjeadoEn: true, telegramId: true },
  });
  if (!fila || fila.canjeadoEn || fila.expiraEn < new Date()) return null;
  if (!esOperador(fila.telegramId)) return null;

  const { token, hash } = generarTokenSesion();

  // `updateMany` con la condición del canje intacta: dos peticiones simultáneas
  // con el mismo enlace —el previsualizador de enlaces de Telegram lo abre solo—
  // no pueden abrir dos sesiones.
  const { count } = await db.sesionAdmin.updateMany({
    where: { id: fila.id, canjeadoEn: null },
    data: {
      tokenHash: hash,
      canjeHash: null,
      canjeadoEn: new Date(),
      expiraEn: new Date(Date.now() + HORAS_SESION_ADMIN * 3_600_000),
      ip: ip ?? null,
    },
  });
  if (count === 0) return null;

  await db.auditoria.create({
    data: {
      actorTipo: "OPERADOR",
      actorId: String(fila.telegramId),
      accion: "admin.sesion_abierta",
      ip: ip ?? null,
    },
  });

  return token;
}

/**
 * Abre una sesión de Operador **desde dentro de Telegram**, sin enlace.
 *
 * ── POR QUÉ EXISTE, SI YA HABÍA UNA FORMA DE ENTRAR ──
 *
 * La de arriba manda un enlace al chat y ese enlace abre un NAVEGADOR. Funciona,
 * y para el escritorio es lo suyo. Pero el Operador vive en el móvil y en
 * Telegram: sacarlo a Brave para mirar una tabla y volver es la clase de fricción
 * que hace que una pantalla no se mire nunca.
 *
 * Aquí no hace falta enlace porque **Telegram ya ha dicho quién es**: el
 * `initData` viene firmado con el token del bot, así que el `telegramId` que trae
 * es tan de fiar como el de un enlace de un solo uso —más, de hecho: un enlace se
 * puede reenviar y una firma no—. Se comprueba contra `TELEGRAM_OPERADOR_ID` y se
 * abre la sesión directamente.
 *
 * La fila se crea YA CANJEADA (`canjeadoEn`) porque no hay canje que hacer: no ha
 * existido nunca un token intermedio que gastar. `sesionAdmin()` exige ese campo
 * para no aceptar una fila a medio crear, y esta lo está del todo.
 */
export async function abrirSesionDeOperador(
  telegramId: bigint,
  ip?: string | null,
  /**
   * `true` cuando la sesión la abre la CLAVE y no el Telegram declarado.
   *
   * Sin esta marca la sesión se abriría bien y moriría en el segundo clic:
   * `sesionAdmin()` revalida en cada petición que el Telegram de la fila sea el
   * del entorno, y una entrada por clave desde otra cuenta no lo cumple nunca.
   */
  porClave = false,
): Promise<string> {
  const { token, hash } = generarTokenSesion();
  const ahora = new Date();

  await db.sesionAdmin.create({
    data: {
      tokenHash: hash,
      // Sin `canjeHash`: no hay enlace que canjear. Es lo que distingue una
      // sesión abierta desde Telegram de una abierta desde el chat.
      canjeadoEn: ahora,
      telegramId,
      porClave,
      expiraEn: new Date(ahora.getTime() + HORAS_SESION_ADMIN * 3_600_000),
      ip: ip ?? null,
    },
  });

  await db.auditoria.create({
    data: {
      actorTipo: "OPERADOR",
      actorId: String(telegramId),
      // Dos acciones y no una con un campo: en el registro se leen de un vistazo
      // y se pueden buscar por separado. Una entrada por clave desde un Telegram
      // que no es el declarado es lo primero que hay que poder encontrar.
      accion: porClave ? "admin.sesion_abierta_con_clave" : "admin.sesion_abierta_en_telegram",
      ip: ip ?? null,
    },
  });

  return token;
}

export interface SesionAdmin {
  id: string;
  telegramId: bigint;
}

export async function sesionAdmin(): Promise<SesionAdmin | null> {
  const almacen = await cookies();
  const token = almacen.get(COOKIE_ADMIN)?.value;
  if (!token) return null;

  const fila = await db.sesionAdmin.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      telegramId: true,
      expiraEn: true,
      revocadaEn: true,
      canjeadoEn: true,
      porClave: true,
    },
  });

  if (!fila || fila.revocadaEn || !fila.canjeadoEn || fila.expiraEn < new Date()) return null;
  /*
   * Se vuelve a comprobar contra el entorno en CADA petición: si el Operador
   * cambia de cuenta de Telegram, las sesiones de la anterior mueren solas sin
   * tener que acordarse de borrarlas.
   *
   * Las abiertas con la CLAVE quedan fuera de esa comprobación, y tienen que
   * quedar: se abren precisamente cuando el Telegram declarado no cuadra —o no
   * hay ninguno—, así que exigírselo las mataría en la petición siguiente. Lo
   * que las corta a ellas es lo mismo que corta a todas: caducar, revocarse, o
   * que se borre `CLAVE_OPERADOR` y ya no se pueda abrir ninguna nueva.
   */
  if (!fila.porClave && !esOperador(fila.telegramId)) return null;

  return { id: fila.id, telegramId: fila.telegramId };
}

/** Exige sesión de Operador. Devuelve `null` si no la hay. */
export async function exigirAdmin(): Promise<SesionAdmin | null> {
  return sesionAdmin();
}
