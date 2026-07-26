import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  claveIdempotencia,
  formatearCodigo,
  generarCodigoActivacion,
  generarOtp,
  hashOtp,
  normalizarCodigo,
  normalizarEmail,
  verificarOtp,
} from "../lib/cripto.ts";
import {
  CODIGOS_MEMBRESIA,
  PLAN_UNICO,
  SEGUNDOS_UN_ANIO,
} from "../lib/sophon/tipos.ts";

describe("códigos de activación", () => {
  /**
   * La regresión que estos tests cierran era invisible por partes.
   *
   * `generarCodigoActivacion` devolvía «MR7MD-APD6R» y el bot lo guardaba con
   * el guion, pero las rutas de alta buscan por `normalizarCodigo`, que lo
   * quita. Cada mitad era correcta; juntas hacían que NINGÚN código generado
   * pudiera canjearse. Lo destapó la prueba de extremo a extremo, y esto lo
   * deja atrapado aquí para siempre.
   */
  it("lo generado ya está en forma canónica", () => {
    for (let i = 0; i < 200; i++) {
      const codigo = generarCodigoActivacion();
      assert.equal(
        codigo,
        normalizarCodigo(codigo),
        `un código guardado tal cual debe poder buscarse normalizado: ${codigo}`,
      );
    }
  });

  it("el alfabeto no tiene caracteres que se confundan al dictarlos", () => {
    const prohibidos = /[01OIL]/;
    for (let i = 0; i < 200; i++) {
      assert.ok(!prohibidos.test(generarCodigoActivacion()), "sin 0, 1, O, I ni L");
    }
  });

  it("normalizar es idempotente y admite lo que teclee el agente", () => {
    const canonico = "MR7MDAPD6R";
    for (const escrito of [
      "MR7MDAPD6R",
      "mr7mdapd6r",
      "MR7MD-APD6R",
      "  MR7MD APD6R  ",
      "mr7md-apd6r\n",
    ]) {
      assert.equal(normalizarCodigo(escrito), canonico, `debía normalizar «${escrito}»`);
    }
    assert.equal(normalizarCodigo(canonico), normalizarCodigo(normalizarCodigo(canonico)));
  });

  it("formatear es solo presentación: normalizar lo deshace", () => {
    const codigo = generarCodigoActivacion();
    const bonito = formatearCodigo(codigo);
    assert.ok(bonito.includes("-"), "se dicta en grupos");
    assert.equal(normalizarCodigo(bonito), codigo);
  });
});

describe("OTP", () => {
  /*
   * La pimienta vive en el entorno a propósito —quien se lleve un volcado de la
   * tabla no puede probar seis dígitos contra ella— y eso significa que sin
   * variable de entorno `hashOtp` lanza. Estos dos casos llevaban fallando desde
   * que se escribieron, y no por lo que comprueban: `npm test` daba 2 en rojo y
   * el resultado se leía como ruido de fondo en vez de como una puerta.
   *
   * El valor es arbitrario porque lo que se verifica es que el hash quede atado
   * al correo, no cuál sea la pimienta.
   */
  process.env["PIMIENTA_OTP"] ??= "pimienta-de-prueba";

  it("son seis dígitos", () => {
    for (let i = 0; i < 100; i++) assert.match(generarOtp(), /^\d{6}$/);
  });

  it("el hash va ligado al correo, así que no vale para otro", () => {
    const codigo = "424242";
    const hash = hashOtp(codigo, "uno@example.com");
    assert.ok(verificarOtp(codigo, "uno@example.com", hash));
    assert.ok(
      !verificarOtp(codigo, "otro@example.com", hash),
      "un OTP interceptado no puede canjearse contra otra cuenta",
    );
    assert.ok(!verificarOtp("424243", "uno@example.com", hash));
  });

  it("verificar no revienta con un hash corrupto", () => {
    assert.doesNotThrow(() => verificarOtp("424242", "uno@example.com", "no-es-un-hash"));
    assert.equal(verificarOtp("424242", "uno@example.com", "no-es-un-hash"), false);
  });
});

describe("normalización de correo", () => {
  it("es el candado de atribución, así que no distingue mayúsculas", () => {
    assert.equal(normalizarEmail("  Nkrowone+2@Gmail.COM "), "nkrowone+2@gmail.com");
  });
});

describe("claves de idempotencia", () => {
  it("las mismas partes dan la misma clave y otras partes dan otra", () => {
    assert.equal(claveIdempotencia("a", 1, "b"), claveIdempotencia("a", 1, "b"));
    assert.notEqual(claveIdempotencia("a", 1, "b"), claveIdempotencia("a", 2, "b"));
  });

  it("no se puede fabricar una colisión moviendo el separador entre partes", () => {
    // Si la clave fuera una concatenación sin separador, ("ab","c") y ("a","bc")
    // colisionarían, y dos acciones distintas compartirían idempotencia: la
    // segunda se descartaría como repetida y el agente perdería una concesión.
    assert.notEqual(claveIdempotencia("ab", "c"), claveIdempotencia("a", "bc"));
  });
});

describe("duración del PRO", () => {
  /**
   * La trampa que hizo que «1 año» concediera 30 días.
   *
   * `membership_code` nombra el plan y `duration` fija el plazo, y son
   * independientes: la documentación de Sophon dice literalmente
   * «0 = defaults to 30 days». El cliente mandaba 0 siempre, así que los cuatro
   * planes que ofrecía la aplicación concedían todos un mes.
   *
   * Nada de esto lo puede ver un typecheck: el código compilaba y la llamada
   * era válida. Lo único que lo sostiene es esta invariante escrita.
   */
  it("un año son 365 días en segundos, y nunca cero", () => {
    assert.equal(SEGUNDOS_UN_ANIO, 365 * 86_400);
    assert.equal(SEGUNDOS_UN_ANIO, 31_536_000);
    assert.notEqual(SEGUNDOS_UN_ANIO, 0, "un 0 aquí son 30 días, no un año");
    assert.notEqual(SEGUNDOS_UN_ANIO, 2_592_000, "2 592 000 s son los 30 días por defecto");
  });

  it("la aplicación concede un solo plan y es el anual", () => {
    assert.equal(PLAN_UNICO, "vip.year");
    assert.ok(
      (CODIGOS_MEMBRESIA as readonly string[]).includes(PLAN_UNICO),
      "el plan tiene que seguir siendo un código válido de la API",
    );
  });
});
