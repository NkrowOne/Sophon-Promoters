/**
 * Barrido de webmasters: concilia el árbol real de Sophon con nuestra tabla.
 *
 * La atribución agente → webmaster vive **solo aquí**: Sophon no conoce a los
 * agentes. Eso la hace frágil, porque el árbol puede cambiar por fuera —soporte
 * de Sophon, el propio superadmin, o un webmaster que se da de baja— y nuestra
 * fila seguiría intacta, devengando por tráfico que ya no entra por él.
 *
 * Este barrido es la defensa: marca lo que aparece, lo que cambia de estado y lo
 * que desaparece, para que un descuadre sea visible en vez de silencioso.
 */

import { db, CERROJO, conCerrojo } from "../db.ts";
import { normalizarEmail } from "../cripto.ts";
import type { ClienteSophon } from "../sophon/cliente.ts";
import { ErrorSophon } from "../sophon/cliente.ts";

export interface ResultadoWebmasters {
  vistos: number;
  nuevos: number;
  cambiosDeEstado: number;
  desaparecidos: number;
  /** La Tool API exige whitelist; sin ella este barrido no puede correr. */
  sinWhitelist: boolean;
}

/** Traduce el estado textual de Sophon al enum del esquema. */
function traducirEstado(status: string): "ACTIVO" | "BLOQUEADO" | "PENDIENTE_BORRADO" | "DESCONOCIDO" {
  switch (status) {
    case "active":
      return "ACTIVO";
    case "locked":
      return "BLOQUEADO";
    case "pending_deletion":
      return "PENDIENTE_BORRADO";
    default:
      return "DESCONOCIDO";
  }
}

export async function barrerWebmasters(
  cliente: ClienteSophon,
): Promise<ResultadoWebmasters | null> {
  return conCerrojo(CERROJO.SYNC_WEBMASTERS, async () => {
    const ejecucion = await db.ejecucionSync.create({ data: { tipo: "WEBMASTERS" } });
    const inicio = new Date();

    try {
      const vistos = new Map<string, string>();

      // `sub-aff/status` pagina de 20 en 20 y no acepta más: el tope lo impone
      // la API, no nosotros. Se recorre hasta agotar el total que ella declara.
      let pagina = 1;
      let total = Number.POSITIVE_INFINITY;
      while (vistos.size < total) {
        const r = await cliente.estadoSubAfiliados("all", pagina, 20);
        total = r.total || r.summary?.total || 0;
        const items = r.items ?? [];
        if (items.length === 0) break;
        for (const it of items) {
          if (it.email) vistos.set(normalizarEmail(it.email), it.status);
        }
        pagina++;
      }

      let nuevos = 0;
      let cambiosDeEstado = 0;

      for (const [email, status] of vistos) {
        const estadoSophon = traducirEstado(status);
        const existente = await db.webmaster.findUnique({
          where: { emailNormalizado: email },
          select: { id: true, estadoSophon: true },
        });

        if (!existente) {
          await db.webmaster.create({
            data: {
              emailNormalizado: email,
              emailOriginal: email,
              origen: "HUERFANO",
              estadoSophon,
              vistoPorUltimaVezEn: new Date(),
            },
          });
          nuevos++;
          continue;
        }

        if (existente.estadoSophon !== estadoSophon) {
          cambiosDeEstado++;
          // Un bloqueo o una baja es información que el agente necesita ver en
          // su red, así que queda auditado además de actualizado.
          await db.auditoria.create({
            data: {
              actorTipo: "SISTEMA",
              accion: "webmaster.cambio_estado",
              recurso: email,
              detalle: { antes: existente.estadoSophon, despues: estadoSophon },
            },
          });
        }

        await db.webmaster.update({
          where: { id: existente.id },
          data: { estadoSophon, vistoPorUltimaVezEn: new Date(), desaparecidoEn: null },
        });
      }

      // Lo que ya no aparece se marca, no se borra: sus filas diarias y sus
      // asientos siguen siendo historia contable válida y no pueden perderse.
      const desaparecidos = await db.webmaster.updateMany({
        where: {
          desaparecidoEn: null,
          emailNormalizado: { notIn: [...vistos.keys()] },
          // Solo los que alguna vez se vieron: si nunca se sincronizó, no ha
          // desaparecido, es que aún no ha llegado.
          vistoPorUltimaVezEn: { not: null, lt: inicio },
        },
        data: { desaparecidoEn: new Date() },
      });

      const resultado: ResultadoWebmasters = {
        vistos: vistos.size,
        nuevos,
        cambiosDeEstado,
        desaparecidos: desaparecidos.count,
        sinWhitelist: false,
      };

      await db.ejecucionSync.update({
        where: { id: ejecucion.id },
        data: {
          estado: "COMPLETADA",
          terminadaEn: new Date(),
          filasLeidas: vistos.size,
          filasEscritas: nuevos + cambiosDeEstado,
        },
      });

      return resultado;
    } catch (e) {
      const sinWhitelist = e instanceof ErrorSophon && e.esFaltaWhitelist;
      await db.ejecucionSync.update({
        where: { id: ejecucion.id },
        data: {
          // Faltar la whitelist no es un fallo del sistema, es una configuración
          // pendiente: se marca PARCIAL para no llenar el historial de errores
          // rojos por algo que solo se arregla con un trámite externo.
          estado: sinWhitelist ? "PARCIAL" : "FALLIDA",
          terminadaEn: new Date(),
          error: e instanceof Error ? e.message : String(e),
        },
      });
      if (sinWhitelist) {
        return { vistos: 0, nuevos: 0, cambiosDeEstado: 0, desaparecidos: 0, sinWhitelist: true };
      }
      throw e;
    }
  });
}
