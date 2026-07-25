"use client";

import { useMemo } from "react";

import { Aparece, BarraCreciente, CifraProtagonista } from "@/components/Animacion";
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
 *
 * La jerarquía es deliberadamente plana salvo en un punto: la cifra devengada
 * del mes. Todo lo demás es apoyo de esa cifra.
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
  { fecha: "2026-07-17", importeMicros: microsDesdeCadena("5.31"), registrosT1: 1, registrosT2: 4, registrosT3: 8 },
  { fecha: "2026-07-16", importeMicros: microsDesdeCadena("9.14"), registrosT1: 3, registrosT2: 11, registrosT3: 3 },
  { fecha: "2026-07-15", importeMicros: microsDesdeCadena("7.02"), registrosT1: 4, registrosT2: 7, registrosT3: 7 },
];

const CARTERA_DEMO: Cartera = {
  devengadoMicros: microsDesdeCadena("128.44"),
  disponibleMicros: microsDesdeCadena("96.20"),
  solicitadoMicros: microsDesdeCadena("18.00"),
  pagadoMicros: microsDesdeCadena("14.24"),
};

export default function Inicio() {
  // Deliberadamente NO se bloquea el render esperando a Telegram. El puente solo
  // aporta tema y háptica; si tarda o falla —WebView antiguo, script bloqueado,
  // la app abierta fuera de Telegram— la pantalla debe seguir siendo legible y
  // usable con los colores de respaldo. Una versión anterior mostraba
  // «SONDEANDO…» hasta que el puente respondía y dejaba la app en blanco.
  useTelegram();
  const dias = DIAS_DEMO;

  const { totalTiers, t1, t2, t3, devengadoMes } = useMemo(() => {
    const t1 = dias.reduce((a, d) => a + d.registrosT1, 0);
    const t2 = dias.reduce((a, d) => a + d.registrosT2, 0);
    const t3 = dias.reduce((a, d) => a + d.registrosT3, 0);
    return {
      t1,
      t2,
      t3,
      totalTiers: t1 + t2 + t3,
      devengadoMes: dias.reduce((a, d) => a + d.importeMicros, 0n),
    };
  }, [dias]);

  const maxCartera = CARTERA_DEMO.devengadoMicros;
  const proporcion = (m: bigint): number =>
    maxCartera === 0n ? 0 : Number((m * 1000n) / maxCartera) / 10;

  return (
    <main className="relative min-h-dvh pl-testigo">
      {/* El raíl: identidad, gráfico principal, indicador de estado y estado
          vacío, todo en la misma pieza. */}
      <div className="testigo-terreno fixed inset-y-0 left-0 w-testigo overflow-hidden bg-superficie">
        {dias.length > 0 ? <Testigo dias={dias} /> : <TestigoVacio />}
      </div>

      <div className="px-4 pb-16 pt-7">
        <Aparece orden={0}>
          <header className="mb-8">
            <p className="text-rotulo text-texto-apoyo">{es.devengado} · JULIO</p>
            <div className="mt-1.5">
              <CifraProtagonista micros={devengadoMes} />
            </div>
            <p className="mt-2 text-apoyo text-texto-apoyo">
              <span className="tabular-nums">{totalTiers}</span> registros en {dias.length} días
            </p>
          </header>
        </Aparece>

        {/* La Cinta: una sola marca de 10 px responde «¿de dónde viene el
            volumen?» en 200 ms. Sustituye a tres donuts y ocupa una décima parte. */}
        <Aparece orden={1}>
          <section aria-label="Reparto de registros por tier" className="mb-8">
            <div className="flex h-2 overflow-hidden bg-superficie-alta">
              <BarraCreciente porcentaje={(t1 / totalTiers) * 100} className="bg-t1" />
              <BarraCreciente porcentaje={(t2 / totalTiers) * 100} className="bg-t2" retardoMs={60} />
              <BarraCreciente porcentaje={(t3 / totalTiers) * 100} className="bg-t3" retardoMs={120} />
            </div>
            <div className="mt-2.5 flex gap-4 text-apoyo text-texto-apoyo">
              <Leyenda color="bg-t1" etiqueta="T1" valor={t1} />
              <Leyenda color="bg-t2" etiqueta="T2" valor={t2} />
              <Leyenda color="bg-t3" etiqueta="T3" valor={t3} />
            </div>
          </section>
        </Aparece>

        {/* La Escalera: el dinero no es un saldo, es un flujo con estados
            (devengado → disponible → solicitado → pagado). Cuatro tarjetas KPI
            perderían justo esa secuencia, que es lo único que el agente
            necesita entender para saber cuándo cobra. */}
        {/* Sin tarjeta contenedora. Un bloque gris con esquinas blandas es la
            firma de «app moderna» genérica y no aporta nada: la agrupación ya la
            hace el rótulo y la separan filetes de 1 px, como en una tabla de
            ensayo. Menos superficie, más densidad de información. */}
        <Aparece orden={2}>
          <section aria-label="Estado de tu dinero" className="mb-8">
            <p className="text-rotulo mb-1 border-b border-borde pb-2 text-texto-apoyo">
              {es.cartera.toUpperCase()}
            </p>
            <div className="divide-y divide-borde">
              <Peldano etiqueta={es.devengado} micros={CARTERA_DEMO.devengadoMicros} proporcion={proporcion(CARTERA_DEMO.devengadoMicros)} destacado />
              <Peldano etiqueta={es.disponible} micros={CARTERA_DEMO.disponibleMicros} proporcion={proporcion(CARTERA_DEMO.disponibleMicros)} retardo={70} />
              <Peldano etiqueta={es.solicitado} micros={CARTERA_DEMO.solicitadoMicros} proporcion={proporcion(CARTERA_DEMO.solicitadoMicros)} retardo={140} />
              <Peldano etiqueta={es.pagado} micros={CARTERA_DEMO.pagadoMicros} proporcion={proporcion(CARTERA_DEMO.pagadoMicros)} retardo={210} />
            </div>
            <p className="mt-3 text-apoyo text-texto-apoyo">{es.revisionManual}</p>
          </section>
        </Aparece>

        {/* La acción principal va sola y a todo el ancho: es la única cosa que
            el agente viene a hacer. Las tres secundarias caben en una fila de
            iguales, en vez de una retícula de dos donde una celda envolvía a dos
            líneas y descuadraba la altura de toda la fila. */}
        <Aparece orden={3}>
          <nav aria-label="Acciones" className="space-y-2.5">
            <Accion href="/activar" etiqueta={es.activarWebmaster} principal />
            <div className="grid grid-cols-3 gap-2.5">
              <Accion href="/red" etiqueta={es.red} />
              <Accion href="/historico" etiqueta={es.historico} />
              <Accion href="/cartera" etiqueta={es.cartera} />
            </div>
          </nav>
        </Aparece>
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

/**
 * Un peldaño de la Escalera: longitud = importe, posición = estado del dinero.
 *
 * El rótulo va en su propia línea con el importe a la derecha, y la barra debajo.
 * La versión anterior los ponía en una sola fila con el rótulo de ancho fijo, y
 * el `letter-spacing` de los rótulos desbordaba sobre la barra: «DEVENGADO» y
 * «SOLICITADO» aparecían cortados. Dos líneas cuestan altura pero no dependen
 * de que ninguna palabra quepa en una medida calculada a ojo.
 */
function Peldano({
  etiqueta,
  micros,
  proporcion,
  destacado = false,
  retardo = 0,
}: {
  etiqueta: string;
  micros: bigint;
  proporcion: number;
  destacado?: boolean;
  retardo?: number;
}) {
  return (
    <div className="py-2.5">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-rotulo text-texto-apoyo">{etiqueta}</span>
        <span className={`cifra text-cuerpo ${destacado ? "font-semibold" : ""}`}>
          {formatearMicros(micros)}
        </span>
      </div>
      {/* Extremos rectos: una barra de datos con las puntas redondeadas miente
          sobre dónde empieza y acaba la medida, y solo está ahí por blandura. */}
      <span className="block h-1.5 overflow-hidden bg-superficie-alta">
        <BarraCreciente
          porcentaje={Math.max(proporcion, 1.5)}
          className={destacado ? "bg-tinta" : "bg-t2"}
          retardoMs={retardo}
        />
      </span>
    </div>
  );
}

function Accion({
  href,
  etiqueta,
  principal = false,
}: {
  href: string;
  etiqueta: string;
  principal?: boolean;
}) {
  return (
    <a
      href={href}
      className={[
        "flex items-center justify-center rounded-pieza px-3 py-3.5 text-center",
        "transition-transform duration-150 ease-sonda active:scale-[0.99]",
        // El énfasis es una INVERSIÓN, no un color: el botón principal es tinta
        // plena sobre el fondo del tema. Funciona igual en claro y oscuro y no
        // introduce un tono de marca que compita con los estratos.
        principal
          ? "bg-tinta text-cuerpo font-semibold text-fondo"
          : "border border-borde text-apoyo font-medium hover:bg-superficie",
      ].join(" ")}
    >
      {etiqueta}
    </a>
  );
}
