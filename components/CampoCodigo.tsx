"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * El campo de un CÓDIGO: casillas de verdad, y un solo `<input>` debajo.
 *
 * ── EL DEFECTO QUE ARREGLA ──
 *
 * La versión anterior pintaba el OTP como un input `text-center` con
 * `tracking-[0.5em]` y, debajo, seis rayas repartidas con `flex-1`:
 *
 *     <input className="… text-center tracking-[0.5em] indent-[0.5em]" />
 *     <span className="absolute inset-x-3.5 bottom-2.5 flex gap-1.5">
 *       {seis rayas, la i-ésima encendida si i < otp.length}
 *     </span>
 *
 * Las rayas se reparten el ANCHO COMPLETO del campo. El texto va CENTRADO. Son
 * dos geometrías distintas, así que los dígitos no caen sobre sus rayas en
 * ningún estado intermedio — que es, justamente, todo el rato que se está
 * escribiendo:
 *
 *   · con 1 dígito, el dígito está en el centro del campo y la que se enciende
 *     es la raya 1, en el extremo;
 *   · con 3, los dígitos ocupan el centro y se encienden las rayas 1-3;
 *   · solo con los 6 puestos se parecen, y ni siquiera del todo: `tracking`
 *     añade el espacio DETRÁS de cada carácter, incluido el último, y el
 *     `indent-[0.5em]` compensa ese sobrante desplazando la línea entera, que
 *     no es lo mismo que repartirlo.
 *
 * O sea: la retícula prometía «seis huecos» y señalaba huecos donde no había
 * nada. El comentario del fichero decía que la retícula «da la lectura de seis
 * huecos sin pagar el precio» de seis inputs; pagaba otro precio y no lo decía.
 *
 * ── CÓMO SE ARREGLA SIN VOLVER A SEIS INPUTS ──
 *
 * La razón para no poner seis inputs sigue siendo buena y no se toca: seis
 * inputs rompen el pegado desde el correo y el autorrelleno del código de un
 * solo uso de iOS, que son las dos formas en que este campo se rellena de
 * verdad.
 *
 * Así que hay UN input, y las casillas las pinta una capa hermana que lee el
 * mismo valor. Los dígitos ya no los dibuja el input —va con la tinta
 * transparente y sin cursor— sino cada casilla, centrado en la suya. Una sola
 * geometría, así que la alineación no puede desajustarse: no hay dos cosas que
 * cuadrar.
 *
 * El cursor lo dibujamos nosotros en la casilla activa. Es la única forma de
 * que el cursor esté donde va a aparecer el carácter siguiente en vez de donde
 * el navegador coloque el punto de inserción del texto centrado.
 *
 * ── LO QUE APORTA ADEMÁS ──
 *
 * · Cada casilla acusa cuando se llena (`acuse-casilla`, 180 ms).
 * · El campo entero confirma cuando se completa (`confirmar`, la única
 *   animación de la casa que sobrepasa).
 * · El campo se sacude cuando el código no vale (`negar`).
 * · El estado se anuncia por `aria-live` sin sacar el foco del campo.
 */

type Modo = "numerico" | "alfanumerico";

