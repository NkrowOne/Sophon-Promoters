/**
 * El Testigo: la columna de sondeo que da identidad a toda la app.
 *
 * Cada día es una banda apilada; su longitud es la RAÍZ CUADRADA del ingreso,
 * no el ingreso. Con escala lineal, un día de 12 $ aplasta visualmente treinta
 * días de 0,40 $ y el agente pierde la textura de su propia constancia, que es
 * justo lo que tiene que ver. La raíz comprime el pico sin borrar el fondo.
 *
 * El relleno se parte por tier en orden FIJO T1 · T2 · T3, siempre en el mismo
 * sentido: la posición codifica el tier igual que el color, así que la lectura
 * sobrevive a cualquier daltonismo. T3 lleva además un punteado.
 *
 * Tres refinamientos que hacen que se lea como material y no como gráfico:
 *
 *  - Las bandas se DEPOSITAN escalonadas al cargar, de la más reciente a la más
 *    antigua. La carga es la metáfora, no un adorno.
 *  - Las bandas antiguas pierden saturación: la profundidad se ve, no se lee.
 *  - El día abierto lleva una veta luminosa que recorre la banda, en lugar de
 *    parpadear: en una interfaz de dinero, un parpadeo lee como error.
 *
 * Es SVG puro, sin librería de gráficos: el presupuesto de una Mini App sobre
 * datos móviles no da para importar una.
 */

import { formatearMicros, raizEntera } from "@/lib/devengo/dinero";

export interface DiaTestigo {
  fecha: string;
  /** Ingreso del agente ese día, en micros. */
  importeMicros: bigint;
  registrosT1: number;
  registrosT2: number;
  registrosT3: number;
  /** Un día abierto todavía puede cambiar: lleva la veta. */
  provisional?: boolean;
  /** Marcas de actividad incrustadas en la columna. */
  activaciones?: number;
  concesiones?: number;
  /** Primer día de su mes: cierra estrato con una junta. */
  abreMes?: boolean;
}

interface Props {
  dias: readonly DiaTestigo[];
  /** 44 px en las pantallas de lectura, 8 px en las de tarea. */
  ancho?: number;
  alturaBanda?: number;
  /** El raíl no captura eventos para no competir con el gesto de retroceso. */
  interactivo?: boolean;
  /** Desactiva el escalonado cuando el Testigo se usa en una lista larga. */
  animar?: boolean;
  etiquetaAccesible?: string;
}

const LONGITUD_MINIMA = 3;
/** Tope del escalonado: más allá, la carga se percibiría lenta. */
const MAX_RETARDO_MS = 520;

