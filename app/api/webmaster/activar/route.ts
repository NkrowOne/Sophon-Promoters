import { NextResponse } from "next/server";
import { z } from "zod";

import { cadenas } from "@/lib/i18n";
import { esRespuesta, exigirAgente } from "@/lib/api/agente";
import { altaDeWebmaster } from "@/lib/webmaster/alta";

/**
 * Activar un webmaster desde la Mini App.
 *
 * **Aquí ya no vive la operación**, solo su puerta HTTP: valida el cuerpo,
 * comprueba la sesión y traduce el resultado a JSON. La secuencia entera
 * —reservar en local, pedírselo a Sophon, deshacer si rechaza, conceder el año,
 * auditar— está en `lib/webmaster/alta.ts`, y el porqué está escrito allí: el
 * bot da de alta con `/activar correo@ejemplo.com` y necesita exactamente la
 * misma secuencia. Dos copias de la única operación que mueve dinero y crea
 * atribuciones es una copia que envejece sola.
 */

export const dynamic = "force-dynamic";

const Cuerpo = z.object({
  email: z.string().email().max(254),
  /** La genera el cliente y hace seguro reintentar sin conceder dos años. */
  idempotencia: z.string().min(8).max(64),
});

export async function POST(peticion: Request): Promise<NextResponse> {
  const ctx = await exigirAgente(peticion);
  if (esRespuesta(ctx)) return ctx;
  const { agenteId, idioma } = ctx.sesion;
  const t = cadenas(idioma);

  const parseado = Cuerpo.safeParse(await peticion.json().catch(() => null));
  if (!parseado.success) {
    return NextResponse.json(
      { error: t.errFormatoCorreo, apoyo: t.errFormatoCorreoApoyo },
      { status: 400 },
    );
  }

  const resultado = await altaDeWebmaster({
    agenteId,
    idioma,
    email: parseado.data.email,
    idempotencia: parseado.data.idempotencia,
  });

  // El texto se resuelve AQUÍ y no en el módulo: el bot pinta las mismas claves
  // en HTML de Telegram, así que lo que viaja entre los dos es la clave.
  if (!resultado.ok) {
    return NextResponse.json(
      { error: t[resultado.claveError], apoyo: t[resultado.claveApoyo] },
      { status: resultado.estado },
    );
  }

  return NextResponse.json({
    ok: true,
    email: resultado.email,
    devengaDesde: resultado.devengaDesde,
    nuevo: true,
    pro: resultado.pro,
  });
}
