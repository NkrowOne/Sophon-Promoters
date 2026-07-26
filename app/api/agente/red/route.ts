import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { dinero, esRespuesta, exigirAgente, isoFecha } from "@/lib/api/agente";
import { hoyContable } from "@/lib/sync/registros";
import { diasRestantesPro, renovablePro } from "@/lib/pro/vigencia";
import { diasSinActividad } from "@/lib/red/inactividad";

/**
 * La red del agente, en la forma que necesita La Malla.
 *
 * La pantalla responde a una sola pregunta —¿cuál de mis webmasters se ha
 * apagado?— así que el orden por defecto es por aportación reciente y cada
 * webmaster trae su serie de 14 días. El que deja de producir se ve como un
 * hueco sin leer un número.
 *
 * `diasSinActividad` se calcula aquí y no en el cliente porque depende de la
 * zona horaria contable, que es una decisión del servidor.
 */

export const dynamic = "force-dynamic";

const DIAS_MALLA = 14;

export async function GET(peticion: Request): Promise<NextResponse> {
  const ctx = await exigirAgente(peticion);
  if (esRespuesta(ctx)) return ctx;
  const { agenteId } = ctx.sesion;

  const hoy = hoyContable();
  const desde = new Date(Date.parse(`${hoy}T00:00:00Z`) - (DIAS_MALLA - 1) * 86_400_000);

  const webmasters = await db.webmaster.findMany({
    where: { agenteId },
    select: {
      emailNormalizado: true,
      emailOriginal: true,
      estadoSophon: true,
      desaparecidoEn: true,
      proVigenteHasta: true,
      atribuidoEn: true,
      filasDiarias: {
        where: { fecha: { gte: desde } },
        select: {
          fecha: true,
          countRegister: true,
          countT1Register: true,
          countT2Register: true,
          countT3Register: true,
          countPayingUsers: true,
        },
        orderBy: { fecha: "desc" },
      },
      // Lo que gana el agente por este webmaster sale de SUS asientos.
      asientos: {
        where: { estado: { not: "ANULADO" } },
        select: { importeMicros: true, fechaDevengo: true },
      },
    },
  });

  const salida = webmasters.map((w) => {
    const ganado = w.asientos.reduce((a, x) => a + x.importeMicros, 0n);
    const serie = w.filasDiarias.map((f) => ({
      fecha: isoFecha(f.fecha),
      registros: f.countRegister,
      registrosT1: f.countT1Register,
      registrosT2: f.countT2Register,
      registrosT3: f.countT3Register,
      usuariosPago: f.countPayingUsers,
    }));

    // La cuenta la hace `lib/red/inactividad.ts`, que es la MISMA que usa el
    // aviso diario del bot. Estaba escrita aquí a mano, y con dos lectores del
    // mismo estado eso acaba en que la Malla dice «14 días parado» y el bot
    // avisa a los veintiuno.
    const parado = diasSinActividad(w.filasDiarias, hoy);

    const registrosVentana = serie.reduce((a, d) => a + d.registros, 0);

    return {
      email: w.emailOriginal,
      id: w.emailNormalizado,
      estado: w.desaparecidoEn ? "DESAPARECIDO" : w.estadoSophon,
      activadoEn: w.atribuidoEn ? isoFecha(w.atribuidoEn) : null,
      proVigenteHasta: w.proVigenteHasta ? isoFecha(w.proVigenteHasta) : null,
      // La Mecha: días hasta que caduque el PRO. Es el único dato temporal que
      // la API de Sophon no permite consultar, solo llega al concederlo.
      diasHastaCaducidad: diasRestantesPro(w.proVigenteHasta),
      /*
       * Y si se puede hacer algo al respecto, que no es lo mismo.
       *
       * La Malla pintaba «PRO vence en 12 d» como aviso amarillo, o sea como
       * algo accionable, y con la regla de vigencia no lo es: hasta que se
       * apague no hay botón que valga. Este campo es el que decide si la tesela
       * avisa o solo informa, y sale de la MISMA función que usa el guardián de
       * `concederAnio`. Tres lectores del mismo estado tienen que contar la
       * misma historia.
       */
      proRenovable: renovablePro(w.proVigenteHasta),
      ganadoTotal: dinero(ganado),
      registrosVentana,
      diasSinActividad: parado,
      serie,
    };
  });

  // Por aportación reciente: lo que rinde arriba, lo apagado abajo y visible.
  salida.sort((a, b) => b.registrosVentana - a.registrosVentana);

  return NextResponse.json({ webmasters: salida, dias: DIAS_MALLA });
}
