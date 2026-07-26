"use client";

/**
 * Armazón común de las pantallas.
 *
 * **Ya no hay barra lateral.** El raíl del Testigo ocupaba 44 px del borde
 * izquierdo de todas las pantallas —el 11 % del ancho de un móvil de 390— para
 * hacer de identidad, y se ha quitado entero. Lo que ocupa su papel es la
 * Placa: una banda de espresso que lleva **la respuesta de la pantalla**, no su
 * nombre. Cuesta alto en vez de ancho, que en un móvil es lo que sobra, y a
 * cambio devuelve 44 px a los datos.
 *
 * La flecha «‹» también se ha ido. Medía 16×21 px —menos de la mitad del mínimo
 * táctil— y vivía en `x < 44`, justo encima del gesto de retroceso horizontal
 * de Telegram. El `BackButton` NATIVO ya está cableado en `AtrasDeTelegram` y
 * hace el mismo trabajo con el tamaño y la posición que pone el sistema.
 */

import Link from "next/link";

import type { ErrorApi } from "@/lib/api/cliente";
import { useCadenas } from "./TelegramProvider";

export function Pantalla({
  titulo,
  placa,
  children,
}: {
  titulo?: string;
  /**
   * La respuesta de la pantalla, sobre espresso.
   *
   * `rotulo` es de qué va la cifra y `valor` la cifra. `apoyo` es la línea
   * pequeña de debajo. Si no hay respuesta que dar —las pantallas de tarea, que
   * empiezan vacías— no se pasa: que la placa aparezca solo cuando hay algo que
   * saber es lo que le da significado.
   */
  placa?: { rotulo: string; valor: React.ReactNode; apoyo?: React.ReactNode };
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-dvh">
      {placa && <Placa {...placa} />}

      {/*
        Con placa, CERO relleno superior: la primera banda tiene que morder la
        placa. Con `pt-5` quedaba una franja del fondo de página entre las dos
        —blanca en claro, casi negra en oscuro— que se lee como una costura mal
        cerrada, justo debajo de la pieza que abre la pantalla.

        No es un descuido que se pueda dejar: la metáfora es una secuencia de
        estratos, y un estrato no flota sobre el anterior. Las dos pantallas con
        placa abren con `Banda`, que ya trae su propio `py`, así que el aire no
        se pierde: cambia de dueño.
      */}
      <div
        className={placa ? "pb-16" : "pb-16 pt-7"}
        style={{ paddingInline: "var(--margen-pantalla)" }}
      >
        {/* Con placa NO se repite el título: el rótulo de la placa ya nombra la
            pantalla, y ponerlo dos veces —«RENOVACIONES» arriba y
            «Renovaciones» debajo— es decir lo mismo gastando una línea de 21 px
            y la primera pantalla de scroll. La placa lleva su propio `h1`. */}
        {titulo && !placa && <h1 className="mb-6 text-titulo">{titulo}</h1>}
        {children}
      </div>
    </main>
  );
}

/**
 * La Placa: espresso a sangre con la respuesta encima.
 *
 * Las dos caras trabajan aquí y en direcciones opuestas: el rótulo va en
 * Archivo ensanchada a 11 px —letra de señal— y la cifra en Martian Mono
 * estrechada a 48 —lectura de instrumento—. Esa inversión es la firma
 * tipográfica de la aplicación.
 *
 * **Era amarilla, y ese era el defecto que hundió la versión anterior.** Placa
 * y botón compartían `#F9D027`, de modo que lo que informa y lo que se pulsa se
 * veían idénticos: *«ese amarillo se camufla con los botones»*. En espresso son
 * dos objetos que no se pueden confundir, y la pantalla se ordena sola —lo más
 * oscuro informa, lo más brillante se pulsa—.
 *
 * Las opacidades de abajo están medidas contra la placa y no puestas a ojo: con
 * 12,91:1 en claro y 10,33:1 en oscuro, el rótulo al 70 % se queda en 7,09:1 y
 * 5,97:1. Es la misma comprobación que en el Testigo demostró que atenuar por
 * opacidad tiraba el estrato mayor por debajo del suelo; aquí hay margen de
 * sobra, pero se verifica igual en vez de suponerlo.
 */
export function Placa({
  rotulo,
  valor,
  apoyo,
}: {
  rotulo: string;
  valor: React.ReactNode;
  apoyo?: React.ReactNode;
}) {
  return (
    <header className="placa pb-6 pt-7" style={{ paddingInline: "var(--margen-pantalla)" }}>
      {/* El rótulo ES el título de la pantalla, así que es el `h1`: no hay otro
          debajo. Va en la cara de display ensanchada a 11 px —la mitad pequeña
          de la inversión tipográfica— sobre la cifra, que va en la mono a 48. */}
      <h1 className="rotulo text-rotulo opacity-70">{rotulo}</h1>
      <div className="mt-2">{valor}</div>
      {apoyo && <p className="mt-2.5 text-apoyo opacity-80">{apoyo}</p>}
    </header>
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
          className="chapa mt-5 inline-flex min-h-11 items-center px-5 text-cuerpo font-semibold"
        >
          {accion.texto}
        </Link>
      )}
    </div>
  );
}

/**
 * Marca de urgencia: una placa pequeña dentro del texto.
 *
 * Es lo que sustituye al antiguo `--vivo`. Aquel era un ámbar de estado, un
 * cuarto color semántico que existía solo para decir «esto exige acción» —lo
 * mismo que dice la marca—. Fundirlos baja el sistema de cuatro colores a tres
 * y hace que el amarillo signifique una cosa sola en toda la aplicación.
 *
 * Y de paso arregla una infracción: pintar el valor del color del dato. Aquí el
 * texto va sobre el campo, no teñido de él, así que sigue siendo tinta.
 */
export function Marca({ children }: { children: React.ReactNode }) {
  return (
    <span className="chapa inline-block px-1.5 py-0.5 text-apoyo font-semibold">{children}</span>
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
    // `min-h-11` y un margen negativo que compensa el relleno: el objetivo
    // táctil llega a 44 px sin que el enlace se separe visualmente del aviso.
    <button
      type="button"
      onClick={onReintentar}
      className="-my-2 mt-0.5 inline-flex min-h-11 items-center text-apoyo font-medium underline underline-offset-4"
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
