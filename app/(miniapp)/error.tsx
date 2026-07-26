"use client";

import { useEffect } from "react";

/**
 * Límite de error de la Mini App.
 *
 * Sin esto, un fallo de render en cualquier pantalla dejaba la pantalla en
 * blanco dentro del WebView de Telegram, sin barra de direcciones, sin botón
 * de recargar y sin ninguna forma de salir salvo cerrar la aplicación entera.
 *
 * No se enseña el mensaje del error: al agente no le sirve y puede contener
 * detalles internos. Se enseña lo único que puede hacer.
 */
export default function ErrorMiniApp({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[miniapp] error de render", error);
  }, [error]);

  return (
    <main className="min-h-dvh px-4 pt-16">
      <h1 className="text-titulo">Algo se ha roto.</h1>
      <p className="mt-2 text-apoyo text-texto-apoyo">
        No es culpa tuya y no se ha perdido nada de lo tuyo.
      </p>
      <div className="mt-6 flex gap-2.5">
        <button
          type="button"
          onClick={reset}
          className="pulsable flex min-h-12 flex-1 items-center justify-center rounded-control bg-tinta text-cuerpo font-semibold text-fondo"
        >
          Reintentar
        </button>
        <a
          href="/"
          className="flex min-h-12 flex-1 items-center justify-center rounded-control border border-borde-control text-cuerpo font-medium"
        >
          Ir al inicio
        </a>
      </div>
    </main>
  );
}
