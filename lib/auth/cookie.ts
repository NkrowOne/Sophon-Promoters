/**
 * La cookie de sesión, sola y sin dependencias.
 *
 * Vive aparte de `lib/auth/sesion.ts` porque aquel importa `../db.ts`, o sea
 * Prisma, o sea `node:crypto`: cualquier prueba que quiera comprobar cuánto
 * dura la cookie tendría que arrastrar la base de datos entera para leer dos
 * constantes. Aquí no hay ni un import, así que `test/entrada.test.ts` la carga
 * con Node pelado.
 *
 * `sesion.ts` reexporta lo de aquí para que los sitios de llamada no cambien.
 */

export const NOMBRE_COOKIE = "sp_sesion";

/**
 * 400 días: **el máximo que un navegador acepta**, no una cifra elegida a ojo.
 *
 * Chrome, Edge y Firefox recortan a 400 días todo `Max-Age` mayor (es el tope
 * de rfc6265bis). Pedir 10 años no da 10 años: da 400 días y la falsa
 * tranquilidad de creer que da más. Así que se pide exactamente el tope.
 *
 * Estaba en 180. Con el refresco del middleware, esos 400 días se cuentan
 * **desde la última visita**, no desde el alta: mientras el agente entre una
 * vez al año, la sesión no caduca nunca. Y cuando de verdad caduque —un agente
 * que se fue trece meses—, el camino de vuelta es escribir su correo y recibir
 * un OTP, sin código de activación de por medio.
 *
 * El corte inmediato sigue existiendo y no depende de esto: `epocaSesion` en el
 * agente invalida todas sus sesiones de golpe.
 */
export const DIAS_SESION = 400;

export function opcionesCookie() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // La Mini App se sirve dentro de un iframe de Telegram: con `lax` la cookie
    // no viajaría y el agente parecería desconectado en cada carga.
    sameSite: "none" as const,
    path: "/",
    maxAge: DIAS_SESION * 86_400,
  };
}
