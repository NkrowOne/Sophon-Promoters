/**
 * Fuerza el registro del webhook, los comandos y el botón de menú.
 *
 *   npm run bot:configurar
 *
 * **Ya no hace falta después de cada despliegue.** La aplicación lo hace sola al
 * arrancar (`lib/bot/arranque.ts`), que es donde debía estar desde el principio:
 * lanzarlo a mano desde un clon era un paso que, olvidado, dejaba el bot mudo
 * sin un solo error que mirar.
 *
 * Esto se queda como escotilla: sirve para re-registrar sin esperar a un
 * despliegue —por ejemplo tras cambiar el dominio— y para ver el motivo exacto
 * cuando Telegram rechaza algo.
 */

import { configurarBot } from "../lib/bot/configurar.ts";

const r = await configurarBot();
if (!r.ok) {
  console.error(`✗ ${r.detalle}`);
  process.exit(1);
}
console.log(`✓ ${r.detalle}`);
