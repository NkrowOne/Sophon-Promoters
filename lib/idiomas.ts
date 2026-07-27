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

export const IDIOMA_POR_DEFECTO: Idioma = "es";

/** Solo el árabe invierte el layout. */
export const IDIOMAS_RTL: readonly Idioma[] = ["ar"];

/** Traduce el `language_code` que manda Telegram a uno de los cinco soportados. */
export function idiomaDesdeTelegram(codigo: string | undefined | null): Idioma {
  if (!codigo) return IDIOMA_POR_DEFECTO;
  const base = codigo.toLowerCase().split("-")[0] ?? "";
  return (IDIOMAS as readonly string[]).includes(base) ? (base as Idioma) : IDIOMA_POR_DEFECTO;
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
 * español en vez de dejar que un `catalogos[valor]` devuelva `undefined` y
 * reviente al leer la primera cadena.
 */
export function idiomaGuardado(valor: string | null | undefined): Idioma {
  return valor && (IDIOMAS as readonly string[]).includes(valor)
    ? (valor as Idioma)
    : IDIOMA_POR_DEFECTO;
}
