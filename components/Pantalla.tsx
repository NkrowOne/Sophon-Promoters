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

import * as React from "react";
import Link from "next/link";

import type { ErrorApi } from "@/lib/api/cliente";
import { Icono, type NombreIcono } from "./Icono";
import { Isotipo } from "./Isotipo";
import { useCadenas } from "./TelegramProvider";

export function Pantalla({
  titulo,
  placa,
  marca,
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
  /**
   * Enseña el isotipo de Sophon sobre el título.
   *
   * Solo lo pide `/alta`, y a propósito: es la única pantalla en la que el
   * agente todavía no sabe dónde está —llega desde un enlace del bot, sin datos
   * y sin red—. En las demás la aplicación ya se presentó, y repetir la marca en
   * cada cabecera gastaría espacio de datos para decir algo ya dicho.
   */
  marca?: boolean;
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
        {/* El isotipo, cuando lo hay, va ENCIMA del título y no debajo.
            Puesto como primer hijo de la primera banda quedaba entre el título
            y el texto de apoyo, y ahí no identifica nada: se lee como un dibujo
            suelto en medio de una frase. Arriba es lo primero que se ve y hace
            el trabajo que se le pide —decir de qué aplicación es esto— antes de
            que empiece el contenido. */}
        {marca && (
          <Isotipo
            ancho={64}
            titulo="Sophon"
            className="mb-5 block text-texto"
          />
        )}
        {titulo && !placa && <h1 className="mb-6 text-titulo">{titulo}</h1>}
        {children}
      </div>
    </main>
  );
}

/**
 * La Placa: espresso a sangre con la respuesta encima.
 *
 * Una sola cara y una sola idea: el rótulo pequeño, la cifra grande. Aquí vivía
 * la «inversión tipográfica» —rótulo en Archivo ensanchada a 11 px, cifra en
 * Martian Mono a 48— y era justo lo que el usuario llamó «aberrante»: la mono
 * ponía la coma de «8,88 $» en una casilla propia, con un hueco a cada lado.
 * Ahora la jerarquía la hacen el tamaño y el peso, que es como se ha hecho
 * siempre y no llama la atención sobre sí misma.
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
  const compacta = useCompactaAlBajar();

  return (
    <header
      className="placa pb-6 pt-7"
      data-compacta={compacta ? "si" : "no"}
      style={{ paddingInline: "var(--margen-pantalla)" }}
    >
      {/* El rótulo ES el título de la pantalla, así que es el `h1`: no hay otro
          debajo. En caja baja: sobre la placa, unas versalitas tracadas a 11 px
          eran lo primero que se leía de toda la aplicación. */}
      <h1 className="text-rotulo opacity-75">{rotulo}</h1>
      <div className="mt-2">{valor}</div>
      {apoyo && (
        <div className="placa-apoyo mt-2.5">
          <div>
            <p className="text-apoyo opacity-80">{apoyo}</p>
          </div>
        </div>
      )}
    </header>
  );
}

/**
 * ¿Ha bajado ya lo bastante como para compactar la cabecera?
 *
 * Dos cosas que no son opcionales en un WebView de móvil:
 *
 *  - **`passive: true`**. Sin él, el navegador tiene que esperar a ver si el
 *    escuchador llama a `preventDefault` antes de desplazar, y el scroll se
 *    entrecorta. Este no lo llama nunca.
 *  - **Histéresis**. Con un solo umbral, quedarse parado justo encima hace que
 *    el más mínimo temblor del dedo encienda y apague la cabecera sin parar.
 *    Compacta a 40 px y no se abre hasta los 16: entre medias no pasa nada.
 *
 * Y se escribe en el DOM solo cuando el estado CAMBIA. Un `setState` por evento
 * de scroll pondría a React a reconciliar sesenta veces por segundo para dejar
 * el árbol igual que estaba.
 */
