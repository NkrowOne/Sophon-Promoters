/**
 * Los datos del control de mando del Operador.
 *
 * ── POR QUÉ ESTO NO VIVE DENTRO DE LAS PÁGINAS ──
 *
 * Son tres pantallas —la plantilla de agentes, la ficha de uno y la tabla de
 * todos los webmasters— que enseñan **los mismos hechos con distinto encuadre**.
 * Escritas cada una con sus consultas, la primera vez que alguien cambiara qué
 * cuenta como «webmaster con problema» tendría que acordarse de cambiarlo en
 * tres sitios, y el panel empezaría a contradecirse consigo mismo. Que es
 * exactamente el defecto que este proyecto ya ha pagado dos veces: el umbral del
 * PRO por triplicado y el `where` del devengo en tres ficheros.
 *
 * ── Y POR QUÉ NO HAY UNA CONSULTA POR AGENTE ──
 *
 * La forma obvia —recorrer los agentes y pedir sus cifras dentro del bucle— son
 * N×6 viajes a la base de datos para pintar una tabla. Aquí se piden nueve
 * agregados enteros y se pliegan en memoria: el coste no crece con el número de
 * agentes, y con cincuenta filas la página sigue abriéndose de una vez.
 *
 * ── LA ARITMÉTICA DEL DINERO NO SE REESCRIBE ──
 *
 * `componerSaldos` y `SOLO_DEVENGO` se importan de `lib/devengo/saldos.ts`. El
 * panel no puede tener su propia idea de qué es «lo devengado»: si el Operador
 * ve un número y el agente ve otro en su Escalera, uno de los dos está mirando
 * un libro que no existe. Lo mismo con `diasSinActividad`, `diasRestantesPro` y
 * `renovablePro`, que deciden lo mismo aquí que en la Malla y que en el bot.
 */

import { db } from "../db.ts";
import { componerSaldos, SOLO_DEVENGO, type Saldos } from "../devengo/saldos.ts";
import type { Micros } from "../devengo/dinero.ts";
import { inicioDelMes } from "../fechas.ts";
import { diasSinActividad, DIAS_PARA_AVISAR } from "../red/inactividad.ts";
import { diasRestantesPro, finEfectivoDelPro, renovablePro } from "../pro/vigencia.ts";
import { hoyContable } from "../sync/registros.ts";

/**
 * La ventana de actividad, en días.
 *
 * Catorce, los mismos que la Malla del agente (`app/api/agente/red/route.ts`).
 * No es una elección estética: si el panel midiera la actividad en treinta días
 * y el agente en catorce, los dos verían «parado» y «produciendo» sobre el mismo
 * webmaster y ninguna conversación entre ellos podría terminar bien.
 */
export const DIAS_VENTANA = 14;

/** Primer día de la ventana, en el calendario contable. */
function inicioDeVentana(hoy: string, dias = DIAS_VENTANA): Date {
  return new Date(Date.parse(`${hoy}T00:00:00Z`) - (dias - 1) * 86_400_000);
}

// ────────────────────────────── Formas de salida ──────────────────────────────

/** El recuento de una red, partido por lo que exige una decisión distinta. */
export interface RecuentoWebmasters {
  total: number;
  activos: number;
  bloqueados: number;
  pendientesBorrado: number;
  /** Vinculados pero que Sophon todavía no ha publicado en el programa. */
  sinConfirmar: number;
  /** Estaban en el árbol de Sophon y dejaron de estar. */
  desaparecidos: number;
  /** Sophon no dice en qué estado están. */
  desconocidos: number;
  conPro: number;
  /** Tuvo PRO y se apagó. Es renovable HOY. */
  proCaducado: number;
  /** Nunca llegó a tener PRO: su alta se quedó a medias. */
  nuncaTuvoPro: number;
  /** Sin un solo registro en la ventana, habiéndolos traído antes. */
  parados: number;
}

