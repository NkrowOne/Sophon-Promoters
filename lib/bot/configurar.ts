/**
 * Deja el bot apuntando a esta instalación: webhook, comandos y botón de menú.
 *
 * **Esto vivía solo en `scripts/bot-configurar.ts` y había que lanzarlo a mano
 * desde un clon después de cada despliegue.** No porque Telegram lo exigiera,
 * sino porque la imagen final no copia `scripts/`. Y era el peor sitio posible
 * para un paso manual: si se te olvida, el bot no recibe NADA —Telegram entrega
 * a una URL que ya no existe, o a ninguna— y no hay ningún error que mirar,
 * porque el fallo consiste precisamente en que no llega ninguna petición.
 *
 * Todo lo que hace necesita cuatro cosas que el proceso en marcha ya tiene: el
 * token, `APP_URL`, el id del Operador y los catálogos. Así que se hace al
 * arrancar.
 *
 * `scripts/bot-configurar.ts` sigue existiendo y ahora llama aquí: sirve para
 * forzar un re-registro sin esperar a un despliegue.
 */

import { cadenas, type Cadenas } from "../i18n.ts";
import { IDIOMAS } from "../idiomas.ts";
import { idOperador } from "../operador.ts";
import { secretoWebhook } from "../secretos.ts";
import { tokenBot } from "./token.ts";

const API = process.env["TELEGRAM_API_URL"] ?? "https://api.telegram.org";

export interface ResultadoConfiguracion {
  ok: boolean;
  /** Qué se ha hecho, o por qué no se ha hecho nada. Para el log y para el guion. */
  detalle: string;
  /** Huella de lo aplicado; sirve para no repetir el trabajo en cada arranque. */
  huella?: string;
  /**
   * Los comandos de gestión no han podido registrarse porque el Operador aún no
   * le ha escrito al bot.
   *
   * Quien llama NO debe guardar la huella en este caso: si la guardara, daría la
   * configuración por completa y no volvería a intentarlo nunca, ni siquiera
   * después de que el Operador escriba `/start`.
   */
  operadorPendiente?: boolean;
}

/**
 * Los comandos, con su descripción sacada del CATÁLOGO.
 *
 * Había una tabla escrita a mano con siete comandos por cinco idiomas, fuera de
 * todo control de tipos, y ya se había desincronizado: decía «Cartera y
 * retiros» donde la pantalla dice «Saldo», y «Red» donde ahora dice «Mi
 * equipo». Un menú que nombra las secciones de otra manera que las propias
 * secciones obliga al agente a traducir dos vocabularios.
 *
 * El ORDEN es el de la jornada —captar, la red, el dinero, el histórico—, que
 * es el orden en que Telegram pinta el menú «/».
 *
 * Los NOMBRES de comando no se traducen: son las rutas de la Mini App, y un
 * `/rete` italiano obligaría al bot a conocer cinco alfabetos para abrir la
 * misma pantalla.
 */
const COMANDOS = [
  { command: "start", descripcion: (t: Cadenas) => t.inicio },
  { command: "activar", descripcion: (t: Cadenas) => t.activarWebmaster },
  { command: "red", descripcion: (t: Cadenas) => t.red },
  { command: "cartera", descripcion: (t: Cadenas) => t.cartera },
  { command: "historico", descripcion: (t: Cadenas) => t.historico },
  { command: "pro", descripcion: (t: Cadenas) => t.colaRenovaciones },
  { command: "ayuda", descripcion: (t: Cadenas) => t.botCadaComando.replace(/:$/, "") },
] as const;

const COMANDOS_OPERADOR = [
  { command: "start", description: "Menú" },
  { command: "codigo", description: "Generar un código de activación" },
  { command: "agentes", description: "Agentes dados de alta" },
  { command: "retiros", description: "Retiros pendientes de pagar" },
  { command: "diagnostico", description: "Por qué no verifica el acceso" },
  { command: "correo", description: "Probar el servidor de correo" },
  { command: "ayuda", description: "Comandos disponibles" },
];

