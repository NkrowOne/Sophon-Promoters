"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { BarraCreciente, CifraProtagonista } from "@/components/Animacion";
import { Escalera, type Cartera } from "@/components/Escalera";
import { Icono, type NombreIcono } from "@/components/Icono";
import { Isotipo } from "@/components/Isotipo";
import { Aviso, Banda, Cargando, Placa, Vacio } from "@/components/Pantalla";
import type { DiaTestigo } from "@/components/testigo/TestigoAncho";
import { useCadenas, useTelegram } from "@/components/TelegramProvider";
import { ErrorApi, aErrorApi, api } from "@/lib/api/cliente";
import { useRecurso } from "@/lib/api/recurso";
import type { Cadenas } from "@/lib/i18n";

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
 *
 * ── DÓNDE ESTÁ EL RELIEVE ──
 *
 * La pantalla era una pila de bandas planas: cinco estratos de papel casi del
 * mismo valor, sin un solo objeto levantado. Es la mitad de «lo veo muy soso».
 * Ahora hay exactamente **dos objetos con sombra**, y los dos son el mismo tipo
 * de cosa —una respuesta cerrada que se puede leer sola—:
 *
 *   · la tarjeta del bono, que además lleva la malla de marca por detrás: es
 *     la única de la portada donde el color tiene permiso para extenderse;
 *   · la tarjeta de la escalera del saldo.
 *
 * Lo denso NO lleva sombra: los cuatro escalones del bono van de filete
 * (`.tarjeta-borde`) porque cuatro sombras seguidas en una fila de 82 px son
 * ruido, no jerarquía. La regla que las separa sigue en pie y aquí se cumple
 * literalmente: **una tarjeta nunca contiene bandas**, así que los escalones,
 * el ritmo y la lista de quién acerca cuelgan de la banda y no de la tarjeta.
 *
 * ── EL AMARILLO, UNA VEZ ──
 *
 * Hay UNA chapa en toda la pantalla, y ni una gota más de campo. Los estados
 * —«ya es tuyo»—, los escalones alcanzados y la barra del bono se distinguen
 * por CONTRASTE sobre la escala neutra, que es de lo que va el sistema entero:
 * el amarillo se ve muchísimo porque aparece muy poco.
 */

interface DiaApi extends Omit<DiaTestigo, "importeMicros"> {
  importeMicros: string;
  importe: string;
  registros: number;
  usuariosPago: number;
}

interface Escalon {
  usuarios: number;
  premio: { micros: string; texto: string };
  alcanzado: boolean;
}

interface Hito {
  registros: number;
  ganado: { micros: string; texto: string };
  siguiente: {
    usuarios: number;
    faltan: number;
    premio: { micros: string; texto: string };
    /**
     * Lo que se gana DE MÁS al llegar al siguiente escalón.
     *
     * No es lo mismo que `premio`: el bono no es acumulable, así que quien ya
     * ha alcanzado un escalón solo cobra la diferencia. Es la cifra que se
     * anuncia cuando hay algo ganado, para que no se cuente dos veces.
     */
    incremento: { micros: string; texto: string };
  } | null;
  escalones: Escalon[];
  /** Registros al día en el mes en curso, con un decimal. */
  ritmo: number;
  /** Registros a los que se cerraría el mes a ese ritmo. */
  proyeccion: number;
  diasRestantes: number;
  /** `AAAA-MM-DD` en que se alcanzaría el siguiente escalón, o `null` si no da tiempo. */
  llegaEl: string | null;
  /** Registros del mes cerrado anterior, o `null` si es el primer mes. */
  mesAnterior: number | null;
  porWebmaster: { webmasterId: string; email: string; registros: number }[];
}

interface Resumen {
  dias: DiaApi[];
  webmasters: number;
  cartera: Cartera;
  /** `null` cuando no hay escalera configurada: entonces la banda no se pinta. */
  hito: Hito | null;
}

