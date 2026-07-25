import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { esRespuesta, exigirAgente, isoFecha } from "@/lib/api/agente";

/**
 * Estado del cupo de PRO y a quién se le puede conceder.
 *
 * El cupo consumido se cuenta con el MISMO criterio que la reserva: entran las
 * concesiones `RESERVADA` y `CONFIRMADA`, no las fallidas. Si esta pantalla
 * contara de otra forma, el agente vería «te quedan 2» y el servidor le
 * respondería que no quedan, que es la peor manera de enterarse.
 */

export const dynamic = "force-dynamic";

function periodoActual(): string {
  const zona = process.env["ZONA_HORARIA"] ?? "Europe/Madrid";
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(new Date()).slice(0, 7);
}

export async function GET(peticion: Request): Promise<NextResponse> {
  const ctx = await exigirAgente(peticion);
  if (esRespuesta(ctx)) return ctx;
  const { agenteId, puedeConcederPro, planesAutorizados, cupoProMensual } = ctx.sesion;

  const periodo = periodoActual();

  const [usadas, webmasters] = await Promise.all([
    db.concesionPro.count({
      where: { agenteId, periodoCupo: periodo, estado: { in: ["RESERVADA", "CONFIRMADA"] } },
    }),
    db.webmaster.findMany({
      where: { agenteId, desaparecidoEn: null },
      orderBy: [{ proVigenteHasta: "asc" }, { emailNormalizado: "asc" }],
      select: {
        emailOriginal: true,
        emailNormalizado: true,
        estadoSophon: true,
        proVigenteHasta: true,
        proPlanActual: true,
      },
    }),
  ]);

  return NextResponse.json({
    puedeConceder: puedeConcederPro,
    planes: planesAutorizados,
    cupo: { total: cupoProMensual, usadas, periodo },
    // Ordenados por caducidad ascendente: el primero de la lista es el que más
    // cerca está de apagarse, que es a quien se viene a renovar.
    webmasters: webmasters.map((w) => ({
      email: w.emailOriginal,
      id: w.emailNormalizado,
      bloqueado: w.estadoSophon === "BLOQUEADO" || w.estadoSophon === "PENDIENTE_BORRADO",
      proVigenteHasta: w.proVigenteHasta ? isoFecha(w.proVigenteHasta) : null,
      proPlan: w.proPlanActual,
      diasRestantes: w.proVigenteHasta
        ? Math.ceil((w.proVigenteHasta.getTime() - Date.now()) / 86_400_000)
        : null,
    })),
  });
}
