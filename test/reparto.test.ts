import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CPA_SOPHON_MICROS,
  CPS_AL_OPERADOR_BPS,
  CPS_WEBMASTER_BPS,
  repartir,
  sumarPartes,
  totalParte,
  PARTE_CERO,
} from "../lib/devengo/reparto.ts";

/**
 * El reparto entre webmaster, agente y Operador.
 *
 * Se prueba porque el panel lo enseñaba MAL —lo del Operador como un residuo,
 * el porcentaje aplicado donde no toca— y porque es la aritmética con la que se
 * le contesta a un agente que reclama. Un error aquí no se ve: sale un número
 * con dos decimales y aspecto de estar bien.
 */

/** La tarifa de verdad de producción: 0,03 $ por registro y 5 % del PRO. */
const TARIFA = { cpaPorRegistroMicros: 30_000n, cpsBps: 500 };

describe("el reparto por registro", () => {
  it("parte el fijo de Sophon en dos: mitad agente, mitad Operador", () => {
    const r = repartir({ registros: 12, pagadoPorUsuariosMicros: 0n }, TARIFA);

    // 12 × 0,03 $ para cada uno.
    assert.equal(r.agente.registrosMicros, 360_000n);
    assert.equal(r.operador.registrosMicros, 360_000n);
    // Y las dos mitades suman exactamente lo que Sophon paga.
    assert.equal(
      r.agente.registrosMicros + r.operador.registrosMicros,
      CPA_SOPHON_MICROS * 12n,
    );
  });

  it("el webmaster NO cobra por registrar: solo por lo que compran sus usuarios", () => {
    const r = repartir({ registros: 500, pagadoPorUsuariosMicros: 0n }, TARIFA);
    assert.equal(r.webmaster.registrosMicros, 0n);
    assert.equal(totalParte(r.webmaster), 0n);
  });
});

describe("el reparto de las compras de PRO", () => {
  /*
   * Ésta es la confusión que trajo el módulo: el porcentaje va SOLO sobre
   * `paymentAmount` —lo que el usuario le paga a Sophon por el PRO— y nunca
   * sobre el fijo de los registros.
   */
  it("35 % webmaster, 5 % agente, 10 % Operador de lo que pagan los usuarios", () => {
    // 100,00 $ pagados por usuarios.
    const r = repartir({ registros: 0, pagadoPorUsuariosMicros: 100_000_000n }, TARIFA);

    assert.equal(r.webmaster.proMicros, 35_000_000n); // 35,00 $
    assert.equal(r.agente.proMicros, 5_000_000n); //  5,00 $
    assert.equal(r.operador.proMicros, 10_000_000n); // 10,00 $
  });

  it("lo del agente y lo del Operador salen de los 15 puntos que entran, no de más", () => {
    const r = repartir({ registros: 0, pagadoPorUsuariosMicros: 100_000_000n }, TARIFA);
    const alOperador = (100_000_000n * BigInt(CPS_AL_OPERADOR_BPS)) / 10_000n;
    assert.equal(r.agente.proMicros + r.operador.proMicros, alOperador);
  });

  it("lo del webmaster no pasa por la cuenta del Operador: va aparte", () => {
    const r = repartir({ registros: 0, pagadoPorUsuariosMicros: 100_000_000n }, TARIFA);
    const delWebmaster = (100_000_000n * BigInt(CPS_WEBMASTER_BPS)) / 10_000n;
    assert.equal(r.webmaster.proMicros, delWebmaster);
    // Y Sophon se queda el resto: 100 − 35 − 15 = 50.
    assert.equal(
      100_000_000n - r.webmaster.proMicros - r.agente.proMicros - r.operador.proMicros,
      50_000_000n,
    );
  });
});

describe("lo del Operador no es lo que sobra", () => {
  it("con el agente a cero, el Operador cobra su parte entera igual", () => {
    /*
     * Un webmaster sin agente: no hay nada pactado con nadie. Si la parte del
     * Operador fuera «lo que queda tras pagar al agente», seguiría saliendo el
     * total; lo que importa es que sale de SU tarifa, no de la ausencia de otra.
     */
    const r = repartir(
      { registros: 10, pagadoPorUsuariosMicros: 100_000_000n },
      { cpaPorRegistroMicros: 0n, cpsBps: 0 },
    );
    assert.equal(r.operador.registrosMicros, CPA_SOPHON_MICROS * 10n);
    assert.equal(r.operador.proMicros, 15_000_000n);
    assert.equal(totalParte(r.agente), 0n);
  });

  it("una tarifa por encima del tope sale NEGATIVA y no maquillada a cero", () => {
    /*
     * El formulario de tarifas lo impide, pero si alguna vez entrara por otra
     * puerta, esta pantalla es donde se tiene que ver. Un `max(0, …)` lo
     * escondería justo donde hay que mirarlo.
     */
    const r = repartir(
      { registros: 10, pagadoPorUsuariosMicros: 100_000_000n },
      { cpaPorRegistroMicros: 100_000n, cpsBps: 2_000 },
    );
    assert.ok(r.operador.registrosMicros < 0n);
    assert.ok(r.operador.proMicros < 0n);
  });
});

describe("sumar partes", () => {
  it("acumula por concepto y el total es la suma de los dos", () => {
    const a = repartir({ registros: 10, pagadoPorUsuariosMicros: 10_000_000n }, TARIFA);
    const b = repartir({ registros: 5, pagadoPorUsuariosMicros: 20_000_000n }, TARIFA);
    const suma = sumarPartes(a.agente, b.agente);

    assert.equal(suma.registrosMicros, 450_000n); // 15 × 0,03 $
    assert.equal(suma.proMicros, 1_500_000n); // 5 % de 30,00 $
    assert.equal(totalParte(suma), 1_950_000n);
    assert.equal(totalParte(sumarPartes(PARTE_CERO, suma)), totalParte(suma));
  });
});