export default function Inicio() {
  // Deliberadamente NO se bloquea el render esperando a Telegram. El puente solo
  // aporta tema y háptica; si tarda o falla —WebView antiguo, script bloqueado,
  // la app abierta fuera de Telegram— la pantalla debe seguir siendo legible.
  useTelegram();
  const t = useCadenas();

  /*
   * Los datos SOBREVIVEN a salir de esta pantalla y volver.
   *
   * Estaban en estado del componente, y React lo tira al desmontar: pulsar
   * «atrás» desde la red reconstruía la portada desde cero. Medido con el
   * navegador: a los 80, 200 y 400 ms se veía solo el menú con «Cargando
   * datos…», y la cabecera con la cifra no aparecía hasta pasados 800. Ir a la
   * red y volver es EL gesto de esta aplicación, así que ese destello salía en
   * cada viaje.
   *
   * `useRecurso` guarda la última respuesta fuera del árbol de React y pinta con
   * ella en el primer fotograma, refrescando por detrás. Ver `lib/api/recurso.ts`.
   */
  const { datos, error, recargar: cargar } = useRecurso<Resumen>("/api/agente/resumen");

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

  // Sin sesión no hay datos que enseñar: la portada cede el sitio a la pantalla
  // de bienvenida, que es la que presenta el producto.
  if (error && error.estado === 401) return <Bienvenida etiquetas={t} />;

  const cartera = datos?.cartera;

  /*
   * El puesto de cada banda en la secuencia de entrada.
   *
   * Se calcula y no se escribe a mano porque las tres primeras son CONDICIONALES:
   * sin tiers no hay Cinta, sin escalera configurada no hay hito, y sin cartera
   * no hay Escalera. Numerarlas a ojo dejaría huecos en el escalonado en cuanto
   * falte una, que es justo lo que pasaba con las reglas `nth-child` que esto
   * sustituye —y lo que dejó sin retardo a la banda del bono en cuanto se
   * insertó en medio—.
   */
  const visibles = [totalTiers > 0, Boolean(datos?.hito), Boolean(cartera)];
  const orden = (i: number) => visibles.slice(0, i).filter(Boolean).length;

  /*
   * ¿Está el estado vacío ofreciendo YA esta misma acción?
   *
   * Con la red a cero, `Vacio` pinta su propia chapa «Activar webmaster» hacia
   * `/activar`, y el menú de abajo pintaba otra idéntica: mismo texto, mismo
   * icono, mismo destino, dos bloques amarillos de 50 px separados por una
   * junta. La primera pantalla que ve un agente nuevo ofrecía la misma cosa dos
   * veces.
   *
   * Gana la del vacío, que es la que está pegada al texto que la motiva. Y esto
   * NO reabre el callejón que sacó el menú del ternario: sus tres filas siguen
   * ahí, y en las ramas de error y de carga —que no pintan `Vacio`— la chapa se
   * sigue pintando, que es donde de verdad hacía falta.
   */
  const vacioYaOfreceActivar =
    !error && Boolean(datos) && dias.length === 0 && datos?.webmasters === 0;

  return (
    <main className="relative min-h-dvh">
      {/* La Placa: lo devengado del mes sobre el degradado casi negro, con la
          malla y el arco del isotipo por detrás. Es la identidad y es el dato,
          en la misma pieza, y está terminada: aquí no se toca. Solo aparece
          cuando hay una respuesta que dar —sin datos todavía no hay nada que
          plantear—, y esa misma condición gobierna el relleno de abajo. */}
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

      {/* Sin relleno superior cuando hay placa: la primera banda MUERDE la placa
          en vez de dejar una franja de fondo entre las dos, que se lee como una
          costura mal cerrada justo debajo de la pieza que abre la pantalla. La
          condición es literalmente la misma que decide si la placa se pinta, así
          que no pueden desincronizarse. Y en esa rama el primer hijo es siempre
          una banda con su propio `py-6` —la Cinta, o el bono si no hay tiers—,
          así que el aire no se pierde: cambia de dueño. */}
      <div
        className={datos && dias.length > 0 ? "pb-16" : "pb-16 pt-6"}
        style={{ paddingInline: "var(--margen-pantalla)" }}
      >
        {error ? (
          <Aviso error={error} onReintentar={cargar} />
        ) : !datos ? (
          <Cargando que={t.sondeando} />
        ) : dias.length === 0 ? (
          <Vacio
            titulo={datos.webmasters === 0 ? t.sinWebmasters : t.sinIngresos}
            apoyo={datos.webmasters === 0 ? t.sinWebmastersApoyo : t.sinIngresosApoyo}
            /*
             * Con equipo pero sin registros, el vacío se queda SIN chapa.
             *
             * Ofrecía «Ver mi equipo» y el menú de abajo seguía pintando
             * «Activar webmaster»: dos chapas amarillas en la misma pantalla, y
             * el amarillo solo significa algo si hay una. La que se retira es la
             * del vacío, y por dos motivos: su destino ya está tres filas más
             * abajo —con el recuento al lado, que la chapa no tenía— y la que
             * queda es la acción de la aplicación, no una navegación.
             *
             * `vacioYaOfreceActivar` cubre el caso simétrico: con la red a cero
             * es el vacío el que se queda la chapa y el menú el que la cede.
             */
            accion={
              datos.webmasters === 0
                ? { texto: t.activarWebmaster, href: "/activar", icono: "activar" as const }
                : undefined
            }
          />
        ) : (
          <>
            {/* La Cinta: una sola marca de 8 px responde «¿de dónde viene el
                volumen?». Sustituye a tres donuts y ocupa una décima parte. */}
            {totalTiers > 0 && (
              <Banda tono={1} etiqueta={t.repartoPorTier} orden={orden(0)} className="py-6">
                <p className="mb-2.5 text-rotulo text-texto-apoyo">{t.repartoPorTier}</p>
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
              </Banda>
            )}

            {/* El bono del mes. Va entre la Cinta y la Escalera porque es la
                secuencia correcta de preguntas: de dónde viene el volumen →
                cuánto vale el premio y a cuánto estoy → dónde está mi dinero.

                Sin amarillo: el amarillo es la ACCIÓN, y un progreso no se
                pulsa. Y sin medallas ni rachas: la regla de voz de la casa dice
                que el agente es un profesional que cobra, no alguien a quien
                haya que animar. La recompensa es dinero y con enseñarla bien
                basta. */}
            {datos?.hito && <BandaHito hito={datos.hito} etiquetas={t} orden={orden(1)} />}

            {/* La Escalera: el dinero es un flujo con estados, no cuatro saldos
                sueltos. Cuatro tarjetas KPI perderían justo esa secuencia.

                Va DENTRO de una tarjeta, y el estrato que la aloja es el más
                oscuro de los tres: la escalera es una respuesta cerrada —los
                cuatro estados de un mismo dinero— y como objeto levantado se lee
                de un vistazo como una sola cosa. Suelta sobre la banda eran
                cuatro renglones que había que agrupar con la vista.

                La nota de las revisiones se queda FUERA. Es una condición del
                servicio, no un peldaño más: metida dentro se leería como si
                formara parte del saldo. */}
            {cartera && (
              <Banda como="div" tono={2} orden={orden(2)} className="py-6">
                <div className="tarjeta">
                  <Escalera cartera={cartera} titulo={t.cartera} etiquetas={t} />
                </div>
                <p className="mt-3 text-apoyo text-texto-apoyo">{t.revisionManual}</p>
              </Banda>
            )}
          </>
        )}

        {/* La navegación va SIEMPRE, fuera del ternario.
            Vivía dentro de la última rama, así que un error de la API o una
            ventana de treinta días sin devengo dejaban la portada —la única
            pantalla con enlaces a todo lo demás— sin una sola salida. El agente
            se quedaba encerrado en un aviso con un botón de reintentar. */}
        <Banda como="nav" tono={0} etiqueta={t.acciones} orden={orden(3)} className="py-6">
          {/*
            LA ÚNICA CHAPA DE LA PANTALLA, y por tanto el único amarillo. Se cede
            cuando el estado vacío ya la está ofreciendo: con la red a cero eran
            dos bloques amarillos idénticos, uno debajo del otro. Ver
            `vacioYaOfreceActivar` arriba, y la nota del vacío para el caso
            simétrico —equipo sin registros—.
          */}
          {!vacioYaOfreceActivar && (
            <Link href="/activar" className="chapa pulsable text-cuerpo">
              <Icono nombre="activar" />
              {t.activarWebmaster}
            </Link>
          )}

          {/* Tres filas en el orden de la jornada, cada una con su dato. Antes
              era una retícula de 2×2 con cuatro cajas idénticas y vacías: el
              menú por defecto de cualquier app, y cuatro toques a ciegas.

              Cada una lleva ahora su ICONO delante y su chevron detrás. El icono
              hace que la fila se reconozca sin leerla —es la diferencia entre un
              menú y una lista de palabras— y el chevron dice que lleva a algún
              sitio, que es lo que distingue una fila de navegación de una fila
              de datos. La aplicación no tenía ni uno.

              **Y ya no está «Renovaciones».** Era la segunda de cuatro, o sea el
              segundo sitio de más valor de toda la aplicación, y renovar el PRO
              no es a lo que viene un agente: viene a ver su red y su dinero. El
              PRO se sigue dando —cada alta concede un año— y se sigue pudiendo
              renovar desde la ficha de la persona a la que se le concede, que es
              donde la decisión tiene contexto. Lo que se retira es el peso, no
              la capacidad: `/pro` sigue existiendo, se llega por el comando del
              bot y desde la ficha. */}
          <ul className="mt-3 divide-y divide-junta" role="list">
            <Fila href="/red" icono="red" etiqueta={t.red} dato={datos ? String(datos.webmasters) : null} />
            {/* Los precios van SIN dato a la derecha, y es lo correcto: las
                otras tres filas llevan una cifra que cambia —cuántos, cuánto—
                y esta lleva a una tabla que es la misma para todo el mundo.
                Ponerle un número inventado —«3 tiers»— sería llenar la columna
                por simetría.

                Y va la tercera, entre el equipo y el dinero: se abre mientras
                se capta, que es justo lo que hay entre tener equipo y cobrar
                por él. */}
            <Fila href="/precios" icono="pro" etiqueta={t.precios} />
            <Fila href="/historico" icono="historico" etiqueta={t.historico} />
            <Fila
              href="/cartera"
              icono="cartera"
              etiqueta={t.cartera}
              dato={cartera ? cartera.disponible.texto : null}
            />
          </ul>
        </Banda>
      </div>
    </main>
  );
}

