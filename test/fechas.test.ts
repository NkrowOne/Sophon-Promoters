import { test } from "node:test";
import assert from "node:assert/strict";

import {
  diaDelMes,
  diasDelMes,
  diasQueQuedanDelMes,
  ZONA_POR_DEFECTO,
  inicioDeMes,
  inicioDelDiaContable,
  inicioDelMesSiguiente,
  mesAnterior,
  mesDe,
} from "../lib/fechas.ts";

/**
 * Los días del mes, que son el denominador del ritmo del bono.
 *
 * Se prueban porque una cuenta de días mal hecha no falla: devuelve un número
 * plausible. Un ritmo dividido entre 30 en un mes de 31 sale un 3 % alto todos
 * los días de ese mes y nadie lo nota nunca; en febrero sale un 7 % bajo. Y de
 * ahí sale la proyección de cierre, que es la cifra que el agente usa para
 * decidir si le merece la pena empujar.
 */

test("los días del mes salen del calendario, no de una tabla", () => {
  assert.equal(diasDelMes("2026-01"), 31);
  assert.equal(diasDelMes("2026-04"), 30);
  assert.equal(diasDelMes("2026-12"), 31);
  // Diciembre es el que rompe cualquier implementación que sume uno al mes sin
  // mirar el año.
  assert.equal(inicioDelMesSiguiente("2026-12").toISOString(), "2027-01-01T00:00:00.000Z");
});

test("los bisiestos no se declaran: se restan", () => {
  assert.equal(diasDelMes("2024-02"), 29);
  assert.equal(diasDelMes("2026-02"), 28);
  // 2100 no es bisiesto pese a ser divisible por cuatro. Una regla escrita a
  // mano se deja esto; la resta de dos instantes no.
  assert.equal(diasDelMes("2100-02"), 28);
  assert.equal(diasDelMes("2000-02"), 29);
});

test("el día del mes cuenta desde uno, que es como se cuenta el trabajo", () => {
  assert.equal(diaDelMes("2026-07-01"), 1);
  assert.equal(diaDelMes("2026-07-26"), 26);
  // El denominador del ritmo incluye el día en curso: a media mañana del 4 se
  // llevan cuatro días trabajando, no tres. Dividir entre los días ya cerrados
  // exageraría el ritmo cada mañana y lo corregiría cada noche.
  assert.equal(diaDelMes("2026-07-31"), 31);
});

test("los días que quedan incluyen hoy y nunca llegan a cero", () => {
  assert.equal(diasQueQuedanDelMes("2026-07-26"), 6);
  assert.equal(diasQueQuedanDelMes("2026-07-01"), 31);
  // El último día del mes queda UNO —hoy—, no cero: mientras el mes esté
  // abierto todavía se pueden sumar registros, y un contador a cero un día que
  // aún cuenta diría lo contrario.
  assert.equal(diasQueQuedanDelMes("2026-07-31"), 1);
  assert.equal(diasQueQuedanDelMes("2026-02-28"), 1);
  assert.equal(diasQueQuedanDelMes("2024-02-28"), 2);
});

test("el mes de una fecha y el mes anterior cruzan el año sin ayuda", () => {
  assert.equal(mesDe("2026-07-26"), "2026-07");
  assert.equal(mesAnterior("2026-01"), "2025-12");
  assert.equal(mesAnterior("2026-07"), "2026-06");
  assert.equal(inicioDeMes("2026-07").toISOString(), "2026-07-01T00:00:00.000Z");
});

/**
 * Cruzar la mitad del camino es una TRANSICIÓN, y por eso se detecta con dos
 * lecturas.
 *
 * Es la aritmética que decide si el bot empuja hacia el bono. Mirar solo si se
 * está por encima del 50 % mandaría el mismo mensaje todos los días desde que se
 * cruza hasta que se alcanza el escalón, y eso es lo que hace que alguien
 * silencie un bot.
 */
test("la mitad del camino se cruza una vez, no todos los días", () => {
  // Escalones 10.000 y 20.000: la mitad del segundo tramo está en 15.000.
  const mitad = (anterior: number, siguiente: number) => anterior + (siguiente - anterior) / 2;
  const cruza = (ayer: number, hoy: number, m: number) => ayer < m && hoy >= m;

  const m = mitad(10_000, 20_000);
  assert.equal(m, 15_000);

  assert.equal(cruza(14_900, 15_100, m), true, "el día que se cruza, avisa");
  assert.equal(cruza(15_100, 15_400, m), false, "al día siguiente ya no");
  assert.equal(cruza(15_000, 15_200, m), false, "ni el siguiente al exacto");
  assert.equal(cruza(14_000, 14_900, m), false, "antes de cruzar tampoco");
  // Justo en el umbral: se avisa, porque la comparación de hoy es `>=`.
  assert.equal(cruza(14_999, 15_000, m), true);

  // Y el primer tramo arranca en cero, no en el escalón anterior inexistente.
  assert.equal(mitad(0, 10_000), 5_000);
});

/**
 * El día contable es el de Sophon, y por eso es UTC+8.
 *
 * Sophon cierra su día a las 00:00 UTC+8 y publica entonces los contadores del
 * anterior. Cortar el día en otro sitio hacía que «hoy» significara cosas
 * distintas a cada lado del cable durante ocho horas.
 */
test("el día contable por defecto es el de Sophon", () => {
  assert.equal(ZONA_POR_DEFECTO, "Asia/Shanghai", "es UTC+8, que es donde cierra Sophon");
});

test("el día contable empieza a las 16:00 UTC del día anterior", () => {
  // 00:00 en UTC+8 son las 16:00 UTC del día de antes. Es exactamente el
  // instante del cierre de Sophon, y por eso el barrido se programa a las 16:05.
  assert.equal(
    inicioDelDiaContable("2026-07-26").toISOString(),
    "2026-07-25T16:00:00.000Z",
  );
  // Cruzando el año, que es donde fallan las implementaciones a mano.
  assert.equal(
    inicioDelDiaContable("2026-01-01").toISOString(),
    "2025-12-31T16:00:00.000Z",
  );
});

/**
 * El defecto que este cambio agrava, fijado para que no vuelva.
 *
 * El cerrojo diario de los avisos comparaba una fecha calculada en la zona
 * contable contra `` `${fecha}T00:00:00Z` ``, o sea la medianoche UTC: dos
 * relojes distintos tratados como el mismo. Con Madrid el hueco eran una o dos
 * horas y ya duplicaba mensajes; con UTC+8 son OCHO, y en ellas la comparación
 * mira un instante futuro y el cerrojo no cierra nunca.
 */
test("la medianoche UTC NO sirve como frontera del día contable", () => {
  const contable = inicioDelDiaContable("2026-07-26").getTime();
  const utc = Date.parse("2026-07-26T00:00:00Z");

  assert.notEqual(contable, utc, "confundirlas es el defecto que se arregla");
  assert.equal((utc - contable) / 3_600_000, 8, "ocho horas de desfase");

  // Y el sentido importa: la medianoche UTC va POR DELANTE, así que a las 02:00
  // UTC+8 de hoy `iniciadaEn >= medianocheUTC` no encuentra la ejecución que
  // acaba de terminar. Por eso el cerrojo dejaba pasar mensajes repetidos.
  assert.ok(utc > contable);
});
