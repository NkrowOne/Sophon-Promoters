/**
 * Barrido de registros: la pieza que convierte la API de Sophon en asientos.
 *
 * Sophon no publica eventos, publica **contadores acumulados por (webmaster, día)**
 * que además puede revisar más tarde. Y publica dos cifras distintas para la
 * misma fila según el `affiliateLevel`: con `1` la ganancia TOTAL y con `2` la
 * del webmaster. La diferencia es lo que entra al Operador.
 *
 * Por eso el barrido lee **las dos versiones de cada fila** y las cruza por
 * `(email, fecha)`. Leer solo una dejaría el margen sin calcular.
 *
 * Sobre la ventana: no se relee todo el histórico en cada vuelta —serían miles
 * de páginas— sino los últimos días, porque son los únicos que Sophon puede
 * revisar. Un día más viejo que la ventana se considera cerrado.
 */

import { db, CERROJO, conCerrojo } from "../db.ts";
import { formatearMicros, microsDesdeCadena, type Micros } from "../devengo/dinero.ts";
import {
  DIAS_VENTANA_REVISION,
  estaCerrado,
  inicioVentana,
  planificarAsientos,
  type AsentadoPrevio,
  type FilaDiaria,
  type Tarifa,
} from "../devengo/motor.ts";
import { planificarBonos, siguienteEscalon, type Escalon } from "../devengo/bonos.ts";
import {
  ZONA_POR_DEFECTO,
  inicioDeMes,
  inicioDelMesSiguiente,
  mesAnterior,
  mesDe,
} from "../fechas.ts";
import { avisarBonoAlAgente } from "../bot/avisos.ts";
import { idiomaGuardado } from "../idiomas.ts";
import { normalizarEmail } from "../cripto.ts";
import type { ClienteSophon } from "../sophon/cliente.ts";
import { NivelAfiliado, type FilaRegistro } from "../sophon/tipos.ts";

export interface ResultadoBarrido {
  filasLeidas: number;
  filasEscritas: number;
  asientosCreados: number;
  webmastersNuevos: number;
  desde: string;
  hasta: string;
  /**
   * Asientos que este barrido ha promovido de `PROVISIONAL` a `CONSOLIDADO`.
   *
   * En un sistema en régimen es un número pequeño —los asientos de un día que
   * acaba de salir de la ventana—. La primera vez que corra después del arreglo
   * será enorme: son todos los que llevaban desde el principio sin consolidar.
   */
  asientosConsolidados: number;
  /** Bonos por hito emitidos en esta vuelta. Alimenta el aviso al agente. */
  bonosEmitidos: BonoEmitido[];
  /**
   * No había ninguna `TarifaVersion` en vigor, así que este barrido guardó las
   * filas y **no devengó nada**.
   *
   * Va en el resultado y no solo en un `console.warn` porque este es el único
   * fallo del sistema que no se parece a un fallo: el barrido termina en
   * verde, las filas diarias entran, los registros y los tiers crecen en
   * pantalla, y lo único que falta es el dinero de los agentes. En el panel el
   * efecto es peor todavía —el margen sale del devengo, así que con cero
   * asientos se lee al 100 % y parece un buen mes—. Que salga del barrido es lo
   * que permite que la portada lo grite.
   */
  sinTarifa: boolean;
}

/** Clave de cruce entre los dos niveles: la fila es (webmaster, día). */
function clave(email: string, fecha: string): string {
  return `${normalizarEmail(email)}|${fecha}`;
}

/** Fecha de hoy en la zona horaria contable, en `YYYY-MM-DD`. */
export function hoyContable(zona = process.env["ZONA_HORARIA"] ?? ZONA_POR_DEFECTO): string {
  // `en-CA` da directamente el formato ISO, que es lo que espera la API.
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(new Date());
}

/**
 * Descarga todas las filas agrupadas por webmaster de un nivel, indexadas por
 * `(email, fecha)`. Se materializa en memoria porque hay que cruzar los dos
 * niveles y la ventana es de días, no de años: son cientos de filas, no millones.
 */
async function leerNivel(
  cliente: ClienteSophon,
  nivel: NivelAfiliado,
  desde: string,
  hasta: string,
): Promise<Map<string, FilaRegistro>> {
  const indice = new Map<string, FilaRegistro>();
  for await (const fila of cliente.todosLosRegistros({
    desde,
    hasta,
    nivel,
    agruparPorWebmaster: true,
    tamano: 500,
  })) {
    const email = (fila.email ?? "").trim();
    // Sin email no se puede atribuir a nadie; se descarta en vez de inventar.
    if (!email || !fila.date) continue;
    indice.set(clave(email, fila.date), fila);
  }
  return indice;
}

