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

/*
 * `saldos` se ha mudado a `lib/devengo/saldos.ts` y se reexporta desde aquí.
 *
 * Es aritmética del ledger y no sabía nada de HTTP, pero vivía en este módulo
 * —que importa `next/server` para construir los 401— y eso la hacía
 * inimportable con Node pelado: `next` no publica mapa de `exports`. La prueba
 * de extremo a extremo se caía justo al llegar al tramo que comprueba el
 * circuito del dinero, o sea que el acoplamiento dejaba sin cubrir lo que más
 * falta hace cubrir.
 *
 * El reexporte mantiene el sitio de llamada de las seis rutas que ya la piden
 * de aquí: la separación es de dependencias, no de API.
 */
export { saldos, type Saldos } from "../devengo/saldos.ts";
import { sesionActual, telegramDeLaPeticion, type AgenteSesion } from "../auth/sesion.ts";
import { cadenas } from "../i18n.ts";
import { idiomaDesdeTelegram, type Idioma } from "../idiomas.ts";

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
  const usuario = telegramDeLaPeticion(peticion);
  /*
   * Estos dos 401 son los únicos errores de la API que se emiten SIN sesión, y
   * por eso el idioma no puede salir de `sesion.idioma` como en el resto: aún
   * no hay sesión de la que sacarlo. Sale del `language_code` del `initData`,
   * que Telegram firma junto al usuario, así que es tan de fiar como el `id`.
   * Sin initData válido no queda ni eso y `idiomaDesdeTelegram` cae al idioma
   * por defecto: es preferible a que un agente que acaba de perder la sesión
   * lea en español por qué la ha perdido.
   */
  const t = cadenas(idiomaDesdeTelegram(usuario?.language_code));
  if (!usuario) {
    return NextResponse.json(
      { error: t.errSinTelegram, apoyo: t.errSinTelegramApoyo },
      { status: 401 },
    );
  }
  const sesion = await sesionActual();
  /*
   * Suspendido NO es lo mismo que sin sesión, y decírselo importa: un 401 con
   * «vuelve a entrar con tu correo» mandaba al agente a repetir el alta para
   * recibir exactamente el mismo mensaje, sin enterarse nunca de que su cuenta
   * está parada. Va con 403 —autenticado pero no autorizado— y el apoyo dice lo
   * único que puede hacer, que es escribir al superadmin.
   */
  if (sesion === "SUSPENDIDO") {
    return NextResponse.json(
      { error: t.errSuspendido, apoyo: t.errSuspendidoApoyo },
      { status: 403 },
    );
  }
  if (!sesion) {
    return NextResponse.json(
      { error: t.sesionCaducada, apoyo: t.sesionCaducadaApoyo },
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

/**
 * Convierte micros a algo serializable: JSON no admite BigInt.
 *
 * El idioma es OBLIGATORIO y sale siempre de `ctx.sesion.idioma`. Por aquí pasa
 * el `texto` de casi todo el dinero que ve el agente, así que un valor por
 * defecto convertiría cualquier olvido en una pantalla que dice «2.147,39 $» a
 * un angloparlante —dos dólares y pico— sin que nada avise. Exigiéndolo, el
 * olvido es un error de compilación.
 */
export function dinero(micros: Micros, idioma: Idioma): { micros: string; texto: string } {
  return { micros: micros.toString(), texto: formatearMicros(micros, 2, idioma) };
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
