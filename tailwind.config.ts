import type { Config } from "tailwindcss";

/**
 * Sistema visual «LA PLACA».
 *
 * Dos colores, y cada uno hace UN trabajo:
 *
 *   AMARILLO  #F9D027  la ACCIÓN. Solo lo que se pulsa y las marcas de urgencia.
 *   MARRÓN    hue 55°  todo lo demás: la placa de cabecera y la rampa de datos.
 *
 * Esa división es la corrección de un defecto concreto. La versión anterior
 * ponía la cabecera y el botón del mismo amarillo bajo la regla «todo lo que hay
 * que hacer o saber va sobre campo», y el resultado fue *«ese amarillo se
 * camufla con los botones»*: dos trabajos distintos con una sola apariencia. Con
 * el amarillo restringido a lo pulsable no hay nada con lo que camuflarse.
 *
 * El amarillo NUNCA es tinta: 1,49:1 sobre blanco. Ese hecho medido es lo que
 * decide el sistema entero —campo, no acento— y de paso lo que hace que el par
 * campo/tinta valga igual en las dos polaridades.
 *
 * Los fondos y la tinta de texto **son nuestros**, no de `--tg-theme-*`. Se
 * derivaban del tema del cliente hasta que se midió que mezclar su azul-negro
 * con el amarillo de marca aterriza en verde oliva. El puente le pasa nuestros
 * colores al cliente con `setBackgroundColor`, así que el cromo de Telegram
 * sigue a la app y no al revés.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Los tres estratos de papel, elegidos por polaridad (ver globals.css).
        fondo: "var(--fondo)",
        superficie: "var(--superficie)",
        "superficie-alta": "var(--superficie-alta)",
        borde: "var(--borde)",
        junta: "var(--junta)",

        texto: "var(--texto)",
        // NO es el hint de Telegram: aquel es un gris azulado que sobre este
        // papel cálido da 4,17:1 —por debajo del umbral de texto— y era lo que
        // dejaba frío cada rótulo de la aplicación. Ver `globals.css`.
        "texto-apoyo": "var(--tinta-apoyo)",
        enlace: "var(--tg-theme-link-color, #2a7ec4)",

        /*
         * LA PLACA: espresso. Es la cabecera, y es marrón y no amarilla porque
         * la cabecera y el botón no pueden compartir apariencia —era el defecto
         * de la versión anterior—. Lo más oscuro informa, lo más brillante se
         * pulsa: la jerarquía se lee sin leer nada.
         */
        placa: "var(--placa)",
        "placa-tinta": "var(--placa-tinta)",

        /*
         * EL CAMPO. El amarillo de Sophon, y el único color que no cambia entre
         * claro y oscuro: el campo lleva su propio contraste (12,43:1 con su
         * tinta), así que no necesita variante por polaridad.
         *
         * Regla de uso, no estilo: **el amarillo es la ACCIÓN**. El botón
         * principal, la fila que exige actuar y las marcas de urgencia; nada
         * más. Por eso `--vivo` desapareció —«esto exige acción» y «esto es la
         * marca» son lo mismo y no necesitaban dos colores— y el sistema bajó de
         * cuatro colores semánticos a tres.
         */
        campo: "var(--campo)",
        "campo-tinta": "var(--campo-tinta)",
        "campo-canto": "var(--campo-canto)",

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
         * `tinta` YA NO es el T1. Eran el mismo valor, y eso ataba la tinta de
         * los controles —chip de red seleccionada, filetes, anillo de foco— al
         * escalón más oscuro de la rampa de datos: bajar la rampa a marrón de
         * verdad arrastraba los controles con ella. Separarlos es lo que
         * permitió mover una cosa sin mover la otra.
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
