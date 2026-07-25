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

  constructor(mensaje: string, estado: number, apoyo: string | null) {
    super(mensaje);
    this.name = "ErrorApi";
    this.estado = estado;
    this.apoyo = apoyo;
  }
}

function initData(): string {
  if (typeof window === "undefined") return "";
  return window.Telegram?.WebApp?.initData ?? "";
}

async function peticion<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const r = await fetch(ruta, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      "x-telegram-init-data": initData(),
      ...opciones.headers,
    },
    // La cookie de sesión viaja con SameSite=None dentro del iframe de Telegram.
    credentials: "include",
  });

  const cuerpo = (await r.json().catch(() => null)) as
    | (T & { error?: string; apoyo?: string })
    | null;

  if (!r.ok) {
    throw new ErrorApi(
      cuerpo?.error ?? "Algo ha fallado.",
      r.status,
      cuerpo?.apoyo ?? null,
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
