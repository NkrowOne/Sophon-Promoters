import Link from "next/link";

import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/auth/admin";
import { formatearMicros } from "@/lib/devengo/dinero";
import { inicioDelDiaContable } from "@/lib/fechas";
import { hoyContable } from "@/lib/sync/registros";
import { DIAS_VENTANA_REVISION } from "@/lib/devengo/motor";
import { huecoDeDevengo, webmastersSinGanar } from "@/lib/devengo/sin-devengar";
import { repararDevengoPendiente } from "./acciones";
import { Cerrada } from "./_piezas/Cerrada";

/**
 * Panel: la contabilidad del Operador.
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
        _sum: { gananciaOperadorMicros: true, gananciaTotalMicros: true },
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
  /*
   * La tarifa, con sus IMPORTES y no solo su existencia.
   *
   * Se contaba si había una fila, y eso deja pasar el caso que trajo aquí: una
   * `TarifaVersion` con el CPA a cero existe —así que la alarma no saltaba— y no
   * paga un céntimo. Existir y pagar son dos cosas, y las dos hay que mirarlas.
   */
  const tarifa = await db.tarifaVersion.findFirst({
    where: { validaHasta: null },
    orderBy: { validaDesde: "desc" },
    select: { cpaPorRegistroMicros: true, cpsBps: true },
  });
  const hayTarifa = tarifa !== null;
  const tarifaACero =
    tarifa !== null && tarifa.cpaPorRegistroMicros === 0n && tarifa.cpsBps === 0;

  /*
   * Y la alarma que cubre a la de arriba, porque la de arriba no basta.
   *
   * «Hay tarifa» solo comprueba que EXISTA una fila. Una `TarifaVersion` con el
   * CPA a cero existe, así que no dispara nada y no paga nada. Y aunque la
   * tarifa esté bien, los días que pasaron mientras faltaba se quedan sin
   * devengar para siempre: el barrido solo repasa siete días hacia atrás.
   *
   * Esto no comprueba causas, comprueba el síntoma —filas con registros, con
   * agente y sin un solo asiento— así que cubre también las que aparezcan
   * mañana. Ver `lib/devengo/sin-devengar.ts`.
   */
  const hueco = await huecoDeDevengo();

  /*
   * Y el diagnóstico, que es lo que el recuento de arriba no puede dar.
   *
   * `huecoDeDevengo` cuenta lo REPARABLE, y por eso excluye las filas anteriores
   * a la atribución: devengar historia que el agente no trajo sería un error. Lo
   * que deja fuera es justo el caso más frecuente —un webmaster de alta hoy con
   * registros de ayer—, y ahí el panel se quedaba mudo mientras el agente veía
   * 0,00 $ con doce registros delante.
   *
   * Esto no busca lo reparable, busca lo que NO ESTÁ PAGANDO, y dice por qué.
   */
  const sinGanar = await webmastersSinGanar();
  const porAtribucion = sinGanar.filter((w) => w.motivo === "antes-del-alta");
  const sinAgente = sinGanar.filter((w) => w.motivo === "sin-agente");

  const entradasMicros = entradas._sum.gananciaOperadorMicros ?? 0n;
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

  /*
   * ¿Se ha leído lo que Sophon publicó en su último cierre?
   *
   * Sophon cierra su día a las 00:00 UTC+8 y es entonces cuando cambian las
   * cifras. Si desde ese instante no ha corrido ningún barrido de registros, lo
   * que se ve en esta página y en la de cada agente es de ayer, y no hay nada
   * que lo delate: los barridos anteriores salieron en verde y las cifras
   * parecen normales, solo que viejas.
   *
   * El planificador vive en Skyway y no hay nada en este repositorio que lo
   * configure, así que la única forma de que una línea de cron mal puesta —o que
   * nadie llegó a poner— sea visible es comprobarlo aquí. Es la misma disciplina
   * que la alarma de la tarifa ausente.
   */
  const ultimoCierre = inicioDelDiaContable(hoyContable());
  const ultimosRegistros = ultimaPorTipo.get("REGISTROS");
  const sinLeerElCierre =
    !ultimosRegistros || ultimosRegistros.iniciadaEn < ultimoCierre;

  return (
    <>
      {/* Las advertencias van ARRIBA. Un margen calculado sobre datos a medio
          sincronizar es un número equivocado, y avisarlo debajo de la cifra
          llega tarde: para entonces ya se ha leído y creído. */}
      {(rotas.length > 0 ||
        !hayTarifa ||
        tarifaACero ||
        hueco.filas > 0 ||
        porAtribucion.length > 0 ||
        sinLeerElCierre ||
        (conciliacion && !conciliacion.cuadra)) && (
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
            {/* Existir no es pagar. Una tarifa a cero pasaba la comprobación de
                arriba y dejaba a todos los agentes a 0,00 $ sin que nada lo
                dijera. */}
            {tarifaACero && (
              <li>
                <strong>La tarifa en vigor está a cero</strong>: 0,00 $ por registro y 0 % de
                las compras. Los barridos no devengan nada y los agentes ven 0,00 $.{" "}
                <Link href="/admin/tarifas">Corregir la tarifa</Link>.
              </li>
            )}
            {/* Detrás de la tarifa, porque cuando fallan las dos la tarifa es la
                causa y esto el efecto; y por delante de todo lo demás, porque es
                dinero que un agente ha ganado y no tiene. */}
            {hueco.filas > 0 && (
              <li>
                <strong>
                  {hueco.registros.toLocaleString("es-ES")}{" "}
                  {hueco.registros === 1 ? "registro" : "registros"} sin devengar
                </strong>{" "}
                en {hueco.filas} {hueco.filas === 1 ? "día" : "días"}
                {hueco.desde ? ` desde el ${hueco.desde}` : ""}: hay agente y hay registros,
                pero no se escribió ni un asiento. El barrido no los va a recuperar solo —solo
                repasa {DIAS_VENTANA_REVISION} días—.
                {hayTarifa && !tarifaACero ? (
                  /* El arreglo va DENTRO del aviso y no en otra pantalla: quien
                     lee esto es quien puede resolverlo, y mandarle a buscar el
                     botón a otro sitio es donde se pierde. */
                  <form action={repararDevengoPendiente} style={{ marginTop: "0.5rem" }}>
                    <button type="submit" className="boton primario">
                      Devengar ahora
                    </button>
                  </form>
                ) : (
                  " Corrige antes la tarifa: sin ella no hay con qué devengar."
                )}
              </li>
            )}
            {/*
              La atribución NO es un fallo, es una decisión, y por eso se enseña
              en vez de repararse sola. Un webmaster que ya traía tráfico antes
              de que lo captara un agente no devenga ese pasado: si lo devengara,
              el agente cobraría lo que no trajo. Pero cuando el desfase es de un
              día —alta hoy, registros de ayer— eso es dinero del agente que se
              queda en el aire, y callarlo es lo que hace que se descubra por una
              queja en vez de por la pantalla.
            */}
            {porAtribucion.length > 0 && (
              <li>
                <strong>
                  {porAtribucion.reduce((n, w) => n + w.registros, 0).toLocaleString("es-ES")}{" "}
                  registros anteriores a la fecha de devengo
                </strong>{" "}
                en {porAtribucion.length}{" "}
                {porAtribucion.length === 1 ? "webmaster" : "webmasters"}: no se devengan porque
                son de antes de que se le atribuyera al agente.{" "}
                {porAtribucion.slice(0, 3).map((w, i) => (
                  <span key={w.email}>
                    {i > 0 && "; "}
                    {w.email} tiene {w.registros} del {w.primerDia}
                    {w.ultimoDia !== w.primerDia ? ` al ${w.ultimoDia}` : ""} y devenga desde el{" "}
                    {w.devengaDesde}
                  </span>
                ))}
                {porAtribucion.length > 3 ? `; y ${porAtribucion.length - 3} más` : ""}. Son
                cuentas <strong>adoptadas</strong>, no captadas: ya estaban en el programa de
                socios antes, y la regla existe para que el agente no cobre lo que no trajo. Las
                que sí trajo él —las que se dieron de alta desde la aplicación— no llevan
                frontera y devengan desde el primer registro.
              </li>
            )}
            {/* Sin agente no hay a quién pagarle. No es un fallo del devengo,
                pero sí explica un «no gana nada» que si no se atribuye al
                devengo. */}
            {sinAgente.length > 0 && (
              <li>
                {sinAgente.reduce((n, w) => n + w.registros, 0).toLocaleString("es-ES")} registros
                de {sinAgente.length}{" "}
                {sinAgente.length === 1 ? "webmaster" : "webmasters"} <strong>sin agente</strong>:
                son del árbol del Operador y no devengan comisión a nadie.{" "}
                <Link href="/admin/webmasters?estado=sin-agente">Verlos</Link>.
              </li>
            )}
            {sinLeerElCierre && (
              <li>
                <strong>Sin sincronizar desde el último cierre de Sophon</strong> (
                {fecha(ultimoCierre)}): las cifras de esta página y las de los agentes son
                anteriores a ese corte.{" "}
                {ultimosRegistros
                  ? `Último barrido de registros: ${fecha(ultimosRegistros.iniciadaEn)}.`
                  : "Sin barridos de registros."}{" "}
                Comprueba el planificador de Skyway.
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
            etiqueta="Pendiente de pago"
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
            etiqueta="Pagado"
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
          <div className="tabla-marco">
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
          </div>
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
