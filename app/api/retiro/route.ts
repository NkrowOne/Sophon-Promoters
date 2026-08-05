import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { claveIdempotencia, guardarWallet, leerWallet, mascaraWallet } from "@/lib/cripto";
import { cadenas } from "@/lib/i18n";
import { dinero, esRespuesta, exigirAgente, saldos } from "@/lib/api/agente";
import { formatearMicros, microsDesdeCadena } from "@/lib/devengo/dinero";
import { avisarRetiroAlSuperadmin } from "@/lib/bot/avisos";

/**
 * Solicitud de retiro.
 *
 * Dos defensas que no son opcionales:
 *
 *  1. **Una sola solicitud viva por agente.** Sin esto, la sesión persistente en
 *     móvil y escritorio —que el producto exige— permite pulsar dos veces y
 *     generar dos solicitudes del mismo saldo, que el superadmin aprobaría a
 *     mano sin ver que son la misma.
 *  2. **El importe se valida contra el saldo recalculado en el servidor**, nunca
 *     contra lo que manda el cliente. El disponible solo cuenta días
 *     CONSOLIDADOS: pagar sobre un día aún abierto obligaría a reclamar dinero
 *     ya entregado si Sophon lo revisa a la baja.
 */

export const dynamic = "force-dynamic";

/** Mínimo por defecto; el superadmin puede cambiarlo en configuración. */
const MINIMO_POR_DEFECTO_MICROS = 20_000_000n; // 20,00 $

const Cuerpo = z.object({
  importe: z.string().regex(/^\d+([.,]\d{1,6})?$/, "importe no válido"),
  red: z.enum(["TRC20", "BSC", "TON"]),
  wallet: z.string().trim().min(20).max(120),
  idempotencia: z.string().min(8).max(64),
});

async function minimoMicros(): Promise<bigint> {
  const cfg = await db.configuracion.findUnique({ where: { clave: "retiro.minimoMicros" } });
  return cfg ? BigInt(cfg.valor) : MINIMO_POR_DEFECTO_MICROS;
}

export async function GET(peticion: Request): Promise<NextResponse> {
  const ctx = await exigirAgente(peticion);
  if (esRespuesta(ctx)) return ctx;
  const { agenteId, idioma } = ctx.sesion;

  const [saldo, historial, minimo] = await Promise.all([
    saldos(agenteId),
    db.solicitudRetiro.findMany({
      where: { agenteId },
      orderBy: { solicitadoEn: "desc" },
      take: 50,
      select: {
        id: true,
        importeMicros: true,
        red: true,
        wallet: true,
        estado: true,
        solicitadoEn: true,
        resueltoEn: true,
        motivo: true,
        referenciaPago: true,
      },
    }),
    minimoMicros(),
  ]);

  return NextResponse.json({
    cartera: {
      devengado: dinero(saldo.devengadoMicros, idioma),
      disponible: dinero(saldo.disponibleMicros, idioma),
      solicitado: dinero(saldo.solicitadoMicros, idioma),
      pagado: dinero(saldo.pagadoMicros, idioma),
    },
    minimo: dinero(minimo, idioma),
    // La wallet se muestra recortada: el agente la reconoce sin exponerla entera
    // en una captura de pantalla que pueda compartir. Se descifra para
    // recortarla —en la base está cifrada— y el texto en claro no sale de aquí.
    historial: historial.map((h) => ({
      id: h.id,
      importe: dinero(h.importeMicros, idioma),
      red: h.red,
      wallet: mascaraWallet(leerWallet(h.wallet)),
      estado: h.estado,
      solicitadoEn: h.solicitadoEn.toISOString(),
      resueltoEn: h.resueltoEn?.toISOString() ?? null,
      motivo: h.motivo,
      referenciaPago: h.referenciaPago,
    })),
  });
}

