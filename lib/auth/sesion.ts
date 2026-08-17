/**
 * Sesiones de agente.
 *
 * El requisito es que el agente **no vuelva a entrar nunca**: la sesión dura lo
 * máximo que admite un navegador y se renueva sola con el uso. Eso obliga a
 * poder cortarla al instante si un agente se va o su cuenta se compromete, y por
 * eso existe la **época**: un contador en el agente que se copia en cada sesión
 * emitida. Incrementarlo invalida todas sus sesiones de golpe, sin recorrer ni
 * borrar filas.
 *
 * ── LAS DOS CADUCIDADES, QUE NO ERAN LA MISMA ──
 *
 * Hay dos relojes y solo se estaba tocando uno. La fila `SesionAgente` se
 * renovaba al usarla, pero **la cookie del navegador no**: se emitía con
 * `maxAge` una vez, al entrar, y a partir de ahí contaba sola. O sea que un
 * agente que entraba a diario perdía igualmente la sesión el día del tope,
 * porque el navegador borraba la cookie con la fila todavía viva al otro lado.
 *
 * Ahora deslizan los dos: `sesionActual()` reescribe la cookie cada vez que la
 * valida y renueva la fila cuando le queda poco. Mientras el agente use la app,
 * la sesión no caduca.
 */

import { cookies } from "next/headers";

import { db } from "../db.ts";
import { tokenBot } from "../bot/token.ts";
import { generarTokenSesion, hashToken } from "../cripto.ts";
import { idiomaGuardado, type Idioma } from "../idiomas.ts";
import { DIAS_SESION, NOMBRE_COOKIE, opcionesCookie } from "./cookie.ts";
import { validarInitData, type UsuarioTelegram } from "./telegram.ts";

/*
 * Reexportado, y ADEMÁS importado arriba.
 *
 * Un `export { X } from "./y.ts"` reenvía el símbolo pero no lo declara en este
 * módulo: las funciones de este fichero seguirían sin ver `DIAS_SESION`. Con el
 * import explícito arriba, se ve aquí y sale por la puerta para los ~10 sitios
 * de llamada que lo piden de este módulo desde siempre.
 */
export { DIAS_SESION, NOMBRE_COOKIE, opcionesCookie };

/**
 * Con menos de esto por delante, la fila se renueva al usarla.
 *
 * A 100 días sobre 400, un agente activo toca la base de datos por este motivo
 * como mucho tres veces al año. Escribir en cada petición sería el otro
 * extremo: una escritura por carga de pantalla para mover una fecha que a nadie
 * le importa al minuto.
 */
