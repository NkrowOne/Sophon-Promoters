import { NextResponse } from "next/server";

import { validarInitData } from "@/lib/auth/telegram";
import { idBot, pegaDelToken, tokenBot } from "@/lib/bot/token";

/**
 * Por qué NO se verifica el acceso, dicho en la pantalla del que lo sufre.
 *
 * ── EL PROBLEMA QUE RESUELVE ──
 *
 * «Telegram no ha verificado tu acceso» es un 401 que producen cinco cosas muy
 * distintas: la app abierta fuera de Telegram, el token ausente, un token que no
 * es el del bot que firmó, un `initData` caducado y uno incompleto. Desde fuera
 * son idénticas. `lib/auth/sesion.ts` ya escribe el motivo en el registro del
 * servidor, y eso sirve para quien pueda leerlo **en el momento** en que alguien
 * abre la app; leer registros de un panel de despliegue mientras sostienes el
 * móvil con la otra mano no siempre es posible.
 *
 * Esto pone la misma respuesta en la pantalla. Se abre desde el bot con
 * `/diagnostico` —comando del Operador— y contesta en dos segundos.
 *
 * ── QUÉ PUEDE Y QUÉ NO PUEDE SALIR DE AQUÍ ──
 *
 * La ruta NO está autenticada, y no puede estarlo: existe justamente para el
 * caso en que la autenticación no funciona. Así que todo lo que devuelve es
 * público por definición, y está elegido uno a uno:
 *
 *  · **El id del bot, sí.** Es el número de delante de los dos puntos del token,
 *    o sea el identificador de Telegram del propio bot: sale en cualquier enlace
 *    `t.me`. El secreto es lo de después, y no se toca.
 *  · **Los NOMBRES de los campos del initData, sí. Los valores, no.** Que falte
 *    `hash` o sobre algo es media respuesta; el contenido lleva el nombre y el
 *    id de Telegram de quien abre la app.
 *  · **El desfase del reloj, sí.** Un contenedor con la hora corrida rechaza
 *    firmas legítimas por «caducada», y es de las causas más difíciles de
 *    sospechar.
 *  · **El motivo del rechazo, sí.** Quien manda un `initData` inválido ya
 *    obtiene ese mismo bit del 401 corriente; aquí solo se dice con palabras.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(peticion: Request): Promise<NextResponse> {
  const initData = peticion.headers.get("x-telegram-init-data");
  const token = tokenBot();
  const ahora = new Date();

  /*
   * Los nombres de los campos, ordenados. Es lo que distingue un `initData` de
   * verdad de la cadena vacía que manda un navegador suelto, y de uno recortado
   * por el camino.
   */
  const campos = initData ? [...new URLSearchParams(initData).keys()].sort() : [];

  // El `auth_date` se lee SIN verificar la firma a propósito: si el rechazo es
  // por reloj, la firma nunca llega a comprobarse y aun así hay que poder ver
  // el desfase.
  const authDateRaw = initData ? new URLSearchParams(initData).get("auth_date") : null;
  const authDate = authDateRaw && Number.isFinite(Number(authDateRaw))
    ? new Date(Number(authDateRaw) * 1000)
    : null;

  let veredicto: string;
  if (!token) {
    veredicto = "el servidor no tiene TELEGRAM_BOT_TOKEN";
  } else if (!initData) {
    veredicto = "la petición no lleva la cabecera x-telegram-init-data";
  } else {
    try {
      validarInitData(initData, token);
      veredicto = "ok";
    } catch (e) {
      veredicto = e instanceof Error ? e.message : "motivo desconocido";
    }
  }

  return NextResponse.json(
    {
      veredicto,
      cabecera: { presente: initData !== null, longitud: initData?.length ?? 0, campos },
      bot: { id: idBot(), pega: pegaDelToken() },
      reloj: {
        servidor: ahora.toISOString(),
        initData: authDate?.toISOString() ?? null,
        desfaseSegundos: authDate ? Math.round((ahora.getTime() - authDate.getTime()) / 1000) : null,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
