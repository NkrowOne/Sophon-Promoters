import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { agruparBonosPorMes, componerSaldos } from "../lib/devengo/saldos.ts";

/**
 * El circuito del dinero, recorrido entero.
 *
 * Existe porque el descuadre que estaba aquí no lo veía NADA: `saldos` necesita
 * base de datos, así que su único testigo era la prueba de extremo a extremo, y
 * esa comprueba que un asiento vencido pasa a disponible y ahí se para. Nunca
 * llega a pedir un retiro, que es justo donde la cuenta se rompía.
 *
 * El defecto: el retiro se descontaba dos veces, una por su asiento negativo en
 * el ledger y otra por la tabla de solicitudes. Con la solicitud ya PAGADA el
 * segundo descuento no se iba nunca, así que el disponible del agente quedaba
 * mermado para siempre en el total de todo lo que hubiera cobrado.
 *
 * Los casos de abajo son los cuatro estados por los que puede pasar una
 * solicitud. Se comprueban sobre la aritmética pura, sin levantar base de datos.
 *
 * CONVENIO DE LOS DATOS DE ENTRADA, que es lo que hay que tener en la cabeza:
 * el asiento del retiro es NEGATIVO y CONSOLIDADO desde que se pide, y cuelga de
 * la solicitud (`retiroId`), así que entra en `consolidadoConRetirosMicros` y no
 * en las dos cifras de devengo.
 */

const D = 1_000_000n; // un dólar en micros

describe("los saldos de un agente", () => {
  it("sin nada, todo a cero", () => {
    const s = componerSaldos({
      devengoProvisionalMicros: 0n,
      devengoConsolidadoMicros: 0n,
      consolidadoConRetirosMicros: 0n,
      solicitadoMicros: 0n,
      pagadoMicros: 0n,
    });
    assert.deepEqual(s, {
      devengadoMicros: 0n,
      disponibleMicros: 0n,
      solicitadoMicros: 0n,
      pagadoMicros: 0n,
    });
  });

  it("lo provisional cuenta como ganado y NO como retirable", () => {
    // Un día abierto todavía puede revisarse a la baja. Pagar sobre él obligaría
    // a reclamar dinero ya entregado.
    const s = componerSaldos({
      devengoProvisionalMicros: 40n * D,
      devengoConsolidadoMicros: 100n * D,
      consolidadoConRetirosMicros: 100n * D,
      solicitadoMicros: 0n,
      pagadoMicros: 0n,
    });
    assert.equal(s.devengadoMicros, 140n * D);
    assert.equal(s.disponibleMicros, 100n * D);
  });

  it("PEDIR un retiro descuenta UNA vez, no dos", () => {
    /*
     * Es el defecto, escrito con números: 100 $ consolidados, se piden 30.
     * El asiento negativo ya deja el consolidado en 70. La versión anterior
     * restaba encima los 30 de la tabla de solicitudes y enseñaba 40 $.
     */
    const s = componerSaldos({
      devengoProvisionalMicros: 0n,
      devengoConsolidadoMicros: 100n * D,
      consolidadoConRetirosMicros: 70n * D, // 100 − 30 del asiento del retiro
      solicitadoMicros: 30n * D,
      pagadoMicros: 0n,
    });
    assert.equal(s.disponibleMicros, 70n * D, "el retiro se descontó dos veces");
    // Y lo ganado no baja por cobrar: son 100, no 70.
    assert.equal(s.devengadoMicros, 100n * D, "cobrar no puede reducir lo ganado");
    assert.equal(s.solicitadoMicros, 30n * D);
  });

  it("PAGAR no descuenta otra vez: el asiento negativo ya estaba", () => {
    /*
     * Al pagar no nace ningún asiento nuevo —el negativo se creó al pedirlo— así
     * que el consolidado no se mueve. Este es el caso que dolía de verdad: la
     * solicitud pasa a PAGADO, sale de `solicitado` y entra en `pagado`, y la
     * versión anterior seguía restándola. Para siempre.
     */
    const s = componerSaldos({
      devengoProvisionalMicros: 0n,
      devengoConsolidadoMicros: 100n * D,
      consolidadoConRetirosMicros: 70n * D,
      solicitadoMicros: 0n,
      pagadoMicros: 30n * D,
    });
    assert.equal(s.disponibleMicros, 70n * D, "un retiro pagado no puede seguir descontando");
    assert.equal(s.devengadoMicros, 100n * D);
    assert.equal(s.pagadoMicros, 30n * D);
  });

  it("RECHAZAR devuelve el dinero, y por el ledger", () => {
    /*
     * El ledger es append-only: el asiento negativo no se borra, se compensa con
     * un `AJUSTE_MANUAL` positivo. Los dos cuelgan de la solicitud, así que se
     * anulan dentro del consolidado y ninguno toca lo devengado.
     */
    const s = componerSaldos({
      devengoProvisionalMicros: 0n,
      devengoConsolidadoMicros: 100n * D,
      consolidadoConRetirosMicros: 100n * D, // −30 del retiro +30 de la devolución
      solicitadoMicros: 0n,
      pagadoMicros: 0n,
    });
    assert.equal(s.disponibleMicros, 100n * D);
    assert.equal(s.devengadoMicros, 100n * D);
  });

  it("dos retiros seguidos descuentan dos veces, no cuatro", () => {
    // La versión anterior perdía el doble por cada cobro, así que el error crecía
    // con la vida del agente en vez de quedarse quieto.
    const s = componerSaldos({
      devengoProvisionalMicros: 0n,
      devengoConsolidadoMicros: 100n * D,
      consolidadoConRetirosMicros: 45n * D, // 100 − 30 − 25
      solicitadoMicros: 25n * D,
      pagadoMicros: 30n * D,
    });
    assert.equal(s.disponibleMicros, 45n * D);
    assert.equal(s.devengadoMicros, 100n * D);
  });

  it("un reverso que deja la cuenta en rojo enseña cero, no un negativo", () => {
    /*
     * Sophon puede revisar a la baja un día ya cobrado. La deuda queda en el
     * ledger y se salda contra lo que el agente devengue después; lo que no se
     * hace es enseñarle un número rojo que no puede pagar y que no le dice qué
     * hacer.
     */
    const s = componerSaldos({
      devengoProvisionalMicros: 0n,
      devengoConsolidadoMicros: 10n * D,
      consolidadoConRetirosMicros: -5n * D,
      solicitadoMicros: 0n,
      pagadoMicros: 30n * D,
    });
    assert.equal(s.disponibleMicros, 0n);
    // Pero lo devengado NO se maquilla: ahí sigue lo que de verdad ganó.
    assert.equal(s.devengadoMicros, 10n * D);
  });

  it("los micros no pasan por coma flotante en ningún punto", () => {
    // Un importe por encima del entero seguro de JavaScript: si algo lo
    // convirtiera a `number` por el camino, este caso lo delata.
    const enorme = 9_007_199_254_740_993n; // 2^53 + 1
    const s = componerSaldos({
      devengoProvisionalMicros: 0n,
      devengoConsolidadoMicros: enorme,
      consolidadoConRetirosMicros: enorme,
      solicitadoMicros: 0n,
      pagadoMicros: 0n,
    });
    assert.equal(s.devengadoMicros, enorme);
    assert.equal(s.disponibleMicros, enorme);
  });
});

