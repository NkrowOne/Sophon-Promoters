"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Importe } from "@/components/Importe";
import { Aviso, Banda, Cargando, FalloDeCarga, Pantalla, Vacio } from "@/components/Pantalla";
import { TestigoAncho, type DiaAncho } from "@/components/testigo/TestigoAncho";
import { useCadenas } from "@/components/TelegramProvider";
import { ErrorApi, aErrorApi, api } from "@/lib/api/cliente";

/**
 * Histórico.
 *
 * Aquí el Testigo no es un raíl de apoyo: **es la pantalla**. Bajar es perforar
 * hacia el pasado, y cada cruce de mes deja su junta con el total, que es lo que
 * el agente viene buscando cuando baja —no qué día fue mejor, sino cuánto hizo
 * en junio—.
 *
 * Tres estratos y ni uno más: el total arriba, la columna de días en medio y el
 * fondo del sondeo abajo. **Sin placa**, y no por descuido: la placa da la
 * respuesta CERRADA de una pantalla, y aquí el número de arriba depende de
 * cuánto haya bajado el agente. Lo que preside es una tarjeta de filete, que
 * pesa lo justo para abrir sin prometer un cierre que no existe.
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
      setError(aErrorApi(e));
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
      <Pantalla titulo={t.historico}>
        <FalloDeCarga error={error} onReintentar={() => void cargar(null)} />
      </Pantalla>
    );
  }
  if (cargando && dias.length === 0) {
    return (
      <Pantalla titulo={t.historico}>
        <Cargando que={t.sondeando} />
      </Pantalla>
    );
  }
  if (dias.length === 0) {
    return (
      <Pantalla titulo={t.historico}>
        <Vacio
          titulo={t.sinIngresos}
          apoyo={t.sinIngresosApoyo}
          accion={{ texto: t.activarWebmaster, href: "/activar" }}
        />
      </Pantalla>
    );
  }

  return (
    <Pantalla titulo={t.historico}>
      {/*
        La cabecera, en tarjeta de FILETE y compacta.

        Era un párrafo sobre el papel desnudo, y por eso esta era la única
        pantalla de datos sin nada que la presidiera: el total —lo que el agente
        viene a saber— pesaba exactamente lo mismo que la nota de debajo. De
        filete y no de sombra porque no se pulsa, y porque a dos centímetros
        empiezan setenta filas de dato: una sombra aquí levantaría el resumen
        por encima del instrumento, que es al revés de como se lee esto.

        `campo-malla` es el único oro de la pantalla, y por eso está. No hay
        placa y no hay nada que pulsar en todo el histórico, así que sin él la
        pantalla es blanca y gris de arriba abajo. Es un MOTIVO detrás de la
        cifra, no una chapa: la regla de un amarillo por pantalla queda intacta
        porque aquí no hay ninguna acción con la que se pueda confundir.
      */}
      <Banda orden={0} tono={0} como="header" className="pb-6">
        <div className="tarjeta-borde campo-malla !px-4 !py-3.5">
          {/*
            El total sube de 16 a 22 px y a la cara de display.

            Estaba escrito del tamaño de su propio pie de foto. No sube a los
            40 px de una placa y es deliberado: este total NO cierra nada —crece
            cada vez que el sondeo baja otro tramo—, y una cifra de portada que
            cambia sola mientras se hace scroll miente sobre lo que es. Lo que
            la mantiene honesta es el «en N días» pegado detrás en tinta de
            apoyo: la convierte en una medida del tramo cargado y no en un saldo.
          */}
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-apoyo text-texto-apoyo">
            <Importe micros={total} className="display text-cifra text-texto" />
            <span>{t.enDias(serie.length)}</span>
          </p>
          {/* Solo se explica lo que no se descubre solo. Que bajando se va hacia
              atrás lo enseña la propia lista en el primer gesto; que una banda se
              abre al tocarla, no. */}
          <p className="mt-1 text-apoyo text-texto-apoyo">{t.tocaUnDia}</p>
        </div>
      </Banda>

      {/* El testigo va sobre superficie y no sobre el fondo desnudo: las bandas
          de días son el dato, y necesitan un suelo propio contra el que medirse
          igual que el raíl lo tiene en las demás pantallas. */}
      <Banda orden={1} tono={1} etiqueta={t.historico} className="py-6">
        {/* Cabecera de la columna de importes: la unidad se dice una vez aquí y
            desaparece de las setenta filas de abajo. */}
        <div className="mb-1 flex items-baseline justify-between border-b border-junta pb-1.5">
          <span className="text-rotulo text-texto-apoyo">{t.columnaDia}</span>
          <span className="text-rotulo text-texto-apoyo">{t.columnaDolares}</span>
        </div>

        <TestigoAncho dias={serie} meses={meses} etiquetas={t} />
      </Banda>

      <Banda orden={2} tono={0}>
        <div ref={centinela} className="pt-6">
          {agotado ? (
            // El fondo del sondeo tiene que verse: sin este cierre, el scroll
            // acaba en blanco y no se distingue de una carga que falló.
            //
            // El filete es de TINTA y no de campo aunque el prototipo lo pinte
            // amarillo: la roca madre no se pulsa. En esta paleta el contraste
            // ya hace solo el trabajo de decir «hasta aquí», y gastar el único
            // color del producto en una línea de cierre es justo lo que lo
            // devalúa donde sí significa algo.
            <div className="border-t-2 border-tinta pt-3 text-apoyo text-texto-apoyo">
              {t.aquiEmpieza}
            </div>
          ) : error ? (
            <Aviso
              error={error}
              onReintentar={() => void cargar(cursor)}
            />
          ) : (
            // La barrena sigue girando. El renglón solo no bastaba: esto se
            // consulta de pie y con la red de un móvil, y un texto quieto seis
            // segundos no se distingue de una aplicación colgada —y lo que hace
            // entonces el agente es cerrarla—. Del ancho de una palabra y no de
            // borde a borde, porque el medidor no sabe cuánto falta: dice que
            // hay actividad, no que vaya por la mitad.
            <div>
              <p className="text-apoyo text-texto-apoyo" aria-live="polite">
                {t.perforando}…
              </p>
              <span className="medidor mt-2 block h-1 w-24" aria-hidden>
                <span />
              </span>
            </div>
          )}
        </div>
      </Banda>
    </Pantalla>
  );
}
