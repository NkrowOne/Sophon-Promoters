/**
 * El reparto del panel: por agente, y sumado.
 *
 * Contesta las dos preguntas que hasta ahora había que resolver abriendo la base
 * de datos: **cuántos usuarios ha registrado cada agente** y **cuánto cobra cada
 * parte por ellos**.
 *
 * ── POR QUÉ SE CALCULA AGENTE A AGENTE Y NO DE UN TIRÓN ──
 *
 * Porque la tarifa no es única. `Agente.cpaPorRegistroMicros` y `Agente.cpsBps`
 * pueden pisar la tarifa global para un agente concreto, así que un reparto
 * hecho sobre los totales —volumen de todos por la tarifa general— saldría mal
 * en cuanto exista un solo agente con condiciones propias. Se reparte cada uno
 * con la suya y se suma después, que además es lo que hay que enseñar en la
 * tabla.
 *
 * SQL crudo por lo mismo que en `sin-devengar.ts`: la consulta compara dos
 * columnas de dos tablas —`f.fecha >= w."devengaDesde"`— y el `where` de Prisma
 * no sabe expresarlo. Traerse las filas para filtrar en memoria, sobre el
 * histórico entero y en una página que se pinta en cada visita, no es opción.
 */

import { db } from "../db.ts";
import {
  PARTE_CERO,
  repartir,
  sumarPartes,
  type Parte,
  type Reparto,
  type TarifaAgente,
} from "../devengo/reparto.ts";

/** Una fila de la tabla: un agente y lo que ha traído. */
export interface FilaReparto {
  agenteId: string | null;
  /** `null` en la fila de los webmasters sin agente. */
  nombre: string | null;
  webmasters: number;
  registros: number;
  pagadoPorUsuariosMicros: bigint;
  /** La tarifa que se le ha aplicado, ya resuelta contra la global. */
  tarifa: TarifaAgente;
  /** Si tiene condiciones propias en vez de la tarifa general. */
  tarifaPropia: boolean;
  reparto: Reparto;
}

export interface RepartoDelPanel {
  filas: FilaReparto[];
  totales: {
    webmasters: number;
    registros: number;
    pagadoPorUsuariosMicros: bigint;
    webmaster: Parte;
    agente: Parte;
    operador: Parte;
  };
}

/*
 * Los `::int` y `::bigint` de la consulta NO son adorno.
 *
 * `sum()` sobre una columna entera devuelve `numeric` en Postgres, y Prisma
 * trae un `numeric` como Decimal, no como `bigint`. Multiplicarlo por micros
 * revienta con «Cannot mix BigInt and other types» —en la página entera, no en
 * la celda— y solo se ve al abrirla con datos. Los tipos de aquí son los que la
 * consulta garantiza después del casteo.
 */
interface FilaCruda {
  agenteId: string | null;
  nombre: string | null;
  cpa: bigint | null;
  cps: number | null;
  webmasters: number;
  registros: number | null;
  pagado: bigint | null;
}

/**
 * El reparto completo, listo para pintar.
 *
 * Sin tarifa en vigor devuelve las filas con su volumen y todo a cero: es más
 * útil que una lista vacía, porque enseña el tráfico que está entrando sin que
 * nadie cobre por él —que es exactamente lo que hay que ver cuando falta la
 * tarifa—.
 */
export async function repartoDelPanel(): Promise<RepartoDelPanel> {
  const tarifaGlobal = await db.tarifaVersion.findFirst({
    where: { validaHasta: null },
    orderBy: { validaDesde: "desc" },
    select: { cpaPorRegistroMicros: true, cpsBps: true },
  });

  /*
   * Los webmasters sin agente van en su propia fila y no se descartan.
   *
   * Son las cuentas del árbol del Operador que ningún agente trajo, así que ahí
   * no hay nada que ceder: el fijo del registro y los puntos del PRO son
   * enteros para el Operador. Dejarlas fuera haría que el total del reparto no
   * cuadrara con lo que entra, y esa diferencia se leería como un fallo.
   */
  const crudas = await db.$queryRaw<FilaCruda[]>`
    SELECT w."agenteId"                          AS "agenteId",
           a."nombreVisible"                     AS nombre,
           a."cpaPorRegistroMicros"              AS cpa,
           a."cpsBps"                            AS cps,
           count(DISTINCT w.id)::int             AS webmasters,
           sum(f."countRegister")::int           AS registros,
           sum(f."paymentAmountMicros")::bigint  AS pagado
      FROM "Webmaster" w
      LEFT JOIN "Agente" a ON a.id = w."agenteId"
      LEFT JOIN "FilaDiariaSophon" f
             ON f."webmasterId" = w.id
            AND (w."devengaDesde" IS NULL OR f.fecha >= w."devengaDesde")
     GROUP BY w."agenteId", a."nombreVisible", a."cpaPorRegistroMicros", a."cpsBps"
     ORDER BY sum(f."countRegister") DESC NULLS LAST, a."nombreVisible" ASC
  `;

  const filas: FilaReparto[] = crudas.map((c) => {
    const tarifaPropia = c.cpa !== null || c.cps !== null;
    const tarifa: TarifaAgente = {
      cpaPorRegistroMicros: c.cpa ?? tarifaGlobal?.cpaPorRegistroMicros ?? 0n,
      cpsBps: c.cps ?? tarifaGlobal?.cpsBps ?? 0,
    };
    // Sin agente no hay nada pactado: el reparto es con tarifa a cero, así que
    // el fijo y los puntos quedan enteros del lado del Operador.
    const tarifaAplicada: TarifaAgente =
      c.agenteId === null ? { cpaPorRegistroMicros: 0n, cpsBps: 0 } : tarifa;

    const volumen = {
      registros: c.registros ?? 0,
      pagadoPorUsuariosMicros: c.pagado ?? 0n,
    };

    return {
      agenteId: c.agenteId,
      nombre: c.nombre,
      webmasters: c.webmasters,
      registros: volumen.registros,
      pagadoPorUsuariosMicros: volumen.pagadoPorUsuariosMicros,
      tarifa: tarifaAplicada,
      tarifaPropia: c.agenteId !== null && tarifaPropia,
      reparto: repartir(volumen, tarifaAplicada),
    };
  });

  const totales = filas.reduce(
    (acc, f) => ({
      webmasters: acc.webmasters + f.webmasters,
      registros: acc.registros + f.registros,
      pagadoPorUsuariosMicros: acc.pagadoPorUsuariosMicros + f.pagadoPorUsuariosMicros,
      webmaster: sumarPartes(acc.webmaster, f.reparto.webmaster),
      agente: sumarPartes(acc.agente, f.reparto.agente),
      operador: sumarPartes(acc.operador, f.reparto.operador),
    }),
    {
      webmasters: 0,
      registros: 0,
      pagadoPorUsuariosMicros: 0n,
      webmaster: PARTE_CERO,
      agente: PARTE_CERO,
      operador: PARTE_CERO,
    },
  );

  return { filas, totales };
}
