/**
 * El token del bot, leído por un solo sitio.
 *
 * ── EL DEFECTO QUE CIERRA ──
 *
 * El token se leía en cinco módulos y **tres lo recortaban y dos no**:
 *
 *   lib/bot/configurar.ts   process.env["TELEGRAM_BOT_TOKEN"]?.trim()
 *   lib/secretos.ts         process.env["TELEGRAM_BOT_TOKEN"]?.trim()
 *   lib/entorno.ts          process.env[nombre]?.trim()
 *   lib/bot/bot.ts          process.env["TELEGRAM_BOT_TOKEN"]          ← sin recortar
 *   lib/auth/sesion.ts      process.env["TELEGRAM_BOT_TOKEN"]          ← sin recortar
 *
 * Con el valor limpio da igual. Con un espacio o un salto de línea de más
 * —pegar el token en el panel de despliegue es exactamente donde eso pasa— la
 * instalación queda partida por la mitad, y de la peor manera posible: **a
 * medias y en silencio**.
 *
 * Porque lo que se rompe no es lo que uno esperaría. El bot SIGUE FUNCIONANDO:
 * grammY compone `https://api.telegram.org/bot<token>/getMe`, y el analizador de
 * URL de la especificación WHATWG —el que usa `fetch`— **borra los tabuladores y
 * los saltos de línea de la URL entera** antes de resolverla. O sea que el salto
 * de línea desaparece por el camino y Telegram recibe una llamada perfecta.
 *
 * `validarInitData` no tiene esa suerte: el token entra como clave de un HMAC,
 * donde un byte de más es un resumen completamente distinto. Resultado: el bot
 * contesta a `/start`, la Mini App abre, y toda petición suya muere en un 401 que
 * dice «Telegram no ha verificado tu acceso». El único síntoma apunta a Telegram,
 * a la firma o al webhook —a cualquier sitio menos al espacio en blanco—, y en
 * los registros no aparece absolutamente nada, porque ese 401 se emitía sin
 * escribir una línea.
 *
 * Un accesor no arregla un valor mal pegado, pero garantiza lo que aquí importa:
 * que TODOS lean exactamente los mismos bytes. Que el bot funcione es entonces
 * prueba de que la firma también.
 *
 * `lib/entorno.ts` avisa aparte, al arrancar y por su nombre, de cualquier
 * variable con espacios alrededor: esto los tolera, no los aprueba.
 */

/** El token ya recortado. `null` si no está o si es solo espacios. */
export function tokenBot(): string | null {
  const bruto = process.env["TELEGRAM_BOT_TOKEN"];
  if (!bruto) return null;
  const limpio = bruto.trim();
  return limpio.length > 0 ? limpio : null;
}

/**
 * Forma de un token de la Bot API: `<id del bot>:<secreto>`.
 *
 * El id de delante es el identificador de Telegram del propio bot y es público
 * —sale en cualquier enlace `t.me`—; el secreto es lo de después de los dos
 * puntos. Por eso se puede registrar el primero y jamás el segundo.
 */
const FORMA = /^(\d{5,})[:]([A-Za-z0-9_-]{20,})$/;

/**
 * El id público del bot, para poder decir en el registro CUÁL está configurado
 * sin enseñar el secreto. `null` si el token no tiene la forma esperada.
 */
export function idBot(): string | null {
  const t = tokenBot();
  return (t && FORMA.exec(t)?.[1]) ?? null;
}

/**
 * Qué le pasa al token, en una frase apta para el registro.
 *
 * Devuelve `null` cuando no hay nada que decir. Nunca incluye el secreto.
 */
export function pegaDelToken(): string | null {
  const bruto = process.env["TELEGRAM_BOT_TOKEN"];
  if (!bruto || bruto.trim().length === 0) return "no está puesto";
  const limpio = bruto.trim();
  if (limpio !== bruto) {
    return "tiene espacios o saltos de línea alrededor; el bot funcionará igual pero NINGUNA petición de la Mini App se autenticará";
  }
  if (!FORMA.test(limpio)) {
    return `no tiene la forma «<número>:<clave>» (${limpio.length} caracteres)`;
  }
  return null;
}
