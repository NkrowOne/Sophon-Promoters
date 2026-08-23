import Link from "next/link";

import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/auth/admin";
import { formatearMicros } from "@/lib/devengo/dinero";
import { inicioDelDiaContable } from "@/lib/fechas";
import { hoyContable } from "@/lib/sync/registros";
import { DIAS_VENTANA_REVISION } from "@/lib/devengo/motor";
import { huecoDeDevengo, webmastersSinGanar } from "@/lib/devengo/sin-devengar";
import { desgloseWebmasters, repartoDelPanel } from "@/lib/admin/reparto";
import {
  CPA_SOPHON_MICROS,
  CPS_AL_OPERADOR_BPS,
  CPS_WEBMASTER_BPS,
  totalParte,
} from "@/lib/devengo/reparto";
import { repararDevengoPendiente } from "./acciones";
import { Cerrada } from "./_piezas/Cerrada";
import { Correo, Num, Seccion } from "./_piezas/Control";

/**
 * Panel: la contabilidad del Operador.
 *
 * Responde tres preguntas, en este orden:
 *
 *  1. **¿Cuánto cobra el Operador?** Su parte del reparto —lo que Sophon le
 *     ingresa menos la comisión del agente—, no lo que sobra tras pagar a
 *     nadie. Es la única cifra de toda la aplicación que nadie más puede ver, y
 *     va marcada como privada para que se sepa antes de compartir una captura.
 *  2. **¿Tengo algo que pagar?** Los retiros no se resuelven solos.
 *  3. **¿Me puedo fiar de estos números?** Si el barrido falló o la
 *     conciliación no cuadra, el margen de arriba está mal y hay que decirlo
 *     ANTES, no en una nota al pie.
 */

export const dynamic = "force-dynamic";

