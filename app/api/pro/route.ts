import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { esRespuesta, exigirAgente, isoFecha } from "@/lib/api/agente";
import { DIAS_AVISO_PRO, diasRestantesPro, renovablePro } from "@/lib/pro/vigencia";

/**
 * La cola de renovaciones.
 *
 * La pregunta de esta pantalla ha cambiado dos veces. Fue «elige a quién y elige
 * plan», pasó a «¿a quién se le está apagando?» y ahora es la única que se puede
 * contestar con un botón: **¿a quién PUEDO renovar hoy?**
 *
 * El motivo es la regla de `lib/pro/vigencia.ts`: un PRO vigente no se toca. Con
 * ella, «se apaga en 12 días» deja de ser accionable —no hay nada que hacer
 * hasta que se apague— y ordenar la pantalla por urgencia deja de tener sentido:
 * para casi todos, la respuesta es «a nadie, todavía».
 *
 * Por eso esto NO devuelve un catálogo de planes ni un estado de cupo, y por eso
 * `urgentes` cuenta RENOVABLES y no «a punto de caducar». Un contador de cosas
 * que no se pueden tocar es ruido con aspecto de alarma.
 */

export const dynamic = "force-dynamic";

export async function GET(peticion: Request): Promise<NextResponse> {
  const ctx = await exigirAgente(peticion);
  if (esRespuesta(ctx)) return ctx;
  const { agenteId } = ctx.sesion;

  const webmasters = await db.webmaster.findMany({
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
  });

  const ahora = new Date();

  const salida = webmasters.map((w) => {
    const vigente = w.concesiones[0];
    return {
      email: w.emailOriginal,
      id: w.emailNormalizado,
      bloqueado: w.estadoSophon === "BLOQUEADO" || w.estadoSophon === "PENDIENTE_BORRADO",
      proVigenteHasta: w.proVigenteHasta ? isoFecha(w.proVigenteHasta) : null,
      diasRestantes: diasRestantesPro(w.proVigenteHasta, ahora),
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
      /**
       * Se le puede conceder HOY: nunca tuvo PRO o el suyo ya se apagó.
       *
       * Lo decide el servidor y no la pantalla porque es la misma regla que
       * aplica el guardián de `concederAnio`. Con dos implementaciones, la
       * pantalla acabaría ofreciendo botones que el servidor rechaza —o
       * escondiendo los que sí funcionan—.
       */
      renovable: renovablePro(w.proVigenteHasta, ahora),
      /** Cuándo se libera. Es lo único accionable que se puede decir de un PRO vivo. */
      renovableEl: w.proVigenteHasta ? isoFecha(w.proVigenteHasta) : null,
    };
  });

  /*
   * Renovables primero, y dentro de cada grupo por lo que queda.
   *
   * El orden ES la respuesta de la pantalla, así que se decide aquí. Entre los
   * renovables van antes los que nunca tuvieron PRO —normalmente significa que
   * su alta se quedó a medias— y entre los activos, los que menos les queda:
   * esos son los próximos que habrá que atender.
   */
  salida.sort((a, b) => {
    if (a.renovable !== b.renovable) return a.renovable ? -1 : 1;
    if (a.sinPro !== b.sinPro) return a.sinPro ? -1 : 1;
    return (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0);
  });

  return NextResponse.json({
    diasAviso: DIAS_AVISO_PRO,
    webmasters: salida,
    /**
     * Los que se pueden renovar HOY.
     *
     * Contaba «los que se apagan pronto», que con la regla nueva es un número
     * sobre el que no se puede hacer nada: el contador de cabecera pedía atención
     * para una acción que el servidor iba a rechazar.
     */
    renovables: salida.filter((w) => w.renovable).length,
  });
}
