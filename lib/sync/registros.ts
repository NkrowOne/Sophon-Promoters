/**
 * Barrido de registros: la pieza que convierte la API de Sophon en asientos.
 *
 * Sophon no publica eventos, publica **contadores acumulados por (webmaster, día)**
 * que además puede revisar más tarde. Y publica dos cifras distintas para la
 * misma fila según el `affiliateLevel`: con `1` la ganancia TOTAL y con `2` la
 * del webmaster. La diferencia es lo que entra al superadmin.
 *
 * Por eso el barrido lee **las dos versiones de cada fila** y las cruza por
 * `(email, fecha)`. Leer solo una dejaría el margen sin calcular.
 *
 * Sobre la ventana: no se relee todo el histórico en cada vuelta —serían miles
 * de páginas— sino los últimos días, porque son los únicos que Sophon puede
 * revisar. Un día más viejo que la ventana se considera cerrado.
 */

import { db, CERROJO, conCerrojo } from "../db.ts";
import { microsDesdeCadena, type Micros } from "../devengo/dinero.ts";
import {
  DIAS_VENTANA_REVISION,
  estaCerrado,
  inicioVentana,
  planificarAsientos,
  type AsentadoPrevio,
  type FilaDiaria,
  type Tarifa,
} from "../devengo/motor.ts";
import { normalizarEmail } from "../cripto.ts";
import type { ClienteSophon } from "../sophon/cliente.ts";
import { NivelAfiliado, type FilaRegistro } from "../sophon/tipos.ts";

export interface ResultadoBarrido {
  filasLeidas: number;
  filasEscritas: number;
  asientosCreados: number;
  webmastersNuevos: number;
  desde: string;
  hasta: string;
}

/** Clave de cruce entre los dos niveles: la fila es (webmaster, día). */
function clave(email: string, fecha: string): string {
  return `${normalizarEmail(email)}|${fecha}`;
}

/** Fecha de hoy en la zona horaria contable, en `YYYY-MM-DD`. */
export function hoyContable(zona = process.env["ZONA_HORARIA"] ?? "Europe/Madrid"): string {
  // `en-CA` da directamente el formato ISO, que es lo que espera la API.
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(new Date());
}

/**
 * Descarga todas las filas agrupadas por webmaster de un nivel, indexadas por
 * `(email, fecha)`. Se materializa en memoria porque hay que cruzar los dos
 * niveles y la ventana es de días, no de años: son cientos de filas, no millones.
 */
async function leerNivel(
  cliente: ClienteSophon,
  nivel: NivelAfiliado,
  desde: string,
  hasta: string,
): Promise<Map<string, FilaRegistro>> {
  const indice = new Map<string, FilaRegistro>();
  for await (const fila of cliente.todosLosRegistros({
    desde,
    hasta,
    nivel,
    agruparPorWebmaster: true,
    tamano: 500,
  })) {
    const email = (fila.email ?? "").trim();
    // Sin email no se puede atribuir a nadie; se descarta en vez de inventar.
    if (!email || !fila.date) continue;
    indice.set(clave(email, fila.date), fila);
  }
  return indice;
}

/**
 * Ejecuta el barrido sobre la ventana de revisión.
 *
 * Devuelve `null` si otro barrido ya estaba corriendo: es deliberado, para un
 * proceso periódico es mejor saltarse una vuelta que encolar ejecuciones.
 */
export async function barrerRegistros(
  cliente: ClienteSophon,
  opciones: { desde?: string; hasta?: string; dias?: number } = {},
): Promise<ResultadoBarrido | null> {
  return conCerrojo(CERROJO.SYNC_REGISTROS, async () => {
    const hasta = opciones.hasta ?? hoyContable();
    const dias = opciones.dias ?? DIAS_VENTANA_REVISION;
    const desde = opciones.desde ?? inicioVentana(hasta, dias);

    const ejecucion = await db.ejecucionSync.create({
      data: { tipo: "REGISTROS", desde: new Date(desde), hasta: new Date(hasta) },
    });

    try {
      const [total, webmaster] = await Promise.all([
        leerNivel(cliente, NivelAfiliado.Total, desde, hasta),
        leerNivel(cliente, NivelAfiliado.Webmaster, desde, hasta),
      ]);

      const tarifa = await tarifaVigente();
      let filasEscritas = 0;
      let asientosCreados = 0;
      let webmastersNuevos = 0;

      for (const [k, filaTotal] of total) {
        const filaWebmaster = webmaster.get(k);
        const email = (filaTotal.email ?? "").trim();
        const fecha = filaTotal.date;

        const r = await procesarFila({
          email,
          fecha,
          filaTotal,
          filaWebmaster,
          tarifa,
          hoy: hasta,
          dias,
        });
        filasEscritas += r.escrita ? 1 : 0;
        asientosCreados += r.asientos;
        webmastersNuevos += r.webmasterNuevo ? 1 : 0;
      }

      const resultado: ResultadoBarrido = {
        filasLeidas: total.size,
        filasEscritas,
        asientosCreados,
        webmastersNuevos,
        desde,
        hasta,
      };

      await db.ejecucionSync.update({
        where: { id: ejecucion.id },
        data: {
          estado: "COMPLETADA",
          terminadaEn: new Date(),
          filasLeidas: total.size,
          filasEscritas,
          asientosCreados,
        },
      });

      return resultado;
    } catch (e) {
      await db.ejecucionSync.update({
        where: { id: ejecucion.id },
        data: {
          estado: "FALLIDA",
          terminadaEn: new Date(),
          error: e instanceof Error ? e.message : String(e),
        },
      });
      throw e;
    }
  });
}

