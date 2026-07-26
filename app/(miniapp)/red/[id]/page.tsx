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
 * Tres preguntas, en este orden: **cuánto me da**, **cuándo le caduca el PRO** y
 * **con qué está captando**.
 *
 * El orden cambió. La mecha del PRO iba primero, con el argumento de que era lo
 * único con fecha límite; pero tener fecha límite no la hace más importante que
 * el motivo por el que esa persona está en la red. Lo primero que se lee de un
 * webmaster es lo que produce.
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

interface EnlaceReparto {
  enlace: string;
  registros: number;
  usuariosPago: number;
  pagado: { micros: string; texto: string };
}

interface RespuestaEnlaces {
  dias: number;
  enlaces: EnlaceReparto[];
  /** Ausente = fue bien. En falso = Sophon no contestó. */
  disponible?: boolean;
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

  /*
   * Los enlaces van en su PROPIA petición y su propio estado.
   *
   * Vienen de una llamada en vivo a Sophon, así que son lo único de esta
   * pantalla que puede tardar o no llegar. Metidos en la petición de la ficha,
   * un timeout de Sophon habría dejado al agente sin ver ni lo que ha ganado ni
   * cuándo le caduca el PRO —que salen de nuestra base de datos y siempre se
   * pueden responder—. Separados, la ficha se pinta entera y la banda de
   * enlaces es la única que se queda esperando.
   *
   * `null` es «todavía no ha contestado»; una lista vacía con `disponible` en
   * falso es «Sophon no está»; y vacía con `disponible` es «no ha repartido
   * ninguno». Son tres estados distintos y la pantalla dice cosas distintas.
   */
  const [enlaces, setEnlaces] = useState<RespuestaEnlaces | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

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

  useEffect(() => {
    // Sin `catch` que pinte error: la ruta ya devuelve 200 con `disponible` en
    // falso cuando Sophon no contesta, y un fallo de red aquí tampoco es algo
    // que el agente pueda arreglar. Se queda sin banda y ya está.
    api
      .get<RespuestaEnlaces>(`/api/agente/webmaster/${encodeURIComponent(id)}/enlaces`)
      .then(setEnlaces)
      .catch(() => setEnlaces({ dias: 0, enlaces: [], disponible: false }));
  }, [id]);

  const copiar = useCallback(
    async (enlace: string) => {
      try {
        await navigator.clipboard.writeText(enlace);
        haptica("exito");
        setCopiado(enlace);
        setTimeout(() => setCopiado((c) => (c === enlace ? null : c)), 1600);
      } catch {
        // Sin portapapeles no hay nada que decir: el enlace está en pantalla y
        // se puede seleccionar a mano.
      }
    },
    [haptica],
  );

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

      {/* Lo que esta persona le ha dado, PRIMERO.

          Estaba debajo de la mecha del PRO, bajo el argumento de que la mecha es
          lo único con fecha límite. Tener fecha límite no la hace más importante:
          lo primero que se lee de un webmaster tiene que ser el motivo por el que
          está en la red, y ese motivo es lo que produce. La suscripción es una
          condición del alta, y va después. */}
              <Banda orden={1} tono={1} etiqueta={t.teHaDado} className="py-6">
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

      {/* Y después la suscripción. Sigue siendo la única parte de la ficha en la
          que se actúa, y por eso conserva su estrato propio y su botón: bajarle
          el peso es cambiarla de sitio, no quitarle nada. */}
              <Banda orden={2} tono={0} etiqueta={t.colaRenovaciones} className="py-6">
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

              <Banda orden={3} tono={2} etiqueta={t.registroDeSondeo} className="py-6">
          <p className="text-rotulo mb-3 text-texto-apoyo">{t.ultimosDias(datos.dias)}</p>
          {serie.length > 0 ? (
            <TestigoAncho dias={serie} denso etiquetas={t} />
          ) : (
            <p className="text-apoyo text-texto-apoyo">{t.todaviaSinRegistros}</p>
          )}
        </Banda>

      {/* Con qué capta.

          `share_link/list` llevaba implementado en el cliente de Sophon desde
          el principio sin un solo llamante, y es lo más cerca que está la
          aplicación de servir al trabajo comercial: saber qué enlace le
          funciona a un webmaster es lo que permite decirle algo útil cuando se
          le llama. La banda no aparece mientras Sophon no conteste: es
          información de apoyo, no un requisito de la ficha.

          Y cuando contesta con la lista VACÍA, la banda sí aparece y lo dice. Un
          webmaster que no ha repartido un solo enlace no es un hueco que
          convenga esconder: es justo al que hay que llamar, y ocultarlo dejaría
          su ficha idéntica a la de uno que reparte diez. */}
      {enlaces && (
        <Banda orden={4} tono={0} etiqueta={t.susEnlaces} className="py-6">
          <p className="text-rotulo text-texto-apoyo">{t.susEnlaces}</p>
          <p className="mt-1 text-apoyo text-texto-apoyo">
            {enlaces.disponible === false
              ? t.enlacesNoDisponibles
              : enlaces.enlaces.length === 0
                ? t.sinEnlaces
                : t.conQueCapta}
          </p>

          {enlaces.enlaces.length > 0 && (
            <ul className="mt-4 divide-y divide-junta" role="list">
              {enlaces.enlaces.map((e) => (
                <li key={e.enlace} className="py-3 first:pt-0 last:pb-0">
                  {/* El enlace y su botón de copiar en la misma fila. Copiar es
                      lo único que se hace con un enlace desde un móvil —no se
                      transcribe a mano una URL con parámetros—, y el icono
                      `copiar` ya existía en el juego sin ningún consumidor. */}
                  <div className="flex items-start gap-2">
                    {/* `overflow-wrap:anywhere` y NO `break-all`.
                        `break-all` corta en cualquier carácter aunque quepa un
                        salto mejor dos posiciones antes, y dejaba una «m» sola
                        en la última línea de una URL con `?src=telegram`. Es el
                        mismo defecto que ya se corrigió en el correo de la
                        cabecera («…@gmail.c / om»). Con `anywhere` el navegador
                        prefiere los puntos de corte naturales —tras `/`, `?`,
                        `&`— y solo parte una palabra cuando no hay más
                        remedio. */}
                    <p className="min-w-0 flex-1 text-apoyo [overflow-wrap:anywhere]">
                      {e.enlace}
                    </p>
                    <button
                      type="button"
                      onClick={() => copiar(e.enlace)}
                      // 44×44 reales: es la regla táctil de toda la app, y un
                      // icono de 18 px sin caja se queda muy por debajo.
                      className="pulsable -m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-texto-apoyo"
                      aria-label={t.enlaceCopiado}
                    >
                      <Icono
                        nombre={copiado === e.enlace ? "activo" : "copiar"}
                        tam={18}
                      />
                    </button>
                  </div>
                  <p className="mt-1 text-apoyo tabular-nums text-texto-apoyo">
                    {t.registrosCortos(e.registros)}
                    {e.usuariosPago > 0 && <> · {t.dePago(e.usuariosPago)}</>}
                    {e.pagado.micros !== "0" && <> · {e.pagado.texto}</>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Banda>
      )}
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