export function Testigo({
  dias,
  ancho = 44,
  alturaBanda = 18,
  interactivo = false,
  animar = true,
  etiquetaAccesible,
}: Props) {
  const alto = Math.max(dias.length * alturaBanda, alturaBanda);

  // La escala se normaliza contra el día más alto de la serie visible.
  const raices = dias.map((d) => raizEntera(d.importeMicros));
  const maxRaiz = raices.reduce((a, b) => (b > a ? b : a), 1n);
  const utilizable = Math.max(ancho - 4, LONGITUD_MINIMA);

  const total = dias.reduce((a, d) => a + d.importeMicros, 0n);
  const resumen =
    etiquetaAccesible ??
    `Registro de sondeo: ${dias.length} días, ${formatearMicros(total)} en total.`;

  return (
    <svg
      className={interactivo ? "" : "testigo-rail"}
      width={ancho}
      height={alto}
      viewBox={`0 0 ${ancho} ${alto}`}
      role="img"
      aria-label={resumen}
      preserveAspectRatio="none"
    >
      <title>{resumen}</title>
      <defs>
        <pattern id="punteadoT3" width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" className="fill-t3" />
          <circle cx="1.5" cy="1.5" r="0.5" fill="#00000038" />
        </pattern>
        {/* La veta: un degradado que recorre la banda del día abierto. */}
        <linearGradient id="veta" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="recorteTestigo">
          <rect x="0" y="0" width={ancho} height={alto} />
        </clipPath>
      </defs>

      <g clipPath="url(#recorteTestigo)">
        {dias.map((dia, i) => {
          const y = i * alturaBanda;
          const raiz = raices[i] ?? 0n;
          const longitud =
            raiz === 0n
              ? 0
              : Math.max(LONGITUD_MINIMA, Number((raiz * BigInt(utilizable)) / maxRaiz));

          const tiers = dia.registrosT1 + dia.registrosT2 + dia.registrosT3;
          // Sin tiers clasificados, la banda va monocroma en color de marca.
          const anchoT1 = tiers ? (longitud * dia.registrosT1) / tiers : 0;
          const anchoT2 = tiers ? (longitud * dia.registrosT2) / tiers : 0;
          const anchoT3 = tiers ? longitud - anchoT1 - anchoT2 : 0;

          /*
           * Los estratos van a OPACIDAD PLENA. Aquí había un desvanecido por
           * antigüedad —`max(0.68, 1 - i * 0.022)`— y se ha quitado porque no
           * era viable, no porque no gustara.
           *
           * Medido, componiendo el estrato sobre `--carril`: con esa curva el
           * T3 cae por debajo de 3:1 a partir del **día 7** y se queda en
           * 2,32:1 (claro) y 2,20:1 (oscuro) desde el día 15. Es decir, 23 de
           * los 30 días del raíl tenían su estrato mayor por debajo del suelo
           * de legibilidad, en el elemento que sale en todas las pantallas.
           *
           * Y no se arregla subiendo el suelo: para que el T3 aguantara 3:1 la
           * alfa mínima es 0,89 en claro y 0,98 en oscuro. A 0,98 no hay
           * desvanecido que ver. O se ve el degradado o se ve el dato.
           *
           * No se pierde nada: la antigüedad ya está codificada por la POSICIÓN
           * —arriba hoy, abajo el pasado— y el día abierto se distingue por su
           * veta, no por ser el más opaco. El desvanecido era el accesorio.
           */
          const estilo = animar
            ? {
                animationDelay: `${Math.min(i * 40, MAX_RETARDO_MS)}ms`,
                transformOrigin: "left center",
              }
            : undefined;

          return (
            <g key={dia.fecha} className={animar ? "animate-depositar" : undefined} style={estilo}>
              {tiers === 0 ? (
                <rect x="0" y={y} width={longitud} height={alturaBanda - 1} className="fill-t2" />
              ) : (
                <>
                  <rect x="0" y={y} width={anchoT1} height={alturaBanda - 1} className="fill-t1" />
                  <rect x={anchoT1} y={y} width={anchoT2} height={alturaBanda - 1} className="fill-t2" />
                  <rect
                    x={anchoT1 + anchoT2}
                    y={y}
                    width={anchoT3}
                    height={alturaBanda - 1}
                    fill="url(#punteadoT3)"
                  />
                </>
              )}

              {/* Junta de cierre de mes: da sensación de estratigrafía real. */}
              {dia.abreMes && i > 0 && (
                <rect x="0" y={y - 1} width={ancho} height="2" className="fill-borde" />
              )}

              {/* Hito: una activación deja una línea que cruza el testigo. */}
              {(dia.activaciones ?? 0) > 0 && (
                <line x1="0" y1={y} x2={ancho} y2={y} className="stroke-vivo" strokeWidth="2" />
              )}
              {/* Hito: una concesión PRO deja una muesca en el borde derecho. */}
              {(dia.concesiones ?? 0) > 0 && (
                <rect x={ancho - 4} y={y + 2} width="4" height={alturaBanda - 5} className="fill-vivo" />
              )}
            </g>
          );
        })}

        {/* Cabeza de sonda: la veta recorre solo el día que sigue abierto. */}
        {dias[0]?.provisional && (
          <g className="cabeza-sonda">
            <rect
              x="0"
              y="0"
              width={ancho}
              height={alturaBanda * 2}
              fill="url(#veta)"
              className="animate-veta"
              style={{ mixBlendMode: "overlay" }}
            />
          </g>
        )}
      </g>
    </svg>
  );
}

/**
 * Estado vacío del Testigo: una columna hueca con la retícula de profundidad
 * marcada y la cabeza de sonda en la superficie. Literalmente: aún no has perforado.
 */
export function TestigoVacio({ ancho = 44, alto = 240 }: { ancho?: number; alto?: number }) {
  const marcas = Math.floor(alto / 24);
  return (
    <svg
      className="testigo-rail"
      width={ancho}
      height={alto}
      viewBox={`0 0 ${ancho} ${alto}`}
      role="img"
      aria-label="Todavía no hay actividad registrada."
    >
      <title>Todavía no hay actividad registrada.</title>
      <rect x="0" y="0" width={ancho} height={alto} className="fill-superficie" />
      {Array.from({ length: marcas }, (_, i) => (
        <line
          key={i}
          x1="0"
          y1={i * 24}
          x2={ancho / 3}
          y2={i * 24}
          className="stroke-borde"
          strokeWidth="1"
        />
      ))}
      <rect x="0" y="0" width={ancho} height="3" className="fill-vivo" />
    </svg>
  );
}
