/**
 * Validación del `initData` de Telegram.
 *
 * Telegram entrega a la Mini App una cadena firmada con los datos del usuario.
 * Es la única prueba de identidad que tenemos, y **no basta con leer el
 * `user.id` que manda el cliente**: cualquiera puede abrir la URL de la Mini App
 * fuera de Telegram y enviar el id que quiera. Sin verificar la firma, suplantar
 * a otro agente sería tan fácil como cambiar un número en la petición.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export interface UsuarioTelegram {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface InitDataValido {
  usuario: UsuarioTelegram;
  authDate: Date;
  /** Parámetro `start_param`: lo usamos para colar el código de activación. */
  startParam: string | null;
}

export class ErrorInitData extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorInitData";
  }
}

/**
 * Ventana de frescura. Telegram no invalida el initData por su cuenta, así que
 * sin este límite una cadena capturada valdría para siempre.
 */
export const MAX_ANTIGUEDAD_SEGUNDOS = 24 * 60 * 60;

/**
 * Verifica la firma HMAC y devuelve los datos del usuario.
 *
 * El algoritmo lo fija Telegram: la clave se deriva del token del bot con la
 * cadena literal "WebAppData", y el resumen se calcula sobre los pares
 * `clave=valor` ordenados alfabéticamente y unidos por saltos de línea.
 */
export function validarInitData(
  initData: string,
  tokenBot: string,
  opciones: { ahora?: () => number; maxAntiguedadSegundos?: number } = {},
): InitDataValido {
  if (!tokenBot) throw new ErrorInitData("falta el token del bot");
  if (!initData) throw new ErrorInitData("initData vacío");

  const params = new URLSearchParams(initData);
  const hashRecibido = params.get("hash");
  if (!hashRecibido) throw new ErrorInitData("initData sin firma");

  params.delete("hash");
  // `signature` no forma parte del cálculo del hash HMAC clásico.
  params.delete("signature");

  const cadena = [...params.entries()]
    .map(([k, v]) => [k, v] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const claveSecreta = createHmac("sha256", "WebAppData").update(tokenBot).digest();
  const calculado = createHmac("sha256", claveSecreta).update(cadena).digest("hex");

  // Comparación en tiempo constante: una comparación normal filtra el hash
  // byte a byte por el tiempo de respuesta.
  const a = Buffer.from(calculado, "hex");
  const b = Buffer.from(hashRecibido, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new ErrorInitData("firma de initData inválida");
  }

  const authDateRaw = params.get("auth_date");
  if (!authDateRaw) throw new ErrorInitData("initData sin auth_date");
  const authDateSegundos = Number(authDateRaw);
  if (!Number.isFinite(authDateSegundos)) throw new ErrorInitData("auth_date inválido");

  const ahora = (opciones.ahora ?? Date.now)();
  const antiguedad = ahora / 1000 - authDateSegundos;
  const maximo = opciones.maxAntiguedadSegundos ?? MAX_ANTIGUEDAD_SEGUNDOS;
  if (antiguedad > maximo) {
    throw new ErrorInitData("initData caducado");
  }
  // Un auth_date en el futuro señala reloj manipulado; se admite un minuto de deriva.
  if (antiguedad < -60) {
    throw new ErrorInitData("auth_date en el futuro");
  }

  const usuarioRaw = params.get("user");
  if (!usuarioRaw) throw new ErrorInitData("initData sin usuario");

  let usuario: UsuarioTelegram;
  try {
    usuario = JSON.parse(usuarioRaw) as UsuarioTelegram;
  } catch {
    throw new ErrorInitData("usuario de initData ilegible");
  }
  if (typeof usuario.id !== "number") throw new ErrorInitData("usuario sin id numérico");

  return {
    usuario,
    authDate: new Date(authDateSegundos * 1000),
    startParam: params.get("start_param"),
  };
}

// Los idiomas viven en `lib/idiomas.ts` porque este módulo importa `node:crypto`
// y los componentes de cliente necesitan esas constantes. Se reexportan aquí por
// comodidad para el código de servidor.
export {
  IDIOMAS,
  IDIOMAS_RTL,
  IDIOMA_POR_DEFECTO,
  esRtl,
  idiomaDesdeTelegram,
  type Idioma,
} from "../idiomas.ts";