export function CampoCodigo({
  id,
  valor,
  onCambio,
  casillas,
  modo = "numerico",
  separadorCada,
  autoComplete,
  estado = "normal",
  etiquetadoPor,
  descritoPor,
  campoRef,
}: {
  id: string;
  valor: string;
  onCambio: (v: string) => void;
  casillas: number;
  modo?: Modo;
  /** Dibuja un guion cada N casillas. `4` sobre 8 casillas da `XXXX-XXXX`. */
  separadorCada?: number;
  autoComplete?: string;
  estado?: "normal" | "error" | "exito";
  etiquetadoPor?: string;
  descritoPor?: string;
  campoRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const propio = useRef<HTMLInputElement>(null);
  const entrada = campoRef ?? propio;
  const [enfocado, setEnfocado] = useState(false);
  const anteriorRef = useRef(valor.length);
  const reaccionId = useId();

  const completo = valor.length === casillas;
  // La casilla activa es la primera vacía; con el código completo se queda en
  // la última, para que el cursor no salte fuera de la retícula.
  const activa = Math.min(valor.length, casillas - 1);

  /*
   * Índice de la casilla que ACABA de llenarse.
   *
   * Se guarda en estado y no se deduce de `valor.length` en el render porque
   * hay que distinguir «esta casilla está llena» de «esta casilla se acaba de
   * llenar»: la animación es lo segundo. Al pegar seis dígitos de golpe no se
   * anima ninguna —la que se anima es la que acompaña a una pulsación— y el
   * campo entero confirma, que es la señal correcta para un pegado.
   */
  const [reciente, setReciente] = useState<number | null>(null);
  useEffect(() => {
    const antes = anteriorRef.current;
    anteriorRef.current = valor.length;
    if (valor.length !== antes + 1) return;
    setReciente(valor.length - 1);
    const t = setTimeout(() => setReciente(null), 200);
    return () => clearTimeout(t);
  }, [valor]);

  const limpiar = (bruto: string) => {
    const sinRuido =
      modo === "numerico"
        ? bruto.replace(/\D/g, "")
        : bruto.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return sinRuido.slice(0, casillas);
  };

  return (
    <div className="relative">
      {/*
        EL INPUT DE VERDAD.

        Va encima de las casillas y ocupa toda la caja, así que tocar cualquier
        casilla enfoca el campo. Es transparente pero NO `opacity-0`: con
        opacidad cero, iOS deja de anclar sobre él la sugerencia «Del mensaje»
        del código de un solo uso, que es la vía por la que este campo se
        rellena en la mitad de los casos.

        `caret-color: transparent` porque el cursor lo dibuja la casilla activa,
        donde de verdad va a aparecer el carácter siguiente. Y `::selection`
        transparente para que seleccionar el texto invisible no pinte una barra
        azul sobre las casillas.
      */}
      <input
        id={id}
        ref={entrada}
        value={valor}
        onChange={(e) => onCambio(limpiar(e.target.value))}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        inputMode={modo === "numerico" ? "numeric" : "text"}
        autoComplete={autoComplete}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        /*
         * SIN `maxLength`, y es un arreglo, no un descuido.
         *
         * El navegador aplica `maxLength` al texto PEGADO antes de que corra el
         * `onChange`. Con `maxLength={6}`, pegar «Tu código de verificación:
         * 384102» dejaba «Tu cód», y el saneado de después borraba las seis
         * letras: campo vacío, sin aviso y sin que se moviera nada. El agente
         * ve que la aplicación ignora el pegado.
         *
         * Es justo el gesto para el que existe un solo input en vez de seis, así
         * que romperlo con un atributo defensivo era pagar el precio sin
         * llevarse la ventaja. El recorte lo hace `limpiar`, DESPUÉS de quitar
         * lo que no es del alfabeto.
         */
        aria-labelledby={etiquetadoPor}
        aria-describedby={[descritoPor, reaccionId].filter(Boolean).join(" ") || undefined}
        aria-invalid={estado === "error" || undefined}
        className="campo-codigo-entrada absolute inset-0 z-10 h-full w-full cursor-text rounded-control bg-transparent text-transparent outline-none"
        style={{ caretColor: "transparent", fontSize: 16 }}
      />

      {/*
        LAS CASILLAS.

        `aria-hidden`: son el dibujo del valor que ya anuncia el input. Un lector
        de pantalla que las leyera diría el código dos veces, la segunda
        carácter a carácter.

        `confirmar` sobre el contenedor y no sobre cada casilla: lo que se
        completa es el código, no un dígito.
      */}
      <div
        aria-hidden
        className={`flex items-stretch gap-1.5 ${completo ? "confirmar" : ""} ${
          estado === "error" ? "negar" : ""
        }`}
      >
        {Array.from({ length: casillas }, (_, i) => {
          const lleno = i < valor.length;
          const puntero = enfocado && i === activa && !completo;
          const separa = separadorCada && i > 0 && i % separadorCada === 0;
          return (
            <div key={i} className="flex flex-1 items-stretch gap-1.5">
              {separa ? (
                <span
                  className="w-1.5 shrink-0 self-center rounded-marca bg-borde"
                  style={{ height: 2 }}
                />
              ) : null}
              <span
                className="casilla-codigo cifra"
                data-lleno={lleno ? "si" : "no"}
                data-activa={puntero ? "si" : "no"}
                data-estado={estado}
                style={reciente === i ? { animation: "acuse-casilla 180ms var(--curva) both" } : undefined}
              >
                {lleno ? valor[i] : ""}
                {puntero ? <i className="cursor-codigo" /> : null}
              </span>
            </div>
          );
        })}
      </div>

      {/*
        El acuse para lectores de pantalla.

        Va aquí y no junto al `<Aviso>` porque el aviso aparece y desaparece: una
        región viva que se desmonta deja de anunciar. Esta se queda siempre
        montada y solo cambia de texto, que es como funciona `aria-live`.
      */}
      <span id={reaccionId} className="sr-only" aria-live="polite">
        {completo ? `Código completo, ${casillas} de ${casillas}` : `${valor.length} de ${casillas}`}
      </span>
    </div>
  );
}
