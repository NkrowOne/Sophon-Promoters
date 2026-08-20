import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { cadenas } from "../lib/i18n.ts";
import { IDIOMAS } from "../lib/idiomas.ts";

/**
 * Que NINGUNA pantalla del agente escriba su propio texto.
 *
 * Es la prueba que faltaba después de la pasada de idioma, y viene de un caso
 * real: `not-found.tsx` era la única pantalla de la Mini App escrita a mano y
 * sin traducir. Un agente árabe que abría un enlace viejo se encontraba con dos
 * frases en español, sin barra de direcciones, en la única pantalla cuyo
 * trabajo entero es explicarle qué ha pasado.
 *
 * Y no se veía: el catálogo estaba completo, los cinco idiomas cuadraban, el
 * tipo compilaba. El texto simplemente no pasaba por ahí.
 *
 * Lo que se comprueba es lo estructural —de dónde sale el texto—, no cómo está
 * escrito: el registro lo vigilan `i18n.test.ts` y `faq.test.ts`, y solo pueden
 * vigilarlo si todo el texto está donde ellos miran.
 */

/** La única pantalla que se queda en español, y por un motivo. */
const SOLO_ESPANOL = new Set([
  /*
   * El diagnóstico es del Operador, no del agente: se abre con `/diagnostico`
   * desde el bot para averiguar por qué la Mini App no autentica, y lo que
   * enseña —veredicto de la firma, desfase de reloj, cabeceras— no tiene
   * traducción útil. Traducirlo sería mantener cinco versiones de una pantalla
   * que abre una sola persona.
   */
  "app/(miniapp)/diagnostico/page.tsx",
]);

function pantallas(dir: string, salida: string[] = []): string[] {
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) pantallas(ruta, salida);
    else if (ruta.endsWith(".tsx")) salida.push(ruta);
  }
  return salida;
}

/**
 * Fuera comentarios.
 *
 * Este proyecto documenta a conciencia, así que la mitad del castellano de un
 * fichero está en sus comentarios — y ahí es donde tiene que estar. Sin este
 * paso la prueba señalaría precisamente lo que hay que conservar.
 */
function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("el texto de las pantallas", () => {
  it("ninguna pantalla del agente escribe castellano a mano: todo sale del catálogo", () => {
    /*
     * Se busca por ACENTO y no por palabras. Un literal español sin ninguna
     * vocal acentuada se escapa —«Volver al inicio» lo haría—, pero la
     * alternativa es un diccionario que hay que mantener y que da falsos
     * positivos con cada identificador. Con el acento basta: en un texto de
     * interfaz de más de tres palabras casi siempre cae uno, y los que no caen
     * son etiquetas cortas que el compilador acaba delatando igual cuando
     * alguien traduce la pantalla de al lado.
     */
    const encontrados: string[] = [];

    for (const ruta of pantallas("app/(miniapp)")) {
      if (SOLO_ESPANOL.has(ruta)) continue;
      const cuerpo = sinComentarios(readFileSync(ruta, "utf8"));
      for (const trozo of cuerpo.matchAll(/>([^<>{}]*[áéíóúñÁÉÍÓÚÑ¿¡][^<>{}]*)</g)) {
        encontrados.push(`${ruta}: «${trozo[1]!.trim()}»`);
      }
    }

    assert.deepEqual(
      encontrados,
      [],
      `texto escrito en la pantalla en vez de en el catálogo:\n  ${encontrados.join("\n  ")}`,
    );
  });

  it("la pantalla del enlace roto habla las cinco lenguas, como el resto", () => {
    // El caso concreto que abrió esta prueba. Se comprueba por contenido y no
    // por existencia de la clave: el compilador ya exige la clave, lo que no
    // exige es que la pantalla la use ni que las traducciones digan algo.
    for (const idioma of IDIOMAS) {
      const t = cadenas(idioma);
      assert.ok(t.paginaNoExiste.trim(), `${idioma}: sin texto para el enlace roto`);
      assert.ok(t.paginaNoExisteApoyo.trim(), `${idioma}: sin apoyo para el enlace roto`);
    }

    const fuente = readFileSync("app/(miniapp)/not-found.tsx", "utf8");
    assert.match(fuente, /t\.paginaNoExiste\b/, "la pantalla no usa la cadena del catálogo");
    assert.match(fuente, /t\.volverAlInicio\b/, "la salida no usa la cadena del catálogo");
  });
});
