"use client";

/**
 * Armazón común de las pantallas.
 *
 * El raíl del Testigo colapsa a 8 px en las pantallas de tarea: sigue estando
 * —el agente no pierde de vista si está ganando— pero devuelve 36 px de ancho
 * al formulario, que es donde hacen falta cuando el teclado se come media
 * pantalla.
 */

import Link from "next/link";

import { useCadenas } from "./TelegramProvider";

export function Pantalla({
  titulo,
  volverA,
  tarea = false,
  children,
}: {
  titulo?: string;
  volverA?: string;
  /** Colapsa el raíl y aprieta los márgenes. */
  tarea?: boolean;
  children: React.ReactNode;
}) {
  const { volver: etiquetaVolver } = useCadenas();

  return (
    <main className={`relative min-h-dvh ${tarea ? "ps-testigo-min" : "ps-testigo"}`}>
      <div
        className={`testigo-terreno fixed inset-y-0 start-0 bg-superficie ${
          tarea ? "w-testigo-min" : "w-testigo"
        }`}
        aria-hidden={tarea}
      />

      <div className="px-4 pb-16 pt-6">
        {(titulo || volverA) && (
          <header className="mb-6 flex items-baseline gap-3">
            {volverA && (
              <Link
                href={volverA}
                className="-ms-1 shrink-0 px-1 text-titulo leading-none text-texto-apoyo"
                aria-label={etiquetaVolver}
              >
                ‹
              </Link>
            )}
            {titulo && <h1 className="text-titulo">{titulo}</h1>}
          </header>
        )}
        {children}
      </div>
    </main>
  );
}

/**
 * Estado vacío.
 *
 * Invita a actuar en vez de disculparse: el texto dice qué falta y el botón
 * hace exactamente eso. Una pantalla vacía sin salida es un callejón.
 */
export function Vacio({
  titulo,
  apoyo,
  accion,
}: {
  titulo: string;
  apoyo?: string;
  accion?: { texto: string; href: string };
}) {
  return (
    <div className="py-10">
      <p className="text-cuerpo font-medium">{titulo}</p>
      {apoyo && <p className="mt-1.5 text-apoyo text-texto-apoyo">{apoyo}</p>}
      {accion && (
        <Link
          href={accion.href}
          className="mt-5 inline-block rounded-pieza bg-tinta px-5 py-3 text-cuerpo font-semibold text-fondo"
        >
          {accion.texto}
        </Link>
      )}
    </div>
  );
}

/**
 * Error accionable: qué pasó · por qué · qué hago ahora.
 *
 * Nunca se muestra un código ni un stack: el agente no puede hacer nada con
 * eso, y lo que sí puede hacer va en el botón.
 */
export function Aviso({
  error,
  apoyo,
  onReintentar,
}: {
  error: string;
  apoyo?: string | null;
  onReintentar?: () => void;
}) {
  return (
    <div role="alert" className="border-s-2 border-vivo py-2 ps-3">
      <p className="text-cuerpo">{error}</p>
      {apoyo && <p className="mt-1 text-apoyo text-texto-apoyo">{apoyo}</p>}
      {onReintentar && (
        <BotonReintentar onReintentar={onReintentar} />
      )}
    </div>
  );
}

function BotonReintentar({ onReintentar }: { onReintentar: () => void }) {
  const { reintentar } = useCadenas();
  return (
    <button
      type="button"
      onClick={onReintentar}
      className="mt-2.5 text-apoyo font-medium underline underline-offset-4"
    >
      {reintentar}
    </button>
  );
}

/** Carga: una sola línea, sin esqueletos que fingen contenido que no existe. */
export function Cargando({ que }: { que?: string }) {
  const { cargando } = useCadenas();
  const texto = que ?? cargando;
  return (
    <p className="py-10 text-rotulo text-texto-apoyo" aria-live="polite">
      {texto.toUpperCase()}…
    </p>
  );
}
