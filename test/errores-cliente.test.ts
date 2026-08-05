import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { aErrorApi, ErrorApi, errorDeRed } from "../lib/api/cliente.ts";
import { cadenas } from "../lib/i18n.ts";
import { IDIOMAS } from "../lib/idiomas.ts";

/**
 * El texto de un fallo, y en qué momento se decide.
 *
 * El defecto que esto cierra era invisible en español y solo en español. Cada
 * pantalla envolvía lo capturado con
 *
 *     e instanceof ErrorApi ? e : new ErrorApi(t.algoHaFallado, 0, null)
 *
 * dentro de un `useCallback` cuyas dependencias NO incluían `t`. Así que la
 * función se creaba en el primer render y se quedaba con el catálogo de ese
 * momento —siempre el español, porque `TelegramProvider` resuelve el idioma en
 * un efecto, o sea después de que los hijos hayan renderizado—. Un agente
 * inglés o árabe que se quedaba sin cobertura leía «Algo ha fallado.» en
 * español, y esa es justo la rama más frecuente: la aplicación se usa de pie en
 * la calle. La portada ni siquiera pasaba por el catálogo: tenía el literal
 * escrito a mano.
 *
 * La regla, y es lo que estas pruebas fijan: **el error de red no lleva texto**.
 * Se marca como genérico y lo traduce quien lo pinta, que es el único momento
 * en el que el catálogo está fresco por construcción.
 */

describe("errores del cliente de API", () => {
  it("el fallo de red no trae texto: lo pone quien pinta", () => {
    const e = errorDeRed();
    assert.equal(e.generico, true, "tiene que marcarse como genérico");
    assert.equal(e.message, "", "un texto aquí sería el que se congela");
    // `estado: 0` lo distingue de cualquier respuesta HTTP, incluido el 401 que
    // `FalloDeCarga` trata aparte para mandar al alta.
    assert.equal(e.estado, 0);
  });

  it("lo que viene del servidor NO se marca genérico y se respeta", () => {
    // Las rutas resuelven `cadenas(sesion.idioma)`, así que su texto ya llega
    // en el idioma del agente. Traducirlo otra vez al pintarlo lo destruiría.
    const e = new ErrorApi("Questo webmaster è già nella tua squadra.", 409, null);
    assert.equal(e.generico, false);
    assert.equal(e.message, "Questo webmaster è già nella tua squadra.");
  });

  it("aErrorApi no inventa texto para lo que no reconoce", () => {
    // El sustituto de las ocho envolturas. Lo importante es que NO resuelva
    // ninguna cadena: si lo hiciera, volvería el problema por otra puerta.
    const deRed = aErrorApi(new TypeError("Failed to fetch"));
    assert.equal(deRed.generico, true);
    assert.equal(deRed.message, "");

    const yaEra = new ErrorApi("El código de activación no vale.", 400, "Te lo da el operador.");
    assert.equal(aErrorApi(yaEra), yaEra, "un ErrorApi se devuelve tal cual, sin envolver");
  });

  it("los cinco catálogos tienen el respaldo genérico, y ninguno en español", () => {
    // Si el día de mañana falta en uno, el compilador ya lo impide —los
    // catálogos son completos por tipo—, pero lo que esto comprueba es otra
    // cosa: que estén de verdad TRADUCIDOS y no copiados del español, que es
    // como se disimula un catálogo a medias.
    const es = cadenas("es").algoHaFallado;
    for (const idioma of IDIOMAS) {
      const texto = cadenas(idioma).algoHaFallado;
      assert.ok(texto.length > 0, `${idioma} sin texto de fallo genérico`);
      if (idioma !== "es") {
        assert.notEqual(texto, es, `${idioma} tiene el texto español copiado`);
      }
    }
  });
});
