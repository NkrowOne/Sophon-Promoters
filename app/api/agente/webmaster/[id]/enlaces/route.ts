import { NextResponse } from "next/server";

import { dinero, esRespuesta, exigirAgente, webmasterDelAgente } from "@/lib/api/agente";
import { clienteSophon } from "@/lib/sophon/instancia";
import { hoyContable } from "@/lib/sync/registros";
import { microsDesdeCadena } from "@/lib/devengo/dinero";

/**
 * Con qué enlaces capta este webmaster.
 *
 * `enlacesReparto` (`share_link/list`) estaba implementado en el cliente de
 * Sophon desde el principio y **no lo llamaba nadie**. Es la materia prima del
 * trabajo comercial —qué enlace le funciona a cada webmaster y cuál no mueve
 * nada— y el agente no la veía por ningún lado, que es raro en una aplicación
 * cuyo objeto es que el agente ayude a sus webmasters a producir más.
 *
 * **Va en su propia ruta y no dentro de la ficha, a propósito.** Esto es una
 * llamada en vivo a Sophon: si tarda o falla, tiene que degradar a nada sin
 * llevarse por delante la ficha entera. Compartiendo petición, un timeout de
 * Sophon habría dejado al agente sin ver ni lo que ha ganado ni cuándo le
 * caduca el PRO, que es lo que sí sale de nuestra base de datos y siempre
 * puede responderse.
 *
 * **No entra en el ledger.** Es dato de referencia, no dinero: no se persiste,
 * no se devenga y no se concilia. Esa es exactamente la razón por la que puede
 * ir en vivo: nada de lo que hay aquí tiene que cuadrar con nada.
 */

export const dynamic = "force-dynamic";

/** La misma ventana que la ficha, o las cifras no cuadrarían con las de arriba. */
const DIAS_FICHA = 60;

/** Techo de filas. Un webmaster con miles de enlaces no puede tumbar la pantalla. */
const MAXIMO = 40;

export async function GET(
  peticion: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = await exigirAgente(peticion);
  if (esRespuesta(ctx)) return ctx;

  const { id } = await params;
  const emailNormalizado = decodeURIComponent(id).trim().toLowerCase();

  // Mismo candado que el resto de la aplicación: filtrado por `agenteId`, así
  // que pedir los enlaces de un webmaster ajeno da 404 y no confirma siquiera
  // que exista.
  const webmaster = await webmasterDelAgente(ctx.sesion.agenteId, emailNormalizado);
  if (!webmaster) {
    return NextResponse.json({ error: "El webmaster no consta en esta red." }, { status: 404 });
  }

  const hasta = hoyContable();
  const desde = new Date(Date.parse(`${hasta}T00:00:00Z`) - (DIAS_FICHA - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);

  try {
    const pagina = await clienteSophon().enlacesReparto({
      desde,
      hasta,
      // Por el email ORIGINAL: es el que Sophon conoce. El normalizado es
      // nuestro y solo sirve como clave interna.
      emails: [webmaster.emailOriginal],
      tamano: 200,
    });

    const enlaces = (pagina.shareLinks ?? [])
      .map((f) => ({
        enlace: f.shareLink,
        registros: Number(f.countRegister) || 0,
        usuariosPago: Number(f.countPayingUsers) || 0,
        // Los importes de Sophon son cadenas decimales y jamás se pasan por
        // `float` (§2.5): a micros con `microsDesdeCadena` y de ahí al mismo
        // `dinero()` que usan las demás rutas, para que un importe se vea igual
        // en toda la aplicación.
        pagado: dinero(microsSeguros(f.paymentAmount)),
      }))
      // Los que traen gente arriba: la pregunta es «cuál le funciona».
      .sort((a, b) => b.registros - a.registros)
      .slice(0, MAXIMO);

    return NextResponse.json({ dias: DIAS_FICHA, enlaces });
  } catch (e) {
    // Se traga el fallo y responde 200 con la lista vacía y `disponible: false`.
    //
    // Un 500 aquí habría hecho que la banda de la ficha pintara un error rojo
    // por algo que no lo es: que Sophon no conteste no es un problema del
    // agente ni de su webmaster, y no hay nada que pueda hacer al respecto. La
    // banda se calla y el resto de la ficha sigue completa.
    console.warn("[enlaces] Sophon no contestó:", e instanceof Error ? e.message : e);
    return NextResponse.json({ dias: DIAS_FICHA, enlaces: [], disponible: false });
  }
}

/**
 * Micros a partir de lo que venga.
 *
 * `microsDesdeCadena` lanza ante un decimal mal formado, y hace bien: en el
 * ledger un importe que no se entiende tiene que parar el proceso. Aquí no hay
 * ledger —esto es referencia y no cuadra con nada—, así que una fila rara vale
 * cero y las otras treinta y nueve se siguen viendo.
 */
function microsSeguros(valor: string | null | undefined): bigint {
  try {
    return microsDesdeCadena(valor);
  } catch {
    return 0n;
  }
}