export interface FilaAgente {
  id: string;
  nombre: string;
  email: string;
  estado: string;
  telegramUsuario: string | null;
  /** Como texto: un `BigInt` no cruza la frontera a un componente cliente. */
  telegramId: string | null;
  idioma: string;
  creadoEn: Date;
  /**
   * Tarifa propia, si el Operador se la puso. `null` es lo normal —cobra la
   * tarifa general— y es un dato que hay que poder ver de un vistazo: un agente
   * con tarifa propia no se compara con los demás por el importe.
   */
  cpaPropiaMicros: Micros | null;
  cpsPropiaBps: number | null;
  sesionesVivas: number;
  webmasters: RecuentoWebmasters;
  altasTotales: number;
  altasDelMes: number;
  /** Intentos de alta que Sophon rechazó. Un número alto es una conversación. */
  altasFallidas: number;
  registrosVentana: number;
  usuariosPagoVentana: number;
  saldos: Saldos;
  /** Solicitudes de retiro sin resolver: son deuda del Operador. */
  retiroPendienteMicros: Micros;
  retirosPendientes: number;
}

export interface FilaWebmaster {
  id: string;
  email: string;
  uidSophon: string | null;
  agenteId: string | null;
  agenteNombre: string | null;
  origen: string;
  estado: string;
  atribuidoEn: Date | null;
  devengaDesde: Date | null;
  confirmadoEn: Date | null;
  vistoPorUltimaVezEn: Date | null;
  desaparecidoEn: Date | null;
  creadoEn: Date;
  proVigenteHasta: Date | null;
  diasDePro: number | null;
  proRenovable: boolean;
  concesionesFallidas: number;
  /**
   * Concesiones confirmadas cuya caducidad tuvo que deducirse porque Sophon no
   * la mandó. Es la huella del fallo que dejaba webmasters con «Sin PRO»
   * teniendo su año, y por eso se enseña en vez de esconderse.
   */
  concesionesDeducidas: number;
  registrosVentana: number;
  registrosTotales: number;
  usuariosPagoVentana: number;
  diasSinActividad: number | null;
  apagado: boolean;
  /** Lo que este webmaster le ha hecho ganar a su agente. */
  ganadoMicros: Micros;
  /** Un valor por día de la ventana, del más antiguo al más reciente. */
  serie: number[];
}

// ──────────────────────────────── La plantilla ────────────────────────────────

/**
 * Todos los agentes con todo lo que hace falta para decidir sobre ellos.
 *
 * Ordenados por lo que producen y con los suspendidos al final: la página se
 * abre para mirar a alguien concreto o para ver quién se ha apagado, y en las
 * dos preguntas el orden alfabético estorba.
 */
