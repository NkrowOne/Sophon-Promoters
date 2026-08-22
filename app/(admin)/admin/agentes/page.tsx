import Link from "next/link";

import { exigirAdmin } from "@/lib/auth/admin";
import { plantillaDeAgentes, problemasDeRed } from "@/lib/admin/control";
import { cambiarEstadoAgente, cortarSesiones } from "../acciones";
import { Cerrada } from "../_piezas/Cerrada";
import { Importe } from "../_piezas/Importe";
import { EstadoAgente, Num, Senal, Senales, dia } from "../_piezas/Control";

/**
 * La plantilla: todos los agentes, en una sola tabla comparable.
 *
 * ── POR QUÉ SE FUE LA LISTA DE TARJETAS ──
 *
 * Esta página eran tarjetas con cuatro datos: nombre, correo, devengado y
 * cuántos webmasters. Servía para leer un agente y no servía para nada más, que
 * es justo lo contrario de lo que se le pide: el Operador entra aquí para
 * comparar —quién produce, quién se ha apagado, quién tiene la red rota, a quién
 * le debo dinero— y comparar entre tarjetas obliga a recordar la anterior
 * mientras se lee la siguiente.
 *
 * Una tabla contesta las cuatro de un vistazo. Y el detalle no se pierde: cada
 * fila abre su ficha, que es donde caben las veinte columnas que aquí no caben.
 *
 * ── LO QUE DECIDE EL ORDEN ──
 *
 * Activos primero y dentro por lo devengado (`ordenarAgentes`). Los suspendidos
 * no se esconden —hay que poder reactivarlos— pero bajan, porque un agente
 * suspendido no compite por la atención con uno que está produciendo.
 */

export const dynamic = "force-dynamic";

