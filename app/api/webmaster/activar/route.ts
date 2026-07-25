import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { normalizarEmail } from "@/lib/cripto";
import { esRespuesta, exigirAgente } from "@/lib/api/agente";
import { clienteSophon } from "@/lib/sophon/instancia";
import { ErrorSophon } from "@/lib/sophon/cliente";
import { hoyContable } from "@/lib/sync/registros";

/**
 * Activar un webmaster: la acción que crea la atribución.
 *
 * El orden importa y no es el intuitivo. Se **reserva primero en local** y se
 * llama a Sophon después, porque el índice único sobre `emailNormalizado` es lo
 * único que impide que dos agentes reclamen el mismo webmaster. Si se llamara
 * primero a Sophon, dos peticiones simultáneas pasarían las dos y la carrera se
 * resolvería en la base de datos con uno de los agentes ya convencido de que el
 * webmaster es suyo.
 *
 * Si Sophon rechaza la vinculación, la reserva se deshace.
 */

export const dynamic = "force-dynamic";

const Cuerpo = z.object({
  email: z.string().email().max(254),
});

export async function POST(peticion: Request): Promise<NextResponse> {
  const ctx = await exigirAgente(peticion);
  if (esRespuesta(ctx)) return ctx;
  const { agenteId } = ctx.sesion;

  const parseado = Cuerpo.safeParse(await peticion.json().catch(() => null));
  if (!parseado.success) {
    return NextResponse.json(
      { error: "Escribe un correo válido.", apoyo: "Es el correo con el que el webmaster se registró en Sophon." },
      { status: 400 },
    );
  }

  const emailNormalizado = normalizarEmail(parseado.data.email);
  const hoy = hoyContable();

  // ── Paso 1: reservar en local ──────────────────────────────────────────
  let webmasterId: string;
  let reservaNueva = false;
  try {
    const resultado = await db.$transaction(async (tx) => {
      const existente = await tx.webmaster.findUnique({
        where: { emailNormalizado },
        select: { id: true, agenteId: true },
      });

      if (existente?.agenteId && existente.agenteId !== agenteId) {
        throw new Error("DE_OTRO_AGENTE");
      }
      if (existente?.agenteId === agenteId) throw new Error("YA_ES_TUYO");

      if (existente) {
        // Huérfano que ya tenía historia: la atribución es PROSPECTIVA, o el
        // agente cobraría el tráfico que ese webmaster trajo antes de llegar.
        await tx.webmaster.update({
          where: { id: existente.id },
          data: {
            agenteId,
            origen: "VINCULADO_APP",
            atribuidoEn: new Date(),
            devengaDesde: new Date(hoy),
          },
        });
        return { id: existente.id, nueva: false };
      }

      const creado = await tx.webmaster.create({
        data: {
          emailNormalizado,
          emailOriginal: parseado.data.email,
          agenteId,
          origen: "VINCULADO_APP",
          atribuidoEn: new Date(),
          devengaDesde: new Date(hoy),
        },
        select: { id: true },
      });
      return { id: creado.id, nueva: true };
    });
    webmasterId = resultado.id;
    reservaNueva = resultado.nueva;
  } catch (e) {
    const motivo = e instanceof Error ? e.message : "";
    if (motivo === "DE_OTRO_AGENTE") {
      return NextResponse.json(
        {
          error: "Ese webmaster ya está a cargo de otro agente.",
          apoyo: "Si crees que es un error, escribe al superadmin.",
        },
        { status: 409 },
      );
    }
    if (motivo === "YA_ES_TUYO") {
      return NextResponse.json(
        { error: "Ese webmaster ya está en tu red.", apoyo: "Puedes verlo en «Tu red»." },
        { status: 409 },
      );
    }
    console.error("[activar] reserva fallida", e);
    return NextResponse.json({ error: "No se ha podido reservar el webmaster." }, { status: 500 });
  }

  // ── Paso 2: pedírselo a Sophon ─────────────────────────────────────────
  const intento = await db.intentoVinculacion.create({
    data: { emailNormalizado, agenteId, webmasterId },
  });

  try {
    await clienteSophon().vincularSubAfiliado(parseado.data.email);
  } catch (e) {
    // Deshacer la reserva: si Sophon no lo vinculó, el webmaster no es de nadie.
    // Los creados aquí se borran; a los preexistentes solo se les quita el agente.
    if (reservaNueva) {
      await db.webmaster.delete({ where: { id: webmasterId } }).catch(() => {});
    } else {
      await db.webmaster.update({
        where: { id: webmasterId },
        data: { agenteId: null, origen: "HUERFANO", atribuidoEn: null, devengaDesde: null },
      });
    }

    const err = e instanceof ErrorSophon ? e : null;
    await db.intentoVinculacion.update({
      where: { id: intento.id },
      data: {
        exito: false,
        codigoRespuesta: err?.codigo ?? null,
        mensaje: err?.message ?? String(e),
        traceId: err?.traceId ?? null,
        resueltoEn: new Date(),
      },
    });

    if (err?.esFaltaWhitelist) {
      return NextResponse.json(
        {
          error: "La cuenta aún no está autorizada en Sophon.",
          apoyo: "El superadmin tiene que tramitarlo con soporte. No se ha activado nada.",
        },
        { status: 503 },
      );
    }
    if (/already an affiliate/i.test(err?.message ?? "")) {
      return NextResponse.json(
        {
          error: "Sophon rechazó el correo: ya está vinculado a otro afiliado.",
          apoyo: "Pide al webmaster que use otro correo, o escribe al superadmin para reclamarlo.",
        },
        { status: 409 },
      );
    }
    if (/user not found/i.test(err?.message ?? "")) {
      return NextResponse.json(
        {
          error: "Ese correo no existe en Sophon.",
          apoyo: "El webmaster tiene que crear su cuenta antes de que puedas activarlo.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: "Sophon no responde ahora mismo.",
        apoyo: "No se ha activado nada. Vuelve a intentarlo en un minuto.",
      },
      { status: 502 },
    );
  }

  await db.intentoVinculacion.update({
    where: { id: intento.id },
    data: { exito: true, codigoRespuesta: 0, resueltoEn: new Date() },
  });
  await db.auditoria.create({
    data: {
      actorTipo: "AGENTE",
      actorId: agenteId,
      accion: "webmaster.activado",
      recurso: emailNormalizado,
    },
  });

  return NextResponse.json({
    ok: true,
    email: parseado.data.email,
    devengaDesde: hoy,
  });
}
