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
 * Lo que NO viaja: el precio global, la comisión del agente, el reparto del
 * Operador y el volumen de compra de la cuenta maestra. Los cuatro se quedan en
 * `lib/precios/tabla.ts`, que es donde está escrito por qué; aquí ya no hay
 * forma de deshacerlo ni de deducirlo.
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

  return NextResponse.json({
    niveles: tabla.niveles,
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
  });
}
