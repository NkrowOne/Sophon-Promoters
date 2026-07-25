import { NextResponse } from "next/server";

import { canjearEnlace, COOKIE_ADMIN, opcionesCookieAdmin } from "@/lib/auth/admin";

/**
 * Canjea el enlace de entrada que manda el bot.
 *
 * Es una ruta y no una página porque tiene que **poner una cookie y redirigir**
 * en la misma respuesta. Y redirige siempre —haya salido bien o mal— para que
 * el token no se quede en la barra de direcciones, en el historial ni en la
 * cabecera `Referer` de la siguiente petición.
 */

export const dynamic = "force-dynamic";

export async function GET(peticion: Request): Promise<NextResponse> {
  const url = new URL(peticion.url);
  const canje = url.searchParams.get("t");

  if (!canje) {
    return NextResponse.redirect(new URL("/admin/cerrado?motivo=falta", url.origin));
  }

  const token = await canjearEnlace(canje, peticion.headers.get("x-forwarded-for"));
  if (!token) {
    return NextResponse.redirect(new URL("/admin/cerrado?motivo=caducado", url.origin));
  }

  const respuesta = NextResponse.redirect(new URL("/admin", url.origin));
  respuesta.cookies.set(COOKIE_ADMIN, token, opcionesCookieAdmin());
  return respuesta;
}
