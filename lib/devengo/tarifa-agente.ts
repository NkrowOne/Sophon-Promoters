/**
 * La tarifa que se le aplica a UN agente.
 *
 * ── LO QUE ESTABA ROTO ──
 *
 * `Agente.cpaPorRegistroMicros` y `Agente.cpsBps` existen en el esquema desde el
 * principio, con este comentario: «Si son null, se aplican las de configuración».
 * La ficha del agente las enseña y dice, en negrita, **«Tarifa propia. Este
 * agente no cobra la tarifa general»**.
 *
 * El motor nunca las leyó. El barrido pedía `tarifaVigente()` una vez, fuera del
 * bucle, y devengaba a todo el mundo con la general. O sea: se prometía una cosa
 * en la pantalla y se pagaba otra en el libro, sin que nada chirriara. Un agente
 * con condiciones mejores cobraba de menos y no había forma de verlo salvo
 * multiplicando a mano.
 *
 * Se descubrió al cuadrar el reparto del panel con lo devengado: sobraban 3,70 $
 * que correspondían, exactamente, al único agente con condiciones propias.
 *
 * ── POR QUÉ AQUÍ Y SIN DEPENDENCIAS ──
 *
 * Igual que `atribucion.ts` y `reparto.ts`: decide cuánto cobra alguien, así que
 * tiene que estar cerrado con pruebas, y una prueba no puede importar el módulo
 * que arrastra Prisma.
 */

/** La forma de `Tarifa` del motor, repetida para no arrastrar sus importaciones. */
export interface TarifaAplicable {
  id: string;
  cpaPorRegistroMicros: bigint;
  cpsBps: bigint;
}

/** Lo que un agente puede tener pactado aparte. Cada campo, por separado. */
export interface CondicionesPropias {
  cpaPorRegistroMicros: bigint | null;
  cpsBps: number | null;
}

/**
 * Mezcla las condiciones propias del agente con la tarifa general.
 *
 * Los dos campos son independientes: un agente puede tener CPA propio y CPS
 * general. Por eso no es «tiene condiciones o no», sino campo a campo.
 *
 * `id` sigue siendo el de la versión general en vigor, y eso es deliberado: el
 * asiento congela QUÉ VERSIÓN estaba vigente cuando se devengó, que es lo que
 * hace falta para auditar. El importe pactado aparte queda en el propio asiento,
 * en `importeMicros` y `baseMicros`, que es donde se puede comprobar.
 *
 * Sin tarifa general devuelve `null` aunque el agente tenga condiciones propias:
 * no hay versión en vigor que congelar, y un asiento sin ella no se puede
 * auditar después. Es el mismo criterio que ya tenía el barrido.
 */
export function tarifaParaAgente(
  general: TarifaAplicable | null,
  propias: CondicionesPropias | null,
): TarifaAplicable | null {
  if (!general) return null;
  if (!propias) return general;
  return {
    id: general.id,
    cpaPorRegistroMicros: propias.cpaPorRegistroMicros ?? general.cpaPorRegistroMicros,
    cpsBps: propias.cpsBps === null ? general.cpsBps : BigInt(propias.cpsBps),
  };
}
