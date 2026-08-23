import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fronteraDeAtribucion } from "../lib/webmaster/atribucion.ts";

/**
 * Desde cuándo devenga un webmaster.
 *
 * Se prueba porque es la regla que decide si un agente cobra, y porque falló en
 * producción sin hacer ruido: los registros entraban, el Operador los cobraba, y
 * el agente veía 0,00 $. Ninguna prueba lo cazó porque la regla vivía dentro del
 * alta, entre Prisma, Sophon y el bot, donde no se puede probar nada.
 */

describe("la frontera de atribución", () => {
  it("un alta NO lleva frontera: es una cuenta nueva y todo lo suyo es del agente", () => {
    /*
     * El alta rechaza cualquier correo que la aplicación ya conozca
     * (`YA_EN_SOPHON`), así que toda cuenta VINCULADO_APP es una cuenta que no
     * existía. No hay pasado del que protegerse, y estampar la fecha solo puede
     * quitarle al agente lo que sí es suyo.
     */
    assert.equal(fronteraDeAtribucion("VINCULADO_APP", "2026-08-23"), null);
  });

  it("un huérfano adoptado SÍ la lleva: lo de antes no es de quien lo adopta", () => {
    const f = fronteraDeAtribucion("HUERFANO", "2026-08-23");
    assert.ok(f instanceof Date);
    assert.equal(f.toISOString().slice(0, 10), "2026-08-23");
  });

  it("y una asignación manual también", () => {
    const f = fronteraDeAtribucion("ASIGNADO_MANUAL", "2026-08-23");
    assert.equal(f?.toISOString().slice(0, 10), "2026-08-23");
  });

  it("REGRESIÓN: el desfase del día contable se comía la comisión del primer día", () => {
    /*
     * `hoyContable()` va en UTC+8 y Sophon fecha los registros en el día que
     * acaba de cerrar, así que un alta de la tarde europea nacía ya en el día
     * contable SIGUIENTE. Con frontera, la comparación de `planificarAsientos`
     * —`fila.fecha >= devengaDesde`— daba falso sobre el tráfico que ese mismo
     * webmaster estaba trayendo, y el agente no cobraba nada.
     *
     * Sin frontera la comparación ni se hace: `null` deja pasar todo.
     */
    const registrosDeSophon = "2026-08-22";
    const diaContableDelAlta = "2026-08-23";

    const conFrontera = fronteraDeAtribucion("HUERFANO", diaContableDelAlta);
    assert.equal(
      registrosDeSophon >= conFrontera!.toISOString().slice(0, 10),
      false,
      "así es como se perdía: la frontera por delante de los registros",
    );

    assert.equal(
      fronteraDeAtribucion("VINCULADO_APP", diaContableDelAlta),
      null,
      "un alta no puede nacer con una frontera por delante de su propio tráfico",
    );
  });
});