const DIAS_RENOVACION = 100;

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

  // Renovación deslizante de la FILA: se toca solo cuando queda poco, para no
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

  /*
   * Y renovación deslizante de la COOKIE, que es el reloj que nadie tocaba.
   *
   * La cookie se emitía una sola vez, al entrar, y a partir de ahí el navegador
   * contaba solo: el día del tope la borraba, entrara el agente a diario o una
   * vez al año. O sea que la fila seguía viva al otro lado mientras el agente
   * aparecía desconectado, y desde fuera parecía una caducidad legítima.
   *
   * Se reescribe SIEMPRE, no solo cuando queda poco, porque no se puede saber
   * cuándo queda poco: una cookie viaja sin su fecha de caducidad. Cuesta una
   * cabecera de unos 200 bytes en las respuestas de la API.
   *
   * ── POR QUÉ AQUÍ Y NO EN UN `middleware.ts` ──
   *
   * Porque el middleware corre en Edge, y en cuanto existe uno, Next compila
   * también `instrumentation.ts` para Edge —donde arranca el bot, o sea Prisma,
   * o sea `node:crypto`— y el build se cae. El guardia de runtime que ya hay
   * dentro no lo evita: webpack compila los módulos de un `import()` al
   * analizar el fichero, antes de poder descartar la rama muerta.
   *
   * Y no hace falta: esta función solo se llama desde manejadores de ruta
   * —`exigirAgente` y `/api/auth/sesion`—, y ahí `cookies()` sí es escribible.
   * El `try` es por si algún día se llama al renderizar un componente de
   * servidor, donde Next prohíbe escribir cookies: no poder alargar la sesión
   * no es motivo para tumbar la petición que se estaba sirviendo.
   */
  try {
    almacen.set(NOMBRE_COOKIE, token, opcionesCookie());
  } catch {
    // Contexto de solo lectura. La sesión sigue siendo válida.
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
 * Un motivo de rechazo, como mucho una vez por minuto.
 *
 * Sin freno, una Mini App que no autentica es un bucle: cada pantalla reintenta,
 * cada reintento escribe, y el registro se llena de la misma línea hasta tapar
 * todo lo demás. Con freno se lee igual de bien y no ahoga nada.
 *
 * A nivel de módulo porque el proceso es uno y el freno tiene que ser común a
 * todas las peticiones; el mapa tiene como mucho media docena de entradas.
 */
const ultimoAviso = new Map<string, number>();
const CADA_MS = 60_000;

function anotar(mensaje: string): void {
  const ahora = Date.now();
  const previo = ultimoAviso.get(mensaje) ?? 0;
  if (ahora - previo < CADA_MS) return;
  ultimoAviso.set(mensaje, ahora);
  console.warn(`[auth] ${mensaje}`);
}

const avisar = (motivo: string): void => anotar(`initData rechazado: ${motivo}`);

/**
 * Verifica el `initData` de la petición y devuelve el usuario de Telegram.
 *
 * Es el suelo de confianza de toda la API: sin esto, cualquiera podría llamar a
 * los endpoints declarando el `telegramId` que quisiera. La cookie de sesión
 * identifica al agente, pero el `initData` prueba que la petición sale de
 * Telegram de verdad.
 *
 * ── POR QUÉ ESCRIBE EN EL REGISTRO ──
 *
 * Este `catch` estaba vacío, y ese vacío costó una tarde. La Mini App abría, el
 * bot respondía, y toda petición moría en un 401 que decía «Telegram no ha
 * verificado tu acceso» mientras en los registros del servidor **no aparecía
 * absolutamente nada**. No había forma de distinguir desde fuera las cinco cosas
 * distintas que producen ese mismo 401: que la app se haya abierto en un
 * navegador suelto, que falte el token, que el token no case con el del bot que
 * firmó, que el `initData` haya caducado o que venga incompleto.
 *
 * Ahora cada una escribe su motivo. Lo que NO se escribe es el `initData`: lleva
 * el nombre y el id de Telegram del agente, y un registro no es sitio para eso.
 * El motivo basta, porque es justo lo que no se podía deducir.
 */
export function telegramDeLaPeticion(peticion: Request): UsuarioTelegram | null {
  const initData = peticion.headers.get("x-telegram-init-data");
  const token = tokenBot();
  if (!token) {
    avisar("falta TELEGRAM_BOT_TOKEN: no hay con qué verificar la firma");
    return null;
  }
  /*
   * Sin cabecera es el caso normal de abrir la URL fuera de Telegram, así que se
   * anota como información y no como fallo: no hay nada roto que arreglar.
   */
  if (!initData) {
    avisar("la petición no trae la cabecera x-telegram-init-data (¿abierta fuera de Telegram?)");
    return null;
  }
  try {
    const r = validarInitData(initData, token);
    /*
     * Se anota UNA VEZ con cuál de las dos formas del resumen ha cuadrado.
     *
     * `lib/auth/telegram.ts` acepta las dos —incluyendo `signature` en el HMAC y
     * excluyéndola— porque no se puede saber cuál manda cada cliente sin un
     * token y un cliente de verdad. Esta línea es la que lo averigua: cuando
     * lleve tiempo diciendo siempre lo mismo, se podrá quitar la otra con un
     * dato delante en vez de con una suposición.
     */
    anotar(`firma verificada (${r.variante})`);
    return r.usuario;
  } catch (e) {
    avisar(e instanceof Error ? e.message : "motivo desconocido");
    return null;
  }
}

