"use client";

import { useEffect, useRef, useState } from "react";

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
    <span className={className} aria-label={formatearMicros(micros)}>
      {formatearMicros(valor)}
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
  const texto = formatearMicros(micros);
  const importe = texto.replace(/\s*\$$/, "");

  return (
    <span
      className="flex items-baseline gap-1.5 text-cifra-mayor tabular-nums"
      aria-label={texto}
    >
      <CifraAnimadaSinMoneda micros={micros} />
      <span aria-hidden className="text-[0.6em] font-medium opacity-60">
        $
      </span>
      <span className="sr-only">{importe} dólares</span>
    </span>
  );
}

function CifraAnimadaSinMoneda({ micros }: { micros: bigint }) {
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

  return <span aria-hidden>{formatearMicros(valor).replace(/\s*\$$/, "")}</span>;
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
 * Barra que crece desde cero al entrar. Se usa en la Cinta y en la Escalera,
 * donde la longitud ES el dato: verla crecer explica la escala sin leyenda.
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
  const [ancho, setAncho] = useState(prefiereQuietud() ? porcentaje : 0);

  useEffect(() => {
    if (prefiereQuietud()) {
      setAncho(porcentaje);
      return;
    }
    const id = setTimeout(() => setAncho(porcentaje), 60 + retardoMs);
    return () => clearTimeout(id);
  }, [porcentaje, retardoMs]);

  return (
    <span
      className={`block h-full transition-[width] duration-[520ms] ease-sonda ${className}`}
      style={{ width: `${ancho}%` }}
    />
  );
}
