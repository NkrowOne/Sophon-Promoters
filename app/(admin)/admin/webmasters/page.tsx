import Link from "next/link";

import { exigirAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import {
  webmastersDetallados,
  DIAS_VENTANA,
  TOPE_WEBMASTERS,
  type FiltroWebmasters,
} from "@/lib/admin/control";
import { Cerrada } from "../_piezas/Cerrada";
import { TablaWebmasters } from "../_piezas/TablaWebmasters";
import { Dato } from "../_piezas/Control";

/**
 * Todos los webmasters, de todos los agentes, en una sola tabla.
 *
 * ── POR QUÉ HACE FALTA SI YA ESTÁN EN LA FICHA DE CADA AGENTE ──
 *
 * Porque hay preguntas que cruzan agentes y que en las fichas hay que contestar
 * abriéndolas una a una: ¿quién se ha quedado sin PRO?, ¿cuántos hay bloqueados
 * en total?, ¿de quién es este correo que me acaban de pasar? La última es la
 * más frecuente y la que peor se contesta sin buscador.
 *
 * ── EL FILTRO VIVE EN LA URL ──
 *
 * Enlaces y un formulario `GET`, sin estado en el navegador. Un filtro en la URL
 * se puede pegar en un chat, marcar y recargar, y la página sigue siendo del
 * servidor entera: no hay una sola línea de JavaScript detrás de esta tabla.
 *
 * ── Y EL TOPE SE DICE ──
 *
 * Se enseñan como mucho `TOPE_WEBMASTERS` filas, y cuando hay más la página lo
 * escribe. Una tabla que corta en silencio se lee como «estos son todos», y
 * sobre esa lectura se decide mal.
 */

export const dynamic = "force-dynamic";

const FILTROS: { clave: NonNullable<FiltroWebmasters["estado"]>; texto: string }[] = [
  { clave: "todos", texto: "Todos" },
  { clave: "activos", texto: "Activos" },
  { clave: "problema", texto: "Con problema" },
  { clave: "sin-pro", texto: "Sin PRO vigente" },
  { clave: "sin-agente", texto: "Sin agente" },
];

export default async function Webmasters({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; agente?: string; busca?: string }>;
}) {
  if (!(await exigirAdmin())) return <Cerrada />;

  const q = await searchParams;
  const estado = (FILTROS.find((f) => f.clave === q.estado)?.clave ??
    "todos") as NonNullable<FiltroWebmasters["estado"]>;
  const busca = (q.busca ?? "").trim();

  const [resultado, agentes, resumen] = await Promise.all([
    webmastersDetallados({
      estado,
      agenteId: q.agente || undefined,
      busca: busca || undefined,
    }),
    db.agente.findMany({
      select: { id: true, nombreVisible: true },
      orderBy: { nombreVisible: "asc" },
    }),
    // El recuento total no depende del filtro: es el contexto que dice si «12
    // sin PRO» es una anécdota o es un tercio del programa.
    Promise.all([
      db.webmaster.count(),
      db.webmaster.count({ where: { agenteId: null } }),
      db.webmaster.count({ where: { proVigenteHasta: null } }),
      db.webmaster.count({
        where: {
          OR: [
            { estadoSophon: { in: ["BLOQUEADO", "PENDIENTE_BORRADO"] } },
            { desaparecidoEn: { not: null } },
          ],
        },
      }),
    ]),
  ]);

  const [total, sinAgente, nuncaTuvoPro, conProblema] = resumen;
  const agenteActual = agentes.find((a) => a.id === q.agente);
  const ocultosDelOperador = sinAgente;

  const enlace = (cambios: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      estado: estado === "todos" ? undefined : estado,
      agente: q.agente || undefined,
      busca: busca || undefined,
      ...cambios,
    };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const cadena = p.toString();
    return cadena ? `/admin/webmasters?${cadena}` : "/admin/webmasters";
  };

  return (
    <>
      <h1 style={{ fontSize: "1.3125rem", fontWeight: 600, letterSpacing: "-0.015em" }}>
        Webmasters
      </h1>
      <p className="apoyo" style={{ marginTop: "0.35rem", maxWidth: "62ch" }}>
        Los webmasters que lleva algún agente. Los registros y la serie son de los últimos{" "}
        {DIAS_VENTANA} días, la misma ventana que ve el agente en su Malla.
      </p>

      <div className="rejilla" style={{ marginTop: "1.5rem" }}>
        <Dato etiqueta="En total" valor={total.toLocaleString("es-ES")} />
        <Dato
          etiqueta="Sin agente"
          valor={sinAgente.toLocaleString("es-ES")}
          apoyo="fuera de la lista"
          href="/admin/webmasters?estado=sin-agente"
        />
        <Dato
          etiqueta="Nunca tuvo PRO"
          valor={nuncaTuvoPro.toLocaleString("es-ES")}
          tono={nuncaTuvoPro > 0 ? "problema" : undefined}
        />
        <Dato
          etiqueta="Con problema"
          valor={conProblema.toLocaleString("es-ES")}
          apoyo="bloqueado, con baja programada o desaparecido"
          tono={conProblema > 0 ? "problema" : undefined}
        />
      </div>

      <div
        style={{
          marginTop: "1.75rem",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <nav className="filtros" aria-label="Filtrar por estado">
          {FILTROS.map((f) => (
            <Link
              key={f.clave}
              href={enlace({ estado: f.clave === "todos" ? undefined : f.clave })}
              aria-current={estado === f.clave ? "page" : undefined}
            >
              {f.texto}
            </Link>
          ))}
        </nav>

        {/* Envuelve: en un móvil el desplegable, el buscador y el botón no caben
            en una línea, y sin esto el formulario empujaba la página entera. */}
        <form
          method="get"
          className="filtro-forma"
          style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}
        >
          {estado !== "todos" && <input type="hidden" name="estado" value={estado} />}
          <select name="agente" defaultValue={q.agente ?? ""} aria-label="Agente">
            <option value="">Todos los agentes</option>
            {agentes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombreVisible}
              </option>
            ))}
          </select>
          <input
            type="search"
            name="busca"
            defaultValue={busca}
            placeholder="Buscar correo"
            aria-label="Buscar por correo"
          />
          <button type="submit" className="boton">
            Filtrar
          </button>
          {(q.agente || busca || estado !== "todos") && (
            <Link href="/admin/webmasters" className="apoyo" style={{ marginLeft: "0.25rem" }}>
              Limpiar
            </Link>
          )}
        </form>
      </div>

      <p className="apoyo" style={{ marginTop: "1rem" }}>
        {resultado.total === 0
          ? "Ningún webmaster con estos criterios."
          : resultado.total > resultado.filas.length
            ? `Se muestran ${resultado.filas.length} de ${resultado.total}. Afina el filtro o busca por correo para ver el resto; el tope por consulta es de ${TOPE_WEBMASTERS}.`
            : `${resultado.total} ${resultado.total === 1 ? "webmaster" : "webmasters"}.`}
        {agenteActual && ` Filtrado por ${agenteActual.nombreVisible}.`}
        {/* El recorte se DICE. Una lista que se deja fuera medio árbol en
            silencio se lee como «estos son todos», y sobre esa lectura se
            cuenta mal. El enlace es la vuelta, no una nota al pie. */}
        {ocultosDelOperador > 0 && !busca && estado !== "sin-agente" && !q.agente && (
          <>
            {" "}
            {ocultosDelOperador} del árbol del Operador quedan fuera:{" "}
            <Link href={enlace({ estado: "sin-agente" })}>verlos</Link>. Buscar por correo los
            encuentra igual.
          </>
        )}
      </p>

      <div style={{ marginTop: "1rem" }}>
        <TablaWebmasters filas={resultado.filas} conAgente />
      </div>
    </>
  );
}
