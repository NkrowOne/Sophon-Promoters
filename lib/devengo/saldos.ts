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
 * LO QUE ES DEVENGO Y LO QUE NO, en un solo sitio.
 *
 * Un asiento que cuelga de una solicitud de retiro —el negativo que la crea y el
 * positivo que la compensa cuando se rechaza— **no es trabajo devengado**: es
 * dinero moviéndose de sitio. Todo lo demás sí lo es, incluidos los ajustes
 * manuales de verdad, que no llevan retiro.
 *
 * Vive aquí y se exporta porque el mismo error se cometió TRES veces en tres
 * ficheros distintos, y las tres con el mismo síntoma: sumar el libro entero y
 * llamarlo «lo que has ganado».
 *
 *   · `saldos()` restaba el retiro dos veces y hacía bajar lo devengado al cobrar.
 *   · `/api/agente/resumen` pintaba el día en que pides un retiro como un día en
 *     que PERDISTE dinero, con su barra hacia abajo en la portada.
 *   · `/api/agente/historico` hacía lo mismo con el Testigo y con el total.
 *
 * Un `where` compartido es lo que impide que haya una cuarta. Si aparece una
 * consulta nueva sobre el libro, la pregunta es siempre la misma: ¿esto es «qué
 * he ganado» —y entonces lleva esto— o «cuánto tengo», que es la suma entera?
 */
export const SOLO_DEVENGO = {
  estado: { not: "ANULADO" },
  retiroId: null,
} as const;

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
      where: { agenteId, ...SOLO_DEVENGO },
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

// ─────────────────────── De qué está hecho lo devengado ───────────────────────

/**
 * Las tres vías por las que entra dinero, separadas.
 *
 * La Escalera contesta a «¿dónde está mi dinero?» —devengado, disponible,
 * solicitado, pagado— y esa es la pregunta de la pantalla. La que no contestaba
 * nadie es la de al lado: **de qué está hecho**. Un agente veía un devengado que
 * mezclaba los registros, las compras de PRO y los bonos del mes sin forma de
 * separarlos, así que el bono —que es la parte que premia traer red, y la única
 * que se puede perder por no llegar a tiempo— era invisible en cuanto se cobraba.
 *
 * Mismo `where` que el resto: `SOLO_DEVENGO`. Un retiro no es una vía de
 * ingreso, es dinero cambiando de sitio, y meterlo aquí restaría de «lo que has
 * ganado por registros» un dinero que no tiene nada que ver.
 *
 * Los ajustes van JUNTOS y aparte. Un `AJUSTE_REVERSO` es una revisión a la baja
 * de Sophon y un `AJUSTE_MANUAL` una corrección del Operador; los dos son
 * correcciones sobre lo ya contado, no una cuarta forma de ganar, y sumarlos a
 * su tipo de origen escondería exactamente lo que el agente necesita ver cuando
 * el total no le cuadra.
 */
export interface DesgloseDevengo {
  /** CPA: lo fijo por cada usuario registrado. */
  registrosMicros: Micros;
  /** CPS: el porcentaje de lo que esos usuarios pagan por el PRO. */
  proMicros: Micros;
  /** BONO: los hitos mensuales de toda la red. */
  bonosMicros: Micros;
  /** Reversos de Sophon y correcciones del Operador. Puede ser negativo. */
  ajustesMicros: Micros;
}

export async function desgloseDevengo(agenteId: string): Promise<DesgloseDevengo> {
  const porTipo = await db.asientoComision.groupBy({
    by: ["tipo"],
    where: { agenteId, ...SOLO_DEVENGO },
    _sum: { importeMicros: true },
  });

  const suma = (tipo: string): Micros =>
    porTipo.find((p) => p.tipo === tipo)?._sum.importeMicros ?? 0n;

  return {
    registrosMicros: suma("CPA"),
    proMicros: suma("CPS"),
    bonosMicros: suma("BONO"),
    ajustesMicros: suma("AJUSTE_REVERSO") + suma("AJUSTE_MANUAL"),
  };
}

