/**
 * Sesiones de agente.
 *
 * El requisito es que el agente **no vuelva a entrar nunca**: la sesión dura 180
 * días y se renueva sola con el uso. Eso obliga a poder cortarla al instante si
 * un agente se va o su cuenta se compromete, y por eso existe la **época**: un
 * contador en el agente que se copia en cada sesión emitida. Incrementarlo
 * invalida todas sus sesiones de golpe, sin recorrer ni borrar filas.
 */

import { cookies } from "next/headers";

import { db } from "../db.ts";
import { generarTokenSesion, hashToken } from "../cripto.ts";
import { idiomaGuardado, type Idioma } from "../idiomas.ts";
import { validarInitData, type UsuarioTelegram } from "./telegram.ts";

export const NOMBRE_COOKIE = "sp_sesion";
export const DIAS_SESION = 180;
/** Con menos de esto por delante, la sesión se renueva al usarla. */
const DIAS_RENOVACION = 30;

export interface AgenteSesion {
  agenteId: string;
  emailNormalizado: string;
  nombreVisible: string;
  telegramId: bigint | null;
  /**
   * El idioma viaja EN LA SESIÓN porque si no, no llega a ninguna parte.
   *
   * Los errores de la API se construían en el servidor con literales en
   * español, así que un agente italiano recibía la pantalla traducida y encima
   * un mensaje de error en español. Las rutas no tenían de dónde sacar el
   * idioma sin una consulta más, y por eso nadie lo intentó.
   *
   * No cuesta ninguna consulta: `sesionActual` ya lee la fila del agente para
   * comprobar la época y el estado, y esto es una columna más de ese `select`.
   * El bot la refresca en cada `/start`, así que está tan fresca como el
   * `language_code` de Telegram.
   */
  idioma: Idioma;
}

/**
 * Emite una sesión y devuelve el token en claro. Es la **única** vez que ese
 * token existe fuera del navegador: en base de datos solo se guarda su hash.
 */
export async function emitirSesion(params: {
  agenteId: string;
  telegramId: bigint;
  ip?: string | null;
  agenteUsuario?: string | null;
}): Promise<string> {
  const agente = await db.agente.findUniqueOrThrow({
    where: { id: params.agenteId },
    select: { epocaSesion: true },
  });

  const { token, hash } = generarTokenSesion();
  const expiraEn = new Date(Date.now() + DIAS_SESION * 86_400_000);

  await db.sesionAgente.create({
    data: {
      agenteId: params.agenteId,
      tokenHash: hash,
      epocaSesion: agente.epocaSesion,
      telegramId: params.telegramId,
      expiraEn,
      ip: params.ip ?? null,
      agenteUsuario: params.agenteUsuario ?? null,
    },
  });

  return token;
}

/**
 * Resuelve la sesión activa a partir de la cookie.
 *
 * Devuelve `null` en vez de lanzar: quien llama decide si eso es un 401 o una
 * redirección al alta.
 *
 * Y devuelve **`"SUSPENDIDO"`**, que no es lo mismo que `null`, porque no lo era
 * para el agente y la API se lo estaba ocultando: con la cuenta parada, el token
 * es válido y la sesión no ha caducado, pero esta función las metía en el mismo
 * saco. El agente leía «se te ha caducado la sesión», volvía a entrar con su
 * correo, recibía otra vez lo mismo, y nunca se enteraba de por qué. Es un
 * bucle sin salida construido con un mensaje correcto para el caso equivocado.
 */
export async function sesionActual(): Promise<AgenteSesion | "SUSPENDIDO" | null> {
  const almacen = await cookies();
  const token = almacen.get(NOMBRE_COOKIE)?.value;
  if (!token) return null;

  const sesion = await db.sesionAgente.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      agente: {
        select: {
          id: true,
          emailNormalizado: true,
          nombreVisible: true,
          telegramId: true,
          estado: true,
          epocaSesion: true,
          idioma: true,
        },
      },
    },
  });

  if (!sesion || sesion.revocadaEn || sesion.expiraEn < new Date()) return null;
  // La época corta todas las sesiones del agente de una vez.
  if (sesion.epocaSesion !== sesion.agente.epocaSesion) return null;
  if (sesion.agente.estado !== "ACTIVO") return "SUSPENDIDO";

  // Renovación deslizante: se toca la fila solo cuando queda poco, para no
  // escribir en base de datos en cada petición.
  const quedaPoco =
    sesion.expiraEn.getTime() - Date.now() < DIAS_RENOVACION * 86_400_000;
  if (quedaPoco) {
    await db.sesionAgente.update({
      where: { id: sesion.id },
      data: {
        expiraEn: new Date(Date.now() + DIAS_SESION * 86_400_000),
        ultimoUsoEn: new Date(),
      },
    });
  }

  return {
    agenteId: sesion.agente.id,
    emailNormalizado: sesion.agente.emailNormalizado,
    nombreVisible: sesion.agente.nombreVisible,
    telegramId: sesion.agente.telegramId,
    // La columna es TEXT y admite cualquier cosa; `idiomaGuardado` es el mismo
    // filtro que ya usa el bot para leerla.
    idioma: idiomaGuardado(sesion.agente.idioma),
  };
}

/** Revoca de golpe todas las sesiones del agente. */
export async function revocarSesiones(agenteId: string): Promise<void> {
  await db.agente.update({
    where: { id: agenteId },
    data: { epocaSesion: { increment: 1 } },
  });
}

/**
 * Verifica el `initData` de la petición y devuelve el usuario de Telegram.
 *
 * Es el suelo de confianza de toda la API: sin esto, cualquiera podría llamar a
 * los endpoints declarando el `telegramId` que quisiera. La cookie de sesión
 * identifica al agente, pero el `initData` prueba que la petición sale de
 * Telegram de verdad.
 */
export function telegramDeLaPeticion(peticion: Request): UsuarioTelegram | null {
  const initData = peticion.headers.get("x-telegram-init-data");
  const tokenBot = process.env["TELEGRAM_BOT_TOKEN"];
  if (!initData || !tokenBot) return null;
  try {
    return validarInitData(initData, tokenBot).usuario;
  } catch {
    return null;
  }
}

export function opcionesCookie() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // La Mini App se sirve dentro de un iframe de Telegram: con `lax` la cookie
    // no viajaría y el agente parecería desconectado en cada carga.
    sameSite: "none" as const,
    path: "/",
    maxAge: DIAS_SESION * 86_400,
  };
}
