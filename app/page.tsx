"use client";

import { useMemo } from "react";

import { Testigo, TestigoVacio, type DiaTestigo } from "@/components/testigo/Testigo";
import { useTelegram } from "@/components/TelegramProvider";
import { formatearMicros, microsDesdeCadena } from "@/lib/devengo/dinero";
import { es } from "@/lib/i18n";

/**
 * Inicio del agente.
 *
 * El raíl del Testigo es permanente y ocupa 44 px del borde izquierdo. Es caro
 * en un móvil de 390 px, pero sustituye a la cabecera de KPIs que costaría 96 px
 * de ALTO en cada pantalla: cuesta ancho y devuelve alto, que es lo escaso
 * cuando el teclado y el botón principal se comen la parte de abajo. Y responde
 * "¿estoy ganando?" sin leer, desde cualquier pantalla.
 */

interface Cartera {
  devengadoMicros: bigint;
  disponibleMicros: bigint;
  solicitadoMicros: bigint;
  pagadoMicros: bigint;
}

/** Datos de ejemplo hasta cablear el endpoint; la forma es la definitiva. */
const DIAS_DEMO: DiaTestigo[] = [
  { fecha: "2026-07-24", importeMicros: microsDesdeCadena("4.12"), registrosT1: 3, registrosT2: 2, registrosT3: 6, provisional: true },
  { fecha: "2026-07-23", importeMicros: microsDesdeCadena("6.90"), registrosT1: 3, registrosT2: 7, registrosT3: 6 },
  { fecha: "2026-07-22", importeMicros: microsDesdeCadena("7.44"), registrosT1: 4, registrosT2: 5, registrosT3: 2, concesiones: 1 },
  { fecha: "2026-07-21", importeMicros: microsDesdeCadena("3.10"), registrosT1: 2, registrosT2: 3, registrosT3: 7 },
  { fecha: "2026-07-20", importeMicros: microsDesdeCadena("8.71"), registrosT1: 3, registrosT2: 6, registrosT3: 4, activaciones: 1 },
  { fecha: "2026-07-19", importeMicros: microsDesdeCadena("6.02"), registrosT1: 2, registrosT2: 8, registrosT3: 4 },
  { fecha: "2026-07-18", importeMicros: microsDesdeCadena("4.52"), registrosT1: 2, registrosT2: 6, registrosT3: 6 },
];

const CARTERA_DEMO: Cartera = {
  devengadoMicros: microsDesdeCadena("128.44"),
  disponibleMicros: microsDesdeCadena("96.20"),
  solicitadoMicros: microsDesdeCadena("18.00"),
  pagadoMicros: microsDesdeCadena("14.24"),
};

