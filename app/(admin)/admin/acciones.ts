"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/auth/admin";
import { avisarRetiroResueltoAlAgente } from "@/lib/bot/avisos";
import { formatearMicros, microsDesdeCadena } from "@/lib/devengo/dinero";
import { CPA_MAXIMO_MICROS, CPS_MAXIMO_BPS } from "@/lib/devengo/motor";
import { motivoEscaleraInvalida } from "@/lib/devengo/bonos";
import { repararDevengo } from "@/lib/devengo/sin-devengar";
import { revocarSesiones } from "@/lib/auth/sesion";
import { leerWallet } from "@/lib/cripto";
import { idiomaGuardado } from "@/lib/idiomas";

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
  if (!sesion) throw new Error("sin sesión de Operador");
  return String(sesion.telegramId);
}

async function anotar(actorId: string, accion: string, recurso: string, detalle: object) {
  await db.auditoria.create({
    data: { actorTipo: "OPERADOR", actorId, accion, recurso, detalle: detalle as never },
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

/**
 * Cambia la tarifa vigente.
 *
 * **Versiona, no edita.** Guardar es cerrar la vigente con `validaHasta` y
 * crear otra fila, las dos en la misma transacción. Un `update` sobre la
 * vigente sería más corto y reescribiría el pasado: cada `AsientoComision`
 * apunta a su `tarifaId`, así que cambiarle el precio a una versión ya usada
 * altera el importe que explica asientos emitidos hace meses. Es la regla del
 * §5.6 del plan y es el motivo de que esta tabla tenga `validaDesde`.
 *
 * Se acota por arriba a lo que el negocio puede pagar (`CPA_MAXIMO_MICROS` y
 * `CPS_MAXIMO_BPS`, en `lib/devengo/motor.ts`): ceder más que lo que entra sería
 * pagar de su bolsillo. El tope no es una preferencia de interfaz, es la
 * frontera en la que el margen se vuelve negativo, y por eso se comprueba aquí
 * en el servidor y no solo con un `max` en el formulario.
 */
export async function cambiarTarifa(formulario: FormData): Promise<void> {
  const actor = await admin();

  // Del formulario llegan cadenas con coma o con punto según el teclado del
  // móvil: `microsDesdeCadena` ya normaliza eso y además rechaza el float.
  const cpa = String(formulario.get("cpa") ?? "").trim().replace(",", ".");
  const cps = Number(String(formulario.get("cps") ?? "").trim().replace(",", "."));
  const nota = String(formulario.get("nota") ?? "").trim().slice(0, 300) || null;

  if (!cpa || !Number.isFinite(cps)) return;

  let cpaMicros: bigint;
  try {
    cpaMicros = microsDesdeCadena(cpa);
  } catch {
    return;
  }

  const cpsBps = Math.round(cps * 100);
  if (cpaMicros < 0n || cpaMicros > CPA_MAXIMO_MICROS) return;
  if (cpsBps < 0 || cpsBps > CPS_MAXIMO_BPS) return;

  await db.$transaction(async (tx) => {
    const vigente = await tx.tarifaVersion.findFirst({
      where: { validaHasta: null },
      orderBy: { validaDesde: "desc" },
    });

    // Guardar lo mismo que ya está en vigor crearía una versión nueva idéntica
    // y dejaría el histórico lleno de ruido sin ningún cambio detrás.
    if (vigente && vigente.cpaPorRegistroMicros === cpaMicros && vigente.cpsBps === cpsBps) {
      return;
    }

    const ahora = new Date();
    if (vigente) {
      await tx.tarifaVersion.update({
        where: { id: vigente.id },
        data: { validaHasta: ahora },
      });
    }

    await tx.tarifaVersion.create({
      data: {
        cpaPorRegistroMicros: cpaMicros,
        cpsBps,
        validaDesde: ahora,
        creadoPorId: actor,
        nota,
      },
    });
  });

  await anotar(actor, "tarifa.cambiada", "tarifa", {
    cpa: formatearMicros(cpaMicros, 4),
    cps: `${cpsBps / 100} %`,
    nota,
  });

  revalidatePath("/admin/tarifas");
  revalidatePath("/admin");
}

/**
 * Cambia la escalera de bonos por hitos.
 *
 * Mismo versionado que `cambiarTarifa` y por el mismo motivo: cada asiento de
 * BONO apunta al escalón que lo pagó, así que editar un escalón en sitio
 * cambiaría la explicación de dinero ya entregado. Guardar cierra la escalera
 * vigente y abre otra, las dos con el MISMO instante para que no haya un hueco
 * en el que no rija ninguna.
 *
 * El formulario manda pares paralelos `usuarios[]` y `recompensa[]`. Las filas
 * vacías se descartan, así que quitar un escalón es borrar su umbral.
 */
export async function cambiarEscaleraBono(formulario: FormData): Promise<void> {
  const actor = await admin();

  const umbrales = formulario.getAll("usuarios").map((v) => String(v).trim());
  const premios = formulario.getAll("recompensa").map((v) => String(v).trim());
  const nota = String(formulario.get("nota") ?? "").trim().slice(0, 300) || null;

  const escalones: { usuarios: number; recompensaMicros: bigint }[] = [];
  for (let i = 0; i < umbrales.length; i++) {
    const u = umbrales[i] ?? "";
    const r = premios[i] ?? "";
    // Fila entera vacía: es como se borra un escalón desde el formulario.
    if (!u && !r) continue;
    const usuarios = Number(u.replace(/[.\s]/g, ""));
    if (!Number.isInteger(usuarios)) return;
    let recompensaMicros: bigint;
    try {
      recompensaMicros = microsDesdeCadena(r.replace(",", "."));
    } catch {
      return;
    }
    escalones.push({ usuarios, recompensaMicros });
  }

  // La misma validación que usa el devengo, para que el panel no pueda guardar
  // una escalera que el motor no sabría pagar. En particular: las recompensas
  // tienen que CRECER con los usuarios, o subir de hito daría una diferencia
  // negativa —un asiento que le quita dinero al agente por trabajar más—.
  const conId = escalones.map((e, i) => ({ id: String(i), ...e }));
  if (motivoEscaleraInvalida(conId) !== null) return;

  await db.$transaction(async (tx) => {
    const vigente = await tx.bonoVersion.findFirst({
      where: { validaHasta: null },
      orderBy: { validaDesde: "desc" },
      include: { escalones: { orderBy: { usuarios: "asc" } } },
    });

    // Guardar lo mismo que ya rige crearía una versión idéntica y llenaría el
    // historial de ruido sin ningún cambio detrás.
    if (vigente) {
      const antes = vigente.escalones.map((e) => `${e.usuarios}:${e.recompensaMicros}`).join("|");
      const ahora = [...escalones]
        .sort((a, b) => a.usuarios - b.usuarios)
        .map((e) => `${e.usuarios}:${e.recompensaMicros}`)
        .join("|");
      if (antes === ahora) return;
    }

    const instante = new Date();
    if (vigente) {
      await tx.bonoVersion.update({
        where: { id: vigente.id },
        data: { validaHasta: instante },
      });
    }
    await tx.bonoVersion.create({
      data: {
        validaDesde: instante,
        creadoPorId: actor,
        nota,
        escalones: { create: escalones },
      },
    });
  });

  await anotar(actor, "bono.escalera_cambiada", "bono", {
    escalones: escalones.map((e) => ({
      usuarios: e.usuarios,
      recompensa: formatearMicros(e.recompensaMicros),
    })),
    nota,
  });

  revalidatePath("/admin/bonos");
  revalidatePath("/admin");
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
    select: {
      id: true,
      estado: true,
      agenteId: true,
      importeMicros: true,
      red: true,
      wallet: true,
      agente: { select: { telegramId: true, idioma: true } },
    },
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
          motivo: nota || "Sin motivo especificado.",
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
          nota: "Devolución por retiro rechazado.",
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

  // Y ahora se lo decimos a quien está esperando el dinero.
  //
  // El aviso va DESPUÉS de la auditoría y sin `await` sobre su resultado en el
  // camino crítico —la función se traga sus propios fallos—, porque el estado ya
  // está guardado: que Telegram no conteste no puede deshacer un pago que ya
  // consta hecho.
  await avisarRetiroResueltoAlAgente({
    telegramId: solicitud.agente.telegramId,
    idioma: solicitud.agente.idioma,
    estado: accion === "pagar" ? "PAGADO" : accion === "aprobar" ? "APROBADO" : "RECHAZADO",
    /*
     * El importe, en el idioma del AGENTE y no en el del panel.
     *
     * Es el único sitio donde el que dispara el aviso y el que lo lee hablan
     * idiomas distintos: aquí manda el Operador desde un panel que está en
     * español y el mensaje sale hacia el agente. La llamada ya pasaba
     * `idioma` para las cadenas y formateaba la cifra sin él, así que un agente
     * inglés recibía el texto traducido con «2.147,39 $» dentro: la cifra por
     * la que ha entrado a mirar, con la convención equivocada.
     */
    importe: formatearMicros(solicitud.importeMicros, 2, idiomaGuardado(solicitud.agente.idioma)),
    red: solicitud.red,
    wallet: leerWallet(solicitud.wallet),
    referencia: referencia || null,
    motivo: nota || null,
  });

  revalidatePath("/admin/retiros");
  revalidatePath("/admin");
}


/**
 * Devengar las filas que se quedaron sin devengar.
 *
 * ── POR QUÉ ES UN BOTÓN Y NO UN GUION ──
 *
 * Porque el guion no se puede ejecutar donde hace falta: la imagen de despliegue
 * es la salida autocontenida de Next y no lleva `scripts/` ni las fuentes de
 * `lib/`, así que `npm run devengo:reparar` en producción muere con
 * `Cannot find module`. Y aunque se pudiera, exigir una terminal para recuperar
 * comisiones que un agente ya ha ganado pone entre el problema y su arreglo a
 * quien tenga acceso al servidor. Aquí lo arregla quien lo ve, desde el móvil.
 *
 * No lleva confirmación y no hace falta: solo escribe donde no había NADA
 * escrito, el motor es el mismo que el del barrido, y la clave de idempotencia
 * impide que dos toques seguidos devenguen dos veces. Lo peor que consigue un
 * toque de más es no hacer nada.
 */
export async function repararDevengoPendiente(): Promise<void> {
  const actor = await admin();
  const r = await repararDevengo({ aplicar: true });

  await anotar(actor, "devengo.reparado", "", {
    ok: r.ok,
    motivo: r.motivo ?? null,
    filas: r.filas,
    asientos: r.asientos,
    importeMicros: r.importeMicros.toString(),
  });

  revalidatePath("/admin");
  revalidatePath("/admin/agentes");
}
