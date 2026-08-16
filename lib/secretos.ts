/**
 * Los secretos que la aplicación puede DERIVAR en vez de pedirte.
 *
 * Cada variable de entorno es una oportunidad de que un despliegue salga a
 * medias, y las que salen a medias en silencio son las peores: sin
 * `TELEGRAM_WEBHOOK_SECRET` el bot responde 503 y no contesta a nadie, y sin
 * `CRON_SECRET` los barridos devuelven 503 y **nadie devenga nada** mientras el
 * panel enseña ceros con toda normalidad. Ninguna de las dos avisa por sí sola.
 *
 * Los tres secretos de aquí abajo no son hechos del mundo —no son la contraseña
 * de nadie ni el nombre de un dominio—: son cadenas aleatorias cuyo único
 * requisito es ser imposibles de adivinar y ser LA MISMA a los dos lados. Eso se
 * puede derivar, y derivar es mejor que pedir: no hay nada que copiar, nada que
 * pegar mal y nada que se quede sin poner.
 *
 * ── CÓMO SE DERIVA, Y POR QUÉ ASÍ ──
 *
 * HMAC-SHA256 de una raíz que ya existe, con una etiqueta distinta por uso. Es
 * separación de dominios, la construcción estándar: de la misma raíz salen
 * secretos independientes, y conocer uno no ayuda a adivinar los demás.
 *
 * La raíz NO es la misma para los tres, y la elección importa:
 *
 *  · El secreto del WEBHOOK sale del **token del bot**. Es un secreto compartido
 *    entre Telegram y nosotros, y las dos partes que tienen que coincidir —el
 *    manejador y quien registra el webhook— ya conocen el token. Además queda
 *    atado a la identidad correcta: rotar el token del bot obliga de todas
 *    formas a volver a registrar el webhook, así que el secreto caduca solo,
 *    justo cuando debe.
 *
 *  · La PIMIENTA de los OTP y el secreto del CRON salen de `CLAVE_CIFRADO`, que
 *    es la raíz de la casa y vive en el entorno, nunca en la base de datos. Eso
 *    es lo que conserva intacto el modelo de amenaza de la pimienta: quien se
 *    lleve un volcado de la base sigue sin poder probar códigos de seis dígitos
 *    contra la tabla, porque la raíz no está ahí dentro.
 *
 * ── LO QUE TÚ PONGAS, MANDA ──
 *
 * Si la variable está declarada se usa tal cual. Derivar es el respaldo, no una
 * imposición: un despliegue que ya tiene su `PIMIENTA_OTP` puesta sigue
 * funcionando exactamente igual, y los OTP en vuelo no se invalidan. Solo quien
 * no la ponga recibe una derivada.
 */

import { createHmac } from "node:crypto";

import { tokenBot } from "./bot/token.ts";

/** La raíz de la casa. Se lee aquí y no se importa de `cripto.ts` para no dar el rodeo. */
function claveMaestra(): Buffer {
  const bruto = process.env["CLAVE_CIFRADO"];
  if (!bruto) throw new Error("falta CLAVE_CIFRADO: es la raíz de la que salen los demás secretos");
  return Buffer.from(bruto, "base64");
}

function derivar(raiz: Buffer | string, etiqueta: string): string {
  return createHmac("sha256", raiz).update(`sophon-promoters:${etiqueta}`).digest("hex");
}

/**
 * El secreto que Telegram devuelve en `X-Telegram-Bot-Api-Secret-Token`.
 *
 * Telegram lo acota a 1-256 caracteres de `A-Z a-z 0-9 _ -`; un hex de 64 cabe
 * de sobra y no necesita escaparse.
 *
 * Lo calculan los dos extremos que tienen que coincidir —`/api/bot`, que lo
 * comprueba, y el configurador, que lo registra— así que no hay nada que
 * coordinar entre el código y el panel de despliegue.
 */
export function secretoWebhook(): string | null {
  const declarado = process.env["TELEGRAM_WEBHOOK_SECRET"]?.trim();
  if (declarado) return declarado;

  const token = tokenBot();
  // Sin token no hay bot en absoluto, así que tampoco hay secreto que derivar.
  if (!token) return null;
  return derivar(token, "webhook");
}

/**
 * La pimienta del hash de los OTP.
 *
 * Derivarla de la clave maestra acopla su rotación a la de las wallets: rotar
 * `CLAVE_CIFRADO` invalida además los OTP que estén en vuelo. Duran diez
 * minutos, así que el coste es que alguien pida otro código.
 */
export function pimientaOtp(): string {
  const declarada = process.env["PIMIENTA_OTP"]?.trim();
  if (declarada) return declarada;
  return derivar(claveMaestra(), "pimienta-otp");
}

/**
 * El secreto que protege `/api/cron`.
 *
 * Desde que los barridos corren dentro del proceso, esta ruta es solo el
 * disparador MANUAL —para forzar una vuelta sin esperar al reloj—, así que su
 * secreto ya no tiene que viajar a ningún planificador externo y derivarlo no
 * le cuesta nada a nadie.
 *
 * Sigue estando protegida: es una ruta que habla con Sophon y escribe en el
 * ledger, y dejarla abierta permitiría a cualquiera provocar barridos en bucle.
 */
export function secretoCron(): string {
  const declarado = process.env["CRON_SECRET"]?.trim();
  if (declarado) return declarado;
  return derivar(claveMaestra(), "cron");
}