/**
 * La bienvenida: lo primero que ve quien abre la Mini App sin sesión.
 *
 * Era un estado vacío del montón —«Aquí no hay sesión abierta», alineado arriba
 * a la izquierda, con dos tercios de pantalla en negro debajo—. Decía el estado
 * del servidor, no lo que es esto, y una primera frase que describe un 401 hace
 * parecer roto un producto que funciona.
 *
 * Tres decisiones, y las tres son de sistema y no de gusto:
 *
 *  · **La marca preside.** Es la SEGUNDA pantalla que puede llevar isotipo —la
 *    otra es `/alta`— y por el mismo motivo escrito en la prop `marca` de
 *    `Pantalla`: el agente todavía no sabe dónde está. Va a 104 px porque aquí
 *    identifica sola, sin título de pantalla que la acompañe; en `/alta` va a 64
 *    porque encabeza un formulario.
 *  · **Centrada y a media altura.** Es la única pantalla de la aplicación que se
 *    centra, y puede serlo porque es la única sin datos: no hay ninguna columna
 *    de cifras con la que alinearse. En cuanto hay datos manda el borde de
 *    inicio, que es de donde arranca la lectura.
 *  · **Una sola chapa**, la de siempre. El isotipo va en tinta y no en amarillo:
 *    el amarillo es la acción y ya tiene dueño tres renglones más abajo.
 *
 * No anima nada. La entrada escalonada de las bandas mide la profundidad de una
 * pila de estratos, y aquí hay un bloque suelto: escalonarlo sería usar la
 * gramática de otra cosa.
 */
