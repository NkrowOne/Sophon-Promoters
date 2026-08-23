/**
 * La tarifa en vigor.
 *
 * Estaba en `sync/registros.ts` porque el barrido era su único lector. Dejó de
 * serlo en cuanto el repaso de huecos la necesitó, y entonces cerraba un ciclo
 * —`registros` → `sin-devengar` → `registros`—. Además nunca fue del barrido:
 * cuánto cobra un agente es del dominio del devengo, y el barrido es solo quien
 * lo aplica.
 *
 * `registros.ts` la reexporta, así que ningún llamante cambia.
 */

import { db } from "../db.ts";
import type { Tarifa } from "./motor.ts";

/** Si no hay ninguna configurada, no se devenga nada. */
export async function tarifaVigente(): Promise<Tarifa | null> {
  const t = await db.tarifaVersion.findFirst({
    where: { validaHasta: null },
    orderBy: { validaDesde: "desc" },
  });
  if (!t) return null;
  return {
    id: t.id,
    cpaPorRegistroMicros: t.cpaPorRegistroMicros,
    cpsBps: BigInt(t.cpsBps),
  };
}
