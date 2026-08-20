import type { Metadata, Viewport } from "next";
import { Archivo, Archivo_Black, Noto_Sans_Arabic } from "next/font/google";
import Script from "next/script";

import { AtrasDeTelegram } from "@/components/AtrasDeTelegram";
import { TelegramProvider } from "@/components/TelegramProvider";
import "./globals.css";

/*
 * UNA sola cara. Eran tres, y ese era el defecto.
 *
 * La versión anterior montaba una «inversión» tipográfica: Archivo ENSANCHADA a
 * wdth 115, en versalitas y con 0,16em de tracking, para todos los rótulos a
 * 11 px; y Martian Mono ESTRECHADA para todas las cifras, hasta 44 px. La tesis
 * era que usar la cara de display pequeña y la mono grande daba personalidad.
 *
 * Daba otra cosa. Se puso el espécimen en pantalla y se miró, que es lo que no
 * se había hecho:
 *
 *  - Martian Mono es una mono de novedad. Al ser monoespaciada, la COMA de un
 *    importe ocupa una casilla entera, así que «8,88 $» se pinta con huecos
 *    enormes alrededor de la coma. En una aplicación cuyo contenido principal
 *    son importes en euros y dólares, eso es el peor sitio posible para una
 *    mono. Es literalmente lo que el usuario llamó «aberrante».
 *  - Archivo a wdth 115 en versalitas tracadas, repetida 27 veces por pantalla,
 *    convierte cada rótulo en un cartel de señalización.
 *
 * Y la mono NO hacía falta: **Archivo ya trae cifras tabulares** (`tnum`,
 * verificado en el fichero). Es decir, la segunda familia estaba pagando el
 * primer pintado para dar algo que la primera ya tenía, y encima peor.
 *
 * Así que el arreglo es una RESTA: fuera Martian Mono, fuera el eje de anchura,
 * y la jerarquía pasa a hacerse con lo que siempre debió hacerla —tamaño y
 * peso—. Archivo es un grotesco con carácter propio (altura de x grande, 'g' de
 * un piso), no una neutra de catálogo, y sostiene sola desde los 13 px de una
 * etiqueta hasta los 40 de la cifra protagonista.
 *
 * **El árabe deja de caer a la del sistema.** Noto Sans Arabic cubre el bloque
 * árabe completo y también trae `tnum`, así que la versión RTL deja de ser la
 * única que se ve de otra tipografía. Va sin `preload` y se aplica solo bajo
 * `[lang="ar"]`: quien lee en español no descarga un solo byte de ella.
 *
 * `next/font` las descarga en tiempo de BUILD y las sirve desde nuestro propio
 * origen: no hay petición a Google en ejecución. `adjustFontFallback` ajusta las
 * métricas de la cara de respaldo para que no haya salto de maquetación.
 */
const texto = Archivo({
  // Solo `latin`: los cinco idiomas latinos de la aplicación —es, en, it, pt—
  // caben en él (ñ, á, ã, ç, à, ù están todos dentro). `latin-ext` añadía un
  // segundo fichero PRECARGADO de 32 kB para cubrir alfabetos que la app no
  // traduce, y el primer pintado se paga en la calle con datos móviles.
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  variable: "--fuente",
});

/**
 * LA CIFRA PROTAGONISTA: Archivo Black.
 *
 * Es el extremo pesado de la MISMA familia, no una segunda voz. Comparte
 * esqueleto y métricas con la de texto, así que la cifra que abre una pantalla
 * puede pesar el triple sin que la pantalla cambie de casa — que es exactamente
 * lo que le pasó a Martian Mono y por lo que se retiró.
 *
 * Existe porque a la portada le faltaba un protagonista: todo medía lo mismo, y
 * una pantalla donde el saldo del mes tiene el peso de una etiqueta de fila es
 * una lista, no una respuesta.
 *
 * Un solo peso —900 es el único que tiene— y un solo fichero. No lleva
 * `preload: false` porque la cifra que la usa está sobre el pliegue en la
 * primera pantalla que se abre: cargarla tarde es ver el número saltar de
 * tamaño.
 */
const display = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--fuente-display",
});

const arabe = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: "variable",
  display: "swap",
  variable: "--fuente-arabe",
  // Solo lo descarga quien lee en árabe: precargarlo para todos sería pagar una
  // familia entera por el 1 % de las sesiones.
  preload: false,
});