/**
 * LOS BONOS DEL MES, agrupados.
 *
 * Existe porque el bono era invisible en cuanto se cobraba: entraba en el total
 * de lo ganado y no había ninguna pantalla que volviera a nombrarlo. Al sacarlo
 * a la cartera aparece un problema propio de este tipo de asiento, y es el que
 * se prueba aquí: **un mes puede llevar varios**.
 *
 * El bono no es acumulable, así que subir de nivel no emite la recompensa nueva
 * entera sino la DIFERENCIA. Enseñar esos tramos sueltos haría leer dos bonos
 * donde hubo uno, y el nivel del primer tramo etiquetando la suma haría leer un
 * total pagado por un nivel que no lo pagó.
 */
describe("los bonos, agrupados por mes", () => {
  const asiento = (
    fechaDevengo: string,
    importeMicros: bigint,
    usuarios: number | null,
    consolidado = true,
  ) => ({ fechaDevengo, importeMicros, usuarios, consolidado });

  it("suma los tramos del mismo mes y se queda con el NIVEL MÁS ALTO", () => {
    // El caso real: cruza 10.000 y cobra 50; sube a 30.000 y cobra los 100 que
    // faltan. El mes son 150 $ y los explica el nivel de 30.000, no el de 10.000.
    const [mes] = agruparBonosPorMes([
      asiento("2026-08-20", 100_000_000n, 30_000),
      asiento("2026-08-09", 50_000_000n, 10_000),
    ]);

    assert.equal(mes!.mes, "2026-08");
    assert.equal(mes!.importeMicros, 150_000_000n);
    assert.equal(mes!.usuarios, 30_000);
  });

  it("un solo tramo aún revisable deja el mes entero sin confirmar", () => {
    // El total que se enseña es la suma, así que darlo por cerrado mientras una
    // parte puede moverse sería prometer una cifra que todavía no lo es.
    const [mes] = agruparBonosPorMes([
      asiento("2026-08-20", 100_000_000n, 30_000, false),
      asiento("2026-08-09", 50_000_000n, 10_000, true),
    ]);
    assert.equal(mes!.consolidado, false);
  });

  it("meses distintos NO se mezclan, y conservan el orden en que llegan", () => {
    const meses = agruparBonosPorMes([
      asiento("2026-08-09", 50_000_000n, 10_000),
      asiento("2026-07-28", 150_000_000n, 30_000),
      asiento("2026-06-30", 50_000_000n, 10_000),
    ]);
    assert.deepEqual(
      meses.map((m) => m.mes),
      ["2026-08", "2026-07", "2026-06"],
    );
  });

  it("un asiento sin nivel no borra el nivel que ya tenía el mes", () => {
    // `bonoEscalonId` es opcional en el esquema: un ajuste hecho a mano puede
    // llegar sin él. Que ese asiento deje el mes sin etiqueta sería perder el
    // dato que sí existe.
    const [mes] = agruparBonosPorMes([
      asiento("2026-08-20", 10_000_000n, null),
      asiento("2026-08-09", 50_000_000n, 10_000),
    ]);
    assert.equal(mes!.usuarios, 10_000);
    assert.equal(mes!.importeMicros, 60_000_000n);
  });

  it("sin bonos no devuelve una fila vacía: devuelve nada", () => {
    assert.deepEqual(agruparBonosPorMes([]), []);
  });
});