export async function plantillaDeAgentes(): Promise<FilaAgente[]> {
  const hoy = hoyContable();
  const desde = inicioDeVentana(hoy);
  const ahora = new Date();
  const mes = inicioDelMes();

  const [
    agentes,
    webmasters,
    porWebmaster,
    devengoPorEstado,
    consolidadoConRetiros,
    retiros,
    altas,
    altasMes,
    sesiones,
  ] = await Promise.all([
    db.agente.findMany({
      select: {
        id: true,
        nombreVisible: true,
        emailOriginal: true,
        estado: true,
        telegramId: true,
        telegramUsuario: true,
        idioma: true,
        creadoEn: true,
        cpaPorRegistroMicros: true,
        cpsBps: true,
      },
    }),
    // Se traen las filas y se pliegan aquí en vez de pedir seis `count` por
    // agente: son pocos campos y el recuento por estado necesita cruzar el
    // estado de Sophon con la vigencia del PRO, que ninguna agregación de
    // Prisma sabe expresar en una sola pasada.
    db.webmaster.findMany({
      where: { agenteId: { not: null } },
      select: {
        id: true,
        agenteId: true,
        estadoSophon: true,
        confirmadoEn: true,
        desaparecidoEn: true,
        proVigenteHasta: true,
        filasDiarias: {
          where: { fecha: { gte: desde } },
          select: { fecha: true, countRegister: true },
          orderBy: { fecha: "desc" },
        },
      },
    }),
    db.filaDiariaSophon.groupBy({
      by: ["webmasterId"],
      where: { fecha: { gte: desde } },
      _sum: { countRegister: true, countPayingUsers: true },
    }),
    db.asientoComision.groupBy({
      by: ["agenteId", "estado"],
      where: SOLO_DEVENGO,
      _sum: { importeMicros: true },
    }),
    db.asientoComision.groupBy({
      by: ["agenteId"],
      where: { estado: "CONSOLIDADO" },
      _sum: { importeMicros: true },
    }),
    db.solicitudRetiro.groupBy({
      by: ["agenteId", "estado"],
      _sum: { importeMicros: true },
      _count: true,
    }),
    db.intentoVinculacion.groupBy({ by: ["agenteId", "exito"], _count: true }),
    db.intentoVinculacion.groupBy({
      by: ["agenteId"],
      where: { exito: true, creadoEn: { gte: mes } },
      _count: true,
    }),
    db.sesionAgente.groupBy({
      by: ["agenteId"],
      where: { revocadaEn: null, expiraEn: { gt: ahora } },
      _count: true,
    }),
  ]);

  const produccion = new Map(porWebmaster.map((f) => [f.webmasterId, f._sum]));

  // ── Plegado por agente ──────────────────────────────────────────────────
  const recuentos = new Map<string, RecuentoWebmasters>();
  const registros = new Map<string, { registros: number; usuarios: number }>();

  for (const w of webmasters) {
    const clave = w.agenteId!;
    const r = recuentos.get(clave) ?? recuentoVacio();
    const p = registros.get(clave) ?? { registros: 0, usuarios: 0 };

    r.total += 1;
    if (w.desaparecidoEn) r.desaparecidos += 1;
    else if (w.confirmadoEn === null) r.sinConfirmar += 1;
    else if (w.estadoSophon === "ACTIVO") r.activos += 1;
    else if (w.estadoSophon === "BLOQUEADO") r.bloqueados += 1;
    else if (w.estadoSophon === "PENDIENTE_BORRADO") r.pendientesBorrado += 1;
    else r.desconocidos += 1;

    if (renovablePro(w.proVigenteHasta, ahora)) {
      if (w.proVigenteHasta === null) r.nuncaTuvoPro += 1;
      else r.proCaducado += 1;
    } else {
      r.conPro += 1;
    }

    const parado = diasSinActividad(w.filasDiarias, hoy);
    if (parado !== null && parado >= DIAS_PARA_AVISAR) r.parados += 1;

    const suma = produccion.get(w.id);
    p.registros += suma?.countRegister ?? 0;
    p.usuarios += suma?.countPayingUsers ?? 0;

    recuentos.set(clave, r);
    registros.set(clave, p);
  }

  const porClave = <T>(filas: readonly T[], clave: (f: T) => string | null) => {
    const m = new Map<string, T[]>();
    for (const f of filas) {
      const k = clave(f);
      if (k === null) continue;
      const lista = m.get(k) ?? [];
      lista.push(f);
      m.set(k, lista);
    }
    return m;
  };

  const devengos = porClave(devengoPorEstado, (d) => d.agenteId);
  const consolidados = new Map(
    consolidadoConRetiros.map((c) => [c.agenteId, c._sum.importeMicros ?? 0n]),
  );
  const retirosPorAgente = porClave(retiros, (r) => r.agenteId);
  const altasPorAgente = porClave(altas, (a) => a.agenteId);
  const altasMesPorAgente = new Map(altasMes.map((a) => [a.agenteId, a._count]));
  const sesionesPorAgente = new Map(sesiones.map((s) => [s.agenteId, s._count]));

  const filas: FilaAgente[] = agentes.map((a) => {
    const dev = devengos.get(a.id) ?? [];
    const ret = retirosPorAgente.get(a.id) ?? [];
    const alt = altasPorAgente.get(a.id) ?? [];
    const sumaEstado = (estado: string) =>
      dev.find((d) => d.estado === estado)?._sum.importeMicros ?? 0n;
    const sumaRetiro = (estado: string) =>
      ret.find((r) => r.estado === estado)?._sum.importeMicros ?? 0n;

    const pendientes = ret.filter((r) => r.estado === "SOLICITADO" || r.estado === "APROBADO");

    return {
      id: a.id,
      nombre: a.nombreVisible,
      email: a.emailOriginal,
      estado: a.estado,
      telegramUsuario: a.telegramUsuario,
      telegramId: a.telegramId === null ? null : String(a.telegramId),
      idioma: a.idioma,
      creadoEn: a.creadoEn,
      cpaPropiaMicros: a.cpaPorRegistroMicros,
      cpsPropiaBps: a.cpsBps,
      sesionesVivas: sesionesPorAgente.get(a.id) ?? 0,
      webmasters: recuentos.get(a.id) ?? recuentoVacio(),
      altasTotales: alt.filter((x) => x.exito).reduce((s, x) => s + x._count, 0),
      altasDelMes: altasMesPorAgente.get(a.id) ?? 0,
      altasFallidas: alt.filter((x) => !x.exito).reduce((s, x) => s + x._count, 0),
      registrosVentana: registros.get(a.id)?.registros ?? 0,
      usuariosPagoVentana: registros.get(a.id)?.usuarios ?? 0,
      saldos: componerSaldos({
        devengoProvisionalMicros: sumaEstado("PROVISIONAL"),
        devengoConsolidadoMicros: sumaEstado("CONSOLIDADO"),
        consolidadoConRetirosMicros: consolidados.get(a.id) ?? 0n,
        solicitadoMicros: sumaRetiro("SOLICITADO") + sumaRetiro("APROBADO"),
        pagadoMicros: sumaRetiro("PAGADO"),
      }),
      retiroPendienteMicros: pendientes.reduce((s, r) => s + (r._sum.importeMicros ?? 0n), 0n),
      retirosPendientes: pendientes.reduce((s, r) => s + r._count, 0),
    };
  });

  return ordenarAgentes(filas);
}

