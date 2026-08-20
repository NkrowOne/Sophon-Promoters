"use client";

import Link from "next/link";

import { Banda, Pantalla } from "@/components/Pantalla";
import { useCadenas } from "@/components/TelegramProvider";

/**
 * Ruta que no existe.
 *
 * Pasa de verdad: un enlace guardado de una versión anterior, o un correo de
 * webmaster que ya no está en el equipo. Dentro del WebView de Telegram no hay
 * barra de direcciones, así que sin esta página el agente se queda mirando el
 * 404 por defecto de Next sin ninguna manera de volver.
 *
 * ── ERA LA ÚNICA PANTALLA DEL AGENTE SIN TRADUCIR ──
 *
 * Y estaba razonado: `not-found` era un Server Component, el idioma sale del
 * `initData` que Telegram entrega al abrir la Mini App, y en el servidor no hay
 * `initData` ni contexto del que sacarlo. Las dos salidas —convertirla en
 * cliente o adivinar por `Accept-Language`— parecían caras para una pantalla
 * que solo se ve con un enlace roto.
 *
 * El precio estaba mal calculado. «Montar el puente de Telegram entero» no es
 * lo que cuesta: `TelegramProvider` ya envuelve el layout de la Mini App y el
 * catálogo ya viaja en el fragmento común, porque TODAS las demás pantallas son
 * de cliente. O sea que traer el `"use client"` aquí no añade un kilobyte al
 * paquete: solo deja de excluir esta pantalla del idioma del agente.
 *
 * Y el coste de no hacerlo sí era real: un agente árabe que abre un enlace viejo
 * se encontraba con dos frases en español, sin barra de direcciones, en la única
 * pantalla cuyo trabajo entero es explicarle qué ha pasado y devolverlo al
 * inicio.
 *
 * ── LO QUE NO CAMBIA ──
 *
 * **La salida es amarilla, y es la única chapa de la pantalla.** El amarillo es
 * la acción; aquí no hay más que una y es literalmente la única manera de salir
 * del callejón, así que la regla de una sola chapa por pantalla se cumple
 * gastándola donde más se ve. Es lo mismo que hace `Vacio` con cualquier otro
 * estado vacío, que es lo que esta pantalla es.
 *
 * Y lleva los ARCOS de marca —no la malla neutra de `error.tsx`— porque aquí no
 * se ha roto nada: el enlace es viejo y la aplicación está entera. Los dos
 * callejones se distinguen por el motivo antes de leer cuál es cuál.
 */
export default function NoEncontrado() {
  const t = useCadenas();

  return (
    <Pantalla>
      <Banda orden={0} tono={0} como="header" className="motivo-arcos pb-6">
        <h1 className="text-titulo">{t.paginaNoExiste}</h1>
        <p className="mt-2 text-apoyo text-texto-apoyo">{t.paginaNoExisteApoyo}</p>
      </Banda>

      <Banda orden={1} tono={0} como="div" className="pt-6">
        <Link href="/" className="chapa pulsable text-cuerpo">
          {t.volverAlInicio}
        </Link>
      </Banda>
    </Pantalla>
  );
}
