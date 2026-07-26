"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { BarraCreciente, CifraProtagonista } from "@/components/Animacion";
import { Escalera, type Cartera } from "@/components/Escalera";
import { Aviso, Cargando, Placa, Vacio } from "@/components/Pantalla";
import type { DiaTestigo } from "@/components/testigo/TestigoAncho";
import { useCadenas, useTelegram } from "@/components/TelegramProvider";
import { api, ErrorApi } from "@/lib/api/cliente";
import { formatearMicros } from "@/lib/devengo/dinero";

/**
 * Inicio del agente.
 *
 * La portada abre con **la Placa**: campo amarillo a sangre con lo devengado del
 * mes. Sustituye al raíl de 44 px que ocupaba el borde izquierdo de todas las
 * pantallas —el 11 % del ancho de un móvil, gastado en identidad—. La placa
 * cuesta alto, que es lo que sobra, y encima lleva un dato.
 *
 * El menú de abajo deja de ser un botón ancho más una retícula de cuatro cajas
 * idénticas —el menú por defecto de cualquier aplicación— y pasa a ser una
 * columna en el orden de la jornada del agente, la misma que usa el bot. Cada
 * fila lleva SU PROPIO dato, así que el menú es además un cuadro de mando, y
 * solo lleva marca amarilla lo que exige actuar hoy.
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
    <main className="relative min-h-dvh">
      {/* La Placa: lo devengado del mes sobre campo amarillo. Es la identidad y
          es el dato, en la misma pieza. Solo aparece cuando hay una respuesta
          que dar: sin datos todavía no hay nada que plantear. */}
      {datos && dias.length > 0 && (
        <Placa
          rotulo={t.devengadoTreintaDias}
          valor={<CifraProtagonista micros={devengadoMes} />}
          apoyo={
            <span className="tabular-nums">
              {t.registrosYWebmasters(totalTiers, datos.webmasters)}
            </span>
          }
        />
      )}

      <div className="pb-16 pt-6" style={{ paddingInline: "var(--margen-pantalla)" }}>
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
            {/* La Cinta: una sola marca de 8 px responde «¿de dónde viene el
                volumen?». Sustituye a tres donuts y ocupa una décima parte. */}
            {totalTiers > 0 && (
              <section aria-label={t.repartoPorTier} className="banda banda-1 py-6">
                <p className="rotulo mb-2.5 text-rotulo text-texto-apoyo">{t.repartoPorTier}</p>
                {/* `gap-0.5` = 2 px de superficie entre segmentos. Es la
                    especificación de marcas apiladas: lo que separa es el
                    hueco, nunca un borde dibujado alrededor del dato. */}
                <div className="flex h-2.5 gap-0.5">
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
            )}

            {/* La Escalera: el dinero es un flujo con estados, no cuatro saldos
                sueltos. Cuatro tarjetas KPI perderían justo esa secuencia. */}
            {cartera && (
              <div className="banda banda-2 py-6">
                <Escalera cartera={cartera} titulo={t.cartera.toUpperCase()} etiquetas={t} />
                <p className="mt-3 text-apoyo text-texto-apoyo">{t.revisionManual}</p>
              </div>
            )}
          </>
        )}

        {/* La navegación va SIEMPRE, fuera del ternario.
            Vivía dentro de la última rama, así que un error de la API o una
            ventana de treinta días sin devengo dejaban la portada —la única
            pantalla con enlaces a todo lo demás— sin una sola salida. El agente
            se quedaba encerrado en un aviso con un botón de reintentar. */}
        <nav aria-label={t.acciones} className="banda banda-0 pb-2 pt-7">
          <a
            href="/activar"
            className="chapa flex min-h-[52px] items-center justify-center text-cuerpo font-semibold transition-transform duration-150 ease-sonda active:scale-[0.99]"
          >
            {t.activarWebmaster}
          </a>

          {/* Cuatro filas en el orden de la jornada, cada una con su dato. Antes
              era una retícula de 2×2 con cuatro cajas idénticas y vacías: el
              menú por defecto de cualquier app, y cuatro toques a ciegas. */}
          <ul className="mt-2 divide-y divide-junta" role="list">
            <Fila href="/red" etiqueta={t.red} dato={datos ? String(datos.webmasters) : null} />
            <Fila href="/pro" etiqueta={t.colaRenovaciones} />
            <Fila href="/historico" etiqueta={t.historico} />
            <Fila
              href="/cartera"
              etiqueta={t.cartera}
              dato={cartera ? cartera.disponible.texto : null}
            />
          </ul>
        </nav>
      </div>
    </main>
  );
}

function Leyenda({ color, etiqueta, valor }: { color: string; etiqueta: string; valor: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 ${color}`} aria-hidden />
      {etiqueta} <span className="cifra">{valor}</span>
    </span>
  );
}

/**
 * Fila del menú: destino y estado en el mismo renglón.
 *
 * `min-h-14` son 56 px, muy por encima del mínimo táctil de 44: es una lista de
 * navegación que se usa con el pulgar y de pie.
 */
function Fila({ href, etiqueta, dato }: { href: string; etiqueta: string; dato?: string | null }) {
  return (
    <li>
      <a href={href} className="flex min-h-14 items-center justify-between gap-3 text-cuerpo">
        <span>{etiqueta}</span>
        {dato && <span className="cifra text-apoyo text-texto-apoyo">{dato}</span>}
      </a>
    </li>
  );
}
