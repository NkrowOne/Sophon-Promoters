import { ClienteSophon } from "./cliente.ts";

/**
 * Cliente de Sophon compartido por todo el servidor.
 *
 * Es un único objeto a propósito: mantiene en memoria el token de partner y su
 * caducidad, así que todas las peticiones comparten la misma sesión de 7 días.
 * Crear uno por llamada haría un login nuevo cada vez y agotaría la paciencia
 * del rate limit de Sophon en la primera sincronización seria.
 *
 * Se guarda en `globalThis` por el recargado en caliente de Next: sin eso, cada
 * cambio de código en desarrollo dejaría el token anterior huérfano.
 */
const global_ = globalThis as unknown as { sophon?: ClienteSophon };

export function clienteSophon(): ClienteSophon {
  if (global_.sophon) return global_.sophon;

  const email = process.env["SOPHON_EMAIL"];
  const password = process.env["SOPHON_PASSWORD"];
  if (!email || !password) {
    throw new Error(
      "Faltan SOPHON_EMAIL y SOPHON_PASSWORD. Sin ellas no se puede leer nada de Sophon.",
    );
  }

  const cliente = new ClienteSophon({
    email,
    password,
    host: process.env["SOPHON_HOST"],
    // El `traceid` se registra SIEMPRE, también en las llamadas con éxito: es lo
    // único que soporte de Sophon puede rastrear, y cuando hace falta pedirlo ya
    // es tarde para empezar a guardarlo.
    registrar: (e) => {
      const base = `[sophon] ${e.metodo} ${e.ruta} code=${e.codigo ?? "-"} ${e.duracionMs}ms trace=${e.traceId ?? "-"}`;
      if (e.error) console.warn(`${base} intento=${e.intento} error=${e.error}`);
      else if (e.intento > 1) console.warn(`${base} intento=${e.intento}`);
    },
  });

  global_.sophon = cliente;
  return cliente;
}
