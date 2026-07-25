import type { Config } from "tailwindcss";

/**
 * Sistema visual «SONDA».
 *
 * La app se abre DENTRO de Telegram, así que el fondo y el color de texto los
 * pone el cliente del usuario, no nosotros: se consumen vía `--tg-theme-*` con
 * fallback estático, porque un WebView antiguo que no inyecte esas variables
 * dejaría el texto sobre transparente.
 *
 * La paleta propia se reserva para lo que sí es nuestro: los estratos por tier
 * y la marca de sondeo. Los tres tiers usan colores de sedimento —índigo, verde
 * mineral y ocre— y además se distinguen por POSICIÓN fija en la banda, de modo
 * que la lectura sobrevive a cualquier daltonismo.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Superficies: heredadas de Telegram, con fallback claro.
        fondo: "var(--tg-theme-bg-color, #ffffff)",
        "fondo-secundario": "var(--tg-theme-secondary-bg-color, #f2f3f5)",
        texto: "var(--tg-theme-text-color, #10151a)",
        "texto-apoyo": "var(--tg-theme-hint-color, #6b7681)",
        enlace: "var(--tg-theme-link-color, #2a7ec4)",

        // Superficies derivadas, con respaldo estático (ver globals.css).
        superficie: "var(--superficie)",
        "superficie-alta": "var(--superficie-alta)",
        borde: "var(--borde)",

        // Marca: la cabeza de sonda. Naranja de baliza topográfica.
        fosforo: "#FF5C38",
        "fosforo-suave": "#FF8A6B",

        // Estratos por tier. Orden fijo T1 → T2 → T3, siempre en ese sentido.
        t1: "#3A48B0",
        t2: "#0E8F7E",
        t3: "#C9862B",

        verdin: "#2F9E5B",
        alerta: "#D6453C",
      },
      fontFamily: {
        // Una sola familia de texto y una mono para cifras: tres familias no
        // caben en el presupuesto de una Mini App sobre datos móviles.
        sans: ["var(--fuente-texto)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--fuente-cifras)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        rotulo: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.08em", fontWeight: "600" }],
        apoyo: ["0.8125rem", { lineHeight: "1.15rem" }],
        cuerpo: ["0.9375rem", { lineHeight: "1.4rem" }],
        titulo: ["1.25rem", { lineHeight: "1.6rem", fontWeight: "600" }],
        cifra: ["1.75rem", { lineHeight: "2rem", fontWeight: "600" }],
        "cifra-mayor": ["2.75rem", { lineHeight: "2.9rem", fontWeight: "650" }],
      },
      spacing: {
        // Anchos del Testigo: colapsa en las pantallas de tarea para devolver ancho.
        testigo: "44px",
        "testigo-min": "8px",
      },
      borderRadius: {
        pieza: "14px",
      },
      transitionTimingFunction: {
        sonda: "cubic-bezier(.2,.8,.2,1)",
      },
      keyframes: {
        // Solo late la banda de hoy: distingue devengado de consolidado.
        latido: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        emerger: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        latido: "latido 2400ms ease-in-out infinite",
        // Vertical, nunca horizontal: el gesto de retroceso de Telegram es horizontal.
        emerger: "emerger 180ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
