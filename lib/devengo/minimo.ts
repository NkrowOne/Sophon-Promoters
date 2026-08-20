/**
 * El mínimo para pedir un cobro, en un solo sitio.
 *
 * Vivía dentro de `app/api/retiro/route.ts` como una constante y una función
 * privadas, que estaba bien mientras solo lo necesitara esa ruta. En cuanto la
 * ayuda tiene que contestar a «¿cuánto es el mínimo?», la alternativa era
 * escribir «20,00 $» a mano en cinco catálogos — y el valor es configurable
 * desde el panel del Operador, o sea que la respuesta habría empezado a mentir
 * el día que lo cambiara.
 *
 * Sin `next/server` a la vista: es una lectura de configuración, no una
 * respuesta HTTP, y así vale igual desde un guion de consola.
 */

import { db } from "../db.ts";
import type { Micros } from "./dinero.ts";

/** Mínimo por defecto; el Operador puede cambiarlo en configuración. */
export const MINIMO_POR_DEFECTO_MICROS: Micros = 20_000_000n; // 20,00 $

export async function minimoDeRetiroMicros(): Promise<Micros> {
  const cfg = await db.configuracion.findUnique({ where: { clave: "retiro.minimoMicros" } });
  return cfg ? BigInt(cfg.valor) : MINIMO_POR_DEFECTO_MICROS;
}
