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
        junta: "var(--junta)",
        carril: "var(--carril)",

        /*
         * NO hay color de marca. Es una decisión, no un olvido.
         *
         * Se probaron dos y los dos eran plantilla: un naranja de baliza, que
         * sobre el tema oscuro reproducía el «fondo casi negro con un acento
         * cálido», y un índigo-violeta, que es el color por defecto de todo
         * producto de IA. Cualquier tercer tono habría sido la tercera versión
         * del mismo reflejo.
         *
         * El tier se codifica por DENSIDAD DE TINTA. Se probó darle un color a
         * cada uno y se descartó con el argumento que está escrito en
         * `lib/devengo/motor.ts`: el agente cobra lo mismo sea cual sea el
         * tier. Gastar los tres colores más fuertes en el único dato que no
         * cambia lo que hace es la definición de colorines.
         *
         * La planitud no se combate con tono sino con MATERIA: la página se
         * parte en bandas de superficie con juntas de 1 px —el 90 % de los
         * píxeles— y el Testigo gana suelo opaco y canto. Ver `globals.css`.
         */
        t1: "var(--tinta-t1)",
        t2: "var(--tinta-t2)",
        t3: "var(--tinta-t3)",
        tinta: "var(--tinta-plena)",

        // Único croma propio de toda la app, y solo para estado, nunca para
        // decorar: el ocre del corte fresco de un testigo recién extraído.
        // Se desdobla por polaridad porque el valor único estaba flojo —3,97:1
        // sobre blanco, y se usa justo en las etiquetas accionables—:
        // #8A6414 en claro (5,37:1) y #D7A94A en oscuro (7,50:1).
        vivo: "var(--vivo)",

        // El rojo de error lo pone el CLIENTE del usuario, no nosotros: es el
        // que él reconoce como error en su propio Telegram.
        peligro: "var(--peligro)",
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
        // 4 px, no 14. Un radio grande y blando es la firma de «app moderna»
        // genérica; uno pequeño y constante lee como instrumento. Cero radio
        // habría caído en el otro extremo, el de la maqueta tipo periódico.
        pieza: "4px",
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
