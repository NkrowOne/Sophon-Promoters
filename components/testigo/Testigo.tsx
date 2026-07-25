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
 * Es SVG puro, sin librería de gráficos: el presupuesto de una Mini App sobre
 * datos móviles no da para importar una.
 */

import { formatearMicros } from "@/lib/devengo/dinero";

export interface DiaTestigo {
  fecha: string;
  /** Ingreso del agente ese día, en micros. */
  importeMicros: bigint;
  registrosT1: number;
  registrosT2: number;
  registrosT3: number;
  /** Un día abierto todavía puede cambiar: se dibuja tramado. */
  provisional?: boolean;
  /** Marcas de actividad incrustadas en la columna. */
  activaciones?: number;
  concesiones?: number;
}

interface Props {
  dias: readonly DiaTestigo[];
  /** 44 px en las pantallas de lectura, 8 px en las de tarea. */
  ancho?: number;
  alturaBanda?: number;
  /** El raíl no captura eventos para no competir con el gesto de retroceso. */
  interactivo?: boolean;
  etiquetaAccesible?: string;
}

const LONGITUD_MINIMA = 3;

/** Raíz cuadrada entera sobre bigint: el dinero nunca pasa por coma flotante. */
function raizEntera(n: bigint): bigint {
  if (n <= 0n) return 0n;
  if (n < 2n) return n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }
  return x;
}

export function Testigo({
  dias,
  ancho = 44,
  alturaBanda = 14,
  interactivo = false,
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
        {/* Trama del día abierto: devengado pero no consolidado. */}
        <pattern id="tramaProvisional" width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="currentColor" opacity="0.25" />
          <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="2" />
        </pattern>
        <pattern id="punteadoT3" width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" className="fill-t3" />
          <circle cx="1.5" cy="1.5" r="0.5" fill="#00000033" />
        </pattern>
      </defs>

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

        return (
          <g key={dia.fecha} className={dia.provisional ? "cabeza-sonda animate-latido" : undefined}>
            {tiers === 0 ? (
              <rect x="0" y={y} width={longitud} height={alturaBanda - 1} className="fill-fosforo-suave" />
            ) : (
              <>
                <rect x="0" y={y} width={anchoT1} height={alturaBanda - 1} className="fill-t1" />
                <rect x={anchoT1} y={y} width={anchoT2} height={alturaBanda - 1} className="fill-t2" />
                <rect x={anchoT1 + anchoT2} y={y} width={anchoT3} height={alturaBanda - 1} fill="url(#punteadoT3)" />
              </>
            )}

            {dia.provisional && (
              <rect
                x="0"
                y={y}
                width={longitud}
                height={alturaBanda - 1}
                fill="url(#tramaProvisional)"
                className="text-fosforo"
              />
            )}

            {/* Hito: una activación deja una línea que cruza el testigo. */}
            {(dia.activaciones ?? 0) > 0 && (
              <line x1="0" y1={y} x2={ancho} y2={y} className="stroke-fosforo" strokeWidth="2" />
            )}
            {/* Hito: una concesión PRO deja una muesca en el borde derecho. */}
            {(dia.concesiones ?? 0) > 0 && (
              <rect x={ancho - 4} y={y + 2} width="4" height={alturaBanda - 5} className="fill-fosforo" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Estado vacío del Testigo: una columna hueca con la retícula de profundidad.
 * Literalmente, aún no has perforado.
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
      <rect x="0" y="0" width={ancho} height="3" className="fill-fosforo" />
    </svg>
  );
}