/**
 * Ejecuta el barrido sobre la ventana de revisión.
 *
 * Devuelve `null` si otro barrido ya estaba corriendo: es deliberado, para un
 * proceso periódico es mejor saltarse una vuelta que encolar ejecuciones.
 */
export async function barrerRegistros(
  cliente: ClienteSophon,
  opciones: { desde?: string; hasta?: string; dias?: number } = {},
): Promise<ResultadoBarrido | null> {
  return conCerrojo(CERROJO.SYNC_REGISTROS, async () => {
    const hasta = opciones.hasta ?? hoyContable();
    const dias = opciones.dias ?? DIAS_VENTANA_REVISION;
    const desde = opciones.desde ?? inicioVentana(hasta, dias);

    const ejecucion = await db.ejecucionSync.create({
      data: { tipo: "REGISTROS", desde: new Date(desde), hasta: new Date(hasta) },
    });

    try {
      const [total, webmaster] = await Promise.all([
        leerNivel(cliente, NivelAfiliado.Total, desde, hasta),
        leerNivel(cliente, NivelAfiliado.Webmaster, desde, hasta),
      ]);

      const tarifa = await tarifaVigente();
      let filasEscritas = 0;
      let asientosCreados = 0;
      let webmastersNuevos = 0;

      for (const [k, filaTotal] of total) {
        const filaWebmaster = webmaster.get(k);
        const email = (filaTotal.email ?? "").trim();
        const fecha = filaTotal.date;

        const r = await procesarFila({
          email,
          fecha,
          filaTotal,
          filaWebmaster,
          tarifa,
          hoy: hasta,
          dias,
        });
        filasEscritas += r.escrita ? 1 : 0;
        asientosCreados += r.asientos;
        webmastersNuevos += r.webmasterNuevo ? 1 : 0;
      }

      /*
       * El bono va DESPUÉS del bucle y ANTES de consolidar.
       *
       * Después del bucle porque el hito es por agente y por mes: hace falta el
       * total de toda su red, que no se puede saber fila a fila. Antes de
       * consolidar para que el asiento de bono recién emitido entre en la misma
       * pasada de consolidación que los demás y no se quede un ciclo atrás.
       *
       * Y todo dentro del cerrojo `SYNC_REGISTROS`, que es lo que garantiza que
       * no hay otro barrido emitiendo asientos a la vez.
       */
      const bonos = await devengarBonos(hasta);

      const asientosConsolidados = await consolidarVencidos(hasta, dias);

      const resultado: ResultadoBarrido = {
        filasLeidas: total.size,
        filasEscritas,
        asientosCreados,
        asientosConsolidados,
        bonosEmitidos: bonos,
        webmastersNuevos,
        desde,
        hasta,
        sinTarifa: tarifa === null,
      };

      await db.ejecucionSync.update({
        where: { id: ejecucion.id },
        data: {
          // Sin tarifa el barrido no ha fallado —leyó y guardó todo— pero
          // tampoco ha hecho su trabajo. Se marca COMPLETADA con el motivo
          // escrito, para que la tabla de barridos del panel no diga «todo
          // bien» sobre una vuelta que no devengó un céntimo.
          estado: "COMPLETADA",
          terminadaEn: new Date(),
          filasLeidas: total.size,
          filasEscritas,
          asientosCreados,
          ...(tarifa === null
            ? { error: "Sin tarifa en vigor: no se ha devengado nada." }
            : {}),
        },
      });

      return resultado;
    } catch (e) {
      await db.ejecucionSync.update({
        where: { id: ejecucion.id },
        data: {
          estado: "FALLIDA",
          terminadaEn: new Date(),
          error: e instanceof Error ? e.message : String(e),
        },
      });
      throw e;
    }
  });
}

/**
 * Guarda una fila y devenga lo que falte, todo en una transacción.
 *
 * El devengo se calcula por diferencia contra lo ya asentado (ver
 * `planificarAsientos`), así que este procedimiento es idempotente: llamarlo dos
 * veces con los mismos datos de Sophon no escribe nada la segunda vez.
 */
