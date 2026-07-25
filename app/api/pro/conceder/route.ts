import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { claveIdempotencia, normalizarEmail } from "@/lib/cripto";
import { esRespuesta, exigirAgente, webmasterDelAgente } from "@/lib/api/agente";
import { clienteSophon } from "@/lib/sophon/instancia";
import { ErrorSophon } from "@/lib/sophon/cliente";
import { CODIGOS_MEMBRESIA, type CodigoMembresia } from "@/lib/sophon/tipos";

/**
 * Conceder PRO: el vector de fraude real de la aplicación.
 *
 * Un `setmembership` regala valor de verdad —hasta un año de VIP— a coste del
 * superadmin. Por eso aquí hay cuatro controles y no uno:
 *
 *  1. El webmaster tiene que ser **de este agente**.
 *  2. El plan tiene que estar en **su lista de autorizados**.
 *  3. El **cupo mensual se reserva en base de datos ANTES** de llamar a Sophon.
 *  4. La reserva lleva **clave de idempotencia**, así que un doble toque —o la
 *     misma sesión abierta en móvil y escritorio, que el producto exige— gasta
 *     una sola concesión.
 *
 * El orden del punto 3 es deliberado: comprobar el cupo y luego llamar dejaría
 * una ventana en la que dos peticiones simultáneas leen «quedan 2» y conceden
 * las dos.
 */

export const dynamic = "force-dynamic";

const Cuerpo = z.object({
  email: z.string().email().max(254),
  plan: z.enum(CODIGOS_MEMBRESIA),
  /** La genera el cliente y hace que reintentar sea seguro. */
  idempotencia: z.string().min(8).max(64),
});

function periodoActual(): string {
  const zona = process.env["ZONA_HORARIA"] ?? "Europe/Madrid";
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(new Date()).slice(0, 7);
}

