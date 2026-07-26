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
        // 3:1 contra los tres estratos: es lo que WCAG 1.4.11 pide para el
        // contorno de un control, y `borde` se queda en 1,15-1,52.
        "borde-control": "var(--borde-control)",
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
        // UNA familia. Eran tres —Archivo ensanchada, Martian Mono y la del
        // sistema— y la mono sobraba: Archivo ya trae cifras tabulares. Ver la
        // nota larga en `app/(miniapp)/layout.tsx`.
        sans: ["var(--fuente)", "var(--fuente-arabe)", "system-ui", "sans-serif"],
      },
      /*
       * LA ESCALA. Ratio 1,25 desde 13, y sin un solo escalón por debajo.
       *
       * La anterior iba de 11 a 48 con 69 usos a 13 px frente a 22 a 15: la
       * aplicación entera estaba escrita en letra de nota al pie, que es lo que
       * el usuario llamó «sin cuidar en cuanto tamaño de letra».
       *
       * Ahora el suelo es 14 (`apoyo`) y el cuerpo 16 —el mínimo que iOS y
       * Android usan en sus propias listas—, y lo que era un rótulo estarcido de
       * 11 px pasa a 13 px en caja baja: sigue siendo lo más pequeño, pero es
       * legible de pie y en la calle, que es donde se usa esto.
       *
       * Los pesos hacen el trabajo que hacían las mayúsculas y el tracking. Es
       * más barato, no grita, y sobrevive a la traducción: una versalita tracada
       * en árabe no significa nada.
       */
      fontSize: {
        // Etiqueta de grupo y rótulo de dato. En CAJA BAJA: las versalitas con
        // 0,16em de tracking eran el «efecto estarcido» que había que enterrar.
        rotulo: ["0.8125rem", { lineHeight: "1.15rem", letterSpacing: "0.005em", fontWeight: "600" }],
        // Texto secundario. Sube de 13 a 14: es el escalón más usado de la app.
        apoyo: ["0.875rem", { lineHeight: "1.3rem" }],
        // Texto y filas. Sube de 15 a 16.
        cuerpo: ["1rem", { lineHeight: "1.45rem" }],
        titulo: ["1.25rem", { lineHeight: "1.6rem", letterSpacing: "-0.011em", fontWeight: "600" }],
        cifra: ["1.375rem", { lineHeight: "1.7rem", letterSpacing: "-0.02em", fontWeight: "600" }],
        // La cifra protagonista de la placa. Baja de 48 a 40: a 48 en una caja
        // de 390 px, un importe con separador de miles se comía el ancho entero.
        "cifra-mayor": [
          "2.5rem",
          { lineHeight: "2.6rem", letterSpacing: "-0.03em", fontWeight: "600" },
        ],
      },
      /*
       * LA FORMA DISTINGUE ACCIÓN DE ESTADO, y esta es la corrección central.
       *
       * El usuario rodeó con un círculo rojo una etiqueta amarilla («Nunca llegó
       * a tener PRO») pegada a un botón amarillo («DAR UN AÑO DE PRO»): dos
       * bloques del mismo color, del mismo ancho y del mismo radio, uno encima
       * del otro. La etiqueta parecía un botón porque TENÍA FORMA DE BOTÓN.
       *
       * A partir de aquí la forma es semántica y no decoración:
       *
       *   pildora (999px)  ESTADO. Nunca se pulsa. Compacta, al ancho de su
       *                    texto, con filete y tinta de apoyo.
       *   control (12px)   ACCIÓN. Se pulsa. Rectángulo de esquina blanda,
       *                    macizo, de ancho completo.
       *   panel   (16px)   Agrupación de contenido.
       *   marca   (3px)    Dato. Las barras conservan el canto casi vivo porque
       *                    una marca de dato con esquina blanda miente sobre
       *                    dónde acaba el valor.
       *
       * Los 2 px de antes eran un valor único para todo: no distinguían nada y
       * además se leían duros —«bordes afilados»—.
       */
      borderRadius: {
        marca: "3px",
        control: "12px",
        panel: "16px",
        pildora: "999px",
      },
      /*
       * Una sola fuente para la curva. Aquí había un `cubic-bezier` escrito a
       * mano que duplicaba el valor de `--curva` en `globals.css`: dos sitios
       * para el mismo reglaje, y por tanto dos sitios donde puede quedarse uno
       * viejo. Ahora apunta a la variable, que es la que manda.
       */
      transitionTimingFunction: {
        sonda: "var(--curva)",
      },
      /*
       * `emerger` se ha ido. Era un segundo fotograma de entrada —180 ms y 8 px—
       * que solo usaba `Banda` cuando le pasaban `orden`, y que se sumaba al
       * `depositar` que esa misma banda ya hereda de `.banda`: dos animaciones
       * en el mismo elemento, resueltas por el orden en que Tailwind emite las
       * clases. El retardo vive ahora en el `animationDelay` de `Banda`, sobre
       * la única animación de entrada que hay.
       */
    },
  },
  plugins: [],
};

export default config;
