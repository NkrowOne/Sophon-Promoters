import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  DESCUENTO_POR_USUARIO_MICROS,
  USUARIOS_POR_BLOQUE,
  precioDelWebmaster,
  PORCENTAJE_WEBMASTER_BPS,
} from "../lib/precios/tabla.ts";
import { formatearMicros, microsDesdeCadena } from "../lib/devengo/dinero.ts";

/**
 * El descuento del precio del programa, que es la única aritmética de la
 * pantalla de precios y la que el agente va a repetirle a sus webmasters.
 *
 * Sophon publica el precio GLOBAL por usuario. De ahí salen seis céntimos que no
 * llegan al webmaster. Lo que se pinta es el resto, por cada 100 usuarios, que
 * es la unidad en la que el programa de socios anuncia sus tarifas.
 */

test("el precio del webmaster es el global menos seis céntimos, por cada 100", () => {
  // Los tres tiers de LV0 tal como los publica Sophon: 0,30 / 0,25 / 0,20 $ por
  // usuario. La tabla del programa los enseña como $30 / $25 / $20 por cada 100.
  assert.equal(formatearMicros(precioDelWebmaster("0.3")!), "24,00 $");
  assert.equal(formatearMicros(precioDelWebmaster("0.25")!), "19,00 $");
  assert.equal(formatearMicros(precioDelWebmaster("0.2")!), "14,00 $");

  // Y el de arriba del todo: T1 en LV6, 0,90 $ por usuario → $84 por cada 100.
  assert.equal(formatearMicros(precioDelWebmaster("0.9")!), "84,00 $");
});

test("el descuento es de seis céntimos por usuario, ni uno más", () => {
  // Se comprueba contra la definición y no contra un número copiado: si alguien
  // cambia la constante, esta prueba tiene que caer con las de arriba y no
  // adaptarse sola.
  assert.equal(DESCUENTO_POR_USUARIO_MICROS, 60_000n);
  assert.equal(formatearMicros(DESCUENTO_POR_USUARIO_MICROS), "0,06 $");

  const global = microsDesdeCadena("0.3");
  assert.equal(
    precioDelWebmaster("0.3"),
    (global - DESCUENTO_POR_USUARIO_MICROS) * USUARIOS_POR_BLOQUE,
  );
});

test("un precio que no cabe en la realidad no se pinta: se descarta", () => {
  /*
   * El defecto que esto previene NO ha pasado todavía, y por eso está escrito.
   *
   * Sophon manda el precio por USUARIO (`0.3`) y la tabla del programa lo enseña
   * por cada 100 (`$30`). El día que ese campo viniera ya multiplicado, los seis
   * céntimos se quedarían en ruido y la pantalla anunciaría precios cien veces
   * mayores, con el agente repitiéndoselos a sus webmasters. Quedarse sin tabla
   * es un problema; enseñar una mentira sobre dinero es otro mucho peor.
   */
  assert.equal(precioDelWebmaster("30"), null);
  assert.equal(precioDelWebmaster("90"), null);

  // Y por abajo: un tier que no cubra el descuento no deja nada para el
  // webmaster, así que tampoco hay número que enseñar.
  assert.equal(precioDelWebmaster("0.06"), null);
  assert.equal(precioDelWebmaster("0.05"), null);
  assert.equal(precioDelWebmaster("0"), null);
  assert.equal(precioDelWebmaster(""), null);
});

test("el reparto del Operador no está representado en ninguna parte", () => {
  /*
   * La regla dura de `lib/i18n.ts` dice que ninguna cadena revela lo que se
   * queda arriba. Aquí se cumple POR CONSTRUCCIÓN: hay una sola constante con el
   * descuento entero —seis céntimos— y no dos sumandos de tres. Si existiera la
   * mitad como número propio, tarde o temprano alguien la pintaría.
   *
   * Se comprueba sobre el fuente porque lo que hay que impedir es que ese número
   * exista, no que se use: una constante «solo para el cálculo» es exactamente
   * como empiezan estas filtraciones.
   */
  const fuente = readFileSync(new URL("../lib/precios/tabla.ts", import.meta.url), "utf8");
  assert.doesNotMatch(
    fuente,
    /30_000n/,
    "los tres céntimos de un lado del reparto no pueden existir como constante",
  );

  /*
   * Y la ruta que sirve la tabla tampoco puede mandar el precio global: con el
   * global y con el neto delante, restar da el descuento, y el agente deduce lo
   * que se queda arriba sin que nadie se lo haya dicho.
   *
   * Se busca `unitPrice` —el nombre real del campo de Sophon— y no la palabra
   * «global»: los comentarios de la ruta la usan para explicar precisamente que
   * ese dato no sale, y una prueba que se rompe con su propia documentación
   * enseña a borrar la documentación.
   */
  const ruta = readFileSync(new URL("../app/api/agente/precios/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(ruta, /unitPrice/);
  assert.doesNotMatch(ruta, /\bglobal:/);
});

test("el 35 % del webmaster está escrito a mano, y por eso queda fijado aquí", () => {
  /*
   * Los tiers los publica Sophon y se leen en vivo. Este porcentaje NO: no sale
   * en ninguna respuesta suya, así que vive como constante y la única forma de
   * que no se quede viejo en silencio es que cambiarlo rompa una prueba.
   *
   * Comprobado contra el programa de socios el 17-08-2026: el webmaster se
   * lleva el 35 % de lo que sus usuarios pagan por el PRO.
   */
  assert.equal(PORCENTAJE_WEBMASTER_BPS, 3_500);
});

test("el porcentaje del agente NO está escrito a mano: sale de la tarifa en vigor", () => {
  /*
   * Es con lo que se le paga de verdad —`TarifaVersion.cpsBps`, que usa el motor
   * de devengo— y el Operador lo cambia desde el panel. Escribirlo también en el
   * módulo de precios lo dejaría mintiendo el día que lo cambiara, y mintiendo
   * justo en la cifra que el agente cobra.
   */
  const fuente = readFileSync(new URL("../lib/precios/tabla.ts", import.meta.url), "utf8");
  /*
   * Se mira el CÓDIGO, no la prosa. El módulo nombra `cpsBps` en un comentario
   * —justo para explicar que el porcentaje del agente no vive aquí—, y una
   * prueba que casca con su propia documentación enseña a borrar la
   * documentación. Lo que no puede existir es la constante ni la lectura de la
   * tarifa.
   */
  assert.doesNotMatch(fuente, /export const PORCENTAJE_AGENTE/);
  assert.doesNotMatch(fuente, /^\s*(import|const|let).*(cpsBps|tarifaVigente)/m);

  const ruta = readFileSync(new URL("../app/api/agente/precios/route.ts", import.meta.url), "utf8");
  assert.match(ruta, /tarifaVigente\(\)/, "el porcentaje del agente ya no sale de la tarifa");
});
