"use client";

/**
 * La Malla: la superficie que responde «¿cuál de mis webmasters se ha apagado?».
 *
 * No es una lista. Una lista de tarjetas —nombre, cifra, flecha— obliga a leer
 * cada fila y a comparar de memoria, y con veinte webmasters eso ya no se hace.
 * Aquí cada webmaster es una **tesela con sus últimos 14 días en minibarras**,
 * y todas se ven a la vez: el que deja de producir aparece como un hueco oscuro
 * sin necesidad de leer un solo número.
 *
 * Esa es la única acción comercial que el agente tiene que tomar, así que es lo
 * que la pantalla hace evidente.
 *
 * Cada marca codifica una cantidad real: altura de barra = registros del día,
 * densidad de tinta = tier.
 *
 * El estado se dibujaba en el MARCO de la tesela. Ya no: la tesela era una caja
 * con borde dentro de una banda con fondo dentro de la pantalla, y seis marcos
 * dibujados a la vez compiten con los datos que hay dentro de ellos. Ahora lo
 * lleva un icono en la línea de abajo, que se localiza igual de rápido en una
 * retícula y no obliga a envolver cada webmaster en su propia caja.
 */

import { useMemo } from "react";

import { Icono, type NombreIcono } from "./Icono";
import { useCadenas } from "./TelegramProvider";

export interface DiaWebmaster {
  fecha: string;
  registros: number;
  registrosT1: number;
  registrosT2: number;
  registrosT3: number;
  usuariosPago: number;
}

export interface WebmasterMalla {
  id: string;
  email: string;
  estado: string;
  ganadoTotal: { texto: string };
  registrosVentana: number;
  diasSinActividad: number | null;
  diasHastaCaducidad: number | null;
  /** Se le puede conceder PRO hoy. Lo decide el servidor: ver `lib/pro/vigencia.ts`. */
  proRenovable: boolean;
  serie: DiaWebmaster[];
}

const ANCHO_TESELA = 92;
const ALTO_BARRAS = 34;

/** Días sin actividad a partir de los cuales la tesela se marca como apagada. */
export const DIAS_APAGADO = 4;

export function Malla({
  webmasters,
  dias,
  onAbrir,
}: {
  webmasters: readonly WebmasterMalla[];
  dias: number;
  onAbrir?: (id: string) => void;
}) {
  // La escala es COMÚN a toda la malla, no por tesela: si cada una se
  // normalizara contra su propio máximo, un webmaster de 2 registros al día se
  // vería igual de lleno que uno de 200 y la comparación —que es el motivo de
  // esta pantalla— dejaría de funcionar.
  const maximo = useMemo(
    () =>
      Math.max(
        1,
        ...webmasters.flatMap((w) => w.serie.map((d) => d.registros)),
      ),
    [webmasters],
  );

  return (
    /*
       El hueco separa las teselas, así que tiene que ser lo bastante ancho para
       hacerlo SOLO: al quitarles el marco, con `gap-2.5` las dos columnas se
       leían como una sola línea —«186   237,80 $   41   12,45 $»— y el ojo
       saltaba de una tesela a la de al lado a mitad de cifra.

       El hueco horizontal es mayor que el vertical a propósito: en vertical ya
       separa el cambio de nombre, en horizontal no hay nada más que separe.
    */
    <ul className="-mx-2 grid grid-cols-2 gap-x-4 gap-y-6" role="list">
      {webmasters.map((w) => (
        <Tesela key={w.id} w={w} maximo={maximo} dias={dias} onAbrir={onAbrir} />
      ))}
    </ul>
  );
}