async function procesarFila(params: {
  email: string;
  fecha: string;
  filaTotal: FilaRegistro;
  filaWebmaster: FilaRegistro | undefined;
  tarifa: Tarifa | null;
  hoy: string;
  dias: number;
}): Promise<{ escrita: boolean; asientos: number; webmasterNuevo: boolean }> {
  const { email, fecha, filaTotal, filaWebmaster, tarifa, hoy, dias } = params;
  const emailNormalizado = normalizarEmail(email);

  const gananciaTotalMicros = microsDesdeCadena(filaTotal.myEarning);
  // Si falta el nivel 2 para esa fila, el margen no se puede calcular todavía.
  // Se guarda la fila igualmente —el dato del agente es válido— y el margen
  // queda a cero hasta que el siguiente barrido lo complete.
  const gananciaWebmasterMicros = filaWebmaster
    ? microsDesdeCadena(filaWebmaster.myEarning)
    : 0n;

  return db.$transaction(async (tx) => {
    let webmasterNuevo = false;

    let wm = await tx.webmaster.findUnique({ where: { emailNormalizado } });
    if (!wm) {
      // Aparece en Sophon pero nadie lo activó desde la app: entra huérfano.
      // Asignarlo a un agente más tarde será PROSPECTIVO (`devengaDesde`), o el
      // agente cobraría tráfico que no trajo él.
      wm = await tx.webmaster.create({
        data: {
          emailNormalizado,
          emailOriginal: email,
          origen: "HUERFANO",
          estadoSophon: "DESCONOCIDO",
        },
      });
      webmasterNuevo = true;
    }

    const cerrado = estaCerrado(fecha, hoy, dias);
    const datosFila = {
      countRegister: Number(filaTotal.countRegister) || 0,
      countT1Register: Number(filaTotal.countT1Register) || 0,
      countT2Register: Number(filaTotal.countT2Register) || 0,
      countT3Register: Number(filaTotal.countT3Register) || 0,
      countPayingUsers: Number(filaTotal.countPayingUsers) || 0,
      paymentAmountMicros: microsDesdeCadena(filaTotal.paymentAmount),
      gananciaTotalMicros,
      gananciaWebmasterMicros,
      gananciaOperadorMicros: gananciaTotalMicros - gananciaWebmasterMicros,
      cerrado,
    };

    const fila = await tx.filaDiariaSophon.upsert({
      where: { webmasterId_fecha: { webmasterId: wm.id, fecha: new Date(fecha) } },
      create: { webmasterId: wm.id, fecha: new Date(fecha), ...datosFila },
      update: datosFila,
    });

    // Sin agente atribuido no hay a quién devengar. La fila se guarda igual:
    // el día que se le asigne un agente, el histórico ya está disponible para
    // decidir la frontera de atribución.
    if (!wm.agenteId || !tarifa) return { escrita: true, asientos: 0, webmasterNuevo };

    const previo = await asentadoPrevio(tx, fila.id);
    const filaDominio: FilaDiaria = {
      webmasterId: wm.id,
      fecha,
      countRegister: datosFila.countRegister,
      countT1Register: datosFila.countT1Register,
      countT2Register: datosFila.countT2Register,
      countT3Register: datosFila.countT3Register,
      countPayingUsers: datosFila.countPayingUsers,
      paymentAmountMicros: datosFila.paymentAmountMicros,
      gananciaTotalMicros,
      gananciaWebmasterMicros,
    };

    const planificados = planificarAsientos({
      fila: filaDominio,
      tarifa,
      previo,
      devengaDesde: wm.devengaDesde ? isoFecha(wm.devengaDesde) : null,
      fechaAjuste: hoy,
    });

    for (const a of planificados) {
      await tx.asientoComision.create({
        data: {
          agenteId: wm.agenteId,
          webmasterId: wm.id,
          filaId: fila.id,
          tipo: a.tipo,
          estado: cerrado ? "CONSOLIDADO" : "PROVISIONAL",
          importeMicros: a.importeMicros,
          baseRegistros: a.baseRegistros,
          baseMicros: a.baseMicros,
          tarifaId: a.tarifaId,
          fechaDevengo: new Date(a.fechaDevengo),
          claveIdempotencia: a.claveIdempotencia,
          nota: a.nota,
        },
      });
    }

    return { escrita: true, asientos: planificados.length, webmasterNuevo };
  });
}

