import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { COOKIE_ADMIN, sesionAdmin } from "@/lib/auth/admin";

/**
 * Cierra la sesión del panel.
 *
 * Revoca la fila además de borrar la cookie: si solo se borrara la cookie, un
 * token copiado antes de cerrar seguiría abriendo el panel durante horas.
 */

export const dynamic = "force-dynamic";

export async function POST(peticion: Request): Promise<NextResponse> {
  const sesion = await sesionAdmin();
  if (sesion) {
    await db.sesionAdmin.update({
      where: { id: sesion.id },
      data: { revocadaEn: new Date() },
    });
  }

  const respuesta = NextResponse.redirect(new URL("/admin/cerrado", new URL(peticion.url).origin), 303);
  respuesta.cookies.set(COOKIE_ADMIN, "", { path: "/", maxAge: 0 });
  return respuesta;
}