/**
 * Activos primero, y dentro de cada grupo por lo devengado.
 *
 * El orden ES la respuesta de la pantalla, así que se decide aquí y se prueba
 * aparte: ordenar por fecha de alta —que es lo que hacía la lista anterior—
 * deja al agente que más mueve al final de la página, que es justo al que se
 * viene a mirar.
 */
export function ordenarAgentes(filas: readonly FilaAgente[]): FilaAgente[] {
  return [...filas].sort((a, b) => {
    const vivoA = a.estado === "ACTIVO";
    const vivoB = b.estado === "ACTIVO";
    if (vivoA !== vivoB) return vivoA ? -1 : 1;
    const da = a.saldos.devengadoMicros;
    const dbb = b.saldos.devengadoMicros;
    if (da !== dbb) return da > dbb ? -1 : 1;
    return a.nombre.localeCompare(b.nombre);
  });
}

function recuentoVacio(): RecuentoWebmasters {
  return {
    total: 0,
    activos: 0,
    bloqueados: 0,
    pendientesBorrado: 0,
    sinConfirmar: 0,
    desaparecidos: 0,
    desconocidos: 0,
    conPro: 0,
    proCaducado: 0,
    nuncaTuvoPro: 0,
    parados: 0,
  };
}

/**
 * Lo que en esta red exige que alguien haga algo, en una frase por motivo.
 *
 * Se calcula sobre el recuento y no dentro de la plantilla porque las tres
 * pantallas lo enseñan —la tabla en una columna, la ficha en su cabecera— y una
 * red «con problemas» tiene que significar lo mismo en las tres.
 */
export function problemasDeRed(r: RecuentoWebmasters): string[] {
  const avisos: string[] = [];
  if (r.bloqueados > 0) avisos.push(`${r.bloqueados} bloqueado${r.bloqueados === 1 ? "" : "s"}`);
  // Invariable: «2 con baja programada» no necesita concordar, y evita el
  // «se borran» que sonaba a que ya había pasado.
  if (r.pendientesBorrado > 0) avisos.push(`${r.pendientesBorrado} con baja programada`);
  if (r.desaparecidos > 0)
    avisos.push(`${r.desaparecidos} ${r.desaparecidos === 1 ? "no figura" : "no figuran"} en Sophon`);
  if (r.nuncaTuvoPro > 0) avisos.push(`${r.nuncaTuvoPro} sin PRO concedido`);
  if (r.proCaducado > 0) avisos.push(`${r.proCaducado} con el PRO caducado`);
  if (r.sinConfirmar > 0) avisos.push(`${r.sinConfirmar} en confirmación`);
  if (r.parados > 0) avisos.push(`${r.parados} inactivo${r.parados === 1 ? "" : "s"}`);
  return avisos;
}

// ─────────────────────────────── Los webmasters ───────────────────────────────

export interface FiltroWebmasters {
  agenteId?: string;
  /** `sin-agente` son los del árbol del Operador: existen y no los captó nadie. */
  estado?: "todos" | "activos" | "problema" | "sin-pro" | "parados" | "sin-agente";
  /** Trozo de correo. Se compara sin distinguir mayúsculas. */
  busca?: string;
  limite?: number;
}

