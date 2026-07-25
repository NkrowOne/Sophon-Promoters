"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Importe } from "@/components/Importe";
import { Aviso, Cargando, Pantalla, Vacio } from "@/components/Pantalla";
import { TestigoAncho, type DiaAncho } from "@/components/testigo/TestigoAncho";
import { useCadenas } from "@/components/TelegramProvider";
import { api, ErrorApi } from "@/lib/api/cliente";

/**
 * Histórico.
 *
 * Aquí el Testigo no es un raíl de apoyo: **es la pantalla**. Bajar es perforar
 * hacia el pasado, y cada cruce de mes deja su junta con el total, que es lo que
 * el agente viene buscando cuando baja —no qué día fue mejor, sino cuánto hizo
 * en junio—.
 *
 * La paginación va por fecha de corte y no por número de página: con `pageNum`,
 * un devengo nuevo del día en curso desplazaría toda la serie y el agente vería
 * días repetidos al seguir bajando.
 */

interface DiaApi {
  fecha: string;
  importeMicros: string;
  importe: string;
  registros: number;
  registrosT1: number;
  registrosT2: number;
  registrosT3: number;
  usuariosPago: number;
  provisional: boolean;
}

interface Pagina {
  dias: DiaApi[];
  meses: { mes: string; total: { micros: string; texto: string } }[];
  siguienteCursor: string | null;
}

export default function Historico() {
  const t = useCadenas();
  const [dias, setDias] = useState<DiaApi[]>([]);
  const [meses, setMeses] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [agotado, setAgotado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<ErrorApi | null>(null);
  const centinela = useRef<HTMLDivElement>(null);
  // Evita que el observador dispare dos peticiones del mismo cursor mientras la
  // primera sigue en vuelo: sin esto, un scroll rápido pinta días duplicados.
  const enVuelo = useRef(false);

  const cargar = useCallback(async (antesDe: string | null) => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setCargando(true);
    setError(null);
    try {
      const p = await api.get<Pagina>(
        `/api/agente/historico${antesDe ? `?antesDe=${antesDe}` : ""}`,
      );
      setDias((previos) => {
        const vistos = new Set(previos.map((d) => d.fecha));
        return [...previos, ...p.dias.filter((d) => !vistos.has(d.fecha))];
      });
      setMeses((previos) => {
        const siguiente = { ...previos };
        for (const m of p.meses) siguiente[m.mes] = m.total.texto;
        return siguiente;
      });
      setCursor(p.siguienteCursor);
      if (!p.siguienteCursor) setAgotado(true);
    } catch (e) {
      setError(e instanceof ErrorApi ? e : new ErrorApi(t.algoHaFallado, 0, null));
    } finally {
      setCargando(false);
      enVuelo.current = false;
    }
  }, []);

  useEffect(() => {
    void cargar(null);
  }, [cargar]);

  // Perforar hacia abajo carga solo: pedirle al agente que pulse «cargar más»
  // en cada tramo rompe la única metáfora que sostiene esta pantalla.
  useEffect(() => {
    const nodo = centinela.current;
    if (!nodo || agotado || error) return;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting && cursor && !enVuelo.current) void cargar(cursor);
      },
      { rootMargin: "400px" },
    );
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [cursor, agotado, error, cargar]);

  const serie: DiaAncho[] = useMemo(
    () =>
      dias.map((d, i) => ({
        ...d,
        importeMicros: BigInt(d.importeMicros),
        // Se recalcula sobre la serie ACUMULADA, no por página: en el límite
        // entre dos páginas la junta caería mal o se perdería.
        abreMes: i > 0 && dias[i - 1]!.fecha.slice(0, 7) !== d.fecha.slice(0, 7),
      })),
    [dias],
  );

  const total = useMemo(() => serie.reduce((a, d) => a + d.importeMicros, 0n), [serie]);

  if (error && dias.length === 0) {
    return (
      <Pantalla titulo={t.historico} volverA="/">
        <Aviso error={error.message} apoyo={error.apoyo} onReintentar={() => void cargar(null)} />
      </Pantalla>
    );
  }
  if (cargando && dias.length === 0) {
    return (
      <Pantalla titulo={t.historico} volverA="/">
        <Cargando que={t.sondeando} />
      </Pantalla>
    );
  }
  if (dias.length === 0) {
    return (
      <Pantalla titulo={t.historico} volverA="/">
        <Vacio
          titulo={t.sinIngresos}
          apoyo={t.sinIngresosApoyo}
          accion={{ texto: t.activarWebmaster, href: "/activar" }}
        />
      </Pantalla>
    );
  }

  return (
    <Pantalla titulo={t.historico} volverA="/">
      <p className="mb-1 text-apoyo text-texto-apoyo">
        <Importe micros={total} className="text-cuerpo font-semibold text-texto" />{" "}
        {t.enDias(serie.length)}
      </p>
      {/* Solo se explica lo que no se descubre solo. Que bajando se va hacia
          atrás lo enseña la propia lista en el primer gesto; que una banda se
          abre al tocarla, no. */}
      <p className="mb-5 text-apoyo text-texto-apoyo">{t.tocaUnDia}</p>

      {/* Cabecera de la columna de importes: la unidad se dice una vez aquí y
          desaparece de las setenta filas de abajo. */}
      <div className="mb-1 flex items-baseline justify-between border-b border-borde pb-1.5">
        <span className="text-rotulo text-texto-apoyo">{t.columnaDia}</span>
        <span className="text-rotulo text-texto-apoyo">{t.columnaDolares}</span>
      </div>

      <TestigoAncho dias={serie} meses={meses} etiquetas={t} />

      <div ref={centinela} className="pt-6">
        {agotado ? (
          // El fondo del sondeo tiene que verse: sin este cierre, el scroll
          // acaba en blanco y no se distingue de una carga que falló.
          <div className="border-t-2 border-borde pt-3 text-apoyo text-texto-apoyo">
            {t.aquiEmpieza}
          </div>
        ) : error ? (
          <Aviso
            error={error.message}
            apoyo={error.apoyo}
            onReintentar={() => void cargar(cursor)}
          />
        ) : (
          <p className="text-rotulo text-texto-apoyo" aria-live="polite">
            {t.perforando.toUpperCase()}…
          </p>
        )}
      </div>
    </Pantalla>
  );
}