export async function POST(peticion: Request): Promise<NextResponse> {
  const ctx = await exigirAgente(peticion);
  if (esRespuesta(ctx)) return ctx;
  const { agenteId, puedeConcederPro, planesAutorizados, cupoProMensual } = ctx.sesion;

  if (!puedeConcederPro) {
    return NextResponse.json(
      { error: "No tienes permiso para conceder PRO.", apoyo: "Pídeselo al superadmin." },
      { status: 403 },
    );
  }

  const parseado = Cuerpo.safeParse(await peticion.json().catch(() => null));
  if (!parseado.success) {
    return NextResponse.json({ error: "Revisa el correo y el plan." }, { status: 400 });
  }
  const { plan, idempotencia } = parseado.data;

  if (!planesAutorizados.includes(plan)) {
    return NextResponse.json(
      {
        error: `El plan ${plan} no está entre tus planes autorizados.`,
        apoyo: planesAutorizados.length
          ? `Puedes conceder: ${planesAutorizados.join(", ")}.`
          : "No tienes ningún plan autorizado todavía.",
      },
      { status: 403 },
    );
  }

  const emailNormalizado = normalizarEmail(parseado.data.email);
  const webmaster = await webmasterDelAgente(agenteId, emailNormalizado);
  if (!webmaster) {
    return NextResponse.json(
      {
        error: "Solo puedes conceder PRO a webmasters de tu red.",
        apoyo: "Este webmaster no está a tu cargo.",
      },
      { status: 403 },
    );
  }

  const periodo = periodoActual();
  const clave = claveIdempotencia(agenteId, emailNormalizado, plan, idempotencia);

  // ── Reserva atómica del cupo ───────────────────────────────────────────
  let concesionId: string;
  try {
    concesionId = await db.$transaction(async (tx) => {
      const yaHecha = await tx.concesionPro.findUnique({
        where: { claveIdempotencia: clave },
        select: { id: true, estado: true },
      });
      if (yaHecha) {
        // Un intento que FALLÓ no entregó nada, así que no puede bloquear la
        // clave: si se conservara, el agente no podría reintentar jamás con el
        // mismo botón y se quedaría atascado sin entender por qué. Se descarta y
        // se reserva de nuevo.
        if (yaHecha.estado === "FALLIDA") {
          await tx.concesionPro.delete({ where: { id: yaHecha.id } });
        } else {
          // Reintento sobre algo que sí prosperó: se devuelve tal cual en vez de
          // gastar otra concesión. Es lo que hace seguro pulsar dos veces.
          throw new Error(`REPETIDA:${yaHecha.id}:${yaHecha.estado}`);
        }
      }

      const usadas = await tx.concesionPro.count({
        where: { agenteId, periodoCupo: periodo, estado: { in: ["RESERVADA", "CONFIRMADA"] } },
      });
      if (usadas >= cupoProMensual) throw new Error(`CUPO:${usadas}`);

      const creada = await tx.concesionPro.create({
        data: {
          agenteId,
          webmasterId: webmaster.id,
          codigoMembresia: plan,
          periodoCupo: periodo,
          claveIdempotencia: clave,
          estado: "RESERVADA",
        },
        select: { id: true },
      });
      return creada.id;
    });
  } catch (e) {
    const motivo = e instanceof Error ? e.message : "";
    if (motivo.startsWith("REPETIDA:")) {
      const [, id, estado] = motivo.split(":");
      return NextResponse.json({ ok: true, repetida: true, id, estado });
    }
    if (motivo.startsWith("CUPO:")) {
      return NextResponse.json(
        {
          error: `Has agotado tu cupo de PRO de este mes (${cupoProMensual} de ${cupoProMensual}).`,
          apoyo: "Se reinicia el día 1. Si lo necesitas antes, pídele ampliación al superadmin.",
        },
        { status: 429 },
      );
    }
    console.error("[pro] reserva fallida", e);
    return NextResponse.json({ error: "No se ha podido reservar el cupo." }, { status: 500 });
  }

  // ── Concesión en Sophon ────────────────────────────────────────────────
  try {
    const r = await clienteSophon().concederMembresia(
      webmaster.emailOriginal,
      plan as CodigoMembresia,
    );

    // `membership_end_at` es la ÚNICA fuente de la caducidad: no hay endpoint
    // para consultarla después. Si no se persiste aquí, se pierde para siempre.
    const fin =
      typeof r.membership_end_at === "object" && r.membership_end_at?.seconds
        ? new Date(r.membership_end_at.seconds * 1000)
        : typeof r.membership_end_at === "string"
          ? new Date(r.membership_end_at)
          : null;

    await db.$transaction([
      db.concesionPro.update({
        where: { id: concesionId },
        data: { estado: "CONFIRMADA", vigenteHasta: fin, uidSophon: r.uid ?? null },
      }),
      db.webmaster.update({
        where: { id: webmaster.id },
        data: { proVigenteHasta: fin, proPlanActual: plan },
      }),
      db.auditoria.create({
        data: {
          actorTipo: "AGENTE",
          actorId: agenteId,
          accion: "pro.concedido",
          recurso: emailNormalizado,
          detalle: { plan, vigenteHasta: fin?.toISOString() ?? null },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      email: webmaster.emailOriginal,
      plan,
      vigenteHasta: fin ? fin.toISOString().slice(0, 10) : null,
    });
  } catch (e) {
    // El cupo se devuelve: no se ha entregado nada, así que no puede costarle
    // una concesión al agente.
    const err = e instanceof ErrorSophon ? e : null;
    await db.concesionPro.update({
      where: { id: concesionId },
      data: {
        estado: "FALLIDA",
        mensaje: err?.message ?? String(e),
        traceId: err?.traceId ?? null,
      },
    });

    if (err?.esFaltaWhitelist) {
      return NextResponse.json(
        {
          error: "La cuenta aún no está autorizada en Sophon.",
          apoyo: "El superadmin tiene que tramitarlo. Tu cupo sigue intacto.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error: "Sophon no responde ahora mismo.",
        apoyo: "No se ha concedido nada; tu cupo sigue intacto. Inténtalo en un minuto.",
      },
      { status: 502 },
    );
  }
}
