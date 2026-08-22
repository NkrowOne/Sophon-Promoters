import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { claveOperador, esClaveDeOperador, hayClaveOperador } from "../lib/operador.ts";

/**
 * La clave que abre el panel escribiéndola en el campo del correo.
 *
 * Se prueba con más cuidado que el resto porque es lo único de esta aplicación
 * que convierte **una cadena de texto en permiso de administrador**. Todo lo
 * demás está atado a una firma de Telegram o a una fila de la base de datos; esto
 * es una comparación, y una comparación mal puesta no falla: deja entrar.
 */

const CLAVE = "una-clave-larga-de-verdad";

function con(valor: string | undefined) {
  if (valor === undefined) delete process.env["CLAVE_OPERADOR"];
  else process.env["CLAVE_OPERADOR"] = valor;
}

afterEach(() => con(undefined));

describe("cuándo la clave NO existe", () => {
  it("sin declarar, nada abre el panel", () => {
    con(undefined);
    assert.equal(hayClaveOperador(), false);
    assert.equal(esClaveDeOperador("lo que sea"), false);
    assert.equal(esClaveDeOperador(""), false);
  });

  it("DECLARADA Y VACÍA tampoco, que es el despiste peligroso", () => {
    /*
     * `CLAVE_OPERADOR=` en el panel de despliegue —una línea a medio rellenar— es
     * un descuido de treinta segundos. Sin esta regla, la comparación con la
     * cadena vacía cuadraría y el PRIMER campo enviado en blanco abriría el
     * panel: cualquiera que tocase «enviar» sin escribir nada entraría de
     * administrador. Un despiste de despliegue no puede ser una llave maestra.
     */
    con("");
    assert.equal(hayClaveOperador(), false);
    assert.equal(esClaveDeOperador(""), false);
  });

  it("y una clave corta se ignora ENTERA, no se acepta a medias", () => {
    // Por debajo del mínimo no es que sea débil: es que no existe. Aceptarla
    // «porque algo es mejor que nada» es exactamente al revés.
    con("corta");
    assert.equal(claveOperador(), null);
    assert.equal(esClaveDeOperador("corta"), false);
  });

  it("los espacios de los lados no cuentan como longitud", () => {
    // Copiar y pegar en un panel de despliegue arrastra espacios. `   x   ` no
    // es una clave de nueve caracteres.
    con("   corta   ");
    assert.equal(claveOperador(), null);
  });
});

describe("cuándo sí", () => {
  it("la clave exacta abre", () => {
    con(CLAVE);
    assert.equal(esClaveDeOperador(CLAVE), true);
  });

  it("y nada más", () => {
    con(CLAVE);
    for (const casi of [
      CLAVE.slice(0, -1), // le falta el último
      CLAVE + "x", // le sobra uno
      CLAVE.toUpperCase(), // distingue mayúsculas
      CLAVE.replace("-", "_"),
      "",
      null,
      undefined,
    ]) {
      assert.equal(esClaveDeOperador(casi), false, `ha colado: ${JSON.stringify(casi)}`);
    }
  });

  it("un prefijo correcto NO vale, por largo que sea", () => {
    // El fallo clásico de comparar con `startsWith` para «ser tolerantes».
    con(CLAVE);
    assert.equal(esClaveDeOperador(CLAVE.slice(0, CLAVE.length - 1)), false);
  });

  it("la clave con espacios alrededor es la misma clave", () => {
    // Se recorta al leerla del entorno; lo que escribe el usuario lo recorta la
    // ruta antes de comparar. Si no, una clave pegada con un salto de línea en el
    // panel de despliegue no abriría nunca y nadie sabría por qué.
    con(`  ${CLAVE}  `);
    assert.equal(esClaveDeOperador(CLAVE), true);
  });

  it("comparar dos longitudes distintas no revienta", () => {
    /*
     * `timingSafeEqual` LANZA si los búferes miden distinto, y esa excepción
     * sería justo la filtración que la comparación en tiempo constante existe
     * para evitar: un 500 con una longitud y un 200 con otra dice cuánto mide la
     * clave. Aquí se comprueba que devuelve `false` en vez de estallar.
     */
    con(CLAVE);
    assert.doesNotThrow(() => esClaveDeOperador("x"));
    assert.equal(esClaveDeOperador("x"), false);
    assert.doesNotThrow(() => esClaveDeOperador("x".repeat(500)));
    assert.equal(esClaveDeOperador("x".repeat(500)), false);
  });

  it("no se cachea: borrar la variable cierra la puerta en el acto", () => {
    // Si se leyera una sola vez al importar el módulo, quitar la clave de un
    // despliegue comprometido no surtiría efecto hasta reiniciar el proceso.
    con(CLAVE);
    assert.equal(esClaveDeOperador(CLAVE), true);
    con(undefined);
    assert.equal(esClaveDeOperador(CLAVE), false);
  });
});
