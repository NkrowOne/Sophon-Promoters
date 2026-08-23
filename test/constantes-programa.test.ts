import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CPA_SOPHON_MICROS,
  CPS_AL_OPERADOR_BPS,
  CPS_WEBMASTER_BPS,
} from "../lib/devengo/reparto.ts";
import { CPA_MAXIMO_MICROS, CPS_MAXIMO_BPS } from "../lib/devengo/motor.ts";

/**
 * Las cifras del programa son UNA, no una por módulo.
 *
 * Estaban escritas en tres sitios con tres nombres: el tope del motor, el
 * descuento de la tabla de precios y el reparto. Tres definiciones del mismo
 * número es una que se queda vieja sin que nadie lo note —el formulario de
 * tarifas validando contra el descuento viejo mientras la tabla de precios ya
 * pinta el nuevo, y las dos pantallas diciendo cosas distintas con la misma
 * cara de certeza—.
 *
 * `precios/tabla.ts` no se importa aquí porque arrastra el cliente de Sophon y
 * esta prueba se caería al cargarlo; sus dos constantes son asignaciones
 * directas de las de abajo, y eso lo garantiza el tipo, no una aserción.
 */

describe("las cifras del programa no se duplican", () => {
  it("el tope del motor es el descuento por usuario", () => {
    // Ceder al agente más de lo que entra por ese registro es pagar de más, así
    // que el tope de la tarifa y el ingreso del Operador son el mismo número.
    assert.equal(CPA_MAXIMO_MICROS, CPA_SOPHON_MICROS);
  });

  it("el tope del CPS son los puntos que llegan al Operador", () => {
    assert.equal(CPS_MAXIMO_BPS, CPS_AL_OPERADOR_BPS);
  });
});

describe("los valores del programa, fijados", () => {
  /*
   * Comprobados contra el programa de socios el 2026-08-23. No son constantes
   * de código: son condiciones de un contrato, y si cambian hay que cambiarlas
   * aquí a mano. Esta prueba existe para que ese cambio sea deliberado y no un
   * dedazo, y para que quede la fecha de la última comprobación.
   */
  it("seis céntimos por usuario registrado no llegan al webmaster", () => {
    assert.equal(CPA_SOPHON_MICROS, 60_000n);
  });

  it("de cada compra de PRO: 35 % al webmaster y 15 % a la cuenta del Operador", () => {
    assert.equal(CPS_WEBMASTER_BPS, 3_500);
    assert.equal(CPS_AL_OPERADOR_BPS, 1_500);
    // El resto se lo queda Sophon: la mitad.
    assert.equal(10_000 - CPS_WEBMASTER_BPS - CPS_AL_OPERADOR_BPS, 5_000);
  });
});
