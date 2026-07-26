/**
 * Barrido diario: decirle al agente lo que no va a ver si no abre la app.
 *
 * Antes de esto, el agente recibía **un** aviso en toda la aplicación: el de su
 * retiro resuelto. O sea que el único empujón que existía era el del dinero que
 * ya se había ganado, y el trabajo por el que se le paga —notar que un
 * webmaster se ha apagado y llamarle— no tenía ninguno. La Malla lo enseña muy
 * bien, pero solo si el agente entra a mirar, y un comercial que ya cobró este
 * mes no entra.
 *
 * Tres decisiones que son el barrido entero:
 *
 *  - **Un mensaje al día por agente, y solo si hay algo que decir.** Un aviso
 *    por webmaster convertiría el chat en ruido, el agente silenciaría el bot y
 *    entonces se pierde también el aviso del retiro. El canal es uno solo y hay
 *    que gastarlo con cuidado.
 *  - **El PRO no entra.** Que caduque una suscripción no es una urgencia
 *    comercial —y con la regla de vigencia ni siquiera es accionable hasta que
 *    se apaga—. Meterlo aquí sería devolverle por la puerta de atrás el peso que
 *    se le acaba de quitar en los menús.
 *  - **En el idioma del agente**, con `Agente.idioma`, igual que el aviso de
 *    retiro. Aquí no hay ningún update de Telegram del que leer un
 *    `language_code`: lo dispara el cron, no una persona.
 */

import { db, CERROJO, conCerrojo } from "../db.ts";
import { avisarCaminoDelBonoAlAgente, avisarRedApagadaAlAgente } from "../bot/avisos.ts";
import { diasSinActividad, estaApagado } from "../red/inactividad.ts";
import { escaleraVigente, hoyContable, registrosDelMesPorWebmaster } from "./registros.ts";
import { siguienteEscalon, type Escalon } from "../devengo/bonos.ts";
import {
  diaDelMes,
  diasQueQuedanDelMes,
  inicioDelDiaContable,
  mesContable,
} from "../fechas.ts";
import { formatearMicros } from "../devengo/dinero.ts";

/** Ventana de historial que se mira para decidir si alguien está parado. */
const DIAS_VENTANA = 45;

export interface ResultadoAvisos {
  agentesRevisados: number;
  agentesAvisados: number;
  webmastersApagados: number;
  webmastersConIncidencia: number;
  /** Agentes a los que se ha empujado hacia el bono. */
  agentesEmpujados: number;
}

/**
 * Últimos días del mes en los que la recta final se considera recta final.
 *
 * Siete, y no treinta: el empujón vale porque es raro. Fuera de esta ventana el
 * único aviso del bono que se manda es el de cruzar la mitad del camino, que
 * por construcción ocurre una vez por escalón.
 */
const DIAS_RECTA_FINAL = 7;

/**
 * Estados de Sophon que el agente tiene que saber y no puede deducir.
 *
 * `BLOQUEADO` y `PENDIENTE_BORRADO` los decide Sophon y no hay botón que valga,
 * pero son justo lo que explica que un webmaster deje de producir: sin esto, el
 * agente llama para preguntar por qué ha bajado el tráfico y se entera entonces.
 */
const INCIDENCIAS = ["BLOQUEADO", "PENDIENTE_BORRADO"];

