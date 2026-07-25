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
