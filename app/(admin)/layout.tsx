import type { Metadata, Viewport } from "next";

import "./admin/admin.css";

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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RaizAdmin({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
