import type { Metadata, Viewport } from "next";
import { Archivo, Noto_Sans_Arabic } from "next/font/google";
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

const arabe = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: "variable",
  display: "swap",
  variable: "--fuente-arabe",
  // Solo lo descarga quien lee en árabe: precargarlo para todos sería pagar una
  // familia entera por el 1 % de las sesiones.
  preload: false,
});

export const metadata: Metadata = {
  title: "Sophon Promoters",
  description: "Gestiona tus webmasters de Sophon y consulta tus ganancias.",
  /*
   * Un solo SVG y ningún PNG.
   *
   * La marca es geometría —tres trazos circulares—, así que un vectorial de
   * 600 bytes sirve para el favicon de 16 px, para el icono de la pantalla de
   * inicio de iOS y para cualquier densidad futura, sin generar el juego de
   * ocho PNG que normalmente acompaña a esto. Es la ventaja concreta de haber
   * vectorizado en vez de incrustar el bitmap que llegó.
   */
  icons: {
    icon: "/icono.svg",
    apple: "/icono.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /*
   * SIN `maximumScale`. Estaba en 1 «porque la Mini App se comporta como una
   * app», y eso bloquea el zoom por pellizco.
   *
   * Quien usa esto es un comercial de cuarenta y tantos mirando importes de pie
   * en la calle, a veces a pleno sol. Impedirle acercar la pantalla es quitarle
   * la última salida que le queda cuando algo no se lee, y no compra nada: el
   * layout es fluido y ya se verifica a 360 px. Es la infracción de WCAG 1.4.4
   * más fácil de cometer y la más fácil de arreglar.
   */
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-luz="claro" className={`${texto.variable} ${arabe.variable}`}>
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
