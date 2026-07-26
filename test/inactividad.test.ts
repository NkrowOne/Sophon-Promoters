import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DIAS_PARA_AVISAR,
  diasSinActividad,
  estaApagado,
} from "../lib/red/inactividad.ts";

/**
 * Cuándo se considera que un webmaster se ha apagado.
 *
 * Esta cuenta tiene DOS lectores —la Malla, que la pinta, y el aviso diario del
 * bot, que la manda por Telegram— y estaba escrita a mano dentro de una ruta.
 * El proyecto ya se quemó con un umbral duplicado: el de los 30 días del PRO
 * vivía por triplicado y bastaba con cambiar dos de las tres copias para que la
 * pantalla y el servidor contaran historias distintas.
 *
 * Aquí eso sería peor que una incoherencia visual: si la Malla dice «14 días
 * parado» y el bot no avisa hasta los 21, el agente deja de creerse los dos
 * canales y el aviso pierde su única razón de existir.
 */

const HOY = "2026-07-26";
const dia = (atras: number) => new Date(Date.parse(`${HOY}T00:00:00Z`) - atras * 86_400_000);

/** Como llegan de la consulta: de más reciente a más antigua. */
const filas = (...pares: [atras: number, registros: number][]) =>
  pares.map(([atras, countRegister]) => ({ fecha: dia(atras), countRegister }));

describe("diasSinActividad", () => {
  it("cuenta desde el último día CON registros, no desde la última fila", () => {
    // Las filas de los días en blanco existen igual: contar desde la fila más
    // reciente daría siempre cero y nadie estaría nunca parado.
    assert.equal(diasSinActividad(filas([0, 0], [1, 0], [9, 4], [30, 2]), HOY), 9);
  });

  it("da 0 si ha traído algo hoy", () => {
    assert.equal(diasSinActividad(filas([0, 7]), HOY), 0);
  });

  it("da null si NUNCA ha traído un registro", () => {
    // Y esto no es lo mismo que «lleva mucho parado»: un webmaster recién
    // activado que aún no ha traído nada está empezando, no apagado. Contarlo
    // como inactividad haría que cada alta generase un aviso al día siguiente,
    // que es la forma más rápida de que el agente silencie el bot.
    assert.equal(diasSinActividad(filas([0, 0], [1, 0], [2, 0]), HOY), null);
    assert.equal(diasSinActividad([], HOY), null);
  });
});

describe("estaApagado", () => {
  it("no avisa por debajo del umbral", () => {
    assert.equal(estaApagado(0), false);
    assert.equal(estaApagado(DIAS_PARA_AVISAR - 1), false);
  });

  it("avisa a partir del umbral, incluido", () => {
    assert.equal(estaApagado(DIAS_PARA_AVISAR), true);
    assert.equal(estaApagado(DIAS_PARA_AVISAR + 40), true);
  });

  it("nunca avisa por quien no ha traído nada todavía", () => {
    assert.equal(estaApagado(null), false);
  });

  it("el umbral está entre una semana y un mes", () => {
    // Fija la decisión, no el número: por debajo de dos semanas el aviso sería
    // ruido semanal sobre tráfico normalmente irregular; por encima del mes ya
    // no se recupera a nadie porque el webmaster se ha ido a otro programa.
    assert.ok(DIAS_PARA_AVISAR > 7 && DIAS_PARA_AVISAR < 30);
  });
});