export default async function Agentes() {
  if (!(await exigirAdmin())) return <Cerrada />;

  const agentes = await plantillaDeAgentes();

  if (agentes.length === 0) {
    return (
      <>
        <h1 style={{ fontSize: "1.3125rem", fontWeight: 600 }}>Agentes</h1>
        <p className="apoyo" style={{ marginTop: "0.6rem" }}>
          Sin agentes registrados. Los códigos de activación se generan con <code>/codigo</code>{" "}
          en el bot.
        </p>
      </>
    );
  }

  const activos = agentes.filter((a) => a.estado === "ACTIVO").length;
  const webmasters = agentes.reduce((s, a) => s + a.webmasters.total, 0);
  const conProblemas = agentes.filter((a) => problemasDeRed(a.webmasters).length > 0).length;
  const porCobrar = agentes.reduce((s, a) => s + a.retiroPendienteMicros, 0n);

  return (
    <>
      <h1 style={{ fontSize: "1.3125rem", fontWeight: 600, letterSpacing: "-0.015em" }}>
        Agentes
      </h1>
      <p className="apoyo" style={{ marginTop: "0.35rem", maxWidth: "62ch" }}>
        {agentes.length} en total, {activos} activos, {webmasters} webmasters entre todos.{" "}
        {conProblemas > 0 ? (
          <span className="vivo">
            {conProblemas} {conProblemas === 1 ? "tiene" : "tienen"} algo que mirar en su red.
          </span>
        ) : (
          "Ninguna red tiene incidencias."
        )}{" "}
        Cada activación concede un año de PRO; el único freno es suspender al agente.
      </p>

      {porCobrar > 0n && (
        <p className="apoyo" style={{ marginTop: "0.4rem" }}>
          <Importe micros={porCobrar} /> pendientes de pagar.{" "}
          <Link href="/admin/retiros">Ver retiros</Link>.
        </p>
      )}

      <div className="tabla-marco" style={{ marginTop: "1.75rem" }}>
        <table className="densa">
          <thead>
            <tr>
              <th>Agente</th>
              <th>Estado</th>
              <th className="num">Red</th>
              <th className="num">Con PRO</th>
              <th className="num secundaria">Altas mes</th>
              <th className="num">Registros 14 d</th>
              <th className="num">Devengado</th>
              <th className="num">Disponible</th>
              <th className="num">Por pagar</th>
              <th>Incidencias en su red</th>
            </tr>
          </thead>
          <tbody>
            {agentes.map((a) => {
              const avisos = problemasDeRed(a.webmasters);
              return (
                <tr key={a.id} style={{ opacity: a.estado === "ACTIVO" ? 1 : 0.72 }}>
                  <td className="ancla">
                    <Link href={`/admin/agentes/${a.id}`} style={{ textDecoration: "none" }}>
                      {a.nombre}
                    </Link>
                    <span className="apoyo mono" style={{ display: "block", fontSize: "0.75rem" }}>
                      {a.email}
                    </span>
                  </td>
                  <td data-etiqueta="Estado">
                    <Senales>
                      <EstadoAgente estado={a.estado} />
                      {(a.cpaPropiaMicros !== null || a.cpsPropiaBps !== null) && (
                        <Senal tono="atencion">tarifa propia</Senal>
                      )}
                    </Senales>
                  </td>
                  <td className="num" data-etiqueta="Red">
                    <Num valor={a.webmasters.total} />
                  </td>
                  <td className="num" data-etiqueta="Con PRO">
                    <Num valor={a.webmasters.conPro} />
                  </td>
                  <td className="num secundaria" data-etiqueta="Altas mes">
                    <Num valor={a.altasDelMes} />
                  </td>
                  <td className="num" data-etiqueta="Registros 14 d">
                    <Num valor={a.registrosVentana} />
                  </td>
                  {/* `cabeza`: en el móvil sube a la primera línea, junto al nombre.
                      Es la cifra con la que se comparan los agentes entre sí, y
                      es la que hay que poder recorrer en vertical sin leer nada
                      más. */}
                  <td className="num cabeza" data-etiqueta="Devengado">
                    <Importe micros={a.saldos.devengadoMicros} />
                  </td>
                  <td className="num" data-etiqueta="Disponible">
                    <Importe micros={a.saldos.disponibleMicros} />
                  </td>
                  <td className="num" data-etiqueta="Por pagar">
                    {a.retiroPendienteMicros > 0n ? (
                      <Link href="/admin/retiros" style={{ textDecoration: "none" }}>
                        <Importe micros={a.retiroPendienteMicros} className="vivo" />
                      </Link>
                    ) : (
                      <span className="nulo">—</span>
                    )}
                  </td>
                  {/* `linea-propia`: en el móvil se lleva su renglón entero. Es lo
                      más urgente de la fila y compartiendo línea con «Disponible
                      384,00 $» quedaba de coletilla, leído lo último. */}
                  <td className="linea-propia" data-etiqueta="Incidencias">
                    {avisos.length === 0 ? (
                      <span className="nulo">—</span>
                    ) : (
                      /* Sin cajas: las incidencias se separan con un punto medio
                         y todas en rojo. Apiladas en píldoras estiraban la fila
                         y dejaban un hueco en blanco de tres renglones en la
                         parte visible de la tabla. */
                      <Senales>
                        {avisos.map((t) => (
                          <Senal key={t} tono="problema">
                            {t}
                          </Senal>
                        ))}
                      </Senales>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/*
        Las acciones se quedan FUERA de la tabla y agrupadas debajo.
        Un botón «Suspender» por fila, a diez filas de distancia de su nombre,
        es la forma más fácil de suspender al agente equivocado. Aquí cada
        bloque lleva el nombre pegado al botón.
      */}
      <section style={{ marginTop: "2.5rem" }}>
        <p
          className="rotulo"
          style={{ borderBottom: "1px solid var(--p-borde)", paddingBottom: "0.5rem" }}
        >
          Acciones
        </p>
        <div
          style={{
            marginTop: "1rem",
            display: "grid",
            /* `min(...)`: un mínimo de 25rem fijo son 400 px, y en una pantalla
               de 390 la columna no cabía —la página entera se salía por la
               derecha y los botones quedaban cortados—. Con el mínimo topado al
               ancho disponible, cae a una columna en vez de desbordar. */
            gridTemplateColumns: "repeat(auto-fill, minmax(min(25rem, 100%), 1fr))",
            gap: "0.75rem 1.5rem",
          }}
        >
          {agentes.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                paddingBottom: "0.6rem",
                borderBottom: "1px solid var(--p-borde)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 550, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {a.nombre}
                </p>
                {/* La línea SÍ envuelve —si no, en un móvil se salía por debajo
                    del filete—; lo que no se parte es la fecha, que leída como
                    `2026-08-` y `19` en dos renglones parecen dos datos. */}
                <p className="apoyo" style={{ fontSize: "0.8125rem" }}>
                  <span style={{ whiteSpace: "nowrap" }}>desde {dia(a.creadoEn)}</span> ·{" "}
                  <span style={{ whiteSpace: "nowrap" }}>
                    {a.sesionesVivas} {a.sesionesVivas === 1 ? "sesión viva" : "sesiones vivas"}
                  </span>
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
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
                  <button
                    type="submit"
                    className="boton"
                    title="Exige iniciar sesión de nuevo con el correo"
                    disabled={a.sesionesVivas === 0}
                  >
                    Expulsar
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
