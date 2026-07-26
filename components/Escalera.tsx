"use client";

/**
 * La Escalera: el dinero como secuencia de estados.
 *
 * Devengado → disponible → solicitado → pagado. Cuatro tarjetas de KPI darían
 * los mismos cuatro números y perderían lo único que importa aquí: que son el
 * MISMO dinero avanzando, no cuatro magnitudes independientes. La longitud de
 * cada peldaño es su importe contra el devengado, así que el hueco entre uno y
 * el siguiente es literalmente lo que todavía no ha avanzado.
 *
 * Vive en su propio fichero porque la usan inicio y cartera; duplicarla habría
 * garantizado que una de las dos se quedara atrás.
 */

import { BarraCreciente } from "./Animacion";
import { Importe } from "./Importe";

export interface Saldo {
  micros: string;
  texto: string;
}

export interface Cartera {
  devengado: Saldo;
  disponible: Saldo;
  solicitado: Saldo;
  pagado: Saldo;
}

/** Los cuatro rótulos y el nombre accesible, ya traducidos por quien la usa. */
export interface EtiquetasEscalera {
  estadoDeTuDinero: string;
  devengado: string;
  disponible: string;
  solicitado: string;
  pagado: string;
}

export function Escalera({
  cartera,
  titulo,
  etiquetas,
}: {
  cartera: Cartera;
  titulo?: string;
  etiquetas: EtiquetasEscalera;
}) {
  const maximo = BigInt(cartera.devengado.micros);
  const proporcion = (m: string): number =>
    maximo === 0n ? 0 : Number((BigInt(m) * 1000n) / maximo) / 10;

  return (
    <section aria-label={etiquetas.estadoDeTuDinero}>
      {titulo && (
        <p className="text-rotulo mb-1 border-b border-borde pb-2 text-texto-apoyo">{titulo}</p>
      )}
      <div className="divide-y divide-borde">
        <Peldano etiqueta={etiquetas.devengado} saldo={cartera.devengado} proporcion={100} destacado />
        <Peldano
          etiqueta={etiquetas.disponible}
          saldo={cartera.disponible}
          proporcion={proporcion(cartera.disponible.micros)}
          retardo={70}
        />
        <Peldano
          etiqueta={etiquetas.solicitado}
          saldo={cartera.solicitado}
          proporcion={proporcion(cartera.solicitado.micros)}
          retardo={140}
        />
        <Peldano
          etiqueta={etiquetas.pagado}
          saldo={cartera.pagado}
          proporcion={proporcion(cartera.pagado.micros)}
          retardo={210}
        />
      </div>
    </section>
  );
}

/**
 * Un peldaño: longitud = importe, posición = estado del dinero.
 *
 * El rótulo va en su propia línea con el importe a la derecha, y la barra
 * debajo. En una sola fila con el rótulo de ancho fijo, el `letter-spacing` de
 * los rótulos desbordaba sobre la barra y «DEVENGADO» y «SOLICITADO» aparecían
 * cortados. Dos líneas cuestan altura pero no dependen de que ninguna palabra
 * quepa en una medida calculada a ojo.
 */
function Peldano({
  etiqueta,
  saldo,
  proporcion,
  destacado = false,
  retardo = 0,
}: {
  etiqueta: string;
  saldo: Saldo;
  proporcion: number;
  destacado?: boolean;
  retardo?: number;
}) {
  return (
    <div className="py-2.5">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-rotulo text-texto-apoyo">{etiqueta}</span>
        <Importe texto={saldo.texto} className={`text-cuerpo ${destacado ? "font-semibold" : ""}`} />
      </div>
      {/* Extremos rectos: una barra de datos con las puntas redondeadas miente
          sobre dónde empieza y acaba la medida, y solo está ahí por blandura. */}
      {/* `bg-borde` y no `bg-superficie-alta`: el raíl vivía del mismo color
          que la banda que lo contiene en inicio —1,000:1—, así que la barra
          parecía flotar sin escala detrás. Un raíl tiene que verse para que
          la longitud de lo lleno signifique algo. */}
      <span className="block h-1.5 overflow-hidden rounded-marca bg-borde">
        <BarraCreciente
          porcentaje={Math.max(proporcion, 1.5)}
          className={destacado ? "bg-tinta" : "bg-t2"}
          retardoMs={retardo}
        />
      </span>
    </div>
  );
}
