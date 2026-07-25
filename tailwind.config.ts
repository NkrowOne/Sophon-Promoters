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

        // Marca: el Filón, la veta valiosa. Es el índigo del T1 llevado a su
        // expresión más brillante, no un acento decorativo traído de fuera.
        //
        // Se descartó un naranja de baliza: sobre el tema oscuro de Telegram
        // reproducía el cliché de «fondo casi negro con un único acento cálido»,
        // que aparece en cualquier interfaz generada sin mirar el tema.
        filon: "#5B4BE8",
        "filon-suave": "#8B80F0",

        // Estratos por tier. Orden fijo T1 → T2 → T3, siempre en ese sentido:
        // la posición codifica el tier igual que el color, así que la lectura
        // sobrevive a cualquier daltonismo.
        t1: "#3B4CC0", // índigo profundo: lo más valioso está más hondo
        t2: "#12796B", // verde mineral
        t3: "#A8752A", // ocre sedimentario

        verdin: "#1F8F55",
        oxido: "#C6382F",
      },
      fontFamily: {
        // Una sola familia de texto y una mono para cifras: tres familias no
        // caben en el presupuesto de una Mini App sobre datos móviles.
        sans: ["var(--fuente-texto)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--fuente-cifras)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      /* La escala es el punto de vista tipográfico: los rótulos van diminutos y
         muy abiertos, como la anotación de un registro de sondeo, y las cifras
         van enormes y muy cerradas. El contraste entre ambos —no una fuente
         llamativa— es lo que da carácter, y cuesta cero bytes de red. */
      fontSize: {
        rotulo: [
          "0.6875rem",
          { lineHeight: "1rem", letterSpacing: "0.14em", fontWeight: "600" },
        ],
        apoyo: ["0.8125rem", { lineHeight: "1.2rem" }],
        cuerpo: ["0.9375rem", { lineHeight: "1.45rem" }],
        titulo: ["1.3125rem", { lineHeight: "1.65rem", letterSpacing: "-0.015em", fontWeight: "600" }],
        cifra: ["1.75rem", { lineHeight: "2rem", letterSpacing: "-0.02em", fontWeight: "600" }],
        "cifra-mayor": [
          "3rem",
          { lineHeight: "3rem", letterSpacing: "-0.035em", fontWeight: "620" },
        ],
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
        /* La carga de la app ES el depósito de los estratos: cada banda crece
           desde cero, escalonada. Es el único momento con permiso para llamar
           la atención, y la animación cuenta la metáfora en vez de decorarla. */
        depositar: {
          from: { transform: "scaleX(0)", opacity: "0" },
          to: { transform: "scaleX(1)", opacity: "1" },
        },
        /* Barrido luminoso sobre la banda de hoy: dice «esto aún se está
           formando» sin el parpadeo de un latido, que en una app de dinero
           lee como error. */
        veta: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(400%)" },
        },
        emerger: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        depositar: "depositar 420ms cubic-bezier(.2,.8,.2,1) both",
        veta: "veta 3200ms cubic-bezier(.4,0,.6,1) infinite",
        // Vertical, nunca horizontal: el gesto de retroceso de Telegram es horizontal.
        emerger: "emerger 180ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
