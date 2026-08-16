/**
 * Deja el bot configurado al arrancar, y solo cuando hace falta.
 *
 * Tres reglas, y las tres existen para que esto no pueda estorbar:
 *
 *  1. **No bloquea el arranque.** Se dispara y se olvida. Si Telegram tarda
 *     veinte segundos, el servidor ya está atendiendo peticiones mientras tanto.
 *  2. **No tumba el proceso.** Todo va en `try/catch`: quedarse sin configurar
 *     el bot es un problema, y no arrancar la aplicación entera por ello es un
 *     problema mayor.
 *  3. **No repite trabajo.** Se guarda una huella de lo aplicado en
 *     `Configuracion` y se salta si coincide, así un reinicio del contenedor no
 *     gasta nueve llamadas a la API. La huella se escribe SOLO al terminar bien,
 *     de modo que un intento fallido —el dominio todavía sin certificado en el
 *     primer despliegue, por ejemplo— se reintenta en el arranque siguiente en
 *     vez de darse por hecho.
 */

import { db } from "../db.ts";
import { configurarBot, huellaConfiguracion } from "./configurar.ts";
import { idBot } from "./token.ts";

const CLAVE = "bot.configuracion";

async function aplicar(): Promise<void> {
  /*
   * QUÉ bot es este, en todos los arranques.
   *
   * El id de delante de los dos puntos del token es el identificador de Telegram
   * del propio bot y es público —sale en cualquier enlace `t.me`—, así que se
   * puede registrar sin exponer nada. Sirve para lo único que no se podía
   * comprobar desde fuera: que el token del panel de despliegue sea el del bot
   * al que le estás escribiendo, y no el de otro que tuvieras a mano. Con dos
   * tokens distintos el bot responde igual y la Mini App no autentica ni una
   * petición, porque la firma la hace Telegram con el del bot que la abrió.
   *
   * Va aquí y no dentro de `configurarBot` porque eso se salta cuando la huella
   * coincide, o sea en todos los reinicios menos el primero.
   */
  console.info(`[bot] token del bot ${idBot() ?? "(sin forma reconocible)"}`);

  const url = (process.env["APP_URL"] ?? "").trim().replace(/\/+$/, "");
  if (!url.startsWith("https://")) {
    // En desarrollo es lo normal y no merece un aviso alarmante.
    console.info("[bot] sin configurar: APP_URL no es HTTPS");
    return;
  }

  const esperada = huellaConfiguracion(url);
  const guardada = await db.configuracion.findUnique({ where: { clave: CLAVE } });
  if (guardada?.valor === esperada) {
    console.info("[bot] ya configurado para esta URL y estos comandos");
    return;
  }

  const r = await configurarBot();
  if (!r.ok) {
    console.error(`[bot] no se ha podido configurar: ${r.detalle}`);
    return;
  }

  /*
   * La huella NO se guarda si quedan comandos de gestión pendientes.
   *
   * Guardarla daría la configuración por completa y no se volvería a intentar
   * jamás, ni siquiera después de que el Operador le escriba `/start` al bot.
   * Al dejarla sin escribir, el siguiente arranque reintenta —nueve llamadas a
   * Telegram, una vez— y a partir de ahí se salta como cualquier otro reinicio.
   */
  if (r.operadorPendiente) {
    console.warn(`[bot] configurado a medias: ${r.detalle}`);
    return;
  }

  await db.configuracion.upsert({
    where: { clave: CLAVE },
    create: { clave: CLAVE, valor: r.huella ?? esperada },
    update: { valor: r.huella ?? esperada },
  });
  console.info(`[bot] configurado: ${r.detalle}`);
}

/** Lanza la configuración en segundo plano. Nunca lanza ni espera. */
export function configurarBotAlArrancar(): void {
  void aplicar().catch((e) => {
    // Se reintenta solo en el arranque siguiente: la huella no se ha escrito.
    console.error("[bot] fallo configurando el bot; se reintentará al arrancar de nuevo", e);
  });
}