/** Tope de filas por consulta. Alto para poder trabajar, finito para no colgarse. */
export const TOPE_WEBMASTERS = 400;

export interface ResultadoWebmasters {
  filas: FilaWebmaster[];
  /** Cuántos hay de verdad. Si supera al tope, la tabla lo dice en vez de mentir. */
  total: number;
  tope: number;
}

/**
 * Los webmasters que pidan los filtros, con todo lo que se sabe de cada uno.
 *
 * El tope es explícito y sale en la respuesta. Una tabla que enseña 400 de 900
 * sin decirlo se lee como «estos son todos», y sobre esa lectura se toman
 * decisiones equivocadas —«este agente solo tiene cuatrocientos»—.
 */
export async function webmastersDetallados(
  filtro: FiltroWebmasters = {},
): Promise<ResultadoWebmasters> {
  const hoy = hoyContable();
  const desde = inicioDeVentana(hoy);
  const ahora = new Date();
  const limite = filtro.limite ?? TOPE_WEBMASTERS;

  const where: Record<string, unknown> = {};
  /*
   * ── EL ÁRBOL DEL OPERADOR NO SALE POR DEFECTO ──
   *
   * Son webmasters que ya estaban en Sophon antes que esta aplicación y que no
   * captó ningún agente: no devengan comisión, no tienen a quién reclamarle
   * nada y no hay nada que decidir sobre ellos. En la lista general eran filas
   * que solo se saltan, y en producción son la mitad de la tabla.
   *
   * No se pierden: `sin-agente` los enseña a los solos, y la página escribe
   * cuántos se ha dejado fuera. Ocultarlos en silencio sería peor que
   * enseñarlos, porque «15 webmasters» se leería como «estos son todos».
   *
   * Y BUSCAR los encuentra igual. La pregunta más frecuente de esta pantalla es
   * «¿de quién es este correo que me acaban de pasar?», y la respuesta «de
   * nadie, es del árbol viejo» es una respuesta: un buscador que no la da deja
   * al Operador creyendo que la cuenta no existe.
   */
  if (filtro.estado !== "sin-agente" && !filtro.agenteId && !filtro.busca) {
    where["agenteId"] = { not: null };
  }
  if (filtro.agenteId) where["agenteId"] = filtro.agenteId;
  if (filtro.busca) {
    where["emailNormalizado"] = { contains: filtro.busca.toLowerCase() };
  }

  switch (filtro.estado) {
    case "activos":
      where["estadoSophon"] = "ACTIVO";
      where["desaparecidoEn"] = null;
      break;
    case "problema":
      where["OR"] = [
        { estadoSophon: { in: ["BLOQUEADO", "PENDIENTE_BORRADO"] } },
        { desaparecidoEn: { not: null } },
        { confirmadoEn: null },
      ];
      break;
    case "sin-pro":
      // Renovable HOY: nunca lo tuvo o ya se apagó. Es la misma frontera que
      // aplica el guardián de `concederAnio`, escrita como consulta.
      where["OR"] = [{ proVigenteHasta: null }, { proVigenteHasta: { lte: ahora } }];
      break;
    case "sin-agente":
      where["agenteId"] = null;
      break;
    default:
      break;
  }

  const [total, filas] = await Promise.all([
    db.webmaster.count({ where }),
    db.webmaster.findMany({
      where,
      take: limite,
      /*
       * `nulls: "last"` y no el orden por defecto. En Postgres un `DESC` pone
       * los nulos DELANTE, así que la tabla se abría con los huérfanos —los que
       * no tienen agente y por tanto no tienen fecha de atribución— antes que
       * las altas recientes, que es justo lo que se viene a mirar.
       */
      orderBy: [{ atribuidoEn: { sort: "desc", nulls: "last" } }, { creadoEn: "desc" }],
      select: {
        id: true,
        emailOriginal: true,
        uidSophon: true,
        agenteId: true,
        origen: true,
        estadoSophon: true,
        atribuidoEn: true,
        devengaDesde: true,
        confirmadoEn: true,
        vistoPorUltimaVezEn: true,
        desaparecidoEn: true,
        creadoEn: true,
        proVigenteHasta: true,
        agente: { select: { nombreVisible: true } },
        filasDiarias: {
          where: { fecha: { gte: desde } },
          select: { fecha: true, countRegister: true, countPayingUsers: true },
          orderBy: { fecha: "desc" },
        },
        concesiones: {
          select: {
            estado: true,
            mensaje: true,
            creadoEn: true,
            duracionSegundos: true,
            vigenteHasta: true,
          },
          orderBy: { creadoEn: "desc" },
        },
        asientos: {
          where: SOLO_DEVENGO,
          select: { importeMicros: true },
        },
        _count: { select: { filasDiarias: true } },
      },
    }),
  ]);

  // Los registros de TODA la vida se piden aparte: traer cada fila diaria de
  // cada webmaster para sumarlas en memoria sería descargar el histórico
  // completo del programa para pintar una columna.
  const totales = await db.filaDiariaSophon.groupBy({
    by: ["webmasterId"],
    where: { webmasterId: { in: filas.map((f) => f.id) } },
    _sum: { countRegister: true },
  });
  const totalPorWebmaster = new Map(totales.map((t) => [t.webmasterId, t._sum.countRegister ?? 0]));

  const salida: FilaWebmaster[] = filas.map((w) => {
    const parado = diasSinActividad(w.filasDiarias, hoy);
    const confirmadas = w.concesiones.filter((c) => c.estado === "CONFIRMADA");
    // La caducidad EFECTIVA: si la anotación está vacía pero la última concesión
    // sigue dentro de plazo, hay PRO. El panel no puede decir «sin PRO» de una
    // cuenta a la que el servidor se niega a concederle otro.
    const finPro = finEfectivoDelPro(w.proVigenteHasta, confirmadas[0] ?? null);

    return {
      id: w.id,
      email: w.emailOriginal,
      uidSophon: w.uidSophon,
      agenteId: w.agenteId,
      agenteNombre: w.agente?.nombreVisible ?? null,
      origen: w.origen,
      estado: w.desaparecidoEn
        ? "DESAPARECIDO"
        : w.confirmadoEn === null
          ? "PENDIENTE_CONFIRMACION"
          : w.estadoSophon,
      atribuidoEn: w.atribuidoEn,
      devengaDesde: w.devengaDesde,
      confirmadoEn: w.confirmadoEn,
      vistoPorUltimaVezEn: w.vistoPorUltimaVezEn,
      desaparecidoEn: w.desaparecidoEn,
      creadoEn: w.creadoEn,
      proVigenteHasta: finPro,
      diasDePro: diasRestantesPro(finPro, ahora),
      proRenovable: renovablePro(finPro, ahora),
      concesionesFallidas: w.concesiones.filter((c) => c.estado === "FALLIDA").length,
      concesionesDeducidas: confirmadas.filter((c) => c.mensaje?.startsWith("SIN_FECHA") || c.mensaje?.startsWith("FECHA_DEDUCIDA")).length,
      registrosVentana: w.filasDiarias.reduce((s, f) => s + f.countRegister, 0),
      registrosTotales: totalPorWebmaster.get(w.id) ?? 0,
      usuariosPagoVentana: w.filasDiarias.reduce((s, f) => s + f.countPayingUsers, 0),
      diasSinActividad: parado,
      apagado: parado !== null && parado >= DIAS_PARA_AVISAR,
      ganadoMicros: w.asientos.reduce((s, a) => s + a.importeMicros, 0n),
      serie: serieDeVentana(w.filasDiarias, hoy),
    };
  });

  return { filas: salida, total, tope: limite };
}