/** Suma lo ya asentado para una fila, separando CPA de CPS. */
async function asentadoPrevio(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  filaId: string,
): Promise<AsentadoPrevio> {
  const asientos = await tx.asientoComision.findMany({
    where: { filaId, estado: { not: "ANULADO" } },
    select: { importeMicros: true, baseMicros: true },
  });

  let cpaMicros: Micros = 0n;
  let cpsMicros: Micros = 0n;
  for (const a of asientos) {
    // El concepto se distingue por la ESTRUCTURA del asiento, no por su texto:
    // los de pago llevan `baseMicros` (el importe sobre el que se aplicó el
    // porcentaje) y los de registro lo dejan a null. Un reverso conserva esa
    // misma forma, así que revierte contra el concepto correcto sin que haya
    // que interpretar la nota, que es prosa y puede reescribirse.
    if (a.baseMicros !== null) cpsMicros += a.importeMicros;
    else cpaMicros += a.importeMicros;
  }
  return { cpaMicros, cpsMicros, secuencia: asientos.length };
}

/**
 * Promueve a `CONSOLIDADO` los asientos cuyo día ya salió de la ventana.
 *
 * **Hace falta además del arreglo de `estaCerrado`, y no es redundante.** Aquel
 * decide bien el estado de un asiento *en el momento de escribirlo*, pero solo
 * alcanza a las filas que el barrido vuelve a leer, que son las de los últimos
 * siete días. Todo lo devengado antes de ese arreglo está ya en la base de datos
 * marcado `PROVISIONAL`, fuera de la ventana y por tanto fuera del alcance de
 * cualquier barrido futuro: sin este paso se quedaría así para siempre y el
 * saldo retirable de los agentes seguiría congelado.
 *
 * Es un `updateMany` acotado por fecha y por estado, así que es idempotente: la
 * segunda vuelta no encuentra nada que promover.
 *
 * **No toca los importes.** Consolidar es declarar que un día ya no se revisa;
 * el dinero ya estaba asentado y aquí solo cambia de estado. Un asiento anulado
 * queda fuera a propósito.
 */
async function consolidarVencidos(hoy: string, dias: number): Promise<number> {
  const frontera = new Date(Date.parse(`${hoy}T00:00:00Z`) - dias * 86_400_000);

  const { count } = await db.asientoComision.updateMany({
    where: { estado: "PROVISIONAL", fechaDevengo: { lte: frontera } },
    data: { estado: "CONSOLIDADO" },
  });
  return count;
}

/** Tarifa en vigor. Si no hay ninguna configurada, no se devenga nada. */
export async function tarifaVigente(): Promise<Tarifa | null> {
  const t = await db.tarifaVersion.findFirst({
    where: { validaHasta: null },
    orderBy: { validaDesde: "desc" },
  });
  if (!t) return null;
  return {
    id: t.id,
    cpaPorRegistroMicros: t.cpaPorRegistroMicros,
    cpsBps: BigInt(t.cpsBps),
  };
}

