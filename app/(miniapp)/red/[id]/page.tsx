"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";

import { BarraCreciente, CifraProtagonista } from "@/components/Animacion";
import { Icono } from "@/components/Icono";
import { Mecha, MechaApagada } from "@/components/Mecha";
import { Aviso, Banda, Cargando, FalloDeCarga, Marca, Pantalla, Vacio } from "@/components/Pantalla";
import { TestigoAncho, type DiaAncho } from "@/components/testigo/TestigoAncho";
import { useCadenas, useTelegram } from "@/components/TelegramProvider";
import { api, ErrorApi, nuevaIdempotencia } from "@/lib/api/cliente";
import type { Cadenas } from "@/lib/i18n";

/**
 * Ficha de un webmaster.
 *
 * Dos preguntas, en este orden: **cuánto me da** y **cuándo le caduca el PRO**.
 * Lo segundo va arriba aunque sea el dato menor, porque es el único que tiene
 * fecha límite: la cifra de ganancia seguirá ahí mañana, la mecha no.
 *
 * El resto de la pantalla es el Testigo de este webmaster a ancho completo. Es
 * el mismo instrumento que el raíl, no un gráfico distinto para una pantalla
 * distinta.
 */

interface DiaFicha {
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

interface Ficha {
  email: string;
  id: string;
  estado: string;
  origen: string;
  activadoEn: string | null;
  devengaDesde: string | null;
  pro: {
    vigenteHasta: string;
    concedidoEn: string | null;
    diasRestantes: number;
    diasConcedidos: number | null;
  } | null;
  /**
   * Se le puede conceder PRO hoy.
   *
   * Fuera de `pro` porque el caso más renovable de todos —nunca tuvo— es
   * justamente el que tiene `pro: null`.
   */
  proRenovable: boolean;
  dias: number;
  serie: DiaFicha[];
  totales: {
    ganado: { micros: string; texto: string };
    registros: number;
    registrosT1: number;
    registrosT2: number;
    registrosT3: number;
    usuariosPago: number;
  };
}

export default function FichaWebmaster({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { haptica } = useTelegram();
  const t = useCadenas();
  const [datos, setDatos] = useState<Ficha | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [renovando, setRenovando] = useState(false);
  // Estado APARTE del error de carga. Compartían variable, así que un fallo al
  // renovar hacía que la guarda de arriba devolviera la pantalla de error y la
  // ficha entera desapareciera: el agente perdía de vista los datos que estaba
  // mirando por un error de una acción secundaria.
  const [errorRenovar, setErrorRenovar] = useState<ErrorApi | null>(null);
  const clave = useRef(nuevaIdempotencia());

  const cargar = useCallback(() => {
    setError(null);
    api
      .get<Ficha>(`/api/agente/webmaster/${encodeURIComponent(id)}`)
      .then(setDatos)
      .catch((e) =>
        setError(e instanceof ErrorApi ? e : new ErrorApi(t.algoHaFallado, 0, null)),
      );
  }, [id]);

  useEffect(cargar, [cargar]);

  const renovar = useCallback(async () => {
    if (!datos || renovando) return;
    setRenovando(true);
    setErrorRenovar(null);
    try {
      await api.post("/api/pro/conceder", {
        email: datos.email,
        idempotencia: clave.current,
      });
      haptica("exito");
      clave.current = nuevaIdempotencia();
      cargar();
    } catch (e) {
      haptica("error");
      setErrorRenovar(e instanceof ErrorApi ? e : new ErrorApi(t.algoHaFallado, 0, null));
    } finally {
      setRenovando(false);
    }
  }, [datos, renovando, haptica, cargar, t]);

  const serie: DiaAncho[] = useMemo(
    () =>
      (datos?.serie ?? []).map((d, i, todos) => ({
        ...d,
        importeMicros: BigInt(d.importeMicros),
        abreMes: i > 0 && todos[i - 1]!.fecha.slice(0, 7) !== d.fecha.slice(0, 7),
      })),
    [datos],
  );

  if (error) {
    return (
      <Pantalla titulo={t.webmaster}>
        {/* Un 404 no se reintenta: ese webmaster no es de este agente y
            reintentar dará 404 otra vez. La salida es volver a la red, que es
            además desde donde se llega aquí. */}
        {error.estado === 404 ? (
          <Vacio
            titulo={error.message}
            apoyo={error.apoyo ?? undefined}
            accion={{ texto: t.red, href: "/red", icono: "red" }}
          />
        ) : (
          <FalloDeCarga error={error} onReintentar={cargar} />
        )}
      </Pantalla>
    );
  }
  if (!datos) {
    return (
      <Pantalla titulo={t.webmaster}>
        <Cargando que={t.sondeando} />
      </Pantalla>
    );
  }

  const problema = datos.estado !== "ACTIVO";
  const tot = datos.totales;
  const conTier = tot.registrosT1 + tot.registrosT2 + tot.registrosT3;

  return (
    <Pantalla>
              <Banda orden={0} tono={0} como="header" className="pb-6">
          {/* El correo entero, sin recortar: es el identificador con el que el
              agente habla con esta persona. Pero rompe por la ARROBA, no por
              caracteres: `break-all` partía «…@gmail.c / om», que es más difícil
              de leer que la línea larga que evitaba. */}
          <h1 className="text-titulo">
            <Correo email={datos.email} />
          </h1>
          <p className="mt-1.5 text-apoyo text-texto-apoyo">
            {problema ? (
              <Marca icono="bloqueado" tono="problema">
                {estadoLegible(datos.estado, t)}
              </Marca>
            ) : (
              estadoLegible(datos.estado, t)
            )}
            {datos.activadoEn && ` · ${t.enTuRedDesde(formatoDia(datos.activadoEn))}`}
          </p>
        </Banda>

      {/* La mecha primero: es lo único con fecha límite. Va en su propio estrato
          porque es la única parte de la ficha en la que se actúa; el resto se
          mira. */}
              <Banda orden={1} tono={1} etiqueta={t.colaRenovaciones} className="py-6">
          {datos.pro ? (
            <Mecha
              diasRestantes={datos.pro.diasRestantes}
              diasConcedidos={datos.pro.diasConcedidos}
              vigenteHasta={datos.pro.vigenteHasta}
              etiquetas={t}
            />
          ) : (
            <MechaApagada etiquetas={t} />
          )}
          {/* Se renueva AQUÍ, no en otra pantalla. El plazo es siempre un año,
              así que no hay nada que elegir en el camino: mandar al agente a un
              formulario intermedio para pulsar un único botón era un paso que
              solo servía cuando había planes entre los que decidir.

              Pero solo si SE PUEDE. Este botón tenía por única guarda
              `disabled={renovando}`: se pintaba con 300 días de PRO por delante
              y hasta sobre una cuenta bloqueada en Sophon. Ahora aparece cuando
              hay algo que hacer y, cuando no, deja en su sitio el único dato
              accionable que queda —cuándo se libera—. */}
          {datos.proRenovable ? (
            <button
              type="button"
              onClick={renovar}
              disabled={renovando}
              className="chapa pulsable mt-4 w-full text-cuerpo"
            >
              {renovando ? (
                "…"
              ) : (
                <>
                  <Icono nombre={datos.pro ? "renovar" : "pro"} tam={19} />
                  {datos.pro ? t.renovarUnAnio : t.darUnAnio}
                </>
              )}
            </button>
          ) : (
            <p className="mt-3 text-apoyo text-texto-apoyo">
              {t.podrasRenovarloCuandoSeApague}
            </p>
          )}

          {/* Junto al botón que lo provocó, no arriba: así se ve sin buscarlo
              y queda claro qué acción falló. */}
          {errorRenovar && (
            <div className="mt-3">
              <Aviso
                error={errorRenovar.message}
                apoyo={errorRenovar.apoyo}
                onReintentar={renovar}
              />
            </div>
          )}
        </Banda>

              <Banda orden={2} tono={0} etiqueta={t.teHaDado} className="py-6">
          <p className="text-rotulo text-texto-apoyo">{t.teHaDado}</p>
          <div className="mt-1.5">
            <CifraProtagonista micros={BigInt(tot.ganado.micros)} />
          </div>
          <p className="mt-2 text-apoyo tabular-nums text-texto-apoyo">
            {t.registrosEnDias(tot.registros, datos.dias)}
            {tot.usuariosPago > 0 && <> · {t.compraronPro(tot.usuariosPago)}</>}
          </p>

          {/* La mezcla de tiers, como en inicio: una cinta de 8 px y los
              recuentos debajo. La versión anterior ponía el porcentaje entre
              paréntesis junto a cada tier y los tres no cabían en 390 px: «(18
              %)» caía a una segunda línea y la fila se veía rota. La cinta da la
              proporción sin escribirla. */}
          {conTier > 0 && (
            <div className="mt-4">
              <div className="flex h-2 overflow-hidden bg-superficie-alta">
                <BarraCreciente
                  porcentaje={(tot.registrosT1 / conTier) * 100}
                  className="bg-t1"
                />
                <BarraCreciente
                  porcentaje={(tot.registrosT2 / conTier) * 100}
                  className="bg-t2"
                  retardoMs={60}
                />
                <BarraCreciente
                  porcentaje={(tot.registrosT3 / conTier) * 100}
                  className="bg-t3"
                  retardoMs={120}
                />
              </div>
              <div className="mt-2.5 flex gap-4 text-apoyo text-texto-apoyo">
                <Tier color="bg-t1" etiqueta="T1" valor={tot.registrosT1} />
                <Tier color="bg-t2" etiqueta="T2" valor={tot.registrosT2} />
                <Tier color="bg-t3" etiqueta="T3" valor={tot.registrosT3} />
              </div>
            </div>
          )}

          {/* Atribución prospectiva: si no se dice, el agente ve registros
              antiguos sin importe y cree que falta dinero. */}
          {datos.devengaDesde && (
            <p className="mt-4 border-s-2 border-tinta ps-3 text-apoyo text-texto-apoyo">
              {t.cobrasDesde(formatoDia(datos.devengaDesde))}
            </p>
          )}
        </Banda>

              <Banda orden={3} tono={2} etiqueta={t.registroDeSondeo} className="py-6">
          <p className="text-rotulo mb-3 text-texto-apoyo">{t.ultimosDias(datos.dias)}</p>
          {serie.length > 0 ? (
            <TestigoAncho dias={serie} denso etiquetas={t} />
          ) : (
            <p className="text-apoyo text-texto-apoyo">{t.todaviaSinRegistros}</p>
          )}
        </Banda>
    </Pantalla>
  );
}

function Tier({ color, etiqueta, valor }: { color: string; etiqueta: string; valor: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-marca ${color}`} aria-hidden />
      {etiqueta} <span className="cifra">{valor}</span>
    </span>
  );
}

/**
 * Correo que rompe por la arroba.
 *
 * Un correo largo no cabe en 390 px y hay que partirlo por algún sitio.
 * `break-all` parte por donde toque —«…@gmail.c / om»— y `break-words` no parte
 * nada, porque un correo es una sola palabra. La arroba es la única costura
 * natural que tiene.
 */
function Correo({ email }: { email: string }) {
  const corte = email.lastIndexOf("@");
  if (corte < 0) return <span className="break-all">{email}</span>;
  return (
    <span className="break-words">
      {email.slice(0, corte)}
      <wbr />
      {email.slice(corte)}
    </span>
  );
}

/**
 * El estado que publica Sophon, dicho en el idioma del agente.
 *
 * Se traduce en el cliente y no en la API: el estado es un dato del sistema
 * —`BLOQUEADO`, `PENDIENTE_BORRADO`— y traducirlo en el servidor obligaría a
 * que la API supiera el idioma de quien pregunta, que es una responsabilidad
 * que no le toca.
 */
function estadoLegible(estado: string, t: Cadenas): string {
  switch (estado) {
    case "ACTIVO":
      return t.activoEnSophon;
    case "BLOQUEADO":
      return t.bloqueadoEnSophon;
    case "PENDIENTE_BORRADO":
      return t.pendienteDeBorrado;
    case "DESAPARECIDO":
      return t.yaNoApareceEnSophon;
    default:
      return t.estadoSinComprobar;
  }
}

function formatoDia(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a?.slice(2)}`;
}
