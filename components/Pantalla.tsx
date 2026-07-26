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

import type { ErrorApi } from "@/lib/api/cliente";
import { TestigoVacio } from "./testigo/Testigo";
import { useCadenas } from "./TelegramProvider";

export function Pantalla({
  titulo,
  volverA,
  tarea = false,
  carril = "trama",
  children,
}: {
  titulo?: string;
  volverA?: string;
  /** Colapsa el raíl y aprieta los márgenes. */
  tarea?: boolean;
  /**
   * Qué se pinta dentro del raíl.
   *
   * `vacio` es para quien todavía no ha perforado: la columna hueca con las
   * marcas del propio `TestigoVacio`. No lleva `testigo-terreno` porque esa
   * trama y esas marcas son la misma retícula dibujada dos veces, y
   * superpuestas se ven como un rayado sucio en vez de como profundidad.
   */
  carril?: "trama" | "vacio";
  children: React.ReactNode;
}) {
  const { volver: etiquetaVolver } = useCadenas();

  return (
    <main className={`relative min-h-dvh ${tarea ? "ps-testigo-min" : "ps-testigo"}`}>
      <div
        className={`carril-testigo fixed inset-y-0 start-0 overflow-hidden ${
          carril === "trama" ? "testigo-terreno" : ""
        } ${tarea ? "w-testigo-min" : "w-testigo"}`}
        aria-hidden={tarea || carril === "vacio"}
      >
        {carril === "vacio" && !tarea && <TestigoVacio alto={900} />}
      </div>

      <div className="pb-16 pt-6" style={{ paddingInline: "var(--margen-pantalla)" }}>
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
 * Un estrato de página.
 *
 * La página no es una superficie: es una secuencia de capas a sangre, cada una
 * con su tono y separada de la siguiente por una junta de 1 px. Es lo que hace
 * que la metáfora del sondeo ocupe el 90 % de los píxeles en vez de los 44 px
 * del raíl —y lo que responde a «no lo dejes todo blanco» sin recurrir a
 * tarjetas, que son la forma por defecto de partir una pantalla y no significan
 * nada aquí—.
 *
 * Criterio para partir: **una banda por pregunta**, no por bloque visual. Si
 * dos trozos contestan a lo mismo van en la misma banda aunque se vean
 * distintos.
 *
 * El relleno vertical NO tiene valor por defecto a propósito: cada banda lo
 * declara. Un `py-6` heredado obligaría a pelearse con él en la primera y la
 * última, que son justo las que necesitan un ritmo distinto.
 */
export function Banda({
  tono = 0,
  como: Elemento = "section",
  etiqueta,
  className = "",
  children,
}: {
  tono?: 0 | 1 | 2;
  como?: "section" | "header" | "nav" | "div";
  /** `aria-label`: obligatorio de hecho en `section`, que sin nombre no es una región. */
  etiqueta?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Elemento aria-label={etiqueta} className={`banda banda-${tono} ${className}`}>
      {children}
    </Elemento>
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
 *
 * El filete es de PELIGRO —el rojo del propio cliente de Telegram— y no del
 * acento de estado: un aviso de error y una etiqueta de «esto caduca pronto»
 * no pueden compartir color, porque entonces ninguno de los dos significa nada.
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
    <div role="alert" className="border-s-2 border-peligro py-2 ps-3">
      <p className="text-cuerpo">{error}</p>
      {apoyo && <p className="mt-1 text-apoyo text-texto-apoyo">{apoyo}</p>}
      {onReintentar && <BotonReintentar onReintentar={onReintentar} />}
    </div>
  );
}

/**
 * Un fallo de carga, resuelto en un solo sitio.
 *
 * Las cinco pantallas profundas trataban el 401 como cualquier otro error y
 * ofrecían «Reintentar», que reintenta contra un servidor que va a seguir
 * diciendo que no: la sesión ha caducado y lo que hace falta es volver a
 * entrar. Solo la portada sabía traducirlo, así que perder la sesión mientras
 * mirabas tu red te dejaba encerrado ahí.
 *
 * Centralizarlo es además lo que garantiza que la próxima pantalla lo herede
 * sin que nadie tenga que acordarse.
 */
export function FalloDeCarga({
  error,
  onReintentar,
}: {
  error: ErrorApi;
  onReintentar: () => void;
}) {
  const t = useCadenas();

  if (error.estado === 401) {
    return (
      <Vacio
        titulo={t.sesionCaducada}
        apoyo={t.sesionCaducadaApoyo}
        accion={{ texto: t.vincularCuenta, href: "/alta" }}
      />
    );
  }

  return <Aviso error={error.message} apoyo={error.apoyo} onReintentar={onReintentar} />;
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