async function llamar(token: string, metodo: string, cuerpo: unknown): Promise<void> {
  const r = await fetch(`${API}/bot${token}/${metodo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
    // Sin tope, un Telegram lento dejaría el arranque colgado indefinidamente.
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await r.json()) as { ok: boolean; description?: string };
  if (!json.ok) throw new Error(`${metodo}: ${json.description ?? "error desconocido"}`);
}

/**
 * Huella de lo que se va a registrar.
 *
 * Sirve para no gastar nueve llamadas a Telegram en cada reinicio del
 * contenedor. Cubre la URL, el id del Operador y las descripciones de los
 * comandos en los cinco idiomas, que es todo lo que puede cambiar entre dos
 * despliegues; si cambia una sola cadena del catálogo, la huella cambia y se
 * vuelve a registrar.
 */
export function huellaConfiguracion(url: string): string {
  const descripciones = IDIOMAS.map((i) => {
    const t = cadenas(i);
    return COMANDOS.map((c) => `${c.command}=${c.descripcion(t)}`).join("|");
  }).join("||");
  return `${url}::${idOperador() ?? "sin-operador"}::${descripciones}`;
}

/**
 * Registra webhook, comandos y botón de menú.
 *
 * No lanza: devuelve el resultado. Quien la llama al arrancar no puede permitir
 * que un Telegram caído tumbe el servidor, y el guion manual quiere el motivo
 * exacto para enseñarlo.
 */
export async function configurarBot(): Promise<ResultadoConfiguracion> {
  const token = tokenBot();
  if (!token) return { ok: false, detalle: "sin TELEGRAM_BOT_TOKEN" };

  const url = (process.env["APP_URL"] ?? "").trim().replace(/\/+$/, "");
  if (!url) return { ok: false, detalle: "sin APP_URL" };

  /*
   * HTTPS o nada.
   *
   * Telegram rechaza el webhook sobre http, y un botón `web_app` con una URL no
   * segura hace que la API descarte el MENSAJE ENTERO. Configurar a medias
   * dejaría un bot que falla más tarde y sin explicación, así que en desarrollo
   * —donde `APP_URL` suele ser localhost— no se toca nada y se dice por qué.
   */
  if (!url.startsWith("https://")) {
    return { ok: false, detalle: `APP_URL no es HTTPS (${url}); Telegram lo rechazaría` };
  }

  const secreto = secretoWebhook();
  if (!secreto) return { ok: false, detalle: "sin secreto de webhook" };

  await llamar(token, "setWebhook", {
    url: `${url}/api/bot`,
    secret_token: secreto,
    // Solo `message`: el bot no atiende ningún `callback_query` —sus botones son
    // `web_app`, que no los generan—, y pedir un tipo de evento que nadie trata
    // es invitar a que un día llegue y se pierda en silencio.
    allowed_updates: ["message"],
    // A `false` a propósito: si el servicio estuvo caído, lo encolado son
    // mensajes de agentes que sí quieren respuesta.
    drop_pending_updates: false,
  });

  /*
   * Telegram elige la lista de comandos por el `language_code` del cliente y cae
   * a la que no lleva idioma cuando ninguna encaja, así que el español se
   * registra DOS veces: una sin `language_code`, como respaldo universal, y otra
   * como `es`.
   */
  for (const idioma of IDIOMAS) {
    const t = cadenas(idioma);
    const commands = COMANDOS.map((c) => ({ command: c.command, description: c.descripcion(t) }));
    if (idioma === "es") {
      await llamar(token, "setMyCommands", { commands, scope: { type: "all_private_chats" } });
    }
    await llamar(token, "setMyCommands", {
      commands,
      scope: { type: "all_private_chats" },
      language_code: idioma,
    });
  }

  /*
   * Los comandos de gestión, solo en el chat del Operador: un agente no debería
   * ni ver en el menú lo que no puede usar.
   *
   * ── ESTO NO PUEDE SER FATAL, Y LO FUE ──
   *
   * Telegram responde `Bad Request: chat not found` cuando todavía no existe
   * conversación entre el bot y esa cuenta, y esa conversación solo nace cuando
   * el Operador le escribe `/start` una vez. O sea: en un despliegue nuevo esta
   * llamada falla SIEMPRE, porque el bot acaba de existir.
   *
   * Y al fallar se llevaba por delante el resto: la excepción salía de
   * `configurarBot` y el botón de menú —que va justo detrás— no llegaba a
   * registrarse nunca. El webhook y los comandos de los cinco idiomas sí habían
   * quedado puestos, así que el bot funcionaba a medias sin que el log dijera
   * qué parte había entrado y cuál no.
   *
   * Ahora se intenta, se anota si no ha podido ser, y se sigue. Quien lea el log
   * se encuentra con lo único que hay que hacer —escribirle `/start` al bot— en
   * vez de con una traza.
   */
  const operador = idOperador();
  let operadorPendiente = false;
  if (operador) {
    try {
      await llamar(token, "setMyCommands", {
        commands: COMANDOS_OPERADOR,
        scope: { type: "chat", chat_id: Number(operador) },
      });
    } catch (e) {
      operadorPendiente = true;
      console.warn(
        `[bot] los comandos de gestión quedan pendientes (${e instanceof Error ? e.message : e}). ` +
          "Escríbele /start al bot desde la cuenta del Operador y se registrarán al siguiente arranque.",
      );
    }
  }

  // «Panel» y no el nombre del producto: dentro de Telegram el nombre del bot ya
  // está encima de este botón.
  await llamar(token, "setChatMenuButton", {
    menu_button: { type: "web_app", text: "Panel", web_app: { url } },
  });

  const pendiente = !operador
    ? " · sin comandos de gestión: falta el id del Operador"
    : operadorPendiente
      ? " · comandos de gestión PENDIENTES: escríbele /start al bot desde la cuenta del Operador"
      : "";

  return {
    ok: true,
    detalle: `bot apuntando a ${url}/api/bot${pendiente}`,
    huella: huellaConfiguracion(url),
    operadorPendiente,
  };
}