export async function POST(peticion: Request): Promise<NextResponse> {
  const ctx = await exigirAgente(peticion);
  if (esRespuesta(ctx)) return ctx;
  const { agenteId, emailNormalizado, nombreVisible, idioma } = ctx.sesion;
  const t = cadenas(idioma);

  const parseado = Cuerpo.safeParse(await peticion.json().catch(() => null));
  if (!parseado.success) {
    return NextResponse.json(
      { error: t.errRetiroFormato, apoyo: t.errRetiroFormatoApoyo },
      { status: 400 },
    );
  }

  const importeMicros = microsDesdeCadena(parseado.data.importe);
  const [saldo, minimo] = await Promise.all([saldos(agenteId), minimoMicros()]);

  if (importeMicros < minimo) {
    return NextResponse.json(
      {
        error: t.errRetiroMinimo(formatearMicros(minimo, 2, idioma)),
        apoyo: t.errRetiroMinimoApoyo(formatearMicros(importeMicros, 2, idioma)),
      },
      { status: 400 },
    );
  }
  if (importeMicros > saldo.disponibleMicros) {
    return NextResponse.json(
      {
        error: t.errRetiroSaldo(formatearMicros(saldo.disponibleMicros, 2, idioma)),
        apoyo: t.errRetiroSaldoApoyo,
      },
      { status: 400 },
    );
  }

  const clave = claveIdempotencia(agenteId, parseado.data.idempotencia);

  let solicitudId: string;
  try {
    solicitudId = await db.$transaction(async (tx) => {
      const repetida = await tx.solicitudRetiro.findUnique({
        where: { claveIdempotencia: clave },
        select: { id: true },
      });
      if (repetida) throw new Error(`REPETIDA:${repetida.id}`);

      // Una sola viva por agente. Se comprueba dentro de la transacción para
      // que dos peticiones simultáneas no pasen las dos.
      const pendiente = await tx.solicitudRetiro.findFirst({
        where: { agenteId, estado: { in: ["SOLICITADO", "APROBADO"] } },
        select: { importeMicros: true },
      });
      if (pendiente) throw new Error(`PENDIENTE:${pendiente.importeMicros}`);

      const creada = await tx.solicitudRetiro.create({
        data: {
          agenteId,
          importeMicros,
          red: parseado.data.red,
          // Cifrada. La valida el `Cuerpo` de arriba en claro —la forma de la
          // dirección hay que poder comprobarla— y se guarda ya ilegible.
          wallet: guardarWallet(parseado.data.wallet),
          claveIdempotencia: clave,
        },
        select: { id: true },
      });

      // El retiro entra en el ledger como asiento negativo: así el disponible
      // sale de una suma y no de restar tablas distintas, que es donde suelen
      // aparecer los descuadres.
      await tx.asientoComision.create({
        data: {
          agenteId,
          tipo: "RETIRO",
          estado: "CONSOLIDADO",
          importeMicros: -importeMicros,
          fechaDevengo: new Date(),
          claveIdempotencia: `retiro:${clave}`,
          retiroId: creada.id,
        },
      });

      return creada.id;
    });
  } catch (e) {
    const motivo = e instanceof Error ? e.message : "";
    if (motivo.startsWith("REPETIDA:")) {
      return NextResponse.json({ ok: true, repetida: true, id: motivo.split(":")[1] });
    }
    if (motivo.startsWith("PENDIENTE:")) {
      const importe = formatearMicros(BigInt(motivo.split(":")[1] ?? "0"), 2, idioma);
      return NextResponse.json(
        { error: t.errRetiroYaHayUna(importe), apoyo: t.errRetiroYaHayUnaApoyo },
        { status: 409 },
      );
    }
    console.error("[retiro] solicitud fallida", e);
    return NextResponse.json(
      { error: t.errRetiroNoRegistrado, apoyo: t.errRetiroNoRegistradoApoyo },
      { status: 500 },
    );
  }

  await db.auditoria.create({
    data: {
      actorTipo: "AGENTE",
      actorId: agenteId,
      accion: "retiro.solicitado",
      recurso: solicitudId,
      detalle: {
        importe: formatearMicros(importeMicros),
        red: parseado.data.red,
      },
    },
  });

  // El aviso al superadmin es la vía por la que se entera de que hay que pagar,
  // pero no puede tumbar la solicitud: si Telegram falla, el retiro ya está
  // registrado y visible en el panel.
  void avisarRetiroAlSuperadmin({
    agente: nombreVisible,
    email: emailNormalizado,
    importe: formatearMicros(importeMicros),
    red: parseado.data.red,
    wallet: parseado.data.wallet,
    id: solicitudId,
  });

  return NextResponse.json({
    ok: true,
    id: solicitudId,
    importe: dinero(importeMicros, idioma),
  });
}
