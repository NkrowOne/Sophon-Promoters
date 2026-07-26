import type { Config } from "tailwindcss";

/**
 * Sistema visual «SONDA».
 *
 * La app se abre DENTRO de Telegram, así que el fondo y el color de texto los
 * pone el cliente del usuario, no nosotros: se consumen vía `--tg-theme-*` con
 * fallback estático, porque un WebView antiguo que no inyecte esas variables
 * dejaría el texto sobre transparente.
 *
 * La paleta propia se reserva para lo que sí es nuestro: los estratos por tier,
 * las acciones y el suelo del sondeo. Es UNA familia —ciruela— en tres valores,
 * más un ámbar que solo señala estado. Los tiers se distinguen además por
 * POSICIÓN fija en la banda, de modo que la lectura sobrevive a cualquier
 * daltonismo.
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
         * La rampa: UNA familia de ciruela en tres valores (hue 335-338°).
         *
         * Se llegó aquí por descarte y por medida. Los dos primeros intentos
         * fueron plantilla —un naranja de baliza, que sobre tema oscuro es el
         * «fondo casi negro con acento cálido», y un índigo-violeta, que es el
         * color por defecto de todo producto de IA—, así que se quitó el color
         * entero. Eso pasó de largo: una app de datos en gris no es sobria, es
         * ilegible de un vistazo, que es justo lo que se le pide.
         *
         * Un hue único y no tres: el argumento de `lib/devengo/motor.ts` sigue
         * siendo cierto —el agente cobra lo mismo sea cual sea el tier—, así
         * que el tier se sigue codificando por VALOR y por posición en la
         * banda. Lo que ese argumento nunca sostuvo era que la aplicación
         * entera fuese acromática.
         *
         * `tinta` es el T1 y es también la superficie de acción: `bg-tinta` en
         * los botones principales y `focus:border-tinta` en los campos. Que
         * botón y dato compartan color es deliberado —son la misma sustancia—,
         * y el par está medido: blanco sobre ciruela 13,41:1 en claro, fondo
         * sobre ciruela clara 9,17:1 en el peor caso oscuro.
         *
         * La planitud se combate además con MATERIA: la página se parte en
         * bandas con juntas de 1 px —el 90 % de los píxeles— y el Testigo tiene
         * suelo opaco y canto. Ver `globals.css`.
         */
        t1: "var(--tinta-t1)",
        t2: "var(--tinta-t2)",
        t3: "var(--tinta-t3)",
        tinta: "var(--tinta-plena)",

        // El segundo hue, y solo para estado, nunca para decorar: el ámbar del
        // corte fresco de un testigo recién extraído. Contra la ciruela tiene
        // poca diferencia de valor y ~100° de hue, así que un plazo que se
        // apaga nunca se lee como un dato. #845E09 en claro y #D7A94A en
        // oscuro, medidos también sobre la banda más profunda.
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
