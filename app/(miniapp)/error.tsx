"use client";

import { useEffect } from "react";

import { Icono } from "@/components/Icono";
import { Banda, Pantalla } from "@/components/Pantalla";
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
 *
 * ── POR QUÉ ENTRA EN EL SISTEMA ──
 *
 * Estaba FUERA: un `<main>` propio con `px-4` —16 px— mientras el resto de la
 * aplicación respira a `--margen-pantalla`, que son 18. Dos píxeles no se ven
 * de uno en uno; se ven cuando el árbol revienta y el título aparece dos
 * píxeles a la izquierda de donde estaba el de la pantalla que se estaba
 * mirando. Ahora el armazón lo pone `Pantalla`, que es quien tiene ese margen,
 * y el contenido se reparte en dos estratos —lo que ha pasado, lo que se puede
 * hacer— separados por la junta de 1 px que separa todo lo demás de la casa.
 *
 * El par de botones estaba calcado a mano —`min-h-12`, `rounded-control`,
 * `bg-tinta` y la clase del borde—, el mismo calco que había en
 * `not-found.tsx` y en `/activar`, y por eso los tres medían distinto. Son
 * `.chapa-hueca` y `.chapa-tinta`: la forma, los 46 px y la sombra los pone el
 * sistema en un solo sitio.
 *
 * **Ninguna de las dos es amarilla, y no es un olvido.** El amarillo es la
 * acción de una aplicación que funciona, y esta es exactamente la pantalla en
 * la que no funciona: «Reintentar» no promete nada, vuelve a montar el árbol
 * que acaba de reventar. Son dos salidas, no una acción y su alternativa.
 *
 * Y el motivo es la MALLA NEUTRA, no los arcos de marca. Adornar con la
 * geometría del isotipo el estrato que confiesa el fallo es celebrarlo a
 * medias —el mismo criterio con el que `/activar` retira los arcos cuando el
 * PRO no entra—. La malla le da relieve al papel sin poner una gota de color
 * donde no hay nada que celebrar.
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
    <Pantalla>
      {/* `algoHaFallado` y su apoyo son las cadenas de fallo genérico del
          catálogo: qué ha pasado y qué hacer ahora, que es lo que pide la regla
          5 de la voz. No hay un par propio del límite de render, y no se
          inventa aquí: el catálogo es de un solo dueño y cada clave nueva son
          cinco traducciones. */}
      <Banda orden={0} tono={0} como="header" className="campo-malla campo-malla-neutro pb-6">
        {/* El icono dice «esto va mal» antes de leer nada, que es el mismo
            trabajo que hace en `Aviso` y la razón de que allí sustituyera al
            filete de 2 px. Sobre una pantalla vacía va encima del título y no
            al lado: aquí no compite con ninguna otra línea. */}
        <Icono nombre="aviso" tam={26} className="block text-peligro" />
        <h1 className="mt-3 text-titulo">{t.algoHaFallado}</h1>
        <p className="mt-2 text-apoyo text-texto-apoyo">{t.algoHaFalladoApoyo}</p>
      </Banda>

      {/* Las dos salidas, en su propio estrato.

          `min-w-0` con `flex-1`: sin él, un rótulo largo —«Torna all'inizio»—
          impone su ancho mínimo y las dos chapas dejan de medir lo mismo.

          La de tinta se lleva el acuse escrito a mano y no `.pulsable`: esa
          clase tiñe el fondo con especificidad (0,2,0) y le ganaría al campo de
          `.chapa-tinta` (0,1,0), o sea que la chapa oscura se pondría gris
          claro con su texto blanco encima durante 120 ms. Solo `transform`, y
          solo si no se ha pedido quietud. La hueca sí lo lleva: sobre fondo de
          tarjeta el velo de superficie es justo el acuse correcto. */}
      <Banda orden={1} tono={0} como="div" className="pt-6">
        <div className="flex gap-2.5">
          {/* Aquí SÍ va un ancla: esta es la frontera de error, y una recarga
              completa es justo lo que hace falta para salir de un árbol que ha
              reventado. Una navegación de cliente conservaría el estado roto. */}
          <a href="/" className="chapa-hueca pulsable min-w-0 flex-1 text-cuerpo">
            {t.volverAlInicio}
          </a>
          {/* A la derecha la que se prueba primero, que es donde cae el pulgar
              —el mismo orden que el par de `/activar`—. */}
          <button
            type="button"
            onClick={reset}
            className="chapa-tinta min-w-0 flex-1 text-cuerpo transition-transform duration-toque ease-sonda motion-safe:active:scale-[0.97]"
          >
            {t.reintentar}
          </button>
        </div>
      </Banda>
    </Pantalla>
  );
}
