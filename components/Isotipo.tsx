/**
 * El isotipo de Sophon: la marca sin el nombre escrito.
 *
 * Se llama `Isotipo` y no `Marca` porque `Marca` ya existe en `Pantalla.tsx` y
 * es otra cosa —el icono con texto que rotula el estado de un webmaster—. Dos
 * cosas distintas con el mismo nombre en el mismo árbol es una colisión
 * esperando a confundir a alguien.
 *
 * VECTORIZADO, no incrustado. El original que llegó era un PNG de 1024 px, y
 * meter un bitmap en la interfaz habría costado un archivo aparte, una petición
 * más y bordes sucios en cuanto alguien lo viera en una pantalla de 3×. Se ha
 * medido y reconstruido con la geometría que la marca ya tenía dentro.
 *
 * **Cómo se sacó, porque el método importa para poder repetirlo.** La marca son
 * tres trazos circulares, así que no se ha calcado el contorno —eso habría dado
 * cientos de puntos de bézier— sino que se han recuperado las primitivas:
 *
 *  1. Se umbraliza el PNG al 50 % de cobertura. Con un umbral más flojo entran
 *     los píxeles medio pintados del antialias y **cada trazo sale un píxel más
 *     gordo por lado**; se vio en el cotejo como un halo sistemático.
 *  2. Se separan las tres componentes conexas.
 *  3. Para cada una se busca el centro que minimiza el grosor del anillo que la
 *     contiene. Funciona porque un arco con remate redondo cabe ENTERO en el
 *     anillo [R−w/2, R+w/2]: los remates son discos de radio w/2 centrados sobre
 *     la circunferencia media, así que no se salen de él.
 *  4. Se afinan los seis parámetros de cada forma (centro, radio, grosor y los
 *     dos ángulos) maximizando la intersección sobre unión contra **su propia
 *     componente**. Contra la imagen entera no vale: las cajas envolventes se
 *     solapan y el ajuste se va detrás de los píxeles del vecino —pasó, y hundía
 *     el encaje de los dos arcos del 98 % al 75 %—.
 *
 * Resultado: **98,3 % de IoU** contra el PNG original, con el resto repartido a
 * partes iguales entre borde que sobra y borde que falta, que es ruido de
 * antialias y no un defecto de forma. 334 bytes de trazados.
 *
 * Lo que la reconstrucción dejó a la vista, y que no se ha «corregido»: los dos
 * anillos pequeños comparten grosor (66,4 y 66,5) y el arco grande es más grueso
 * (72,6), con radio justo el doble del anillo izquierdo. Es la marca de otro y
 * se reproduce como está; regularizar esos números a proporciones redondas sería
 * rediseñarle el logotipo al cliente sin que lo haya pedido.
 *
 * **Toma la tinta de su contexto** (`currentColor`). Las dos versiones que llegaron
 * —oscura sobre amarillo y amarilla sobre blanco— son la misma forma con distinta
 * tinta, así que un solo componente las cubre las dos y es imposible que se
 * desincronice de la paleta.
 *
 * **No anima.** La gramática de movimiento de esta aplicación dice que solo se
 * mueve lo que MIDE algo —las barras de datos, la mecha del PRO—. Un logotipo no
 * mide nada, así que dibujarlo con un barrido lo pondría a hablar el idioma de
 * los datos sin serlo. Es el accesorio que se quita.
 */

/** Proporción del dibujo: 120 × 68,21. Se expone para reservar hueco sin recalcularla. */
export const PROPORCION_ISOTIPO = 120 / 68.21;

/**
 * Ancho mínimo por debajo del cual la marca deja de leerse.
 *
 * El trazo es el 10 % del ancho: a 28 px son 2,8 px reales, que es donde el
 * hueco del anillo pequeño todavía se distingue. Por debajo se empasta y lo
 * honesto es no ponerla.
 */
export const ANCHO_MINIMO_ISOTIPO = 28;

export function Isotipo({
  ancho = 120,
  titulo,
  className = "",
}: {
  /** Píxeles de ancho. El alto sale solo de la proporción. */
  ancho?: number;
  /**
   * Solo cuando la marca va SOLA y hace de identificación —la pantalla de alta—.
   * Si va acompañada del nombre escrito, es decorativa y se queda muda: un lector
   * de pantalla que dice «Sophon Sophon» es peor que uno que dice «Sophon».
   */
  titulo?: string;
  className?: string;
}) {
  return (
    <svg
      width={ancho}
      height={ancho / PROPORCION_ISOTIPO}
      viewBox="0 0 120 68.21"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      className={`shrink-0 ${className}`}
      role={titulo ? "img" : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      {/* Anillo cerrado. */}
      <circle cx="19.61" cy="46.57" r="13.56" strokeWidth="12.10" />
      {/* Arco grande, abierto abajo a la izquierda. */}
      <path d="M31.20 18.50A27.49 27.49 0 1 1 45.73 60.37" strokeWidth="13.23" />
      {/* Arco pequeño, abierto a la izquierda. */}
      <path d="M97.90 31.68A14.25 14.25 0 1 1 91.13 57.21" strokeWidth="12.12" />
    </svg>
  );
}
