import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/auth/admin";
import { formatearMicros } from "@/lib/devengo/dinero";
import { inicioDeMes, inicioDelMesSiguiente, mesAnterior, mesContable } from "@/lib/fechas";
import { cambiarEscaleraBono } from "../acciones";
import { Cerrada } from "../_piezas/Cerrada";

/**
 * Bonos por hitos.
 *
 * La escalera que decide cuánto cobra un agente por alcanzar cierto número de
 * registros dentro del mes. Se versiona igual que las tarifas y por el mismo
 * motivo: cada asiento de BONO apunta al escalón que lo pagó, así que editar un
 * escalón en sitio cambiaría la explicación de dinero ya entregado.
 *
 * Dos columnas que la página de tarifas no necesita y esta sí:
 *
 *  - **Coste si lo alcanzan todos**: un bono sale del margen, y conviene ver la
 *    factura antes de guardar y no al final de mes.
 *  - **Alcanzado por**: cuántos agentes llegaron a ese escalón el mes pasado. Es
 *    el único dato que dice si los umbrales están puestos en un sitio razonable.
 *    Un hito que nadie alcanza no es una meta, es decoración —y con el tráfico
 *    actual los tres de partida están por encima de lo que produce la cuenta
 *    entera en un mes, así que esta columna va a decir cero hasta que se bajen—.
 */

export const dynamic = "force-dynamic";