function Bienvenida({ etiquetas: t }: { etiquetas: Cadenas }) {
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center pb-16 text-center"
      /* El margen sale de la VARIABLE y no de `px-4`: al subir el margen de
         pantalla de 16 a 18 px, aquel literal se quedó atrás y esta pantalla
         sangraba 2 px distintos de todas las demás. */
      style={{ paddingInline: "var(--margen-pantalla)" }}
    >
      {/* Con `titulo`, así que la marca ES la identificación y un lector de
          pantalla la lee. Muda —como en el resto de la aplicación— solo cuando
          va acompañada del nombre escrito, y aquí no lo está. */}
      <Isotipo ancho={104} titulo="Sophon" className="text-texto" />

      {/* `h1` y no `p`: esta pantalla no tiene otra cabecera, y una pantalla sin
          encabezado de nivel 1 deja al lector de pantalla sin punto de entrada. */}
      <h1 className="mt-7 text-titulo">{t.bienvenida}</h1>

      {/* `max-w-[34ch]`: sin tope, en una tablet la línea de apoyo se estira a
          todo el ancho y centrada se vuelve ilegible —el ojo pierde el comienzo
          del renglón siguiente—. En un móvil no cambia nada. */}
      <p className="mt-2.5 max-w-[34ch] text-cuerpo text-texto-apoyo">{t.bienvenidaApoyo}</p>

      {/* La chapa es de ancho completo por definición, y en una columna centrada
          un hijo de flex se encoge a su contenido: sin `w-full` saldría un botón
          del ancho de su texto, que es la forma de la píldora —lo que se LEE— y
          no la del control. El tope de 20 rem impide que en pantalla ancha se
          convierta en una barra de lado a lado. */}
      <Link href="/alta" className="chapa pulsable mt-8 w-full max-w-[20rem] text-cuerpo">
        {t.acceder}
      </Link>
    </main>
  );
}

function Leyenda({ color, etiqueta, valor }: { color: string; etiqueta: string; valor: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {/* `rounded-marca`: 3 px. La muestra de la leyenda tiene que ser el MISMO
          objeto que el segmento de la cinta al que se refiere, y un dato con la
          esquina blanda de un control mentiría sobre dónde acaba el valor. */}
      <span className={`h-2.5 w-2.5 rounded-marca ${color}`} aria-hidden />
      {etiqueta} <span className="cifra font-semibold text-texto">{valor}</span>
    </span>
  );
}

/**
 * Fila del menú: destino y estado en el mismo renglón.
 *
 * `min-h-14` son 56 px, muy por encima del mínimo táctil de 44: es una lista de
 * navegación que se usa con el pulgar y de pie.
 */
