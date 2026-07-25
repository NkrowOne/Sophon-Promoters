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

export {};

const API = "https://api.telegram.org";

const token = process.env["TELEGRAM_BOT_TOKEN"];
const secreto = process.env["TELEGRAM_WEBHOOK_SECRET"];
const url = (process.env["APP_URL"] ?? "").replace(/\/+$/, "");

function exigir(valor: string | undefined, nombre: string): string {
  if (!valor) {
    console.error(`Falta ${nombre}. Míralo en .env.example.`);
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
  await llamar("setMyCommands", {
    commands: [
      { command: "start", description: "Menú" },
      { command: "activar", description: "Activar un webmaster" },
      { command: "pro", description: "Renovaciones de PRO" },
      { command: "red", description: "Tu red" },
      { command: "cartera", description: "Cartera y retiros" },
      { command: "historico", description: "Histórico" },
      { command: "ayuda", description: "Qué puedo hacer aquí" },
    ],
    scope: { type: "all_private_chats" },
  });

  // Comandos de gestión, solo en el chat del superadmin: un agente no debería
  // ni ver en el menú lo que no puede usar.
  const superadmin = process.env["TELEGRAM_SUPERADMIN_ID"];
  if (superadmin) {
    await llamar("setMyCommands", {
      commands: [
        { command: "start", description: "Menú" },
        { command: "codigo", description: "Generar un código de activación" },
        { command: "agentes", description: "Agentes dados de alta" },
        { command: "retiros", description: "Retiros pendientes de pagar" },
        { command: "ayuda", description: "Comandos disponibles" },
      ],
      scope: { type: "chat", chat_id: Number(superadmin) },
    });
  } else {
    console.warn("· sin TELEGRAM_SUPERADMIN_ID: no se registran los comandos de gestión");
  }

  await llamar("setChatMenuButton", {
    menu_button: { type: "web_app", text: "Panel", web_app: { url } },
  });

  console.log(`\nBot apuntando a ${url}/api/bot`);
}

await principal();
