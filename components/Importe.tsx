/**
 * Un importe.
 *
 * Existe por un defecto concreto y repetido: en tipografía monoespaciada el
 * espacio que precede al `$` mide lo mismo que un dígito, así que
 * `formatearMicros` —que devuelve «128,44 $»— pintaba un hueco de un carácter
 * entero entre la cifra y la moneda. En una lista de setenta días eso son
 * setenta cifras partidas en dos.
 *
 * Aquí el número va en la cara mono (las columnas de una lista tienen que
 * alinearse) y el `$` va pegado, más pequeño y apagado: es una unidad, no un
 * dato. La cadena accesible conserva el importe completo.
 */

import { formatearMicros, type Micros } from "@/lib/devengo/dinero";

export function Importe({
  micros,
  texto,
  className = "",
  apagado = false,
}: {
  micros?: Micros;
  /** Importe ya formateado por el servidor, con o sin `$`. */
  texto?: string;
  className?: string;
  /** El importe se dibuja en tinta de apoyo: se usa para los ceros. */
  apagado?: boolean;
}) {
  const completo = texto ?? formatearMicros(micros ?? 0n);
  const numero = completo.replace(/\s*\$$/, "");

  return (
    <span className={`cifra whitespace-nowrap ${apagado ? "text-texto-apoyo" : ""} ${className}`}>
      <span aria-hidden>{numero}</span>
      <span aria-hidden className="ms-[0.22em] text-[0.85em] text-texto-apoyo">
        $
      </span>
      <span className="sr-only">{numero} dólares</span>
    </span>
  );
}

/**
 * Importe sin moneda, para cuando la unidad ya está dicha en la cabecera de la
 * columna. Repetir `$` en cada fila de una tabla es ruido, no precisión.
 */
export function ImporteDesnudo({ micros, texto }: { micros?: Micros; texto?: string }) {
  const completo = texto ?? formatearMicros(micros ?? 0n);
  return <>{completo.replace(/\s*\$$/, "")}</>;
}