function Fila({
  href,
  icono,
  etiqueta,
  dato,
}: {
  href: string;
  icono: NombreIcono;
  etiqueta: string;
  dato?: string | null;
}) {
  return (
    <li>
      {/*
        `Link` y no `<a>`.
        Un ancla pelada en el App Router provoca una RECARGA COMPLETA: documento
        nuevo, contexto de JavaScript nuevo y todo el paquete otra vez. Eso hacía
        que cada salto desde la portada fuera una carga en frío —con su destello
        y sus animaciones de entrada repetidas— y, sobre todo, que volver atrás
        reconstruyera la portada desde cero en vez de repintarla al instante.
      */}
      <Link href={href} className="pulsable -mx-2 flex min-h-14 items-center gap-3 rounded-control px-2 text-cuerpo">
        {/*
          El icono va en su propia cápsula, y es lo que convierte una lista de
          palabras en un menú que se reconoce sin leerlo: tres cuadrados en
          columna se ven antes que tres nombres.

          La cápsula es NEUTRA y no de tinte de marca, que es lo que hace el kit.
          Medido: `--brand-tint` es `#FEF9E3` y sobre el papel blanco de esta
          banda da 1,04:1 —o sea, no se ve—. Un tinte invisible no dibuja la
          cápsula y encima gasta la regla del amarillo a cambio de nada. El
          filete la define en claro, el relleno en oscuro, y el trabajo lo hace
          el contraste sobre la escala neutra, como en el resto del sistema.

          El icono va del T1 —la tinta densa de los datos— y no del texto: así la
          columna se lee como una sola cosa y no compite con los nombres.
        */}
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-borde bg-superficie-alta text-t1">
          <Icono nombre={icono} tam={19} />
        </span>
        <span>{etiqueta}</span>
        {dato && <span className="cifra ms-auto text-apoyo text-texto-apoyo">{dato}</span>}
        <Icono nombre="avance" tam={18} className={`text-texto-apoyo ${dato ? "" : "ms-auto"}`} />
      </Link>
    </li>
  );
}

/**
 * ¿Ha pedido el sistema menos movimiento?
 *
 * Se consulta desde JavaScript en vez de dejárselo al CSS porque la regla de
 * `prefers-reduced-motion` de `globals.css` conserva a propósito las
 * transiciones de opacidad —lo que molesta a quien activa la preferencia es que
 * las cosas se desplacen, no que algo se atenúe—, y el encendido de los
 * escalones es opacidad CON RETARDO: hasta 580 ms mirando media escalera
 * apagada. Con la preferencia puesta se pinta encendida desde el primer
 * fotograma.
 */