function isoFecha(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ──────────────────────────── El bono por hitos ────────────────────────────

/** Lo mínimo para poder avisar al agente de que ha cobrado un hito. */
export interface BonoEmitido {
  agenteId: string;
  mes: string;
  usuarios: number;
  importeMicros: Micros;
}

/**
 * Devenga el bono mensual de los agentes.
 *
 * Recalcula **el mes en curso y el anterior**. El anterior porque la ventana de
 * revisión es de siete días: el 3 de agosto un día de julio todavía puede subir,
 * y con él el hito de julio. Como el cálculo es una diferencia contra lo ya
 * asentado, recalcular un mes que no ha cambiado no escribe nada.
 *
 * **Se evalúan TODOS los agentes activos, no solo aquellos cuya red aparece en
 * la ventana de hoy.** La primera versión usaba el conjunto de agentes tocados
 * por el bucle de filas, que parecía más barato y dejaba un agujero real: un
 * agente cuyos webmasters no traen nada HOY no se recalculaba, así que si el
 * hito lo había cruzado con los registros de días anteriores —o si la escalera
 * se configuró después de que el mes ya hubiera avanzado— el bono no se emitía
 * nunca. Se vio en la primera prueba contra base de datos, donde no salía un
 * solo bono.
 *
 * El coste es un agregado por agente y mes. Con las decenas de agentes de este
 * negocio es irrelevante, y compra que el bono no dependa de que Sophon
 * devuelva actividad justo hoy.
 */
async function devengarBonos(hoy: string): Promise<BonoEmitido[]> {
  const escalones = await escaleraVigente();
  if (escalones.length === 0) return [];

  const agentes = await db.agente.findMany({
    where: { estado: "ACTIVO", webmasters: { some: {} } },
    select: { id: true },
  });
  if (agentes.length === 0) return [];

  const meses = [mesDe(hoy), mesAnterior(mesDe(hoy))];
  const emitidos: BonoEmitido[] = [];

  for (const { id } of agentes) {
    for (const mes of meses) {
      const bono = await devengarBonoDelMes(id, mes, hoy, escalones);
      if (bono) emitidos.push(bono);
    }
  }
  return emitidos;
}

/** La escalera en vigor, ordenada. Vacía si no hay ninguna configurada. */
export async function escaleraVigente(): Promise<Escalon[]> {
  const version = await db.bonoVersion.findFirst({
    where: { validaHasta: null },
    orderBy: { validaDesde: "desc" },
    include: { escalones: { orderBy: { usuarios: "asc" } } },
  });
  if (!version) return [];
  return version.escalones.map((e) => ({
    id: e.id,
    usuarios: e.usuarios,
    recompensaMicros: e.recompensaMicros,
  }));
}

/**
 * Cuenta los registros que un agente se ha ganado en un mes.
 *
 * **Respeta `devengaDesde`**, y no es un detalle: un webmaster huérfano adoptado
 * trae consigo su historial, que el agente no captó. Sin este filtro, adoptar a
 * uno grande dispararía un hito de golpe con tráfico ajeno. Es la misma regla
 * prospectiva que aplica el motor al CPA y al CPS.
 *
 * Como `devengaDesde` es por webmaster, no se puede resolver con un solo
 * agregado: se piden los webmasters con su frontera y se suma por tramos.
 */
export async function registrosDelMes(agenteId: string, mes: string): Promise<number> {
  return (await registrosDelMesPorWebmaster(agenteId, mes)).total;
}

/** Lo que aporta cada webmaster al hito del mes. */
export interface AporteAlHito {
  webmasterId: string;
  email: string;
  registros: number;
}

/**
 * El mismo recuento, con el desglose de quién lo trae.
 *
 * El bucle ya sumaba por webmaster —lo obliga `devengaDesde`, que es por
 * webmaster y no se puede resolver con un solo agregado— y tiraba el desglose
 * para devolver un entero. Devolverlo no cuesta ni una consulta más y es lo que
 * convierte la barra del bono en algo accionable: no «te faltan 9.280», sino
 * «te faltan 9.280 y estos tres son los que te están acercando».
 *
 * Se ordena de más a menos aquí, en el servidor, para que ni la Mini App ni el
 * bot tengan que ponerse de acuerdo en el criterio.
 */
export async function registrosDelMesPorWebmaster(
  agenteId: string,
  mes: string,
  /**
   * Corte superior EXCLUSIVO, para preguntar «¿cuánto llevaba ayer?».
   *
   * Es lo que permite avisar de que se ha cruzado la mitad del camino **una
   * sola vez**, comparando el recuento de hoy con el de ayer, en vez de repetir
   * el mismo mensaje cada día mientras se esté entre el 50 % y el 100 %. Sin
   * este parámetro habría que guardar en algún sitio a quién ya se avisó, o sea
   * una tabla nueva para lo que aquí es una resta.
   */
  hastaExclusivo?: Date,
): Promise<{ total: number; porWebmaster: AporteAlHito[] }> {
  const desde = inicioDeMes(mes);
  const finDeMes = inicioDelMesSiguiente(mes);
  const hasta = hastaExclusivo && hastaExclusivo < finDeMes ? hastaExclusivo : finDeMes;

  const webmasters = await db.webmaster.findMany({
    where: { agenteId },
    select: { id: true, emailNormalizado: true, devengaDesde: true },
  });
  if (webmasters.length === 0) return { total: 0, porWebmaster: [] };

  let total = 0;
  const porWebmaster: AporteAlHito[] = [];
  for (const wm of webmasters) {
    // La frontera de atribución puede caer dentro del mes; entonces solo cuenta
    // lo que hay a partir de ella.
    const inicio =
      wm.devengaDesde && wm.devengaDesde > desde ? wm.devengaDesde : desde;
    if (inicio >= hasta) continue;

    const agregado = await db.filaDiariaSophon.aggregate({
      where: { webmasterId: wm.id, fecha: { gte: inicio, lt: hasta } },
      _sum: { countRegister: true },
    });
    const registros = agregado._sum.countRegister ?? 0;
    total += registros;
    if (registros > 0) {
      porWebmaster.push({ webmasterId: wm.id, email: wm.emailNormalizado, registros });
    }
  }

  porWebmaster.sort((a, b) => b.registros - a.registros);
  return { total, porWebmaster };
}

/** Devenga el bono de un agente para un mes concreto. */
async function devengarBonoDelMes(
  agenteId: string,
  mes: string,
  hoy: string,
  escalones: readonly Escalon[],
): Promise<BonoEmitido | null> {
  const registros = await registrosDelMes(agenteId, mes);
  if (registros <= 0) return null;

  // Lo ya pagado de ESE mes. Se identifica por el prefijo de la clave, que lleva
  // el agente y el mes dentro: es el mismo espacio de nombres que construye
  // `planificarBonos` y no depende de la fecha de devengo, que puede haber caído
  // en el mes siguiente si el hito se cruzó con una revisión tardía.
  const previos = await db.asientoComision.findMany({
    where: {
      agenteId,
      tipo: "BONO",
      estado: { not: "ANULADO" },
      claveIdempotencia: { startsWith: `bono:${agenteId}:${mes}:` },
    },
    select: { importeMicros: true },
  });
  const asentadoMicros = previos.reduce((a, p) => a + p.importeMicros, 0n);

  const planificados = planificarBonos({
    registrosDelMes: registros,
    escalones,
    asentadoMicros,
    secuencia: previos.length,
    agenteId,
    mes,
    fechaDevengo: hoy,
  });
  if (planificados.length === 0) return null;

  const a = planificados[0]!;
  const escalon = escalones.find((e) => e.id === a.bonoEscalonId)!;
  const siguiente = siguienteEscalon(registros, escalones);

  try {
    await db.asientoComision.create({
      data: {
        agenteId,
        tipo: "BONO",
        estado: "PROVISIONAL",
        importeMicros: a.importeMicros,
        // `filaId` y `webmasterId` van NULOS, y es obligatorio.
        //
        // `asentadoPrevio` suma los asientos de una fila y distingue CPA de CPS
        // por `baseMicros !== null`, no por el tipo. Un bono colgado de una fila
        // se sumaría al CPA previo de esa fila y el barrido siguiente emitiría
        // un reverso espurio para «corregir» un exceso que no existe. Es un
        // fallo silencioso que solo aparecería en la conciliación.
        bonoEscalonId: a.bonoEscalonId,
        fechaDevengo: new Date(a.fechaDevengo),
        claveIdempotencia: a.claveIdempotencia,
        nota: a.nota,
      },
    });
  } catch (e) {
    // Colisión de clave única: otro proceso lo emitió entre la lectura y la
    // escritura. Es exactamente lo que la clave existe para impedir, así que no
    // es un error: es el sistema funcionando.
    if (esClaveDuplicada(e)) return null;
    throw e;
  }

  /*
   * El aviso va DESPUÉS de que el asiento esté guardado y sin `await` sobre su
   * resultado en el camino crítico —la función se traga sus propios fallos—:
   * el dinero ya consta, y que Telegram no conteste no puede deshacerlo. Es el
   * mismo orden que sigue `resolverRetiro` en el panel.
   */
  const agente = await db.agente.findUnique({
    where: { id: agenteId },
    select: { telegramId: true, idioma: true },
  });
  if (agente) {
    // El importe se formatea con el idioma del agente, no con el del servidor:
    // el aviso llega ya montado a `avisarBonoAlAgente`, que solo sabe de mensajes.
    const idioma = idiomaGuardado(agente.idioma);
    await avisarBonoAlAgente({
      telegramId: agente.telegramId,
      idioma: agente.idioma,
      registros,
      importe: formatearMicros(escalon.recompensaMicros, 2, idioma),
      /*
       * El premio del siguiente escalón va como INCREMENTO, no como total.
       *
       * El bono no es acumulable: el mes paga la recompensa del escalón más
       * alto alcanzado, así que quien acaba de cobrar 100 $ no gana 150 al
       * subir, gana 50 más. El mensaje decía «te faltan N para 150,00 $»
       * justo debajo de «has ganado 100,00 $», que es contar el dinero dos
       * veces y prometer el triple de lo que hay.
       */
      siguiente: siguiente
        ? {
            faltan: siguiente.usuarios - registros,
            premio: formatearMicros(
              siguiente.recompensaMicros - escalon.recompensaMicros,
              2,
              idioma,
            ),
          }
        : null,
    });
  }

  return { agenteId, mes, usuarios: escalon.usuarios, importeMicros: a.importeMicros };
}

function esClaveDuplicada(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}
