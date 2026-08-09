/**
 * Lo primero que ejecuta el servidor, antes de servir una sola petición.
 *
 * Next llama a `register()` una vez por proceso. Es el único sitio desde el que
 * se puede comprobar el entorno **antes** de que llegue nadie: hacerlo en un
 * módulo suelto lo ataría a que alguien lo importara, y hacerlo en una ruta lo
 * dejaría a merced de que esa ruta se visitara.
 *
 * La comprobación va en `lib/entorno.ts`, que no importa nada de Next y por eso
 * la puede usar también `/api/salud`.
 */

export async function register(): Promise<void> {
  // `instrumentation` corre también en el runtime Edge, donde no hay
  // `process.env` completo ni `Buffer`, así que la comprobación —que mide bytes
  // en base64— solo tiene sentido en Node.
  if (process.env["NEXT_RUNTIME"] !== "nodejs") return;

  const { exigirEntorno } = await import("@/lib/entorno");
  exigirEntorno();
}
