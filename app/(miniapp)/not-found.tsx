import Link from "next/link";

/**
 * Ruta que no existe.
 *
 * Pasa de verdad: un enlace guardado de una versión anterior, o un correo de
 * webmaster que ya no está en el equipo. Dentro del WebView de Telegram no hay
 * barra de direcciones, así que sin esta página el agente se queda mirando el
 * 404 por defecto de Next sin ninguna manera de volver.
 *
 * **Se queda en español a sabiendas, y es la única pantalla así.**
 *
 * El idioma sale del `initData` que Telegram entrega al abrir la Mini App, y
 * `not-found` es un Server Component que Next renderiza sin ninguna petición
 * del cliente: aquí no hay `initData`, no hay contexto y no hay cabecera de la
 * que sacarlo. Las salidas posibles serían convertirla en cliente —montar el
 * puente de Telegram entero para pintar dos frases— o adivinar el idioma por
 * `Accept-Language`, que no es el idioma del agente sino el del teléfono y
 * acertaría a veces. Ninguna de las dos paga lo que cuesta en una pantalla que
 * solo se ve con un enlace roto, así que el texto se escribe en español y el
 * botón lleva al inicio, que es donde la aplicación vuelve a saber quién es.
 *
 * Los literales sí siguen el vocabulario del catálogo: «Volver al inicio» es
 * lo que dice `volverAlInicio` en las demás pantallas, y decía «Ir al inicio».
 */
export default function NoEncontrado() {
  return (
    <main className="min-h-dvh px-4 pt-16">
      <h1 className="text-titulo">Esa pantalla ya no existe.</h1>
      <p className="mt-2 text-apoyo text-texto-apoyo">
        Puede que el enlace sea de una versión anterior.
      </p>
      <Link
        href="/"
        className="pulsable mt-6 inline-flex min-h-12 items-center rounded-control bg-tinta px-5 text-cuerpo font-semibold text-fondo"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
