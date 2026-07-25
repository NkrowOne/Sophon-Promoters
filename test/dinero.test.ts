import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MICROS_POR_DOLAR,
  aplicarBps,
  absMicros,
  bpsDesdePorcentaje,
  formatearMicros,
  microsACadena,
  microsDesdeCadena,
  microsDesdeEntero,
  repartir,
  sumar,
} from "../lib/devengo/dinero.ts";

test("parsea los importes reales que devuelve Sophon", () => {
  assert.equal(microsDesdeCadena("55842.05"), 55_842_050_000n);
  assert.equal(microsDesdeCadena("0.225"), 225_000n);
  assert.equal(microsDesdeCadena("9.99"), 9_990_000n);
  assert.equal(microsDesdeCadena("0"), 0n);
  assert.equal(microsDesdeCadena("161756"), 161_756_000_000n);
});

test("trata como cero los vacíos que Sophon envía en todayRevenue", () => {
  assert.equal(microsDesdeCadena(""), 0n);
  assert.equal(microsDesdeCadena(null), 0n);
  assert.equal(microsDesdeCadena(undefined), 0n);
  assert.equal(microsDesdeCadena("  "), 0n);
});

test("acepta negativos y coma decimal", () => {
  assert.equal(microsDesdeCadena("-12.50"), -12_500_000n);
  assert.equal(microsDesdeCadena("3,75"), 3_750_000n);
  assert.equal(microsDesdeCadena(".5"), 500_000n);
});

test("trunca por debajo del micro en vez de redondear", () => {
  // Si redondease, la suma de las partes podría superar al total repartido.
  assert.equal(microsDesdeCadena("0.0000019"), 1n);
  assert.equal(microsDesdeCadena("1.9999999"), 1_999_999n);
});

test("rechaza lo que no es un número en lugar de degradar a cero", () => {
  assert.throws(() => microsDesdeCadena("abc"), /no numérico/);
  assert.throws(() => microsDesdeCadena("1.2.3"), /no numérico/);
  assert.throws(() => microsDesdeEntero(1.5), /entero/);
});

test("el viaje de ida y vuelta a cadena es exacto", () => {
  for (const v of ["0", "55842.05", "-12.5", "0.000001", "7926.86"]) {
    assert.equal(microsDesdeCadena(microsACadena(microsDesdeCadena(v))), microsDesdeCadena(v));
  }
});

test("formatea con la convención española", () => {
  assert.equal(formatearMicros(128_440_000n), "128,44 $");
  assert.equal(formatearMicros(55_842_050_000n), "55.842,05 $");
  assert.equal(formatearMicros(0n), "0,00 $");
  assert.equal(formatearMicros(-9_990_000n), "−9,99 $");
  assert.equal(formatearMicros(225_000n, 4), "0,2250 $");
});

test("aplicar un porcentaje arrastra el residuo y no pierde micros", () => {
  // 5 % de 9,99 $ = 0,4995 $ exacto; el caso interesante es el que no cae redondo.
  const cps = bpsDesdePorcentaje(5);
  const { importe } = aplicarBps(microsDesdeCadena("9.99"), cps);
  assert.equal(importe, 499_500n);

  // Sin arrastre, mil aplicaciones de 5 % sobre 0,033333 $ perderían micros.
  const base = microsDesdeCadena("0.033333");
  let residuo = 0n;
  let acumulado = 0n;
  for (let i = 0; i < 1000; i++) {
    const r = aplicarBps(base, cps, residuo);
    acumulado += r.importe;
    residuo = r.residuo;
  }
  const exacto = (base * cps * 1000n) / 10_000n;
  assert.equal(acumulado, exacto, "el arrastre debe recuperar todos los micros truncados");
});

test("el reparto suma exactamente el total, sin fugas", () => {
  // Reparto 50/35/15 del modelo de CPS sobre un importe que no divide bien.
  const total = microsDesdeCadena("9.99");
  const partes = repartir(total, [50n, 35n, 15n]);
  assert.equal(sumar(partes), total, "la suma de las partes debe ser el total");
  assert.equal(partes.length, 3);
});

test("el reparto también cuadra con importes negativos (reversos)", () => {
  const total = -microsDesdeCadena("9.99");
  const partes = repartir(total, [50n, 35n, 15n]);
  assert.equal(sumar(partes), total);
});

test("un peso cero no recibe nada del residuo", () => {
  const partes = repartir(microsDesdeCadena("1.00"), [1n, 0n, 2n]);
  assert.equal(partes[1], 0n);
  assert.equal(sumar(partes), MICROS_POR_DOLAR);
});

test("bps desde porcentaje cubre los del negocio", () => {
  assert.equal(bpsDesdePorcentaje(50), 5000n);
  assert.equal(bpsDesdePorcentaje(35), 3500n);
  assert.equal(bpsDesdePorcentaje(15), 1500n);
  assert.equal(bpsDesdePorcentaje(5), 500n);
  assert.equal(bpsDesdePorcentaje(2.5), 250n);
});

test("absMicros para comparar descuadres", () => {
  assert.equal(absMicros(-5n), 5n);
  assert.equal(absMicros(5n), 5n);
});

test("reproduce el reparto real observado en la API", () => {
  // Día 2026-07-24 de esgabrielcabrera: pago 9,99 $.
  // L1 (total) 50 %, L2 (webmaster) 35 %, superadmin 15 %.
  const pago = microsDesdeCadena("9.99");
  const total = aplicarBps(pago, bpsDesdePorcentaje(50)).importe;
  const webmaster = aplicarBps(pago, bpsDesdePorcentaje(35)).importe;
  const superadmin = total - webmaster;
  assert.equal(formatearMicros(total), "5,00 $");
  assert.equal(formatearMicros(webmaster), "3,50 $");
  assert.equal(formatearMicros(superadmin), "1,50 $");
  // El 15 % directo debe coincidir con la diferencia: sin esto el ledger no cuadra.
  assert.equal(superadmin, aplicarBps(pago, bpsDesdePorcentaje(15)).importe);
});
