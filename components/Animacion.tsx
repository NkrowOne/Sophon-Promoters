"use client";

import { useEffect, useRef, useState } from "react";

import { useTelegram } from "@/components/TelegramProvider";
import { formatearMicros } from "@/lib/devengo/dinero";

/**
 * Piezas de movimiento compartidas.
 *
 * Presupuesto: nada dura más de 620 ms y nada anima en scroll salvo el Testigo.
 * `prefers-reduced-motion` no se respeta con un `@media` que apague todo por la
 * brava, sino leyendo la preferencia y saltando directamente al estado final:
 * así la interfaz queda igual de completa, solo que sin trayecto.
 */

function prefiereQuietud(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Cuenta hasta el importe final.
 *
 * Se anima el ENTERO en micros y se formatea en cada fotograma, en vez de
 * interpolar el texto: así los decimales no bailan y la cifra aterriza exacta.
 *
 * El idioma sale del contexto de Telegram y no de una prop porque no hay ciclo:
 * `TelegramProvider` no importa nada de `components/`. Se formatea por
 * fotograma, y por eso `formatearMicros` memoiza los separadores del locale.
 */
export function CifraAnimada({
  micros,
  duracionMs = 620,
  className,
}: {
  micros: bigint;
  duracionMs?: number;
  className?: string;
}) {
  const { idioma } = useTelegram();
  const [valor, setValor] = useState<bigint>(() => (prefiereQuietud() ? micros : 0n));
  const anterior = useRef<bigint>(micros);

  useEffect(() => {
    if (prefiereQuietud()) {
      setValor(micros);
      anterior.current = micros;
      return;
    }

    const desde = anterior.current === micros ? 0n : anterior.current;
    const inicio = performance.now();
    let frame = 0;

    const paso = (t: number) => {
      const avance = Math.min((t - inicio) / duracionMs, 1);
      // Suavizado de salida: la cifra frena al llegar, no se detiene en seco.
      const eased = 1 - Math.pow(1 - avance, 3);
      const escala = 10_000n;
      const factor = BigInt(Math.round(eased * Number(escala)));
      setValor(desde + ((micros - desde) * factor) / escala);
      if (avance < 1) frame = requestAnimationFrame(paso);
      else anterior.current = micros;
    };

    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [micros, duracionMs]);

  return (
    <span className={className} aria-label={formatearMicros(micros, 2, idioma)}>
      {formatearMicros(valor, 2, idioma)}
    </span>
  );
}

/**
 * Cifra protagonista.
 *
 * Separa el importe del símbolo de moneda porque en tipografía monoespaciada el
 * espacio previo al `$` mide lo mismo que un dígito y abre un hueco que parte la
 * cifra en dos. El número va en la cara de texto con cifras tabulares —conserva
 * la alineación sin la rigidez de la mono— y el `$` va detrás, más pequeño y
 * apagado: es una unidad, no un dato.
 */
export function CifraProtagonista({ micros }: { micros: bigint }) {
  const { idioma, t } = useTelegram();
  const importe = formatearMicros(micros, 2, idioma).replace(/\s*\$$/, "");

  /*
   * UNA sola cadena accesible, y traducida.
   *
   * Había dos —un `aria-label` con «2.147,39 $» y un `sr-only` que decía la
   * moneda en palabras— y la de dentro no llegaba a oírse nunca: un `aria-label`
   * sustituye al subárbol entero para la tecnología de apoyo. O sea que el
   * lector leía el `$` a su manera y el texto pensado para él era código muerto.
   * Muerto pero visible en `innerText`, que es donde se cazó: decía «dólares» en
   * los cinco idiomas.
   */
  return (
    <span
      /*
       * `display` = Archivo Black.
       *
       * Es el extremo pesado de la MISMA familia, así que la cifra que preside
       * una pantalla pesa el triple sin traer una voz ajena —que es lo que pasó
       * con Martian Mono y por lo que se retiró—. A 40 px y con el resto de la
       * pantalla en neutros, es lo que le da a la portada un protagonista en vez
       * de una lista de datos del mismo tamaño.
       */
      className="display flex items-baseline gap-1.5 text-cifra-mayor tabular-nums"
      aria-label={t.dolares(importe)}
    >
      <CifraAnimadaSinMoneda micros={micros} />
      <span aria-hidden className="text-[0.6em] font-medium opacity-60">
        $
      </span>
    </span>
  );
}

function CifraAnimadaSinMoneda({ micros }: { micros: bigint }) {
  const { idioma } = useTelegram();
  const [valor, setValor] = useState<bigint>(() => (prefiereQuietud() ? micros : 0n));

  useEffect(() => {
    if (prefiereQuietud()) {
      setValor(micros);
      return;
    }
    const inicio = performance.now();
    let frame = 0;
    const paso = (t: number) => {
      const avance = Math.min((t - inicio) / 620, 1);
      const eased = 1 - Math.pow(1 - avance, 3);
      const escala = 10_000n;
      setValor((micros * BigInt(Math.round(eased * Number(escala)))) / escala);
      if (avance < 1) frame = requestAnimationFrame(paso);
    };
    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [micros]);

  return <span aria-hidden>{formatearMicros(valor, 2, idioma).replace(/\s*\$$/, "")}</span>;
}

/*
 * `Aparece` se ha ido.
 *
 * Era un `div` que envolvía cada banda solo para llevar el retardo de entrada, y
 * no pintaba nada: un nivel de caja por bloque, en dos pantallas. Peor, ROMPÍA
 * las juntas —la separación entre estratos es `.banda + .banda`, hermano
 * adyacente, y con un div en medio las bandas dejaban de ser hermanas—, así que
 * `/red/[id]` y `/alta` se quedaban sin una sola junta dibujada.
 *
 * El retardo vive ahora en la prop `orden` de `Banda`: misma animación, un
 * contenedor menos, y las juntas de vuelta.
 */

/**
 * Barra que crece desde cero al entrar. Se usa en la Cinta, en la Escalera y en
 * el progreso del bono, donde la longitud ES el dato: verla crecer explica la
 * escala sin leyenda.
 *
 * **Crece con `transform`, no con `width`.** Animar el ancho obliga al navegador
 * a rehacer maquetación, pintado y composición en cada fotograma, y estas barras
 * no van solas: en la portada hay ocho —tres de la Cinta, cuatro de la Escalera
 * y la del hito— animándose a la vez. Con `scaleX` el trabajo se va entero a la
 * GPU y el coste deja de crecer con el número de barras.
 *
 * El ancho se fija de una vez, en el primer fotograma. En la Cinta eso arregla
 * además un defecto que se veía: los tres segmentos son hermanos de una fila
 * flexible, así que mientras sus anchos se animaban la fila se recolocaba en
 * cada fotograma y los huecos de 2 px que los separan iban deslizándose hasta
 * su sitio. Ahora la retícula está quieta desde el principio y lo único que se
 * mueve es la medida.
 */
export function BarraCreciente({
  porcentaje,
  className,
  retardoMs = 0,
}: {
  porcentaje: number;
  className: string;
  retardoMs?: number;
}) {
  const [medida, setMedida] = useState(prefiereQuietud() ? 1 : 0);

  useEffect(() => {
    if (prefiereQuietud()) {
      setMedida(1);
      return;
    }
    const id = setTimeout(() => setMedida(1), 60 + retardoMs);
    return () => clearTimeout(id);
  }, [porcentaje, retardoMs]);

  return (
    <span
      className={`barra-dato block h-full ${className}`}
      style={{ width: `${porcentaje}%`, transform: `scaleX(${medida})` }}
    />
  );
}
