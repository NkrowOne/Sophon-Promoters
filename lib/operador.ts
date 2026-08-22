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

import { timingSafeEqual } from "node:crypto";

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

/**
 * La CLAVE del Operador: la otra forma de entrar al panel.
 *
 * ── QUÉ ES Y QUÉ NO ES ──
 *
 * Es una contraseña que se escribe en el campo del correo de la Mini App y
 * cambia la sesión a modo Operador. Existe porque la vía por Telegram depende de
 * que `TELEGRAM_OPERADOR_ID` esté bien puesto en el panel de despliegue, y eso
 * es un valor que vive fuera de este repositorio: cuando no cuadra, el Operador
 * se queda sin panel y sin ninguna pista de por qué.
 *
 * **Es más débil que la vía por Telegram y conviene saberlo.** Una firma de
 * Telegram no se puede reenviar; una contraseña sí se puede contar, copiar o
 * teclear delante de alguien. Lo que la sostiene son tres cosas:
 *
 *  1. **Hay que estar dentro de Telegram.** La ruta exige `initData` firmado, así
 *     que hace falta una cuenta de Telegram Y la clave. Cualquiera con la clave
 *     y sin Telegram no llega a intentarlo.
 *  2. **Los intentos se cuentan y se cortan.** Sin freno, una contraseña en un
 *     formulario público es un problema de tiempo, no de suerte.
 *  3. **Cada intento queda escrito**, acertado o no.
 *
 * ── POR QUÉ EL MÍNIMO DE LONGITUD ES UNA COMPROBACIÓN Y NO UN CONSEJO ──
 *
 * Sin él, una variable declarada y vacía —`CLAVE_OPERADOR=`— haría que la
 * comparación con la cadena vacía cuadrara, y el primer campo enviado en blanco
 * abriría el panel. Un despiste de despliegue no puede ser una llave maestra, así
 * que por debajo de 12 caracteres la clave sencillamente NO EXISTE.
 */
const VARIABLE_CLAVE = "CLAVE_OPERADOR";
const LARGO_MINIMO_CLAVE = 12;

/** La clave declarada, o `null` si no la hay o es demasiado corta para servir. */
export function claveOperador(): string | null {
  const valor = process.env[VARIABLE_CLAVE]?.trim();
  if (!valor || valor.length < LARGO_MINIMO_CLAVE) return null;
  return valor;
}

/** ¿Está declarada una clave utilizable? Lo mira el aviso de arranque. */
export function hayClaveOperador(): boolean {
  return claveOperador() !== null;
}

/**
 * ¿Es esto la clave del Operador?
 *
 * La comparación es en tiempo constante. No es ceremonia: una comparación normal
 * se para en el primer byte distinto, y la diferencia de tiempo entre fallar en
 * el primero y fallar en el décimo se mide por la red. Con suficientes intentos
 * eso reconstruye la clave carácter a carácter sin acertarla nunca de golpe.
 *
 * Las longitudes se igualan antes de comparar porque `timingSafeEqual` lanza si
 * no coinciden, y esa excepción sería justo la filtración que se quiere evitar.
 */
export function esClaveDeOperador(escrito: string | null | undefined): boolean {
  const clave = claveOperador();
  if (!clave || !escrito) return false;

  const a = Buffer.from(escrito, "utf8");
  const b = Buffer.from(clave, "utf8");
  // Se compara SIEMPRE sobre el mismo tamaño para no delatar la longitud, y el
  // resultado exige además que midieran lo mismo.
  const largo = Math.max(a.length, b.length);
  const relleno = (x: Buffer) => Buffer.concat([x, Buffer.alloc(largo - x.length)]);
  return timingSafeEqual(relleno(a), relleno(b)) && a.length === b.length;
}

/** Para el aviso de arranque: dice si se está usando el nombre viejo. */
export function usaNombreAntiguo(): boolean {
  return !process.env[VARIABLE]?.trim() && Boolean(process.env[VARIABLE_ANTIGUA]?.trim());
}