function useCompactaAlBajar(): boolean {
  const [compacta, setCompacta] = React.useState(false);

  React.useEffect(() => {
    const CIERRA = 40;
    const ABRE = 16;

    const mirar = () => {
      const y = window.scrollY;
      setCompacta((antes) => (antes ? y > ABRE : y > CIERRA));
    };

    mirar();
    window.addEventListener("scroll", mirar, { passive: true });
    return () => window.removeEventListener("scroll", mirar);
  }, []);

  return compacta;
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
  orden,
  className = "",
  children,
}: {
  tono?: 0 | 1 | 2;
  como?: "section" | "header" | "nav" | "div";
  /** `aria-label`: obligatorio de hecho en `section`, que sin nombre no es una región. */
  etiqueta?: string;
  /**
   * Puesto en la secuencia de entrada, si la pantalla la usa.
   *
   * La animación la llevaba `<Aparece>`, un `div` envolviendo cada banda. Ese
   * envoltorio no pintaba absolutamente nada y además ROMPÍA LAS JUNTAS: la
   * separación entre estratos es `.banda + .banda`, un selector de hermano
   * adyacente, y con un `div` en medio las bandas dejaban de ser hermanas. En
   * `/red/[id]` —cuatro bandas, cuatro envoltorios— no se dibujaba ni una sola
   * junta, y en `/alta` tampoco.
   *
   * Traerla aquí quita un nivel de caja en las dos pantallas y devuelve las
   * juntas sin tocar el CSS.
   *
   * `orden` aporta SOLO el retardo. Antes añadía además la clase
   * `animate-emerger`, que traía su propia animación de entrada —180 ms, 8 px—
   * encima del `depositar` que la banda ya hereda de `.banda`: dos animaciones
   * peleándose por el mismo elemento, con el ganador decidido por el orden en
   * que Tailwind emitiera las clases. Ahora hay una sola entrada en toda la
   * aplicación y esto solo dice cuándo empieza.
   *
   * El escalonado es de 40 ms —el mismo que tenían las reglas `nth-child` que
   * esto sustituye— y se corta a 320 ms: pasado ese punto la última banda entra
   * tan tarde que ya no se lee como parte del mismo gesto.
   */
  orden?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Elemento
      aria-label={etiqueta}
      className={`banda banda-${tono} ${className}`}
      style={orden !== undefined ? { animationDelay: `${Math.min(orden * 40, 320)}ms` } : undefined}
    >
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
  accion?: { texto: string; href: string; icono?: NombreIcono };
}) {
  return (
    <div className="py-10">
      <p className="text-titulo">{titulo}</p>
      {apoyo && <p className="mt-2 text-cuerpo text-texto-apoyo">{apoyo}</p>}
      {accion && (
        <Link href={accion.href} className="chapa pulsable mt-6 text-cuerpo">
          {accion.icono && <Icono nombre={accion.icono} />}
          {accion.texto}
        </Link>
      )}
    </div>
  );
}

/**
 * Estado de una fila: icono y texto, SIN cápsula.
 *
 * Ha pasado por tres formas y las dos primeras eran defectos.
 *
 *  1. Chapa amarilla —la misma clase que el botón—, que es lo que el usuario
 *     rodeó con un círculo rojo: la etiqueta parecía un botón.
 *  2. Píldora perfilada. Resolvía la confusión con el botón y traía otra: una
 *     retícula de cápsulas de colores es LA firma del panel de control genérico.
 *     «Gritan mucho IA», y con razón —el patrón está en cada plantilla de SaaS,
 *     así que no dice nada del producto—.
 *
 * Ahora no hay contenedor: el estado es una línea de texto con su icono
 * delante, del mismo tamaño que el resto de la fila. Que un dato secundario se
 * lea como texto secundario es la opción aburrida, y es la correcta: la fila ya
 * está delimitada por su propia lista, así que dibujarle una cápsula dentro era
 * envolver dos palabras en una caja para no añadir información.
 *
 * **El color se reserva.** `tono="problema"` es lo ÚNICO que tiñe, y solo lo
 * usan tres estados en toda la aplicación —bloqueado, se va a borrar,
 * desaparecido—: los tres son cosas que van mal y que el agente no puede
 * arreglar desde aquí. Un PRO caducado NO lleva color, porque justo debajo tiene
 * un botón amarillo que ya dice que hay algo que hacer; teñirlo además sería
 * gastar dos señales en un mismo mensaje.
 */
export function Marca({
  children,
  icono,
  tono = "neutro",
}: {
  children: React.ReactNode;
  icono?: NombreIcono;
  /** `problema`: va mal y no se puede arreglar desde aquí. Es el único con color. */
  tono?: "neutro" | "problema";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 align-middle ${
        tono === "problema" ? "text-peligro" : "text-texto-apoyo"
      }`}
    >
      {icono && <Icono nombre={icono} tam={16} />}
      {children}
    </span>
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
    // El icono sustituye al filete de 2 px: dice «esto va mal» antes de leer, y
    // libera la sangría que el filete se llevaba. Una caja menos.
    <div role="alert" className="flex gap-3 py-2">
      <Icono nombre="aviso" tam={20} className="mt-0.5 text-peligro" />
      <div className="min-w-0">
        <p className="text-cuerpo">{error}</p>
        {apoyo && <p className="mt-1 text-apoyo text-texto-apoyo">{apoyo}</p>}
        {onReintentar && <BotonReintentar onReintentar={onReintentar} />}
      </div>
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
        accion={{ texto: t.vincularCuenta, href: "/alta", icono: "activar" }}
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
      className="-my-2 mt-0.5 inline-flex min-h-11 items-center gap-2 text-cuerpo font-semibold underline underline-offset-4"
    >
      <Icono nombre="reintentar" tam={17} />
      {reintentar}
    </button>
  );
}

/** Carga: una sola línea, sin esqueletos que fingen contenido que no existe. */
export function Cargando({ que }: { que?: string }) {
  const { cargando } = useCadenas();
  const texto = que ?? cargando;
  return (
    // Sin `toUpperCase`. Las versalitas eran parte del «efecto estarcido»: un
    // «CARGANDO…» a 11 px tracado grita para decir que espere.
    <p className="py-10 text-cuerpo text-texto-apoyo" aria-live="polite">
      {texto}…
    </p>
  );
}
