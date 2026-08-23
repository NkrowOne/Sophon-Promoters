import Link from "next/link";

import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/auth/admin";
import { formatearMicros } from "@/lib/devengo/dinero";
import { inicioDelDiaContable } from "@/lib/fechas";
import { hoyContable } from "@/lib/sync/registros";
import { DIAS_VENTANA_REVISION } from "@/lib/devengo/motor";
import { huecoDeDevengo, webmastersSinGanar } from "@/lib/devengo/sin-devengar";
import { repartoDelPanel } from "@/lib/admin/reparto";
import {
  CPA_SOPHON_MICROS,
  CPS_AL_OPERADOR_BPS,
  CPS_WEBMASTER_BPS,
  totalParte,
} from "@/lib/devengo/reparto";
import { repararDevengoPendiente } from "./acciones";
import { Cerrada } from "./_piezas/Cerrada";
import { Importe } from "./_piezas/Importe";
import { Num, Seccion } from "./_piezas/Control";

/**
 * Panel: la contabilidad del Operador.
 *
 * Responde tres preguntas, en este orden:
 *
 *  1. **¿Cuánto cobro yo?** Mi parte del reparto —el fijo que me toca de cada
 *     registro más mis puntos de lo que los usuarios pagan por el PRO—, no lo
 *     que sobra tras pagar a nadie. Es la única cifra de toda la aplicación que
 *     nadie más puede ver, y va marcada como privada para que se sepa antes de
 *     compartir una captura.
 *  2. **¿Tengo algo que pagar?** Los retiros no se resuelven solos.
 *  3. **¿Me puedo fiar de estos números?** Si el barrido falló o la
 *     conciliación no cuadra, el margen de arriba está mal y hay que decirlo
 *     ANTES, no en una nota al pie.
 */

export const dynamic = "force-dynamic";

