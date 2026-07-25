"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/auth/admin";
import { formatearMicros } from "@/lib/devengo/dinero";
import { revocarSesiones } from "@/lib/auth/sesion";

/**
 * Acciones del panel.
 *
 * **Cada una vuelve a exigir la sesión.** Una acción de servidor es un endpoint
 * público con otro nombre: que solo se invoque desde una página protegida no la
 * protege a ella. Comprobarlo en cada una es repetitivo y es lo correcto.
 *
 * Todas dejan rastro en `Auditoria`. Aquí se cambian permisos y se mueve
 * dinero: sin registro, «¿quién le subió el cupo a este agente?» no tiene
 * respuesta.
 */

async function admin(): Promise<string> {
  const sesion = await exigirAdmin();
  if (!sesion) throw new Error("sin sesión de superadmin");
  return String(sesion.telegramId);
}

async function anotar(actorId: string, accion: string, recurso: string, detalle: object) {
  await db.auditoria.create({
    data: { actorTipo: "SUPERADMIN", actorId, accion, recurso, detalle: detalle as never },
  });
}

export async function cambiarEstadoAgente(formulario: FormData): Promise<void> {
  const actor = await admin();
  const agenteId = String(formulario.get("agenteId") ?? "");
  const estado = String(formulario.get("estado") ?? "");
  if (!agenteId || !["ACTIVO", "SUSPENDIDO", "BAJA"].includes(estado)) return;

  await db.agente.update({
    where: { id: agenteId },
    data: { estado: estado as "ACTIVO" | "SUSPENDIDO" | "BAJA" },
  });

  // Suspender sin cortar la sesión no suspende nada: el agente seguiría dentro
  // con la sesión de 180 días que ya tenía abierta.
  if (estado !== "ACTIVO") await revocarSesiones(agenteId);

  await anotar(actor, "agente.estado", agenteId, { estado });
  revalidatePath("/admin/agentes");
}

/** Corta todas las sesiones del agente sin tocar su estado. */
export async function cortarSesiones(formulario: FormData): Promise<void> {
  const actor = await admin();
  const agenteId = String(formulario.get("agenteId") ?? "");
  if (!agenteId) return;

  await revocarSesiones(agenteId);
  await anotar(actor, "agente.sesiones_cortadas", agenteId, {});
  revalidatePath("/admin/agentes");
}

export type AccionRetiro = "aprobar" | "pagar" | "rechazar";

/**
 * Resuelve un retiro.
 *
 * **La intención va ligada al servidor, no en el formulario.** La primera
 * versión la mandaba en el `value` de cada botón de envío, y el
 * `name`/`value` del botón que envía NO se serializa en el `FormData` de una
 * acción de servidor: llegaba vacío y los tres botones —aprobar, pagar,
 * rechazar— no hacían absolutamente nada, en silencio y devolviendo 200.
 * Se descubrió pulsándolos de verdad en un navegador; ni el typecheck ni leer
 * el código lo insinuaban.
 *
 * Enlazarla con `.bind` lo arregla y además la blinda: la intención ya no
 * viaja en el cuerpo de la petición, así que no se puede cambiar «aprobar»
 * por «pagar» manipulando el formulario.
 *
 * El paso de estado se hace con `updateMany` filtrando por el estado ESPERADO,
 * no por el id a secas. Si el panel está abierto en dos pestañas —o se recarga
 * un formulario ya enviado— la segunda no encuentra nada que actualizar en vez
 * de volver a marcar como pagado algo que ya se pagó.
 *
 * Al rechazar se devuelve el saldo con un asiento positivo. Sin eso, el dinero
 * de un retiro rechazado se quedaría en el limbo: ni pagado ni disponible.
 */
export async function resolverRetiro(
  accion: AccionRetiro,
  formulario: FormData,
): Promise<void> {
  const actor = await admin();
  const id = String(formulario.get("id") ?? "");
  const nota = String(formulario.get("nota") ?? "").trim().slice(0, 300);
  const referencia = String(formulario.get("referencia") ?? "").trim().slice(0, 200);
  if (!id) return;

  const solicitud = await db.solicitudRetiro.findUnique({
    where: { id },
    select: { id: true, estado: true, agenteId: true, importeMicros: true },
  });
  if (!solicitud) return;

  if (accion === "aprobar" && solicitud.estado === "SOLICITADO") {
    await db.solicitudRetiro.updateMany({
      where: { id, estado: "SOLICITADO" },
      data: { estado: "APROBADO", resueltoPor: actor },
    });
  } else if (accion === "pagar" && ["SOLICITADO", "APROBADO"].includes(solicitud.estado)) {
    // La referencia es obligatoria al pagar: es el único rastro que permite
    // demostrar después que la transferencia salió.
    if (!referencia) return;
    await db.solicitudRetiro.updateMany({
      where: { id, estado: { in: ["SOLICITADO", "APROBADO"] } },
      data: {
        estado: "PAGADO",
        resueltoEn: new Date(),
        resueltoPor: actor,
        referenciaPago: referencia,
      },
    });
  } else if (accion === "rechazar" && ["SOLICITADO", "APROBADO"].includes(solicitud.estado)) {
    await db.$transaction(async (tx) => {
      const { count } = await tx.solicitudRetiro.updateMany({
        where: { id, estado: { in: ["SOLICITADO", "APROBADO"] } },
        data: {
          estado: "RECHAZADO",
          resueltoEn: new Date(),
          resueltoPor: actor,
          motivo: nota || "Rechazado por el superadmin.",
        },
      });
      if (count === 0) return;

      // Ledger append-only: el asiento negativo del retiro no se borra, se
      // compensa con uno positivo fechado hoy. Así el histórico sigue contando
      // lo que pasó de verdad.
      await tx.asientoComision.create({
        data: {
          agenteId: solicitud.agenteId,
          tipo: "AJUSTE_MANUAL",
          estado: "CONSOLIDADO",
          importeMicros: solicitud.importeMicros,
          fechaDevengo: new Date(),
          claveIdempotencia: `retiro-rechazado:${id}`,
          retiroId: id,
          nota: "Devolución de saldo por retiro rechazado.",
        },
      });
    });
  } else {
    return;
  }

  await anotar(actor, `retiro.${accion}`, id, {
    importe: formatearMicros(solicitud.importeMicros),
    referencia: referencia || null,
    nota: nota || null,
  });
  revalidatePath("/admin/retiros");
  revalidatePath("/admin");
}
