import type { Config } from "tailwindcss";

/**
 * Sistema visual «LA PLACA».
 *
 * La app se abre DENTRO de Telegram, así que el fondo y el color de texto los
 * pone el cliente del usuario, no nosotros: se consumen vía `--tg-theme-*` con
 * fallback estático, porque un WebView antiguo que no inyecte esas variables
 * dejaría el texto sobre transparente.
 *
 * Lo nuestro son los dos colores de Sophon y nada más:
 *
 *   AMARILLO  #F9D027  campo macizo con tinta oscura. Acción e identidad.
 *   MARRÓN    hue 55°  rampa de tres valores. Datos.
 *
 * El amarillo NUNCA es tinta: 1,49:1 sobre blanco. Ese hecho medido es lo que
 * decide el sistema entero —campo, no acento— y de paso lo que hace que el par
 * campo/tinta valga igual en las dos polaridades.
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
        // NO es el hint de Telegram: aquel es un gris azulado que sobre este
        // papel cálido da 4,17:1 —por debajo del umbral de texto— y era lo que
        // dejaba frío cada rótulo de la aplicación. Ver `globals.css`.
        "texto-apoyo": "var(--tinta-apoyo)",
        enlace: "var(--tg-theme-link-color, #2a7ec4)",

        // Superficies derivadas, con respaldo estático (ver globals.css).
        superficie: "var(--superficie)",
        "superficie-alta": "var(--superficie-alta)",
        borde: "var(--borde)",
        junta: "var(--junta)",

        /*
         * EL CAMPO. El amarillo de Sophon, y el único color que no cambia entre
         * claro y oscuro: el campo lleva su propio contraste (12,43:1 con su
         * tinta), así que no necesita variante por polaridad.
         *
         * Regla de uso, no estilo: todo lo que el agente tiene que HACER o
         * SABER va sobre campo. Nada más es amarillo. Por eso `--vivo`
         * desapareció —«esto exige acción» y «esto es la marca» son lo mismo y
         * no necesitaban dos colores— y el sistema bajó de cuatro colores
         * semánticos a tres.
         */
        campo: "var(--campo)",
        "campo-tinta": "var(--campo-tinta)",

        /*
         * LA RAMPA: marrón, hue 55°, croma 0,070. El otro color de Sophon.
         *
         * Se llegó aquí por descarte y por medida. Naranja de baliza e
         * índigo-violeta eran plantilla; el gris no era sobrio sino ilegible de
         * un vistazo; la ciruela se vio y se llamó «lila». El error repetido
         * fue elegir el segundo color por criterio estético en vez de tomarlo
         * de la marca: Sophon es amarillo y marrón, y no había nada que elegir.
         *
         * Un hue único y no tres, porque los tiers son ORDINALES —T1 paga
         * 0,30 $, T2 0,25, T3 0,20—, así que se ordenan por valor. Va además
         * por posición fija en la banda: la lectura no depende del color.
         *
         * `tinta` es el T1 y es la tinta de datos. La acción NO comparte color
         * con el dato: para eso está el campo.
         */
        t1: "var(--tinta-t1)",
        t2: "var(--tinta-t2)",
        t3: "var(--tinta-t3)",
        tinta: "var(--tinta-plena)",

        // El rojo de error lo pone el CLIENTE del usuario, no nosotros: es el
        // que él reconoce como error en su propio Telegram.
        peligro: "var(--peligro)",
      },
      fontFamily: {
        // El texto corrido va en la del sistema por una razón, no por ahorro:
        // la Mini App vive dentro de Telegram, cuyo cromo usa esa misma cara.
        // Igualarla hace que se sienta nativa en vez de una web incrustada.
        sans: ["system-ui", "-apple-system", "sans-serif"],
        rotulo: ["var(--fuente-rotulo)", "system-ui", "sans-serif"],
        mono: ["var(--fuente-cifras)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      /* LA INVERSIÓN: la cara de display se usa a 11 px y la mono a 48.
         Los rótulos quedan como letras estarcidas de señalización y las cifras
         como la lectura de un instrumento —que es literalmente lo que son—.
         Ese contraste, y no una serif llamativa, es lo que da carácter. */
      fontSize: {
        rotulo: [
          "0.6875rem",
          { lineHeight: "1rem", letterSpacing: "0.16em", fontWeight: "600" },
        ],
        apoyo: ["0.8125rem", { lineHeight: "1.2rem" }],
        cuerpo: ["0.9375rem", { lineHeight: "1.45rem" }],
        titulo: ["1.3125rem", { lineHeight: "1.65rem", letterSpacing: "-0.01em", fontWeight: "600" }],
        cifra: ["1.75rem", { lineHeight: "2rem", letterSpacing: "-0.03em", fontWeight: "600" }],
        // 3rem en Martian Mono estrechada: la cifra de la placa.
        "cifra-mayor": [
          "3rem",
          { lineHeight: "3.1rem", letterSpacing: "-0.045em", fontWeight: "600" },
        ],
      },
      borderRadius: {
        // 2 px, no 14. Un radio grande y blando es la firma de «app moderna»
        // genérica; uno mínimo y constante lee como chapa troquelada. Cero
        // habría caído en el otro extremo, el de la maqueta tipo periódico.
        pieza: "2px",
      },
      transitionTimingFunction: {
        sonda: "cubic-bezier(.2,.8,.2,1)",
      },
      keyframes: {
        emerger: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        // Vertical, nunca horizontal: el gesto de retroceso de Telegram es horizontal.
        emerger: "emerger 180ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
