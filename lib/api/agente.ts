/**
 * Capa común de las rutas del agente.
 *
 * Existe por una razón concreta: el margen del superadmin vive en la misma fila
 * que los datos del agente (`FilaDiariaSophon.gananciaSuperadminMicros`). Si
 * cada ruta seleccionara campos a mano, bastaría un `select` olvidado o un
 * `include` cómodo para filtrarlo. Aquí se centraliza qué columnas pueden salir
 * y se serializa siempre por las mismas funciones.
 *
 * La regla, en una frase: **una fila de la base de datos nunca se devuelve tal
 * cual**; siempre pasa por un proyector que enumera explícitamente lo permitido.
 */

import { NextResponse } from "next/server";

import { db } from "../db.ts";
import { formatearMicros, type Micros } from "../devengo/dinero.ts";
import { sesionActual, telegramDeLaPeticion, type AgenteSesion } from "../auth/sesion.ts";

export interface Contexto {
  sesion: AgenteSesion;
}

/**
 * Exige sesión válida **y** `initData` firmado.
 *
 * Las dos cosas, no una: la cookie dice quién es, el `initData` prueba que la
 * petición sale de Telegram. Con solo la cookie, un token robado valdría desde
 * cualquier navegador.
 */
export async function exigirAgente(
  peticion: Request,
): Promise<Contexto | NextResponse> {
  if (!telegramDeLaPeticion(peticion)) {
    return NextResponse.json(
      { error: "Acceso no verificado por Telegram. La aplicación se abre desde el bot." },
      { status: 401 },
    );
  }
  const sesion = await sesionActual();
  if (!sesion) {
    return NextResponse.json(
      { error: "Sesión caducada.", apoyo: "El acceso se restablece con el correo de la cuenta." },
      { status: 401 },
    );
  }
  return { sesion };
}

export function esRespuesta(v: Contexto | NextResponse): v is NextResponse {
  return v instanceof NextResponse;
}

/**
 * Columnas de la fila diaria que un agente puede ver.
 *
 * `gananciaSuperadminMicros` y `gananciaTotalMicros` quedan FUERA a propósito:
 * son la economía del superadmin. El agente ve lo suyo, que se calcula desde sus
 * asientos, no desde la ganancia bruta de Sophon.
 */
export const CAMPOS_FILA_VISIBLES = {
  fecha: true,
  countRegister: true,
  countT1Register: true,
  countT2Register: true,
  countT3Register: true,
  countPayingUsers: true,
  paymentAmountMicros: true,
} as const;

export interface DiaPublico {
  fecha: string;
  importeMicros: string;
  importe: string;
  registros: number;
  registrosT1: number;
  registrosT2: number;
  registrosT3: number;
  usuariosPago: number;
  provisional: boolean;
}

/** Convierte micros a algo serializable: JSON no admite BigInt. */
export function dinero(micros: Micros): { micros: string; texto: string } {
  return { micros: micros.toString(), texto: formatearMicros(micros) };
}

/**
 * Saldos del agente, derivados de SUS asientos.
 *
 * - devengado: todo lo acumulado, incluidos los días aún provisionales.
 * - disponible: lo consolidado menos lo ya solicitado o pagado.
 *
 * Los retiros entran como asientos negativos, así que el disponible sale de una
 * suma y no de restar tablas distintas, que es donde suelen aparecer los
 * descuadres.
 */
export async function saldos(agenteId: string): Promise<{
  devengadoMicros: Micros;
  disponibleMicros: Micros;
  solicitadoMicros: Micros;
  pagadoMicros: Micros;
}> {
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

/** Comprueba que el webmaster es de este agente antes de dejar operar sobre él. */
export async function webmasterDelAgente(
  agenteId: string,
  emailNormalizado: string,
): Promise<{ id: string; emailOriginal: string; proVigenteHasta: Date | null } | null> {
  return db.webmaster.findFirst({
    where: { emailNormalizado, agenteId },
    select: { id: true, emailOriginal: true, proVigenteHasta: true },
  });
}

export function isoFecha(d: Date): string {
  return d.toISOString().slice(0, 10);
}
