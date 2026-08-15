/**
 * Lo primero que ejecuta el servidor, antes de servir una sola petición.
 *
 * Next llama a `register()` una vez por proceso. Es el único sitio desde el que
 * se puede preparar la instalación **antes** de que llegue nadie: hacerlo en un
 * módulo suelto lo ataría a que alguien lo importara, y hacerlo en una ruta lo
 * dejaría a merced de que esa ruta se visitara.
 *
 * Aquí pasan tres cosas, y ninguna puede impedir que la aplicación sirva:
 *
 *  1. **Se comprueba el entorno** (`lib/entorno.ts`). Esta sí corta: sin lo
 *     esencial, arrancar solo serviría para fallar más tarde y peor.
 *  2. **Se configura el bot** —webhook, comandos y botón de menú—. Era un guion
 *     que había que lanzar a mano desde un clon después de cada despliegue, y
 *     olvidarlo dejaba el bot mudo sin un solo error que mirar.
 *  3. **Se arranca el planificador** de los barridos, que antes era un cron
 *     externo con su propio secreto compartido.
 *
 * Las dos últimas van en segundo plano y se tragan sus fallos: quedarse sin bot
 * configurado es un problema, y no arrancar por ello es un problema mayor.
 */

export async function register(): Promise<void> {
  // `instrumentation` corre también en el runtime Edge, donde no hay
  // `process.env` completo, ni `Buffer`, ni Prisma. Todo esto es de Node.
  if (process.env["NEXT_RUNTIME"] !== "nodejs") return;

  const { exigirEntorno } = await import("@/lib/entorno");
  exigirEntorno();

  const { configurarBotAlArrancar } = await import("@/lib/bot/arranque");
  configurarBotAlArrancar();

  const { arrancarPlanificador } = await import("@/lib/sync/planificador");
  arrancarPlanificador();
}