export default async function Panel() {
  if (!(await exigirAdmin())) return <Cerrada />;

  const [entradas, retiros, agentes, webmasters, sincronizaciones, conciliacion] =
    await Promise.all([
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
  const tuyoMicros = totalParte(rep.totales.operador);
  const alAgenteMicros = totalParte(rep.totales.agente);
  const devengadoCpaCpsMicros = reparto.registrosMicros + reparto.proMicros;
  const desfaseMicros = alAgenteMicros - devengadoCpaCpsMicros;

  const sinGanar = await webmastersSinGanar();
  const porAtribucion = sinGanar.filter((w) => w.motivo === "antes-del-alta");
  const sinAgente = sinGanar.filter((w) => w.motivo === "sin-agente");

  const entradasMicros = entradas._sum.gananciaOperadorMicros ?? 0n;
  /*
   * La comprobación contra la realidad.
   *
   * El reparto de arriba se calcula con las tarifas; esto es lo que Sophon ha
   * ingresado DE VERDAD en la cuenta del Operador. Las dos cifras tienen que
   * parecerse, y cuando no se parecen es que una de las dos premisas está mal
   * —el fijo por registro no es el que creemos, o hay tráfico que no se está
   * repartiendo—. Enseñarlas juntas es la única forma de que eso se vea; con la
   * resta de antes, cualquier desajuste se disolvía dentro del margen.
   */
  const repartidoMicros = alAgenteMicros + tuyoMicros;

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

      {/*
        LO TUYO, Y NO «EL MARGEN».

        Aquí ponía «Margen · privado» y debajo la resta: lo que entra de Sophon
        menos lo que devengan los agentes. Estaba mal contado en el peor sentido
        —el de hacer creer algo falso—: tu parte no es lo que sobra después de
        pagar a nadie. Es tu tarifa, 0,03 $ por registro y el 10 % de lo que los
        usuarios pagan por el PRO, igual de pactada que la del agente.

        Y la diferencia importa el día que un agente reclama: con la resta,
        cualquier cifra suya parece salir de tu bolsillo. Con la parte, cada uno
        mira la suya.
      */}
      <section className="privado" style={{ marginBottom: "2.5rem" }}>
        <p className="rotulo">Lo tuyo · privado</p>
        <p
          style={{
            fontSize: "3rem",
            fontWeight: 620,
            letterSpacing: "-0.035em",
            fontVariantNumeric: "tabular-nums",
            margin: "0.25rem 0 0",
          }}
        >
          {formatearMicros(tuyoMicros)}
        </p>
        <p className="apoyo" style={{ marginTop: "0.4rem" }}>
          {formatearMicros(rep.totales.operador.registrosMicros)} de{" "}
          <Num valor={rep.totales.registros} /> registros y{" "}
          {formatearMicros(rep.totales.operador.proMicros)} de las compras de PRO. No aparece
          en ninguna pantalla de agente.
        </p>
      </section>

      {/*
        EL REPARTO, CON LAS TRES PARTES Y SIN RESTAS.

        Antes esta tabla tenía una sola columna —«para los agentes»— y debajo
        tres cifras: lo que entra, lo que se llevan y «te queda a ti». Contaba
        una historia falsa: que hay un montón del que los agentes sacan y tú te
        quedas el resto.

        No es así. Son dos conceptos con repartos distintos, y cada parte cobra
        lo suyo:

          REGISTRO      Sophon paga un fijo. Se parte entre agente y tú. El
                        webmaster no cobra por registrar.
          COMPRA DE PRO Porcentaje sobre lo que el USUARIO paga. Webmaster 35 %,
                        agente 5 %, tú 10 %. El resto se lo queda Sophon.

        Por eso las columnas son las tres partes y no una, y por eso el
        porcentaje solo aparece en la fila de las compras.
      */}
      <Seccion
        titulo="El reparto"
        apoyo={
          tarifa ? (
            <>
              Por cada registro Sophon paga {formatearMicros(CPA_SOPHON_MICROS)}:{" "}
              {formatearMicros(tarifa.cpaPorRegistroMicros)} para el agente y{" "}
              {formatearMicros(CPA_SOPHON_MICROS - tarifa.cpaPorRegistroMicros)} para ti. De lo
              que los usuarios pagan por el PRO:{" "}
              {(CPS_WEBMASTER_BPS / 100).toLocaleString("es-ES")} % para el webmaster,{" "}
              {(tarifa.cpsBps / 100).toLocaleString("es-ES")} % para el agente y{" "}
              {((CPS_AL_OPERADOR_BPS - tarifa.cpsBps) / 100).toLocaleString("es-ES")} % para ti.{" "}
              <Link href="/admin/tarifas">Cambiar la tarifa</Link>.
            </>
          ) : (
            <>
              Sin tarifa en vigor no hay nada pactado con los agentes, así que la columna del
              agente sale a cero y el fijo del registro aparece entero del lado tuyo. No es lo
              acordado: es lo que la aplicación está aplicando ahora mismo.{" "}
              <Link href="/admin/tarifas">Configurarla</Link>.
            </>
          )
        }
      >
        <div className="tabla-marco">
          <table className="densa">
            <thead>
              <tr>
                <th>Concepto</th>
                <th className="num">Webmaster</th>
                <th className="num">Agente</th>
                <th className="num">Tú</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="ancla">
                  Registros
                  <span className="apoyo" style={{ display: "block" }}>
                    <Num valor={rep.totales.registros} /> usuarios registrados
                  </span>
                </td>
                {/* El webmaster no cobra por registrar: no es un cero
                    calculado, es que ese concepto no le toca. */}
                <td className="num" data-etiqueta="Webmaster">
                  <span className="nulo">no cobra</span>
                </td>
                <td className="num" data-etiqueta="Agente">
                  <Importe micros={rep.totales.agente.registrosMicros} />
                </td>
                <td className="num" data-etiqueta="Tú">
                  <Importe micros={rep.totales.operador.registrosMicros} />
                </td>
              </tr>
              <tr>
                <td className="ancla">
                  Compras de PRO
                  <span className="apoyo" style={{ display: "block" }}>
                    {formatearMicros(rep.totales.pagadoPorUsuariosMicros)} pagados por los
                    usuarios
                  </span>
                </td>
                <td className="num" data-etiqueta="Webmaster">
                  <Importe micros={rep.totales.webmaster.proMicros} />
                </td>
                <td className="num" data-etiqueta="Agente">
                  <Importe micros={rep.totales.agente.proMicros} />
                </td>
                <td className="num" data-etiqueta="Tú">
                  <Importe micros={rep.totales.operador.proMicros} />
                </td>
              </tr>
              {/* Los bonos NO son un reparto: son un premio que sale entero de
                  tu parte, así que van con signo en tu columna. */}
              {reparto.bonosMicros !== 0n && (
                <tr>
                  <td className="ancla">
                    Bonos por hito
                    <span className="apoyo" style={{ display: "block" }}>
                      salen de tu parte
                    </span>
                  </td>
                  <td className="num" data-etiqueta="Webmaster">
                    <span className="nulo">no cobra</span>
                  </td>
                  <td className="num" data-etiqueta="Agente">
                    <Importe micros={reparto.bonosMicros} />
                  </td>
                  <td className="num" data-etiqueta="Tú">
                    <Importe micros={-reparto.bonosMicros} />
                  </td>
                </tr>
              )}
              {reparto.ajustesMicros !== 0n && (
                <tr>
                  <td className="ancla">Ajustes y reversos</td>
                  <td className="num" data-etiqueta="Webmaster">
                    <span className="nulo">no cobra</span>
                  </td>
                  <td className="num" data-etiqueta="Agente">
                    <Importe micros={reparto.ajustesMicros} />
                  </td>
                  <td className="num" data-etiqueta="Tú">
                    <Importe micros={-reparto.ajustesMicros} />
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td className="ancla">
                  <strong>Total</strong>
                </td>
                <td className="num" data-etiqueta="Webmaster">
                  <Importe micros={rep.totales.webmaster.proMicros} />
                </td>
                <td className="num" data-etiqueta="Agente">
                  <Importe micros={alAgenteMicros + reparto.bonosMicros + reparto.ajustesMicros} />
                </td>
                <td className="num" data-etiqueta="Tú">
                  <Importe micros={tuyoMicros - reparto.bonosMicros - reparto.ajustesMicros} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Lo que le TOCA al agente y lo que tiene ESCRITO en el libro son dos
            cifras distintas, y cuando no coinciden es que algo no devengó. La
            diferencia se dice aquí en vez de esconderse entre dos totales que
            nadie compara a mano. */}
        <p className="apoyo" style={{ marginTop: "0.9rem" }}>
          Sophon ha ingresado {formatearMicros(entradasMicros)} en tu cuenta por este tráfico.
          El reparto de arriba —tu parte más la del agente— suma{" "}
          {formatearMicros(repartidoMicros)}. Lo del webmaster no pasa por aquí: se lo paga
          Sophon directamente.
        </p>
        {desfaseMicros !== 0n && (
          <p className="apoyo vivo" style={{ marginTop: "0.9rem" }}>
            Faltan {formatearMicros(desfaseMicros)} por devengar: a los agentes les corresponden{" "}
            {formatearMicros(alAgenteMicros)} por este volumen y en el libro hay{" "}
            {formatearMicros(devengadoCpaCpsMicros)}. Es lo que arregla{" "}
            <em>Devengar ahora</em>.
          </p>
        )}
      </Seccion>

      {/*
        POR AGENTE.

        Quién ha traído cuánto, que es lo primero que se pregunta al abrir esto
        y hasta ahora había que sacarlo de la base de datos. Las mismas tres
        partes de arriba, fila a fila, para poder contestar a un agente concreto
        sin abrir nada.
      */}
      <Seccion
        titulo="Por agente"
        apoyo="Usuarios registrados y lo que corresponde a cada parte por ese tráfico."
      >
        <div className="tabla-marco">
          <table className="densa">
            <thead>
              <tr>
                <th>Agente</th>
                <th className="num">Webmasters</th>
                <th className="num">Registrados</th>
                <th className="num">Agente</th>
                <th className="num">Tú</th>
              </tr>
            </thead>
            <tbody>
              {rep.filas.map((f) => (
                <tr key={f.agenteId ?? "sin-agente"}>
                  <td className="ancla">
                    {f.nombre ?? "Sin agente"}
                    {f.agenteId === null && (
                      <span className="apoyo" style={{ display: "block" }}>
                        cuentas de tu árbol: no hay nada pactado, es todo tuyo
                      </span>
                    )}
                    {f.tarifaPropia && (
                      <span className="apoyo" style={{ display: "block" }}>
                        con condiciones propias
                      </span>
                    )}
                  </td>
                  <td className="num" data-etiqueta="Webmasters">
                    <Num valor={f.webmasters} />
                  </td>
                  <td className="num" data-etiqueta="Registrados">
                    <Num valor={f.registros} />
                  </td>
                  <td className="num" data-etiqueta="Agente">
                    <Importe micros={totalParte(f.reparto.agente)} />
                  </td>
                  <td className="num" data-etiqueta="Tú">
                    <Importe micros={totalParte(f.reparto.operador)} />
                  </td>
                </tr>
              ))}
              {rep.filas.length === 0 && (
                <tr>
                  <td className="ancla sin-rotulo" colSpan={5}>
                    <span className="nulo">Todavía no hay webmasters.</span>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td className="ancla">
                  <strong>Total</strong>
                </td>
                <td className="num" data-etiqueta="Webmasters">
                  <Num valor={rep.totales.webmasters} />
                </td>
                <td className="num" data-etiqueta="Registrados">
                  <Num valor={rep.totales.registros} />
                </td>
                <td className="num" data-etiqueta="Agente">
                  <Importe micros={alAgenteMicros} />
                </td>
                <td className="num" data-etiqueta="Tú">
                  <Importe micros={tuyoMicros} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Seccion>

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
