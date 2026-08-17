/**
 * La tabla de precios del programa de socios, tal y como la tiene que ver un
 * agente.
 *
 * ── QUÉ PREGUNTA CONTESTA ──
 *
 * «¿Cuánto va a cobrar mi webmaster por cada 100 usuarios que traiga?» El agente
 * no la necesita para cobrar él —su comisión es fija y no depende del nivel—,
 * la necesita para **decírselo al webmaster antes de que empiece**. Sin ella, la
 * conversación de captación es «tú tráeme gente y ya verás», que es la peor
 * forma de vender algo que sí tiene números.
 *
 * ── DE DÓNDE SALE ──
 *
 * De Sophon, en vivo, no de una tabla copiada a mano. `region/reward` devuelve
 * los países de cada tier y el precio de cada nivel, y `brief/register` el nivel
 * en el que está la cuenta. Copiarlo habría significado que el día que Sophon
 * suba un precio la aplicación siga enseñando el viejo, y eso es peor que no
 * enseñar nada: una tabla desactualizada se lee con la misma confianza que una
 * al día.
 *
 * ── EL DESCUENTO, QUE ES LA PARTE DELICADA ──
 *
 * Lo que Sophon paga es el precio GLOBAL. De ahí salen seis céntimos por
 * usuario que no llegan al webmaster: tres son la comisión del agente y tres se
 * quedan arriba. Así que lo que se pinta es el global MENOS esos seis céntimos,
 * porque es lo que el webmaster verá de verdad en su cuenta.
 *
 * **El reparto de esos seis céntimos no sale de este módulo.** No se expone «de
 * los cuales 3 son tuyos», ni el total, ni la diferencia: `lib/i18n.ts` lo dice
 * en su regla dura —«ninguna cadena puede revelar el reparto del Operador»— y
 * aquí se cumple no calculándolo. Lo que el agente cobra ya se lo dice su propio
 * saldo; lo que se queda el Operador no es asunto de esta pantalla.
 *
 * Por eso la constante es UNA, el descuento entero, y no dos sumandos: teniendo
 * dos, alguien acabaría pintando el que no toca.
 */

import { microsDesdeCadena, type Micros } from "../devengo/dinero.ts";
import { clienteSophon } from "../sophon/instancia.ts";
import { NivelAfiliado } from "../sophon/tipos.ts";

/**
 * Lo que se descuenta del precio global por cada usuario, en micros.
 *
 * Seis céntimos. Es la diferencia entre lo que paga Sophon y lo que cobra el
 * webmaster, y de ahí sale también la comisión del agente —que él ve en su
 * saldo, no aquí—.
 */
export const DESCUENTO_POR_USUARIO_MICROS: Micros = 60_000n;

/** La tabla se anuncia por cada 100 usuarios, igual que la de Sophon. */
export const USUARIOS_POR_BLOQUE = 100n;

/**
 * Tope de cordura del precio por usuario.
 *
 * Sophon devuelve el precio POR USUARIO (`0.3`), y la tabla del programa de
 * socios lo enseña por cada 100 (`$30`). Si algún día el campo pasara a venir ya
 * multiplicado, el descuento de seis céntimos se quedaría en nada y la pantalla
 * anunciaría precios cien veces mayores —con el agente repitiéndoselos a sus
 * webmasters—.
 *
 * Cinco dólares por usuario es un orden de magnitud por encima de cualquier
 * tier real, así que pasarse solo puede significar que la unidad ha cambiado. Y
 * entonces la tabla NO se pinta: quedarse sin tabla es un problema, enseñar una
 * mentira sobre dinero es otro mucho peor.
 */
const PRECIO_MAXIMO_POR_USUARIO_MICROS: Micros = 5_000_000n;

export interface FilaTier {
  /** `T1`, `T2`, `T3`… tal como lo clasifica Sophon. */
  tier: string;
  /** Los países de ese tier, ya separados. */
  paises: string[];
  /** Nivel → lo que cobra el webmaster por cada 100 usuarios, en micros. */
  porNivelMicros: Record<number, string>;
}

export interface RequisitoDeNivel {
  nivel: number;
  /**
   * Lo que tienen que llevar pagado los usuarios captados en el mes para
   * alcanzar este nivel, en micros. Mide su COMPRA de PRO, no la recompensa
   * que cobra la cuenta: son dos cifras de dinero y confundirlas hace que los
   * umbrales parezcan inalcanzables. Ver `lib/sophon/tipos.ts`.
   */
  minimoMicros: string;
}

export interface TablaPrecios {
  /** El nivel en el que está la cuenta ahora mismo. */
  nivelActual: number;
  /** Todos los niveles que existen, ordenados. */
  niveles: number[];
  tiers: FilaTier[];
  requisitos: RequisitoDeNivel[];
}

