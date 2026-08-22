import Link from "next/link";
import { notFound } from "next/navigation";

import { exigirAdmin } from "@/lib/auth/admin";
import { fichaDeAgente, problemasDeRed, DIAS_VENTANA } from "@/lib/admin/control";
import { cambiarEstadoAgente, cortarSesiones } from "../../acciones";
import { Cerrada } from "../../_piezas/Cerrada";
import { Importe } from "../../_piezas/Importe";
import { TablaWebmasters } from "../../_piezas/TablaWebmasters";
import {
  Correo,
  Senal,
  Senales,
  Dato,
  EstadoAgente,
  Num,
  Seccion,
  dia,
  momento,
} from "../../_piezas/Control";

/**
 * La ficha de un agente: todo lo que la aplicación sabe de él.
 *
 * Existe porque la plantilla contesta «cómo van todos» y esta contesta «qué pasa
 * con este», y son preguntas distintas: la primera necesita comparar diez filas
 * y la segunda necesita el detalle que en diez filas no cabe —cada webmaster con
 * su estado, su PRO y su tráfico; cada retiro; cada alta que Sophon rechazó;
 * desde qué sesiones entra—.
 *
 * El orden de la página es el orden en que se preguntan las cosas cuando algo va
 * mal: primero si el agente está bien, luego cuánto dinero hay en juego, luego
 * su red al detalle, y al final el rastro —retiros, rechazos, sesiones,
 * auditoría— que solo se mira cuando hay que reconstruir qué pasó.
 */

export const dynamic = "force-dynamic";

