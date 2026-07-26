import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { claveIdempotencia, normalizarEmail } from "@/lib/cripto";
import { esRespuesta, exigirAgente } from "@/lib/api/agente";
import { concederAnio } from "@/lib/pro/conceder";
import { clienteSophon } from "@/lib/sophon/instancia";
import { ErrorSophon } from "@/lib/sophon/cliente";
import { hoyContable } from "@/lib/sync/registros";

/**
 * Activar un webmaster: la acción que crea la atribución **y concede el PRO**.
 *
 * Son un solo acto comercial, no dos: un webmaster se da de alta y entra con un
 * año de PRO. El agente no elige plazo ni plan porque no hay nada que elegir.
 *
 * El orden importa y no es el intuitivo. Se **reserva primero en local** y se
 * llama a Sophon después, porque el índice único sobre `emailNormalizado` es lo
 * único que impide que dos agentes reclamen el mismo webmaster. Si se llamara
 * primero a Sophon, dos peticiones simultáneas pasarían las dos y la carrera se
 * resolvería en la base de datos con uno de los agentes ya convencido de que el
 * webmaster es suyo.
 *
 * Tres reglas sobre el fallo, que aquí no es simétrico:
 *
 *  - Si Sophon rechaza la **vinculación**, la reserva se deshace: no ha pasado nada.
 *  - Si la vinculación va bien y falla el **PRO**, el alta NO se deshace. Sophon
 *    ya vinculó al webmaster y volver a intentarlo daría «already an affiliate»,
 *    así que revertir dejaría al webmaster vinculado allí y huérfano aquí, que
 *    es peor que el trabajo a medias. Se avisa y se reintenta desde su ficha.
 *  - Solo un webmaster **nuevo** recibe el año automático. Adoptar un huérfano
 *    con historia no es registrar una cuenta nueva; su PRO se concede a mano.
 *
 * No hay tope: el agente puede activar cuantos quiera. Las dos condiciones que
 * existen las impone la realidad y no un contador —el webmaster tiene que estar
 * ya registrado en Sophon, y no puede pertenecer a otro agente— y las dos se
 * comprueban aquí: la segunda con el índice único, la primera con la respuesta
 * de Sophon.
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
  const { agenteId } = ctx.sesion;

  const parseado = Cuerpo.safeParse(await peticion.json().catch(() => null));
  if (!parseado.success) {
    return NextResponse.json(
      { error: "Formato de correo no válido.", apoyo: "Correo de registro del webmaster en Sophon." },
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
          error: "El webmaster está atribuido a otro agente.",
          apoyo: "La atribución es exclusiva. Las revisiones son manuales.",
        },
        { status: 409 },
      );
    }
    if (motivo === "YA_ES_TUYO") {
      return NextResponse.json(
        { error: "El webmaster ya consta en esta red.", apoyo: "La ficha está disponible en «Red»." },
        { status: 409 },
      );
    }
    console.error("[activar] reserva fallida", e);
    return NextResponse.json(
      {
        error: "No se ha podido registrar la activación.",
        apoyo: "No se ha modificado nada. Se puede reintentar.",
      },
      { status: 500 },
    );
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
          error: "La cuenta no está autorizada en Sophon.",
          apoyo: "La autorización se tramita manualmente con soporte. No se ha activado nada.",
        },
        { status: 503 },
      );
    }
    if (/already an affiliate/i.test(err?.message ?? "")) {
      return NextResponse.json(
        {
          error: "El correo ya está vinculado a otro afiliado en Sophon.",
          apoyo: "Se requiere otro correo. Las reclamaciones son manuales.",
        },
        { status: 409 },
      );
    }
    if (/user not found/i.test(err?.message ?? "")) {
      return NextResponse.json(
        {
          error: "El correo no existe en Sophon.",
          apoyo: "El registro en Sophon es previo a la activación.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: "Sophon no responde.",
        apoyo: "No se ha activado nada. Se puede reintentar en un minuto.",
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
      detalle: { nuevo: reservaNueva },
    },
  });

  // ── Paso 3: el año de PRO ──────────────────────────────────────────────
  // Solo para cuentas NUEVAS. Un huérfano preexistente no acaba de registrarse:
  // ya traía historia, y regalarle un año automático por adoptarlo sería pagar
  // dos veces por el mismo webmaster cada vez que cambia de agente.
  if (!reservaNueva) {
    return NextResponse.json({
      ok: true,
      email: parseado.data.email,
      devengaDesde: hoy,
      nuevo: false,
      pro: null,
    });
  }

  const pro = await concederAnio({
    agenteId,
    webmasterId,
    emailWebmaster: parseado.data.email,
    motivo: "ALTA",
    claveIdempotencia: claveIdempotencia(agenteId, emailNormalizado, parseado.data.idempotencia),
  });

  return NextResponse.json({
    ok: true,
    email: parseado.data.email,
    devengaDesde: hoy,
    nuevo: true,
    /*
     * El alta está hecha pase lo que pase con el PRO. Se informa del resultado
     * en vez de fingir que todo fue bien o de fallar entera una operación que
     * sí ha prosperado.
     *
     * `yaActivo` es ÉXITO aquí, y es el caso que distingue este camino del de la
     * renovación: un webmaster que ya venía con PRO tiene exactamente lo que el
     * alta le iba a dar. Tratarlo como error le enseñaría al agente un aviso
     * rojo por una operación que salió perfecta, y encima le empujaría a
     * reintentar contra una membresía que no hay que tocar.
     *
     * `renovado: false` lo separa de una concesión real: son dos hechos
     * distintos y la pantalla dice cosas distintas de cada uno.
     */
    pro: pro.ok
      ? { concedido: true, renovado: !pro.yaActivo, vigenteHasta: pro.vigenteHasta }
      : { concedido: false, renovado: false, error: pro.error ?? null, apoyo: pro.apoyo ?? null },
  });
}
