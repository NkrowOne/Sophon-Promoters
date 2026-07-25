import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { claveIdempotencia, normalizarEmail } from "@/lib/cripto";
import { esRespuesta, exigirAgente, webmasterDelAgente } from "@/lib/api/agente";
import { concederAnio } from "@/lib/pro/conceder";

/**
 * Renovar el PRO de un webmaster, o repararlo si el alta lo dejó sin él.
 *
 * Lo que esta ruta ya NO hace, porque el modelo cambió:
 *
 *  - **No acepta plan.** El PRO es siempre de un año. Que el agente pudiera
 *    elegir entre cuatro plazos era una invención de la aplicación, y encima
 *    una que no funcionaba: Sophon ignora el plazo implícito del código de
 *    membresía y aplica 30 días salvo que se le manden los segundos.
 *  - **No consume cupo mensual de PRO.** El freno está donde está el gasto: en
 *    las altas, que son las que regalan un año nuevo. Renovar a un webmaster
 *    que ya está en la red protege un ingreso que ya existe, y ponerle tope
 *    sería empujar al agente a dejar apagarse lo que ya produce.
 *
 * Lo que sí sigue haciendo, porque es el vector de fraude que queda: comprobar
 * que el webmaster es **de este agente**. Sin eso, cualquiera podría renovarle
 * el PRO a la red de otro con el token maestro del superadmin.
 */

export const dynamic = "force-dynamic";

const Cuerpo = z.object({
  email: z.string().email().max(254),
  /** La genera el cliente y hace seguro reintentar sin conceder dos años. */
  idempotencia: z.string().min(8).max(64),
});

export async function POST(peticion: Request): Promise<NextResponse> {
  const ctx = await exigirAgente(peticion);
  if (esRespuesta(ctx)) return ctx;
  const { agenteId, puedeActivarWebmasters } = ctx.sesion;

  if (!puedeActivarWebmasters) {
    return NextResponse.json(
      { error: "No tienes permiso para dar PRO.", apoyo: "Pídeselo al superadmin." },
      { status: 403 },
    );
  }

  const parseado = Cuerpo.safeParse(await peticion.json().catch(() => null));
  if (!parseado.success) {
    return NextResponse.json({ error: "Revisa el correo." }, { status: 400 });
  }

  const emailNormalizado = normalizarEmail(parseado.data.email);
  const webmaster = await webmasterDelAgente(agenteId, emailNormalizado);
  if (!webmaster) {
    return NextResponse.json(
      {
        error: "Ese webmaster no está en tu red.",
        apoyo: "Solo puedes renovar el PRO de los tuyos.",
      },
      { status: 403 },
    );
  }

  const resultado = await concederAnio({
    agenteId,
    webmasterId: webmaster.id,
    emailWebmaster: webmaster.emailOriginal,
    // Es RENOVACION salvo que el webmaster no haya tenido PRO nunca: en ese
    // caso lo que se está haciendo es completar un alta que se quedó a medias,
    // y llamarlo renovación falsearía la contabilidad de concesiones.
    motivo: webmaster.proVigenteHasta ? "RENOVACION" : "ALTA",
    claveIdempotencia: claveIdempotencia(
      agenteId,
      emailNormalizado,
      parseado.data.idempotencia,
    ),
  });

  if (!resultado.ok) {
    return NextResponse.json(
      { error: resultado.error, apoyo: resultado.apoyo },
      { status: resultado.estado ?? 502 },
    );
  }

  await db.auditoria.create({
    data: {
      actorTipo: "AGENTE",
      actorId: agenteId,
      accion: "pro.renovado",
      recurso: emailNormalizado,
      detalle: { vigenteHasta: resultado.vigenteHasta },
    },
  });

  return NextResponse.json({
    ok: true,
    email: webmaster.emailOriginal,
    vigenteHasta: resultado.vigenteHasta,
  });
}
