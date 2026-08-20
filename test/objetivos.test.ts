import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { tramosDelMedidor } from "../lib/devengo/objetivos.ts";

/**
 * El reparto de la escalera del bono en tramos.
 *
 * Es la única aritmética del medidor de objetivos, y es justo donde un error no
 * se ve: una barra ligeramente mal llena sigue pareciendo una barra bien llena.
 * Lo que se comprueba aquí es que cada segmento mide su propio tramo y que el
 * estado de cada nivel es el que le corresponde.
 */

const premio = (texto: string) => ({ micros: "0", texto });
const ESCALERA = [
  { usuarios: 10_000, premio: premio("50,00 $") },
  { usuarios: 20_000, premio: premio("100,00 $") },
  { usuarios: 30_000, premio: premio("150,00 $") },
];

describe("los tramos del medidor de objetivos", () => {
  it("cada segmento mide SU tramo, no la escalera entera", () => {
    /*
     * Es la decisión que sostiene la pieza. 12.000 registros son el 40 % de la
     * escalera completa —una barra que apenas se mueve— y son el primer nivel
     * cumplido más un 20 % del segundo, que es lo que de verdad ha pasado.
     */
    const [uno, dos, tres] = tramosDelMedidor(12_000, ESCALERA);

    assert.equal(uno!.relleno, 100);
    assert.equal(dos!.relleno, 20);
    assert.equal(tres!.relleno, 0);
  });

  it("el avance pequeño se ve, que es el problema que vino a resolver", () => {
    // 720 sobre la escalera entera es un 2,4 % y no se dibuja nunca. Sobre el
    // primer tramo es un 7,2 %: una marca visible, y que crece todos los días.
    const [uno] = tramosDelMedidor(720, ESCALERA);
    assert.ok(uno!.relleno > 7 && uno!.relleno < 7.3, `relleno inesperado: ${uno!.relleno}`);
  });

  it("solo UN nivel está en curso: el bono paga una carrera, no tres", () => {
    const tramos = tramosDelMedidor(12_000, ESCALERA);
    assert.deepEqual(
      tramos.map((tr) => tr.enCurso),
      [false, true, false],
    );
    assert.deepEqual(
      tramos.map((tr) => tr.alcanzado),
      [true, false, false],
    );
  });

  it("con la escalera entera cumplida no queda ninguno en curso", () => {
    const tramos = tramosDelMedidor(45_000, ESCALERA);
    assert.ok(tramos.every((tr) => tr.alcanzado && tr.relleno === 100));
    assert.ok(tramos.every((tr) => !tr.enCurso));
  });

  it("a cero, el primer nivel está en curso y vacío", () => {
    // El estado del día 1, que es cuando más se mira: nada cumplido, nada
    // relleno, y aun así el medidor tiene que decir cuál es el que está en juego.
    const [uno, dos] = tramosDelMedidor(0, ESCALERA);
    assert.equal(uno!.relleno, 0);
    assert.equal(uno!.enCurso, true);
    assert.equal(dos!.enCurso, false);
  });

  it("ordena la escalera por su cuenta, sin fiarse de cómo llegue", () => {
    // Viene de la base de datos: un `orderBy` olvidado en el sitio de llamada
    // pintaría los niveles del revés sin que nada avisara.
    const revuelta = [ESCALERA[2]!, ESCALERA[0]!, ESCALERA[1]!];
    assert.deepEqual(
      tramosDelMedidor(12_000, revuelta).map((tr) => tr.escalon.usuarios),
      [10_000, 20_000, 30_000],
    );
  });

  it("dos umbrales iguales no dividen por cero", () => {
    // Escalera mal configurada. El panel la rechaza al guardar, pero una que ya
    // estuviera guardada no puede reventar la portada del agente.
    const tramos = tramosDelMedidor(5_000, [
      { usuarios: 10_000, premio: premio("50,00 $") },
      { usuarios: 10_000, premio: premio("60,00 $") },
    ]);
    assert.ok(tramos.every((tr) => Number.isFinite(tr.relleno)));
    assert.equal(tramos[1]!.relleno, 0);
  });

  it("sin escalera no devuelve tramos", () => {
    assert.deepEqual(tramosDelMedidor(1_000, []), []);
  });
});