/*
 * ── LO QUE ESTA TABLA NO TRAE, Y NO ES UN OLVIDO ──
 *
 * `monthlyInvitedUsersPaid` —lo que llevan pagado este mes los usuarios
 * captados— estuvo aquí y se ha retirado. Es una cifra de la CUENTA MAESTRA, o
 * sea del Operador: el volumen de compra de todos sus agentes juntos. Servida a
 * cada agente le contaba el tamaño del negocio de arriba, que es exactamente lo
 * que la regla dura de `lib/i18n.ts` prohíbe.
 *
 * Y sin ella se cae también el «te faltan X para LV5», que es su resta. No se
 * sustituye por la cifra del agente porque no existe: el nivel es de la cuenta
 * entera, así que ningún agente tiene un «lo que llevo» que comparar con el
 * umbral. Lo que queda es la escalera con sus umbrales, que es la información
 * verdadera y la única que el agente necesita para contarla.
 */

/**
 * Caché en proceso.
 *
 * La tabla de Sophon cambia como mucho un puñado de veces al año, y el nivel una
 * vez al mes. Sin caché, cada agente que abriera la pantalla gastaría dos
 * llamadas contra Sophon, y esta es una pantalla que se abre para enseñársela a
 * alguien —o sea, varias veces seguidas—.
 *
 * Se cachea el resultado YA CALCULADO. Guardar la respuesta cruda obligaría a
 * rehacer el descuento en cada lectura, que es la operación que no puede
 * equivocarse ni una vez.
 */
let memo: { valor: TablaPrecios; expira: number } | null = null;
const MINUTOS_CACHE = 30;

/** Para las pruebas y para el arranque: deja la caché como recién nacida. */
export function olvidarTablaDePrecios(): void {
  memo = null;
}

/**
 * Aplica el descuento y lo lleva a bloques de 100.
 *
 * Devuelve `null` si el precio no es creíble o si el descuento se lo come
 * entero: un tier que pagara menos de seis céntimos por usuario no dejaría nada
 * para el webmaster, y pintar «$0 por cada 100» sería anunciar que no se cobra
 * cuando lo que pasa es que ese dato no cuadra.
 */
export function precioDelWebmaster(unitPrice: string): Micros | null {
  const porUsuario = microsDesdeCadena(unitPrice);
  if (porUsuario <= 0n || porUsuario > PRECIO_MAXIMO_POR_USUARIO_MICROS) return null;
  const neto = porUsuario - DESCUENTO_POR_USUARIO_MICROS;
  if (neto <= 0n) return null;
  return neto * USUARIOS_POR_BLOQUE;
}

/**
 * La tabla entera, lista para pintar.
 *
 * Las dos llamadas van EN PARALELO: son independientes y encadenarlas sumaba
 * dos viajes a Sophon al tiempo de la primera carga de una pantalla que el
 * agente abre delante de otra persona.
 */
export async function tablaDePrecios(): Promise<TablaPrecios> {
  const ahora = Date.now();
  if (memo && memo.expira > ahora) return memo.valor;

  const cliente = clienteSophon();
  const [tarifas, resumen] = await Promise.all([
    cliente.tarifas(),
    // `Total` y no `Webmaster`: de este resumen se usa SOLO `partnerLevel`, que
    // es de la cuenta y no de un reparto concreto. Nada más de esta respuesta
    // sale de este módulo — ver la nota de arriba.
    cliente.resumenRegistros(NivelAfiliado.Total),
  ]);

  const niveles = new Set<number>();
  const tiers: FilaTier[] = [];

  for (const region of tarifas.regionLevelPrices) {
    const porNivelMicros: Record<number, string> = {};
    for (const p of region.levelPrice) {
      const neto = precioDelWebmaster(p.unitPrice);
      if (neto === null) continue;
      porNivelMicros[p.partnerLevel] = neto.toString();
      niveles.add(p.partnerLevel);
    }
    tiers.push({
      tier: region.classification,
      // Sophon los manda en una sola cadena separada por comas. Se recortan
      // porque llegan con espacios detrás de la coma de forma irregular.
      paises: region.region
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean),
      porNivelMicros,
    });
  }

  const valor: TablaPrecios = {
    nivelActual: resumen.partnerLevel,
    niveles: [...niveles].sort((a, b) => a - b),
    // Por tier y no por precio: el orden de Sophon es el suyo, y T1 antes que T3
    // es el orden en que el agente los va a nombrar.
    tiers: tiers.sort((a, b) => a.tier.localeCompare(b.tier)),
    requisitos: tarifas.partnerLevelRequires
      .map((r) => ({
        nivel: r.partnerLevel,
        minimoMicros: microsDesdeCadena(r.minMonthlyInvitedUsersPaid).toString(),
      }))
      .sort((a, b) => a.nivel - b.nivel),
  };

  memo = { valor, expira: ahora + MINUTOS_CACHE * 60_000 };
  return valor;
}
