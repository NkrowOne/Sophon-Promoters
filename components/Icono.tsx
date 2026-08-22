/**
 * El juego de iconos.
 *
 * La aplicación no tenía ni uno. Los estados de un webmaster —bloqueado, sin
 * actividad, PRO caducado—, las cuatro filas del menú y todas las acciones eran
 * texto y nada más, así que una pantalla de seis webmasters era un muro de
 * palabras y había que LEERLA entera para encontrar el que pide algo.
 *
 * Se dibujan aquí, a mano, y no se importa una librería. No es purismo: un juego
 * propio son ~2 kB dentro del bundle que ya se sirve, mientras que cualquier
 * paquete de iconos trae mil glifos para usar quince, y además impone su acento
 * —el trazo de una librería popular se reconoce, y eso es exactamente lo que
 * hace que un producto parezca hecho con plantilla—.
 *
 * REGLAS DEL JUEGO, y son las que hacen que parezcan de la misma mano:
 *
 *  - Retícula de 24, con el dibujo dentro de 20: queda 2 de aire por lado, así
 *    que un icono junto a un texto de 16 px nunca lo toca.
 *  - Trazo de 1,75 px REALES a cualquier tamaño. Y esto había que calcularlo:
 *    con `strokeWidth` fijo dentro de un `viewBox` de 24, el grosor se escala
 *    con la caja —un icono a 15 px salía a 1,09 px de trazo y otro a 22 px a
 *    1,60—, así que el comentario que había aquí decía lo contrario de lo que
 *    hacía el código. Se compensa dividiendo por el factor de escala, que es lo
 *    que hace que quince iconos de tres tamaños distintos se lean como de la
 *    misma mano.
 *  - Sin relleno. El color entra por `currentColor`, así que un icono hereda la
 *    tinta de su contexto y no puede desincronizarse de la paleta.
 *  - Geométricos y frontales, sin perspectiva ni detalle decorativo: comparten
 *    vocabulario con las marcas de datos —barras, muescas, líneas base— que ya
 *    dibuja la aplicación.
 *
 * `aria-hidden` por defecto: casi siempre el icono acompaña a un texto que ya
 * dice lo mismo, y anunciarlo dos veces es ruido para quien usa lector. Cuando
 * el icono va SOLO, se pasa `titulo` y entonces sí se anuncia.
 */

export type NombreIcono =
  | "red"
  | "renovar"
  | "historico"
  | "cartera"
  | "activar"
  | "pro"
  | "activo"
  | "caducado"
  | "bloqueado"
  | "seBorra"
  | "desaparecido"
  | "parado"
  | "aviso"
  | "avance"
  | "atras"
  | "reintentar"
  | "copiar"
  | "ayuda"
  | "desplegar"
  | "buscar"
  | "cerrar"
  | "panel";

/**
 * Los trazados, en una retícula de 24.
 *
 * Cada uno es una sola cadena y se parte por `M` al pintar, así que un icono con
 * varios trazos sueltos no necesita varios elementos en el fuente.
 */