export async function barrerAvisos(): Promise<ResultadoAvisos | null> {
  return conCerrojo(CERROJO.SYNC_AVISOS, async () => {
    /*
     * Cerrojo diario, no solo de concurrencia.
     *
     * `conCerrojo` evita dos ejecuciones SIMULTÁNEAS, que no es lo mismo: el
     * cron corre cada media hora, así que sin esto el agente recibiría el mismo
     * mensaje cuarenta y ocho veces al día. La marca es la propia
     * `EjecucionSync`, así que no hace falta ninguna columna nueva ni ningún
     * fichero de estado.
     */
    const hoy = hoyContable();
    /*
     * La frontera del día se calcula EN LA ZONA CONTABLE, no en UTC.
     *
     * Aquí ponía `` `${hoy}T00:00:00Z` ``, que es la medianoche UTC de una fecha
     * calculada en otra zona: dos relojes distintos comparados como si fueran el
     * mismo. Con Madrid el desfase era de una o dos horas y ya duplicaba mensajes
     * en ese hueco; con el día contable en UTC+8 pasa a ser de OCHO horas, y en
     * ellas `iniciadaEn >= medianoche UTC` mira un instante que todavía no ha
     * llegado, así que nunca encuentra la ejecución de hoy: el cerrojo no cierra
     * y el agente recibe el mismo aviso cada media hora hasta media tarde.
     */
    const yaHoy = await db.ejecucionSync.findFirst({
      where: {
        tipo: "AVISOS",
        estado: "COMPLETADA",
        iniciadaEn: { gte: inicioDelDiaContable(hoy) },
      },
      select: { id: true },
    });
    if (yaHoy) return null;

    const ejecucion = await db.ejecucionSync.create({ data: { tipo: "AVISOS" } });

    try {
      const desde = new Date(Date.parse(`${hoy}T00:00:00Z`) - DIAS_VENTANA * 86_400_000);

      // Solo agentes ACTIVOS y con Telegram: a un agente suspendido no se le
      // pide que trabaje su red, y sin `telegramId` no hay a dónde mandar nada.
      const agentes = await db.agente.findMany({
        where: { estado: "ACTIVO", telegramId: { not: null } },
        select: {
          id: true,
          telegramId: true,
          idioma: true,
          webmasters: {
            where: { desaparecidoEn: null },
            select: {
              emailOriginal: true,
              emailNormalizado: true,
              estadoSophon: true,
              atribuidoEn: true,
              filasDiarias: {
                where: { fecha: { gte: desde } },
                select: { fecha: true, countRegister: true },
                orderBy: { fecha: "desc" },
              },
            },
          },
        },
      });

      let agentesAvisados = 0;
      let webmastersApagados = 0;
      let webmastersConIncidencia = 0;
      let agentesEmpujados = 0;

      // La escalera se lee UNA vez para todo el barrido: es la misma para todos
      // los agentes y no cambia a mitad de bucle.
      const escalones = await escaleraVigente();

      for (const agente of agentes) {
        const apagados: { email: string; dias: number }[] = [];
        const incidencias: { email: string; estado: string }[] = [];

        for (const w of agente.webmasters) {
          if (INCIDENCIAS.includes(w.estadoSophon)) {
            incidencias.push({ email: w.emailOriginal, estado: w.estadoSophon });
            continue;
          }
          const dias = diasSinActividad(w.filasDiarias, hoy);
          if (estaApagado(dias)) apagados.push({ email: w.emailOriginal, dias: dias! });
        }

        if (apagados.length === 0 && incidencias.length === 0) continue;

        // Los que llevan más tiempo parados primero: son los que se pierden.
        apagados.sort((a, b) => b.dias - a.dias);

        await avisarRedApagadaAlAgente({
          telegramId: agente.telegramId,
          idioma: agente.idioma,
          apagados,
          incidencias,
          total: agente.webmasters.length,
        });

        agentesAvisados++;
        webmastersApagados += apagados.length;
        webmastersConIncidencia += incidencias.length;
      }

      // El empujón del bono va en su propia pasada y no dentro del bucle de
      // arriba: aquel sale antes por `continue` cuando no hay nada que decir de
      // la red, y quien tiene la red impecable es justo quien más cerca puede
      // estar del hito.
      if (escalones.length > 0) {
        for (const agente of agentes) {
          if (await empujarHaciaElBono(agente, escalones, hoy)) agentesEmpujados++;
        }
      }

      const resultado: ResultadoAvisos = {
        agentesRevisados: agentes.length,
        agentesAvisados,
        webmastersApagados,
        webmastersConIncidencia,
        agentesEmpujados,
      };

      await db.ejecucionSync.update({
        where: { id: ejecucion.id },
        data: { estado: "COMPLETADA", terminadaEn: new Date(), filasLeidas: agentes.length },
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
 * ¿Hay que empujar a este agente hacia el bono hoy?
 *
 * Dos situaciones, y solo dos:
 *
 *  1. **Ha cruzado la mitad del camino** hacia el siguiente escalón. Se detecta
 *     comparando lo que lleva hoy con lo que llevaba ayer, no mirando si está
 *     por encima del 50 %: lo segundo avisaría todos los días desde que lo cruza
 *     hasta que lo alcanza. Es una transición, y las transiciones se detectan
 *     con dos lecturas.
 *  2. **Está en la recta final del mes** —los últimos siete días— y el hito le
 *     da tiempo al ritmo que lleva. Si no le da, no se dice nada: recordarle una
 *     meta que ya no alcanza no es un empujón, es una regañina.
 *
 * Como mucho un mensaje, y el barrido entero corre una vez al día.
 */
async function empujarHaciaElBono(
  agente: { id: string; telegramId: bigint | null; idioma: string },
  escalones: readonly Escalon[],
  hoy: string,
): Promise<boolean> {
  if (agente.telegramId === null) return false;

  const mes = mesContable();
  const ayer = new Date(Date.parse(`${hoy}T00:00:00Z`));

  const [actual, hastaAyer] = await Promise.all([
    registrosDelMesPorWebmaster(agente.id, mes),
    registrosDelMesPorWebmaster(agente.id, mes, ayer),
  ]);

  const siguiente = siguienteEscalon(actual.total, escalones);
  // Sin siguiente escalón ya está arriba del todo: ahí no hay nada que empujar,
  // y `avisarBonoAlAgente` ya se lo dijo cuando cobró.
  if (!siguiente) return false;

  const anterior = escalones
    .filter((e) => e.usuarios < siguiente.usuarios)
    .reduce((alto, e) => Math.max(alto, e.usuarios), 0);
  const mitad = anterior + (siguiente.usuarios - anterior) / 2;
  const cruzaLaMitad = hastaAyer.total < mitad && actual.total >= mitad;

  const transcurridos = diaDelMes(hoy);
  const restantes = diasQueQuedanDelMes(hoy);
  const porDia = actual.total / transcurridos;
  const faltan = siguiente.usuarios - actual.total;
  const llegaATiempo = porDia > 0 && Math.ceil(faltan / porDia) <= restantes;
  const enLaRectaFinal = restantes <= DIAS_RECTA_FINAL && llegaATiempo;

  if (!cruzaLaMitad && !enLaRectaFinal) return false;

  await avisarCaminoDelBonoAlAgente({
    telegramId: agente.telegramId,
    idioma: agente.idioma,
    faltan,
    premio: formatearMicros(siguiente.recompensaMicros),
    ritmo: Math.round(porDia * 10) / 10,
    diasRestantes: restantes,
    porWebmaster: actual.porWebmaster,
  });
  return true;
}
