/**
 * El bono mensual por hitos.
 *
 * El agente cobra un premio si los webmasters de su red acumulan cierto número
 * de registros **dentro del mes natural**. El contador se resetea el día 1, así
 * que el bono se gana todos los meses y no se hereda de los anteriores.
 *
 * Módulo **puro**: sin base de datos y sin reloj. Todo lo que necesita entra por
 * parámetro, que es lo que permite probar la regla entera sin Postgres —igual
 * que `motor.ts`—.
 *
 * ── NO ACUMULABLE = OBJETIVO MENOS ASENTADO ────────────────────────────────
 *
 * «No son acumulables» significa que el total del mes es la recompensa del hito
 * **más alto** alcanzado: llegar a 30.000 paga 150 $, no 50+100+150.
 *
 * No hace falta ninguna lógica de borrar y rehacer. Es el mismo mecanismo de
 * diferencia que `planificarAsientos` usa para el CPA y el CPS:
 *
 *     objetivo = recompensa(hito más alto alcanzado este mes)
 *     delta    = objetivo − lo ya asentado este mes
 *
 * Cruza 10.000 → asienta 50. Sube a 30.000 → objetivo 150, asentado 50, asienta
 * 100. Total 150. Y recalcular sin cambios da delta 0 y no escribe nada, que es
 * la idempotencia que exige la regla 8 del §5.
 *
 * ── LO QUE NO HACE, Y ES DELIBERADO ────────────────────────────────────────
 *
 * **Nunca revierte.** `planificarAsientos` emite un `AJUSTE_REVERSO` cuando el
 * delta es negativo; aquí no. Si Sophon revisa a la baja y el agente cae por
 * debajo de un hito que ya cobró, el asiento se queda. Quitarle a un comercial
 * un bono que la aplicación ya le anunció por Telegram, por una corrección del
 * proveedor tres días después, es la forma más rápida de que deje de creerse la
 * cifra que ve en pantalla. Solo se emiten deltas positivos.
 *
 * Es la única divergencia respecto del motor, y por eso está escrita aquí.
 */

import type { Micros } from "./dinero.ts";

/** Un peldaño de la escalera: alcanzar `usuarios` registros paga `recompensaMicros`. */
export interface Escalon {
  id: string;
  usuarios: number;
  recompensaMicros: Micros;
}

export interface ContextoBono {
  /** Registros del mes natural, ya filtrados por atribución (`devengaDesde`). */
  registrosDelMes: number;
  escalones: readonly Escalon[];
  /** Suma de los asientos BONO ya emitidos para este agente y este mes. */
  asentadoMicros: Micros;
  /** Cuántos asientos BONO hay ya para este agente y este mes; alimenta la clave. */
  secuencia: number;
  agenteId: string;
  /** `AAAA-MM`. */
  mes: string;
  /** Con qué fecha se asienta. `AAAA-MM-DD`. */
  fechaDevengo: string;
}

export interface BonoPlanificado {
  importeMicros: Micros;
  bonoEscalonId: string;
  fechaDevengo: string;
  claveIdempotencia: string;
  nota: string;
}

/**
 * El escalón más alto alcanzado, o `null` si no llega ni al primero.
 *
 * Ordena por su cuenta en vez de fiarse de que le llegue ordenado: la escalera
 * viene de la base de datos y un `orderBy` olvidado en el sitio de llamada haría
 * que se pagara un escalón que no toca, en silencio.
 */
export function escalonAlcanzado(
  registros: number,
  escalones: readonly Escalon[],
): Escalon | null {
  let mejor: Escalon | null = null;
  for (const e of escalones) {
    if (registros >= e.usuarios && (mejor === null || e.usuarios > mejor.usuarios)) {
      mejor = e;
    }
  }
  return mejor;
}

/** El siguiente escalón por alcanzar, para poder enseñar cuánto falta. */
export function siguienteEscalon(
  registros: number,
  escalones: readonly Escalon[],
): Escalon | null {
  let mejor: Escalon | null = null;
  for (const e of escalones) {
    if (registros < e.usuarios && (mejor === null || e.usuarios < mejor.usuarios)) {
      mejor = e;
    }
  }
  return mejor;
}

/**
 * Comprueba que la escalera es utilizable.
 *
 * Devuelve el motivo del rechazo, o `null` si está bien. Lo usa el panel antes
 * de guardar: una escalera cuya recompensa no crece con los usuarios haría
 * negativo el delta al subir de hito, o sea un asiento que le quita dinero al
 * agente **por haber trabajado más**.
 */
export function motivoEscaleraInvalida(escalones: readonly Escalon[]): string | null {
  if (escalones.length === 0) return "La escalera no tiene ningún escalón.";

  const orden = [...escalones].sort((a, b) => a.usuarios - b.usuarios);
  for (const e of orden) {
    if (!Number.isInteger(e.usuarios) || e.usuarios <= 0) {
      return "Los umbrales tienen que ser enteros positivos.";
    }
    if (e.recompensaMicros <= 0n) return "Las recompensas tienen que ser positivas.";
  }
  for (let i = 1; i < orden.length; i++) {
    const previo = orden[i - 1]!;
    const actual = orden[i]!;
    if (actual.usuarios === previo.usuarios) {
      return `Hay dos escalones con el mismo umbral (${actual.usuarios}).`;
    }
    if (actual.recompensaMicros <= previo.recompensaMicros) {
      return (
        `El escalón de ${actual.usuarios} paga lo mismo o menos que el de ` +
        `${previo.usuarios}. Las recompensas tienen que crecer con los usuarios.`
      );
    }
  }
  return null;
}

/**
 * Qué bono hay que asentar, si es que hay alguno.
 *
 * Devuelve como mucho **un** asiento: el que lleva lo ya pagado hasta la
 * recompensa del escalón alcanzado.
 */
export function planificarBonos(ctx: ContextoBono): BonoPlanificado[] {
  const alcanzado = escalonAlcanzado(ctx.registrosDelMes, ctx.escalones);
  if (!alcanzado) return [];

  const delta = alcanzado.recompensaMicros - ctx.asentadoMicros;

  // Solo hacia arriba. Un delta de cero es el caso normal —recalcular un mes que
  // no ha cambiado— y uno negativo significa que Sophon revisó a la baja: ver la
  // nota de cabecera sobre por qué eso no se reclama.
  if (delta <= 0n) return [];

  return [
    {
      importeMicros: delta,
      bonoEscalonId: alcanzado.id,
      fechaDevengo: ctx.fechaDevengo,
      // Prefijo propio: la clave es `@unique` GLOBAL, así que comparte espacio
      // con las del motor (`webmasterId:fecha:sufijo:N`), con `retiro:{…}` y con
      // `retiro-rechazado:{…}`. La secuencia permite que un segundo tramo del
      // mismo mes —subir de escalón— no choque con el primero.
      claveIdempotencia: `bono:${ctx.agenteId}:${ctx.mes}:${ctx.secuencia}`,
      nota: `Hito de ${alcanzado.usuarios} registros en ${ctx.mes}`,
    },
  ];
}