export default async function Panel() {
  if (!(await exigirAdmin())) return <Cerrada />;

  const [
    entradas,
    retiros,
    agentes,
    webmasters,
    sincronizaciones,
    conciliacion,
  ] = await Promise.all([
    db.filaDiariaSophon.aggregate({
      _sum: { gananciaOperadorMicros: true, gananciaTotalMicros: true },
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
      select: {
        tipo: true,
        estado: true,
        iniciadaEn: true,
        terminadaEn: true,
        error: true,
      },
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
    tarifa !== null &&
    tarifa.cpaPorRegistroMicros === 0n &&
    tarifa.cpsBps === 0;

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
  /*
   * El reparto, por concepto.
   *
   * El margen de arriba es una resta y no explica nada: dice cuánto queda, no de
   * dónde sale ni cuánto se lleva cada uno. Y esa es la pregunta que se hace
   * cuando un agente reclama —«¿cuánto he ganado yo con este tráfico y cuánto
   * tú?»—, que hasta ahora había que contestar abriendo la base de datos.
   *
   * Se desglosa lo que se PUEDE desglosar. Lo que devengan los agentes viene por
   * tipo de asiento, así que el reparto es exacto. Lo que entra de Sophon NO:
   * `myEarning` llega como una sola cifra por webmaster y día, sin decir qué
   * parte es de registros y qué parte de compras. Inventar ese reparto sería
   * peor que no darlo, así que el ingreso va entero y en su fila.
   */
  const porTipo = await db.asientoComision.groupBy({
    by: ["tipo"],
    where: { estado: { not: "ANULADO" }, tipo: { not: "RETIRO" } },
    _sum: { importeMicros: true },
  });
  const deTipo = (t: string) =>
    porTipo.find((x) => x.tipo === t)?._sum.importeMicros ?? 0n;
  const reparto = {
    registrosMicros: deTipo("CPA"),
    proMicros: deTipo("CPS"),
    bonosMicros: deTipo("BONO"),
    ajustesMicros: deTipo("AJUSTE_REVERSO") + deTipo("AJUSTE_MANUAL"),
  };

  /*
   * El reparto por partes, que es distinto de lo de arriba.
   *
   * Lo de arriba es lo DEVENGADO: lo que hay escrito en el libro. Esto es lo que
   * a cada uno le CORRESPONDE por el volumen que hay, calculado con su tarifa.
   * Cuando las dos cifras no coinciden hay un agujero de devengo, y esa
   * diferencia se enseña debajo de la tabla en vez de quedar tapada.
   */
  const rep = await repartoDelPanel();
  const porWebmaster = await desgloseWebmasters();
  const tuyoMicros = totalParte(rep.totales.operador);
  const alAgenteMicros = totalParte(rep.totales.agente);
  const alWebmasterMicros = totalParte(rep.totales.webmaster);

  /*
   * LA COMPROBACIÓN DE QUE EL PROGRAMA SIGUE SIENDO EL QUE CREEMOS.
   *
   * Del precio que Sophon paga por cada usuario registrado se descuentan seis
   * céntimos que no llegan al webmaster: son el ingreso del Operador y de ahí
   * sale la comisión del agente. Eso es una condición del programa, no un
   * cálculo, y toda la aplicación depende de ella —el tope del formulario de
   * tarifas, la tabla de precios que el agente le enseña a su webmaster y el
   * reparto de esta página—.
   *
   * Aquí se despeja de lo que Sophon ha ingresado DE VERDAD y se compara. Si
   * deja de cuadrar, el programa ha cambiado y hay tres pantallas mintiendo a
   * la vez; más vale que lo diga esta.
   */
  const porRegistroRealMicros =
    rep.totales.registros > 0
      ? (rep.totales.agente.registrosMicros +
          rep.totales.operador.registrosMicros) /
        BigInt(rep.totales.registros)
      : null;
  const descuentoCuadra =
    porRegistroRealMicros === null ||
    porRegistroRealMicros === CPA_SOPHON_MICROS;
  const devengadoCpaCpsMicros = reparto.registrosMicros + reparto.proMicros;
  const desfaseMicros = alAgenteMicros - devengadoCpaCpsMicros;

  const sinGanar = await webmastersSinGanar();
  const porAtribucion = sinGanar.filter((w) => w.motivo === "antes-del-alta");
  const sinAgente = sinGanar.filter((w) => w.motivo === "sin-agente");

  const entradasMicros = entradas._sum.gananciaOperadorMicros ?? 0n;

  const porEstado = (e: string) => retiros.find((r) => r.estado === e);
  const pendientes = porEstado("SOLICITADO");
  const aprobados = porEstado("APROBADO");
  const pagados = porEstado("PAGADO");
  const porPagarMicros =
    (pendientes?._sum.importeMicros ?? 0n) +
    (aprobados?._sum.importeMicros ?? 0n);
  const porPagarCuenta = (pendientes?._count ?? 0) + (aprobados?._count ?? 0);

  const ultimaPorTipo = new Map<string, (typeof sincronizaciones)[number]>();
  for (const s of sincronizaciones)
    if (!ultimaPorTipo.has(s.tipo)) ultimaPorTipo.set(s.tipo, s);
  const rotas = [...ultimaPorTipo.values()].filter(
    (s) => s.estado === "FALLIDA",
  );

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
          <ul
            style={{
              margin: "0.5rem 0 0",
              paddingLeft: "1.1rem",
              fontSize: "0.875rem",
              lineHeight: 1.6,
            }}
          >
            {/* Primero, porque es el único de la lista que hace que el margen de
                abajo sea entero mentira en vez de estar solo desactualizado. */}
            {!hayTarifa && (
              <li>
                <strong>No hay tarifa en vigor</strong>: los barridos no
                devengan y los agentes ven 0,00 $. El margen inferior aparece al
                100 % por esa causa.{" "}
                <Link href="/admin/tarifas">Configurar tarifa</Link>.
              </li>
            )}
            {/* Existir no es pagar. Una tarifa a cero pasaba la comprobación de
                arriba y dejaba a todos los agentes a 0,00 $ sin que nada lo
                dijera. */}
            {tarifaACero && (
              <li>
                <strong>La tarifa en vigor está a cero</strong>: 0,00 $ por
                registro y 0 % de las compras. Los barridos no devengan nada y
                los agentes ven 0,00 $.{" "}
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
                  {hueco.registros === 1 ? "registro" : "registros"} sin
                  devengar
                </strong>{" "}
                en {hueco.filas} {hueco.filas === 1 ? "día" : "días"}
                {hueco.desde ? ` desde el ${hueco.desde}` : ""}: hay agente y
                hay registros, pero no se escribió ni un asiento. El barrido no
                los va a recuperar solo —solo repasa {DIAS_VENTANA_REVISION}{" "}
                días—.
                {hayTarifa && !tarifaACero ? (
                  /* El arreglo va DENTRO del aviso y no en otra pantalla: quien
                     lee esto es quien puede resolverlo, y mandarle a buscar el
                     botón a otro sitio es donde se pierde. */
                  <form
                    action={repararDevengoPendiente}
                    style={{ marginTop: "0.5rem" }}
                  >
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
                  {porAtribucion
                    .reduce((n, w) => n + w.registros, 0)
                    .toLocaleString("es-ES")}{" "}
                  registros anteriores a la fecha de devengo
                </strong>{" "}
                en {porAtribucion.length}{" "}
                {porAtribucion.length === 1 ? "webmaster" : "webmasters"}: no se
                devengan porque son de antes de que se le atribuyera al agente.{" "}
                {porAtribucion.slice(0, 3).map((w, i) => (
                  <span key={w.email}>
                    {i > 0 && "; "}
                    {w.email} tiene {w.registros} del {w.primerDia}
                    {w.ultimoDia !== w.primerDia ? ` al ${w.ultimoDia}` : ""} y
                    devenga desde el {w.devengaDesde}
                  </span>
                ))}
                {porAtribucion.length > 3
                  ? `; y ${porAtribucion.length - 3} más`
                  : ""}
                . Son cuentas <strong>adoptadas</strong>, no captadas: ya
                estaban en el programa de socios antes, y la regla existe para
                que el agente no cobre lo que no trajo. Las que sí trajo él —las
                que se dieron de alta desde la aplicación— no llevan frontera y
                devengan desde el primer registro.
              </li>
            )}
            {/* Sin agente no hay a quién pagarle. No es un fallo del devengo,
                pero sí explica un «no gana nada» que si no se atribuye al
                devengo. */}
            {sinAgente.length > 0 && (
              <li>
                {sinAgente
                  .reduce((n, w) => n + w.registros, 0)
                  .toLocaleString("es-ES")}{" "}
                registros de {sinAgente.length}{" "}
                {sinAgente.length === 1 ? "webmaster" : "webmasters"}{" "}
                <strong>sin agente asignado</strong>: son cuentas propias del
                Operador y no devengan comisión a nadie.{" "}
                <Link href="/admin/webmasters?estado=sin-agente">
                  Ver listado
                </Link>
                .
              </li>
            )}
            {sinLeerElCierre && (
              <li>
                <strong>
                  Sin sincronizar desde el último cierre de Sophon
                </strong>{" "}
                ({fecha(ultimoCierre)}): las cifras de esta página y las de los
                agentes son anteriores a ese corte.{" "}
                {ultimosRegistros
                  ? `Último barrido de registros: ${fecha(ultimosRegistros.iniciadaEn)}.`
                  : "Sin barridos de registros."}{" "}
                Comprueba el planificador de Skyway.
              </li>
            )}
            {rotas.map((s) => (
              <li key={s.tipo}>
                Barrido de {s.tipo.toLowerCase()}: fallido el{" "}
                {fecha(s.iniciadaEn)}
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
                {formatearMicros(conciliacion.descuadreMicros)}. No se deben
                resolver retiros hasta cuadrarla.
              </li>
            )}
          </ul>
        </div>
      )}

      {/*
        EL RESULTADO DEL OPERADOR, Y NO «EL MARGEN».

        Aquí ponía «Margen» y debajo una resta: lo que entra de Sophon menos lo
        que devengan los agentes. Hacía creer algo falso —que la parte del
        Operador es lo que sobra tras pagar a los demás— cuando es una tarifa
        pactada igual que las otras dos.
      */}
      <section className="privado" style={{ marginBottom: "2.5rem" }}>
        <p className="rotulo">Resultado del Operador · privado</p>
        <p className="cifra grande">{formatearMicros(tuyoMicros)}</p>
        <dl
          className="partes"
          style={{ marginTop: "0.9rem", maxWidth: "26rem" }}
        >
          <div className="parte">
            <dt>Registros</dt>
            <dd>{formatearMicros(rep.totales.operador.registrosMicros)}</dd>
          </div>
          <div className="parte">
            <dt>Compras de PRO</dt>
            <dd>{formatearMicros(rep.totales.operador.proMicros)}</dd>
          </div>
          <div className="parte">
            <dt>Usuarios registrados</dt>
            <dd>
              <Num valor={rep.totales.registros} />
            </dd>
          </div>
        </dl>
        <p className="apoyo" style={{ marginTop: "0.9rem" }}>
          Cifra privada: no aparece en ninguna pantalla de agente.
        </p>
      </section>

      {/*
        EL REPARTO.

        Tres partes, cada una con lo suyo. Antes era una tabla de cuatro
        columnas monetarias que en un móvil se desmontaba en pares «rótulo
        valor» sueltos. Ahora es un bloque por concepto, con las tres partes en
        columnas fijas: se comparan en vertical aunque el móvil sea estrecho.
      */}
      <Seccion
        titulo="El reparto"
        apoyo={
          tarifa ? (
            <>
              Del precio que Sophon paga por cada usuario registrado se
              descuentan {formatearMicros(CPA_SOPHON_MICROS)}, que no llegan al
              webmaster: {formatearMicros(tarifa.cpaPorRegistroMicros)} para el
              agente y{" "}
              {formatearMicros(CPA_SOPHON_MICROS - tarifa.cpaPorRegistroMicros)}{" "}
              para el Operador. De cada compra de PRO corresponden{" "}
              {(CPS_WEBMASTER_BPS / 100).toLocaleString("es-ES")} % al
              webmaster, {(tarifa.cpsBps / 100).toLocaleString("es-ES")} % al
              agente y{" "}
              {((CPS_AL_OPERADOR_BPS - tarifa.cpsBps) / 100).toLocaleString(
                "es-ES",
              )}{" "}
              % al Operador. <Link href="/admin/tarifas">Modificar tarifa</Link>
              .
            </>
          ) : (
            <>
              No hay tarifa en vigor: los agentes no devengan comisión y el
              importe íntegro del registro figura del lado del Operador.{" "}
              <Link href="/admin/tarifas">Configurar tarifa</Link>.
            </>
          )
        }
      >
        <ul className="registros">
          <li>
            <div className="titular">
              <span className="nombre">Registros</span>
              <span className="principal">
                {formatearMicros(
                  rep.totales.agente.registrosMicros +
                    rep.totales.operador.registrosMicros,
                )}
              </span>
            </div>
            <p className="contexto">
              <Num valor={rep.totales.registros} /> usuarios registrados
            </p>
            <dl className="partes">
              <div className="parte">
                <dt>Webmaster</dt>
                <dd>
                  {formatearMicros(rep.totales.webmaster.registrosMicros)}
                </dd>
              </div>
              <div className="parte">
                <dt>Agente</dt>
                <dd>{formatearMicros(rep.totales.agente.registrosMicros)}</dd>
              </div>
              <div className="parte">
                <dt>Operador</dt>
                <dd>{formatearMicros(rep.totales.operador.registrosMicros)}</dd>
              </div>
            </dl>
          </li>

          <li>
            <div className="titular">
              <span className="nombre">Compras de PRO</span>
              <span className="principal">
                {formatearMicros(
                  rep.totales.webmaster.proMicros +
                    rep.totales.agente.proMicros +
                    rep.totales.operador.proMicros,
                )}
              </span>
            </div>
            <p className="contexto">
              {formatearMicros(rep.totales.pagadoPorUsuariosMicros)} abonados
              por los usuarios
            </p>
            <dl className="partes">
              <div className="parte">
                <dt>Webmaster</dt>
                <dd>{formatearMicros(rep.totales.webmaster.proMicros)}</dd>
              </div>
              <div className="parte">
                <dt>Agente</dt>
                <dd>{formatearMicros(rep.totales.agente.proMicros)}</dd>
              </div>
              <div className="parte">
                <dt>Operador</dt>
                <dd>{formatearMicros(rep.totales.operador.proMicros)}</dd>
              </div>
            </dl>
          </li>

          {/* Los bonos no son un reparto: los abona el Operador por entero. */}
          {reparto.bonosMicros !== 0n && (
            <li>
              <div className="titular">
                <span className="nombre">Bonos por hito</span>
                <span className="principal">{formatearMicros(0n)}</span>
              </div>
              <p className="contexto">A cargo del Operador</p>
              <dl className="partes">
                <div className="parte">
                  <dt>Webmaster</dt>
                  <dd className="nulo">sin comisión</dd>
                </div>
                <div className="parte">
                  <dt>Agente</dt>
                  <dd>{formatearMicros(reparto.bonosMicros)}</dd>
                </div>
                <div className="parte">
                  <dt>Operador</dt>
                  <dd>{formatearMicros(-reparto.bonosMicros)}</dd>
                </div>
              </dl>
            </li>
          )}

          {reparto.ajustesMicros !== 0n && (
            <li>
              <div className="titular">
                <span className="nombre">Ajustes y reversos</span>
                <span className="principal">{formatearMicros(0n)}</span>
              </div>
              <p className="contexto">A cargo del Operador</p>
              <dl className="partes">
                <div className="parte">
                  <dt>Webmaster</dt>
                  <dd className="nulo">sin comisión</dd>
                </div>
                <div className="parte">
                  <dt>Agente</dt>
                  <dd>{formatearMicros(reparto.ajustesMicros)}</dd>
                </div>
                <div className="parte">
                  <dt>Operador</dt>
                  <dd>{formatearMicros(-reparto.ajustesMicros)}</dd>
                </div>
              </dl>
            </li>
          )}

          <li className="total">
            <div className="titular">
              <span className="nombre">Total</span>
              {/* Los bonos y los ajustes se anulan entre las dos columnas
                  —lo que suma el agente lo resta el Operador—, así que el total
                  repartido es la suma de las tres partes sin ellos. */}
              <span className="principal">
                {formatearMicros(
                  alWebmasterMicros + alAgenteMicros + tuyoMicros,
                )}
              </span>
            </div>
            <dl className="partes">
              <div className="parte">
                <dt>Webmaster</dt>
                <dd>{formatearMicros(rep.totales.webmaster.proMicros)}</dd>
              </div>
              <div className="parte">
                <dt>Agente</dt>
                <dd>
                  {formatearMicros(
                    alAgenteMicros +
                      reparto.bonosMicros +
                      reparto.ajustesMicros,
                  )}
                </dd>
              </div>
              <div className="parte">
                <dt>Operador</dt>
                <dd>
                  {formatearMicros(
                    tuyoMicros - reparto.bonosMicros - reparto.ajustesMicros,
                  )}
                </dd>
              </div>
            </dl>
          </li>
        </ul>

        <p className="apoyo" style={{ marginTop: "1.1rem" }}>
          Los importes del webmaster y del Operador son los que Sophon reporta
          por este tráfico; solo la comisión del agente se calcula con la
          tarifa. La parte del webmaster no pasa por la cuenta del Operador: la
          abona Sophon directamente. Ingresos totales registrados en la cuenta
          del Operador: {formatearMicros(entradasMicros)}.
        </p>

        {!descuentoCuadra && porRegistroRealMicros !== null && (
          <p className="apoyo vivo" style={{ marginTop: "0.6rem" }}>
            El descuento por registro no cuadra: el programa establece{" "}
            {formatearMicros(CPA_SOPHON_MICROS)} y de lo ingresado se despejan{" "}
            {formatearMicros(porRegistroRealMicros)}. Con esa diferencia, el
            tope del formulario de tarifas y la tabla de precios que ven los
            agentes también están desactualizados.
          </p>
        )}

        {/* Lo que CORRESPONDE al agente y lo que tiene registrado en el libro
            son dos cifras distintas. Cuando no coinciden, algo no devengó. */}
        {desfaseMicros !== 0n && (
          <p className="apoyo vivo" style={{ marginTop: "0.6rem" }}>
            Pendiente de devengo: {formatearMicros(desfaseMicros)}. A los
            agentes les corresponden {formatearMicros(alAgenteMicros)} por este
            volumen y el libro registra {formatearMicros(devengadoCpaCpsMicros)}
            . Pulsa <em>Devengar ahora</em> para regularizarlo.
          </p>
        )}
      </Seccion>

      {/*
        POR AGENTE.

        Quién ha traído cuánto. Mismo bloque que el reparto, así que las tres
        columnas caen en las mismas verticales y la lectura no cambia de reglas
        al bajar por la página.
      */}
      <Seccion
        titulo="Por agente"
        apoyo="Usuarios registrados por cada agente y comisión que corresponde a cada parte."
      >
        <ul className="registros">
          {rep.filas.map((f) => (
            <li key={f.agenteId ?? "sin-agente"}>
              <div className="titular">
                <span className="nombre">
                  {f.nombre ?? "Sin agente asignado"}
                </span>
                <span className="principal">
                  {formatearMicros(totalParte(f.reparto.agente))}
                </span>
              </div>
              <p className="contexto">
                <Num valor={f.registros} /> registrados ·{" "}
                <Num valor={f.webmasters} />{" "}
                {f.webmasters === 1 ? "webmaster" : "webmasters"}
                {f.agenteId === null && " · cuentas propias del Operador"}
                {f.tarifaPropia && " · tarifa propia"}
              </p>
              <dl className="partes">
                <div className="parte">
                  <dt>Webmaster</dt>
                  <dd>{formatearMicros(totalParte(f.reparto.webmaster))}</dd>
                </div>
                <div className="parte">
                  <dt>Agente</dt>
                  <dd>{formatearMicros(totalParte(f.reparto.agente))}</dd>
                </div>
                <div className="parte">
                  <dt>Operador</dt>
                  <dd>{formatearMicros(totalParte(f.reparto.operador))}</dd>
                </div>
              </dl>
            </li>
          ))}
          {rep.filas.length === 0 && (
            <li>
              <p className="contexto">Todavía no hay webmasters registrados.</p>
            </li>
          )}
          {rep.filas.length > 0 && (
            <li className="total">
              <div className="titular">
                <span className="nombre">Total</span>
              </div>
              <p className="contexto">
                <Num valor={rep.totales.registros} /> registrados ·{" "}
                <Num valor={rep.totales.webmasters} /> webmasters
              </p>
              <dl className="partes">
                <div className="parte">
                  <dt>Webmaster</dt>
                  <dd>{formatearMicros(alWebmasterMicros)}</dd>
                </div>
                <div className="parte">
                  <dt>Agente</dt>
                  <dd>{formatearMicros(alAgenteMicros)}</dd>
                </div>
                <div className="parte">
                  <dt>Operador</dt>
                  <dd>{formatearMicros(tuyoMicros)}</dd>
                </div>
              </dl>
            </li>
          )}
        </ul>
      </Seccion>

      {/*
        POR WEBMASTER, DESGLOSADO POR CONCEPTO.

        Aquí estaban los tres totales sueltos, y con tres totales no se contesta
        «¿de dónde sale lo de éste?». El webmaster solo cobra de las compras de
        PRO; el agente y el Operador cobran también del registro. Esa asimetría
        es la regla de negocio entera y no se ve si no se separan los conceptos.

        Dos grupos de tres, con el concepto rotulando cada grupo: seis importes
        por bloque, ordenados en las mismas columnas que el resto de la página.
      */}
      <Seccion
        titulo="Por webmaster"
        apoyo={
          <>
            Lo que Sophon abona a cada webmaster —por sus usuarios registrados y
            por las compras que hacen— y la comisión que ese mismo tráfico
            genera para el agente y el Operador.{" "}
            <Link href="/admin/webmasters">Ver listado completo</Link>.
          </>
        }
      >
        <ul className="registros plegable">
          {porWebmaster.filas.map((w) => (
            <li key={w.webmasterId}>
              <details>
                <summary>
                  <div className="titular">
                    <span className="nombre">
                      <Correo valor={w.email} />
                    </span>
                    <span className="principal">
                      {formatearMicros(w.cobraMicros)}
                    </span>
                  </div>
                  <p className="contexto">
                    {w.agente ?? "Sin agente asignado"} ·{" "}
                    <Num valor={w.registros} /> registrados ·{" "}
                    {formatearMicros(w.pagadoPorUsuariosMicros)} en compras
                  </p>
                </summary>
                <dl className="partes">
                  <p className="concepto">Registros</p>
                  <div className="parte">
                    <dt>Webmaster</dt>
                    <dd>
                      {formatearMicros(w.reparto.webmaster.registrosMicros)}
                    </dd>
                  </div>
                  <div className="parte">
                    <dt>Agente</dt>
                    <dd>{formatearMicros(w.reparto.agente.registrosMicros)}</dd>
                  </div>
                  <div className="parte">
                    <dt>Operador</dt>
                    <dd>
                      {formatearMicros(w.reparto.operador.registrosMicros)}
                    </dd>
                  </div>
                  <p className="concepto">Compras de PRO</p>
                  <div className="parte">
                    <dt>Webmaster</dt>
                    <dd>{formatearMicros(w.reparto.webmaster.proMicros)}</dd>
                  </div>
                  <div className="parte">
                    <dt>Agente</dt>
                    <dd>{formatearMicros(w.reparto.agente.proMicros)}</dd>
                  </div>
                  <div className="parte">
                    <dt>Operador</dt>
                    <dd>{formatearMicros(w.reparto.operador.proMicros)}</dd>
                  </div>
                </dl>
              </details>
            </li>
          ))}
          {porWebmaster.filas.length === 0 && (
            <li>
              <p className="contexto">Todavía no hay webmasters registrados.</p>
            </li>
          )}
        </ul>

        {/* Una lista que corta en silencio se lee como «éstos son todos». */}
        {porWebmaster.total > porWebmaster.filas.length && (
          <p className="apoyo" style={{ marginTop: "1.1rem" }}>
            Se muestran los {porWebmaster.filas.length} de mayor ingreso, de{" "}
            <Num valor={porWebmaster.total} /> en total, que suman{" "}
            {formatearMicros(porWebmaster.cobranMicros)}.{" "}
            <Link href="/admin/webmasters">Ver listado completo</Link>.
          </p>
        )}
      </Seccion>

      <section style={{ marginBottom: "2.5rem" }}>
        <p
          className="rotulo"
          style={{
            borderBottom: "1px solid var(--p-borde)",
            paddingBottom: "0.5rem",
          }}
        >
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
          <Dato
            etiqueta="Agentes activos"
            valor={String(agentes)}
            href="/admin/agentes"
          />
          <Dato
            etiqueta="Webmasters"
            valor={String(webmasters)}
            apoyo="activos en Sophon"
          />
        </div>
      </section>

      <section>
        <p
          className="rotulo"
          style={{
            borderBottom: "1px solid var(--p-borde)",
            paddingBottom: "0.5rem",
          }}
        >
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
                    <td className="apoyo">
                      {fecha(s.terminadaEn ?? s.iniciadaEn)}
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
      {apoyo && (
        <p className="apoyo" style={{ marginTop: "0.15rem" }}>
          {apoyo}
        </p>
      )}
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
