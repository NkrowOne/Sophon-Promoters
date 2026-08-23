/**
 * Quién cobra qué. Las tres partes, cada una con lo suyo.
 *
 * ── POR QUÉ ESTE FICHERO EXISTE ──
 *
 * El panel enseñaba el dinero como una resta: «entra esto de Sophon, se llevan
 * los agentes aquello, TE QUEDA A TI el resto». Está mal, y no de forma
 * cosmética.
 *
 * Al Operador no le SOBRA nada. Cobra una parte pactada, igual que el agente y
 * que el webmaster, y las tres se calculan de lo mismo. Presentarlo como un
 * residuo hace creer dos cosas falsas: que lo del Operador depende de lo que
 * dejen de cobrar los demás, y que las cifras de los otros son un gasto suyo.
 * Ninguna de las dos.
 *
 * ── EL REPARTO DE VERDAD ──
 *
 * Hay dos conceptos, y NO se reparten igual:
 *
 *   REGISTRO. Sophon paga un fijo por cada usuario registrado. Ese fijo se
 *   parte entre el agente y el Operador. El webmaster no cobra por registrar.
 *
 *     Sophon paga  0,06 $  →  agente 0,03 $  +  Operador 0,03 $
 *
 *   COMPRA DE PRO. Aquí sí hay porcentaje, y se aplica sobre `paymentAmount`:
 *   lo que el USUARIO le paga a Sophon por el PRO. De cada compra:
 *
 *     webmaster 35 %  ·  agente 5 %  ·  Operador 10 %
 *
 *   El 50 % restante se lo queda Sophon y nunca pasa por aquí.
 *
 * El porcentaje SOLO toca el importe de las compras. Aplicarlo a los registros
 * —o dar el fijo por las compras— fue justo la confusión que trajo este módulo.
 *
 * Va sin dependencias, como `atribucion.ts` y `saldos.ts`, para que se pueda
 * probar con Node pelado: es aritmética de dinero y tiene que estar cerrada con
 * pruebas, no comprobada a ojo en una captura de pantalla.
 */

/** Millonésimas de dólar. */
export type Micros = bigint;
/** Puntos básicos: 500 = 5 %. */
export type Bps = number;

/*
 * Lo que Sophon paga por cada usuario registrado, para repartir entre el agente
 * y el Operador. Es el mismo número que `CPA_MAXIMO_MICROS` del motor, y por eso
 * ese tope es lo que es: ceder al agente más de 0,06 $ sería pagar de tu bolsillo.
 */
export const CPA_SOPHON_MICROS: Micros = 60_000n;

/*
 * De lo que un usuario paga por el PRO:
 *
 *   3.500 bps  el webmaster, que lo cobra DIRECTAMENTE de Sophon. No sale de
 *              aquí ni pasa por la cuenta del Operador: se ve en las filas
 *              diarias como `gananciaWebmasterMicros` y se enseña para que el
 *              reparto esté completo, no porque haya que pagarlo.
 *   1.500 bps  entran a la cuenta del Operador, y de ahí salen las dos partes
 *              de abajo. Es el mismo número que `CPS_MAXIMO_BPS` del motor.
 */
export const CPS_WEBMASTER_BPS: Bps = 3_500;
export const CPS_AL_OPERADOR_BPS: Bps = 1_500;

/** Lo que ha producido un tramo de tráfico. */
export interface Volumen {
  /** Usuarios registrados. */
  registros: number;
  /** Lo que esos usuarios han pagado por el PRO, en micros. */
  pagadoPorUsuariosMicros: Micros;
}

/** La tarifa del agente: lo único que se pacta y lo único configurable. */
export interface TarifaAgente {
  cpaPorRegistroMicros: Micros;
  cpsBps: Bps;
}

/** Lo que cobra una de las tres partes, por concepto. */
export interface Parte {
  /** Del fijo por registro. */
  registrosMicros: Micros;
  /** Del porcentaje sobre lo que pagan los usuarios. */
  proMicros: Micros;
}

export interface Reparto {
  webmaster: Parte;
  agente: Parte;
  operador: Parte;
}

/** Aplica puntos básicos truncando hacia cero, como el motor. */
function porBps(base: Micros, bps: Bps): Micros {
  return (base * BigInt(bps)) / 10_000n;
}

/**
 * Reparte un volumen entre webmaster, agente y Operador.
 *
 * La parte del Operador NO es lo que sobra: es su fijo por registro
 * —`CPA_SOPHON_MICROS` menos lo pactado con el agente— y sus puntos del PRO
 * —`CPS_AL_OPERADOR_BPS` menos los del agente—. Que la suma cuadre con lo que
 * entra es consecuencia, no definición.
 *
 * Si una tarifa se pasara del tope, la parte del Operador saldría NEGATIVA en
 * vez de quedarse en cero, y así se ve. Un `max(0, …)` aquí escondería que se
 * está pagando de más justo en la pantalla que existe para detectarlo; el sitio
 * de impedirlo es el formulario de tarifas, que ya lo hace.
 */
export function repartir(volumen: Volumen, tarifa: TarifaAgente): Reparto {
  const registros = BigInt(volumen.registros);
  const pagado = volumen.pagadoPorUsuariosMicros;

  const agente: Parte = {
    registrosMicros: tarifa.cpaPorRegistroMicros * registros,
    proMicros: porBps(pagado, tarifa.cpsBps),
  };

  return {
    webmaster: {
      registrosMicros: 0n,
      proMicros: porBps(pagado, CPS_WEBMASTER_BPS),
    },
    agente,
    operador: {
      registrosMicros: (CPA_SOPHON_MICROS - tarifa.cpaPorRegistroMicros) * registros,
      proMicros: porBps(pagado, CPS_AL_OPERADOR_BPS) - agente.proMicros,
    },
  };
}

/** Suma dos partes. Para acumular agente a agente. */
export function sumarPartes(a: Parte, b: Parte): Parte {
  return {
    registrosMicros: a.registrosMicros + b.registrosMicros,
    proMicros: a.proMicros + b.proMicros,
  };
}

/** El total de una parte, los dos conceptos juntos. */
export function totalParte(p: Parte): Micros {
  return p.registrosMicros + p.proMicros;
}

export const PARTE_CERO: Parte = { registrosMicros: 0n, proMicros: 0n };
