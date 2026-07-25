import { NextResponse } from "next/server";
import { webhookCallback } from "grammy";

import { bot } from "@/lib/bot/bot";

/**
 * Webhook de Telegram.
 *
 * Dos defensas y una decisión de forma:
 *
 *  1. **Secreto en cabecera.** La URL del webhook acaba en logs de proxies y en
 *     capturas; el secreto que Telegram devuelve en
 *     `X-Telegram-Bot-Api-Secret-Token` es lo que prueba que la petición viene
 *     de Telegram. Sin `TELEGRAM_WEBHOOK_SECRET` configurado la ruta se apaga
 *     (503) en lugar de quedarse abierta, que es el fallo que nadie nota.
 *
 *  2. **Siempre 200.** Un error nuestro no puede devolver 5xx: Telegram
 *     reintenta la misma actualización una y otra vez y el bot entra en bucle
 *     con el mismo mensaje. Se registra y se acepta.
 */

export const dynamic = "force-dynamic";
// El webhook toca la base de datos y la API de Telegram: nada que cachear.
export const revalidate = 0;

/**
 * El manejador se construye UNA vez y se reutiliza.
 *
 * Rehacerlo en cada actualización rehace también el árbol de middleware de
 * grammY —trabajo puro por mensaje— y en un proceso de larga vida eso se paga
 * en cada uno de ellos. Se crea perezosamente porque leer el token al importar
 * el módulo haría fallar el build, que no tiene el entorno.
 */
let manejador: ((p: Request) => Promise<Response>) | null = null;

function tratar(): (p: Request) => Promise<Response> {
  manejador ??= webhookCallback(bot(), "std/http");
  return manejador;
}

export async function POST(peticion: Request): Promise<Response> {
  const secreto = process.env["TELEGRAM_WEBHOOK_SECRET"];
  if (!secreto) {
    console.warn("[bot] webhook deshabilitado: falta TELEGRAM_WEBHOOK_SECRET");
    return NextResponse.json({ error: "webhook no configurado" }, { status: 503 });
  }

  if (peticion.headers.get("x-telegram-bot-api-secret-token") !== secreto) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  try {
    return await tratar()(peticion);
  } catch (e) {
    console.error("[bot] fallo tratando el webhook", e);
    return NextResponse.json({ ok: true });
  }
}
