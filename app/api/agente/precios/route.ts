import { NextResponse } from "next/server";

import { esRespuesta, exigirAgente } from "@/lib/api/agente";
import { cadenas } from "@/lib/i18n";
import { formatearMicros } from "@/lib/devengo/dinero";
import { tablaDePrecios } from "@/lib/precios/tabla";

/**
 * La tabla de precios del programa, para el agente.
 *
 * **Exige sesión de agente y no es pública.** No es un secreto —los precios
 * están en el programa de socios de Sophon— pero servirla abierta convertiría
 * esta ruta en un espejo gratuito de la API de Sophon con nuestro token
 * detrás, y de paso dejaría la caché a merced de cualquiera.
 *
 * Los importes viajan formateados Y en micros. El texto porque el idioma lo
 * decide el servidor —donde está la sesión— y los micros porque la pantalla
 * compara niveles y necesita números, no cadenas con separador de millares.
 *
 * Lo que NO viaja: el precio global, la comisión del agente y el reparto del
 * Operador. Ver `lib/precios/tabla.ts`: el descuento se aplica allí y aquí ya
 * no hay forma de deshacerlo.
 */

export const dynamic = "force-dynamic";

export async function GET(peticion: Request): Promise<NextResponse> {
  const ctx = await exigirAgente(peticion);
  if (esRespuesta(ctx)) return ctx;
  const { idioma } = ctx.sesion;
  const t = cadenas(idioma);

  let tabla;
  try {
    tabla = await tablaDePrecios();
  } catch (e) {
    /*
     * Sophon caído no puede tumbar la pantalla entera.
     *
     * Se contesta 503 con el mismo par error/apoyo que el resto de la API, y la
     * pantalla pinta su aviso con reintento. La alternativa —devolver una tabla
     * vacía con 200— haría que el agente leyera «no hay precios» delante del
     * webmaster al que se los está enseñando.
     */
    console.error("[precios] Sophon no ha contestado", e);
    return NextResponse.json(
      { error: t.errSophonNoResponde, apoyo: t.errSophonNoRespondeApoyo },
      { status: 503 },
    );
  }

  /*
   * Cuánto falta para el siguiente nivel, calculado AQUÍ.
   *
   * La resta es de micros y el resultado hay que formatearlo con el separador
   * del idioma, y las dos cosas viven en el servidor: `formatearMicros` y el
   * idioma de la sesión. Hacerlo en la pantalla obligaría a restar cadenas ya
   * formateadas —imposible— o a pasar por coma flotante, que es lo que este
   * proyecto no hace en ninguna parte con dinero.
   *
   * El siguiente es el primero POR ENCIMA del actual que tenga umbral, no
   * `nivelActual + 1`: si Sophon dejara de publicar el de un nivel intermedio,
   * sumar uno apuntaría a un peldaño sin cifra.
   */
  const acumuladoMicros = BigInt(tabla.acumuladoMicros);
  const siguiente = tabla.requisitos.find((r) => r.nivel > tabla.nivelActual);
  const faltanMicros = siguiente ? BigInt(siguiente.minimoMicros) - acumuladoMicros : 0n;

  return NextResponse.json({
    nivelActual: tabla.nivelActual,
    niveles: tabla.niveles,
    // `null` cuando ya se está arriba del todo, y la pantalla dice otra cosa.
    // `faltan` a cero significa que el umbral ya está cubierto y el nivel entra
    // el día 1: no es lo mismo que no haber siguiente.
    siguiente:
      siguiente === undefined
        ? null
        : {
            nivel: siguiente.nivel,
            faltan: {
              micros: (faltanMicros > 0n ? faltanMicros : 0n).toString(),
              texto: formatearMicros(faltanMicros > 0n ? faltanMicros : 0n, 2, idioma),
            },
          },
    tiers: tabla.tiers.map((fila) => ({
      tier: fila.tier,
      paises: fila.paises,
      porNivel: Object.fromEntries(
        Object.entries(fila.porNivelMicros).map(([nivel, micros]) => [
          nivel,
          { micros, texto: formatearMicros(BigInt(micros), 2, idioma) },
        ]),
      ),
    })),
    requisitos: tabla.requisitos.map((r) => ({
      nivel: r.nivel,
      minimo: { micros: r.minimoMicros, texto: formatearMicros(BigInt(r.minimoMicros), 2, idioma) },
    })),
    acumulado: {
      micros: tabla.acumuladoMicros,
      texto: formatearMicros(BigInt(tabla.acumuladoMicros), 2, idioma),
    },
  });
}