function prefiereQuietud(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * El bono del mes: dónde vas, a qué ritmo y quién te está llevando.
 *
 * ── La decisión que gobierna esta banda ──
 *
 * Con los umbrales sembrados —10.000 registros para el primer escalón— la barra
 * del hito va a marcar poco durante mucho tiempo, y eso NO se arregla tocando la
 * barra. Distorsionar la escala de un eje de valor para que un 7 % parezca más
 * es mentir sobre la distancia que queda, y a la tercera vez que el agente hace
 * la división a mano deja de creerse todo lo demás.
 *
 * Lo que se hace es añadir medidas cuyo punto de referencia es el propio agente
 * y no la meta lejana: el ritmo, la proyección de cierre, los días que quedan y
 * la comparación con el mes pasado. Todas se mueven cada día aunque el objetivo
 * esté lejos. La barra sigue diciendo la verdad; lo que cambia es que ya no
 * está sola diciéndola.
 *
 * ── Quién preside la banda ──
 *
 * El dinero, y antes no era así. Nada de la banda pasaba de 16 px: lo más
 * grande era el recuento de registros —«21.840 este mes»— y el importe del
 * premio aparecía tres veces, las tres a 14 px y una de ellas al 80 % de
 * opacidad. Un agente que ya había ganado 100 $ se enteraba por una línea de
 * apoyo en una esquina. Ahora la cifra que manda es la del premio, con la misma
 * `CifraProtagonista` que la Placa y la ficha del webmaster, y el recuento baja
 * a la línea de métricas, que es su sitio: es la medida, no la respuesta.
 *
 * ── Cómo se reparte en objetos ──
 *
 * La banda contesta tres preguntas encadenadas y cada una tiene su forma, que es
 * lo que la sacó de ser una columna de nueve renglones del mismo peso:
 *
 *   dónde estoy    → TARJETA con relieve y malla de marca. Es la respuesta.
 *   cómo es el juego → cuatro tarjetas de filete, una por escalón.
 *   quién me lleva  → lista de filas enlazadas, densa y sin caja.
 *
 * Las tres cuelgan de la banda y no unas de otras: una tarjeta es un objeto
 * DENTRO de un estrato, y meter la escalera o la lista dentro de la tarjeta la
 * convertiría en un contenedor de secciones, que es justo lo que la banda ya es.
 *
 * ── Lo que no se hace ──
 *
 * Ni medallas, ni insignias, ni confeti, ni rachas como trofeo. La regla de voz
 * de `lib/i18n.ts` es explícita: el agente es un profesional que cobra, no
 * alguien a quien haya que animar. Y sin amarillo: el amarillo es la ACCIÓN, y
 * un progreso no se pulsa.
 */
function BandaHito({
  hito,
  etiquetas: t,
  orden,
}: {
  hito: Hito;
  etiquetas: Cadenas;
  orden: number;
}) {
  const meta = hito.siguiente?.usuarios ?? hito.escalones[hito.escalones.length - 1]?.usuarios ?? 0;
  /*
   * La escala es el escalón SIGUIENTE, no el más alto de la escalera.
   *
   * Contra la escalera entera, 720 de 30.000 es un 2,4 % y la barra no se ve
   * nunca. Contra el siguiente peldaño es un 7,2 %, que ya es una marca. Y no
   * engaña, porque el peldaño al que se refiere está escrito debajo con su
   * premio; lo que la barra mide es exactamente lo que dice medir.
   */
  const porcentaje = meta > 0 ? Math.min(100, (hito.registros / meta) * 100) : 0;

  const variacion =
    hito.mesAnterior && hito.mesAnterior > 0
      ? Math.round(((hito.registros - hito.mesAnterior) / hito.mesAnterior) * 100)
      : null;

  /*
   * Qué cifra preside y qué dice la línea de debajo.
   *
   * Tres estados, y en los tres el protagonista es dinero:
   *
   *  · sin ningún escalón alcanzado → preside lo que se llevaría, y la línea de
   *    apoyo dice a cuántos registros está.
   *  · con escalón alcanzado y otro por delante → preside lo ya ganado, con la
   *    marca de que es suyo, y el apoyo dice lo que se gana DE MÁS. No el premio
   *    entero del escalón siguiente: como el bono no es acumulable, enseñarlo
   *    hacía que el agente sumara dos veces el dinero que ya tiene.
   *  · sin escalón siguiente → preside lo ganado y el apoyo dice que no hay más
   *    nivel este mes.
   */
  const yaHaGanado = hito.ganado.micros !== "0";
  const preside = yaHaGanado || !hito.siguiente ? hito.ganado : hito.siguiente.premio;
  const apoyo = !hito.siguiente
    ? t.bonoMaximoAlcanzado
    : yaHaGanado
      ? t.bonoMasSiLlegas(hito.siguiente.incremento.texto, hito.siguiente.usuarios)
      : t.bonoExtraSi(hito.siguiente.usuarios);

  /*
   * El encendido de los escalones ya alcanzados.
   *
   * Arranca apagado y se enciende en el primer fotograma útil; el CUÁNDO de
   * cada uno va en su propio `transitionDelay`, más abajo. Con la preferencia
   * de movimiento reducido nace ya encendido, así que la transición no llega a
   * dispararse nunca.
   */
  const [encendido, setEncendido] = useState(prefiereQuietud);

  useEffect(() => {
    if (prefiereQuietud()) return;
    const id = requestAnimationFrame(() => setEncendido(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <Banda tono={0} etiqueta={t.bonoDelMes} orden={orden} className="py-6">
      {/*
        LA TARJETA DEL BONO: el único objeto de la portada que lleva color.

        Es la pieza que responde «cuánto vale el premio y a cuánto estoy», y
        antes eran seis renglones sueltos sobre el papel de la banda, del mismo
        peso que la nota de las revisiones que hay dos estratos más abajo. Con
        relieve se lee como UNA respuesta: la cifra, su estado, la medida y lo
        que la medida significa, todo dentro del mismo canto.

        `campo-malla` mete la malla de marca por detrás —amarillo muy diluido,
        arriba a la izquierda—. Es LA respuesta a «hazlo más vibrante» que el
        sistema autoriza: el color se extiende en los motivos, no en los bloques.
        Y va aquí y en ningún otro sitio de la pantalla, porque un motivo
        repetido cinco veces deja de ser un motivo y pasa a ser un fondo.

        Nada de `motivo-arcos` encima: la placa ya trae su arco a 300 px de aquí,
        y dos veces la misma geometría en la primera pantalla de scroll es
        firmar dos veces el mismo papel.
      */}
      <div className="tarjeta campo-malla">
        <p className="text-rotulo text-texto-apoyo">{t.bonoDelMes}</p>

        {/* El premio, del tamaño que le corresponde. El estado va al lado y no
            debajo: «ya es tuyo» es un predicado de esa cifra, no otro dato. */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <CifraProtagonista micros={BigInt(preside.micros)} />
          {yaHaGanado && (
            /*
              Píldora NEUTRA, y las dos alternativas se descartaron por medida:

               · `pildora-marca` es campo amarillo macizo. Aunque la forma la
                 separe de la chapa —para eso se rehízo el sistema de formas—,
                 esto NO se pulsa, y la regla de la casa es que el amarillo es la
                 acción. Con la chapa del menú abajo serían dos amarillos en la
                 misma pantalla diciendo cosas distintas: el defecto histórico.
               · `pildora-exito` empareja `--success` sobre `--success-tint`, y
                 eso mide 4,29:1 en un rótulo de 13 px. Por debajo de 4,5:1, así
                 que no entra.

              En neutro da 5,89:1 en claro y 6,21:1 en oscuro, y de paso la
              portada se queda en blanco, grises y amarillo sin un cuarto tono.
            */
            <span className="pildora">
              <Icono nombre="activo" tam={14} />
              {t.bonoYaEsTuyo}
            </span>
          )}
        </div>

        <p className="mt-2 text-apoyo text-texto-apoyo tabular-nums">{apoyo}</p>

        {/* El raíl con los escalones ya superados marcados.

            Las muescas se posicionaban con anchos ACUMULADOS en una fila
            flexible, y como los hijos de un flex encogen por defecto, la suma
            —que pasaba holgadamente del 100 %— se repartía a prorrata: con
            12.000 registros las marcas debían caer al 50 % y al 100 %, y caían
            al 20 %, 60 % y 100 %. Ninguna estaba sobre su escalón. Ahora cada
            una se coloca sola, en su sitio, con una propiedad lógica que se
            espeja en árabe.

            La del propio objetivo no se dibuja: el final del raíl ES ese
            escalón, y una muesca ahí queda medio recortada por el `overflow`.

            La barra sube a tinta plena y el raíl a 8 px. Iba en T2 sobre 6 px
            cuando estaba sobre el papel de la banda; dentro de la tarjeta la
            medida es lo único que mide algo aquí, así que se lleva el escalón
            más denso de la rampa. Amarilla NO: `--chart-accent` existe para la
            serie que hay que mirar, pero un progreso no se pulsa y el amarillo
            de esta pantalla ya tiene dueño. */}
        <div className="relative mt-3.5 h-2 overflow-hidden rounded-marca bg-borde">
          <BarraCreciente porcentaje={Math.max(porcentaje, 1.5)} className="bg-tinta" />
          {meta > 0 &&
            hito.escalones.map((e) => {
              const posicion = (e.usuarios / meta) * 100;
              if (posicion <= 0 || posicion >= 100) return null;
              return (
                /* La muesca es del color de LA TARJETA, no del fondo de página:
                   el raíl se mudó aquí dentro y en oscuro esos dos valores no
                   son el mismo —`--fondo` es #0E0E10 y `--card` es #16161A—, así
                   que la muesca se veía como una raya negra dentro de la barra
                   en vez de como un corte. */
                <span
                  key={e.usuarios}
                  aria-hidden
                  className="pointer-events-none absolute top-0 h-full w-0.5 bg-[var(--card)]"
                  style={{ insetInlineStart: `${posicion}%` }}
                />
              );
            })}
        </div>

        {/* La línea de métricas: lo que mide la barra que tiene encima.

            `flex-wrap`: con seis cifras —35.000 registros— las dos columnas se
            estrangulaban y cada una partía en dos líneas, dejando cuatro
            renglones para lo que es una frase. Envolviendo, la comparación baja
            entera. */}
        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-apoyo text-texto-apoyo tabular-nums">
          <p>
            {hito.siguiente
              ? t.bonoEsteMesLlevas(hito.registros, hito.siguiente.faltan)
              : t.registrosEsteMes(hito.registros)}
          </p>
          {/* La comparación con el mes cerrado anterior. Es la cifra que se
              mueve aunque el nivel esté lejos, y la única de la banda que puede
              ser negativa: se dice igual, porque un mes flojo que la aplicación
              esconde es un mes flojo que el agente descubre al no cobrar. */}
          {variacion !== null && <p>{t.frenteAlMesPasado(variacion)}</p>}
        </div>
      </div>

      {/* La escalera entera, con lo que paga cada peldaño.

          El premio y el estado de cada escalón ya viajaban en la respuesta y la
          pantalla solo leía el umbral: enseñarlos no cuesta ni una consulta. Y
          cambia la pregunta que contesta la banda —de «cuánto me falta» a «cómo
          es el juego»—, que es lo que hace que valga la pena perseguirlo.

          Cada escalón es ahora una TARJETA DE FILETE, y esa es la variante y no
          la de sombra a propósito: son cuatro objetos idénticos en fila de
          ~82 px, y cuatro sombras seguidas no son cuatro objetos levantados,
          son ruido. El filete cierra cada peldaño para que el par
          «umbral / premio» se lea como una unidad —antes eran ocho cifras
          sueltas en dos renglones y había que emparejarlas con la vista—.

          Va FUERA de la tarjeta del bono, colgando de la banda: una tarjeta no
          contiene tarjetas, igual que no contiene bandas. La tarjeta responde
          «dónde estoy», la escalera responde «cómo es el juego», y son dos
          preguntas.

          El relleno se recorta con `!`: `.tarjeta-borde` trae los 18 px de una
          tarjeta de ancho completo, y esta hoja se sirve detrás de las
          utilidades de Tailwind, así que sin la marca de importancia gana ella.
          Con 18 px por lado, un umbral de cinco cifras no cabe en la columna. */}
      <ul
        aria-label={t.escaleraDelBono}
        className="mt-3.5 grid gap-2 text-center"
        style={{ gridTemplateColumns: `repeat(${hito.escalones.length}, minmax(0, 1fr))` }}
      >
        {hito.escalones.map((e) => {
          /*
           * Cada escalón alcanzado se enciende cuando la barra pasa por él.
           *
           * El retardo no es un número elegido a ojo ni un escalonado por orden
           * de lista: es DÓNDE CAE SU MUESCA —la misma `posicion` con la que se
           * dibuja arriba— sobre los 520 ms que tarda `BarraCreciente` en
           * recorrer el raíl, más los 60 ms que espera antes de arrancar. Así
           * el instante lo decide el umbral, y ver encenderse el escalón dice
           * cuánto de la barra le corresponde.
           *
           * Se recorta al 100 % porque la escalera enseña todos los escalones y
           * la barra solo llega hasta la meta: los que quedan por encima no
           * están alcanzados, pero si alguna vez lo estuvieran no tendría
           * sentido esperarles un retardo mayor que la propia barra.
           */
          const posicion = meta > 0 ? Math.min((e.usuarios / meta) * 100, 100) : 0;
          return (
            <li
              key={e.usuarios}
              /* Cumplido en tinta plena y con el filete fuerte; pendiente en
                 tinta de apoyo y con el filete normal. El estado NO va por
                 color: va por CONTRASTE y por peso, así que se distingue en
                 escala de grises, en oscuro y con cualquier tema raro del
                 cliente. Es además la única forma de marcarlo que no gasta
                 amarillo en algo que no se pulsa. */
              className={`tarjeta-borde !px-1 !py-2.5 ${
                e.alcanzado ? "!border-borde-control text-texto" : "text-texto-apoyo"
              }`}
              style={
                e.alcanzado
                  ? {
                      opacity: encendido ? 1 : 0,
                      transition: "opacity var(--t-entrada) var(--curva)",
                      transitionDelay: `${Math.round(60 + (posicion / 100) * 520)}ms`,
                    }
                  : undefined
              }
            >
              <p className={`text-apoyo tabular-nums ${e.alcanzado ? "font-semibold" : ""}`}>
                {t.numero(e.usuarios)}
              </p>
              <p className="text-rotulo font-normal tabular-nums opacity-80">{e.premio.texto}</p>
            </li>
          );
        })}
      </ul>

      {/* El ritmo y la recta final.

          Va detrás de la escalera y no delante: primero cuál es el juego,
          después a qué velocidad vas. Al revés se lee como una cifra suelta. */}
      <p className="mt-4 text-apoyo text-texto-apoyo">
        {t.ritmoYRecta(hito.ritmo, hito.diasRestantes)}{" "}
        {hito.siguiente
          ? hito.llegaEl
            ? t.loAlcanzarasEl(Number(hito.llegaEl.slice(8, 10)))
            : t.cerrarasElMesEn(hito.proyeccion)
          : null}
      </p>

      {/* Quién te está acercando.

          Es lo que convierte la barra en una lista de llamadas. Un progreso que
          no dice de dónde viene no se puede empujar: el agente ve que le faltan
          9.280 y no tiene ni idea de a quién telefonear. Tres como mucho —una
          lista de veinte correos en un móvil no se lee— y enlazadas a su ficha,
          que es donde están sus enlaces de captación.

          Se queda en LISTA y no pasa a tarjetas, aunque el kit las use: la banda
          ya tiene una tarjeta con sombra y cuatro de filete, y tres más aquí
          convertirían la respuesta en un muro de cajas. Lo que sí gana es el
          chevron —lo tienen las tres filas del menú y no lo tenían estas—, que
          es lo único que distingue una fila que LLEVA a algún sitio de una fila
          que solo enseña un dato. */}
      {hito.porWebmaster.length > 0 && (
        <div className="mt-4">
          <p className="text-rotulo text-texto-apoyo">{t.quienTeAcerca}</p>
          <ul className="mt-1.5 divide-y divide-junta" role="list">
            {hito.porWebmaster.map((w) => (
              <li key={w.webmasterId}>
                <Link
                  href={`/red/${encodeURIComponent(w.email)}`}
                  className="pulsable -mx-2 flex min-h-11 items-center gap-2.5 rounded-control px-2"
                >
                  <span className="min-w-0 flex-1 truncate text-apoyo">{w.email}</span>
                  <span className="cifra shrink-0 text-apoyo tabular-nums">
                    {t.registrosCortos(w.registros)}
                  </span>
                  <Icono nombre="avance" tam={16} className="text-texto-apoyo" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Banda>
  );
}
