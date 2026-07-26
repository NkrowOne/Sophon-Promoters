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
import { avisarRedApagadaAlAgente } from "../bot/avisos.ts";
import { diasSinActividad, estaApagado } from "../red/inactividad.ts";
import { hoyContable } from "./registros.ts";

/** Ventana de historial que se mira para decidir si alguien está parado. */
const DIAS_VENTANA = 45;

export interface ResultadoAvisos {
  agentesRevisados: number;
  agentesAvisados: number;
  webmastersApagados: number;
  webmastersConIncidencia: number;
}

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
    const yaHoy = await db.ejecucionSync.findFirst({
      where: {
        tipo: "AVISOS",
        estado: "COMPLETADA",
        iniciadaEn: { gte: new Date(`${hoy}T00:00:00Z`) },
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

      const resultado: ResultadoAvisos = {
        agentesRevisados: agentes.length,
        agentesAvisados,
        webmastersApagados,
        webmastersConIncidencia,
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
