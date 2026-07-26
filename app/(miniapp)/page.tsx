"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { BarraCreciente, CifraProtagonista } from "@/components/Animacion";
import { Escalera, type Cartera } from "@/components/Escalera";
import { Icono, type NombreIcono } from "@/components/Icono";
import { Aviso, Banda, Cargando, Placa, Vacio } from "@/components/Pantalla";
import type { DiaTestigo } from "@/components/testigo/TestigoAncho";
import { useCadenas, useTelegram } from "@/components/TelegramProvider";
import { api, ErrorApi } from "@/lib/api/cliente";
import type { Cadenas } from "@/lib/i18n";
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

interface Escalon {
  usuarios: number;
  premio: { micros: string; texto: string };
  alcanzado: boolean;
}

interface Hito {
  registros: number;
  ganado: { micros: string; texto: string };
  siguiente: { usuarios: number; faltan: number; premio: { micros: string; texto: string } } | null;
  escalones: Escalon[];
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

      {/* Sin relleno superior cuando hay placa: la Cinta muerde la placa en vez
          de dejar una franja de fondo entre las dos. La placa solo se pinta
          cuando hay datos, y en esa rama el primer hijo es siempre una banda con
          su propio `py-6`, así que el aire no se pierde: cambia de dueño. */}
      <div
        className={datos && dias.length > 0 ? "pb-16" : "pb-16 pt-6"}
        style={{ paddingInline: "var(--margen-pantalla)" }}
      >
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
                ? { texto: t.activarWebmaster, href: "/activar", icono: "activar" as const }
                : { texto: t.red, href: "/red", icono: "red" as const }
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
                cuánto me falta para el premio → dónde está mi dinero.

                Sin amarillo: el amarillo es la ACCIÓN, y un progreso no se
                pulsa. Y sin medallas ni rachas: la regla de voz de la casa dice
                que el agente es un profesional que cobra, no alguien a quien
                haya que animar. La recompensa es dinero y con enseñarla bien
                basta. */}
            {datos?.hito && <BandaHito hito={datos.hito} etiquetas={t} orden={orden(1)} />}

            {/* La Escalera: el dinero es un flujo con estados, no cuatro saldos
                sueltos. Cuatro tarjetas KPI perderían justo esa secuencia. */}
            {cartera && (
              <Banda como="div" tono={2} orden={orden(2)} className="py-6">
                <Escalera cartera={cartera} titulo={t.cartera} etiquetas={t} />
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
        <Banda como="nav" tono={0} etiqueta={t.acciones} orden={orden(3)} className="pb-2 pt-7">
          <a
            href="/activar"
            className="chapa pulsable text-cuerpo"
          >
            <Icono nombre="activar" />
            {t.activarWebmaster}
          </a>

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
      <a href={href} className="pulsable -mx-2 flex min-h-14 items-center gap-3.5 rounded-control px-2 text-cuerpo">
        {/* El icono va del T1 —la tinta densa de los datos— y no del texto: así
            la columna de iconos se lee como una sola cosa y no compite con los
            nombres de las secciones. */}
        <Icono nombre={icono} tam={22} className="text-t1" />
        <span>{etiqueta}</span>
        {dato && <span className="cifra ms-auto text-apoyo text-texto-apoyo">{dato}</span>}
        <Icono nombre="avance" tam={18} className={`text-texto-apoyo ${dato ? "" : "ms-auto"}`} />
      </a>
    </li>
  );
}

/**
 * El progreso hacia el siguiente hito del bono.
 *
 * Raíl visible + relleno, que es la forma que ya usa la Escalera
 * (`components/Escalera.tsx`) y por el motivo que allí está escrito: un raíl que
 * no se ve deja la barra flotando sin escala detrás, y entonces la longitud de
 * lo lleno no significa nada.
 *
 * Se anima porque MIDE algo, que es la regla que decide qué se mueve en esta
 * aplicación. Reutiliza `BarraCreciente`.
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
  const porcentaje = meta > 0 ? Math.min(100, (hito.registros / meta) * 100) : 0;

  return (
    <Banda tono={0} etiqueta={t.bonoDelMes} orden={orden} className="py-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-rotulo text-texto-apoyo">{t.bonoDelMes}</p>
        {/* Lo ganado solo aparece cuando hay algo ganado: un «0,00 $» fijo en la
            cabecera es un recordatorio diario de no haber llegado. */}
        {hito.ganado.micros !== "0" && (
          <p className="text-apoyo font-medium tabular-nums">{t.bonoGanado(hito.ganado.texto)}</p>
        )}
      </div>

      <p className="mt-1.5 text-cuerpo tabular-nums">{t.registrosEsteMes(hito.registros)}</p>

      {/* El raíl con los escalones ya superados marcados.

          Las muescas se posicionaban con anchos ACUMULADOS en una fila flexible,
          y como los hijos de un flex encogen por defecto, la suma —que pasaba
          holgadamente del 100 %— se repartía a prorrata: con 12.000 registros
          las marcas debían caer al 50 % y al 100 %, y caían al 20 %, 60 % y
          100 %. Ninguna estaba sobre su escalón. Ahora cada una se coloca sola,
          en su sitio, con una propiedad lógica que se espeja en árabe.

          La del propio objetivo no se dibuja: el final del raíl ES ese escalón,
          y una muesca ahí queda medio recortada por el `overflow`. */}
      <div className="relative mt-3 h-1.5 overflow-hidden rounded-marca bg-borde">
        <BarraCreciente porcentaje={porcentaje} className="bg-t2" />
        {meta > 0 &&
          hito.escalones.map((e) => {
            const posicion = (e.usuarios / meta) * 100;
            if (posicion <= 0 || posicion >= 100) return null;
            return (
              <span
                key={e.usuarios}
                aria-hidden
                className="pointer-events-none absolute top-0 h-full w-px bg-fondo"
                style={{ insetInlineStart: `${posicion}%` }}
              />
            );
          })}
      </div>

      <p className="mt-2.5 text-apoyo text-texto-apoyo tabular-nums">
        {hito.siguiente
          ? t.faltanParaElBono(hito.siguiente.faltan, hito.siguiente.premio.texto)
          : t.bonoMaximoAlcanzado}
      </p>
    </Banda>
  );
}
