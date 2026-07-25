"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Aparece, BarraCreciente, CifraProtagonista } from "@/components/Animacion";
import { Escalera, type Cartera } from "@/components/Escalera";
import { Aviso, Cargando, Vacio } from "@/components/Pantalla";
import { Testigo, TestigoVacio, type DiaTestigo } from "@/components/testigo/Testigo";
import { useCadenas, useTelegram } from "@/components/TelegramProvider";
import { api, ErrorApi } from "@/lib/api/cliente";
import { formatearMicros } from "@/lib/devengo/dinero";

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

interface DiaApi extends Omit<DiaTestigo, "importeMicros"> {
  importeMicros: string;
  importe: string;
  registros: number;
  usuariosPago: number;
}

interface Resumen {
  dias: DiaApi[];
  webmasters: number;
  puedeActivarWebmasters: boolean;
  cartera: Cartera;
}

export default function Inicio() {
  // Deliberadamente NO se bloquea el render esperando a Telegram. El puente solo
  // aporta tema y háptica; si tarda o falla —WebView antiguo, script bloqueado,
  // la app abierta fuera de Telegram— la pantalla debe seguir siendo legible.
  useTelegram();
  const t = useCadenas();

  const [datos, setDatos] = useState<Resumen | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);

  const cargar = useCallback(() => {
    setError(null);
    api
      .get<Resumen>("/api/agente/resumen")
      .then(setDatos)
      .catch((e) =>
        setError(e instanceof ErrorApi ? e : new ErrorApi("Algo ha fallado.", 0, null)),
      );
  }, []);

  useEffect(cargar, [cargar]);

  // Los importes llegan como cadena porque JSON no admite BigInt: se reconstruyen
  // aquí, y nunca se pasan por coma flotante.
  const dias: DiaTestigo[] = useMemo(
    () =>
      (datos?.dias ?? []).map((d) => ({
        ...d,
        importeMicros: BigInt(d.importeMicros),
      })),
    [datos],
  );

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

  if (error && error.estado === 401) {
    // Sin sesión no hay nada que enseñar: se manda al alta en vez de mostrar
    // una pantalla vacía que no explica por qué está vacía.
    return (
      <main className="min-h-dvh px-4 pt-10">
        <Vacio
          titulo={t.sinVinculo}
          apoyo={t.pideCodigo}
          accion={{ texto: t.vincularCuenta, href: "/alta" }}
        />
      </main>
    );
  }

  const cartera = datos?.cartera;

  return (
    <main className="relative min-h-dvh ps-testigo">
      {/* El raíl: identidad, gráfico principal, indicador de estado y estado
          vacío, todo en la misma pieza.

          La trama de terreno solo se pone cuando hay bandas que apoyar. Con el
          raíl vacío se solapaba con las marcas del propio TestigoVacio —la
          misma retícula dibujada dos veces— y el resultado era un rayado sucio
          en lugar de una columna sin perforar. */}
      <div
        className={`fixed inset-y-0 start-0 w-testigo overflow-hidden bg-superficie ${
          dias.length > 0 ? "testigo-terreno" : ""
        }`}
      >
        {dias.length > 0 ? <Testigo dias={dias} /> : <TestigoVacio />}
      </div>

      <div className="px-4 pb-16 pt-7">
        {error ? (
          <Aviso error={error.message} apoyo={error.apoyo} onReintentar={cargar} />
        ) : !datos ? (
          <Cargando que={t.sondeando} />
        ) : dias.length === 0 ? (
          <Vacio
            titulo={datos.webmasters === 0 ? t.sinWebmasters : t.sinIngresos}
            apoyo={datos.webmasters === 0 ? t.sinWebmastersApoyo : t.sinIngresosApoyo}
            accion={
              datos.webmasters === 0
                ? { texto: t.activarWebmaster, href: "/activar" }
                : { texto: t.red, href: "/red" }
            }
          />
        ) : (
          <>
            <Aparece orden={0}>
              <header className="mb-8">
                <p className="text-rotulo text-texto-apoyo">{t.devengadoTreintaDias}</p>
                <div className="mt-1.5">
                  <CifraProtagonista micros={devengadoMes} />
                </div>
                <p className="mt-2 text-apoyo tabular-nums text-texto-apoyo">
                  {t.registrosYWebmasters(totalTiers, datos.webmasters)}
                </p>
              </header>
            </Aparece>

            {/* La Cinta: una sola marca de 8 px responde «¿de dónde viene el
                volumen?». Sustituye a tres donuts y ocupa una décima parte. */}
            {totalTiers > 0 && (
              <Aparece orden={1}>
                <section aria-label={t.repartoPorTier} className="mb-8">
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
            )}

            {/* La Escalera: el dinero es un flujo con estados, no cuatro saldos
                sueltos. Cuatro tarjetas KPI perderían justo esa secuencia. */}
            {cartera && (
              <Aparece orden={2}>
                <div className="mb-8">
                  <Escalera cartera={cartera} titulo={t.cartera.toUpperCase()} etiquetas={t} />
                  <p className="mt-3 text-apoyo text-texto-apoyo">{t.revisionManual}</p>
                </div>
              </Aparece>
            )}

            {/* La acción principal va sola y a todo el ancho: es la única cosa
                que el agente viene a hacer. */}
            <Aparece orden={3}>
              {/* Una acción principal a todo el ancho y las demás en una
                  retícula PAR. Con tres secundarias la fila quedaba descuadrada
                  respecto al botón de arriba; con cuatro, el bloque entero es un
                  rectángulo y deja de leerse como un sobrante. */}
              <nav aria-label={t.acciones} className="space-y-2.5">
                <Accion href="/activar" etiqueta={t.activarWebmaster} principal />
                <div className="grid grid-cols-2 gap-2.5">
                  <Accion href="/red" etiqueta={t.red} />
                  {datos.puedeActivarWebmasters && (
                    <Accion href="/pro" etiqueta={t.colaRenovaciones} />
                  )}
                  <Accion href="/historico" etiqueta={t.historico} />
                  <Accion href="/cartera" etiqueta={t.cartera} />
                </div>
              </nav>
            </Aparece>
          </>
        )}
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