/** Un mes de bono, ya agrupado: lo que se cobró y el hito que lo explica. */
export interface BonoDelMes {
  /** `AAAA-MM`. */
  mes: string;
  importeMicros: Micros;
  /** El hito más alto que se pagó ese mes, o `null` si el asiento no lo lleva. */
  usuarios: number | null;
  /** Falso mientras alguno de sus asientos siga dentro de la ventana de revisión. */
  consolidado: boolean;
}

/**
 * Los bonos cobrados, AGRUPADOS POR MES.
 *
 * Un mes puede llevar varios asientos: el bono no es acumulable, así que subir
 * de escalón emite la DIFERENCIA hasta la recompensa nueva. Enseñar esos tramos
 * sueltos —«50 $» y luego «100 $»— haría leer dos bonos donde hubo uno de 150,
 * que es justo la confusión que la regla de no acumulación provoca. Se suman por
 * mes y se enseña el hito más alto, que es el que explica el total.
 *
 * El orden es el natural de un historial: lo más reciente primero.
 */
/** Un asiento de bono, con lo justo para agruparlo. */
export interface AsientoBono {
  importeMicros: Micros;
  /** `AAAA-MM-DD`. */
  fechaDevengo: string;
  consolidado: boolean;
  /** El nivel que lo explica. `null` si el asiento se quedó sin él. */
  usuarios: number | null;
}

/**
 * La agrupación, separada de la consulta para poder probarla.
 *
 * Mismo criterio que `componerSaldos`: lo que necesita Postgres no se prueba, y
 * lo único que aquí puede salir mal —sumar mal un mes, quedarse con el nivel
 * bajo, dar por confirmado un mes que todavía se revisa— es aritmética pura.
 *
 * Espera los asientos ya ordenados de más reciente a más antiguo y conserva ese
 * orden: el `Map` respeta el de inserción.
 */
export function agruparBonosPorMes(asientos: readonly AsientoBono[]): BonoDelMes[] {
  const porMes = new Map<string, BonoDelMes>();

  for (const a of asientos) {
    const mes = a.fechaDevengo.slice(0, 7);
    const previo = porMes.get(mes);
    if (!previo) {
      porMes.set(mes, {
        mes,
        importeMicros: a.importeMicros,
        usuarios: a.usuarios,
        consolidado: a.consolidado,
      });
      continue;
    }
    previo.importeMicros += a.importeMicros;
    // El nivel MÁS ALTO del mes, que es el que explica el total: el bono no es
    // acumulable, así que subir de nivel emite la diferencia y quedarse con el
    // primer asiento dejaría el importe del nivel alto etiquetado con el bajo.
    if (a.usuarios !== null && (previo.usuarios === null || a.usuarios > previo.usuarios)) {
      previo.usuarios = a.usuarios;
    }
    // Un solo tramo aún revisable deja el mes entero sin confirmar: el total
    // que se enseña es la suma, y decir que está cerrado cuando una parte puede
    // moverse sería prometer una cifra que todavía no lo es.
    previo.consolidado &&= a.consolidado;
  }

  return [...porMes.values()];
}

export async function bonosPorMes(agenteId: string, meses = 12): Promise<BonoDelMes[]> {
  const asientos = await db.asientoComision.findMany({
    where: { agenteId, tipo: "BONO", estado: { not: "ANULADO" } },
    orderBy: { fechaDevengo: "desc" },
    select: {
      importeMicros: true,
      fechaDevengo: true,
      estado: true,
      bonoEscalon: { select: { usuarios: true } },
    },
  });

  return agruparBonosPorMes(
    asientos.map((a) => ({
      importeMicros: a.importeMicros,
      fechaDevengo: a.fechaDevengo.toISOString().slice(0, 10),
      consolidado: a.estado === "CONSOLIDADO",
      usuarios: a.bonoEscalon?.usuarios ?? null,
    })),
  ).slice(0, meses);
}
