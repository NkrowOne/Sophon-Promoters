import { test } from "node:test";
import assert from "node:assert/strict";

import { cadenas } from "../lib/i18n.ts";
import { IDIOMAS, type Idioma } from "../lib/idiomas.ts";

/**
 * El catálogo, que hasta ahora no tenía una sola prueba.
 *
 * `Ensanchar<T>` obliga a que los cinco idiomas tengan el mismo juego de claves
 * o el build se cae, así que el compilador ya cubre lo estructural. Lo que no
 * cubre —y es lo que se comprueba aquí— es el CONTENIDO: que un término
 * retirado no vuelva a entrar por descuido, que ninguna cadena revele lo que no
 * debe, y que el formato de los números sea el de cada idioma y no el del
 * navegador de quien lo escribió.
 *
 * Las tres cosas han pasado de verdad en este proyecto.
 */

const CATALOGOS = IDIOMAS.map((idioma) => [idioma, cadenas(idioma)] as const);

/** Todos los textos que produce un catálogo, con las funciones ya llamadas. */
function textosDe(idioma: Idioma): string[] {
  const c = cadenas(idioma) as Record<string, unknown>;
  const salida: string[] = [];
  for (const valor of Object.values(c)) {
    if (typeof valor === "string") {
      salida.push(valor);
    } else if (typeof valor === "function") {
      // Se invocan con argumentos plausibles de los dos tipos que usan las
      // firmas —número y cadena—, y con 1 y con 2 para recorrer las dos ramas
      // de plural. Si una firma no admite estos valores, devuelve algo raro
      // pero no lanza, que es todo lo que hace falta para inspeccionar el texto.
      for (const args of [[1, 1, 1, 1], [2, 2, 2, 2], ["X", "X", "X", "X"]]) {
        try {
          salida.push(String((valor as (...a: unknown[]) => string)(...args)));
        } catch {
          /* una firma que no acepta estos argumentos no aporta texto que mirar */
        }
      }
    }
  }
  return salida;
}

/* ── Lo estructural ─────────────────────────────────────────────────────── */

test("los cinco catálogos tienen exactamente el mismo juego de claves", () => {
  const [, español] = CATALOGOS[0]!;
  const referencia = Object.keys(español).sort();

  for (const [idioma, catalogo] of CATALOGOS) {
    assert.deepEqual(
      Object.keys(catalogo).sort(),
      referencia,
      `el catálogo «${idioma}» no tiene las mismas claves que el español`,
    );
  }
});

test("una clave que es función en español lo es en los cinco idiomas, con la misma aridad", () => {
  const [, español] = CATALOGOS[0]!;

  for (const [clave, valor] of Object.entries(español)) {
    if (typeof valor !== "function") continue;
    for (const [idioma, catalogo] of CATALOGOS) {
      const otro = (catalogo as Record<string, unknown>)[clave];
      assert.equal(typeof otro, "function", `«${clave}» no es función en «${idioma}»`);
      // La aridad importa: el llamante pasa los argumentos en un orden fijo, y
      // una traducción que se deje uno fuera compila —el tipo solo exige que
      // acepte esos parámetros— pero pierde el dato al pintarlo.
      assert.equal(
        (otro as (...a: unknown[]) => string).length,
        valor.length,
        `«${clave}» recibe ${valor.length} argumentos en español y ${(otro as (...a: unknown[]) => string).length} en «${idioma}»`,
      );
    }
  }
});

/* ── La regla dura: el margen del superadmin no sale nunca ──────────────── */

test("ninguna cadena revela el reparto del superadmin", () => {
  // Lo que el agente cobra sí puede aparecer. Lo que NO puede aparecer es el
  // reparto de arriba: ni el margen, ni lo que cobra el webmaster, ni la
  // palabra «superadmin» junto a una cifra.
  const prohibidas = [/margen/i, /superadmin[^.]{0,30}\d/i, /\bmi comisión\b/i];

  for (const idioma of IDIOMAS) {
    for (const texto of textosDe(idioma)) {
      for (const patron of prohibidas) {
        assert.ok(
          !patron.test(texto),
          `«${idioma}» contiene algo que puede revelar el reparto: ${texto}`,
        );
      }
    }
  }
});

/* ── El vocabulario retirado, para que no vuelva solo ───────────────────── */