/**
 * Guarda una fila y devenga lo que falte, todo en una transacción.
 *
 * El devengo se calcula por diferencia contra lo ya asentado (ver
 * `planificarAsientos`), así que este procedimiento es idempotente: llamarlo dos
 * veces con los mismos datos de Sophon no escribe nada la segunda vez.
 */
async function procesarFila(params: {
  email: string;
  fecha: string;
  filaTotal: FilaRegistro;
  filaWebmaster: FilaRegistro | undefined;
  tarifa: Tarifa | null;
  hoy: string;
  dias: number;
}): Promise<{ escrita: boolean; asientos: number; webmasterNuevo: boolean }> {
  const { email, fecha, filaTotal, filaWebmaster, tarifa, hoy, dias } = params;
  const emailNormalizado = normalizarEmail(email);

  const gananciaTotalMicros = microsDesdeCadena(filaTotal.myEarning);
  // Si falta el nivel 2 para esa fila, el margen no se puede calcular todavía.
  // Se guarda la fila igualmente —el dato del agente es válido— y el margen
  // queda a cero hasta que el siguiente barrido lo complete.
  const gananciaWebmasterMicros = filaWebmaster
    ? microsDesdeCadena(filaWebmaster.myEarning)
    : 0n;

  return db.$transaction(async (tx) => {
    let webmasterNuevo = false;

    let wm = await tx.webmaster.findUnique({ where: { emailNormalizado } });
    if (!wm) {
      // Aparece en Sophon pero nadie lo activó desde la app: entra huérfano.
      // Asignarlo a un agente más tarde será PROSPECTIVO (`devengaDesde`), o el
      // agente cobraría tráfico que no trajo él.
      wm = await tx.webmaster.create({
        data: {
          emailNormalizado,
          emailOriginal: email,
          origen: "HUERFANO",
          estadoSophon: "DESCONOCIDO",
        },
      });
      webmasterNuevo = true;
    }

    const cerrado = estaCerrado(fecha, hoy, dias);
    const datosFila = {
      countRegister: Number(filaTotal.countRegister) || 0,
      countT1Register: Number(filaTotal.countT1Register) || 0,
      countT2Register: Number(filaTotal.countT2Register) || 0,
      countT3Register: Number(filaTotal.countT3Register) || 0,
      countPayingUsers: Number(filaTotal.countPayingUsers) || 0,
      paymentAmountMicros: microsDesdeCadena(filaTotal.paymentAmount),
      gananciaTotalMicros,
      gananciaWebmasterMicros,
      gananciaSuperadminMicros: gananciaTotalMicros - gananciaWebmasterMicros,
      cerrado,
    };

    const fila = await tx.filaDiariaSophon.upsert({
      where: { webmasterId_fecha: { webmasterId: wm.id, fecha: new Date(fecha) } },
      create: { webmasterId: wm.id, fecha: new Date(fecha), ...datosFila },
      update: datosFila,
    });

    // Sin agente atribuido no hay a quién devengar. La fila se guarda igual:
    // el día que se le asigne un agente, el histórico ya está disponible para
    // decidir la frontera de atribución.
    if (!wm.agenteId || !tarifa) return { escrita: true, asientos: 0, webmasterNuevo };

    const previo = await asentadoPrevio(tx, fila.id);
    const filaDominio: FilaDiaria = {
      webmasterId: wm.id,
      fecha,
      countRegister: datosFila.countRegister,
      countT1Register: datosFila.countT1Register,
      countT2Register: datosFila.countT2Register,
      countT3Register: datosFila.countT3Register,
      countPayingUsers: datosFila.countPayingUsers,
      paymentAmountMicros: datosFila.paymentAmountMicros,
      gananciaTotalMicros,
      gananciaWebmasterMicros,
    };

    const planificados = planificarAsientos({
      fila: filaDominio,
      tarifa,
      previo,
      devengaDesde: wm.devengaDesde ? isoFecha(wm.devengaDesde) : null,
      fechaAjuste: hoy,
    });

    for (const a of planificados) {
      await tx.asientoComision.create({
        data: {
          agenteId: wm.agenteId,
          webmasterId: wm.id,
          filaId: fila.id,
          tipo: a.tipo,
          estado: cerrado ? "CONSOLIDADO" : "PROVISIONAL",
          importeMicros: a.importeMicros,
          baseRegistros: a.baseRegistros,
          baseMicros: a.baseMicros,
          tarifaId: a.tarifaId,
          fechaDevengo: new Date(a.fechaDevengo),
          claveIdempotencia: a.claveIdempotencia,
          nota: a.nota,
        },
      });
    }

    return { escrita: true, asientos: planificados.length, webmasterNuevo };
  });
}

/** Suma lo ya asentado para una fila, separando CPA de CPS. */
async function asentadoPrevio(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  filaId: string,
): Promise<AsentadoPrevio> {
  const asientos = await tx.asientoComision.findMany({
    where: { filaId, estado: { not: "ANULADO" } },
    select: { importeMicros: true, baseMicros: true },
  });

  let cpaMicros: Micros = 0n;
  let cpsMicros: Micros = 0n;
  for (const a of asientos) {
    // El concepto se distingue por la ESTRUCTURA del asiento, no por su texto:
    // los de pago llevan `baseMicros` (el importe sobre el que se aplicó el
    // porcentaje) y los de registro lo dejan a null. Un reverso conserva esa
    // misma forma, así que revierte contra el concepto correcto sin que haya
    // que interpretar la nota, que es prosa y puede reescribirse.
    if (a.baseMicros !== null) cpsMicros += a.importeMicros;
    else cpaMicros += a.importeMicros;
  }
  return { cpaMicros, cpsMicros, secuencia: asientos.length };
}

/** Tarifa en vigor. Si no hay ninguna configurada, no se devenga nada. */
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

function isoFecha(d: Date): string {
  return d.toISOString().slice(0, 10);
}