/**
 * La base de las URL absolutas.
 *
 * Open Graph NO admite rutas relativas: un `og:image` que diga «/og.png» lo
 * descarta Telegram, que es precisamente por donde circula el enlace de esta
 * aplicación. Con esto, Next resuelve las absolutas solo.
 *
 * Cae a `localhost` en desarrollo, donde la previsualización no se mira. En
 * producción `APP_URL` está siempre —la comprueba `lib/entorno.ts` al arrancar—
 * porque también la necesitan los enlaces que manda el bot.
 */
const base = process.env["APP_URL"]?.trim() || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: "Sophon Promoters",
  description: "Gestión de webmasters de Sophon: equipo, registros y saldo.",
  manifest: "/manifest.webmanifest",
  applicationName: "Sophon Promoters",
  /*
   * EL SVG SIGUE MANDANDO, y los PNG son los sitios donde el SVG no vale.
   *
   * Aquí ponía «un solo SVG y ningún PNG», con el argumento de que la marca es
   * geometría y un vectorial sirve para cualquier densidad. El argumento es
   * bueno y el resultado era falso en el caso que más importaba: **Safari solo
   * acepta PNG en `apple-touch-icon`**, así que el agente que añadía la Mini App
   * a su pantalla de inicio —lo normal en una herramienta de uso diario— se
   * quedaba con una captura de la página en vez de con la marca. Justo el único
   * sitio donde el logotipo tiene que estar sí o sí.
   *
   * Así que: SVG para todo lo que lo entienda, `.ico` para el `/favicon.ico`
   * que los navegadores piden a pelo aunque no se declare, y PNG para iOS y
   * para el manifiesto. Los genera `scripts/iconos.mjs` de la MISMA geometría
   * que `components/Isotipo.tsx`, así que no pueden desincronizarse a mano.
   */
  icons: {
    icon: [
      // El orden importa: el navegador se queda con el último que entienda, y
      // el vectorial es el que queremos que gane donde haya soporte.
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icono-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icono.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  /*
   * La previsualización del enlace, que en este producto no es un adorno: el
   * alta empieza con el Operador pasándole la URL al agente por Telegram, y
   * lo que ese agente ve antes de tocar nada es esta tarjeta. Sin ella salía la
   * URL desnuda, que es indistinguible de un enlace cualquiera.
   */
  openGraph: {
    type: "website",
    siteName: "Sophon Promoters",
    title: "Sophon Promoters",
    description: "Gestiona tus webmasters de Sophon y consulta tus ganancias.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Sophon" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /*
   * ZOOM BLOQUEADO, por decisión explícita del Operador.
   *
   * Aquí no había bloqueo, y el motivo estaba escrito: quien usa esto es un
   * comercial mirando importes de pie en la calle, a veces a pleno sol, y
   * quitarle el acercamiento es quitarle la última salida cuando algo no se lee.
   * Sigue siendo verdad, y sigue siendo la infracción de WCAG 1.4.4 más fácil de
   * cometer. Se hace igual porque en uso real el zoom se activaba solo y dejaba
   * la pantalla torcida, que resultó ser el problema más frecuente de los dos.
   *
   * ANTES DE LLEGAR AQUÍ se cerraron las dos causas accidentales, que es lo que
   * hace que este bloqueo sea una red de seguridad y no el único parche:
   *
   *  1. `touch-action: manipulation` en `globals.css` mata el doble toque.
   *  2. Todos los campos van a 16 px (`.campo-texto`). Por debajo de eso iOS
   *     hace zoom SOLO al enfocarlos y no lo deshace al salir; el campo de la
   *     wallet estaba a 14 px y era el sospechoso número uno.
   *
   * Si algún día se quiere devolver el acercamiento, se quitan estas dos líneas
   * y las otras dos protecciones se quedan: el zoom accidental ya no vuelve.
   */
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-luz="claro" className={`${texto.variable} ${display.variable} ${arabe.variable}`}>
      <head>
        {/* Antes de pintar: si el WebView no expone las variables de tema, los
            respaldos estáticos ya están puestos y no hay destello de texto invisible. */}
        <Script id="tema-inicial" strategy="beforeInteractive">
          {`try{var a=window.Telegram&&window.Telegram.WebApp;if(a&&a.colorScheme){document.documentElement.setAttribute('data-luz',a.colorScheme==='dark'?'oscuro':'claro')}}catch(e){}`}
        </Script>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className="bg-fondo text-texto antialiased">
        <TelegramProvider>
          <AtrasDeTelegram />
          {children}
        </TelegramProvider>
      </body>
    </html>
  );
}