/**
 * Un valor por día de la ventana, del más antiguo al más reciente.
 *
 * Los huecos se rellenan con cero. Sin eso, un webmaster con tres días sueltos
 * de tráfico dibujaría tres columnas juntas y parecería constante: la forma del
 * hueco es justo lo que hay que ver.
 */
export function serieDeVentana(
  filas: readonly { fecha: Date; countRegister: number }[],
  hoy: string,
  dias = DIAS_VENTANA,
): number[] {
  const porDia = new Map<string, number>();
  for (const f of filas) {
    porDia.set(f.fecha.toISOString().slice(0, 10), f.countRegister);
  }
  const base = Date.parse(`${hoy}T00:00:00Z`);
  return Array.from({ length: dias }, (_, i) => {
    const dia = new Date(base - (dias - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    return porDia.get(dia) ?? 0;
  });
}

// ────────────────────────────── La ficha completa ──────────────────────────────

export interface FichaAgente {
  agente: FilaAgente;
  webmasters: FilaWebmaster[];
  webmastersTotal: number;
  tope: number;
  desglose: { registrosMicros: Micros; proMicros: Micros; bonosMicros: Micros; ajustesMicros: Micros };
  retiros: {
    id: string;
    importeMicros: Micros;
    red: string;
    wallet: string;
    estado: string;
    solicitadoEn: Date;
    resueltoEn: Date | null;
    motivo: string | null;
    referenciaPago: string | null;
  }[];
  /** Altas rechazadas por Sophon: el motivo textual, que es lo accionable. */
  intentosFallidos: {
    id: string;
    email: string;
    mensaje: string | null;
    codigoRespuesta: number | null;
    creadoEn: Date;
  }[];
  sesiones: {
    id: string;
    emitidaEn: Date;
    ultimoUsoEn: Date;
    expiraEn: Date;
    ip: string | null;
    agenteUsuario: string | null;
  }[];
  auditoria: { id: string; accion: string; recurso: string | null; creadoEn: Date }[];
}

/** Todo lo que se sabe de un agente. `null` si no existe. */
export async function fichaDeAgente(agenteId: string): Promise<FichaAgente | null> {
  const existe = await db.agente.findUnique({ where: { id: agenteId }, select: { id: true } });
  if (!existe) return null;

  const [plantilla, red, porTipo, retiros, intentosFallidos, sesiones, auditoria] =
    await Promise.all([
      plantillaDeAgentes(),
      webmastersDetallados({ agenteId }),
      db.asientoComision.groupBy({
        by: ["tipo"],
        where: { agenteId, ...SOLO_DEVENGO },
        _sum: { importeMicros: true },
      }),
      db.solicitudRetiro.findMany({
        where: { agenteId },
        orderBy: { solicitadoEn: "desc" },
        take: 30,
        select: {
          id: true,
          importeMicros: true,
          red: true,
          wallet: true,
          estado: true,
          solicitadoEn: true,
          resueltoEn: true,
          motivo: true,
          referenciaPago: true,
        },
      }),
      db.intentoVinculacion.findMany({
        where: { agenteId, exito: false },
        orderBy: { creadoEn: "desc" },
        take: 20,
        select: {
          id: true,
          emailNormalizado: true,
          mensaje: true,
          codigoRespuesta: true,
          creadoEn: true,
        },
      }),
      db.sesionAgente.findMany({
        where: { agenteId, revocadaEn: null },
        orderBy: { ultimoUsoEn: "desc" },
        take: 10,
        select: {
          id: true,
          emitidaEn: true,
          ultimoUsoEn: true,
          expiraEn: true,
          ip: true,
          agenteUsuario: true,
        },
      }),
      db.auditoria.findMany({
        where: { actorTipo: "AGENTE", actorId: agenteId },
        orderBy: { creadoEn: "desc" },
        take: 25,
        select: { id: true, accion: true, recurso: true, creadoEn: true },
      }),
    ]);

  const agente = plantilla.find((a) => a.id === agenteId);
  if (!agente) return null;

  const suma = (tipo: string) =>
    porTipo.find((p) => p.tipo === tipo)?._sum.importeMicros ?? 0n;

  return {
    agente,
    webmasters: red.filas,
    webmastersTotal: red.total,
    tope: red.tope,
    desglose: {
      registrosMicros: suma("CPA"),
      proMicros: suma("CPS"),
      bonosMicros: suma("BONO"),
      ajustesMicros: suma("AJUSTE_REVERSO") + suma("AJUSTE_MANUAL"),
    },
    retiros: retiros.map((r) => ({ ...r, red: String(r.red), estado: String(r.estado) })),
    intentosFallidos: intentosFallidos.map((i) => ({
      id: i.id,
      email: i.emailNormalizado,
      mensaje: i.mensaje,
      codigoRespuesta: i.codigoRespuesta,
      creadoEn: i.creadoEn,
    })),
    sesiones,
    auditoria,
  };
}
