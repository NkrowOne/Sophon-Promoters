"use client";

import { useEffect } from "react";

import { useCadenas } from "@/components/TelegramProvider";

/**
 * Límite de error de la Mini App.
 *
 * Sin esto, un fallo de render en cualquier pantalla dejaba la pantalla en
 * blanco dentro del WebView de Telegram, sin barra de direcciones, sin botón
 * de recargar y sin ninguna forma de salir salvo cerrar la aplicación entera.
 *
 * No se enseña el mensaje del error: al agente no le sirve y puede contener
 * detalles internos. Se enseña lo único que puede hacer.
 *
 * Los cuatro literales estaban escritos a mano en español. Era la única
 * pantalla del grupo que no hablaba el idioma del agente, y justo la que se ve
 * en el peor momento: un agente árabe se encontraba la aplicación rota en un
 * idioma que no lee. Es Client Component, así que el hook del catálogo sirve
 * igual que en cualquier otra pantalla; los dos botones reutilizan
 * `reintentar` y `volverAlInicio`, que ya existen.
 */
export default function ErrorMiniApp({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useCadenas();

  useEffect(() => {
    console.error("[miniapp] error de render", error);
  }, [error]);

  return (
    <main className="min-h-dvh px-4 pt-16">
      {/* `algoHaFallado` y su apoyo son las cadenas de fallo genérico del
          catálogo: qué ha pasado y qué hacer ahora, que es lo que pide la regla
          5 de la voz. No hay un par propio del límite de render, y no se
          inventa aquí: el catálogo es de un solo dueño y cada clave nueva son
          cinco traducciones. */}
      <h1 className="text-titulo">{t.algoHaFallado}</h1>
      <p className="mt-2 text-apoyo text-texto-apoyo">{t.algoHaFalladoApoyo}</p>
      <div className="mt-6 flex gap-2.5">
        <button
          type="button"
          onClick={reset}
          className="pulsable flex min-h-12 flex-1 items-center justify-center rounded-control bg-tinta text-cuerpo font-semibold text-fondo"
        >
          {t.reintentar}
        </button>
        <a
          href="/"
          className="flex min-h-12 flex-1 items-center justify-center rounded-control border border-borde-control text-cuerpo font-medium"
        >
          {t.volverAlInicio}
        </a>
      </div>
    </main>
  );
}