const TRAZOS: Record<NombreIcono, string> = {
  /*
   * El panel del Operador: una tabla. Marco, cabecera y dos renglones.
   *
   * No es un engranaje ni un escudo —los dos tópicos de «administración»— porque
   * lo que hay al otro lado no es una configuración ni un permiso: son filas que
   * se comparan. El icono dice a qué se va.
   */
  panel: "M4.4 5.6h15.2v12.8H4.4zM4.4 9.6h15.2M10 9.6v8.8",
  // Tres nodos y sus enlaces: la red del agente, que es literalmente eso.
  red: "M12 4.6a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4M5.4 15a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4m13.2 0a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4M10.5 8.9 6.9 15m10.2 0-3.6-6.1M7.6 17.2h8.8",
  // Ciclo abierto: un año que vuelve a empezar.
  renovar: "M20 12a8 8 0 1 1-2.6-5.9M20 4v4.6h-4.6",
  // Tres barras sobre una línea base: la misma marca que usa el Testigo.
  historico: "M4 20h16M7 20v-6m5 6V7m5 13v-9",
  cartera:
    "M4 8.5A2.5 2.5 0 0 1 6.5 6H18a2 2 0 0 1 2 2v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17zM4 8.5h13m-1 4.5h2.5",
  // Persona con un más: dar de alta a alguien.
  activar:
    "M15.5 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H7.4A3.4 3.4 0 0 0 4 18.4V20M9.75 11.5a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5M18.5 8v5M21 10.5h-5",
  pro: "M12 3.8 14.6 9l5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.9 9.4 9z",
  activo: "M4.5 12.4 9.4 17.5 19.5 6.8",
  // Reloj: el PRO es un plazo, y lo que se acabó es tiempo, no un permiso.
  caducado: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17M12 7.5V12l3 1.8",
  // Prohibido: esto lo decide Sophon y el agente no puede tocarlo.
  bloqueado: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17M6.2 6.2l11.6 11.6",
  seBorra:
    "M5 7.5h14M9.5 7.5V5.6c0-.6.5-1.1 1.1-1.1h2.8c.6 0 1.1.5 1.1 1.1v1.9m2.4 0-.7 11a1.6 1.6 0 0 1-1.6 1.5H9.4a1.6 1.6 0 0 1-1.6-1.5l-.7-11",
  // Enlace roto: estaba en la red y ya no aparece.
  desaparecido:
    "M10.2 13.8 6.6 17.4M13.8 10.2l3.6-3.6M4 4l16 16M9 6.2l1.4-1.4a3.7 3.7 0 0 1 5.2 5.2L14.2 11M9.8 13l-1.4 1.4a3.7 3.7 0 0 0 5.2 5.2L15 18.4",
  // Pausa: no produce, pero no está roto. Es otra cosa que «bloqueado».
  parado: "M9.5 6.5v11M14.5 6.5v11",
  aviso:
    "M12 8.5v4.2m0 3.3h.01M10.3 4.6 3 17.3A2 2 0 0 0 4.7 20.3h14.6a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0",
  // Avance de fila. Se voltea solo en árabe: ver la regla de abajo.
  avance: "M9.5 5.5 16 12l-6.5 6.5",
  atras: "M14.5 5.5 8 12l6.5 6.5",
  reintentar: "M4 12a8 8 0 1 0 2.6-5.9M4 4v4.6h4.6",
  // Círculo, interrogante y su punto. El punto es un trazo de longitud casi
  // cero con el remate redondo del `svg`: un `circle` aparte no cabe en esta
  // tabla, que es de trazados y nada más.
  ayuda:
    "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17M9.5 9.4a2.6 2.6 0 0 1 5.1.7c0 1.7-2.6 2.1-2.6 3.8M12 17.1h.01",
  // Chevron hacia ABAJO, no hacia un lado: es lo único que le permite girar
  // 180° al abrirse sin que el árabe lo mande al revés. Por eso tampoco está
  // en `DIRECCIONALES`: un chevron vertical no apunta a ninguna orilla.
  desplegar: "M6.5 9.8 12 15.3 17.5 9.8",
  // Lupa: círculo y mango. No está en `DIRECCIONALES` a propósito — una lupa
  // espejada sigue siendo una lupa, y en árabe el campo ya la coloca al otro
  // lado con una propiedad lógica.
  buscar: "M11 18.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15M16.4 16.4 20.5 20.5",
  // Aspa. Dos trazos y ninguna caja: la caja la pone el objetivo táctil de
  // 44 px del botón que lo lleva.
  cerrar: "M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5",
  copiar:
    "M9 9V6.5A1.5 1.5 0 0 1 10.5 5h7A1.5 1.5 0 0 1 19 6.5v7a1.5 1.5 0 0 1-1.5 1.5H15M6.5 9h7A1.5 1.5 0 0 1 15 10.5v7A1.5 1.5 0 0 1 13.5 19h-7A1.5 1.5 0 0 1 5 17.5v-7A1.5 1.5 0 0 1 6.5 9",
};

/**
 * Los que apuntan a algún sitio y por tanto se voltean en árabe.
 *
 * Un chevron de «siguiente» que sigue mirando a la derecha en una interfaz
 * invertida manda al usuario justo al revés. Los demás iconos NO se voltean: un
 * reloj espejado no es un reloj, y una papelera del revés tampoco significa otra
 * cosa. Es la distinción que se olvida siempre al traducir a RTL.
 */
const DIRECCIONALES = new Set<NombreIcono>(["avance", "atras", "renovar", "reintentar"]);

export function Icono({
  nombre,
  tam = 20,
  titulo,
  className = "",
}: {
  nombre: NombreIcono;
  /** Píxeles del lado. El trazo NO se reescala: ver la nota de arriba. */
  tam?: number;
  /** Solo cuando el icono va sin texto al lado; entonces deja de ser decorativo. */
  titulo?: string;
  className?: string;
}) {
  const trazos = TRAZOS[nombre]
    .split("M")
    .filter(Boolean)
    .map((d) => `M${d}`);

  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      // 1,75 px reales sea cual sea `tam`: el trazo se declara en unidades del
      // `viewBox`, así que hay que deshacer la escala de la caja a mano.
      strokeWidth={(1.75 * 24) / tam}
      strokeLinecap="round"
      strokeLinejoin="round"
      // `shrink-0` porque estos iconos viven casi siempre en un flex junto a un
      // correo largo: sin ello, el correo los aplasta hasta hacerlos ilegibles.
      className={`shrink-0 ${DIRECCIONALES.has(nombre) ? "rtl:-scale-x-100" : ""} ${className}`}
      role={titulo ? "img" : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      {trazos.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
