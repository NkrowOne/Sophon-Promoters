import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/auth/admin";
import { formatearMicros } from "@/lib/devengo/dinero";
import { CPA_MAXIMO_MICROS, CPS_MAXIMO_BPS } from "@/lib/devengo/motor";
import { cambiarTarifa } from "../acciones";
import { Cerrada } from "../_piezas/Cerrada";

/**
 * Tarifas.
 *
 * Esta página existe porque **sin ella no se devenga nada y nadie se entera**.
 *
 * `tarifaVigente()` (`lib/sync/registros.ts`) lee esta tabla, y si no encuentra
 * fila el barrido escribe las filas diarias con normalidad y emite cero
 * asientos. El agente ve su red viva, sus registros creciendo y 0,00 $, sin que
 * ninguna pantalla diga por qué. La tabla llevaba desde el primer día en el
 * esquema con exactamente un lector y ningún escritor: ni semilla, ni script,
 * ni panel.
 *
 * Lo que se configura son los dos conceptos que cobra un agente:
 *
 *   CPA  un fijo por cada registro que trae su webmaster.
 *   CPS  un porcentaje de lo que esos usuarios acaban pagando.
 *
 * **Nunca se edita una versión: se cierra y se abre otra.** Los asientos ya
 * emitidos guardan su `tarifaId`, así que reescribir una versión usada cambia
 * la explicación de dinero que ya se pagó. Por eso el historial de abajo no es
 * un adorno de auditoría: es la prueba de que el pasado sigue intacto.
 */

export const dynamic = "force-dynamic";

export default async function Tarifas() {
  if (!(await exigirAdmin())) return <Cerrada />;

  const versiones = await db.tarifaVersion.findMany({
    orderBy: { validaDesde: "desc" },
    include: { _count: { select: { asientos: true } } },
    take: 25,
  });

  const vigente = versiones.find((v) => v.validaHasta === null) ?? null;

  return (
    <>
      <h1 style={{ fontSize: "1.3125rem", fontWeight: 600, letterSpacing: "-0.015em" }}>
        Tarifas
      </h1>
      <p className="apoyo" style={{ marginTop: "0.35rem" }}>
        Retribución del agente por el tráfico de sus webmasters. Se aplica al guardar;
        los asientos ya emitidos conservan su versión.
      </p>

      {/* Sin tarifa el motor no emite un solo asiento, así que esto va arriba y
          en el mismo cajón «privado» que usa la portada para lo que invalida
          los números. Es la única pantalla desde la que se puede arreglar. */}
      {!vigente && (
        <div className="privado" style={{ marginTop: "1.5rem" }}>
          <p className="rotulo vivo">No hay ninguna tarifa en vigor</p>
          <p className="apoyo" style={{ marginTop: "0.4rem" }}>
            Sin tarifa vigente los barridos guardan los registros pero <strong>no devengan
            nada</strong>: los agentes ven 0,00 $. Se establece en el formulario siguiente.
          </p>
        </div>
      )}

      <section style={{ marginTop: "2rem" }}>
        <p
          className="rotulo"
          style={{ borderBottom: "1px solid var(--p-borde)", paddingBottom: "0.5rem" }}
        >
          {vigente ? "Nueva versión" : "Primera versión"}
        </p>

        <form
          action={cambiarTarifa}
          style={{ marginTop: "1.1rem", display: "grid", gap: "1.1rem", maxWidth: "30rem" }}
        >
          <div>
            <label htmlFor="cpa" className="rotulo" style={{ display: "block" }}>
              CPA por registro (USD)
            </label>
            <input
              id="cpa"
              name="cpa"
              type="text"
              inputMode="decimal"
              required
              defaultValue={
                vigente ? formatearMicros(vigente.cpaPorRegistroMicros, 4).replace(/\s*\$$/, "") : "0,03"
              }
              style={campo}
            />
            <p className="apoyo" style={{ marginTop: "0.3rem" }}>
              Máximo {formatearMicros(CPA_MAXIMO_MICROS, 4)} por registro.
            </p>
          </div>

          <div>
            <label htmlFor="cps" className="rotulo" style={{ display: "block" }}>
              CPS sobre el pago de usuarios (%)
            </label>
            <input
              id="cps"
              name="cps"
              type="text"
              inputMode="decimal"
              required
              defaultValue={vigente ? String(vigente.cpsBps / 100) : "5"}
              style={campo}
            />
            <p className="apoyo" style={{ marginTop: "0.3rem" }}>
              Máximo {CPS_MAXIMO_BPS / 100} %.
            </p>
          </div>

          <div>
            <label htmlFor="nota" className="rotulo" style={{ display: "block" }}>
              Motivo (opcional)
            </label>
            <input id="nota" name="nota" type="text" maxLength={300} style={campo} />
            <p className="apoyo" style={{ marginTop: "0.3rem" }}>
              Se guarda en el historial.
            </p>
          </div>

          <div>
            <button type="submit" className="boton primario">
              Guardar versión
            </button>
          </div>
        </form>
      </section>

      <section style={{ marginTop: "2.5rem" }}>
        <p
          className="rotulo"
          style={{ borderBottom: "1px solid var(--p-borde)", paddingBottom: "0.5rem" }}
        >
          Historial
        </p>

        {versiones.length === 0 ? (
          <p className="apoyo" style={{ marginTop: "0.9rem" }}>
            Sin versiones registradas.
          </p>
        ) : (
          <table style={{ marginTop: "0.9rem" }}>
            <thead>
              <tr>
                <th>Vigencia</th>
                <th className="num">CPA</th>
                <th className="num">CPS</th>
                <th className="num">Asientos</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {versiones.map((v) => (
                <tr key={v.id}>
                  <td>
                    {fecha(v.validaDesde)}
                    {v.validaHasta ? (
                      <span className="apoyo"> → {fecha(v.validaHasta)}</span>
                    ) : (
                      <span className="rotulo" style={{ marginLeft: "0.5rem" }}>
                        en vigor
                      </span>
                    )}
                  </td>
                  <td className="num">{formatearMicros(v.cpaPorRegistroMicros, 4)}</td>
                  <td className="num">{v.cpsBps / 100} %</td>
                  {/* Cuántos asientos explica esta versión: es la razón por la
                      que no se puede editar. */}
                  <td className="num">{v._count.asientos}</td>
                  <td className="apoyo">{v.nota ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

const campo: React.CSSProperties = {
  marginTop: "0.35rem",
  width: "100%",
  padding: "0.5rem 0.6rem",
  border: "1px solid var(--p-borde)",
  borderRadius: 4,
  background: "var(--p-fondo)",
  color: "var(--p-texto)",
  font: "inherit",
  fontVariantNumeric: "tabular-nums",
};

function fecha(d: Date): string {
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}