function Tesela({
  w,
  maximo,
  dias,
  onAbrir,
}: {
  w: WebmasterMalla;
  maximo: number;
  dias: number;
  onAbrir?: (id: string) => void;
}) {
  const t = useCadenas();
  const apagado = w.diasSinActividad === null || w.diasSinActividad >= DIAS_APAGADO;
  /*
   * «Confirmando» no es un problema, y por eso sale del bucket de problemas.
   *
   * Es un alta recién hecha cuya vinculación Sophon todavía no ha publicado en
   * el programa de socios. Sin separarlo, caía en `problema` —cualquier estado
   * distinto de ACTIVO— y la tesela decía «No consta», que es exactamente lo
   * contrario de lo que pasa. Y gana a «sin actividad», porque un webmaster de
   * hace diez minutos no está parado: acaba de entrar.
   */
  const confirmando = w.estado === "PENDIENTE_CONFIRMACION";
  const problema = !confirmando && w.estado !== "ACTIVO";
  /*
   * El PRO solo se marca cuando SE PUEDE HACER ALGO con él.
   *
   * La tesela avisaba de todo lo que bajara de 30 días —«PRO VENCE EN 12 D»,
   * sobre chapa amarilla, o sea con el color de la acción— y con la regla de
   * vigencia eso es señalar un botón que no existe: hasta que se apague no se
   * puede renovar. El aviso se reserva para el PRO ya caducado, que es el único
   * que abre una acción.
   *
   * Lo decide el servidor (`proRenovable`) y no un umbral local, para que la
   * Malla, la pantalla de renovaciones y el guardián de `concederAnio` no puedan
   * contar historias distintas del mismo estado.
   */
  const proApagado = w.proRenovable;

  // Solo se escribe lo que exige una decisión, y por orden de urgencia: una
  // cuenta bloqueada importa más que un PRO apagado, y este más que una racha
  // sin actividad. Un webmaster que rinde no lleva etiqueta: su columna ya lo
  // dice.
  const etiqueta = problema
    ? w.estado === "BLOQUEADO"
      ? t.bloqueado
      : w.estado === "PENDIENTE_BORRADO"
        ? t.seVaABorrar
        : t.desaparecido
    : confirmando
      ? t.pendienteDeConfirmar
      : proApagado
        ? // «PRO caducado» es falso para quien nunca lo tuvo, y ese es justo el
          // caso más frecuente: un alta que se quedó a medias.
          // `diasHastaCaducidad` en null significa que no hay fecha porque no
          // hubo concesión.
          //
          // Aquí va el literal CORTO: la tesela mide media pantalla y «Nunca
          // llegó a tener PRO» se truncaba en «Nunca llegó a tener P…», que
          // ocupa la línea entera para no decir el dato. La versión larga se
          // queda en /pro, donde hay ancho de sobra.
          w.diasHastaCaducidad === null
          ? t.sinPro
          : t.proCaducado
        : apagado
          ? w.diasSinActividad === null
            ? t.sinActividad
            : t.diasParado(w.diasSinActividad)
          : "";

  /*
   * El icono va PAREADO con la etiqueta, no elegido aparte.
   *
   * Es lo que sustituye al marco de color: en una retícula de seis teselas, el
   * ojo encuentra un símbolo distinto antes que leer seis textos. Y como sale
   * del mismo árbol de condiciones que el texto, no pueden desincronizarse.
   */
  const icono: NombreIcono | null = problema
    ? w.estado === "BLOQUEADO"
      ? "bloqueado"
      : w.estado === "PENDIENTE_BORRADO"
        ? "seBorra"
        : "desaparecido"
    : confirmando
      ? "reintentar"
      : proApagado
        ? "caducado"
        : apagado
          ? "parado"
          : null;

  // La serie llega ordenada de reciente a antigua; se pinta al revés para que
  // el tiempo avance de izquierda a derecha, como se lee.
  const serie = [...w.serie].reverse();
  const faltan = Math.max(0, dias - serie.length);

  return (
    <li>
      <button
        type="button"
        onClick={() => onAbrir?.(w.id)}
        /*
         * SIN MARCO. La tesela era una caja con borde dentro de una banda con
         * fondo dentro de la pantalla: tres niveles de contenedor para enseñar
         * catorce barras y dos cifras, y en una retícula de seis, seis marcos
         * dibujados compiten con el dato que hay dentro de ellos.
         *
         * Lo que separa ahora es el HUECO de la retícula, que es como se separa
         * una serie de múltiplos pequeños. El estado, que antes se codificaba en
         * el color del marco, baja al icono de la línea de abajo: se lee a la
         * misma distancia y no necesita dibujar una caja para decirlo.
         */
        className="pulsable w-full rounded-panel px-2 py-1.5 text-start"
        style={{ minWidth: ANCHO_TESELA }}
      >
        <span className="block truncate text-apoyo font-medium" title={w.email}>
          {w.email.split("@")[0]}
        </span>

        <span
          className="barrido mt-2.5 flex items-end gap-[2px]"
          style={{ height: ALTO_BARRAS }}
          aria-hidden
        >
          {/* Día sin datos: NADA. Iba de `bg-superficie`, que es exactamente el
              color de la banda donde vive la Malla —1,000:1—, así que pintaba un
              rectángulo invisible: el gasto de un elemento por día para no
              enseñar nada. La ausencia ya es la señal, y así se distingue del
              día con cero registros, que sí deja una muesca al pie. */}
          {Array.from({ length: faltan }, (_, i) => (
            <span key={`hueco-${i}`} className="h-full flex-1" />
          ))}
          {serie.map((d) => (
            <BarraDia key={d.fecha} dia={d} maximo={maximo} />
          ))}
        </span>

        <span className="mt-2.5 flex items-baseline justify-between gap-2">
          <span className="cifra text-cuerpo">{w.registrosVentana}</span>
          <span className="cifra text-apoyo text-texto-apoyo">{w.ganadoTotal.texto}</span>
        </span>

        {/* La franja de estado ocupa SIEMPRE una línea, aunque esté vacía.
            Sin altura reservada, una tesela con etiqueta crecía más que sus
            vecinas y la retícula se desalineaba —justo lo que rompe una
            superficie cuya razón de ser es comparar unas con otras—.

            Y ahora la lleva un ICONO, que es lo que sustituye al marco de color:
            un webmaster con problema se localiza en la retícula sin leer, y sin
            que la tesela tenga que dibujar una caja alrededor de sí misma. */}
        <span className="mt-2 flex h-5 items-center gap-1.5 text-rotulo">
          {etiqueta && (
            <>
              <Icono
                nombre={icono!}
                tam={15}
                className={problema ? "text-peligro" : proApagado ? "text-t2" : "text-texto-apoyo"}
              />
              <span className={`truncate ${problema ? "text-peligro" : "text-texto-apoyo"}`}>
                {etiqueta}
              </span>
            </>
          )}
        </span>
      </button>
    </li>
  );
}