test("la jerga retirada en el §18 no vuelve al catálogo español", () => {
  // Cada una de estas se cambió por una razón escrita en el plan. Si alguien
  // las reintroduce, es por descuido y no por decisión.
  const retiradas: [RegExp, string][] = [
    [/devengad/i, "«devengado» es lenguaje contable: se dice «ganado»"],
    [/\bincidencia/i, "«con incidencia» es jerga de soporte: se dice «con problemas»"],
    [/\bhito\b/i, "«hito» es gestión de proyectos: se dice «nivel»"],
    [/no consta/i, "«No consta» es lengua de registro civil: se dice «Ya no está»"],
    [/plazo de resolución/i, "«plazo de resolución» es lengua de ventanilla"],
    [/saldo consolidado/i, "«consolidado» es contable: se dice «confirmado»"],
    [/sujet[oa]s? a revisión/i, "«sujetos a revisión» es jurídico"],
    [/pendiente de borrado/i, "se dice «Se va a borrar», como en la Malla"],
  ];

  for (const texto of textosDe("es")) {
    for (const [patron, porque] of retiradas) {
      assert.ok(!patron.test(texto), `${porque} — encontrado en: ${texto}`);
    }
  }
});

test("«red» queda reservada a la blockchain, que es donde equivocarse cuesta dinero", () => {
  const t = cadenas("es");

  // La acepción peligrosa se conserva: es la convención universal y es la
  // pantalla en la que un error hace perder el pago.
  assert.match(t.enQueRed, /red/i);

  // La otra acepción se movió, porque tenía alternativa igual de convencional.
  assert.doesNotMatch(t.red, /^red$/i);
  assert.match(t.red, /equipo/i);
});

test("la pantalla del dinero y el campo de la dirección no comparten palabra", () => {
  const t = cadenas("es");
  // «Cartera» y «Monedero» son dos sinónimos de wallet a un scroll de
  // distancia: uno era la pantalla y otro la dirección USDT.
  assert.doesNotMatch(t.cartera, /cartera|monedero/i);
  assert.match(t.walletUsdt, /monedero/i);
});

/* ── Los números, cada uno en su convención ─────────────────────────────── */

test("los millares siguen la convención de cada idioma, no la del navegador", () => {
  // ⚠ Esto se diagnosticó MAL una vez: se informó como defecto que «2517»
  // apareciera sin separador al lado de «10.000». No lo es. En español, en
  // italiano y en portugués la separación empieza en CINCO cifras —es la
  // convención de la RAE y equivalentes—, así que cuatro cifras van juntas.
  // El test lo fija para que nadie lo «arregle».
  assert.equal(cadenas("es").numero(2517), "2517");
  assert.equal(cadenas("es").numero(10000), "10.000");
  assert.equal(cadenas("it").numero(2517), "2517");
  assert.equal(cadenas("it").numero(10000), "10.000");

  // El inglés sí agrupa desde cuatro.
  assert.equal(cadenas("en").numero(2517), "2,517");
  assert.equal(cadenas("en").numero(10000), "10,000");
});

test("cada catálogo formatea con su propio locale", () => {
  // El defecto real que esto previene: una escalera que pintaba «10,000» con el
  // formato del navegador al lado de un «50,00 $» con el de la aplicación.
  const porIdioma = IDIOMAS.map((i) => cadenas(i).numero(1234567));
  assert.equal(new Set(porIdioma).size > 1, true, "todos los idiomas formatean igual: alguno no usa su locale");
});

/* ── La voz ─────────────────────────────────────────────────────────────── */

test("no hay emoji ni exclamaciones en la interfaz", () => {
  // Regla 4 de la cabecera: el agente es un profesional que cobra, no alguien a
  // quien haya que animar.
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

  for (const idioma of IDIOMAS) {
    for (const texto of textosDe(idioma)) {
      assert.ok(!emoji.test(texto), `«${idioma}» tiene emoji: ${texto}`);
      assert.ok(!texto.includes("!"), `«${idioma}» tiene exclamación: ${texto}`);
      // El español además abre. En árabe «!» no aplica igual, pero tampoco lo usa.
      assert.ok(!texto.includes("¡"), `«${idioma}» tiene exclamación: ${texto}`);
    }
  }
});
