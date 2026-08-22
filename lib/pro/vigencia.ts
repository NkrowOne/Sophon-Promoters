/**
 * La vigencia del PRO: una sola regla, en un solo sitio.
 *
 *     El PRO se concede UNA VEZ. No acumula. Mientras esté activo no se
 *     renueva: hay que esperar a que caduque.
 *
 * **Ya no es una postura prudente ante una duda: es lo que hace Sophon.** El
 * comentario que había aquí decía que no se sabía si al fijar la membresía sobre
 * una suscripción viva el plazo se suma o se sustituye, y que por si acaso no se
 * tocaba. La duda está resuelta —lo ha confirmado el Operador—: **no acumula**.
 *
 * O sea que conceder sobre un PRO vigente no regala tiempo: lo TIRA. El agente
 * creería estar dándole meses a su webmaster mientras se los quita, y el
 * webmaster perdería lo que le quedaba sin que nadie se enterase, porque no hay
 * ningún endpoint que permita consultar una membresía después de concederla.
 *
 * Es la única operación de esta aplicación que puede QUITARLE algo a alguien, y
 * por eso el guardián está por duplicado en `conceder.ts`: uno mira nuestra
 * anotación (`Webmaster.proVigenteHasta`) y otro mira lo que de verdad se pidió
 * (la tabla de concesiones). Un PRO concedido y mal anotado sigue siendo un PRO,
 * y ya hubo una vez en que esa diferencia costó seis concesiones sobre la misma
 * cuenta en un minuto.
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

/**
 * Tiene PRO y no ha caducado. Es lo que bloquea una segunda concesión.
 *
 * «No ha caducado» es estrictamente mayor que ahora: un PRO que termina hoy a
 * las 23:00 sigue siendo un PRO a las 22:59. Conceder ahí tiraría esas horas.
 */
export function proActivo(vigenteHasta: Date | null, ahora: Date = new Date()): boolean {
  return vigenteHasta !== null && vigenteHasta.getTime() > ahora.getTime();
}

/**
 * Hasta cuándo tiene PRO de verdad, mirando las DOS fuentes.
 *
 * `Webmaster.proVigenteHasta` es nuestra ANOTACIÓN; la tabla de concesiones es el
 * registro de lo que se PIDIÓ. Normalmente dicen lo mismo. Cuando no —pasó: una
 * respuesta de Sophon sin fecha dejó la anotación vacía con la membresía viva—,
 * manda la que va más lejos: un PRO concedido y mal anotado sigue siendo un PRO.
 *
 * Existe para que el guardián de `concederAnio` y las pantallas que pintan el
 * botón lean lo mismo. Con dos criterios, la pantalla ofrece «Dar un año» y el
 * servidor contesta «ya está activo», que es el defecto contra el que el propio
 * `/api/pro` lleva escrita una advertencia desde antes de que esto existiera.
 *
 * El fin de la concesión se calcula desde `creadoEn + duracionSegundos` cuando no
 * trae `vigenteHasta`, porque ese campo es justo el que puede faltar.
 */
export function finEfectivoDelPro(
  proVigenteHasta: Date | null,
  ultimaConcesion?: {
    creadoEn: Date;
    duracionSegundos: number;
    vigenteHasta: Date | null;
  } | null,
): Date | null {
  const porConcesion = ultimaConcesion
    ? (ultimaConcesion.vigenteHasta ??
      new Date(ultimaConcesion.creadoEn.getTime() + ultimaConcesion.duracionSegundos * 1000))
    : null;

  if (!proVigenteHasta) return porConcesion;
  if (!porConcesion) return proVigenteHasta;
  return porConcesion.getTime() > proVigenteHasta.getTime() ? porConcesion : proVigenteHasta;
}

/**
 * Se le puede conceder PRO hoy.
 *
 * Dos casos y solo dos: no lo ha tenido nunca, o el que tenía ya se apagó. Todo
 * lo demás es esperar, porque no acumula: adelantar la concesión no suma plazo,
 * sustituye el que hay.
 */
export function renovablePro(vigenteHasta: Date | null, ahora: Date = new Date()): boolean {
  return !proActivo(vigenteHasta, ahora);
}
