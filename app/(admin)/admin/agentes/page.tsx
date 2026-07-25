import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/auth/admin";
import { cambiarEstadoAgente, cortarSesiones } from "../acciones";
import { Cerrada } from "../_piezas/Cerrada";
import { Importe } from "../_piezas/Importe";
import { inicioDelMes } from "@/lib/pro/conceder";

/**
 * Agentes.
 *
 * Lo que se administra aquí es **lo que un agente puede gastar del superadmin**.
 * Y desde que el PRO va atado al alta, eso es una sola cifra: cada alta regala
 * un año de VIP, así que el tope de altas ES el tope de gasto. Ya no hay planes
 * que autorizar ni cupo de PRO aparte que cuadrar con él.
 *
 * Cada agente muestra lo que lleva devengado y las altas que ha hecho este mes,
 * que es el contexto sin el cual «subirle el tope a 50» es una cifra elegida a
 * ciegas.
 */

export const dynamic = "force-dynamic";

export default async function Agentes() {
  if (!(await exigirAdmin())) return <Cerrada />;

  const desdeElDiaUno = inicioDelMes();

  const sinOrdenar = await db.agente.findMany({
    include: {
      _count: { select: { webmasters: true } },
      // Las altas se cuentan sobre los intentos con éxito, igual que en la ruta
      // que las limita. Si el panel contara de otra forma, enseñaría «te quedan
      // 3» mientras el servidor rechaza la siguiente.
      vinculaciones: {
        where: { exito: true, creadoEn: { gte: desdeElDiaUno } },
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
        {agentes.length} en total. Cada alta concede un año de PRO. No hay tope: para
        parar a uno, suspéndelo.
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
                  {a.vinculaciones.length} altas este mes
                </p>
              </div>
            </div>

            {/* Ya no hay permisos ni topes que configurar: un agente activa
                cuantos webmasters quiera, y el único freno es suspenderlo. Un
                formulario con un solo interruptor redundante sería peor que no
                tenerlo. */}

            <div
              style={{
                marginTop: "1rem",
                paddingTop: "0.9rem",
                borderTop: "1px solid var(--p-borde)",
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
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
