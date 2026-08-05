/** @type {import('next').NextConfig} */
const nextConfig = {
  // Salida autocontenida: Skyway despliega la imagen Docker y no instala dependencias.
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // La Mini App se sirve DENTRO de Telegram: negar el framing la rompería.
        { key: "Content-Security-Policy", value: "frame-ancestors https://web.telegram.org https://*.telegram.org" },
        /*
         * HSTS. Telegram solo abre Mini Apps por HTTPS, así que aquí no se
         * pierde nada por declarar que este dominio no se sirve de otra
         * manera, y se gana cerrar la primera petición —la que un `http://`
         * tecleado a mano deja viajar en claro antes de la redirección—.
         *
         * Sin `preload` y sin `includeSubDomains`: los dos son decisiones que
         * afectan a TODO el dominio y a subdominios que este proyecto no
         * conoce, y `preload` además es prácticamente irreversible. Ponerlos
         * desde la configuración de una aplicación es decidir por el resto de
         * la organización.
         *
         * Un navegador lo ignora sobre HTTP, así que en local no molesta.
         */
        { key: "Strict-Transport-Security", value: "max-age=31536000" },
        /*
         * Nada de esto se usa, así que se apaga.
         *
         * No protege de un fallo propio: protege de un tercero. Si algún día
         * entra un guion de análisis o un widget incrustado, no podrá pedir la
         * cámara ni la ubicación en una aplicación que solo enseña cifras. Es
         * la clase de permiso que nadie recuerda revisar después.
         */
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
        },
      ],
    },
  ],
};

export default nextConfig;