export default async function Bonos() {
  if (!(await exigirAdmin())) return <Cerrada />;

  const versiones = await db.bonoVersion.findMany({
    orderBy: { validaDesde: "desc" },
    include: {
      escalones: {
        orderBy: { usuarios: "asc" },
        include: { _count: { select: { asientos: true } } },
      },
    },
    take: 15,
  });

  const vigente = versiones.find((v) => v.validaHasta === null) ?? null;
  const agentesActivos = await db.agente.count({ where: { estado: "ACTIVO" } });

  // Cuántos agentes alcanzaron cada escalón el mes pasado. Se mide sobre el mes
  // CERRADO, no el corriente: a mitad de mes cualquier umbral parece inalcanzable
  // y la cifra no diría nada.
  const mesPasado = mesAnterior(mesContable());
  const alcanzado = await alcanzadoPorEscalon(mesPasado);

  return (
    <>
      <h1 style={{ fontSize: "1.3125rem", fontWeight: 600, letterSpacing: "-0.015em" }}>
        Bonos por hitos
      </h1>
      <p className="apoyo" style={{ marginTop: "0.35rem" }}>
        Premio mensual por registros de la red. No es acumulable: alcanzar un escalón paga
        su recompensa, no la suma de las anteriores. El contador se reinicia cada mes.
      </p>

      {!vigente && (
        <div className="privado" style={{ marginTop: "1.5rem" }}>
          <p className="rotulo vivo">No hay ninguna escalera en vigor</p>
          <p className="apoyo" style={{ marginTop: "0.4rem" }}>
            Sin escalones configurados no se emite ningún bono. El resto del devengo —CPA y
            CPS— no se ve afectado.
          </p>
        </div>
      )}

      <section style={{ marginTop: "2rem" }}>
        <p
          className="rotulo"
          style={{ borderBottom: "1px solid var(--p-borde)", paddingBottom: "0.5rem" }}
        >
          {vigente ? "Nueva versión" : "Primera escalera"}
        </p>

        <form action={cambiarEscaleraBono} style={{ marginTop: "1.1rem", maxWidth: "38rem" }}>
          <div className="tabla-marco">
            <table style={{ marginBottom: "1rem" }}>
              <thead>
                <tr>
                  <th>Registros en el mes</th>
                  <th>Paga</th>
                  <th className="num">Coste si lo alcanzan todos</th>
                </tr>
              </thead>
              <tbody>
                {/* Cinco filas fijas: las vacías se descartan al guardar, así que
                    quitar un escalón es borrar su umbral y guardar. Un formulario
                    con «añadir fila» exigiría estado de cliente en una página que
                    hoy es enteramente de servidor. */}
                {Array.from({ length: 5 }, (_, i) => {
                  const e = vigente?.escalones[i];
                  return (
                    <tr key={i}>
                      <td>
                        <input
                          name="usuarios"
                          type="text"
                          inputMode="numeric"
                          defaultValue={e ? String(e.usuarios) : ""}
                          placeholder={i === 0 ? "10000" : ""}
                          style={campo}
                        />
                      </td>
                      <td>
                        <input
                          name="recompensa"
                          type="text"
                          inputMode="decimal"
                          defaultValue={
                            e ? formatearMicros(e.recompensaMicros).replace(/\s*\$$/, "") : ""
                          }
                          placeholder={i === 0 ? "50" : ""}
                          style={campo}
                        />
                      </td>
                      <td className="num apoyo" data-etiqueta="Asientos">
                        {e ? formatearMicros(e.recompensaMicros * BigInt(agentesActivos)) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="apoyo" style={{ marginBottom: "1rem" }}>
            Las recompensas tienen que crecer con los registros. Una escalera en la que un
            escalón alto pague menos que uno bajo se rechaza: al subir de hito descontaría
            dinero al agente.
          </p>

          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="nota" className="rotulo" style={{ display: "block" }}>
              Motivo (opcional)
            </label>
            <input id="nota" name="nota" type="text" maxLength={300} style={campo} />
          </div>

          <button type="submit" className="boton primario">
            Guardar versión
          </button>
        </form>
      </section>

      <section style={{ marginTop: "2.5rem" }}>
        <p
          className="rotulo"
          style={{ borderBottom: "1px solid var(--p-borde)", paddingBottom: "0.5rem" }}
        >
          Escalera en vigor · alcanzado en {mesPasado}
        </p>
        {vigente && vigente.escalones.length > 0 ? (
          <div className="tabla-marco">
            <table className="densa" style={{ marginTop: "0.9rem" }}>
              <thead>
                <tr>
                  <th className="num">Registros</th>
                  <th className="num">Paga</th>
                  <th className="num">Alcanzado por</th>
                  <th className="num">Asientos</th>
                </tr>
              </thead>
              <tbody>
                {vigente.escalones.map((e) => (
                  <tr key={e.id}>
                    <td className="ancla num">{e.usuarios.toLocaleString("es-ES")} registros</td>
                    <td className="num cabeza" data-etiqueta="Paga">
                      {formatearMicros(e.recompensaMicros)}
                    </td>
                    {/* Cero aquí en los tres escalones significa que están fuera
                        de alcance, no que los agentes no trabajen. */}
                    <td className="num" data-etiqueta="Alcanzado por">
                      {alcanzado.get(e.usuarios) ?? 0} de {agentesActivos}
                    </td>
                    <td className="num apoyo" data-etiqueta="Asientos">
                      {e._count.asientos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="apoyo" style={{ marginTop: "0.9rem" }}>
            Ninguna configurada.
          </p>
        )}
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
            Ninguna todavía.
          </p>
        ) : (
          <div className="tabla-marco">
            <table className="densa" style={{ marginTop: "0.9rem" }}>
              <thead>
                <tr>
                  <th>Vigencia</th>
                  <th>Escalera</th>
                  <th className="num">Asientos</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {versiones.map((v) => (
                  <tr key={v.id}>
                    <td className="ancla">
                      {fecha(v.validaDesde)}
                      {v.validaHasta ? (
                        <span className="apoyo"> → {fecha(v.validaHasta)}</span>
                      ) : (
                        <span className="rotulo" style={{ marginLeft: "0.5rem" }}>
                          en vigor
                        </span>
                      )}
                    </td>
                    <td className="apoyo linea-propia" data-etiqueta="Escalera">
                      {v.escalones
                        .map(
                          (e) =>
                            `${e.usuarios.toLocaleString("es-ES")} → ${formatearMicros(e.recompensaMicros)}`,
                        )
                        .join(" · ")}
                    </td>
                    <td className="num apoyo">
                      {v.escalones.reduce((a, e) => a + e._count.asientos, 0)}
                    </td>
                    <td className="apoyo linea-propia" data-etiqueta="Motivo">
                      {v.nota ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

/**
 * Cuántos agentes alcanzaron cada umbral en un mes ya cerrado.
 *
 * Se cuenta sobre los registros reales del mes y no sobre los bonos emitidos: un
 * escalón puede haberse alcanzado antes de que la escalera existiera, y lo que
 * esta columna tiene que contestar es «¿está el umbral a una distancia
 * razonable?», no «¿cuánto he pagado?» —para eso está la columna de asientos—.
 */
async function alcanzadoPorEscalon(mes: string): Promise<Map<number, number>> {
  const desde = inicioDeMes(mes);
  const hasta = inicioDelMesSiguiente(mes);

  const porAgente = await db.filaDiariaSophon.groupBy({
    by: ["webmasterId"],
    where: { fecha: { gte: desde, lt: hasta } },
    _sum: { countRegister: true },
  });
  if (porAgente.length === 0) return new Map();

  const webmasters = await db.webmaster.findMany({
    where: { id: { in: porAgente.map((p) => p.webmasterId) }, agenteId: { not: null } },
    select: { id: true, agenteId: true },
  });
  const deQuien = new Map(webmasters.map((w) => [w.id, w.agenteId!]));

  const totales = new Map<string, number>();
  for (const p of porAgente) {
    const agente = deQuien.get(p.webmasterId);
    if (!agente) continue;
    totales.set(agente, (totales.get(agente) ?? 0) + (p._sum.countRegister ?? 0));
  }

  const escalones = await db.bonoEscalon.findMany({
    where: { version: { validaHasta: null } },
    select: { usuarios: true },
  });

  const cuenta = new Map<number, number>();
  for (const e of escalones) {
    cuenta.set(e.usuarios, [...totales.values()].filter((t) => t >= e.usuarios).length);
  }
  return cuenta;
}

const campo: React.CSSProperties = {
  width: "100%",
  padding: "0.4rem 0.5rem",
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
