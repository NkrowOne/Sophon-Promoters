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
  totalParte,
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
  gananciaWebmaster: bigint | null;
  gananciaOperador: bigint | null;
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
           sum(f."countRegister")::int              AS registros,
           sum(f."paymentAmountMicros")::bigint     AS pagado,
           sum(f."gananciaWebmasterMicros")::bigint AS "gananciaWebmaster",
           sum(f."gananciaOperadorMicros")::bigint  AS "gananciaOperador"
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
      gananciaWebmasterMicros: c.gananciaWebmaster ?? 0n,
      gananciaOperadorMicros: c.gananciaOperador ?? 0n,
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

/** Una fila del desglose por webmaster. */
export interface FilaWebmaster {
  webmasterId: string;
  email: string;
  /** `null` si nadie lo trajo: es del árbol del Operador. */
  agente: string | null;
  registros: number;
  pagadoPorUsuariosMicros: bigint;
  /**
   * El reparto completo de su tráfico, por concepto y por parte.
   *
   * Antes esto eran tres totales sueltos, y con tres totales no se contesta
   * «¿de dónde sale lo de éste?». El webmaster solo cobra del PRO; el agente y
   * el Operador cobran de las dos cosas. Sin separar concepto de parte, esa
   * asimetría —que es la regla de negocio entera— no se ve.
   */
  reparto: Reparto;
  /** Su total: lo que Sophon le paga por sus usuarios. */
  cobraMicros: bigint;
}

export interface DesgloseWebmasters {
  filas: FilaWebmaster[];
  /** Cuántos hay en total, para poder decir cuántos no se enseñan. */
  total: number;
  cobranMicros: bigint;
}

/*
 * Cuántos webmasters caben en el panel antes de que la página deje de ser un
 * resumen. Los demás están en `/admin/webmasters`, que es la pantalla que existe
 * para verlos todos y buscarlos.
 */
export const TOPE_DESGLOSE = 25;

/**
 * El pago a cada webmaster, y lo que ese mismo tráfico deja a los demás.
 *
 * El reparto general dice cuánto cobran los webmasters EN CONJUNTO, y eso no
 * sirve para contestar «¿cuánto le estamos pagando a éste?», que es la pregunta
 * que se hace cuando uno reclama o cuando hay que decidir si compensa. Aquí está
 * nombre a nombre.
 *
 * Ordenado por lo que cobra el webmaster y no por registros: quien más registra
 * no es quien más cobra —el 35 % sale de las COMPRAS— y esta tabla es la del
 * pago.
 */
export async function desgloseWebmasters(
  limite = TOPE_DESGLOSE,
): Promise<DesgloseWebmasters> {
  const tarifaGlobal = await db.tarifaVersion.findFirst({
    where: { validaHasta: null },
    orderBy: { validaDesde: "desc" },
    select: { cpaPorRegistroMicros: true, cpsBps: true },
  });

  const crudas = await db.$queryRaw<
    {
      webmasterId: string;
      email: string;
      agente: string | null;
      tieneAgente: boolean;
      cpa: bigint | null;
      cps: number | null;
      registros: number | null;
      pagado: bigint | null;
      gananciaWebmaster: bigint | null;
      gananciaOperador: bigint | null;
    }[]
  >`
    SELECT w.id                                 AS "webmasterId",
           w."emailNormalizado"                 AS email,
           a."nombreVisible"                    AS agente,
           (w."agenteId" IS NOT NULL)           AS "tieneAgente",
           a."cpaPorRegistroMicros"             AS cpa,
           a."cpsBps"                           AS cps,
           sum(f."countRegister")::int              AS registros,
           sum(f."paymentAmountMicros")::bigint     AS pagado,
           sum(f."gananciaWebmasterMicros")::bigint AS "gananciaWebmaster",
           sum(f."gananciaOperadorMicros")::bigint  AS "gananciaOperador"
      FROM "Webmaster" w
      LEFT JOIN "Agente" a ON a.id = w."agenteId"
      LEFT JOIN "FilaDiariaSophon" f
             ON f."webmasterId" = w.id
            AND (w."devengaDesde" IS NULL OR f.fecha >= w."devengaDesde")
     GROUP BY w.id, w."emailNormalizado", a."nombreVisible", w."agenteId",
              a."cpaPorRegistroMicros", a."cpsBps"
  `;

  const filas = crudas.map((c) => {
    const volumen = {
      registros: c.registros ?? 0,
      pagadoPorUsuariosMicros: c.pagado ?? 0n,
      gananciaWebmasterMicros: c.gananciaWebmaster ?? 0n,
      gananciaOperadorMicros: c.gananciaOperador ?? 0n,
    };
    const tarifa: TarifaAgente = c.tieneAgente
      ? {
          cpaPorRegistroMicros: c.cpa ?? tarifaGlobal?.cpaPorRegistroMicros ?? 0n,
          cpsBps: c.cps ?? tarifaGlobal?.cpsBps ?? 0,
        }
      : { cpaPorRegistroMicros: 0n, cpsBps: 0 };
    const r = repartir(volumen, tarifa);

    return {
      webmasterId: c.webmasterId,
      email: c.email,
      agente: c.agente,
      registros: volumen.registros,
      pagadoPorUsuariosMicros: volumen.pagadoPorUsuariosMicros,
      reparto: r,
      cobraMicros: totalParte(r.webmaster),
    };
  });

  const cobranMicros = filas.reduce((t, f) => t + f.cobraMicros, 0n);
  filas.sort((x, y) =>
    y.cobraMicros === x.cobraMicros
      ? y.registros - x.registros
      : y.cobraMicros > x.cobraMicros
        ? 1
        : -1,
  );

  return { filas: filas.slice(0, limite), total: filas.length, cobranMicros };
}
