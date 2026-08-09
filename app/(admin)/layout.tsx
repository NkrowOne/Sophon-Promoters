import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";

import "./admin/admin.css";

/*
 * La misma cara que la Mini App, cargada aquí porque el panel tiene su propia
 * raíz y no hereda sus variables.
 *
 * `admin.css` pide `var(--fuente)` y sin esto resolvía a nada y caía a la del
 * sistema: el panel se veía de otra tipografía que la aplicación de la que es la
 * otra cara.
 */
const texto = Archivo({ subsets: ["latin"], weight: "variable", variable: "--fuente" });

/**
 * Raíz del panel, separada de la de la Mini App.
 *
 * Son dos aplicaciones con dos entornos distintos y compartían raíz por
 * comodidad, con tres consecuencias reales:
 *
 *  - El panel cargaba `telegram-web-app.js`, que fuera de Telegram no sirve
 *    para nada y en una red mala es una petición bloqueante de más.
 *  - Heredaba `maximumScale: 1`, pensado para que el pellizco no rompiera el
 *    layout fijo de la Mini App. En una pantalla de tablas y wallets, impedir
 *    el zoom es un problema de accesibilidad sin ninguna contrapartida.
 *  - El `body` se pintaba con el color de fondo de Telegram, que aquí no
 *    existe: en modo oscuro dejaba una franja blanca al rebotar el scroll.
 *
 * Los grupos de rutas —`(admin)` y `(miniapp)`— no aparecen en la URL: `/admin`
 * sigue siendo `/admin`.
 */

export const metadata: Metadata = {
  title: "Panel · Sophon Promoters",
  // Márgenes privados y wallets: esto no se indexa.
  robots: { index: false, follow: false },
  /*
   * El panel tiene su propia raíz, así que NO hereda los iconos de la Mini App:
   * se quedaba sin ninguno y la pestaña salía con el icono genérico del
   * navegador. Es la pestaña que el Operador tiene abierta al lado de otras
   * quince mientras paga retiros, o sea justo donde una marca sirve para algo.
   *
   * Sin manifiesto ni Open Graph a propósito: esto no se instala ni se comparte.
   */
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icono.svg", type: "image/svg+xml" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RaizAdmin({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={texto.variable}>
      <body>{children}</body>
    </html>
  );
}
