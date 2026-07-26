"use client";

/**
 * El Testigo a ancho completo: el mismo instrumento, a escala de lectura.
 *
 * El raíl de 44 px es SVG porque solo tiene que verse. Aquí hace falta que se
 * pueda **tocar** —en móvil no existe el `hover`, así que un tooltip no es una
 * opción— y que cada banda lleve su fecha y su importe. Por eso son filas del
 * DOM y no un dibujo: se toca, se lee con lector de pantalla y no hay que
 * inventar una capa de eventos sobre un `<svg>`.
 *
 * Lo que NO cambia respecto al raíl, porque es lo que lo hace el mismo objeto:
 * longitud = raíz del ingreso, tiers en orden fijo T1 · T2 · T3, y el día
 * abierto se ve inacabado. Los estratos antiguos **ya no pierden intensidad**:
 * ver la medición en `Testigo.tsx`.
 *
 * Dos densidades:
 *  - `denso`: 60 días en media pantalla. Sirve para ver la forma de la racha.
 *  - normal: fila tocable con fecha e importe, para recorrer el pasado.
 */

import { useMemo, useState } from "react";

import { ImporteDesnudo } from "@/components/Importe";
import { useTelegram } from "@/components/TelegramProvider";
import { raizEntera } from "@/lib/devengo/dinero";

export interface DiaAncho {
  fecha: string;
  importeMicros: bigint;
  registros: number;
  registrosT1: number;
  registrosT2: number;
  registrosT3: number;
  usuariosPago: number;
  provisional?: boolean;
  abreMes?: boolean;
}

/**
 * Meses abreviados en el idioma del agente.
 *
 * Antes era una lista fija en español —«ENE», «FEB»— que se colaba tal cual en
 * las otras cuatro traducciones: el histórico quedaba en árabe con los meses en
 * español. `Intl` los da bien en los cinco y no hay lista que mantener.
 */
function usarMeses(): string[] {
  const { idioma } = useTelegram();
  return useMemo(() => {
    const formato = new Intl.DateTimeFormat(idioma, { month: "short", timeZone: "UTC" });
    return Array.from({ length: 12 }, (_, i) =>
      formato.format(new Date(Date.UTC(2026, i, 1))).toUpperCase(),
    );
  }, [idioma]);
}

/** Bandas mínimas visibles: un día con ingreso nunca puede parecer un día vacío. */
const LARGO_MINIMO = 2;

/** Lo que el componente necesita traducido, sin arrastrar el catálogo entero. */
export interface EtiquetasTestigo {
  desglose: (registros: number, t1: number, t2: number, t3: number) => string;
  dePago: (n: number) => string;
  diaAbierto: string;
}

