/**
 * Cuánto lleva parado un webmaster, y a partir de cuándo eso importa.
 *
 * Vive aquí y no dentro de `app/api/agente/red/route.ts` porque ya hay **dos**
 * lectores de este estado —la pantalla de la red y el aviso diario del bot— y
 * el proyecto ya se ha quemado una vez con eso: el umbral de 30 días del PRO
 * vivía por triplicado, y tres copias es la forma segura de que solo cambien
 * dos. Si la Malla dice «14 días parado» y el bot no avisa hasta los 21, el
 * agente deja de fiarse de los dos.
 */

/**
 * Días sin un solo registro, o `null` si nunca ha traído ninguno.
 *
 * La distinción importa: un webmaster recién activado que aún no ha traído
 * nada no está «parado», está empezando. Contar eso como inactividad haría que
 * cada alta generase un aviso al día siguiente, que es la forma más rápida de
 * que el agente silencie el bot.
 *
 * `filas` viene ordenada de más reciente a más antigua, que es como la
 * devuelven las dos consultas que la usan.
 */
export function diasSinActividad(
  filas: readonly { fecha: Date; countRegister: number }[],
  hoy: string,
): number | null {
  const ultima = filas.find((f) => f.countRegister > 0);
  if (!ultima) return null;
  return Math.round((Date.parse(`${hoy}T00:00:00Z`) - ultima.fecha.getTime()) / 86_400_000);
}

/**
 * A partir de cuántos días parado se avisa.
 *
 * Catorce y no siete: el tráfico de un webmaster pequeño es irregular por
 * naturaleza —una semana en blanco es normal— y avisar a los siete días
 * convertiría el aviso en ruido semanal sobre gente que no tiene ningún
 * problema. Y no treinta, porque a los treinta días ya no se recupera a nadie:
 * el webmaster se ha ido a otro programa.
 */
export const DIAS_PARA_AVISAR = 14;

/** Si este webmaster merece salir en el aviso diario. */
export function estaApagado(dias: number | null): boolean {
  return dias !== null && dias >= DIAS_PARA_AVISAR;
}
