/**
 * Quién es el Operador.
 *
 * El Operador es la persona que administra todo esto: reparte los códigos de
 * activación, fija las tarifas y paga los retiros. Se identifica por su cuenta
 * de Telegram, y esa cuenta es el ancla de confianza de la aplicación entera —el
 * panel se abre con un enlace que solo le llega a él, y los avisos de dinero
 * solo salen hacia él—.
 *
 * Este módulo existe por una razón muy concreta: **la variable cambió de
 * nombre**. Se llamaba `TELEGRAM_SUPERADMIN_ID` y ahora se llama
 * `TELEGRAM_OPERADOR_ID`, y la leían tres sitios distintos por su cuenta —el
 * guardián del panel, el del bot y el emisor de avisos—. Renombrarla en los tres
 * y ya está tenía un problema que no se ve desde el repositorio: **el valor vive
 * en el panel de Skyway, no aquí**. Un despliegue con el nombre nuevo en el
 * código y el viejo en el panel deja al Operador sin panel, sin comandos y sin
 * avisos de retiro, y los tres fallan EN SILENCIO —el bot ignora el comando, el
 * panel devuelve «sesión requerida»— que es la peor forma de fallar.
 *
 * Así que se aceptan las dos, con la nueva por delante. Es un respaldo de
 * transición, no una alternativa permanente: cuando el panel tenga el nombre
 * nuevo, `TELEGRAM_SUPERADMIN_ID` se puede borrar de aquí y de todas partes.
 *
 * Sin dependencias a propósito: lo importan el bot, la autenticación y los
 * avisos, y meter `db` o `next` aquí ataría esos tres a lo que este módulo
 * arrastrara.
 */

/** El nombre viejo. Sigue valiendo mientras haya despliegues sin actualizar. */
const VARIABLE_ANTIGUA = "TELEGRAM_SUPERADMIN_ID";
const VARIABLE = "TELEGRAM_OPERADOR_ID";

/**
 * El id de Telegram del Operador, o `null` si no está declarado.
 *
 * Se lee en cada llamada y no se cachea en un módulo: el entorno de un proceso
 * de larga vida no cambia, pero cachearlo haría que las pruebas que lo cambian
 * tuvieran que saber que existe una caché.
 */
export function idOperador(): string | null {
  const valor = process.env[VARIABLE]?.trim() || process.env[VARIABLE_ANTIGUA]?.trim();
  return valor || null;
}

/**
 * ¿Es este Telegram el del Operador?
 *
 * Acepta `bigint` porque así es como sale de la base de datos, y `number`
 * porque así es como llega de la API de Telegram. La comparación se hace en
 * texto: un id de Telegram cabe en un `bigint` pero no siempre en el entero
 * seguro de JavaScript, y convertirlo a `number` para compararlo sería
 * introducir un redondeo en un control de acceso.
 */
export function esOperador(telegramId: number | bigint | undefined | null): boolean {
  const declarado = idOperador();
  return Boolean(declarado && telegramId != null && String(telegramId) === declarado);
}

/** Para el aviso de arranque: dice si se está usando el nombre viejo. */
export function usaNombreAntiguo(): boolean {
  return !process.env[VARIABLE]?.trim() && Boolean(process.env[VARIABLE_ANTIGUA]?.trim());
}
