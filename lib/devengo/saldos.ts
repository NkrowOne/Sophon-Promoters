/**
 * Los cuatro saldos de un agente, derivados de SUS asientos.
 *
 * - **devengado**: todo lo acumulado, incluidos los días aún provisionales.
 * - **disponible**: lo consolidado menos lo ya solicitado o pagado.
 * - **solicitado**: lo que está pedido o aprobado y todavía sin pagar.
 * - **pagado**: lo que ya salió.
 *
 * Los retiros entran como asientos negativos, así que el disponible sale de una
 * suma y no de restar tablas distintas, que es donde suelen aparecer los
 * descuadres.
 *
 * ── Por qué vive aquí y no en `lib/api/agente.ts` ──
 *
 * Esto es aritmética del ledger: no sabe de peticiones, ni de sesiones, ni de
 * respuestas HTTP. Estaba junto a `exigirAgente` y a los constructores de 401,
 * y por tanto en un módulo que importa `next/server`. La consecuencia no era
 * teórica: `next` no publica mapa de `exports`, así que el resolvedor de módulos
 * de Node no encuentra `next/server` fuera del empaquetador, y la prueba de
 * extremo a extremo —que corre con Node pelado— se caía al importar `saldos`
 * justo en el tramo que comprueba el circuito del dinero.
 *
 * O sea que el acoplamiento dejaba sin cubrir precisamente lo que más falta hace
 * cubrir. Separarlo es lo mismo que ya se hizo con `inicioDelMes`, que estaba
 * atrapada en un módulo que arrastraba `db` y el cliente de Sophon.
 */

import { db } from "../db.ts";
import type { Micros } from "./dinero.ts";

export interface Saldos {
  devengadoMicros: Micros;
  disponibleMicros: Micros;
  solicitadoMicros: Micros;
  pagadoMicros: Micros;
}

export async function saldos(agenteId: string): Promise<Saldos> {
  const [porEstado, retiros] = await Promise.all([
    db.asientoComision.groupBy({
      by: ["estado"],
      where: { agenteId, estado: { not: "ANULADO" } },
      _sum: { importeMicros: true },
    }),
    db.solicitudRetiro.groupBy({
      by: ["estado"],
      where: { agenteId, estado: { in: ["SOLICITADO", "APROBADO", "PAGADO"] } },
      _sum: { importeMicros: true },
    }),
  ]);

  const suma = (estado: string): Micros =>
    porEstado.find((p) => p.estado === estado)?._sum.importeMicros ?? 0n;
  const sumaRetiro = (estado: string): Micros =>
    retiros.find((r) => r.estado === estado)?._sum.importeMicros ?? 0n;

  const devengadoMicros = suma("PROVISIONAL") + suma("CONSOLIDADO");
  const pagadoMicros = sumaRetiro("PAGADO");
  const solicitadoMicros = sumaRetiro("SOLICITADO") + sumaRetiro("APROBADO");

  // Solo lo consolidado es retirable: un día abierto todavía puede revisarse a
  // la baja, y pagar sobre él obligaría a reclamar dinero ya entregado.
  const disponibleMicros = suma("CONSOLIDADO") - pagadoMicros - solicitadoMicros;

  return {
    devengadoMicros,
    disponibleMicros: disponibleMicros > 0n ? disponibleMicros : 0n,
    solicitadoMicros,
    pagadoMicros,
  };
}
