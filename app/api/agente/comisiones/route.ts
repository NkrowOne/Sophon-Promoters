import { NextResponse } from "next/server";

import { dinero, esRespuesta, exigirAgente } from "@/lib/api/agente";
import { LOCALES } from "@/lib/idiomas";
import { minimoDeRetiroMicros } from "@/lib/devengo/minimo";
import { mesContable } from "@/lib/fechas";
import { escaleraVigente, registrosDelMes, tarifaVigente } from "@/lib/sync/registros";

/**
 * Lo que cobra EL AGENTE, en un solo sitio.
 *
 * Las tres vías por las que entra dinero en su cartera, y nada más:
 *
 *   · **CPA** — una cantidad fija por cada usuario que registre su webmaster.
 *   · **CPS** — un porcentaje de lo que esos usuarios paguen por el PRO.
 *   · **BONO** — un premio mensual por registros de TODA su red.
 *
 * ── POR QUÉ ES UNA RUTA Y NO UNAS CADENAS ──
 *
 * Estaba escrito a mano en el catálogo: «Cobras 0,03 $ por cada usuario que
 * registre». Los 0,03 son `TarifaVersion.cpaPorRegistroMicros`, o sea un valor
 * que el Operador cambia desde su panel y que está versionado justo para que el
 * histórico no se reescriba. La cadena no se enteraba de nada: el día que la
 * tarifa suba, cinco catálogos siguen prometiendo la vieja, y prometiéndola en
 * la pantalla donde el agente decide dar de alta a alguien.
 *
 * Es el mismo criterio que ya sigue `/api/agente/precios` con el porcentaje del
 * webmaster: lo que se le paga de verdad sale de la tarifa vigente, no de una
 * frase.
 *
 * ── LO QUE NO SALE POR AQUÍ ──
 *
 * Ni el precio global, ni lo que cobra el webmaster, ni el reparto del Operador.
 * Esta ruta contesta a «¿cuánto cobro YO?» y solo lee la tarifa del agente y la
 * escalera de bonos. Lo del webmaster vive en `/api/agente/precios`, que es la
 * pantalla que existe para enseñárselo a él.
 *
 * ── SIN TARIFA NO SE INVENTA UN CERO ──
 *
 * `cpa` y `cps` son `null` cuando no hay tarifa vigente, y la pantalla se calla
 * esa línea. Un «0,00 $ por registro» se lee como «no cobras nada», que es una
 * afirmación distinta de «esto todavía no está configurado» — y la primera
 * espanta a un agente que está a punto de captar.
 */

export const dynamic = "force-dynamic";

export async function GET(peticion: Request): Promise<NextResponse> {
  const ctx = await exigirAgente(peticion);
  if (esRespuesta(ctx)) return ctx;
  const { idioma } = ctx.sesion;

  const [tarifa, escalones, minimo, registrosDelMesActual] = await Promise.all([
    tarifaVigente(),
    escaleraVigente(),
    // El mínimo va aquí y no en `/api/retiro` a secas porque la ayuda tiene que
    // contestar a «¿cuánto es el mínimo?» sin arrastrar el historial de cobros
    // entero, y porque escribir «20,00 $» en cinco catálogos lo dejaría
    // mintiendo el día que el Operador lo cambie.
    minimoDeRetiroMicros(),
    /*
     * Los registros del mes en curso, para que el medidor de objetivos de la
     * ayuda enseñe el avance REAL del agente y no una escalera de museo.
     *
     * Es la misma cuenta que la portada, del mes natural, porque el bono se
     * reinicia el día 1: mezclarla con la ventana móvil de 30 días que usa el
     * resto del resumen pintaría dos avances distintos para un solo bono.
     */
    registrosDelMes(ctx.sesion.agenteId, mesContable()),
  ]);

  const porcentaje = (bps: number) =>
    new Intl.NumberFormat(LOCALES[idioma], {
      style: "percent",
      maximumFractionDigits: 2,
    }).format(bps / 10_000);

  return NextResponse.json({
    cpa: tarifa ? dinero(tarifa.cpaPorRegistroMicros, idioma) : null,
    minimoRetiro: dinero(minimo, idioma),
    cps: tarifa ? porcentaje(Number(tarifa.cpsBps)) : null,
    // Ordenada de menor a mayor: es una escalera y se lee subiendo. La consulta
    // ya la devuelve así, pero ordenar aquí cuesta nada y no depende de que un
    // `orderBy` sobreviva a la próxima edición de `escaleraVigente`.
    bonos: [...escalones]
      .sort((a, b) => a.usuarios - b.usuarios)
      .map((e) => ({ usuarios: e.usuarios, premio: dinero(e.recompensaMicros, idioma) })),
    registrosDelMes: registrosDelMesActual,
  });
}
