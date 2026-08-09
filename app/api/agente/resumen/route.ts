import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  CAMPOS_FILA_VISIBLES,
  dinero,
  esRespuesta,
  exigirAgente,
  isoFecha,
  saldos,
} from "@/lib/api/agente";
import { estaCerrado } from "@/lib/devengo/motor";
import type { Idioma } from "@/lib/idiomas";
import {
  escaleraVigente,
  hoyContable,
  registrosDelMes,
  registrosDelMesPorWebmaster,
} from "@/lib/sync/registros";
import { escalonAlcanzado, siguienteEscalon } from "@/lib/devengo/bonos";
import {
  diaDelMes,
  diasDelMes,
  diasQueQuedanDelMes,
  mesAnterior,
  mesContable,
} from "@/lib/fechas";

/**
 * Resumen de la pantalla de inicio: la serie diaria del Testigo y los saldos.
 *
 * El importe de cada día es lo que gana EL AGENTE, que sale de sus asientos, no
 * de la ganancia bruta que Sophon publica para esa fila. Son cifras distintas y
 * confundirlas mostraría al agente el dinero del Operador.
 */

export const dynamic = "force-dynamic";

const DIAS = 30;

export async function GET(peticion: Request): Promise<NextResponse> {
  const ctx = await exigirAgente(peticion);
  if (esRespuesta(ctx)) return ctx;
  const { agenteId, idioma } = ctx.sesion;

  const hoy = hoyContable();
  const desde = new Date(Date.parse(`${hoy}T00:00:00Z`) - (DIAS - 1) * 86_400_000);

  const [asientos, filas, saldo, webmasters, concesiones, hito] = await Promise.all([
    // Lo que gana el agente, por día.
    db.asientoComision.groupBy({
      by: ["fechaDevengo"],
      where: { agenteId, estado: { not: "ANULADO" }, fechaDevengo: { gte: desde } },
      _sum: { importeMicros: true },
    }),
    // El desglose por tier viene de las filas de SUS webmasters.
    db.filaDiariaSophon.findMany({
      where: { webmaster: { agenteId }, fecha: { gte: desde } },
      select: CAMPOS_FILA_VISIBLES,
    }),
    saldos(agenteId),
    db.webmaster.count({ where: { agenteId, desaparecidoEn: null } }),
    db.concesionPro.findMany({
      where: { agenteId, estado: "CONFIRMADA", creadoEn: { gte: desde } },
      select: { creadoEn: true },
    }),
    progresoDelHito(agenteId, idioma),
  ]);

  // Se agrega por fecha en memoria: son 30 filas como mucho.
  const porFecha = new Map<
    string,
    { importeMicros: bigint; t1: number; t2: number; t3: number; registros: number; pagos: number }
  >();

  const vacio = () => ({ importeMicros: 0n, t1: 0, t2: 0, t3: 0, registros: 0, pagos: 0 });

  for (const a of asientos) {
    const f = isoFecha(a.fechaDevengo);
    const acc = porFecha.get(f) ?? vacio();
    acc.importeMicros += a._sum.importeMicros ?? 0n;
    porFecha.set(f, acc);
  }
  for (const f of filas) {
    const clave = isoFecha(f.fecha);
    const acc = porFecha.get(clave) ?? vacio();
    acc.t1 += f.countT1Register;
    acc.t2 += f.countT2Register;
    acc.t3 += f.countT3Register;
    acc.registros += f.countRegister;
    acc.pagos += f.countPayingUsers;
    porFecha.set(clave, acc);
  }

  const concesionesPorFecha = new Set(concesiones.map((c) => isoFecha(c.creadoEn)));

  const dias = [...porFecha.entries()]
    // Del más reciente al más antiguo: el Testigo se lee de arriba abajo.
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([fecha, v]) => ({
      fecha,
      importeMicros: v.importeMicros.toString(),
      importe: dinero(v.importeMicros, idioma).texto,
      registros: v.registros,
      registrosT1: v.t1,
      registrosT2: v.t2,
      registrosT3: v.t3,
      usuariosPago: v.pagos,
      // Un día abierto todavía puede revisarse: se marca para que el Testigo lo
      // dibuje con la veta y el agente sepa que esa cifra aún puede moverse.
      provisional: !estaCerrado(fecha, hoy),
      concesiones: concesionesPorFecha.has(fecha) ? 1 : 0,
    }));

  return NextResponse.json({
    dias,
    webmasters,
    cartera: {
      devengado: dinero(saldo.devengadoMicros, idioma),
      disponible: dinero(saldo.disponibleMicros, idioma),
      solicitado: dinero(saldo.solicitadoMicros, idioma),
      pagado: dinero(saldo.pagadoMicros, idioma),
    },
    hito,
  });
}

