/**
 * Motor de devengo.
 *
 * Toda la lógica de cálculo vive aquí como funciones puras, sin base de datos,
 * para que los casos que descuadran una contabilidad se puedan probar en
 * milisegundos: doble sincronización, revisión a la baja de un día ya cerrado,
 * cambio de tarifa, y atribución de un webmaster con historia previa.
 *
 * La idea central es que **no se devenga por eventos, sino por diferencia contra
 * lo ya asentado**. Sophon entrega contadores acumulados por (webmaster, día) que
 * pueden revisarse; si devengásemos "lo que trae la fila" cada vez que sincroniza,
 * un segundo barrido pagaría dos veces. Calculamos el objetivo para esa fila y
 * escribimos solo la diferencia. De ahí salen tres propiedades gratis:
 *
 *   - re-sincronizar sin cambios produce delta 0, así que no escribe nada;
 *   - una revisión al alza produce un asiento positivo por lo que falta;
 *   - una revisión a la baja produce un AJUSTE_REVERSO, sin tocar el original.
 */

import { aplicarBps, type Bps, type Micros, sumar } from "./dinero.ts";

export const TipoAsiento = {
  CPA: "CPA",
  CPS: "CPS",
  AJUSTE_REVERSO: "AJUSTE_REVERSO",
} as const;
export type TipoAsiento = (typeof TipoAsiento)[keyof typeof TipoAsiento];

/** Los datos de una fila diaria de Sophon, ya convertidos a micros. */
export interface FilaDiaria {
  webmasterId: string;
  /** Fecha del hecho, normalizada a YYYY-MM-DD en la zona horaria contable. */
  fecha: string;
  countRegister: number;
  countT1Register: number;
  countT2Register: number;
  countT3Register: number;
  countPayingUsers: number;
  paymentAmountMicros: Micros;
  /** `myEarning` con affiliateLevel=1: ganancia total del registro. */
  gananciaTotalMicros: Micros;
  /** `myEarning` con affiliateLevel=2: ganancia del webmaster. */
  gananciaWebmasterMicros: Micros;
}

/** Tarifa vigente que se congela en cada asiento. */
export interface Tarifa {
  id: string;
  cpaPorRegistroMicros: Micros;
  cpsBps: Bps;
}

/*
 * Lo máximo que se le puede ceder a un agente.
 *
 * Al superadmin le entran 0,06 $ por registro y el 15 % del CPS (§2.2.1 del
 * plan, despejado de la propia API). Ceder por encima de eso no es una tarifa
 * generosa: es pagar de su bolsillo por cada registro que entra, y crece con el
 * volumen, así que cuanto mejor le va al agente más pierde el superadmin.
 *
 * Viven aquí y no en la acción del panel por dos razones. La primera es que un
 * fichero `"use server"` solo puede exportar funciones asíncronas —exportarlas
 * de ahí rompía el build, que es como se encontró—. La segunda es que son de
 * este dominio: la frontera en la que el margen se vuelve negativo es del motor
 * de devengo, no de la pantalla que resulta que la aplica hoy.
 */
export const CPA_MAXIMO_MICROS: Micros = 60_000n;
export const CPS_MAXIMO_BPS = 1_500;

/** Lo ya escrito en el ledger para esa fila, por tipo. */
export interface AsentadoPrevio {
  cpaMicros: Micros;
  cpsMicros: Micros;
  /** Nº de asientos ya escritos para esa fila; alimenta la clave de idempotencia. */
  secuencia: number;
}

export interface AsientoPlanificado {
  tipo: TipoAsiento;
  importeMicros: Micros;
  baseRegistros: number | null;
  baseMicros: Micros | null;
  tarifaId: string;
  /** Fecha del hecho. Un reverso lleva la fecha del ajuste, no la del original. */
  fechaDevengo: string;
  claveIdempotencia: string;
  nota: string | null;
}

export interface ContextoDevengo {
  fila: FilaDiaria;
  tarifa: Tarifa;
  previo: AsentadoPrevio;
  /**
   * Frontera de atribución. Un webmaster asignado a un agente después de haber
   * generado tráfico solo devenga desde esta fecha: sin ella, el agente cobraría
   * historia que no trajo él.
   */
  devengaDesde: string | null;
  /** Fecha en la que se registra un reverso (hoy), no la del hecho revisado. */
  fechaAjuste: string;
}

/** Lo que gana el superadmin por esa fila, antes de pagar al agente. */
export function margenSuperadmin(fila: FilaDiaria): Micros {
  return fila.gananciaTotalMicros - fila.gananciaWebmasterMicros;
}

/**
 * Comisión objetivo del agente para una fila, según la tarifa dada.
 *
 * El agente cobra un fijo por registro —da igual el tier, porque su tarifa no
 * depende del país— más un porcentaje del importe pagado por los usuarios.
 */
export function objetivoDevengo(
  fila: FilaDiaria,
  tarifa: Tarifa,
): { cpaMicros: Micros; cpsMicros: Micros } {
  const cpaMicros = tarifa.cpaPorRegistroMicros * BigInt(fila.countRegister);
  const { importe: cpsMicros } = aplicarBps(fila.paymentAmountMicros, tarifa.cpsBps);
  return { cpaMicros, cpsMicros };
}

