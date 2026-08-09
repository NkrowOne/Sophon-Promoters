/**
 * Qué ha dicho Sophon exactamente, y qué significa para un alta.
 *
 * ── Por qué esto es un módulo y no cuatro `if` en la ruta ──
 *
 * El alta de un webmaster **es** su registro en el programa de socios, así que
 * quien decide si una cuenta vale no es esta aplicación: es la respuesta de
 * `bind_sub_aff`. Si contesta que sí, la cuenta entra nueva y se le abre la
 * lista de ganancias. Si contesta que no, **el motivo cambia por completo lo que
 * hay que decirle al agente**: una cuenta que ya estaba en el programa es
 * antigua y no le pertenece; una que no existe en Sophon todavía puede
 * registrarse y volver.
 *
 * Esa clasificación vivía como dos expresiones regulares sueltas dentro de la
 * ruta de alta, y era el punto más frágil de todo el circuito del dinero: si
 * Sophon reformula «already an affiliate» o «user not found» —dos frases que no
 * controlamos y que nadie nos ha prometido mantener—, las dos ramas caen a la
 * respuesta genérica «Sophon no responde», que le dice al agente que reintente
 * contra algo que no va a funcionar nunca. Un cambio de redacción al otro lado
 * del cable no puede convertir un rechazo definitivo en un reintento infinito.
 *
 * ── Código primero, texto de respaldo ──
 *
 * Sophon documenta exactamente DOS códigos —`0` y `999999`— y ninguno de los dos
 * casos que aquí deciden algo tiene uno propio, así que hoy el texto es lo único
 * que hay. La tabla se escribe igualmente en el orden correcto —código, y solo
 * si no lo reconocemos, texto— para que el día que se observen los códigos
 * reales baste con rellenar `POR_CODIGO` sin tocar ninguna ruta.
 *
 * Los códigos NO se inventan: `scripts/diagnostico-sophon.ts` lleva una sonda
 * que los captura contra la cuenta real en cuanto la whitelist esté activa. Un
 * mapa con valores supuestos sería peor que no tenerlo, porque parecería fiable.
 *
 * ── La regla dura: lo que no se reconoce NO es un éxito ──
 *
 * `DESCONOCIDO` existe para que un error nuevo nunca se lea como «vinculado». Es
 * la única postura segura: dar por buena una vinculación que no ocurrió deja al
 * webmaster atribuido aquí y sin vincular allí, que es justo el descuadre que el
 * ledger no puede arreglar solo.
 */

import { ErrorSophon } from "./cliente.ts";

/** Qué le ha pasado a un intento de vinculación. */
export type MotivoAlta =
  /** El correo ya está en el programa de socios: es una cuenta antigua. */
  | "YA_AFILIADO"
  /** El correo no existe en Sophon: todavía no se ha registrado. */
  | "NO_REGISTRADO"
  /** La cuenta maestra no está autorizada en la Tool API. */
  | "SIN_WHITELIST"
  /** Falta un parámetro obligatorio: es un fallo nuestro, no de Sophon. */
  | "PETICION_MAL_FORMADA"
  /** Ni respuesta: red caída, tiempo agotado, circuito abierto. */
  | "SIN_RESPUESTA"
  /** Sophon ha dicho que no y no sabemos por qué. Nunca es un éxito. */
  | "DESCONOCIDO";

export interface AltaRechazada {
  motivo: MotivoAlta;
  /** El código tal cual vino, para la bitácora y para el aviso al Operador. */
  codigo: number | null;
  mensaje: string;
  traceId: string | null;
}

/**
 * Códigos conocidos de Sophon.
 *
 * **Vacío a propósito.** Los dos únicos que Sophon documenta son `0` (éxito, que
 * no llega aquí) y `999999` (parámetro que falta, que `ErrorSophon` ya expone
 * como `esParametrosIncompletos`). El resto se rellenará con lo que devuelva la
 * sonda del diagnóstico, no con lo que parezca razonable.
 */
const POR_CODIGO: ReadonlyMap<number, MotivoAlta> = new Map();

/**
 * Frases con las que Sophon explica el rechazo, en orden de comprobación.
 *
 * Es el respaldo mientras no haya códigos. Se prueban en orden y la primera que
 * casa manda, así que las más específicas van antes.
 */
const POR_TEXTO: readonly [RegExp, MotivoAlta][] = [
  [/caller not in allowed list/i, "SIN_WHITELIST"],
  [/already an affiliate/i, "YA_AFILIADO"],
  [/user not found/i, "NO_REGISTRADO"],
];

/**
 * Clasifica lo que sea que haya salido mal al vincular.
 *
 * Acepta `unknown` porque lo que llega al `catch` puede no ser un `ErrorSophon`:
 * un fallo de red o un `AbortSignal.timeout` lanzan otra cosa, y esos casos son
 * `SIN_RESPUESTA` —no ha llegado a haber respuesta que clasificar— y no
 * `DESCONOCIDO`, que significa «Sophon contestó y no lo entendemos». La
 * diferencia importa: uno se reintenta y el otro hay que mirarlo.
 */
export function clasificarAlta(e: unknown): AltaRechazada {
  if (!(e instanceof ErrorSophon)) {
    return {
      motivo: "SIN_RESPUESTA",
      codigo: null,
      mensaje: e instanceof Error ? e.message : String(e),
      traceId: null,
    };
  }

  const base = { codigo: e.codigo, mensaje: e.message, traceId: e.traceId };

  const porCodigo = POR_CODIGO.get(e.codigo);
  if (porCodigo) return { motivo: porCodigo, ...base };

  if (e.esParametrosIncompletos) return { motivo: "PETICION_MAL_FORMADA", ...base };

  for (const [patron, motivo] of POR_TEXTO) {
    if (patron.test(e.message)) return { motivo, ...base };
  }

  return { motivo: "DESCONOCIDO", ...base };
}

/**
 * ¿Merece que el Operador se entere?
 *
 * Solo lo que no sabemos leer. Los cuatro motivos reconocidos ya tienen su
 * respuesta y su mensaje para el agente; avisar de ellos convertiría el canal en
 * ruido y acabaría con el bot silenciado.
 *
 * `DESCONOCIDO` es lo contrario: es la señal de que la tabla de arriba se ha
 * quedado corta, y sin este aviso solo quedaría constancia en
 * `IntentoVinculacion`, que nadie mira. Es como se descubren los códigos nuevos
 * en vez de tragárselos.
 */
export function hayQueAvisarAlOperador(motivo: MotivoAlta): boolean {
  return motivo === "DESCONOCIDO";
}
