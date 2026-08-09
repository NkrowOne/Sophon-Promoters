/**
 * Registra el webhook del bot, su lista de comandos y el botón de menú.
 *
 * Se ejecuta a mano después de cada despliegue en el que cambie `APP_URL`:
 *
 *   npm run bot:configurar
 *
 * Telegram exige HTTPS para el webhook y para los botones de Mini App, así que
 * el script se niega a configurar nada sobre http en vez de dejar un bot medio
 * puesto que falla más tarde y sin explicación.
 *
 * `drop_pending_updates` va deliberadamente a `false`: si el servicio estuvo
 * caído, las actualizaciones encoladas son mensajes de agentes que sí quieren
 * respuesta.
 */

import { cadenas, type Cadenas } from "../lib/i18n.ts";
import { IDIOMAS } from "../lib/idiomas.ts";

const API = "https://api.telegram.org";

const token = process.env["TELEGRAM_BOT_TOKEN"];
const secreto = process.env["TELEGRAM_WEBHOOK_SECRET"];
const url = (process.env["APP_URL"] ?? "").replace(/\/+$/, "");

function exigir(valor: string | undefined, nombre: string): string {
  if (!valor) {
    console.error(`Falta ${nombre}. Definido en .env.example.`);
    process.exit(1);
  }
  return valor;
}

async function llamar(metodo: string, cuerpo: unknown): Promise<void> {
  const r = await fetch(`${API}/bot${token}/${metodo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const json = (await r.json()) as { ok: boolean; description?: string };
  if (!json.ok) {
    console.error(`✗ ${metodo}: ${json.description ?? "error desconocido"}`);
    process.exit(1);
  }
  console.log(`✓ ${metodo}`);
}

async function principal(): Promise<void> {
  exigir(token, "TELEGRAM_BOT_TOKEN");
  exigir(secreto, "TELEGRAM_WEBHOOK_SECRET");
  exigir(url, "APP_URL");

  if (!url.startsWith("https://")) {
    console.error(`APP_URL tiene que ser HTTPS. Telegram rechaza ${url}.`);
    process.exit(1);
  }

  await llamar("setWebhook", {
    url: `${url}/api/bot`,
    secret_token: secreto,
    // Solo `message`: el bot no registra ningún `callback_query` —sus botones
    // son `web_app`, que no generan callbacks—, y pedir un tipo de evento que
    // nadie atiende es invitar a que un día llegue y se pierda en silencio.
    allowed_updates: ["message"],
    drop_pending_updates: false,
  });

  // Un comando por sección: es lo que hace que el menú «/» de Telegram sea un
  // índice de la aplicación y no una sola puerta.
  //
  // Y en los cinco idiomas. Telegram elige la lista por el `language_code` del
  // cliente y cae a la que no lleva idioma cuando no hay ninguna que encaje, así
  // que el español se registra dos veces: una sin `language_code` —el respaldo
  // para todos los demás idiomas— y otra como `es`.
  //
  // Los NOMBRES de comando no se traducen: son las rutas de la Mini App, y un
  // `/rete` italiano obligaría a que el bot conociera cinco alfabetos de
  // comandos para abrir la misma pantalla.
  // El ORDEN importa: Telegram pinta el menú «/» en el orden en que se envía, y
  // ese menú es lo primero que ve un agente al escribir una barra. `pro` estaba
  // el tercero, por delante de `red`, y ahí decía que renovar es más habitual
  // que mirar la red. Baja al final —sigue registrado, sigue funcionando— y el
  // orden pasa a ser el de la jornada: captar, la red, el dinero, el histórico.
  //
  // Las descripciones salen del CATÁLOGO, no de una tabla escrita aquí. Había
  // una constante con siete comandos por cinco idiomas a mano, fuera de todo
  // control de tipos, y ya se había desincronizado de la aplicación: decía
  // «Cartera y retiros» donde la pantalla dice «Saldo» y «Red» donde ahora dice
  // «Mi equipo» —«red» se reserva para la cadena de blockchain—. Un menú que
  // nombra las secciones de otra manera que las propias secciones obliga al
  // agente a traducir dos vocabularios.
  //
  // Leyéndolo de `cadenas()`, añadir un idioma o cambiar un rótulo es un sitio
  // en vez de dos, y el compilador exige que la clave exista en los cinco.
  const COMANDOS = [
    // `/start` abre el menú entero, que es la portada: el catálogo no tiene una
    // cadena «Menú» y `inicio` es la que nombra ese destino en la aplicación.
    { command: "start", descripcion: (t: Cadenas) => t.inicio },
    { command: "activar", descripcion: (t: Cadenas) => t.activarWebmaster },
    { command: "red", descripcion: (t: Cadenas) => t.red },
    { command: "cartera", descripcion: (t: Cadenas) => t.cartera },
    { command: "historico", descripcion: (t: Cadenas) => t.historico },
    { command: "pro", descripcion: (t: Cadenas) => t.colaRenovaciones },
    // Tampoco hay una cadena «Comandos disponibles». `botCadaComando` es la
    // frase con la que el propio `/ayuda` se presenta —«Cada comando abre una
    // pantalla:»— y se le quita el dos puntos, que ahí encabeza una lista y en
    // un menú de Telegram quedaría colgando.
    { command: "ayuda", descripcion: (t: Cadenas) => t.botCadaComando.replace(/:$/, "") },
  ] as const;

  for (const idioma of IDIOMAS) {
    const t = cadenas(idioma);
    const commands = COMANDOS.map((c) => ({
      command: c.command,
      description: c.descripcion(t),
    }));
    if (idioma === "es") {
      await llamar("setMyCommands", { commands, scope: { type: "all_private_chats" } });
    }
    await llamar("setMyCommands", {
      commands,
      scope: { type: "all_private_chats" },
      language_code: idioma,
    });
  }

  // Comandos de gestión, solo en el chat del Operador: un agente no debería
  // ni ver en el menú lo que no puede usar.
  const Operador = process.env["TELEGRAM_OPERADOR_ID"];
  if (Operador) {
    await llamar("setMyCommands", {
      commands: [
        { command: "start", description: "Menú" },
        { command: "codigo", description: "Generar un código de activación" },
        { command: "agentes", description: "Agentes dados de alta" },
        { command: "retiros", description: "Retiros pendientes de pagar" },
        { command: "ayuda", description: "Comandos disponibles" },
      ],
      scope: { type: "chat", chat_id: Number(Operador) },
    });
  } else {
    console.warn("· sin TELEGRAM_OPERADOR_ID: no se registran los comandos de gestión");
  }

  // «Panel» y no el nombre del producto: es el botón que abre la Mini App desde
  // el chat, y dentro de Telegram el nombre del bot ya está encima. Se queda sin
  // localizar como estaba —es el único literal así del fichero—, pero al menos
  // no cambia de significado.
  await llamar("setChatMenuButton", {
    menu_button: { type: "web_app", text: "Panel", web_app: { url } },
  });

  console.log(`\nBot apuntando a ${url}/api/bot`);
}

await principal();
