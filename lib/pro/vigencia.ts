/**
 * La vigencia del PRO: una sola regla, en un solo sitio.
 *
 *     Un PRO activo NO se renueva. Hay que esperar a que termine.
 *
 * **No es solo una preferencia de negocio: es la única postura segura.**
 * `lib/sophon/tipos.ts` documenta que en `setmembership` el `membership_code`
 * nombra el plan y `duration` fija el plazo —ese fue el fallo que hacía que «un
 * año» concediera 30 días—. Lo que NO está documentado en ninguna parte es qué
 * pasa al fijar la membresía sobre una suscripción viva: si el plazo se **suma**
 * o se **sustituye**.
 *
 * Si sustituye, renovar a mitad de año le borra al webmaster los meses que le
 * quedaban, y el agente creería estar regalándole tiempo mientras se lo quita.
 * Como la whitelist del Tool API no está activa en la cuenta de producción, no
 * se puede provocar el caso para comprobarlo. Así que no se llama nunca a
 * `setmembership` sobre una membresía vigente, y la pregunta deja de importar.
 *
 * Este módulo es deliberadamente **puro** —sin Prisma, sin `next`, sin nada de
 * servidor— porque lo consumen las dos orillas: las rutas de API y los
 * componentes de la Mini App. Que el umbral de aviso viviera por triplicado
 * (`Mecha.tsx`, `pro/page.tsx` y `api/pro/route.ts`, cada uno con su copia) era
 * la forma segura de que al cambiarlo solo cambiaran dos.
 */

const MS_POR_DIA = 86_400_000;

/**
 * A partir de aquí, un PRO entra en la cuenta atrás.
 *
 * **Ya no significa «urgente»**, y el cambio de sentido importa. Antes marcaba
 * lo accionable: «se apaga pronto, renuévalo». Con la regla nueva no se puede
 * renovar, así que ahora solo marca lo que conviene tener a la vista —para
 * hablar con el webmaster, no para pulsar un botón—.
 *
 * Sigue en 30 y no en 7 porque el PRO dura un año: avisar con una semana no
 * deja margen para hablar con nadie.
 */
export const DIAS_AVISO_PRO = 30;

/**
 * Días que le quedan, redondeando hacia arriba. `null` si nunca tuvo PRO.
 *
 * Hacia arriba porque el día en curso cuenta: a las 23:00 del último día el PRO
 * todavía sirve, y decir «0 días» sería adelantar la caducidad unas horas.
 */
export function diasRestantesPro(vigenteHasta: Date | null, ahora: Date = new Date()): number | null {
  if (!vigenteHasta) return null;
  return Math.ceil((vigenteHasta.getTime() - ahora.getTime()) / MS_POR_DIA);
}

/** Tiene PRO y no ha caducado. Es lo que bloquea una renovación. */
export function proActivo(vigenteHasta: Date | null, ahora: Date = new Date()): boolean {
  return vigenteHasta !== null && vigenteHasta.getTime() > ahora.getTime();
}

/**
 * Se le puede conceder PRO hoy.
 *
 * Dos casos y solo dos: no lo ha tenido nunca, o el que tenía ya se apagó. Todo
 * lo demás es esperar.
 */
export function renovablePro(vigenteHasta: Date | null, ahora: Date = new Date()): boolean {
  return !proActivo(vigenteHasta, ahora);
}
