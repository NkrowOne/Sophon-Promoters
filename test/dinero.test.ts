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
import { LOCALES, type Idioma } from "../lib/idiomas.ts";

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

/*
 * El formato por idioma.
 *
 * El defecto que fijan estas pruebas se veía en pantalla: la portada árabe
 * pintaba los RECUENTOS con `toLocaleString` —«21,840»— y justo debajo el DINERO
 * con la convención española —«2.147,39 $»—, dos sistemas numéricos a un
 * centímetro. En inglés era peor que feo: «2.147,39 $» son dos dólares y pico.
 *
 * Los separadores tienen que ser los MISMOS que usa el catálogo de `lib/i18n.ts`
 * para los recuentos, así que se comprueban contra `toLocaleString` con el
 * mismo locale y no contra literales copiados a mano.
 */
test("cada idioma usa sus separadores, y son los del catálogo", () => {
  // 2.147,39 $ en español; el mismo importe, no el mismo texto.
  const importe = 2_147_390_000n;

  assert.equal(formatearMicros(importe, 2, "es"), "2.147,39 $");
  assert.equal(formatearMicros(importe, 2, "it"), "2.147,39 $");
  // Millares con coma y decimal con punto: es la corrección que motiva todo esto.
  assert.equal(formatearMicros(importe, 2, "en"), "2,147.39 $");
  /*
   * El árabe escribe el dinero en cifras occidentales —es lo que el agente ve en
   * su cartera de criptomonedas—, y con `ar` a secas agrupa como el inglés. Por
   * eso el catálogo usa `ar` y no `ar-EG`, que numeraría «٢٬١٤٧».
   */
  assert.equal(formatearMicros(importe, 2, "ar"), "2,147.39 $");
  assert.match(formatearMicros(importe, 2, "ar"), /^[\d.,]+ \$$/);
  /*
   * El portugués europeo NO agrupa con punto: separa los millares con espacio
   * duro. Aquí es donde se ve que copiar la convención española «coincidía por
   * casualidad» solo en italiano.
   */
  assert.equal(formatearMicros(importe, 2, "pt"), "2 147,39 $");

  /*
   * La comprobación que importa: en la MISMA pantalla, el dinero y el recuento
   * separan igual. Se usa 21.840 porque es la cifra de la captura árabe donde se
   * vieron las dos convenciones juntas, y porque `es-ES` e `it-IT` no agrupan
   * los números de cuatro dígitos: con 2.147 el recuento diría «2147» y aquí no
   * se estaría comparando nada.
   */
  const grande = 21_840_000_000n;
  for (const [idioma, locale] of Object.entries(LOCALES)) {
    const recuento = (21840).toLocaleString(locale);
    const dinero = formatearMicros(grande, 2, idioma as Idioma);
    assert.equal(dinero.slice(0, recuento.length), recuento, `millares en ${idioma}`);
    assert.equal(
      dinero.slice(recuento.length, recuento.length + 1),
      (0.5).toLocaleString(locale).slice(1, 2),
      `decimal en ${idioma}`,
    );
  }
});

test("sin idioma se formatea en español: el panel del Operador no se traduce", () => {
  assert.equal(formatearMicros(55_842_050_000n), formatearMicros(55_842_050_000n, 2, "es"));
  assert.equal(formatearMicros(225_000n, 4), formatearMicros(225_000n, 4, "es"));
});

test("el idioma no toca la aritmética: mismos dígitos en los cinco", () => {
  // Lo que cambia es el separador, no la cifra. Si algún idioma pasara por
  // coma flotante, este importe —trece dígitos significativos— lo delataría.
  const importe = microsDesdeCadena("1234567890.123456");
  const soloDigitos = (s: string) => s.replace(/\D/g, "");
  for (const idioma of ["es", "en", "it", "pt", "ar"] as const) {
    assert.equal(soloDigitos(formatearMicros(importe, 2, idioma)), "123456789012");
    assert.equal(soloDigitos(formatearMicros(importe, 4, idioma)), "12345678901235");
    assert.equal(soloDigitos(formatearMicros(-importe, 2, idioma)), "123456789012");
    assert.ok(formatearMicros(-importe, 2, idioma).startsWith("−"));
  }
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
  // L1 (total) 50 %, L2 (webmaster) 35 %, Operador 15 %.
  const pago = microsDesdeCadena("9.99");
  const total = aplicarBps(pago, bpsDesdePorcentaje(50)).importe;
  const webmaster = aplicarBps(pago, bpsDesdePorcentaje(35)).importe;
  const Operador = total - webmaster;
  assert.equal(formatearMicros(total), "5,00 $");
  assert.equal(formatearMicros(webmaster), "3,50 $");
  assert.equal(formatearMicros(Operador), "1,50 $");
  // El 15 % directo debe coincidir con la diferencia: sin esto el ledger no cuadra.
  assert.equal(Operador, aplicarBps(pago, bpsDesdePorcentaje(15)).importe);
});
