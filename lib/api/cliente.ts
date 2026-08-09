"use client";

/**
 * Cliente de la API desde el navegador.
 *
 * Toda petición lleva el `initData` de Telegram en cabecera. No es opcional: el
 * servidor lo exige además de la cookie, porque la cookie dice quién eres y el
 * `initData` prueba que la petición sale de Telegram de verdad.
 */

export class ErrorApi extends Error {
  readonly estado: number;
  readonly apoyo: string | null;
  /**
   * El mensaje NO viene del servidor: es un relleno nuestro y hay que traducirlo
   * al pintarlo.
   *
   * Existe porque el texto de respaldo se estaba resolviendo en el sitio
   * equivocado. Cada pantalla hacía
   * `e instanceof ErrorApi ? e : new ErrorApi(t.algoHaFallado, 0, null)` dentro
   * de un `useCallback` cuyas dependencias no incluían `t`, así que capturaba el
   * catálogo del PRIMER render. Y en el primer render el idioma es siempre el
   * de por defecto: `TelegramProvider` lo resuelve en un efecto, o sea después
   * de que los hijos hayan renderizado. Resultado: un agente inglés que se
   * queda sin cobertura —el caso más frecuente de esta rama, porque esto se usa
   * de pie en la calle— leía «Algo ha fallado.» en español. La portada era peor
   * todavía: ni siquiera pasaba por el catálogo, tenía el literal escrito.
   *
   * La regla que lo cierra: **el texto genérico se traduce al RENDERIZAR**, que
   * es el único momento en que el catálogo está garantizado fresco. Lo que sí
   * viene del servidor ya llega traducido —las rutas resuelven `cadenas(idioma)`
   * con el idioma de la sesión— y se pinta tal cual.
   */
  readonly generico: boolean;

  constructor(mensaje: string, estado: number, apoyo: string | null, generico = false) {
    super(mensaje);
    this.name = "ErrorApi";
    this.estado = estado;
    this.apoyo = apoyo;
    this.generico = generico;
  }
}

/**
 * El fallo que no trae texto: sin red, DNS caído, la petición abortada.
 *
 * `fetch` rechaza con un `TypeError`, no con un `ErrorApi`, así que esta rama no
 * es teórica: es la de quedarse sin cobertura. El mensaje va vacío a propósito
 * —lo pone quien pinta— y `estado: 0` lo distingue de cualquier respuesta HTTP.
 */
export function errorDeRed(): ErrorApi {
  return new ErrorApi("", 0, null, true);
}

function initData(): string {
  if (typeof window === "undefined") return "";
  return window.Telegram?.WebApp?.initData ?? "";
}

async function peticion<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  let r: Response;
  try {
    r = await fetch(ruta, {
      ...opciones,
      headers: {
        "Content-Type": "application/json",
        "x-telegram-init-data": initData(),
        ...opciones.headers,
      },
      // La cookie de sesión viaja con SameSite=None dentro del iframe de Telegram.
      credentials: "include",
    });
  } catch {
    /*
     * Sin red. Se convierte AQUÍ en un `ErrorApi` en vez de dejar salir el
     * `TypeError` de `fetch`.
     *
     * Antes salía crudo y cada pantalla lo envolvía por su cuenta con
     * `e instanceof ErrorApi ? e : new ErrorApi(...)`, que es donde entraba el
     * texto en español congelado del primer render. Cinco pantallas, cinco
     * copias del mismo defecto. Si el cliente devuelve siempre el mismo tipo,
     * esa envoltura deja de tener motivo para existir.
     */
    throw errorDeRed();
  }

  const cuerpo = (await r.json().catch(() => null)) as
    | (T & { error?: string; apoyo?: string })
    | null;

  if (!r.ok) {
    /*
     * Sin `error` en el cuerpo, el fallo no es de la aplicación: es un 502 del
     * proxy, un 413, una página de error de Next. Aquí había un literal en
     * español —«No se ha podido completar la operación.»— que llegaba igual a
     * los cinco idiomas. Se marca como genérico y lo traduce quien lo pinta.
     */
    const delServidor = typeof cuerpo?.error === "string" && cuerpo.error.length > 0;
    throw new ErrorApi(
      delServidor ? cuerpo.error! : "",
      r.status,
      cuerpo?.apoyo ?? null,
      !delServidor,
    );
  }
  return cuerpo as T;
}

export const api = {
  get: <T,>(ruta: string) => peticion<T>(ruta),
  post: <T,>(ruta: string, cuerpo: unknown) =>
    peticion<T>(ruta, { method: "POST", body: JSON.stringify(cuerpo) }),
};

/**
 * Clave de idempotencia para las acciones con dinero.
 *
 * Se genera **una vez por intención**, no por envío: si el agente pulsa dos
 * veces o la red reintenta, la clave es la misma y el servidor reconoce el
 * duplicado en vez de gastar otro cupo.
 */
export function nuevaIdempotencia(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/**
 * Normaliza cualquier cosa capturada en un `ErrorApi`.
 *
 * `peticion` ya lanza siempre un `ErrorApi` —incluida la caída de red—, así que
 * en la práctica esto solo devuelve lo que le llega. Existe para el caso que
 * ningún `catch` puede descartar: un fallo del propio manejador, no de la
 * petición.
 *
 * Sustituye a `e instanceof ErrorApi ? e : new ErrorApi(t.algoHaFallado, 0, null)`,
 * que estaba copiado en ocho pantallas y era el sitio por el que se colaba el
 * catálogo del primer render. La diferencia está en que aquí NO se resuelve
 * ningún texto: se marca como genérico y lo traduce quien pinta.
 */
export function aErrorApi(e: unknown): ErrorApi {
  return e instanceof ErrorApi ? e : errorDeRed();
}
