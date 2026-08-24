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
 *   REGISTRO. Sophon paga a cada parte por cada usuario registrado. Al
 *   webmaster, el precio de su tabla menos un descuento fijo; ese descuento
 *   entra al Operador y de él sale la comisión del agente.
 *
 *     descuento 0,10 $  →  agente 0,03 $ (tarifa)  +  Operador 0,07 $
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
 * ── EL ÚNICO SITIO DONDE VIVEN LAS DOS CIFRAS DEL PROGRAMA ──
 *
 * Estaban en tres módulos a la vez, cada uno con su nombre y su comentario:
 *
 *   0,10 $   `CPA_MAXIMO_MICROS` en el motor —el tope de la tarifa—,
 *            `DESCUENTO_POR_USUARIO_MICROS` en la tabla de precios —lo que se
 *            resta del precio del webmaster— y `CPA_SOPHON_MICROS` aquí.
 *   35 %     `PORCENTAJE_WEBMASTER_BPS` en la tabla de precios y
 *            `CPS_WEBMASTER_BPS` aquí.
 *   15 %     `CPS_MAXIMO_BPS` en el motor y `CPS_AL_OPERADOR_BPS` aquí.
 *
 * Son el mismo número visto desde tres sitios, y tres definiciones del mismo
 * número es una que se queda vieja sin que nadie lo note: el día que el
 * programa cambie el descuento, el formulario de tarifas seguiría validando
 * contra el viejo mientras la tabla de precios ya pintaría el nuevo, y las dos
 * pantallas dirían cosas distintas con la misma cara de certeza.
 *
 * Aquí, y los otros módulos las reexportan con sus nombres para no tocar a
 * ningún llamante. `test/constantes-programa.test.ts` fija que sigan siendo una.
 */

/**
 * Lo que NO llega al webmaster de cada usuario registrado: diez céntimos.
 *
 * Sophon paga el precio global de su tabla —que depende del país y del nivel—
 * y de ahí se descuenta esto. Es a la vez el descuento que ve el webmaster y el
 * ingreso del Operador por ese registro, porque son la misma cosa mirada desde
 * los dos lados, y de ahí sale la comisión del agente.
 *
 * NO es «lo que Sophon paga por registro»: lo que Sophon paga es mucho más y va
 * casi entero al webmaster. Confundir las dos cosas puso en pantalla la frase
 * «Sophon abona 0,06 $ por registro», que es doblemente falsa.
 *
 * ── VERIFICADO EN VIVO EL 2026-08-23, Y NO ERA EL DEL PLAN ──
 *
 * El plan (§2.2.1) decía 0,06 $, y con 0,06 aquí ninguna cifra del día cuadraba.
 * Contra la cuenta real, con `partnerLevel` 0:
 *
 *   12 registros (3 T1 + 4 T2 + 5 T3), sin compras
 *   nivel 1 (total)      2,90 $  = 3×0,30 + 4×0,25 + 5×0,20 — clavado con
 *                                  `region/reward` a nivel 0
 *   nivel 2 (webmaster)  1,70 $  = lo mismo con 0,10 menos por registro
 *   diferencia           1,20 $  = 12 × 0,10
 *
 * El descuento es PLANO por registro —no depende del tier— y vale 0,10 $. Si el
 * programa vuelve a cambiarlo, el panel lo detecta: despeja el descuento real de
 * lo ingresado y avisa cuando no cuadra con esta constante.
 */
export const CPA_SOPHON_MICROS: Micros = 100_000n;

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

/** Los dos conceptos por los que cobra cada parte. Para rotular sin repetirse. */
export const CONCEPTOS = ["registros", "pro"] as const;

/**
 * Lo que ha producido un tramo de tráfico.
 *
 * Las dos últimas cifras las REPORTA Sophon fila a fila. No se calculan aquí, y
 * ésa es la corrección más importante de este módulo: antes la parte del
 * webmaster se deducía aplicando el 35 % a las compras, lo que dejaba a cero a
 * todo webmaster que registrara usuarios sin que ninguno comprara —y un
 * webmaster con doce registros y ninguna compra SÍ cobra de Sophon—. El dato
 * está en `FilaDiariaSophon`; inventarlo era el error.
 */
