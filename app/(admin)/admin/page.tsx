import Link from "next/link";

import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/auth/admin";
import { formatearMicros } from "@/lib/devengo/dinero";
import { Cerrada } from "./_piezas/Cerrada";

/**
 * Panel: la contabilidad del superadmin.
 *
 * Responde tres preguntas, en este orden:
 *
 *  1. **¿Cuánto me queda a mí?** Lo que entra de Sophon menos lo que devengan
 *     los agentes. Es la única cifra de toda la aplicación que nadie más puede
 *     ver, y va marcada como privada para que se sepa antes de compartir una
 *     captura.
 *  2. **¿Tengo algo que pagar?** Los retiros no se resuelven solos.
 *  3. **¿Me puedo fiar de estos números?** Si el barrido falló o la
 *     conciliación no cuadra, el margen de arriba está mal y hay que decirlo
 *     ANTES, no en una nota al pie.
 */

export const dynamic = "force-dynamic";

export default async function Panel() {
  if (!(await exigirAdmin())) return <Cerrada />;

  const [entradas, devengado, retiros, agentes, webmasters, sincronizaciones, conciliacion] =
    await Promise.all([
      db.filaDiariaSophon.aggregate({
        _sum: { gananciaSuperadminMicros: true, gananciaTotalMicros: true },
      }),
      db.asientoComision.aggregate({
        where: { estado: { not: "ANULADO" }, tipo: { not: "RETIRO" } },
        _sum: { importeMicros: true },
      }),
      db.solicitudRetiro.groupBy({
        by: ["estado"],
        _sum: { importeMicros: true },
        _count: true,
      }),
      db.agente.count({ where: { estado: "ACTIVO" } }),
      db.webmaster.count({ where: { desaparecidoEn: null } }),
      // La última ejecución de cada tipo: un barrido parado es la causa más
      // probable de que una cifra de esta página esté vieja.
      db.ejecucionSync.findMany({
        orderBy: { iniciadaEn: "desc" },
        take: 20,
        select: { tipo: true, estado: true, iniciadaEn: true, terminadaEn: true, error: true },
      }),
      db.conciliacion.findFirst({ orderBy: { fecha: "desc" } }),
    ]);

  // Sin tarifa en vigor el motor no emite un solo asiento, y eso NO se parece a
  // un fallo desde aquí: los barridos salen en verde, las filas diarias entran,
  // y el margen de abajo —que es entradas menos devengado— sale al 100 %. Es
  // decir, la página se lee como un mes excelente justo cuando ningún agente
  // está cobrando nada. Por eso se comprueba aquí y se avisa arriba del todo.
  const hayTarifa = (await db.tarifaVersion.count({ where: { validaHasta: null } })) > 0;

  const entradasMicros = entradas._sum.gananciaSuperadminMicros ?? 0n;
  const devengadoMicros = devengado._sum.importeMicros ?? 0n;
  const margenMicros = entradasMicros - devengadoMicros;

  const porEstado = (e: string) => retiros.find((r) => r.estado === e);
  const pendientes = porEstado("SOLICITADO");
  const aprobados = porEstado("APROBADO");
  const pagados = porEstado("PAGADO");
  const porPagarMicros =
    (pendientes?._sum.importeMicros ?? 0n) + (aprobados?._sum.importeMicros ?? 0n);
  const porPagarCuenta = (pendientes?._count ?? 0) + (aprobados?._count ?? 0);

  const ultimaPorTipo = new Map<string, (typeof sincronizaciones)[number]>();
  for (const s of sincronizaciones) if (!ultimaPorTipo.has(s.tipo)) ultimaPorTipo.set(s.tipo, s);
  const rotas = [...ultimaPorTipo.values()].filter((s) => s.estado === "FALLIDA");

  return (
    <>
      {/* Las advertencias van ARRIBA. Un margen calculado sobre datos a medio
          sincronizar es un número equivocado, y avisarlo debajo de la cifra
          llega tarde: para entonces ya se ha leído y creído. */}
      {(rotas.length > 0 || !hayTarifa || (conciliacion && !conciliacion.cuadra)) && (
        <div className="privado" style={{ marginBottom: "1.75rem" }}>
          <p className="rotulo vivo">Cifras no fiables</p>
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem", fontSize: "0.875rem", lineHeight: 1.6 }}>
            {/* Primero, porque es el único de la lista que hace que el margen de
                abajo sea entero mentira en vez de estar solo desactualizado. */}
            {!hayTarifa && (
              <li>
                <strong>No hay tarifa en vigor</strong>: los barridos no devengan y los
                agentes ven 0,00 $. El margen inferior aparece al 100 % por esa causa.{" "}
                <Link href="/admin/tarifas">Configurar tarifa</Link>.
              </li>
            )}
            {rotas.map((s) => (
              <li key={s.tipo}>
                Barrido de {s.tipo.toLowerCase()}: fallido el {fecha(s.iniciadaEn)}
                {s.error ? `: ${s.error.slice(0, 120)}` : ""}.
              </li>
            ))}
            {/* La consecuencia va en la línea, no sobreentendida. Un descuadre
                sin decir qué hacer con él se lee como una nota informativa, y lo
                que este aviso existe para evitar es que se resuelva un retiro
                sobre un libro que no cuadra. */}
            {conciliacion && !conciliacion.cuadra && (
              <li>
                Conciliación del {fecha(conciliacion.fecha)}: descuadre de{" "}
                {formatearMicros(conciliacion.descuadreMicros)}. No se deben resolver retiros
                hasta cuadrarla.
              </li>
            )}
          </ul>
        </div>
      )}

      <section className="privado" style={{ marginBottom: "2.5rem" }}>
        <p className="rotulo">Margen · privado</p>
        <p
          style={{
            fontSize: "3rem",
            fontWeight: 620,
            letterSpacing: "-0.035em",
            fontVariantNumeric: "tabular-nums",
            margin: "0.25rem 0 0",
          }}
        >
          {formatearMicros(margenMicros)}
        </p>
        <p className="apoyo" style={{ marginTop: "0.4rem" }}>
          {formatearMicros(entradasMicros)} de Sophon − {formatearMicros(devengadoMicros)}{" "}
          devengado por los agentes. No aparece en ninguna pantalla de agente.
        </p>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <p className="rotulo" style={{ borderBottom: "1px solid var(--p-borde)", paddingBottom: "0.5rem" }}>
          Situación
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))",
            gap: "1.25rem 2rem",
            marginTop: "1rem",
          }}
        >
          <Dato
            etiqueta="Por pagar"
            valor={formatearMicros(porPagarMicros)}
            apoyo={
              porPagarCuenta > 0
                ? `${porPagarCuenta} ${porPagarCuenta === 1 ? "solicitud" : "solicitudes"}`
                : "Sin solicitudes"
            }
            urgente={porPagarCuenta > 0}
            href={porPagarCuenta > 0 ? "/admin/retiros" : undefined}
          />
          <Dato
            etiqueta="Ya pagado"
            valor={formatearMicros(pagados?._sum.importeMicros ?? 0n)}
            apoyo={`${pagados?._count ?? 0} en total`}
          />
          <Dato etiqueta="Agentes activos" valor={String(agentes)} href="/admin/agentes" />
          <Dato etiqueta="Webmasters" valor={String(webmasters)} apoyo="activos en Sophon" />
        </div>
      </section>

      <section>
        <p className="rotulo" style={{ borderBottom: "1px solid var(--p-borde)", paddingBottom: "0.5rem" }}>
          Barridos
        </p>
        {ultimaPorTipo.size === 0 ? (
          <p className="apoyo" style={{ marginTop: "0.9rem" }}>
            Sin ejecuciones registradas. El planificador está en Skyway.
          </p>
        ) : (
          <table style={{ marginTop: "0.9rem" }}>
            <thead>
              <tr>
                <th>Tarea</th>
                <th>Estado</th>
                <th>Última ejecución</th>
              </tr>
            </thead>
            <tbody>
              {[...ultimaPorTipo.values()].map((s) => (
                <tr key={s.tipo}>
                  <td>{s.tipo.toLowerCase()}</td>
                  <td className={s.estado === "FALLIDA" ? "vivo" : undefined}>
                    {s.estado.toLowerCase()}
                  </td>
                  <td className="apoyo">{fecha(s.terminadaEn ?? s.iniciadaEn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function Dato({
  etiqueta,
  valor,
  apoyo,
  urgente = false,
  href,
}: {
  etiqueta: string;
  valor: string;
  apoyo?: string;
  urgente?: boolean;
  href?: string;
}) {
  const cuerpo = (
    <>
      <p className="rotulo">{etiqueta}</p>
      <p
        className={urgente ? "vivo" : undefined}
        style={{
          fontSize: "1.5rem",
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          margin: "0.2rem 0 0",
        }}
      >
        {valor}
      </p>
      {apoyo && <p className="apoyo" style={{ marginTop: "0.15rem" }}>{apoyo}</p>}
    </>
  );

  return href ? (
    <Link href={href} style={{ textDecoration: "none" }}>
      {cuerpo}
    </Link>
  ) : (
    <div>{cuerpo}</div>
  );
}

function fecha(d: Date): string {
  return d.toISOString().slice(0, 16).replace("T", " ");
}
