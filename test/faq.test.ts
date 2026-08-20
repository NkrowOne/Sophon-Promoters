import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { faq, type DatosFaq } from "../lib/faq.ts";
import { IDIOMAS } from "../lib/idiomas.ts";

/**
 * El FAQ, que es la única pantalla de texto largo de la aplicación.
 *
 * El compilador no cubre nada aquí: los cinco catálogos son funciones que
 * devuelven listas, así que a un idioma se le puede caer una sección entera y
 * el build pasa en verde. Es exactamente el defecto que `Ensanchar<typeof es>`
 * evita en `lib/i18n.ts` y que aquí hay que comprobar a mano.
 */

const CON_DATOS: DatosFaq = {
  cpa: "0,03 $",
  cps: "5 %",
  minimo: "20,00 $",
  primerNivel: { usuarios: "10.000", premio: "50,00 $" },
};

const SIN_DATOS: DatosFaq = { cpa: null, cps: null, minimo: "20,00 $", primerNivel: null };

/**
 * Y sin NADA, que es el estado real de esta pantalla mientras la API contesta
 * —y el definitivo si no contesta—. La ayuda no se bloquea esperando cifras: se
 * pinta entera y las cifras entran si entran.
 */
const A_SECAS: DatosFaq = { cpa: null, cps: null, minimo: null, primerNivel: null };

