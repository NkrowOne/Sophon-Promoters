import type { Metadata, Viewport } from "next";
import { Archivo, Martian_Mono } from "next/font/google";
import Script from "next/script";

import { AtrasDeTelegram } from "@/components/AtrasDeTelegram";
import { TelegramProvider } from "@/components/TelegramProvider";
import "./globals.css";

/*
 * Dos caras, y la inversión que las hace memorables.
 *
 * La app no tenía tipografía: tenía `system-ui`, que en Android es Roboto y en
 * iOS SF. El ajuste por defecto de todo el mundo.
 *
 * Las dos son VARIABLES y las dos traen eje de anchura (`wdth`), que es de
 * donde sale el carácter sin pagar una segunda familia:
 *
 *  - **Archivo ensanchada** para los rótulos, a 11 px: letra estarcida de señal.
 *  - **Martian Mono estrechada** para las cifras, a 20-48 px: lectura de
 *    instrumento, y tabular por diseño, que es lo que impide que una columna de
 *    importes baile al cambiar de dígito.
 *
 * La inversión es que la cara de display se usa PEQUEÑA y la mono GRANDE, al
 * revés de lo habitual. Es lo que da personalidad sin recurrir a una serif de
 * alto contraste, que es hoy el primer reflejo de plantilla.
 *
 * El texto corrido se queda en la pila del sistema, y es una decisión: la Mini
 * App vive dentro de Telegram, cuyo propio cromo va en la cara del sistema.
 * Igualarla hace que se sienta nativa en vez de una web incrustada, y cuesta
 * cero bytes de datos móviles.
 *
 * `next/font` las descarga en tiempo de BUILD y las sirve desde nuestro propio
 * origen: no hay petición a Google en ejecución. `adjustFontFallback` calcula
 * las métricas de la cara de respaldo para que no haya salto de maquetación
 * mientras cargan —importante en árabe, que no tiene subconjunto en ninguna de
 * las dos y se queda en la del sistema—.
 */
const rotulo = Archivo({
  subsets: ["latin"],
  weight: "variable",
  axes: ["wdth"],
  display: "swap",
  variable: "--fuente-rotulo",
});

const cifras = Martian_Mono({
  subsets: ["latin"],
  weight: "variable",
  axes: ["wdth"],
  display: "swap",
  variable: "--fuente-cifras",
});

export const metadata: Metadata = {
  title: "Sophon Promoters",
  description: "Gestiona tus webmasters de Sophon y consulta tus ganancias.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // La Mini App se comporta como una app: el zoom por pellizco rompe el layout fijo.
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-luz="claro" className={`${rotulo.variable} ${cifras.variable}`}>
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
