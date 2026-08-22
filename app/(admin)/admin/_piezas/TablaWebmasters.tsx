import Link from "next/link";

import type { FilaWebmaster } from "@/lib/admin/control";
import { DIAS_VENTANA } from "@/lib/admin/control";
import { Importe } from "./Importe";
import { EstadoWebmaster, Num, Senal, Senales, SenalPro, Serie, dia } from "./Control";

/**
 * El origen, en una palabra.
 *
 * Salía del enum en crudo —«vinculado app»— y partía la columna en dos líneas
 * en toda la tabla. Lo que hay que distinguir son tres cosas y ninguna necesita
 * dos palabras: lo captó un agente, se lo asignó el Operador a mano, o venía del
 * árbol de antes.
 */
const ORIGEN: Record<string, string> = {
  VINCULADO_APP: "app",
  ASIGNADO_MANUAL: "manual",
  HUERFANO: "huérfano",
};

/**
 * Un webmaster por fila, con todo lo que la aplicación sabe de él.
 *
 * ── LA MISMA TABLA EN DOS SITIOS, A PROPÓSITO ──
 *
 * La usan la ficha del agente y la tabla general. Podrían ser dos tablas
 * distintas —una no necesita la columna del agente— y serían dos tablas que
 * empiezan iguales y acaban distintas: la primera vez que se añada una columna,
 * una de las dos se queda sin ella. `conAgente` es la única diferencia real, así
 * que es el único parámetro.
 *
 * ── POR QUÉ CABEN QUINCE COLUMNAS ──
 *
 * Porque la pregunta del Operador no es «cómo va este webmaster» sino «cuál de
 * estos sesenta tiene algo raro», y eso se contesta barriendo columnas, no
 * abriendo fichas. La tabla desborda a lo ancho en pantallas pequeñas y se
 * desplaza: preferible a esconder la mitad de los datos tras un desplegable en
 * una herramienta que se usa en un escritorio.
 *
 * El orden de las columnas es el orden de las preguntas: quién es, si está bien,
 * si tiene PRO, si produce, y cuánto vale. Lo administrativo —fechas de origen—
 * al final, porque solo se mira cuando algo ya no cuadra.
 */

export function TablaWebmasters({
  filas,
  conAgente,
}: {
  filas: readonly FilaWebmaster[];
  conAgente: boolean;
}) {
  if (filas.length === 0) {
    return (
      <p className="apoyo">
        Ningún webmaster con estos criterios. Los agentes los activan desde la Mini App o con{" "}
        <code>/activar</code> en el bot.
      </p>
    );
  }

  // Escala común para todas las series: normalizar cada fila a su propio máximo
  // haría que dos y doscientos registros dibujaran la misma silueta.
  const maximo = filas.reduce((m, f) => Math.max(m, ...f.serie), 0);

  return (
    <div className="tabla-marco">
      <table className="densa">
        <thead>
          <tr>
            <th>Webmaster</th>
            {conAgente && <th>Agente</th>}
            <th>Estado</th>
            <th>PRO</th>
            <th>Actividad</th>
            <th className="num">{DIAS_VENTANA} d</th>
            <th className="num">Total</th>
            <th className="num secundaria">Pago</th>
            <th className="num">Parado</th>
            <th className="num">Ganado</th>
            <th className="secundaria">Origen</th>
            <th>Alta</th>
            <th className="secundaria">Devenga</th>
            <th className="secundaria">Visto</th>
            <th className="secundaria">UID</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((w) => (
            <tr key={w.id}>
              <td className="ancla mono" style={{ maxWidth: "24ch" }}>
                <span
                  style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis" }}
                  title={w.email}
                >
                  {w.email}
                </span>
              </td>

              {conAgente && (
                <td data-etiqueta="Agente">
                  {w.agenteId ? (
                    <Link href={`/admin/agentes/${w.agenteId}`} style={{ textDecoration: "none" }}>
                      {w.agenteNombre}
                    </Link>
                  ) : (
                    /* Sin agente es el árbol del Operador: existía en Sophon
                       antes que la aplicación y no lo captó nadie. No es un
                       fallo, pero sí es lo que decide que no se pueda dar de
                       alta. */
                    <Senal tono="atencion">del Operador</Senal>
                  )}
                </td>
              )}

              <td data-etiqueta="Estado">
                <EstadoWebmaster estado={w.estado} />
              </td>

              {/* `nowrap`, por lo mismo que las incidencias de la plantilla: la
                  tabla ya se desplaza a lo ancho, así que apilar las chapas aquí
                  no ahorra nada y estira la fila. El webmaster con seis
                  concesiones abría tres renglones en blanco en la parte visible. */}
              <td data-etiqueta="PRO">
                <Senales>
                  <SenalPro diasDePro={w.diasDePro} proVigenteHasta={w.proVigenteHasta} />
                {/* Más de una concesión sobre el mismo webmaster es la huella de
                    haberle llamado a `setmembership` varias veces, que es la
                    llamada que la regla de vigencia existe para no repetir. */}
                  {w.concesiones > 1 && (
                    <Senal tono="atencion">{w.concesiones} concesiones</Senal>
                  )}
                  {w.concesionesDeducidas > 0 && <Senal tono="atencion">fecha deducida</Senal>}
                  {w.concesionesFallidas > 0 && (
                    <Senal tono="problema">{w.concesionesFallidas} fallidas</Senal>
                  )}
                </Senales>
              </td>

              <td data-etiqueta="Actividad">
                <Serie valores={w.serie} maximo={maximo} />
              </td>
              <td className="num" data-etiqueta={`${DIAS_VENTANA} d`}>
                <Num valor={w.registrosVentana} />
              </td>
              <td className="num" data-etiqueta="Total">
                <Num valor={w.registrosTotales} />
              </td>
              <td className="num secundaria" data-etiqueta="Pago">
                <Num valor={w.usuariosPagoVentana} />
              </td>
              <td className="num" data-etiqueta="Parado">
                {w.diasSinActividad === null ? (
                  /* Nunca trajo un registro. No es lo mismo que llevar parado
                     cuarenta días, y contarlo igual haría que cada alta reciente
                     apareciera como un problema al día siguiente. */
                  <span className="nulo" title="Nunca ha traído registros">
                    —
                  </span>
                ) : (
                  <span className={w.apagado ? "vivo" : undefined}>{w.diasSinActividad} d</span>
                )}
              </td>
              <td className="num" data-etiqueta="Ganado">
                <Importe micros={w.ganadoMicros} />
              </td>

              <td
                className="apoyo secundaria"
                data-etiqueta="Origen"
                style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}
              >
                {ORIGEN[w.origen] ?? w.origen.toLowerCase()}
              </td>
              <td className="mono apoyo" data-etiqueta="Alta">
                {dia(w.atribuidoEn)}
              </td>
              <td className="mono apoyo secundaria" data-etiqueta="Devenga">
                {dia(w.devengaDesde)}
              </td>
              <td className="mono apoyo secundaria" data-etiqueta="Visto">
                {dia(w.vistoPorUltimaVezEn)}
              </td>
              <td
                className="mono apoyo secundaria"
                data-etiqueta="UID"
                style={{ maxWidth: "12ch", overflow: "hidden", textOverflow: "ellipsis" }}
                title={w.uidSophon ?? ""}
              >
                {w.uidSophon ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
