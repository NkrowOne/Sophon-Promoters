import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { tarifaParaAgente } from "../lib/devengo/tarifa-agente.ts";

/**
 * La tarifa que se le aplica a un agente concreto.
 *
 * Se prueba porque el motor se pasó la vida ignorando las condiciones propias:
 * el esquema las guardaba, la ficha del agente las anunciaba en negrita, y el
 * libro pagaba la tarifa general. Nadie lo vio hasta cuadrar el reparto del
 * panel con lo devengado.
 */

const GENERAL = { id: "v1", cpaPorRegistroMicros: 30_000n, cpsBps: 500n };

describe("la tarifa de un agente", () => {
  it("sin condiciones propias es la general, tal cual", () => {
    assert.deepEqual(tarifaParaAgente(GENERAL, null), GENERAL);
    assert.deepEqual(
      tarifaParaAgente(GENERAL, { cpaPorRegistroMicros: null, cpsBps: null }),
      GENERAL,
    );
  });

  it("pisa SOLO el campo pactado y deja el otro en la general", () => {
    // Los dos campos son independientes: CPA propio con CPS general es válido.
    const soloCpa = tarifaParaAgente(GENERAL, { cpaPorRegistroMicros: 40_000n, cpsBps: null });
    assert.equal(soloCpa?.cpaPorRegistroMicros, 40_000n);
    assert.equal(soloCpa?.cpsBps, 500n);

    const soloCps = tarifaParaAgente(GENERAL, { cpaPorRegistroMicros: null, cpsBps: 700 });
    assert.equal(soloCps?.cpaPorRegistroMicros, 30_000n);
    assert.equal(soloCps?.cpsBps, 700n);
  });

  it("un CPS propio de cero es cero, no «sin pactar»", () => {
    /*
     * `?? ` sobre un 0 lo dejaría pasar como ausente y le pagaría la general.
     * Cero es una decisión: este agente no cobra porcentaje.
     */
    const t = tarifaParaAgente(GENERAL, { cpaPorRegistroMicros: 0n, cpsBps: 0 });
    assert.equal(t?.cpaPorRegistroMicros, 0n);
    assert.equal(t?.cpsBps, 0n);
  });

  it("conserva el id de la versión general: es lo que se congela en el asiento", () => {
    const t = tarifaParaAgente(GENERAL, { cpaPorRegistroMicros: 40_000n, cpsBps: 700 });
    assert.equal(t?.id, "v1");
  });

  it("sin tarifa general no devenga, aunque el agente tenga lo suyo", () => {
    // No hay versión en vigor que congelar, y un asiento sin ella no se audita.
    assert.equal(tarifaParaAgente(null, { cpaPorRegistroMicros: 40_000n, cpsBps: 700 }), null);
  });
});
