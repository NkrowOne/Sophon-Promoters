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
  /**
   * Con cuál de las dos formas del resumen ha cuadrado la firma. Ver
   * `CANDIDATOS` más abajo: existe para poder saberlo desde producción.
   */
  variante: Variante;
}

/** Qué se deja fuera del resumen además de `hash`. */
export type Variante = "con-signature" | "sin-signature";

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
 * Descompone el `initData` en pares SIN pasar por `URLSearchParams`.
 *
 * La diferencia no es de estilo. `URLSearchParams` implementa el formato de los
 * formularios HTML (`application/x-www-form-urlencoded`), y ese formato dice que
 * un `+` es un ESPACIO. El `initData` no es un formulario: Telegram lo compone
 * con `encodeURIComponent`, que codifica el espacio como `%20` y deja el `+`
 * como carácter literal. O sea que cualquier valor con un `+` dentro —el nombre
 * de un usuario, un `photo_url`— llegaba al resumen convertido en un espacio, y
 * la firma no cuadraba jamás para esa persona en concreto.
 *
 * Es exactamente lo que hace el ejemplo de la documentación de Telegram, que
 * usa `unquote` y no el analizador de consultas.
 */
function pares(initData: string): Array<[string, string]> {
  return initData
    .split("&")
    .filter((t) => t.length > 0)
    .map((trozo) => {
      const corte = trozo.indexOf("=");
      const clave = corte === -1 ? trozo : trozo.slice(0, corte);
      const valor = corte === -1 ? "" : trozo.slice(corte + 1);
      try {
        return [decodeURIComponent(clave), decodeURIComponent(valor)] as [string, string];
      } catch {
        // Porcentaje mal formado: se deja crudo en vez de tumbar la validación.
        // La firma no cuadrará, que es la respuesta correcta a una cadena rota.
        return [clave, valor] as [string, string];
      }
    });
}

function resumen(pares: Array<[string, string]>, tokenBot: string): string {
  const cadena = [...pares]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const claveSecreta = createHmac("sha256", "WebAppData").update(tokenBot).digest();
  return createHmac("sha256", claveSecreta).update(cadena).digest("hex");
}

/**
 * Las dos formas del resumen, y por qué se prueban las dos.
 *
 * ── EL FALLO QUE ARREGLA ──
 *
 * En producción, con Telegram Desktop 9.6, el `initData` traía cinco campos:
 * `auth_date, hash, query_id, signature, user`. Nosotros quitábamos `hash` **y
 * `signature`** antes de calcular el resumen, y la firma no cuadraba nunca: toda
 * la Mini App respondía «Telegram no ha verificado tu acceso» mientras el bot
 * contestaba con normalidad —lo que demostraba que el token era el correcto—.
 *
 * `signature` lo añadió la Bot API 8.0 y es una firma Ed25519 pensada para que
 * un TERCERO pueda validar los datos sin conocer el token. La documentación la
 * describe como «una firma de todos los parámetros recibidos, excepto `hash`»,
 * y ahí está la respuesta: si `signature` cubre todo menos `hash`, se calcula
 * ANTES que `hash`, y por tanto `hash` —que cubre todo menos `hash`— la incluye.
 * Quitarla era el error.
 *
 * ── POR QUÉ SE PRUEBAN LAS DOS Y NO SOLO LA BUENA ──
 *
 * Porque no se puede comprobar sin un token real y un cliente real, y quedarse
 * con una sola sería cambiar un fallo silencioso por otro: los clientes
 * antiguos no mandan `signature` en absoluto, y no sabemos si algún cliente la
 * manda y la excluye. Aceptar cualquiera de las dos cubre a todos.
 *
 * **No debilita nada.** Las dos son el mismo HMAC con el mismo token del bot:
 * para falsificar cualquiera de ellas hace falta el token, que es justo lo que
 * no tiene un atacante. Lo único que se amplía es el conjunto de clientes que
 * entran, no el de quien puede firmar.
 *
 * Se devuelve cuál ha cuadrado para poder mirarlo en `/diagnostico` y en el
 * registro: si dentro de un tiempo resulta que solo se usa una, se quita la otra
 * con un dato delante en vez de con una suposición.
 */
const CANDIDATOS: ReadonlyArray<{ variante: Variante; fuera: readonly string[] }> = [
  { variante: "con-signature", fuera: ["hash"] },
  { variante: "sin-signature", fuera: ["hash", "signature"] },
];

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

  const todos = pares(initData);
  const hashRecibido = todos.find(([k]) => k === "hash")?.[1];
  if (!hashRecibido) throw new ErrorInitData("initData sin firma");

  // Comparación en tiempo constante: una comparación normal filtra el hash
  // byte a byte por el tiempo de respuesta.
  const esperado = Buffer.from(hashRecibido, "hex");
  const cuadra = (calculado: string): boolean => {
    const mio = Buffer.from(calculado, "hex");
    return mio.length === esperado.length && timingSafeEqual(mio, esperado);
  };

  /*
   * Se prueban SIEMPRE las dos, sin cortocircuito.
   *
   * Un `find` pararía en la primera que cuadra, y entonces el tiempo de
   * respuesta diría cuál ha sido. Es una fuga minúscula —solo distingue dos
   * formas del mismo cálculo— pero evitarla cuesta un HMAC sobre cinco campos,
   * que no se nota en ningún sitio.
   */
  let variante: Variante | null = null;
  for (const c of CANDIDATOS) {
    const ok = cuadra(resumen(todos.filter(([k]) => !c.fuera.includes(k)), tokenBot));
    if (ok && variante === null) variante = c.variante;
  }
  if (variante === null) throw new ErrorInitData("firma de initData inválida");

  const leer = (clave: string): string | null =>
    todos.find(([k]) => k === clave)?.[1] ?? null;

  const authDateRaw = leer("auth_date");
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

  const usuarioRaw = leer("user");
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
    startParam: leer("start_param"),
    variante,
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
