import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { esChoqueDeSolicitudViva } from "../lib/db.ts";

/**
 * El detector del choque entre dos retiros simultáneos.
 *
 * La regla «una sola solicitud viva por agente» la sostiene ahora un índice
 * único parcial en PostgreSQL, porque el `findFirst` que había dentro de la
 * transacción no sostenía nada: en READ COMMITTED —el nivel por defecto de las
 * transacciones de Prisma— un SELECT no bloquea el INSERT de otra transacción,
 * así que dos toques simultáneos creaban dos solicitudes del mismo saldo.
 *
 * Con el índice, la segunda petición muere con un `P2002`. Lo que se prueba aquí
 * es que ese error se distingue del OTRO único de la misma tabla: la clave de
 * idempotencia. Confundirlos convertiría un reenvío —que debe contestar «ok, ya
 * estaba»— en un 409 de «ya tienes una en curso», y el agente se quedaría
 * mirando un error por haber tenido mala cobertura.
 *
 * El índice en sí no se puede probar sin base de datos. Lo que se puede probar,
 * y es donde está la lógica que se puede equivocar, es esto.
 */

/** La forma real de un error de unicidad de Prisma. */
const p2002 = (target: string[] | string) => ({
  code: "P2002",
  clientVersion: "6.19.3",
  meta: { modelName: "SolicitudRetiro", target },
});

describe("distinguir el choque de solicitud viva", () => {
  it("reconoce el índice parcial, venga el objetivo como lista o como cadena", () => {
    assert.equal(esChoqueDeSolicitudViva(p2002(["SolicitudRetiro_una_viva_por_agente"])), true);
    assert.equal(esChoqueDeSolicitudViva(p2002("SolicitudRetiro_una_viva_por_agente")), true);
  });

  it("NO confunde la clave de idempotencia, que es el otro único de la tabla", () => {
    // Este caso ya lo resuelve la lectura de `REPETIDA` y contesta 200 «ya
    // estaba». Tratarlo como choque le daría un 409 a quien solo reintentó.
    assert.equal(esChoqueDeSolicitudViva(p2002(["claveIdempotencia"])), false);
  });

  it("ignora cualquier otro error", () => {
    for (const e of [
      null,
      undefined,
      "P2002",
      new Error("P2002"),
      { code: "P2025", meta: { target: ["SolicitudRetiro_una_viva_por_agente"] } },
      { code: "P2002" },
      { code: "P2002", meta: {} },
    ]) {
      assert.equal(esChoqueDeSolicitudViva(e), false, `no debería reconocer ${JSON.stringify(e)}`);
    }
  });
});
