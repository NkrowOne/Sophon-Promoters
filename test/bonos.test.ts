import { test } from "node:test";
import assert from "node:assert/strict";

import {
  escalonAlcanzado,
  motivoEscaleraInvalida,
  planificarBonos,
  siguienteEscalon,
  type ContextoBono,
  type Escalon,
} from "../lib/devengo/bonos.ts";
import { microsDesdeCadena } from "../lib/devengo/dinero.ts";

/**
 * El bono mensual por hitos.
 *
 * Mueve dinero y su regla central —«no son acumulables»— es fácil de implementar
 * mal de una forma que solo se nota al final de mes, cuando ya se ha pagado de
 * más. Por eso se prueba la regla entera aquí, sin base de datos.
 */

/** La escalera pedida: 10.000 → 50 $, 20.000 → 100 $, 30.000 → 150 $. */
const ESCALERA: Escalon[] = [
  { id: "e10", usuarios: 10_000, recompensaMicros: microsDesdeCadena("50") },
  { id: "e20", usuarios: 20_000, recompensaMicros: microsDesdeCadena("100") },
  { id: "e30", usuarios: 30_000, recompensaMicros: microsDesdeCadena("150") },
];

function ctx(sobre: Partial<ContextoBono> = {}): ContextoBono {
  return {
    registrosDelMes: 0,
    escalones: ESCALERA,
    asentadoMicros: 0n,
    secuencia: 0,
    agenteId: "ag-1",
    mes: "2026-07",
    fechaDevengo: "2026-07-25",
    ...sobre,
  };
}

test("por debajo del primer escalón no se asienta nada", () => {
  assert.deepEqual(planificarBonos(ctx({ registrosDelMes: 9_999 })), []);
});

test("al cruzar el primer hito se asienta su recompensa", () => {
  const [a] = planificarBonos(ctx({ registrosDelMes: 10_000 }));
  assert.equal(a?.importeMicros, microsDesdeCadena("50"));
  assert.equal(a?.bonoEscalonId, "e10");
});

test("NO ACUMULABLE: llegar al último escalón paga su recompensa, no la suma", () => {
  // Si fuera acumulable saldrían 300 $ (50+100+150). La regla dice 150.
  const [a] = planificarBonos(ctx({ registrosDelMes: 31_000 }));
  assert.equal(a?.importeMicros, microsDesdeCadena("150"));
  assert.equal(a?.bonoEscalonId, "e30");
});

test("NO ACUMULABLE: subir de escalón asienta solo la diferencia", () => {
  // Ya cobró los 50 del primer hito y ahora alcanza el tercero.
  const [a] = planificarBonos(
    ctx({ registrosDelMes: 30_000, asentadoMicros: microsDesdeCadena("50"), secuencia: 1 }),
  );
  assert.equal(a?.importeMicros, microsDesdeCadena("100"), "150 − 50 ya pagados");

  // Y el total del mes acaba siendo exactamente el del escalón más alto.
  const total = microsDesdeCadena("50") + a!.importeMicros;
  assert.equal(total, microsDesdeCadena("150"));
});

test("recalcular un mes que no ha cambiado no vuelve a pagar", () => {
  const sinCambios = ctx({
    registrosDelMes: 22_000,
    asentadoMicros: microsDesdeCadena("100"),
    secuencia: 1,
  });
  assert.deepEqual(planificarBonos(sinCambios), [], "es la idempotencia del barrido");
});

test("NUNCA RECLAMA: caer por debajo de un hito ya cobrado no emite nada negativo", () => {
  // Sophon revisa a la baja y el agente pasa de 20.100 a 19.900 registros: el
  // objetivo baja a 50 $ y ya tiene 100 $ asentados. No se le quita nada.
  const revisado = ctx({
    registrosDelMes: 19_900,
    asentadoMicros: microsDesdeCadena("100"),
    secuencia: 1,
  });
  assert.deepEqual(planificarBonos(revisado), []);
});

test("la clave de idempotencia lleva agente, mes y secuencia, y no choca con el motor", () => {
  const [a] = planificarBonos(ctx({ registrosDelMes: 10_000 }));
  assert.equal(a?.claveIdempotencia, "bono:ag-1:2026-07:0");

  const [b] = planificarBonos(
    ctx({ registrosDelMes: 30_000, asentadoMicros: microsDesdeCadena("50"), secuencia: 1 }),
  );
  assert.equal(b?.claveIdempotencia, "bono:ag-1:2026-07:1");
  assert.notEqual(a?.claveIdempotencia, b?.claveIdempotencia);

  // El motor construye `webmasterId:fecha:sufijo:N`; el prefijo `bono:` lo saca
  // de ese espacio de nombres, y la clave es `@unique` GLOBAL.
  assert.ok(a?.claveIdempotencia.startsWith("bono:"));
});

test("el mes forma parte de la clave, así que el mes siguiente vuelve a pagar", () => {
  const julio = planificarBonos(ctx({ registrosDelMes: 10_000, mes: "2026-07" }))[0];
  // Agosto empieza de cero: asentado 0 porque el contador se resetea.
  const agosto = planificarBonos(
    ctx({ registrosDelMes: 10_000, mes: "2026-08", fechaDevengo: "2026-08-14" }),
  )[0];
  assert.equal(agosto?.importeMicros, microsDesdeCadena("50"));
  assert.notEqual(julio?.claveIdempotencia, agosto?.claveIdempotencia);
});

test("el escalón se busca por el más alto alcanzado, venga como venga ordenado", () => {
  const desordenada = [ESCALERA[2]!, ESCALERA[0]!, ESCALERA[1]!];
  assert.equal(escalonAlcanzado(25_000, desordenada)?.id, "e20");
  assert.equal(escalonAlcanzado(9_000, desordenada), null);
  assert.equal(escalonAlcanzado(1_000_000, desordenada)?.id, "e30");
});

test("el siguiente escalón es el más bajo aún no alcanzado", () => {
  assert.equal(siguienteEscalon(0, ESCALERA)?.usuarios, 10_000);
  assert.equal(siguienteEscalon(10_000, ESCALERA)?.usuarios, 20_000);
  assert.equal(siguienteEscalon(30_000, ESCALERA), null, "ya no queda nada por delante");
});

test("una escalera cuya recompensa no crece se rechaza al configurarla", () => {
  const mala: Escalon[] = [
    { id: "a", usuarios: 10_000, recompensaMicros: microsDesdeCadena("100") },
    { id: "b", usuarios: 20_000, recompensaMicros: microsDesdeCadena("60") },
  ];
  const motivo = motivoEscaleraInvalida(mala);
  assert.ok(motivo?.includes("crecer"), motivo ?? "debería rechazarse");

  // Y el porqué: con ella, subir de escalón daría un delta NEGATIVO, o sea un
  // asiento que le quita dinero al agente por haber traído más registros.
  const [a] = planificarBonos(
    ctx({ registrosDelMes: 20_000, escalones: mala, asentadoMicros: microsDesdeCadena("100") }),
  );
  assert.equal(a, undefined, "el guardián de arriba impide llegar aquí, pero aun así no reclama");
});

test("una escalera vacía o con valores imposibles se rechaza", () => {
  assert.ok(motivoEscaleraInvalida([]));
  assert.ok(
    motivoEscaleraInvalida([{ id: "x", usuarios: 0, recompensaMicros: microsDesdeCadena("50") }]),
  );
  assert.ok(motivoEscaleraInvalida([{ id: "x", usuarios: 100, recompensaMicros: 0n }]));
});

test("la escalera pedida es válida", () => {
  assert.equal(motivoEscaleraInvalida(ESCALERA), null);
});
