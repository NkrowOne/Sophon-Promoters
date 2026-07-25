/**
 * Conceder PRO: un año, y solo desde aquí.
 *
 * Existe como módulo y no como código dentro de una ruta porque **dos sitios
 * distintos conceden**: el alta de un webmaster nuevo y la renovación. Si cada
 * uno construyera su propia llamada, bastaría con que uno de los dos olvidara
 * la duración explícita para conceder 30 días creyendo conceder un año —que es
 * exactamente el fallo que traía el código anterior—.
 *
 * Las tres reglas que encapsula:
 *
 *  1. **Siempre `vip.year` con la duración en segundos escrita.** El código de
 *     membresía NO fija el plazo: `duration: 0` da 30 días con cualquier
 *     código. La documentación de Sophon lo dice y es fácil de leer al revés.
 *  2. **La fila se reserva ANTES de llamar a Sophon**, con clave de
 *     idempotencia. Un doble toque no concede dos años.
 *  3. **`membership_end_at` es la única fuente de la caducidad.** No hay
 *     endpoint que la consulte después: si no se persiste aquí, se pierde.
 */

import { db } from "../db.ts";
import { clienteSophon } from "../sophon/instancia.ts";
import { ErrorSophon } from "../sophon/cliente.ts";
import { PLAN_UNICO, SEGUNDOS_UN_ANIO } from "../sophon/tipos.ts";

export type MotivoConcesion = "ALTA" | "RENOVACION";

export interface ResultadoConcesion {
  ok: boolean;
  /** Fecha de caducidad tal como la devolvió Sophon, en ISO corto. */
  vigenteHasta: string | null;
  /** Motivo legible cuando no ha salido bien. Nunca un código ni un stack. */
  error?: string;
  apoyo?: string;
  /** Distingue «Sophon aún no nos autoriza» de «Sophon no responde». */
  estado?: number;
}

/**
 * Reserva la concesión y la ejecuta.
 *
 * No lanza: devuelve el resultado. Quien llama decide qué hacer con un fallo,
 * y en el caso del alta la respuesta correcta **no** es deshacer nada.
 */
export async function concederAnio(params: {
  agenteId: string;
  webmasterId: string;
  emailWebmaster: string;
  motivo: MotivoConcesion;
  claveIdempotencia: string;
}): Promise<ResultadoConcesion> {
  const { agenteId, webmasterId, emailWebmaster, motivo, claveIdempotencia } = params;

  // ── Reserva ────────────────────────────────────────────────────────────
  let concesionId: string;
  try {
    concesionId = await db.$transaction(async (tx) => {
      const previa = await tx.concesionPro.findUnique({
        where: { claveIdempotencia },
        select: { id: true, estado: true, vigenteHasta: true },
      });

      if (previa) {
        // Un intento FALLIDO no entregó nada, así que no puede bloquear la
        // clave para siempre: se descarta y se vuelve a reservar. Si no, el
        // agente se quedaría sin poder reintentar con el mismo botón.
        if (previa.estado === "FALLIDA") {
          await tx.concesionPro.delete({ where: { id: previa.id } });
        } else {
          throw new Error(
            `REPETIDA:${previa.vigenteHasta ? previa.vigenteHasta.toISOString().slice(0, 10) : ""}`,
          );
        }
      }

      const creada = await tx.concesionPro.create({
        data: {
          agenteId,
          webmasterId,
          codigoMembresia: PLAN_UNICO,
          duracionSegundos: SEGUNDOS_UN_ANIO,
          motivo,
          claveIdempotencia,
          estado: "RESERVADA",
        },
        select: { id: true },
      });
      return creada.id;
    });
  } catch (e) {
    const motivoError = e instanceof Error ? e.message : "";
    if (motivoError.startsWith("REPETIDA:")) {
      // Reintento sobre algo que sí prosperó: se devuelve tal cual. Es lo que
      // hace seguro pulsar dos veces.
      return { ok: true, vigenteHasta: motivoError.slice("REPETIDA:".length) || null };
    }
    console.error("[pro] reserva fallida", e);
    return { ok: false, vigenteHasta: null, error: "No se ha podido registrar la concesión.", estado: 500 };
  }

  // ── Concesión en Sophon ────────────────────────────────────────────────
  try {
    const r = await clienteSophon().concederMembresia(
      emailWebmaster,
      PLAN_UNICO,
      SEGUNDOS_UN_ANIO,
    );

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
        where: { id: webmasterId },
        data: { proVigenteHasta: fin },
      }),
      db.auditoria.create({
        data: {
          actorTipo: "AGENTE",
          actorId: agenteId,
          accion: motivo === "ALTA" ? "pro.concedido_en_alta" : "pro.renovado",
          recurso: emailWebmaster,
          detalle: { vigenteHasta: fin?.toISOString() ?? null, segundos: SEGUNDOS_UN_ANIO },
        },
      }),
    ]);

    return { ok: true, vigenteHasta: fin ? fin.toISOString().slice(0, 10) : null };
  } catch (e) {
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
      return {
        ok: false,
        vigenteHasta: null,
        error: "La cuenta aún no está autorizada en Sophon.",
        apoyo: "El superadmin tiene que tramitarlo con soporte.",
        estado: 503,
      };
    }
    return {
      ok: false,
      vigenteHasta: null,
      error: "Sophon no ha podido dar el PRO ahora mismo.",
      apoyo: "Inténtalo otra vez desde su ficha en un minuto.",
      estado: 502,
    };
  }
}

/**
 * Altas con éxito del agente en el mes en curso.
 *
 * Se cuenta sobre `IntentoVinculacion`, que es INMUTABLE, y no sobre
 * `Webmaster`: al deshacer un alta que Sophon rechaza se pone `atribuidoEn` a
 * null, así que contar sobre el webmaster permitiría dar de alta y desvincular
 * en bucle sin gastar cupo nunca.
 */
export async function altasDelMes(agenteId: string): Promise<number> {
  return db.intentoVinculacion.count({
    where: { agenteId, exito: true, creadoEn: { gte: inicioDelMes() } },
  });
}

/** Primer instante del mes en curso, en la zona horaria contable declarada. */
export function inicioDelMes(): Date {
  const zona = process.env["ZONA_HORARIA"] ?? "Europe/Madrid";
  const mes = new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(new Date()).slice(0, 7);
  return new Date(`${mes}-01T00:00:00Z`);
}
