import { NextResponse } from "next/server";

import { NOMBRE_COOKIE, sesionActual } from "@/lib/auth/sesion";

/**
 * Estado de la sesión.
 *
 * La Mini App la consulta al arrancar para decidir si enseña el panel o manda al
 * alta. Devuelve 200 con `autenticado: false` en vez de 401: no es un error que
 * alguien aún no tenga cuenta, y un 401 haría ruido en cualquier monitorización.
 *
 * Nunca devuelve nada del margen del superadmin ni de otros agentes: solo lo
 * imprescindible para pintar la cabecera y decidir qué acciones habilitar.
 */

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const sesion = await sesionActual();
  if (!sesion) return NextResponse.json({ autenticado: false });

  return NextResponse.json({
    autenticado: true,
    agente: {
      email: sesion.emailNormalizado,
      nombre: sesion.nombreVisible,
    },
  });
}

/** Cierra la sesión de este dispositivo. */
export async function DELETE(): Promise<NextResponse> {
  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set(NOMBRE_COOKIE, "", { path: "/", maxAge: 0 });
  return respuesta;
}