export default function Inicio() {
  const { listo } = useTelegram();
  const dias = DIAS_DEMO;

  const { totalTiers, t1, t2, t3 } = useMemo(() => {
    const t1 = dias.reduce((a, d) => a + d.registrosT1, 0);
    const t2 = dias.reduce((a, d) => a + d.registrosT2, 0);
    const t3 = dias.reduce((a, d) => a + d.registrosT3, 0);
    return { totalTiers: t1 + t2 + t3, t1, t2, t3 };
  }, [dias]);

  const devengadoMes = dias.reduce((a, d) => a + d.importeMicros, 0n);

  if (!listo) {
    return <div className="p-6 text-apoyo text-texto-apoyo">Cargando…</div>;
  }

  return (
    <main className="relative min-h-dvh pl-testigo">
      {/* El raíl: identidad, gráfico y estado, en la misma pieza. */}
      <div className="fixed inset-y-0 left-0 w-testigo overflow-hidden bg-superficie">
        {dias.length > 0 ? (
          <Testigo dias={dias} ancho={44} alturaBanda={18} />
        ) : (
          <TestigoVacio ancho={44} />
        )}
      </div>

      <div className="animate-emerger px-4 pb-24 pt-6">
        <header className="mb-6">
          <p className="text-rotulo text-texto-apoyo">{es.devengado} · JULIO</p>
          <p className="cifra-mayor cifra mt-1 text-[2.75rem] font-[650] leading-[2.9rem]">
            {formatearMicros(devengadoMes)}
          </p>
          <p className="mt-1 text-apoyo text-texto-apoyo">
            {totalTiers} registros en los últimos {dias.length} días
          </p>
        </header>

        {/* La Cinta: una sola marca de 10 px responde de dónde viene el volumen.
            Sustituye a tres donuts y ocupa una décima parte. */}
        <section aria-label="Reparto por tier" className="mb-7">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-superficie-alta">
            <div className="bg-t1" style={{ width: `${(t1 / totalTiers) * 100}%` }} />
            <div className="bg-t2" style={{ width: `${(t2 / totalTiers) * 100}%` }} />
            <div className="bg-t3" style={{ width: `${(t3 / totalTiers) * 100}%` }} />
          </div>
          <div className="mt-2 flex gap-4 text-apoyo text-texto-apoyo">
            <Leyenda color="bg-t1" etiqueta="T1" valor={t1} />
            <Leyenda color="bg-t2" etiqueta="T2" valor={t2} />
            <Leyenda color="bg-t3" etiqueta="T3" valor={t3} />
          </div>
        </section>

        {/* La Escalera: el dinero no es un saldo, es un flujo con estados.
            Cuatro tarjetas KPI perderían justo esa secuencia. */}
        <section aria-label="Estado de tu dinero" className="mb-7">
          <p className="text-rotulo mb-3 text-texto-apoyo">{es.cartera.toUpperCase()}</p>
          <div className="space-y-2 rounded-pieza bg-superficie p-3">
            <Peldano etiqueta={es.devengado} micros={CARTERA_DEMO.devengadoMicros} proporcion={1} destacado />
            <Peldano etiqueta={es.disponible} micros={CARTERA_DEMO.disponibleMicros} proporcion={0.75} />
            <Peldano etiqueta={es.solicitado} micros={CARTERA_DEMO.solicitadoMicros} proporcion={0.14} />
            <Peldano etiqueta={es.pagado} micros={CARTERA_DEMO.pagadoMicros} proporcion={0.11} />
          </div>
          <p className="mt-2 text-apoyo text-texto-apoyo">{es.revisionManual}</p>
        </section>

        <section className="flex gap-2">
          <a
            href="/activar"
            className="flex-1 rounded-pieza border border-borde px-4 py-3 text-center text-cuerpo font-medium transition-colors duration-150 hover:bg-superficie"
          >
            {es.activarWebmaster}
          </a>
          <a
            href="/red"
            className="flex-1 rounded-pieza border border-borde px-4 py-3 text-center text-cuerpo font-medium transition-colors duration-150 hover:bg-superficie"
          >
            {es.red}
          </a>
        </section>
      </div>
    </main>
  );
}

function Leyenda({ color, etiqueta, valor }: { color: string; etiqueta: string; valor: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-sm ${color}`} aria-hidden />
      {etiqueta} <span className="cifra">{valor}</span>
    </span>
  );
}

/** Un peldaño de la Escalera: longitud = importe, posición = estado del dinero. */
function Peldano({
  etiqueta,
  micros,
  proporcion,
  destacado = false,
}: {
  etiqueta: string;
  micros: bigint;
  proporcion: number;
  destacado?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-rotulo w-24 shrink-0 text-texto-apoyo">{etiqueta}</span>
      <span className="h-5 flex-1 overflow-hidden rounded-sm bg-superficie-alta">
        <span
          className={`block h-full ${destacado ? "bg-fosforo" : "bg-t2"}`}
          style={{ width: `${Math.max(proporcion * 100, 2)}%` }}
        />
      </span>
      <span className="cifra w-24 shrink-0 text-right text-cuerpo">{formatearMicros(micros)}</span>
    </div>
  );
}
