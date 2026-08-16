/**
 * Los cuatro saldos de un agente, derivados de SUS asientos.
 *
 * - **devengado**: todo lo ganado, incluidos los días aún provisionales.
 * - **disponible**: lo consolidado que todavía no está comprometido.
 * - **solicitado**: lo que está pedido o aprobado y todavía sin pagar.
 * - **pagado**: lo que ya salió.
 *
 * ── EL LEDGER MANDA, Y SOLO EL LEDGER ──
 *
 * El circuito del dinero es *append-only* y se cierra dentro de la tabla de
 * asientos, sin restar tablas distintas:
 *
 *   · pedir un retiro   → asiento `RETIRO`, CONSOLIDADO, **negativo**
 *   · pagarlo           → no hay asiento nuevo: el negativo ya estaba
 *   · rechazarlo        → asiento `AJUSTE_MANUAL`, CONSOLIDADO, **positivo**,
 *                         que compensa al anterior en vez de borrarlo
 *
 * O sea que la suma de los asientos CONSOLIDADOS **ya es** el disponible, en los
 * cuatro estados por los que puede pasar una solicitud. Es justo lo que decía la
 * cabecera de este fichero —«así el disponible sale de una suma y no de restar
 * tablas distintas, que es donde suelen aparecer los descuadres»— y lo que el
 * código hacía además de eso.
 *
 * ── EL DESCUADRE QUE HABÍA ──
 *
 * `disponible` restaba TAMBIÉN lo solicitado y lo pagado leídos de la tabla de
 * solicitudes, así que cada retiro se descontaba **dos veces**:
 *
 *   pedir 30 $ con 100 $ consolidados → 100 − 30 (asiento) − 30 (tabla) = 40 $
 *
 * y con la solicitud ya PAGADA el segundo descuento no se iba nunca: el
 * disponible del agente quedaba mermado para siempre en el total de todo lo que
 * hubiera cobrado en su vida. Es el peor defecto posible en este producto —el
 * agente no puede sacar un dinero que sí tiene— y no lo veía nadie porque la
 * prueba de extremo a extremo comprueba el devengo y no llega a pedir un retiro.
 *
 * `devengado` tenía la otra cara del mismo error: sumaba los asientos de retiro,
 * así que «lo ganado» BAJABA al cobrar. Ahora se calcula sobre los asientos que
 * no cuelgan de una solicitud (`retiroId: null`), que son los que representan
 * trabajo devengado; eso deja fuera tanto el negativo del retiro como el
 * positivo que lo compensa al rechazarlo, y dentro los ajustes manuales de
 * verdad, que no llevan retiro.
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
 */

import { db } from "../db.ts";
import type { Micros } from "./dinero.ts";

export interface Saldos {
  devengadoMicros: Micros;
  disponibleMicros: Micros;
  solicitadoMicros: Micros;
  pagadoMicros: Micros;
}

/**
 * La aritmética, separada de la consulta para poder probarla.
 *
 * `saldos` necesita base de datos, así que su comportamiento solo se comprobaba
 * en la prueba de extremo a extremo — y allí nunca se pedía un retiro, que es
 * exactamente donde estaba el descuadre. Con la cuenta aparte, los cuatro
 * estados de una solicitud se cubren en `test/saldos.test.ts` sin levantar nada.
 */
export function componerSaldos(entrada: {
  /** Asientos de trabajo (los que NO cuelgan de una solicitud), aún revisables. */
  devengoProvisionalMicros: Micros;
  /** Asientos de trabajo ya fuera de la ventana de revisión. */
  devengoConsolidadoMicros: Micros;
  /** TODO lo consolidado, retiros incluidos. Es el disponible, tal cual. */
  consolidadoConRetirosMicros: Micros;
  solicitadoMicros: Micros;
  pagadoMicros: Micros;
}): Saldos {
  const {
    devengoProvisionalMicros,
    devengoConsolidadoMicros,
    consolidadoConRetirosMicros,
    solicitadoMicros,
    pagadoMicros,
  } = entrada;

  return {
    // Lo ganado no baja al cobrar: los asientos de retiro quedan fuera.
    devengadoMicros: devengoProvisionalMicros + devengoConsolidadoMicros,
    /*
     * El disponible NO vuelve a restar la tabla de solicitudes.
     *
     * El asiento negativo del retiro ya está dentro de esta suma desde el
     * instante en que se pide, y sigue estando cuando se paga. Restarlo otra vez
     * era descontar el mismo dinero dos veces.
     *
     * El suelo en cero se queda: un reverso de Sophon sobre un día ya cobrado
     * puede dejar la cuenta en negativo, y esa deuda se salda contra lo que
     * devengue después, no enseñándole al agente un número rojo que no puede
     * pagar.
     */
    disponibleMicros: consolidadoConRetirosMicros > 0n ? consolidadoConRetirosMicros : 0n,
    // Estos dos son informativos: dicen en qué punto está el dinero que ya salió
    // del disponible, no vuelven a salir de él.
    solicitadoMicros,
    pagadoMicros,
  };
}

export async function saldos(agenteId: string): Promise<Saldos> {
  const [devengoPorEstado, consolidadoTotal, retiros] = await Promise.all([
    // Solo trabajo: `retiroId: null` deja fuera el asiento del retiro y el que
    // lo compensa cuando se rechaza.
    db.asientoComision.groupBy({
      by: ["estado"],
      where: { agenteId, estado: { not: "ANULADO" }, retiroId: null },
      _sum: { importeMicros: true },
    }),
    // Y aquí TODO lo consolidado, retiros incluidos: esto es el disponible.
    db.asientoComision.aggregate({
      where: { agenteId, estado: "CONSOLIDADO" },
      _sum: { importeMicros: true },
    }),
    db.solicitudRetiro.groupBy({
      by: ["estado"],
      where: { agenteId, estado: { in: ["SOLICITADO", "APROBADO", "PAGADO"] } },
      _sum: { importeMicros: true },
    }),
  ]);

  const devengo = (estado: string): Micros =>
    devengoPorEstado.find((p) => p.estado === estado)?._sum.importeMicros ?? 0n;
  const sumaRetiro = (estado: string): Micros =>
    retiros.find((r) => r.estado === estado)?._sum.importeMicros ?? 0n;

  return componerSaldos({
    devengoProvisionalMicros: devengo("PROVISIONAL"),
    devengoConsolidadoMicros: devengo("CONSOLIDADO"),
    consolidadoConRetirosMicros: consolidadoTotal._sum.importeMicros ?? 0n,
    solicitadoMicros: sumaRetiro("SOLICITADO") + sumaRetiro("APROBADO"),
    pagadoMicros: sumaRetiro("PAGADO"),
  });
}