export interface Volumen {
  /** Usuarios registrados. */
  registros: number;
  /** Lo que esos usuarios han pagado por el PRO, en micros. */
  pagadoPorUsuariosMicros: Micros;
  /** `myEarning` nivel 2: lo que Sophon abona al WEBMASTER por este tráfico. */
  gananciaWebmasterMicros: Micros;
  /** Lo que Sophon ingresa en la cuenta del OPERADOR por este tráfico. */
  gananciaOperadorMicros: Micros;
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
 * ── QUÉ ES DATO Y QUÉ ES CÁLCULO ──
 *
 * Solo hay UNA cosa que esta aplicación decide: lo que se le paga al agente.
 * Es lo único pactado y lo único configurable, y por eso es lo único que se
 * calcula con una tarifa.
 *
 * Lo que cobran el webmaster y el Operador lo decide Sophon y lo REPORTA fila
 * a fila. Se toma de ahí. Deducirlo de un porcentaje —que es lo que se hacía—
 * produce cifras que parecen buenas y no lo son: un webmaster con doce
 * registros y ninguna compra salía a 0,00 $ cuando Sophon le está pagando.
 *
 * ── CÓMO SE SEPARAN LOS DOS CONCEPTOS ──
 *
 * Sophon manda una sola cifra por parte y día, sin decir qué trozo viene de los
 * registros y cuál de las compras. La parte de las compras SÍ se conoce —es un
 * porcentaje pactado del importe pagado— así que se calcula, y el resto es de
 * los registros. Al restar en vez de sumar, el total de cada parte coincide
 * SIEMPRE con lo que Sophon ha reportado, y cualquier desajuste entre el
 * porcentaje declarado y la realidad aparece en la línea de registros en vez
 * de desaparecer.
 *
 * Si una tarifa se pasara del tope, la parte del Operador sale NEGATIVA en vez
 * de quedarse en cero, y así se ve. Un `max(0, …)` escondería que se está
 * pagando de más justo en la pantalla que existe para detectarlo; el sitio de
 * impedirlo es el formulario de tarifas, que ya lo hace.
 */
export function repartir(volumen: Volumen, tarifa: TarifaAgente): Reparto {
  const registros = BigInt(volumen.registros);
  const pagado = volumen.pagadoPorUsuariosMicros;

  const agente: Parte = {
    registrosMicros: tarifa.cpaPorRegistroMicros * registros,
    proMicros: porBps(pagado, tarifa.cpsBps),
  };

  // Lo que de cada parte viene de las compras, según lo pactado.
  const webmasterPro = porBps(pagado, CPS_WEBMASTER_BPS);
  const alOperadorPro = porBps(pagado, CPS_AL_OPERADOR_BPS);

  return {
    webmaster: {
      // Lo que Sophon le paga menos lo que viene de compras: el resto es de
      // los registros, que es justamente lo que faltaba en pantalla.
      registrosMicros: volumen.gananciaWebmasterMicros - webmasterPro,
      proMicros: webmasterPro,
    },
    agente,
    operador: {
      registrosMicros:
        volumen.gananciaOperadorMicros - alOperadorPro - agente.registrosMicros,
      proMicros: alOperadorPro - agente.proMicros,
    },
  };
}

/**
 * Lo que Sophon abona por cada usuario registrado, para este tráfico.
 *
 * `CPA_SOPHON_MICROS` es el TOPE con el que se valida una tarifa, no lo que
 * Sophon paga: el importe real depende del país del usuario y solo se conoce
 * mirando lo que ha ingresado. Esto lo despeja, para poder enseñarlo en vez de
 * afirmar un número que puede no ser el suyo.
 *
 * Devuelve `null` sin registros: dividir entre cero no es «cero por registro».
 */
export function abonoPorRegistro(volumen: Volumen): Micros | null {
  if (volumen.registros === 0) return null;
  const deRegistros =
    volumen.gananciaWebmasterMicros +
    volumen.gananciaOperadorMicros -
    porBps(volumen.pagadoPorUsuariosMicros, CPS_WEBMASTER_BPS + CPS_AL_OPERADOR_BPS);
  return deRegistros / BigInt(volumen.registros);
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
