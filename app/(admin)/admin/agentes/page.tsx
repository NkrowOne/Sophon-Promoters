import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/auth/admin";
import { CODIGOS_MEMBRESIA } from "@/lib/sophon/tipos";
import { cambiarEstadoAgente, cortarSesiones, guardarPermisos } from "../acciones";
import { Cerrada } from "../_piezas/Cerrada";
import { Importe } from "../_piezas/Importe";

/**
 * Agentes.
 *
 * Lo que se administra aquí es **lo que un agente puede gastar del superadmin**:
 * conceder PRO regala hasta un año de VIP a su costa. Por eso el permiso, los
 * planes y el cupo van juntos en un mismo bloque y no repartidos por la
 * pantalla: son una sola decisión.
 *
 * Cada agente muestra además lo que lleva devengado y cuánto ha gastado de su
 * cupo este mes, que es el contexto sin el cual «subirle el cupo a 20» es una
 * cifra elegida a ciegas.
 */

export const dynamic = "force-dynamic";

const NOMBRE_PLAN: Record<string, string> = {
  "vip.day": "día",
  "vip.week": "semana",
  "vip.month": "mes",
  "vip.year": "año",
};

function periodoActual(): string {
  const zona = process.env["ZONA_HORARIA"] ?? "Europe/Madrid";
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(new Date()).slice(0, 7);
}

export default async function Agentes() {
  if (!(await exigirAdmin())) return <Cerrada />;

  const periodo = periodoActual();

  const sinOrdenar = await db.agente.findMany({
    include: {
      _count: { select: { webmasters: true } },
      concesiones: {
        where: { periodoCupo: periodo, estado: { in: ["RESERVADA", "CONFIRMADA"] } },
        select: { id: true },
      },
    },
  });

  const devengos = await db.asientoComision.groupBy({
    by: ["agenteId"],
    where: { estado: { not: "ANULADO" }, tipo: { not: "RETIRO" } },
    _sum: { importeMicros: true },
  });
  const devengado = new Map(devengos.map((d) => [d.agenteId, d._sum.importeMicros ?? 0n]));

  // Ordenados por lo que producen, no por cuándo se dieron de alta. Ordenar por
  // fecha dejaba al agente que más mueve al final de la página, que es justo el
  // que se viene a mirar. Se ordena en memoria porque el devengo sale de una
  // agregación aparte y son pocas filas.
  const agentes = [...sinOrdenar].sort((a, b) => {
    if ((a.estado === "ACTIVO") !== (b.estado === "ACTIVO")) return a.estado === "ACTIVO" ? -1 : 1;
    const da = devengado.get(a.id) ?? 0n;
    const dbb = devengado.get(b.id) ?? 0n;
    return da === dbb ? 0 : da > dbb ? -1 : 1;
  });

  if (agentes.length === 0) {
    return (
      <>
        <h1 style={{ fontSize: "1.3125rem", fontWeight: 600 }}>Agentes</h1>
        <p className="apoyo" style={{ marginTop: "0.6rem" }}>
          Todavía no hay ninguno. Escribe <code>/codigo</code> al bot para generar una
          invitación.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 style={{ fontSize: "1.3125rem", fontWeight: 600, letterSpacing: "-0.015em" }}>
        Agentes
      </h1>
      <p className="apoyo" style={{ marginTop: "0.35rem" }}>
        {agentes.length} en total. El cupo de PRO se cuenta sobre {periodo}.
      </p>

      <div style={{ marginTop: "2rem", display: "grid", gap: "1.25rem" }}>
        {agentes.map((a) => (
          <article
            key={a.id}
            style={{
              border: "1px solid var(--p-borde)",
              borderRadius: 4,
              padding: "1rem 1.1rem",
              opacity: a.estado === "ACTIVO" ? 1 : 0.72,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
                alignItems: "baseline",
              }}
            >
              <div>
                <p style={{ fontWeight: 600 }}>
                  {a.nombreVisible}{" "}
                  {a.estado !== "ACTIVO" && (
                    <span className="rotulo vivo">{a.estado.toLowerCase()}</span>
                  )}
                </p>
                <p className="apoyo" style={{ fontFamily: "ui-monospace, monospace" }}>
                  {a.emailNormalizado}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <Importe
                  micros={devengado.get(a.id) ?? 0n}
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    display: "block",
                  }}
                />
                <p className="apoyo">
                  {a._count.webmasters}{" "}
                  {a._count.webmasters === 1 ? "webmaster" : "webmasters"} ·{" "}
                  {a.concesiones.length} de {a.cupoProMensual} PRO este mes
                </p>
              </div>
            </div>

            {/* Permiso, planes y cupo en un mismo formulario: son una sola
                decisión —cuánto puede gastar de lo mío— y separarlos invitaría
                a dejar el cupo puesto con el permiso quitado, o al revés. */}
            <form
              action={guardarPermisos}
              style={{
                marginTop: "1rem",
                paddingTop: "0.9rem",
                borderTop: "1px solid var(--p-borde)",
                display: "flex",
                gap: "1.25rem",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <input type="hidden" name="agenteId" value={a.id} />

              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem" }}>
                <input type="checkbox" name="puedeConcederPro" defaultChecked={a.puedeConcederPro} />
                Puede conceder PRO
              </label>

              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem" }}>
                Cupo mensual
                <input
                  type="number"
                  name="cupoProMensual"
                  min={0}
                  max={500}
                  defaultValue={a.cupoProMensual}
                  style={{ width: "5rem" }}
                />
              </label>

              <span style={{ display: "inline-flex", gap: "0.75rem", flexWrap: "wrap" }}>
                {CODIGOS_MEMBRESIA.map((p) => (
                  <label
                    key={p}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.875rem" }}
                  >
                    <input
                      type="checkbox"
                      name={`plan:${p}`}
                      defaultChecked={a.planesAutorizados.includes(p)}
                    />
                    {NOMBRE_PLAN[p]}
                  </label>
                ))}
              </span>

              <button type="submit" className="boton primario">
                Guardar
              </button>
            </form>

            <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <form action={cambiarEstadoAgente}>
                <input type="hidden" name="agenteId" value={a.id} />
                <input
                  type="hidden"
                  name="estado"
                  value={a.estado === "ACTIVO" ? "SUSPENDIDO" : "ACTIVO"}
                />
                <button type="submit" className="boton">
                  {a.estado === "ACTIVO" ? "Suspender" : "Reactivar"}
                </button>
              </form>
              <form action={cortarSesiones}>
                <input type="hidden" name="agenteId" value={a.id} />
                <button type="submit" className="boton" title="Le obliga a volver a entrar con su correo">
                  Cortar sesiones
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