/**
 * Planifica los asientos que faltan por escribir para una fila.
 *
 * Devuelve lista vacía cuando no hay nada que hacer, que es el caso normal:
 * el barrido pasa cada 30 minutos sobre una ventana de varios días y la enorme
 * mayoría de las filas no ha cambiado.
 */
export function planificarAsientos(ctx: ContextoDevengo): AsientoPlanificado[] {
  const { fila, tarifa, previo, devengaDesde, fechaAjuste } = ctx;

  // Fuera de la ventana de atribución no se devenga nada. Si ya hubiera algo
  // asentado (una asignación corregida a posteriori), se revierte entero.
  const dentroDeVentana = devengaDesde === null || fila.fecha >= devengaDesde;
  const objetivo = dentroDeVentana
    ? objetivoDevengo(fila, tarifa)
    : { cpaMicros: 0n, cpsMicros: 0n };

  const deltaCpa = objetivo.cpaMicros - previo.cpaMicros;
  const deltaCps = objetivo.cpsMicros - previo.cpsMicros;

  const asientos: AsientoPlanificado[] = [];
  let secuencia = previo.secuencia;

  const clave = (sufijo: string): string =>
    `${fila.webmasterId}:${fila.fecha}:${sufijo}:${secuencia++}`;

  if (deltaCpa > 0n) {
    asientos.push({
      tipo: TipoAsiento.CPA,
      importeMicros: deltaCpa,
      baseRegistros: fila.countRegister,
      baseMicros: null,
      tarifaId: tarifa.id,
      fechaDevengo: fila.fecha,
      claveIdempotencia: clave("CPA"),
      nota: null,
    });
  } else if (deltaCpa < 0n) {
    asientos.push({
      tipo: TipoAsiento.AJUSTE_REVERSO,
      importeMicros: deltaCpa,
      baseRegistros: fila.countRegister,
      baseMicros: null,
      tarifaId: tarifa.id,
      // La fecha del ajuste, no la del hecho: el pasado consolidado no se toca.
      fechaDevengo: fechaAjuste,
      claveIdempotencia: clave("REV_CPA"),
      nota: `Revisión de registros del ${fila.fecha}`,
    });
  }

  if (deltaCps > 0n) {
    asientos.push({
      tipo: TipoAsiento.CPS,
      importeMicros: deltaCps,
      baseRegistros: fila.countPayingUsers,
      baseMicros: fila.paymentAmountMicros,
      tarifaId: tarifa.id,
      fechaDevengo: fila.fecha,
      claveIdempotencia: clave("CPS"),
      nota: null,
    });
  } else if (deltaCps < 0n) {
    asientos.push({
      tipo: TipoAsiento.AJUSTE_REVERSO,
      importeMicros: deltaCps,
      baseRegistros: fila.countPayingUsers,
      baseMicros: fila.paymentAmountMicros,
      tarifaId: tarifa.id,
      fechaDevengo: fechaAjuste,
      claveIdempotencia: clave("REV_CPS"),
      nota: `Revisión de pagos del ${fila.fecha}`,
    });
  }

  return asientos;
}

// ────────────────────────────── Conciliación ──────────────────────────────

export interface ResultadoConciliacion {
  totalSophonMicros: Micros;
  totalLocalMicros: Micros;
  descuadreMicros: Micros;
  cuadra: boolean;
}

/**
 * Cuadra lo que hemos almacenado contra la cifra que publica Sophon.
 *
 * La tolerancia existe porque el redondeo de Sophon y el nuestro no tienen por
 * qué coincidir al micro, pero se mantiene diminuta a propósito: si el descuadre
 * crece, es una señal real y debe alertar en vez de absorberse en silencio.
 */
export function conciliar(
  totalSophonMicros: Micros,
  filasLocales: Iterable<Micros>,
  toleranciaMicros: Micros = 1_000n,
): ResultadoConciliacion {
  const totalLocalMicros = sumar(filasLocales);
  const descuadreMicros = totalLocalMicros - totalSophonMicros;
  const abs = descuadreMicros < 0n ? -descuadreMicros : descuadreMicros;
  return {
    totalSophonMicros,
    totalLocalMicros,
    descuadreMicros,
    cuadra: abs <= toleranciaMicros,
  };
}

// ─────────────────────────── Ventana de revisión ───────────────────────────

/**
 * Días que un día permanece abierto a revisión antes de consolidarse.
 * Mientras está abierto, su devengo es provisional y puede moverse.
 */
export const DIAS_VENTANA_REVISION = 7;

export function estaCerrado(fecha: string, hoy: string, dias = DIAS_VENTANA_REVISION): boolean {
  const f = Date.parse(`${fecha}T00:00:00Z`);
  const h = Date.parse(`${hoy}T00:00:00Z`);
  if (Number.isNaN(f) || Number.isNaN(h)) return false;
  return (h - f) / 86_400_000 > dias;
}

/** Primer día del rango que hay que volver a leer en cada barrido. */
export function inicioVentana(hoy: string, dias = DIAS_VENTANA_REVISION): string {
  const h = Date.parse(`${hoy}T00:00:00Z`);
  const d = new Date(h - dias * 86_400_000);
  return d.toISOString().slice(0, 10);
}
