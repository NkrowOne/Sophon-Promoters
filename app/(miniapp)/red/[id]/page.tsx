"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { use } from "react";

import { BarraCreciente, CifraProtagonista } from "@/components/Animacion";
import { Icono, type NombreIcono } from "@/components/Icono";
import { Mecha, MechaApagada } from "@/components/Mecha";
import { Aviso, Banda, Cargando, FalloDeCarga, Pantalla, Vacio } from "@/components/Pantalla";
import { TestigoAncho, type DiaAncho } from "@/components/testigo/TestigoAncho";
import { useCadenas, useTelegram } from "@/components/TelegramProvider";
import { ErrorApi, aErrorApi, api, nuevaIdempotencia } from "@/lib/api/cliente";
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
 *
 * ── POR QUÉ NO HAY PLACA, Y QUÉ SE HACE EN SU LUGAR ──
 *
 * Es la única pantalla que no pasa `titulo` ni `placa` a `Pantalla`, y eso no es
 * un descuido: es que aquí **la cabecera es el correo**, que es el identificador
 * con el que el agente habla con esta persona. Las tres salidas están medidas y
 * las tres rompen algo:
 *
 *  · `titulo={datos.email}` no vale: `titulo` es una CADENA, así que el corte
 *    por la arroba —que es todo lo que hace legible un correo largo en 390 px—
 *    no sobrevive, y el `h1` de `Pantalla` no trae reglas de partición: un
 *    correo de treinta caracteres se sale del ancho de la pantalla.
 *  · `titulo={t.webmaster}` pone «Webmaster» en 20 px encima del correo en
 *    20 px, que es la redundancia que `Pantalla` documenta al explicar por qué
 *    con placa no se repite el título.
 *  · `placa` la fija arriba: un correo largo ocupa dos líneas del encabezado
 *    pegajoso para siempre, y la píldora de estado —que vive de tintes
 *    calculados contra `--card`— saldría en claro sobre el casi negro de la
 *    placa, con el aspecto de un recorte de otra pantalla.
 *
 * Así que la banda 0 no inventa una cuarta forma de cabecera: **reproduce la
 * gramática de la placa sobre papel** —rótulo pequeño, identidad grande, línea
 * de apoyo debajo—. La pantalla se anuncia como todas las demás; lo único que
 * cambia es que no va sobre fondo oscuro ni se queda pegada.
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
        setError(aErrorApi(e)),
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
      setErrorRenovar(aErrorApi(e));
    } finally {
      setRenovando(false);
    }
  }, [datos, renovando, haptica, cargar]);

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
          /* Un 404 SIEMPRE trae texto del servidor —ya traducido al idioma de
             la sesión—, así que aquí no hay respaldo genérico que resolver y el
             `message` se pinta tal cual. Es la única rama de error de toda la
             aplicación con texto garantizado. */
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

  const estado = leerEstado(datos.estado, t);
  const tot = datos.totales;
  const conTier = tot.registrosT1 + tot.registrosT2 + tot.registrosT3;

  return (
    <Pantalla>
      <Banda orden={0} tono={0} como="header" className="pb-6">
        {/* El rótulo que sustituye a la placa: dice de qué pantalla se trata en
            13 px en vez de gastar una segunda línea de 20 px repitiendo lo que
            el correo de debajo ya identifica. Ver la nota de cabecera. */}
        <p className="text-rotulo text-texto-apoyo">{t.webmaster}</p>
        {/* El correo entero, sin recortar: es el identificador con el que el
            agente habla con esta persona. Pero rompe por la ARROBA, no por
            caracteres: `break-all` partía «…@gmail.c / om», que es más difícil
            de leer que la línea larga que evitaba. */}
        <h1 className="mt-1 text-titulo">
          <Correo email={datos.email} />
        </h1>
        {/*
          El estado va en PÍLDORA, no en texto con icono.

          Era una `Marca` suelta dentro del mismo párrafo que «en tu equipo desde
          el …», separada por un punto medio: dos cosas de naturaleza distinta
          —un veredicto de Sophon y una fecha nuestra— cosidas en un renglón
          donde ninguna de las dos empezaba en un sitio reconocible. La cápsula
          las separa por forma y no por puntuación, y es además el mismo objeto
          que ya llevan las teselas de `/red`: el agente lo reconoce antes de
          leerlo. Se LEE y no se pulsa, que es lo que la distingue de la chapa.
        */}
        <p className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <span className={`pildora max-w-full ${estado.peligro ? "pildora-peligro" : ""}`}>
            <Icono nombre={estado.icono} tam={13} />
            <span className="truncate">{estado.texto}</span>
          </span>
          {datos.activadoEn && (
            <span className="text-apoyo text-texto-apoyo">
              {t.enTuRedDesde(formatoDia(datos.activadoEn))}
            </span>
          )}
        </p>
      </Banda>

      {/* Lo que esta persona le ha dado, PRIMERO.

          Estaba debajo de la mecha del PRO, bajo el argumento de que la mecha es
          lo único con fecha límite. Tener fecha límite no la hace más importante:
          lo primero que se lee de un webmaster tiene que ser el motivo por el que
          está en la red, y ese motivo es lo que produce. La suscripción es una
          condición del alta, y va después. */}
      <Banda orden={1} tono={1} etiqueta={t.teHaDado} className="py-6">
        {/*
          La cifra va sobre TARJETA DE MARCA: el tinte de amarillo con los arcos
          del isotipo detrás.

          Es el único sitio de la ficha donde el color se extiende, y se lo gana
          la cifra porque es la respuesta de la pantalla —el motivo por el que
          esta persona está en la red—. Sobre la banda desnuda eran tres
          renglones del mismo peso que los de abajo; levantada, se lee de un
          vistazo sin haber subido de tamaño.

          No es amarillo de ACCIÓN y no compite con la chapa: `--brand-tint` es
          papel teñido y los arcos van al 16 % de opacidad. Lo macizo —el campo
          entero— sigue siendo solo del botón de renovar, que es la única chapa
          de esta pantalla.

          La cinta y la nota de atribución se quedan FUERA de la tarjeta: son la
          letra pequeña de la cifra, no parte de ella, y meterlas dentro habría
          hecho de la tarjeta un segundo estrato con todo el contenido de la
          banda, que es exactamente lo que una tarjeta no es.
        */}
        <div className="tarjeta tarjeta-marca motivo-arcos">
          <p className="text-rotulo text-texto-apoyo">{t.teHaDado}</p>
          <div className="mt-1.5">
            <CifraProtagonista micros={BigInt(tot.ganado.micros)} />
          </div>
          <p className="mt-2 text-apoyo tabular-nums text-texto-apoyo">
            {t.registrosEnDias(tot.registros, datos.dias)}
            {tot.usuariosPago > 0 && <> · {t.compraronPro(tot.usuariosPago)}</>}
          </p>
        </div>

        {/* La mezcla de tiers, como en inicio: una cinta de 10 px y los
            recuentos debajo. La versión anterior ponía el porcentaje entre
            paréntesis junto a cada tier y los tres no cabían en 390 px: «(18
            %)» caía a una segunda línea y la fila se veía rota. La cinta da la
            proporción sin escribirla. */}
        {conTier > 0 && (
          <div className="mt-4">
            {/*
              El raíl, con el MISMO reglaje que los demás raíles de la casa:
              `bg-borde` y `rounded-marca`.

              Iba de `bg-superficie-alta`, que es el color de la banda que lo
              contiene —1,000:1 contra ella—, así que la cinta parecía flotar sin
              escala detrás; y sin radio, mientras que la Escalera y la barra del
              hito llevaban el suyo. Dos railes distintos para el mismo objeto,
              en dos pantallas que el agente ve seguidas. Es la misma corrección
              que ya se hizo en `Escalera.tsx`, aplicada al sitio que se quedó
              fuera.
            */}
            <div className="flex h-2.5 overflow-hidden rounded-marca bg-borde">
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
        {/*
          Mecha y botón dentro de una TARJETA, y es lo que hace que se lean como
          una sola cosa: un plazo y lo que se puede hacer con él. Sueltos sobre
          la banda eran una barra y un botón que se tocaban por casualidad.

          Va sobre el estrato de papel —`tono={0}`— y con `--card` también
          blanco: lo que la separa no es el tono sino la sombra en dos capas, que
          es la regla nueva de la casa —la jerarquía la hace el objeto con
          relieve, no un tercer tono de fondo—. En oscuro la sombra desaparece y
          la tarjeta se separa por su canto, ya resuelto en la hoja.
        */}
        <div className="tarjeta">
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
              accionable que queda —cuándo se libera—.

              Es la ÚNICA chapa amarilla de la pantalla, que es la regla: si algo
              no se pulsa, no es amarillo.

              Sin `.pulsable`. Su `:active` declara `background-color:
              var(--superficie-alta)` con más peso que el `background` de
              `.chapa`, así que el botón se ponía GRIS mientras el dedo lo tocaba
              —el color con el que esta misma hoja dice «deshabilitado»—. La
              chapa ya trae su hundimiento y su sombra al pulsar. */}
          {datos.proRenovable ? (
            <button
              type="button"
              onClick={renovar}
              disabled={renovando}
              className="chapa mt-4 w-full text-cuerpo"
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
              <Aviso error={errorRenovar} onReintentar={renovar} />
            </div>
          )}
        </div>
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
            /* Cada enlace, una TARJETA DE BORDE, y el filete no es una variante
               estética: son hasta diez unidades seguidas, y diez sombras en
               columna dejan de levantar nada y se ven como ruido. La lista de
               filetes anteriores —`divide-y`— no delimitaba la unidad por
               arriba, así que la URL de una fila y el recuento de la anterior
               se leían como el mismo bloque. */
            <ul className="mt-4 space-y-2" role="list">
              {enlaces.enlaces.map((e) => (
                <li key={e.enlace} className="tarjeta-borde">
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
                      // icono de 18 px sin caja se queda muy por debajo. El
                      // margen negativo se come justo el relleno de la tarjeta,
                      // así que el objetivo crece sin separar el icono del canto
                      // ni estirar la fila.
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
      {/* `rounded-marca`: la muestra tiene que ser el MISMO objeto que el
          segmento de cinta al que se refiere, radio incluido. */}
      <span className={`h-2.5 w-2.5 rounded-marca ${color}`} aria-hidden />
      {/* La cifra en tinta plena, como la leyenda de la portada: el recuento es
          el dato de la fila y en gris de apoyo pesaba lo mismo que su rótulo. */}
      {etiqueta} <span className="cifra font-semibold text-texto">{valor}</span>
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
 * El estado que publica Sophon: texto, icono y tono, decididos a la vez.
 *
 * Se traduce en el cliente y no en la API: el estado es un dato del sistema
 * —`BLOQUEADO`, `PENDIENTE_BORRADO`— y traducirlo en el servidor obligaría a
 * que la API supiera el idioma de quien pregunta, que es una responsabilidad
 * que no le toca.
 *
 * Los tres salen de la MISMA rama para que no puedan desincronizarse, que es lo
 * que ya se hizo en la Malla: allí el icono se eligió aparte del texto una vez y
 * hubo que atarlos. Aquí el icono es lo que hace que la píldora se reconozca sin
 * leerla.
 *
 * **«Confirmando» no es un problema**, y esto era un defecto: la guarda era
 * `estado !== "ACTIVO"` a secas, así que un alta de hace diez minutos —vinculada
 * en Sophon pero todavía sin publicar en el programa de socios— se pintaba en
 * rojo de peligro con el icono de cuenta bloqueada, mientras su tesela en `/red`
 * la contaba como correcta. Dos lecturas del mismo estado en dos pantallas
 * seguidas. La regla es la de la Malla: solo es incidencia lo que el agente no
 * puede arreglar esperando.
 */
function leerEstado(
  estado: string,
  t: Cadenas,
): { texto: string; icono: NombreIcono; peligro: boolean } {
  switch (estado) {
    case "ACTIVO":
      return { texto: t.activoEnSophon, icono: "activo", peligro: false };
    case "BLOQUEADO":
      return { texto: t.bloqueadoEnSophon, icono: "bloqueado", peligro: true };
    case "PENDIENTE_BORRADO":
      return { texto: t.pendienteDeBorrado, icono: "seBorra", peligro: true };
    case "DESAPARECIDO":
      return { texto: t.yaNoApareceEnSophon, icono: "desaparecido", peligro: true };
    // Vinculado, pero Sophon todavía no lo ha publicado en el programa de
    // socios. Se dice como lo que es —un trámite en curso— y no como un fallo.
    case "PENDIENTE_CONFIRMACION":
      return { texto: t.pendienteDeConfirmar, icono: "reintentar", peligro: false };
    // Un estado que no conocemos no es una avería: es que no lo hemos podido
    // comprobar. Va en neutro con el icono de aviso, porque teñirlo de peligro
    // sería acusar a Sophon de algo que no ha dicho.
    default:
      return { texto: t.estadoSinComprobar, icono: "aviso", peligro: false };
  }
}

function formatoDia(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a?.slice(2)}`;
}
