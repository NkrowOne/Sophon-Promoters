import type { MetadataRoute } from "next";

/**
 * El manifiesto de la aplicación instalada.
 *
 * No se pone para «hacerla PWA»: se pone porque **el agente la instala**. Es una
 * herramienta de trabajo diario que se abre veinte veces al día, y en Android
 * Telegram ofrece añadirla a la pantalla de inicio. Sin manifiesto, ese icono
 * sale de lo que el navegador pueda deducir —normalmente una captura de la
 * página— y el nombre, de la etiqueta `<title>` recortada.
 *
 * `display: "standalone"` quita la barra de direcciones cuando se abre desde
 * ese icono, que es lo que hace que no parezca una página abierta por error.
 *
 * Los colores son los de la casa y no un `#ffffff` de plantilla:
 * `theme_color` tiñe la barra de estado de Android y `background_color` es lo
 * que se pinta mientras la aplicación carga, así que un blanco ahí sería un
 * destello blanco antes de cada arranque en modo oscuro. Se usa el espresso de
 * la Placa, que es la primera cosa que aparece en pantalla de todas formas.
 */

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sophon Promoters",
    // El corto es el que cabe debajo del icono: doce caracteres y a partir de
    // ahí Android recorta con puntos suspensivos.
    short_name: "Promoters",
    description: "Gestiona tus webmasters de Sophon y consulta tus ganancias.",
    start_url: "/",
    display: "standalone",
    background_color: "#482304",
    theme_color: "#482304",
    orientation: "portrait",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      /*
       * El enmascarable va aparte y con la marca más pequeña dentro.
       *
       * Android recorta el icono a la forma que tenga el lanzador —círculo,
       * gota, cuadrado redondeado— y solo garantiza el 80 % central. Declarar
       * el mismo PNG para `any` y para `maskable` es el error habitual: en un
       * lanzador circular se comería los remates de los dos arcos.
       */
      { src: "/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