describe("las preguntas frecuentes", () => {
  it("las cinco lenguas traen las MISMAS secciones y las mismas preguntas, en el mismo orden", () => {
    /*
     * La forma es la que fija el español, y no por preferencia: es el catálogo
     * que se escribe primero y del que se traducen los demás. Si al árabe le
     * falta una pregunta, la respuesta no es que el árabe tenga menos ayuda: es
     * que se olvidó al traducir.
     */
    const referencia = faq("es", CON_DATOS).map((s) => s.preguntas.length);

    for (const idioma of IDIOMAS) {
      const secciones = faq(idioma, CON_DATOS);
      assert.equal(
        secciones.length,
        referencia.length,
        `«${idioma}» no tiene el mismo número de secciones`,
      );
      assert.deepEqual(
        secciones.map((s) => s.preguntas.length),
        referencia,
        `«${idioma}» no tiene las mismas preguntas por sección`,
      );
    }
  });

  it("ni una pregunta se queda sin respuesta, ni un título en blanco", () => {
    for (const idioma of IDIOMAS) {
      for (const seccion of faq(idioma, CON_DATOS)) {
        assert.ok(seccion.titulo.trim(), `${idioma}: sección sin título`);
        for (const p of seccion.preguntas) {
          assert.ok(p.pregunta.trim(), `${idioma}: pregunta vacía en «${seccion.titulo}»`);
          assert.ok(p.respuesta.length > 0, `${idioma}: «${p.pregunta}» sin respuesta`);
          for (const parrafo of p.respuesta) {
            assert.ok(parrafo.trim(), `${idioma}: párrafo vacío en «${p.pregunta}»`);
          }
        }
      }
    }
  });

  /**
   * Las cifras entran por parámetro, y esta es la prueba de que de verdad lo
   * hacen.
   *
   * El defecto que sustituye este módulo era justo el contrario: «Cobras 0,03 $
   * por cada usuario» escrito a mano en cinco catálogos, con los 0,03 sacados de
   * una tarifa versionada que el Operador cambia desde su panel. Si alguien
   * vuelve a escribir un importe en el texto, este test lo caza.
   */
  it("no hay ni un importe escrito a mano en el texto", () => {
    // Con los datos a `null` no puede quedar ningún número con decimales ni
    // ningún porcentaje: los tres que hay salen todos de `DatosFaq`, y el
    // mínimo se pasa siempre.
    const conMinimo = /20,00|20\.00/;
    for (const idioma of IDIOMAS) {
      for (const seccion of faq(idioma, SIN_DATOS)) {
        for (const p of seccion.preguntas) {
          for (const parrafo of p.respuesta) {
            const sinMinimo = parrafo.replace(conMinimo, "");
            assert.doesNotMatch(
              sinMinimo,
              /\d+[.,]\d{2}\s*\$|\$\s*\d+[.,]\d{2}|\d+\s*%/,
              `${idioma}: hay una cifra escrita a mano — ${parrafo}`,
            );
          }
        }
      }
    }
  });

  it("cuando hay tarifa, la cifra aparece; cuando no, la frase sigue teniendo sentido", () => {
    for (const idioma of IDIOMAS) {
      const con = faq(idioma, CON_DATOS)
        .flatMap((s) => s.preguntas)
        .flatMap((p) => p.respuesta)
        .join(" ");
      assert.ok(con.includes("0,03 $"), `${idioma}: no aparece lo que se cobra por registro`);
      assert.ok(con.includes("5 %"), `${idioma}: no aparece el porcentaje del PRO`);
      assert.ok(con.includes("20,00 $"), `${idioma}: no aparece el mínimo`);
      assert.ok(con.includes("50,00 $"), `${idioma}: no aparece el premio del primer nivel`);

      // Y sin NADA no se cuela un «null» ni un hueco donde iba la cifra.
      const sin = faq(idioma, A_SECAS)
        .flatMap((s) => s.preguntas)
        .flatMap((p) => p.respuesta)
        .join(" ");
      // Con límites de palabra: sin ellos, el italiano «Non devi fare nulla»
      // y cualquier «annullare» dan positivo, y el test empieza a fallar por
      // una traducción correcta.
      assert.doesNotMatch(
        sin,
        /\b(null|undefined|NaN)\b/,
        `${idioma}: se escapa un valor sin dato`,
      );
    }
  });

  /**
   * La regla dura, extendida a lo único que no la comprobaba.
   *
   * `test/i18n.test.ts` la verifica sobre los catálogos de interfaz. El FAQ es
   * texto largo escrito después, o sea el sitio más fácil del proyecto para
   * contar de más sin darse cuenta: aquí es donde apetece explicar «de lo que
   * paga el usuario, el webmaster se lleva tanto y nosotros tanto».
   */
  it("ninguna respuesta revela el reparto de arriba", () => {
    const prohibidas = [/margen/i, /\bmi comisión\b/i, /Operador[^.]{0,30}\d/i];
    for (const idioma of IDIOMAS) {
      for (const seccion of faq(idioma, CON_DATOS)) {
        for (const p of seccion.preguntas) {
          for (const parrafo of p.respuesta) {
            for (const patron of prohibidas) {
              assert.doesNotMatch(parrafo, patron, `${idioma}: ${parrafo}`);
            }
          }
        }
      }
    }
  });

  it("el español no reintroduce la jerga que el §18 retiró", () => {
    // Las mismas que vigila `test/i18n.test.ts`. Un texto nuevo escrito meses
    // después es justo por donde vuelven: «hito» es la palabra natural para
    // hablar de un bono por umbrales, y en esta casa se dice «nivel».
    const retiradas: [RegExp, string][] = [
      [/devengad/i, "«devengado» es contable: se dice «ganado»"],
      [/\bhito\b/i, "«hito» es gestión de proyectos: se dice «nivel»"],
      [/\bincidencia/i, "«incidencia» es jerga de soporte"],
      [/saldo consolidado/i, "«consolidado» es contable: se dice «confirmado»"],
      [/plazo de resolución/i, "«plazo de resolución» es lengua de ventanilla"],
    ];

    for (const seccion of faq("es", CON_DATOS)) {
      for (const p of seccion.preguntas) {
        for (const texto of [p.pregunta, ...p.respuesta]) {
          for (const [patron, porque] of retiradas) {
            assert.doesNotMatch(texto, patron, `${porque} — en: ${texto}`);
          }
        }
      }
    }
  });

  it("se contestan las cuatro preguntas por las que se abre esta pantalla", () => {
    /*
     * No es una prueba de contenido por gusto: son las cuatro dudas que hasta
     * ahora llegaban por Telegram, y la razón por la que existe la pantalla. Si
     * una reorganización se lleva alguna por delante, la ayuda deja de cubrir
     * el motivo por el que se escribió.
     */
    const texto = faq("es", CON_DATOS)
      .flatMap((s) => s.preguntas)
      .map((p) => `${p.pregunta} ${p.respuesta.join(" ")}`)
      .join("\n");

    assert.match(texto, /disponible/i, "falta por qué el disponible es menos que lo ganado");
    assert.match(texto, /no se recupera/i, "falta el aviso de la red equivocada");
    assert.match(texto, /entre 1 y 3 días/i, "falta el plazo de pago");
    assert.match(texto, /reinicia el día 1/i, "falta que el bono se reinicia cada mes");
  });
});
