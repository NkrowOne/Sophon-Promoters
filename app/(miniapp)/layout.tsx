import type { Metadata, Viewport } from "next";
import Script from "next/script";

import { TelegramProvider } from "@/components/TelegramProvider";
import "./globals.css";

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
    <html lang="es" data-luz="claro">
      <head>
        {/* Antes de pintar: si el WebView no expone las variables de tema, los
            respaldos estáticos ya están puestos y no hay destello de texto invisible. */}
        <Script id="tema-inicial" strategy="beforeInteractive">
          {`try{var a=window.Telegram&&window.Telegram.WebApp;if(a&&a.colorScheme){document.documentElement.setAttribute('data-luz',a.colorScheme==='dark'?'oscuro':'claro')}}catch(e){}`}
        </Script>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className="bg-fondo text-texto antialiased">
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
