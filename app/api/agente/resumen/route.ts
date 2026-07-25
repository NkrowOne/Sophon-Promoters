import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  CAMPOS_FILA_VISIBLES,
  dinero,
  esRespuesta,
  exigirAgente,
  isoFecha,
  saldos,
} from "@/lib/api/agente";
import { estaCerrado } from "@/lib/devengo/motor";
import { hoyContable } from "@/lib/sync/registros";

/**
 * Resumen de la pantalla de inicio: la serie diaria del Testigo y los saldos.
 *
 * El importe de cada día es lo que gana EL AGENTE, que sale de sus asientos, no
 * de la ganancia bruta que Sophon publica para esa fila. Son cifras distintas y
 * confundirlas mostraría al agente el dinero del superadmin.
 */

export const dynamic = "force-dynamic";

const DIAS = 30;

export async function GET(peticion: Request): Promise<NextResponse> {
  const ctx = await exigirAgente(peticion);
  if (esRespuesta(ctx)) return ctx;
  const { agenteId, puedeActivarWebmasters } = ctx.sesion;

  const hoy = hoyContable();
  const desde = new Date(Date.parse(`${hoy}T00:00:00Z`) - (DIAS - 1) * 86_400_000);

  const [asientos, filas, saldo, webmasters, concesiones] = await Promise.all([
    // Lo que gana el agente, por día.
    db.asientoComision.groupBy({
      by: ["fechaDevengo"],
      where: { agenteId, estado: { not: "ANULADO" }, fechaDevengo: { gte: desde } },
      _sum: { importeMicros: true },
    }),
    // El desglose por tier viene de las filas de SUS webmasters.
    db.filaDiariaSophon.findMany({
      where: { webmaster: { agenteId }, fecha: { gte: desde } },
      select: CAMPOS_FILA_VISIBLES,
    }),
    saldos(agenteId),
    db.webmaster.count({ where: { agenteId, desaparecidoEn: null } }),
    db.concesionPro.findMany({
      where: { agenteId, estado: "CONFIRMADA", creadoEn: { gte: desde } },
      select: { creadoEn: true },
    }),
  ]);

  // Se agrega por fecha en memoria: son 30 filas como mucho.
  const porFecha = new Map<
    string,
    { importeMicros: bigint; t1: number; t2: number; t3: number; registros: number; pagos: number }
  >();

  const vacio = () => ({ importeMicros: 0n, t1: 0, t2: 0, t3: 0, registros: 0, pagos: 0 });

  for (const a of asientos) {
    const f = isoFecha(a.fechaDevengo);
    const acc = porFecha.get(f) ?? vacio();
    acc.importeMicros += a._sum.importeMicros ?? 0n;
    porFecha.set(f, acc);
  }
  for (const f of filas) {
    const clave = isoFecha(f.fecha);
    const acc = porFecha.get(clave) ?? vacio();
    acc.t1 += f.countT1Register;
    acc.t2 += f.countT2Register;
    acc.t3 += f.countT3Register;
    acc.registros += f.countRegister;
    acc.pagos += f.countPayingUsers;
    porFecha.set(clave, acc);
  }

  const concesionesPorFecha = new Set(concesiones.map((c) => isoFecha(c.creadoEn)));

  const dias = [...porFecha.entries()]
    // Del más reciente al más antiguo: el Testigo se lee de arriba abajo.
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([fecha, v]) => ({
      fecha,
      importeMicros: v.importeMicros.toString(),
      importe: dinero(v.importeMicros).texto,
      registros: v.registros,
      registrosT1: v.t1,
      registrosT2: v.t2,
      registrosT3: v.t3,
      usuariosPago: v.pagos,
      // Un día abierto todavía puede revisarse: se marca para que el Testigo lo
      // dibuje con la veta y el agente sepa que esa cifra aún puede moverse.
      provisional: !estaCerrado(fecha, hoy),
      concesiones: concesionesPorFecha.has(fecha) ? 1 : 0,
    }));

  return NextResponse.json({
    dias,
    webmasters,
    // Inicio lo usa para no ofrecer una acción que el servidor va a rechazar:
    // mandar a alguien sin permiso a una pantalla que solo puede decirle que no
    // es peor que no ofrecerle el enlace.
    puedeActivarWebmasters,
    cartera: {
      devengado: dinero(saldo.devengadoMicros),
      disponible: dinero(saldo.disponibleMicros),
      solicitado: dinero(saldo.solicitadoMicros),
      pagado: dinero(saldo.pagadoMicros),
    },
  });
}
