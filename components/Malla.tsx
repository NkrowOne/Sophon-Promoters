"use client";

/**
 * La Malla: la superficie que responde «¿cuál de mis webmasters se ha apagado?».
 *
 * No es una lista. Una lista de tarjetas —nombre, cifra, flecha— obliga a leer
 * cada fila y a comparar de memoria, y con veinte webmasters eso ya no se hace.
 * Aquí cada webmaster es una **tesela con sus últimos 14 días en minibarras**,
 * y todas se ven a la vez: el que deja de producir aparece como un hueco oscuro
 * sin necesidad de leer un solo número.
 *
 * Esa es la única acción comercial que el agente tiene que tomar, así que es lo
 * que la pantalla hace evidente.
 *
 * Cada marca codifica una cantidad real: altura de barra = registros del día,
 * densidad de tinta = tier, y el estado del webmaster se dibuja en el marco, no
 * con un icono decorativo al lado.
 */

import { useMemo } from "react";

export interface DiaWebmaster {
  fecha: string;
  registros: number;
  registrosT1: number;
  registrosT2: number;
  registrosT3: number;
  usuariosPago: number;
}

export interface WebmasterMalla {
  id: string;
  email: string;
  estado: string;
  ganadoTotal: { texto: string };
  registrosVentana: number;
  diasSinActividad: number | null;
  diasHastaCaducidad: number | null;
  serie: DiaWebmaster[];
}

const ANCHO_TESELA = 92;
const ALTO_BARRAS = 34;

/** Días sin actividad a partir de los cuales la tesela se marca como apagada. */
export const DIAS_APAGADO = 4;

export function Malla({
  webmasters,
  dias,
  onAbrir,
}: {
  webmasters: readonly WebmasterMalla[];
  dias: number;
  onAbrir?: (id: string) => void;
}) {
  // La escala es COMÚN a toda la malla, no por tesela: si cada una se
  // normalizara contra su propio máximo, un webmaster de 2 registros al día se
  // vería igual de lleno que uno de 200 y la comparación —que es el motivo de
  // esta pantalla— dejaría de funcionar.
  const maximo = useMemo(
    () =>
      Math.max(
        1,
        ...webmasters.flatMap((w) => w.serie.map((d) => d.registros)),
      ),
    [webmasters],
  );

  return (
    <ul className="grid grid-cols-2 gap-2.5" role="list">
      {webmasters.map((w) => (
        <Tesela key={w.id} w={w} maximo={maximo} dias={dias} onAbrir={onAbrir} />
      ))}
    </ul>
  );
}

