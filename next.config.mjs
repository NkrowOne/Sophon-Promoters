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
      ],
    },
  ],
};

export default nextConfig;