/** Una barra por día, partida por tier en orden fijo T1 · T2 · T3 de abajo arriba. */
function BarraDia({ dia, maximo }: { dia: DiaWebmaster; maximo: number }) {
  if (dia.registros === 0) {
    // Día sin registros: una muesca al pie. Va de `borde` y no de
    // `superficie-alta`, que sobre la banda de la Malla casi no se veía: si la
    // muesca no se ve, un día de cero y un día sin datos vuelven a ser lo mismo.
    return <span className="h-[2px] flex-1 self-end bg-borde" />;
  }

  const alto = Math.max(4, Math.round((dia.registros / maximo) * ALTO_BARRAS));
  const conTier = dia.registrosT1 + dia.registrosT2 + dia.registrosT3;
  const pct = (n: number) => (conTier ? (n / conTier) * 100 : 0);

  return (
    <span className="flex flex-1 flex-col justify-end" style={{ height: ALTO_BARRAS }}>
      <span className="flex w-full flex-col" style={{ height: alto }}>
        {conTier === 0 ? (
          <span className="h-full w-full bg-t2" />
        ) : (
          <>
            <span className="w-full bg-t1" style={{ height: `${pct(dia.registrosT1)}%` }} />
            <span className="w-full bg-t2" style={{ height: `${pct(dia.registrosT2)}%` }} />
            <span className="w-full bg-t3" style={{ height: `${pct(dia.registrosT3)}%` }} />
          </>
        )}
      </span>
    </span>
  );
}