function Tesela({
  w,
  maximo,
  dias,
  onAbrir,
}: {
  w: WebmasterMalla;
  maximo: number;
  dias: number;
  onAbrir?: (id: string) => void;
}) {
  const apagado = w.diasSinActividad === null || w.diasSinActividad >= DIAS_APAGADO;
  const problema = w.estado !== "ACTIVO";
  const avisoPro = w.diasHastaCaducidad !== null && w.diasHastaCaducidad <= 7;

  // Solo se escribe lo que exige una decisión, y por orden de urgencia: una
  // cuenta bloqueada importa más que un PRO a punto de vencer, y este más que
  // una racha sin actividad. Un webmaster que rinde no lleva etiqueta: su
  // columna ya lo dice.
  const etiqueta = problema
    ? w.estado === "BLOQUEADO"
      ? "BLOQUEADO"
      : w.estado === "PENDIENTE_BORRADO"
        ? "SE VA A BORRAR"
        : "DESAPARECIDO"
    : avisoPro
      ? w.diasHastaCaducidad! <= 0
        ? "PRO CADUCADO"
        : // Cabe en una tesela de media pantalla. «PRO VENCE EN 5 D» se truncaba
          // a «PRO VENCE EN …», que es peor que no decir nada: ocupa sitio y no
          // informa del plazo, que es justo el dato accionable.
          `PRO VENCE ${w.diasHastaCaducidad} D`
      : apagado
        ? w.diasSinActividad === null
          ? "SIN ACTIVIDAD"
          : `${w.diasSinActividad} DÍAS PARADO`
        : "";

  // La serie llega ordenada de reciente a antigua; se pinta al revés para que
  // el tiempo avance de izquierda a derecha, como se lee.
  const serie = [...w.serie].reverse();
  const faltan = Math.max(0, dias - serie.length);

  return (
    <li>
      <button
        type="button"
        onClick={() => onAbrir?.(w.id)}
        className={[
          "w-full rounded-pieza border p-2.5 text-left",
          "transition-transform duration-150 ease-sonda active:scale-[0.99]",
          // El estado se dibuja en el MARCO, no con un icono al lado: así el
          // problema se ve a la misma distancia que el volumen.
          problema ? "border-vivo" : apagado ? "border-borde" : "border-tinta",
        ].join(" ")}
        style={{ minWidth: ANCHO_TESELA }}
      >
        <span className="block truncate text-apoyo font-medium" title={w.email}>
          {w.email.split("@")[0]}
        </span>

        <span
          className="mt-2 flex h-[34px] items-end gap-[2px]"
          style={{ height: ALTO_BARRAS }}
          aria-hidden
        >
          {/* Días sin datos: hueco explícito, no cero. Un cero dibujado y un
              «no hay dato» son cosas distintas y confundirlas engaña. */}
          {Array.from({ length: faltan }, (_, i) => (
            <span key={`hueco-${i}`} className="h-full flex-1 bg-superficie" />
          ))}
          {serie.map((d) => (
            <BarraDia key={d.fecha} dia={d} maximo={maximo} />
          ))}
        </span>

        <span className="mt-2 flex items-baseline justify-between gap-2">
          <span className="cifra text-apoyo">{w.registrosVentana}</span>
          <span className="cifra text-apoyo text-texto-apoyo">{w.ganadoTotal.texto}</span>
        </span>

        {/* La franja de estado ocupa SIEMPRE una línea, aunque esté vacía.
            Sin altura reservada, una tesela con etiqueta crecía más que sus
            vecinas y la retícula se desalineaba —justo lo que rompe una
            superficie cuya razón de ser es comparar unas con otras—.
            Y el texto va en una sola línea: partido en dos volvía a descuadrarla. */}
        <span
          className={`text-rotulo mt-1.5 block h-4 truncate ${
            problema || avisoPro ? "text-vivo" : "text-texto-apoyo"
          }`}
        >
          {etiqueta}
        </span>
      </button>
    </li>
  );
}

/** Una barra por día, partida por tier en orden fijo T1 · T2 · T3 de abajo arriba. */
function BarraDia({ dia, maximo }: { dia: DiaWebmaster; maximo: number }) {
  if (dia.registros === 0) {
    // Día sin registros: una marca mínima al pie. Dejarlo en blanco lo haría
    // indistinguible de un día sin datos.
    return <span className="h-[2px] flex-1 self-end bg-superficie-alta" />;
  }

  const alto = Math.max(4, Math.round((dia.registros / maximo) * ALTO_BARRAS));
  const conTier = dia.registrosT1 + dia.registrosT2 + dia.registrosT3;
  const pct = (n: number) => (conTier ? (n / conTier) * 100 : 0);

  return (
    <span className="flex flex-1 flex-col justify-end" style={{ height: ALTO_BARRAS }}>
      <span className="flex w-full flex-col" style={{ height: alto }}>
        {conTier === 0 ? (
          <span className="h-full w-full bg-t2" />
        ) : (
          <>
            <span className="w-full bg-t1" style={{ height: `${pct(dia.registrosT1)}%` }} />
            <span className="w-full bg-t2" style={{ height: `${pct(dia.registrosT2)}%` }} />
            <span className="w-full bg-t3" style={{ height: `${pct(dia.registrosT3)}%` }} />
          </>
        )}
      </span>
    </span>
  );
}