export default async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  if (!(await exigirAdmin())) return <Cerrada />;

  const { id } = await params;
  const ficha = await fichaDeAgente(id);
  if (!ficha) notFound();

  const { agente: a, webmasters, desglose, retiros, intentosFallidos, sesiones, auditoria } = ficha;
  const avisos = problemasDeRed(a.webmasters);
  const r = a.webmasters;

  return (
    <>
      <p className="apoyo" style={{ marginBottom: "0.75rem" }}>
        <Link href="/admin/agentes">← Agentes</Link>
      </p>

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1.5rem",
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 620,
              letterSpacing: "-0.025em",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              flexWrap: "wrap",
            }}
          >
            {a.nombre}
            <EstadoAgente estado={a.estado} />
          </h1>
          <p className="apoyo mono" style={{ marginTop: "0.3rem" }}>
            {a.email}
          </p>
          <p className="apoyo" style={{ marginTop: "0.15rem" }}>
            {a.telegramUsuario ? `@${a.telegramUsuario}` : "sin Telegram vinculado"}
            {a.telegramId && <span className="mono"> · {a.telegramId}</span>} · idioma {a.idioma} ·
            alta {dia(a.creadoEn)}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
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
            <button type="submit" className="boton" disabled={a.sesionesVivas === 0}>
              Expulsar sus sesiones ({a.sesionesVivas})
            </button>
          </form>
        </div>
      </header>

      {/* Lo que hay que mirar va arriba y en una línea. Enterrado bajo las
          cifras de dinero llegaría después de haber decidido. */}
      {avisos.length > 0 && (
        <p style={{ marginTop: "1.25rem" }}>
          <Senales>
            {avisos.map((t) => (
              <Senal key={t} tono="problema">
                {t}
              </Senal>
            ))}
          </Senales>
        </p>
      )}

      {(a.cpaPropiaMicros !== null || a.cpsPropiaBps !== null) && (
        <p className="apoyo" style={{ marginTop: "1rem" }}>
          <strong>Tarifa propia.</strong> Este agente no cobra la tarifa general:{" "}
          {a.cpaPropiaMicros !== null && (
            <>
              CPA <Importe micros={a.cpaPropiaMicros} /> por registro
            </>
          )}
          {a.cpaPropiaMicros !== null && a.cpsPropiaBps !== null && " · "}
          {a.cpsPropiaBps !== null && <>CPS {(a.cpsPropiaBps / 100).toFixed(2)} %</>}. Sus importes
          no se comparan con los de los demás.
        </p>
      )}

      <Seccion
        titulo="Dinero"
        apoyo={
          <>
            Lo devengado no baja al cobrar y lo disponible ya lleva descontados los retiros. La
            misma aritmética que ve el agente en su Escalera.
          </>
        }
      >
        <div className="rejilla">
          <Dato etiqueta="Devengado" valor={<Importe micros={a.saldos.devengadoMicros} />} />
          <Dato etiqueta="Disponible" valor={<Importe micros={a.saldos.disponibleMicros} />} />
          <Dato
            etiqueta="Solicitado"
            valor={<Importe micros={a.saldos.solicitadoMicros} />}
            apoyo={
              a.retirosPendientes > 0
                ? `${a.retirosPendientes} sin resolver`
                : "nada pendiente"
            }
            tono={a.retirosPendientes > 0 ? "problema" : undefined}
            href={a.retirosPendientes > 0 ? "/admin/retiros" : undefined}
          />
          <Dato etiqueta="Pagado" valor={<Importe micros={a.saldos.pagadoMicros} />} />
        </div>

        <div className="rejilla" style={{ marginTop: "1.5rem" }}>
          <Dato
            etiqueta="Por registros (CPA)"
            valor={<Importe micros={desglose.registrosMicros} />}
            pequena
          />
          <Dato
            etiqueta="Por PRO (CPS)"
            valor={<Importe micros={desglose.proMicros} />}
            pequena
          />
          <Dato
            etiqueta="Bonos"
            valor={<Importe micros={desglose.bonosMicros} />}
            pequena
          />
          <Dato
            etiqueta="Ajustes"
            valor={<Importe micros={desglose.ajustesMicros} />}
            apoyo="reversos de Sophon y correcciones"
            pequena
          />
        </div>
      </Seccion>

      <Seccion
        titulo="Su red"
        apoyo={`${r.total} webmasters. Los registros son de los últimos ${DIAS_VENTANA} días.`}
      >
        <div className="rejilla">
          <Dato etiqueta="Activos" valor={<Num valor={r.activos} />} />
          <Dato
            etiqueta="Sin confirmar"
            valor={<Num valor={r.sinConfirmar} />}
            apoyo="Sophon aún no los publica"
            tono={r.sinConfirmar > 0 ? "problema" : undefined}
          />
          <Dato
            etiqueta="Bloqueados"
            valor={<Num valor={r.bloqueados} />}
            tono={r.bloqueados > 0 ? "problema" : undefined}
          />
          <Dato
            etiqueta="Baja programada"
            valor={<Num valor={r.pendientesBorrado} />}
            tono={r.pendientesBorrado > 0 ? "problema" : undefined}
          />
          <Dato
            etiqueta="Desaparecidos"
            valor={<Num valor={r.desaparecidos} />}
            apoyo="ya no están en el árbol"
            tono={r.desaparecidos > 0 ? "problema" : undefined}
          />
          <Dato etiqueta="Con PRO vigente" valor={<Num valor={r.conPro} />} />
          <Dato
            etiqueta="Nunca tuvo PRO"
            valor={<Num valor={r.nuncaTuvoPro} />}
            apoyo="alta a medias"
            tono={r.nuncaTuvoPro > 0 ? "problema" : undefined}
          />
          <Dato
            etiqueta="PRO caducado"
            valor={<Num valor={r.proCaducado} />}
            apoyo="renovable hoy"
            tono={r.proCaducado > 0 ? "problema" : undefined}
          />
          <Dato
            etiqueta="Parados"
            valor={<Num valor={r.parados} />}
            apoyo={`sin registros en ${DIAS_VENTANA} días`}
          />
          <Dato etiqueta={`Registros ${DIAS_VENTANA} d`} valor={<Num valor={a.registrosVentana} />} />
          <Dato etiqueta="Usuarios de pago" valor={<Num valor={a.usuariosPagoVentana} />} />
          <Dato
            etiqueta="Altas"
            valor={<Num valor={a.altasTotales} />}
            apoyo={`${a.altasDelMes} este mes · ${a.altasFallidas} rechazadas`}
          />
        </div>
      </Seccion>

      <Seccion
        titulo="Webmasters"
        apoyo={
          ficha.webmastersTotal > webmasters.length
            ? `Se muestran ${webmasters.length} de ${ficha.webmastersTotal}. El resto, en la tabla general con filtros.`
            : undefined
        }
      >
        <TablaWebmasters filas={webmasters} conAgente={false} />
      </Seccion>

      <Seccion titulo="Retiros">
        {retiros.length === 0 ? (
          <p className="apoyo">No ha pedido ninguno.</p>
        ) : (
          <div className="tabla-marco">
            <table className="densa">
              <thead>
                <tr>
                  <th>Solicitado</th>
                  <th className="num">Importe</th>
                  <th>Red</th>
                  <th>Wallet</th>
                  <th>Estado</th>
                  <th>Resuelto</th>
                  <th>Motivo / referencia</th>
                </tr>
              </thead>
              <tbody>
                {retiros.map((s) => (
                  <tr key={s.id}>
                    <td className="ancla mono">{momento(s.solicitadoEn)}</td>
                    <td className="num cabeza" data-etiqueta="Importe">
                      <Importe micros={s.importeMicros} />
                    </td>
                    <td data-etiqueta="Red">{s.red}</td>
                    <td
                      className="mono linea-propia"
                      data-etiqueta="Wallet"
                      style={{ maxWidth: "16ch", overflow: "hidden", textOverflow: "ellipsis" }}
                      title={s.wallet}
                    >
                      {s.wallet}
                    </td>
                    <td data-etiqueta="Estado">
                      <Senal
                        tono={
                          s.estado === "PAGADO"
                            ? "bien"
                            : s.estado === "RECHAZADO" || s.estado === "CANCELADO"
                              ? "problema"
                              : "atencion"
                        }
                      >
                        {s.estado.toLowerCase()}
                      </Senal>
                    </td>
                    <td className="mono" data-etiqueta="Resuelto">
                      {momento(s.resueltoEn)}
                    </td>
                    <td className="apoyo linea-propia" data-etiqueta="Motivo / referencia">
                      {s.motivo ?? s.referenciaPago ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>

      {/* La explicación solo cuando hay algo que explicar: encima de un
          «Ninguna» se lee como un preámbulo a nada. */}
      <Seccion
        titulo="Altas rechazadas"
        apoyo={
          intentosFallidos.length > 0
            ? "Lo que Sophon contestó, tal cual. Es lo único que explica por qué un agente insiste con un correo que no entra."
            : undefined
        }
      >
        {intentosFallidos.length === 0 ? (
          <p className="apoyo">Ninguna. Todas sus altas entraron a la primera.</p>
        ) : (
          <div className="tabla-marco">
            <table className="densa">
              <thead>
                <tr>
                  <th>Correo</th>
                  <th>Cuándo</th>
                  <th className="num">Código</th>
                  <th>Respuesta de Sophon</th>
                </tr>
              </thead>
              <tbody>
                {intentosFallidos.map((i) => (
                  <tr key={i.id}>
                    {/* El correo abre la fila y no la fecha: lo que se busca aquí
                        es «qué pasa con esta dirección», y la hora solo sitúa.
                        Además `ancla` fija la columna al desplazar la tabla, y una
                        columna fijada que no es la primera se pinta encima de la
                        que sí lo es. */}
                    <td className="ancla">
                      <Correo valor={i.email} />
                    </td>
                    <td className="mono" data-etiqueta="Cuándo">
                      {momento(i.creadoEn)}
                    </td>
                    <td className="num cabeza" data-etiqueta="Código">
                      {i.codigoRespuesta ?? "—"}
                    </td>
                    <td className="apoyo linea-propia" data-etiqueta="Respuesta de Sophon">
                      {i.mensaje ?? "sin mensaje"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>

      <Seccion titulo="Sesiones abiertas">
        {sesiones.length === 0 ? (
          <p className="apoyo">Ninguna sesión viva.</p>
        ) : (
          <div className="tabla-marco">
            <table className="densa">
              <thead>
                <tr>
                  <th>Abierta</th>
                  <th>Último uso</th>
                  <th>Caduca</th>
                  <th>IP</th>
                  <th>Navegador</th>
                </tr>
              </thead>
              <tbody>
                {sesiones.map((s) => (
                  <tr key={s.id}>
                    <td className="ancla mono">{momento(s.emitidaEn)}</td>
                    <td className="mono" data-etiqueta="Último uso">
                      {momento(s.ultimoUsoEn)}
                    </td>
                    <td className="mono" data-etiqueta="Caduca">
                      {momento(s.expiraEn)}
                    </td>
                    <td className="mono" data-etiqueta="IP">
                      {s.ip ?? "—"}
                    </td>
                    <td
                      data-etiqueta="Navegador"
                      className="apoyo linea-propia"
                      style={{ maxWidth: "40ch", overflow: "hidden", textOverflow: "ellipsis" }}
                      title={s.agenteUsuario ?? ""}
                    >
                      {s.agenteUsuario ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>

      <Seccion titulo="Últimos movimientos" apoyo="Lo que ha hecho este agente, del más reciente.">
        {auditoria.length === 0 ? (
          <p className="apoyo">Sin actividad registrada.</p>
        ) : (
          <div className="tabla-marco">
            <table className="densa">
              <thead>
                <tr>
                  <th>Acción</th>
                  <th>Cuándo</th>
                  <th>Sobre</th>
                </tr>
              </thead>
              <tbody>
                {auditoria.map((x) => (
                  <tr key={x.id}>
                    {/* La acción abre la fila: es lo que se lee, y la hora la
                        sitúa. Y `ancla` tiene que ir en la primera columna, que es
                        la que se queda fija al desplazar. */}
                    <td className="ancla">{x.accion}</td>
                    <td className="mono" data-etiqueta="Cuándo">
                      {momento(x.creadoEn)}
                    </td>
                    <td className="mono apoyo linea-propia" data-etiqueta="Sobre">
                      {x.recurso ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>
    </>
  );
}
