import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "../db.ts";
import { esClaveDeOperador } from "../operador.ts";
import {
  abrirSesionDeOperador,
  COOKIE_ADMIN,
  COOKIE_DESDE_TELEGRAM,
  opcionesCookieAdmin,
  opcionesMarcaTelegram,
} from "./admin.ts";

/**
 * La clave del Operador escrita en un campo de correo, funcione donde funcione.
 *
 * ── POR QUÉ ESTO EXISTE COMO MÓDULO ──
 *
 * La primera versión vivía dentro de `POST /api/auth/codigo`, o sea en el campo
 * de correo de la pantalla de ACCESO. Y falló en el primer uso real por un
 * motivo que no tiene nada que ver con la criptografía: **esa no es la pantalla
 * donde el Operador ve un campo de correo.**
 *
 * En la Mini App hay dos, y quien ya tiene sesión solo ve uno:
 *
 *  - `/alta` — el correo con el que se entra. Se ve una vez, al principio.
 *  - `/activar` — el correo del webmaster que se da de alta. Es el de todos los
 *    días.
 *
 * Poner la trampilla en la primera es ponerla en la que casi nunca se abre.
 * Ahora la comprueban las dos rutas, y por eso la lógica está aquí: con una
 * copia en cada una, la próxima vez que cambie el freno o el registro cambiaría
 * en una sola y la otra se quedaría con la versión vieja. Que es exactamente el
 * defecto que este proyecto ya ha pagado tres veces.
 *
 * ── QUÉ GARANTIZA ──
 *
 * Las tres cosas que sostienen una contraseña en un formulario, en un solo sitio
 * y por tanto imposibles de perder al añadir una tercera puerta:
 *
 *  1. Hace falta `initData` firmado. Lo comprueban las dos rutas antes de llamar
 *     aquí, así que hacen falta una cuenta de Telegram Y la clave.
 *  2. Cinco intentos cada quince minutos por cuenta.
 *  3. Cada intento queda escrito, acertado o no.
 */

/**
 * Cinco intentos cada quince minutos por cuenta de Telegram.
 *
 * Una contraseña en un formulario que cualquiera puede enviar, sin freno, no es
 * un secreto: es una cuestión de tiempo.
 *
 * Se cuenta contra la AUDITORÍA y no contra una tabla nueva ni una variable en
 * memoria: la auditoría ya existe, sobrevive a un reinicio —una en memoria se
 * vacía sola y regala intentos cada vez que el proceso arranca— y de paso deja
 * el rastro que hay que poder mirar cuando alguien esté probando.
 */
const MAX_POR_TELEGRAM = 5;
const VENTANA_MINUTOS = 15;

/** La IP del que llama, para el registro. Detrás de un proxy va en la cabecera. */
export function ipDe(peticion: Request): string | null {
  return peticion.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/**
 * Lo que hay que hacer con lo que se ha escrito en un campo de correo.
 *
 *  - `null` → no era la clave. Sigue el camino normal de la ruta, que contestará
 *    lo mismo que le habría contestado a cualquiera. Nada delata la puerta.
 *  - una `NextResponse` → hay que devolverla tal cual: o se ha abierto la sesión
 *    del panel, o se ha agotado el cupo de intentos.
 *
 * Se llama SOLO cuando lo escrito no es un correo válido. Esa es la señal de
 * «esto es un intento de clave»: quien se equivoca de tecla escribiendo su
 * dirección manda algo que sigue pareciendo una dirección; quien prueba claves,
 * no. Y la clave tampoco lo parece.
 */
export async function intentoDeClaveDeOperador(
  escrito: string,
  telegramId: bigint,
  desdeIp: string | null,
): Promise<NextResponse | null> {
  const desde = new Date(Date.now() - VENTANA_MINUTOS * 60_000);
  const intentos = await db.auditoria.count({
    where: {
      accion: "admin.clave_intentada",
      actorId: String(telegramId),
      creadoEn: { gte: desde },
    },
  });

  const cortado = intentos >= MAX_POR_TELEGRAM;

  /*
   * Se escribe SIEMPRE y ANTES de comparar. Dos motivos, y los dos importan:
   *
   *  - Si solo se anotaran los fallos, el contador se reiniciaría al acertar y
   *    quien acertara una vez tendría otras cinco tiradas gratis. La primera
   *    versión contaba dentro del acierto y por tanto NO FRENABA NADA; lo cazó
   *    la prueba de extremo a extremo mandando ocho claves malas seguidas.
   *  - Si el freno fuera después de comparar, el tiempo de respuesta
   *    distinguiría «no era la clave» de «estás cortado».
   */
  await db.auditoria.create({
    data: {
      actorTipo: "OPERADOR",
      actorId: String(telegramId),
      accion: "admin.clave_intentada",
      ip: desdeIp,
      detalle: { cortado },
    },
  });

  if (cortado) {
    return NextResponse.json(
      { error: "Demasiados intentos.", apoyo: "Espera unos minutos y vuelve a probar." },
      { status: 429 },
    );
  }

  if (!esClaveDeOperador(escrito)) return null;

  const token = await abrirSesionDeOperador(telegramId, desdeIp, true);
  const almacen = await cookies();
  almacen.set(COOKIE_ADMIN, token, opcionesCookieAdmin(true));
  almacen.set(COOKIE_DESDE_TELEGRAM, "1", opcionesMarcaTelegram());

  // `paso: "operador"` es lo único que la pantalla necesita para saltar al panel.
  // Las dos rutas que llaman aquí lo devuelven tal cual, así que las dos
  // pantallas reaccionan igual con el mismo trozo de código.
  return NextResponse.json({ ok: true, paso: "operador" });
}
