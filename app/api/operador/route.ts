import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  abrirSesionDeOperador,
  COOKIE_ADMIN,
  COOKIE_DESDE_TELEGRAM,
  opcionesCookieAdmin,
  opcionesMarcaTelegram,
} from "@/lib/auth/admin";
import { telegramDeLaPeticion } from "@/lib/auth/sesion";
import { esOperador } from "@/lib/operador";

/**
 * La puerta del panel DESDE DENTRO de Telegram.
 *
 * ── QUÉ RESUELVE ──
 *
 * Hasta ahora al panel solo se entraba por el enlace de un solo uso que el bot
 * manda al chat, y ese enlace abre un navegador. Para un Operador que trabaja en
 * el móvil eso es salir de Telegram, mirar una tabla y volver: la fricción
 * suficiente para no mirarla nunca.
 *
 * Aquí no hay enlace porque no hace falta. El `initData` que manda la Mini App va
 * **firmado con el token del bot**, así que el `telegramId` que trae lo ha dicho
 * Telegram, no el cliente. Se comprueba contra `TELEGRAM_OPERADOR_ID` —la misma
 * comprobación que hacen el bot y el guardián del panel— y se abre la sesión.
 *
 * ── DOS VERBOS, Y LA DIFERENCIA IMPORTA ──
 *
 *  - `GET` solo **responde si eres tú**. No escribe nada. Lo usa la portada de la
 *    Mini App para decidir si pinta la fila del panel, y llamarlo en cada carga
 *    no puede dejar una sesión abierta por ahí.
 *  - `POST` **abre la sesión**. Es el toque en esa fila.
 *
 * Con un solo verbo que hiciera las dos cosas, cada vez que el Operador abriera
 * la Mini App quedaría una sesión de doce horas creada sin que él pidiera entrar.
 *
 * ── POR QUÉ NO DICE «NO ERES EL OPERADOR» ──
 *
 * A quien no lo es se le contesta lo mismo que si la ruta no existiera para él:
 * `{ operador: false }` y un 403 seco. El panel del Operador no tiene por qué
 * anunciarle a un agente que existe una pantalla a la que no puede entrar.
 */

export const dynamic = "force-dynamic";

/** ¿Es quien mira el Operador? Solo lectura: no abre nada. */
export async function GET(peticion: Request): Promise<NextResponse> {
  const usuario = telegramDeLaPeticion(peticion);
  return NextResponse.json({ operador: esOperador(usuario?.id) });
}

/** Abre la sesión del panel y deja la cookie puesta. */
export async function POST(peticion: Request): Promise<NextResponse> {
  const usuario = telegramDeLaPeticion(peticion);

  if (!usuario) {
    // Sin firma no se sabe quién llama. Pasa al abrir la URL fuera de Telegram,
    // que no es un ataque: es la puerta equivocada.
    return NextResponse.json({ error: "sinTelegram" }, { status: 401 });
  }
  if (!esOperador(usuario.id)) {
    return NextResponse.json({ error: "noAutorizado" }, { status: 403 });
  }

  const ip = peticion.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const token = await abrirSesionDeOperador(BigInt(usuario.id), ip);

  const almacen = await cookies();
  // `desdeTelegram`: la Mini App corre en un iframe de terceros en el escritorio
  // y una cookie `lax` no sobrevive ahí. Ver `opcionesCookieAdmin`.
  almacen.set(COOKIE_ADMIN, token, opcionesCookieAdmin(true));
  almacen.set(COOKIE_DESDE_TELEGRAM, "1", opcionesMarcaTelegram());

  return NextResponse.json({ ok: true, destino: "/admin" });
}
