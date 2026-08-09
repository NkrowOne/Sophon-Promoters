import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/auth/admin";
import { formatearMicros } from "@/lib/devengo/dinero";
import { leerWallet } from "@/lib/cripto";
import { resolverRetiro } from "../acciones";
import { Importe } from "../_piezas/Importe";
import { Cerrada } from "../_piezas/Cerrada";

/**
 * Retiros.
 *
 * La pantalla está organizada alrededor de la única acción que importa: **hacer
 * la transferencia y anotar el hash**. Por eso la wallet se muestra ENTERA y
 * seleccionable —recortarla obligaría a abrir la base de datos para copiarla— y
 * por eso la referencia de pago es un campo obligatorio del mismo formulario:
 * marcar como pagado sin poder demostrarlo después no vale de nada.
 *
 * Lo pendiente va arriba y lo resuelto abajo, porque solo lo primero pide algo.
 */

export const dynamic = "force-dynamic";

const ETIQUETA: Record<string, string> = {
  SOLICITADO: "pendiente",
  APROBADO: "aprobado",
  PAGADO: "pagado",
  RECHAZADO: "rechazado",
  CANCELADO: "cancelado",
};

export default async function Retiros() {
  if (!(await exigirAdmin())) return <Cerrada />;

  const solicitudes = await db.solicitudRetiro.findMany({
    orderBy: [{ solicitadoEn: "asc" }],
    take: 200,
    include: {
      agente: { select: { nombreVisible: true, emailNormalizado: true } },
    },
  });

  const vivas = solicitudes.filter((s) => s.estado === "SOLICITADO" || s.estado === "APROBADO");
  const resueltas = solicitudes
    .filter((s) => !vivas.includes(s))
    .sort((a, b) => (a.solicitadoEn < b.solicitadoEn ? 1 : -1));

  const totalVivo = vivas.reduce((a, s) => a + s.importeMicros, 0n);

  return (
    <>
      <h1 style={{ fontSize: "1.3125rem", fontWeight: 600, letterSpacing: "-0.015em" }}>
        Retiros
      </h1>
      <p className="apoyo" style={{ marginTop: "0.35rem" }}>
        {vivas.length === 0
          ? "Sin retiros pendientes."
          : `${vivas.length} ${vivas.length === 1 ? "solicitud" : "solicitudes"} por ${formatearMicros(totalVivo)}. El pago es manual y requiere el hash de la transacción.`}
      </p>

      {vivas.length > 0 && (
        <section style={{ marginTop: "2rem", display: "grid", gap: "1.25rem" }}>
          {vivas.map((s) => (
            <article
              key={s.id}
              style={{
                border: "1px solid var(--p-borde)",
                borderRadius: 4,
                padding: "1rem 1.1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                  alignItems: "baseline",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <p style={{ fontWeight: 600 }}>{s.agente.nombreVisible}</p>
                  <p className="apoyo">{s.agente.emailNormalizado}</p>
                </div>
                <Importe
                  micros={s.importeMicros}
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    fontFamily: "ui-monospace, monospace",
                  }}
                />
              </div>

              {/* Entera y seleccionable: es lo que hay que pegar en la cartera.
                  Recortada obligaría a ir a buscarla a la base de datos. */}
              <p style={{ marginTop: "0.85rem", fontSize: "0.8125rem" }}>
                <span className="rotulo">{s.red}</span>{" "}
                <code
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    wordBreak: "break-all",
                    userSelect: "all",
                    background: "var(--p-superficie)",
                    padding: "0.15rem 0.35rem",
                    borderRadius: 3,
                  }}
                >
                  {/* Se descifra al pintarla: en la base está cifrada, y aquí
                      tiene que salir entera porque es lo que se copia y se pega
                      en el monedero para hacer la transferencia. */}
                  {leerWallet(s.wallet)}
                </code>
              </p>
              <p className="apoyo" style={{ marginTop: "0.35rem" }}>
                {ETIQUETA[s.estado]} · solicitada el {fecha(s.solicitadoEn)}
              </p>

              {/* La intención va enlazada al servidor con `.bind`, no en el
                  `value` del botón: el name/value del botón que envía no llega
                  al FormData de una acción de servidor, y con él los tres
                  botones no hacían nada. */}
              <form
                action={resolverRetiro.bind(null, "pagar")}
                style={{
                  marginTop: "1rem",
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <input type="hidden" name="id" value={s.id} />
                <input
                  name="referencia"
                  required
                  placeholder="Hash de la transacción"
                  style={{ flex: "1 1 18rem", minWidth: 0 }}
                />
                <button type="submit" className="boton primario">
                  Marcar como pagado
                </button>
                {/* Aprobar no necesita hash, así que se salta la validación
                    del campo obligatorio y lleva su propia acción. */}
                {s.estado === "SOLICITADO" && (
                  <button
                    type="submit"
                    className="boton"
                    formNoValidate
                    formAction={resolverRetiro.bind(null, "aprobar")}
                  >
                    Aprobar
                  </button>
                )}
              </form>

              {/* El rechazo va en su propio formulario y pide motivo: sin él,
                  el agente ve «rechazado» y no sabe qué corregir, así que
                  vuelve a pedir exactamente lo mismo. */}
              <form
                action={resolverRetiro.bind(null, "rechazar")}
                style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
              >
                <input type="hidden" name="id" value={s.id} />
                <input
                  name="nota"
                  required
                  placeholder="Motivo del rechazo. Visible para el agente."
                  style={{ flex: "1 1 18rem", minWidth: 0 }}
                />
                <button type="submit" className="boton">
                  Rechazar y devolver saldo
                </button>
              </form>
            </article>
          ))}
        </section>
      )}

      <section style={{ marginTop: "2.75rem" }}>
        <p className="rotulo" style={{ borderBottom: "1px solid var(--p-borde)", paddingBottom: "0.5rem" }}>
          Resueltos
        </p>
        {resueltas.length === 0 ? (
          <p className="apoyo" style={{ marginTop: "0.9rem" }}>Sin retiros resueltos.</p>
        ) : (
          <table style={{ marginTop: "0.9rem" }}>
            <thead>
              <tr>
                <th>Agente</th>
                <th className="num">Importe</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Referencia</th>
              </tr>
            </thead>
            <tbody>
              {resueltas.map((s) => (
                <tr key={s.id}>
                  <td>{s.agente.nombreVisible}</td>
                  <td className="num"><Importe micros={s.importeMicros} /></td>
                  <td className={s.estado === "RECHAZADO" ? "vivo" : undefined}>
                    {ETIQUETA[s.estado]}
                    {s.motivo && (
                      <span className="apoyo" style={{ display: "block" }}>{s.motivo}</span>
                    )}
                  </td>
                  <td className="apoyo">{fecha(s.resueltoEn ?? s.solicitadoEn)}</td>
                  <td
                    className="apoyo"
                    style={{ fontFamily: "ui-monospace, monospace", userSelect: "all" }}
                    title={s.referenciaPago ?? ""}
                  >
                    {s.referenciaPago
                      ? `${s.referenciaPago.slice(0, 10)}…${s.referenciaPago.slice(-6)}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function fecha(d: Date): string {
  return d.toISOString().slice(0, 10);
}
