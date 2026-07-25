import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { esRespuesta, exigirAgente, isoFecha } from "@/lib/api/agente";
import { altasDelMes } from "@/lib/pro/conceder";

/**
 * La cola de renovaciones.
 *
 * La pantalla dejó de ser «elige a quién y elige plan» —el PRO va atado al alta
 * y siempre dura un año— y pasó a responder la única pregunta que queda:
 * **¿a quién se le está apagando?**
 *
 * Por eso esto NO devuelve un catálogo de planes ni un estado de cupo de PRO.
 * Devuelve la red ordenada por urgencia, con los que nunca llegaron a tener PRO
 * arriba del todo: un webmaster sin PRO no es el caso menos urgente, es el más
 * —normalmente significa que su alta se quedó a medias—.
 */

export const dynamic = "force-dynamic";

/** A partir de aquí, renovar deja de ser previsión y pasa a ser urgente. */
const DIAS_AVISO = 30;

export async function GET(peticion: Request): Promise<NextResponse> {
  const ctx = await exigirAgente(peticion);
  if (esRespuesta(ctx)) return ctx;
  const { agenteId, puedeActivarWebmasters, cupoAltasMensual } = ctx.sesion;

  const [webmasters, altas] = await Promise.all([
    db.webmaster.findMany({
      where: { agenteId, desaparecidoEn: null },
      select: {
        emailOriginal: true,
        emailNormalizado: true,
        estadoSophon: true,
        proVigenteHasta: true,
        atribuidoEn: true,
        concesiones: {
          where: { estado: "CONFIRMADA" },
          orderBy: { creadoEn: "desc" },
          take: 1,
          select: { creadoEn: true, vigenteHasta: true },
        },
      },
    }),
    altasDelMes(agenteId),
  ]);

  const ahora = Date.now();

  const salida = webmasters.map((w) => {
    const vigente = w.concesiones[0];
    return {
      email: w.emailOriginal,
      id: w.emailNormalizado,
      bloqueado: w.estadoSophon === "BLOQUEADO" || w.estadoSophon === "PENDIENTE_BORRADO",
      proVigenteHasta: w.proVigenteHasta ? isoFecha(w.proVigenteHasta) : null,
      diasRestantes: w.proVigenteHasta
        ? Math.ceil((w.proVigenteHasta.getTime() - ahora) / 86_400_000)
        : null,
      // La Mecha necesita el periodo completo para dibujar lo consumido.
      diasConcedidos:
        vigente?.vigenteHasta && vigente.creadoEn
          ? Math.max(
              1,
              Math.round((vigente.vigenteHasta.getTime() - vigente.creadoEn.getTime()) / 86_400_000),
            )
          : null,
      /** Nunca tuvo PRO: su alta se quedó a medias o llegó como huérfano. */
      sinPro: w.proVigenteHasta === null,
    };
  });

  // Sin PRO primero, luego por días restantes ascendente: el orden ES la
  // respuesta de la pantalla, así que se decide aquí y no en el cliente.
  salida.sort((a, b) => {
    if (a.sinPro !== b.sinPro) return a.sinPro ? -1 : 1;
    return (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0);
  });

  return NextResponse.json({
    puedeConceder: puedeActivarWebmasters,
    diasAviso: DIAS_AVISO,
    // El cupo que se enseña ya no es de PRO sino de altas, porque es el único
    // que existe: renovar no consume nada.
    altas: { usadas: altas, total: cupoAltasMensual },
    webmasters: salida,
    /** Los que piden acción ya: sin PRO, caducados o a punto. */
    urgentes: salida.filter(
      (w) => w.sinPro || (w.diasRestantes !== null && w.diasRestantes <= DIAS_AVISO),
    ).length,
  });
}