/**
 * Dónde va el agente en la escalera del bono este mes.
 *
 * Los registros son los del **mes natural**, no los de la ventana móvil de 30
 * días que usa el resto de esta ruta: el bono se resetea el día 1, así que
 * mezclar las dos ventanas enseñaría una barra que no cuadra con lo que se cobra.
 *
 * Devuelve `null` si no hay escalera configurada, y entonces la portada no pinta
 * nada: una barra de progreso hacia un objetivo que no existe es peor que el
 * hueco que deja.
 */
async function progresoDelHito(agenteId: string, idioma: Idioma) {
  const escalones = await escaleraVigente();
  if (escalones.length === 0) return null;

  const hoy = hoyContable();
  const mes = mesContable();
  const anterior = mesAnterior(mes);

  const [actual, registrosMesAnterior] = await Promise.all([
    registrosDelMesPorWebmaster(agenteId, mes),
    registrosDelMes(agenteId, anterior),
  ]);
  const registros = actual.total;

  const alcanzado = escalonAlcanzado(registros, escalones);
  const siguiente = siguienteEscalon(registros, escalones);

  /*
   * El ritmo y la proyección.
   *
   * Son la respuesta a «que siempre se vea progreso sin mover las metas». La
   * barra del hito es honesta y con los umbrales de hoy va a marcar poco, pero
   * el ritmo se mueve TODOS los días y la proyección con él, así que hay una
   * cifra que responde al trabajo de esta mañana aunque el objetivo esté lejos.
   *
   * Y no se falsea la escala de la barra para conseguirlo: distorsionar un eje
   * de valor para que un 7 % parezca más es mentir sobre la distancia que
   * queda. Lo que cambia es qué se mide, no cómo se dibuja.
   *
   * El decimal del ritmo depende del tamaño del ritmo, y no es una floritura:
   * a tres registros al día un entero se queda clavado en «3» durante una
   * semana y no cuenta nada, mientras que a cuatrocientos el decimal es ruido
   * —«461,5 registros al día» finge una precisión que la cifra no tiene—. Bajo
   * diez, un decimal; a partir de ahí, entero.
   */
  const transcurridos = diaDelMes(hoy);
  const delMes = diasDelMes(mes);
  const restantes = diasQueQuedanDelMes(hoy);
  const porDia = registros / transcurridos;
  const ritmo = porDia < 10 ? Math.round(porDia * 10) / 10 : Math.round(porDia);
  const proyeccion = Math.round(porDia * delMes);

  /*
   * ¿Llega el hito a este ritmo, y cuándo?
   *
   * `null` cuando no llega dentro del mes. Prometer una fecha de febrero para un
   * hito que se resetea el 31 de enero sería enseñar una meta que no existe.
   */
  const faltan = siguiente ? siguiente.usuarios - registros : 0;
  const diasParaElHito = siguiente && porDia > 0 ? Math.ceil(faltan / porDia) : null;
  const llegaEsteMes = diasParaElHito !== null && diasParaElHito <= restantes;

  return {
    registros,
    // Lo ya ganado este mes es la recompensa del escalón más alto alcanzado, no
    // la suma: el bono no es acumulable.
    ganado: dinero(alcanzado?.recompensaMicros ?? 0n, idioma),
    siguiente: siguiente
      ? {
          usuarios: siguiente.usuarios,
          faltan,
          premio: dinero(siguiente.recompensaMicros, idioma),
          /*
           * Lo que se gana DE MÁS, que no es lo que paga el escalón siguiente.
           *
           * Como el mes paga la recompensa del escalón más alto y no la suma,
           * subir de 20.000 a 30.000 no aporta los 150 del escalón alto: aporta
           * los 50 de diferencia. La banda enseñaba el premio entero junto a lo
           * ya ganado, así que el agente sumaba dos veces el mismo dinero.
           */
          incremento: dinero(siguiente.recompensaMicros - (alcanzado?.recompensaMicros ?? 0n), idioma),
        }
      : null,
    escalones: escalones.map((e) => ({
      usuarios: e.usuarios,
      premio: dinero(e.recompensaMicros, idioma),
      alcanzado: registros >= e.usuarios,
    })),
    ritmo,
    proyeccion,
    diasRestantes: restantes,
    /** Día del mes en que se alcanzaría el siguiente escalón, o `null`. */
    llegaEl: llegaEsteMes ? isoFecha(sumarDias(hoy, diasParaElHito)) : null,
    /**
     * Registros del mes cerrado anterior, para comparar.
     *
     * `null` el primer mes del agente: sin nada con que comparar, «has bajado
     * un 100 %» sería falso y desmoralizante a la vez.
     */
    mesAnterior: registrosMesAnterior > 0 ? registrosMesAnterior : null,
    /**
     * Quién está llevando el hito. Tres como mucho: es una lista de llamadas,
     * no un informe, y una lista de veinte correos en un móvil no se lee.
     */
    porWebmaster: actual.porWebmaster.slice(0, 3),
  };
}

/** `AAAA-MM-DD` más N días, en el mismo calendario UTC que usa todo el ledger. */
function sumarDias(fecha: string, dias: number): Date {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) + dias * 86_400_000);
}
