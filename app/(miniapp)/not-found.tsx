import Link from "next/link";

import { Banda, Pantalla } from "@/components/Pantalla";

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
 *
 * ── ENTRA EN EL SISTEMA SIN DEJAR DE SER SERVIDOR ──
 *
 * `Pantalla` y `Banda` son componentes de cliente, y pintarlos desde uno de
 * servidor no convierte a este en cliente: lo que cruza la frontera son estos
 * tres literales ya resueltos, no el catálogo ni el puente. O sea que el
 * párrafo de arriba sigue siendo cierto y a cambio esta pantalla gana lo que
 * tienen las demás: el margen de la casa —`px-4` eran 16 px contra los 18 de
 * `--margen-pantalla`—, la junta de 1 px entre lo que se cuenta y la salida, y
 * la entrada escalonada de los estratos.
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
  return (
    <Pantalla>
      <Banda orden={0} tono={0} como="header" className="motivo-arcos pb-6">
        <h1 className="text-titulo">Esa pantalla ya no existe.</h1>
        <p className="mt-2 text-apoyo text-texto-apoyo">
          Puede que el enlace sea de una versión anterior.
        </p>
      </Banda>

      <Banda orden={1} tono={0} como="div" className="pt-6">
        <Link href="/" className="chapa pulsable text-cuerpo">
          Volver al inicio
        </Link>
      </Banda>
    </Pantalla>
  );
}
