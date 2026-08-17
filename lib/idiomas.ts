/**
 * Idiomas de la interfaz.
 *
 * Vive aparte de `auth/telegram.ts` a propósito: aquel importa `node:crypto`
 * para verificar la firma del initData, y los componentes de cliente necesitan
 * estas constantes. Mezclarlos arrastraría un módulo de Node al bundle del
 * navegador y el build fallaría.
 */

export const IDIOMAS = ["es", "en", "ar", "it", "pt"] as const;
export type Idioma = (typeof IDIOMAS)[number];

/*
 * ── DOS RESPALDOS, PORQUE SON DOS PREGUNTAS DISTINTAS ──────────────────────
 *
 * Había una sola constante, `IDIOMA_POR_DEFECTO = "es"`, y contestaba a la vez
 * a dos cosas que no tienen por qué valer lo mismo:
 *
 *   «¿en qué idioma le hablo a un agente cuyo idioma no sé?»
 *   «¿en qué idioma están escritas las pantallas que no se traducen?»
 *
 * Mientras las dos respuestas fueron «español» la mezcla no se notaba. En
 * cuanto la primera pasa a ser el inglés, un único nombre habría arrastrado a
 * la segunda con él: el panel del Operador —que está en español a propósito y
 * no tiene catálogo— habría empezado a escribir el dinero «55,842.05 $» en vez
 * de «55.842,05 $», y nadie lo habría pedido.
 *
 * Así que son dos constantes con dos nombres, y cada punto de llamada dice cuál
 * de las dos preguntas está haciendo.
 */

/**
 * El idioma de quien no ha dicho el suyo.
 *
 * Se usa cuando Telegram no manda `language_code` y cuando manda uno que no
 * está entre los cinco —un francés, un alemán, un ruso—.
 *
 * **Es el inglés y no el español**, que es lo que era. Un francés al que se le
 * habla en español no entiende nada; en inglés se defiende. El español no
 * pierde nada con esto: quien tiene Telegram en español lo sigue viendo en
 * español, porque entonces sí sabemos cuál es su idioma.
 */
export const IDIOMA_DE_RESPALDO: Idioma = "en";

/**
 * El idioma en el que está escrito lo que NO se traduce.
 *
 * El panel del Operador, sus comandos del bot, los avisos de tesorería, el JSON
 * del cron y los guiones de consola. Lo usa una sola persona y `lib/i18n.ts`
 * explica por qué mantener cinco versiones de eso sería trabajo sin destino.
 *
 * Es el valor por defecto de `formatearMicros`, y por eso el dinero del panel
 * sigue saliendo con la coma decimal española: ahí el español es la respuesta
 * correcta, no una omisión.
 */
export const IDIOMA_DEL_OPERADOR: Idioma = "es";

/** Solo el árabe invierte el layout. */
export const IDIOMAS_RTL: readonly Idioma[] = ["ar"];

/** Traduce el `language_code` que manda Telegram a uno de los cinco soportados. */
export function idiomaDesdeTelegram(codigo: string | undefined | null): Idioma {
  if (!codigo) return IDIOMA_DE_RESPALDO;
  const base = codigo.toLowerCase().split("-")[0] ?? "";
  return (IDIOMAS as readonly string[]).includes(base) ? (base as Idioma) : IDIOMA_DE_RESPALDO;
}

export function esRtl(idioma: Idioma): boolean {
  return IDIOMAS_RTL.includes(idioma);
}

/**
 * Locale BCP-47 de cada idioma, para todo lo que numere.
 *
 * Los catálogos de `lib/i18n.ts` ya llamaban a `toLocaleString` con estas mismas
 * cinco cadenas escritas a mano en cada `registrosYWebmasters`, `numero`,
 * `desglose`… La tabla vive aquí porque el dinero (`lib/devengo/dinero.ts`)
 * necesita el mismo criterio y no puede importar los catálogos: se veía en la
 * portada árabe que los RECUENTOS salían «21,840» y el DINERO justo debajo
 * «2.147,39 $», dos convenciones numéricas en la misma pantalla.
 *
 * `ar` va a secas, sin país, por lo mismo que explica el catálogo árabe: `ar-EG`
 * numeraría con cifras índigo-arábigas y los importes tienen que leerse igual
 * que en la cartera de criptomonedas que el agente mira al lado.
 */
export const LOCALES: Record<Idioma, string> = {
  es: "es-ES",
  en: "en-US",
  it: "it-IT",
  pt: "pt-PT",
  ar: "ar",
};

/**
 * Convierte lo que hay guardado en `Agente.idioma` en un idioma de verdad.
 *
 * La columna es `TEXT`, así que puede traer cualquier cosa: una fila anterior a
 * la migración, un idioma que se retiró, o un valor puesto a mano. Cae al
 * respaldo en vez de dejar que un `catalogos[valor]` devuelva `undefined` y
 * reviente al leer la primera cadena.
 *
 * Al respaldo del AGENTE y no al del Operador: lo que hay en esa columna es el
 * idioma de una persona a la que se le va a escribir, y de ella lo único que
 * consta es que no sabemos cuál es.
 */
export function idiomaGuardado(valor: string | null | undefined): Idioma {
  return valor && (IDIOMAS as readonly string[]).includes(valor)
    ? (valor as Idioma)
    : IDIOMA_DE_RESPALDO;
}
