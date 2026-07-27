import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { cadenas } from "@/lib/i18n";
import { CAMPOS_FILA_VISIBLES, dinero, esRespuesta, exigirAgente, isoFecha } from "@/lib/api/agente";
import { estaCerrado } from "@/lib/devengo/motor";
import { hoyContable } from "@/lib/sync/registros";
import { diasRestantesPro, renovablePro } from "@/lib/pro/vigencia";

/**
 * Ficha de un webmaster.
 *
 * Responde dos preguntas y nada más: **cuánto me da este** y **cuándo le caduca
 * el PRO**. Por eso devuelve la serie diaria con el importe del agente día a día
 * —no la ganancia bruta de Sophon— y el periodo completo de la membresía, no
 * solo su fecha de fin: La Mecha necesita el principio para saber cuánto se ha
 * consumido ya.
 *
 * El `id` de la ruta es el email normalizado. La consulta filtra SIEMPRE por
 * `agenteId`, así que pedir la ficha de un webmaster ajeno devuelve 404 en vez
 * de filtrar su existencia.
 */

export const dynamic = "force-dynamic";

const DIAS_FICHA = 60;

export async function GET(
  peticion: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = await exigirAgente(peticion);
  if (esRespuesta(ctx)) return ctx;
  const { agenteId } = ctx.sesion;

  const { id } = await params;
  const emailNormalizado = decodeURIComponent(id).trim().toLowerCase();

  const hoy = hoyContable();
  const desde = new Date(Date.parse(`${hoy}T00:00:00Z`) - (DIAS_FICHA - 1) * 86_400_000);

  const webmaster = await db.webmaster.findFirst({
    where: { emailNormalizado, agenteId },
    select: {
      id: true,
      emailOriginal: true,
      emailNormalizado: true,
      estadoSophon: true,
      confirmadoEn: true,
      desaparecidoEn: true,
      atribuidoEn: true,
      devengaDesde: true,
      origen: true,
      proVigenteHasta: true,
      filasDiarias: {
        where: { fecha: { gte: desde } },
        select: CAMPOS_FILA_VISIBLES,
        orderBy: { fecha: "desc" },
      },
    },
  });

  if (!webmaster) {
    /*
     * Sin `apoyo`, y a sabiendas.
     *
     * El apoyo tiene clave PROPIA y no reutiliza `errNoEsTuyoApoyo`, que habla
     * de renovar el PRO: aquí el agente solo ha abierto una ficha, así que esa
     * respuesta contestaría a una pregunta que no ha hecho. La regla de la casa
     * es que un error diga qué ha pasado, por qué y qué hacer ahora, y lo que
     * se puede hacer aquí es comprobar el correo o darlo de alta.
     */
    const t = cadenas(ctx.sesion.idioma);
    return NextResponse.json(
      { error: t.errNoEsTuyo, apoyo: t.errNoEsTuyoAbrirApoyo },
      { status: 404 },
    );
  }

  const [asientos, totalAsientos, concesiones] = await Promise.all([
    db.asientoComision.groupBy({
      by: ["fechaDevengo"],
      where: {
        agenteId,
        webmasterId: webmaster.id,
        estado: { not: "ANULADO" },
        fechaDevengo: { gte: desde },
      },
      _sum: { importeMicros: true },
    }),
    db.asientoComision.aggregate({
      where: { agenteId, webmasterId: webmaster.id, estado: { not: "ANULADO" } },
      _sum: { importeMicros: true },
    }),
    db.concesionPro.findMany({
      where: { agenteId, webmasterId: webmaster.id, estado: "CONFIRMADA" },
      orderBy: { creadoEn: "desc" },
      take: 12,
      select: { motivo: true, creadoEn: true, vigenteHasta: true },
    }),
  ]);

  const porFecha = new Map(
    asientos.map((a) => [isoFecha(a.fechaDevengo), a._sum.importeMicros ?? 0n]),
  );

  const serie = webmaster.filasDiarias.map((f) => {
    const fecha = isoFecha(f.fecha);
    const importeMicros = porFecha.get(fecha) ?? 0n;
    return {
      fecha,
      importeMicros: importeMicros.toString(),
      importe: dinero(importeMicros).texto,
      registros: f.countRegister,
      registrosT1: f.countT1Register,
      registrosT2: f.countT2Register,
      registrosT3: f.countT3Register,
      usuariosPago: f.countPayingUsers,
      provisional: !estaCerrado(fecha, hoy),
    };
  });

  const suma = (campo: "registros" | "registrosT1" | "registrosT2" | "registrosT3" | "usuariosPago") =>
    serie.reduce((a, d) => a + d[campo], 0);

  // La Mecha necesita el periodo COMPLETO, no solo el final: sin el principio no
  // se puede dibujar cuánto queda frente a cuánto se concedió.
  const vigente = concesiones.find(
    (c) => c.vigenteHasta !== null && c.vigenteHasta.getTime() > Date.now(),
  );
  const fin = webmaster.proVigenteHasta;
  const pro = fin
    ? {
        vigenteHasta: isoFecha(fin),
        concedidoEn: vigente ? isoFecha(vigente.creadoEn) : null,
        diasRestantes: diasRestantesPro(fin) ?? 0,
        diasConcedidos: vigente
          ? Math.max(1, Math.round((fin.getTime() - vigente.creadoEn.getTime()) / 86_400_000))
          : null,
      }
    : null;

  /*
   * Si se le puede conceder PRO hoy, y va FUERA del objeto `pro` a propósito:
   * un webmaster sin PRO no tiene `pro`, y es justo el más renovable de todos.
   * Colgarlo de dentro habría dejado el caso principal sin poder expresarse.
   *
   * Sale de la misma función que usa el guardián de `concederAnio`: la ficha
   * tenía por única guarda `disabled={renovando}`, así que ofrecía renovar un
   * PRO con 300 días por delante e incluso una cuenta bloqueada en Sophon.
   */
  const proRenovable = renovablePro(fin);

  return NextResponse.json({
    email: webmaster.emailOriginal,
    id: webmaster.emailNormalizado,
    estado: webmaster.desaparecidoEn
      ? "DESAPARECIDO"
      : webmaster.confirmadoEn === null
        ? "PENDIENTE_CONFIRMACION"
        : webmaster.estadoSophon,
    origen: webmaster.origen,
    activadoEn: webmaster.atribuidoEn ? isoFecha(webmaster.atribuidoEn) : null,
    // Cuando la atribución fue prospectiva, el agente tiene que saber desde qué
    // día cobra: si no, verá registros anteriores sin importe y pensará que
    // falta dinero.
    devengaDesde: webmaster.devengaDesde ? isoFecha(webmaster.devengaDesde) : null,
    pro,
    proRenovable,
    dias: DIAS_FICHA,
    serie,
    totales: {
      ganado: dinero(totalAsientos._sum.importeMicros ?? 0n),
      registros: suma("registros"),
      registrosT1: suma("registrosT1"),
      registrosT2: suma("registrosT2"),
      registrosT3: suma("registrosT3"),
      usuariosPago: suma("usuariosPago"),
    },
    concesiones: concesiones.map((c) => ({
      motivo: c.motivo,
      concedidoEn: isoFecha(c.creadoEn),
      vigenteHasta: c.vigenteHasta ? isoFecha(c.vigenteHasta) : null,
    })),
  });
}