export function TestigoAncho({
  dias,
  denso = false,
  meses,
  etiquetas,
}: {
  dias: readonly DiaAncho[];
  denso?: boolean;
  /** Total de cada mes, indexado por `YYYY-MM`, para las juntas de cierre. */
  meses?: Record<string, string>;
  etiquetas: EtiquetasTestigo;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);

  const maxRaiz = useMemo(() => {
    let m = 1n;
    for (const d of dias) {
      const r = raizEntera(d.importeMicros);
      if (r > m) m = r;
    }
    return m;
  }, [dias]);

  return (
    <ol className="w-full" role="list">
      {dias.map((d, i) => {
        const raiz = raizEntera(d.importeMicros);
        const largo =
          raiz === 0n ? 0 : Math.max(LARGO_MINIMO, Number((raiz * 100n) / maxRaiz));
        // Sin desvanecido por antigüedad: ver la explicación medida en
        // `Testigo.tsx`. Aquí la curva era más suave (0,006/día) y aun así
        // dejaba el T3 en 2,25:1 sobre la banda más profunda.
        return (
          <li key={d.fecha}>
            {d.abreMes && (
              <Junta mes={d.fecha.slice(0, 7)} total={meses?.[d.fecha.slice(0, 7)]} />
            )}
            {denso ? (
              <FilaDensa dia={d} largo={largo} />
            ) : (
              <FilaTocable
                dia={d}
                largo={largo}
                etiquetas={etiquetas}
                abierto={abierto === d.fecha}
                onAlternar={() => setAbierto(abierto === d.fecha ? null : d.fecha)}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Junta de cierre de mes.
 *
 * En el raíl es una línea de 2 px; aquí puede además llevar el total, que es lo
 * que el agente busca cuando baja: no «¿qué día fue mejor?», sino «¿cuánto hice
 * en junio?».
 */
function Junta({ mes, total }: { mes: string; total?: string }) {
  const meses = usarMeses();
  const [anio, m] = mes.split("-");
  return (
    <div className="mt-4 flex items-baseline justify-between gap-3 border-t-2 border-borde pb-2 pt-2">
      <span className="text-rotulo text-texto-apoyo">
        {meses[Number(m) - 1]} {anio}
      </span>
      {total && (
        <span className="cifra text-apoyo font-semibold">
          <ImporteDesnudo texto={total} />
        </span>
      )}
    </div>
  );
}

function Banda({
  dia,
  largo,
  alto,
}: {
  dia: DiaAncho;
  largo: number;
  alto: number;
}) {
  const tiers = dia.registrosT1 + dia.registrosT2 + dia.registrosT3;
  const pct = (n: number) => (tiers ? (n / tiers) * 100 : 0);

  return (
    <span className="relative flex min-w-0 flex-1 items-center" style={{ height: alto }}>
      <span className="flex h-full" style={{ width: `${largo}%` }} aria-hidden>
        {tiers === 0 ? (
          <span className="h-full w-full bg-t2" />
        ) : (
          <>
            <span className="h-full bg-t1" style={{ width: `${pct(dia.registrosT1)}%` }} />
            <span className="h-full bg-t2" style={{ width: `${pct(dia.registrosT2)}%` }} />
            <span className="h-full bg-t3" style={{ width: `${pct(dia.registrosT3)}%` }} />
          </>
        )}
      </span>

      {/* Día abierto: la banda queda SIN REMATAR en vez de parpadear. El
          punteado dice «esto todavía se está formando» sin usar el vocabulario
          del error, que es lo que lee un parpadeo en una pantalla de dinero. */}
      {dia.provisional && (
        <span
          className="ms-[3px] w-3 shrink-0 border-t-2 border-dashed border-t3"
          aria-hidden
        />
      )}

      {/* Día con registros pero sin devengo: no es lo mismo que un día vacío.
          Suele ser un día anterior a la fecha desde la que el agente cobra, y
          sin esta marca parecería que falta dinero. */}
      {largo === 0 && dia.registros > 0 && (
        <span className="h-[2px] w-4 shrink-0 bg-borde" aria-hidden />
      )}
    </span>
  );
}

/** 60 días en media pantalla: aquí se lee la forma de la racha, no el detalle. */
function FilaDensa({ dia, largo }: { dia: DiaAncho; largo: number }) {
  const dow = new Date(`${dia.fecha}T00:00:00Z`).getUTCDay();
  return (
    <div className="flex items-center gap-2 py-[1px]">
      {/* Solo se rotula el lunes: una fecha por semana basta para orientarse y
          sesenta fechas serían ruido sobre el dato. */}
      <span className="w-6 shrink-0 text-end text-[10px] leading-none text-texto-apoyo">
        {dow === 1 ? dia.fecha.slice(8) : ""}
      </span>
      <Banda dia={dia} largo={largo} alto={7} />
    </div>
  );
}

function FilaTocable({
  dia,
  largo,
  etiquetas,
  abierto,
  onAlternar,
}: {
  dia: DiaAncho;
  largo: number;
  etiquetas: EtiquetasTestigo;
  abierto: boolean;
  onAlternar: () => void;
}) {
  const meses = usarMeses();
  return (
    <>
      {/* `min-h-11` = 44 px. Medida la caja renderizada, estas filas daban
          314×31: son el ÚNICO gesto de la pantalla —«toca un día para ver de
          dónde salió»— y ninguna llegaba al mínimo táctil. Va como altura
          mínima y no como `py-` para que no dependa de cuánto ocupe el texto
          de dentro en cada idioma. */}
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierto}
        className="flex min-h-11 w-full items-center gap-2.5 py-1.5 text-start"
      >
        <span className="cifra w-11 shrink-0 text-[11px] text-texto-apoyo">
          {dia.fecha.slice(8)} {meses[Number(dia.fecha.slice(5, 7)) - 1]}
        </span>
        <Banda dia={dia} largo={largo} alto={14} />
        {/* Sin `$` en cada fila: la unidad se dice una vez en la cabecera de la
            columna. Repetirla setenta veces no aporta precisión, y en mono el
            espacio previo al símbolo mide un dígito entero, así que además
            partía cada cifra en dos. */}
        <span
          className={`cifra w-14 shrink-0 text-end text-apoyo ${
            dia.importeMicros === 0n ? "text-texto-apoyo" : ""
          }`}
        >
          <ImporteDesnudo micros={dia.importeMicros} />
        </span>
      </button>

      {/* El desglose se ABRE EN LA FILA en vez de flotar: en móvil no hay
          puntero, así que un tooltip no llega a existir. Y empujar el contenido
          conserva el sitio del día en la columna, que es como el agente lo
          está mirando. */}
      {abierto && (
        <div className="mb-1.5 ms-[54px] border-s-2 border-borde ps-2.5 text-apoyo tabular-nums text-texto-apoyo">
          {etiquetas.desglose(dia.registros, dia.registrosT1, dia.registrosT2, dia.registrosT3)}
          {dia.usuariosPago > 0 && <> · {etiquetas.dePago(dia.usuariosPago)}</>}
          {dia.provisional && <span className="block text-vivo">{etiquetas.diaAbierto}</span>}
        </div>
      )}
    </>
  );
}
