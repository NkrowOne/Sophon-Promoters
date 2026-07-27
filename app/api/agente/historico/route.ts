import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { CAMPOS_FILA_VISIBLES, dinero, esRespuesta, exigirAgente, isoFecha } from "@/lib/api/agente";
import { estaCerrado } from "@/lib/devengo/motor";
import { hoyContable } from "@/lib/sync/registros";

/**
 * Histórico paginado hacia el pasado.
 *
 * La pantalla se recorre con scroll infinito —perforar hacia abajo es ir hacia
 * atrás en el tiempo—, así que la paginación es por **fecha de corte** y no por
 * número de página: con `pageNum` una fila nueva desplazaría todo y el agente
 * vería días repetidos al seguir bajando.
 *
 * Cada día trae ya calculado si abre mes, para que el Testigo pinte la junta sin
 * tener que deducirlo comparando con el anterior.
 */

export const dynamic = "force-dynamic";

const DIAS_POR_PAGINA = 60;

export async function GET(peticion: Request): Promise<NextResponse> {
  const ctx = await exigirAgente(peticion);
  if (esRespuesta(ctx)) return ctx;
  const { agenteId, idioma } = ctx.sesion;

  const url = new URL(peticion.url);
  const antesDe = url.searchParams.get("antesDe");
  const hoy = hoyContable();

  // El corte es exclusivo: la primera página no lo lleva y las siguientes piden
  // «lo anterior al día más antiguo que ya tengo».
  const filtroFecha = antesDe ? { lt: new Date(antesDe) } : undefined;

  const [asientos, filas] = await Promise.all([
    db.asientoComision.groupBy({
      by: ["fechaDevengo"],
      where: {
        agenteId,
        estado: { not: "ANULADO" },
        ...(filtroFecha ? { fechaDevengo: filtroFecha } : {}),
      },
      _sum: { importeMicros: true },
      orderBy: { fechaDevengo: "desc" },
      take: DIAS_POR_PAGINA,
    }),
    db.filaDiariaSophon.findMany({
      where: {
        webmaster: { agenteId },
        ...(filtroFecha ? { fecha: filtroFecha } : {}),
      },
      select: CAMPOS_FILA_VISIBLES,
      orderBy: { fecha: "desc" },
      // Varias filas por día (una por webmaster): se pide de sobra y se agrupa.
      take: DIAS_POR_PAGINA * 25,
    }),
  ]);

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
    // Solo se agregan días que ya estén en la ventana de esta página, para no
    // colar fechas más antiguas que las que devolvió el groupby.
    if (!porFecha.has(clave) && porFecha.size >= DIAS_POR_PAGINA) continue;
    const acc = porFecha.get(clave) ?? vacio();
    acc.t1 += f.countT1Register;
    acc.t2 += f.countT2Register;
    acc.t3 += f.countT3Register;
    acc.registros += f.countRegister;
    acc.pagos += f.countPayingUsers;
    porFecha.set(clave, acc);
  }

  const ordenadas = [...porFecha.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, DIAS_POR_PAGINA);

  const dias = ordenadas.map(([fecha, v], i) => {
    const anterior = ordenadas[i - 1]?.[0];
    return {
      fecha,
      importeMicros: v.importeMicros.toString(),
      importe: dinero(v.importeMicros, idioma).texto,
      registros: v.registros,
      registrosT1: v.t1,
      registrosT2: v.t2,
      registrosT3: v.t3,
      usuariosPago: v.pagos,
      provisional: !estaCerrado(fecha, hoy),
      // Abre mes cuando el día anterior de la lista pertenece a otro mes. Se
      // calcula aquí para que el Testigo pinte la junta sin deducirlo.
      abreMes: anterior !== undefined && anterior.slice(0, 7) !== fecha.slice(0, 7),
    };
  });

  // Totales por mes: son el cierre de cada estrato.
  const meses = new Map<string, bigint>();
  for (const [fecha, v] of ordenadas) {
    const mes = fecha.slice(0, 7);
    meses.set(mes, (meses.get(mes) ?? 0n) + v.importeMicros);
  }

  return NextResponse.json({
    dias,
    meses: [...meses.entries()].map(([mes, micros]) => ({ mes, total: dinero(micros, idioma) })),
    // Cursor para la siguiente página: el día más antiguo de esta.
    siguienteCursor: dias.length === DIAS_POR_PAGINA ? dias[dias.length - 1]?.fecha : null,
  });
}
