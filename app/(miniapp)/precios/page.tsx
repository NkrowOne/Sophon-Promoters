"use client";

import { useCallback, useState } from "react";

import { Icono } from "@/components/Icono";
import { Banda, Cargando, FalloDeCarga, Pantalla, Vacio } from "@/components/Pantalla";
import { useCadenas, useTelegram } from "@/components/TelegramProvider";
import { useRecurso } from "@/lib/api/recurso";
import type { Cadenas } from "@/lib/i18n";

/**
 * Los precios del programa.
 *
 * ── PARA QUÉ SE ABRE ──
 *
 * No para consultar, sino para **enseñar**. El agente la abre delante del
 * webmaster al que está captando, para contestar la única pregunta que hace
 * todo el mundo antes de decir que sí: «¿y yo cuánto cobro?». Antes esa
 * respuesta no estaba en ninguna parte de la aplicación, así que la
 * conversación de captación era «tú tráeme gente y ya verás».
 *
 * De ahí salen dos decisiones que no son de gusto:
 *
 *  · **No depende de tener equipo.** No lee ni un dato del agente: ni sus
 *    webmasters, ni sus registros, ni su saldo. Un agente recién dado de alta,
 *    con la red a cero, ve exactamente la misma tabla que uno con veinte
 *    webmasters — que es justo cuando más falta hace, porque es cuando está
 *    captando al primero.
 *  · **Habla del webmaster en tercera persona.** «Lo que cobra tu webmaster», no
 *    «lo que cobras». Aquí el agente no es el sujeto: es quien lo está
 *    contando. Su comisión va en su saldo y no se mezcla con esto.
 *
 * ── LA JERARQUÍA ──
 *
 * Sin placa, y por el mismo motivo que `/red`: la respuesta de esta pantalla no
 * es una cifra que quepa en una cabecera, es una tabla. Lo que hace de
 * veredicto es la tarjeta de arriba —los tres precios del nivel en el que está
 * la cuenta HOY—, que es lo que el agente lee en voz alta. La escalera entera
 * viene después y contesta otra pregunta: «¿y esto puede subir?».
 *
 * Un objeto con relieve y ni uno más, el de la respuesta. La escalera va de
 * tabla sobre la banda: siete filas de datos no son siete objetos levantados.
 *
 * ── LO QUE NO SE ENSEÑA ──
 *
 * El precio global y el reparto del Operador: la resta se hace en el servidor
 * (`lib/precios/tabla.ts`) y aquí llega solo el neto, así que no hay forma de
 * deducirlo ni equivocándose al pintar.
 *
 * Y tampoco **cuánto llevan pagado los usuarios este mes**. Estuvo aquí, con su
 * «te faltan X para LV5», y se ha retirado: esa cifra es de la cuenta maestra
 * —el volumen de todos los agentes juntos— así que cada agente estaba leyendo
 * el tamaño del negocio de arriba. No se sustituye por la suya porque no existe
 * una suya: el nivel es de la cuenta entera. Lo que queda es la escalera con
 * sus umbrales, que es lo verdadero y lo único que hace falta para contarla.
 */

interface Importe {
  micros: string;
  texto: string;
}

interface FilaTier {
  tier: string;
  paises: string[];
  /** Nivel → lo que cobra el webmaster por cada 100 usuarios. */
  porNivel: Record<string, Importe>;
}

interface Respuesta {
  nivelActual: number;
  niveles: number[];
  tiers: FilaTier[];
  requisitos: { nivel: number; minimo: Importe }[];
}

export default function Precios() {
  const t = useCadenas();
  const { haptica } = useTelegram();
  /*
   * El nivel que se está mirando. `null` = ninguno, y ese es el estado inicial.
   *
   * No arranca en el nivel de la cuenta —ni en LV0— a propósito: cualquier
   * valor de partida es la pantalla afirmando un nivel, y el de la cuenta
   * maestra no es el de ningún webmaster. Vacío no miente, y de paso obliga a la
   * tarjeta a explicar cómo se llena.
   */
  const [elegido, setElegido] = useState<number | null>(null);

  const elegir = useCallback(
    (nivel: number) => {
      haptica("seleccion");
      // Volver a tocar el mismo lo deselecciona. Sin esto no habría forma de
      // regresar a «ningún nivel» sin recargar, y ese estado es el que enseña la
      // tabla entera sin que ninguna fila tire de la vista.
      setElegido((actual) => (actual === nivel ? null : nivel));
    },
    [haptica],
  );
  // Igual que el resto de pantallas: lo último que se supo se pinta en el
  // primer fotograma al volver. Aquí importa más que en ninguna, porque volver
  // atrás y adelante es lo que hace el agente mientras lo enseña.
  const { datos, error, recargar: cargar } = useRecurso<Respuesta>("/api/agente/precios");

  if (error) {
    return (
      <Pantalla titulo={t.preciosDelPrograma}>
        <FalloDeCarga error={error} onReintentar={cargar} />
      </Pantalla>
    );
  }

  if (!datos) {
    return (
      <Pantalla titulo={t.preciosDelPrograma}>
        <Cargando que={t.sondeando} />
      </Pantalla>
    );
  }

  if (datos.tiers.length === 0) {
    return (
      <Pantalla titulo={t.preciosDelPrograma}>
        <Vacio titulo={t.sinPrecios} apoyo={t.sinPreciosApoyo} />
      </Pantalla>
    );
  }

  const { niveles, tiers, requisitos } = datos;

  return (
    <Pantalla titulo={t.preciosDelPrograma}>
      <Banda orden={0} tono={0} className="pb-6">
        <p className="text-apoyo text-texto-apoyo">{t.preciosParaEnsenar}</p>

        {/*
          LA TARJETA: los tres tiers, sus países, y el precio del nivel ELEGIDO.

          Es el único objeto con relieve de la pantalla y el único que lleva la
          malla de marca por detrás, igual que la tarjeta del bono en la portada
          y la del código en el alta: el color se extiende donde está la
          respuesta, y en ningún otro sitio.

          Aquí había una píldora con «LV4» —el nivel de la cuenta maestra— y los
          precios de ese nivel. Se ha ido con él: ese nivel no es el de ningún
          webmaster, así que la tarjeta estaba afirmando de quien mira algo que
          no era verdad de nadie. Ahora **no hay nivel por defecto**: la columna
          de precios nace vacía y se llena al elegir uno abajo.
        */}
        <div className="tarjeta campo-malla mt-5">
          <p className="text-rotulo text-texto-apoyo">{t.loQueCobraTuWebmaster}</p>
          {/* La línea de debajo cambia de trabajo según haya nivel elegido o no.
              Sin elegir, su sitio es lo único que puede decir cómo se llena la
              columna vacía: un control que no anuncia que se puede tocar no
              existe. Con nivel elegido vuelve a ser la unidad de la cifra, que
              es lo que hay que leer al lado del importe. */}
          <p className="mt-1 text-apoyo text-texto-apoyo">
            {elegido === null ? t.tocaUnNivel : t.porCadaCienUsuarios}
          </p>

          <ul className="mt-4 divide-y divide-junta" role="list">
            {tiers.map((fila) => (
              <FilaDePrecio key={fila.tier} fila={fila} nivel={elegido} etiquetas={t} />
            ))}
          </ul>
        </div>
      </Banda>

      {/* La escalera entera. Contesta «¿y esto puede subir?», que es otra
          pregunta que la de arriba, y por eso es otra banda y no otro párrafo
          dentro de la tarjeta. */}
      <Banda orden={1} tono={1} etiqueta={t.losNiveles} className="py-6">
        <p className="text-rotulo text-texto-apoyo">{t.losNiveles}</p>

        {/*
          Una TABLA de verdad, no una retícula de divs.

          Es una matriz de nivel × tier, así que las cabeceras tienen que estar
          asociadas a sus celdas: con `<div>` un lector de pantalla lee catorce
          cifras sueltas, y con `<th scope>` lee «LV4, T2, 40,00 $». Y encima
          sale gratis, porque lo que hay que pintar es exactamente una tabla.

          Envuelta en su propio `overflow-x`: con cinco tiers —Sophon puede
          añadir uno— o con importes de cinco cifras, la tabla se desborda antes
          que la página, y lo que tiene que rodar es ella y no la pantalla.
        */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-apoyo tabular-nums">
            <caption className="sr-only">{t.losNiveles}</caption>
            <thead>
              <tr className="border-b border-junta text-texto-apoyo">
                <th scope="col" className="py-2 text-start font-semibold">
                  {t.nivel}
                </th>
                {tiers.map((fila) => (
                  <th key={fila.tier} scope="col" className="py-2 text-end font-semibold">
                    {fila.tier}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-junta">
              {niveles.map((nivel) => {
                const esElElegido = nivel === elegido;
                const requisito = requisitos.find((r) => r.nivel === nivel);
                return (
                  <tr
                    key={nivel}
                    /* El nivel elegido se marca por PESO y por tinta, no por
                       color: es el mismo criterio que los escalones del bono en
                       la portada, y es lo único que se distingue en escala de
                       grises y con cualquier tema raro del cliente.

                       Y NADA está marcado hasta que alguien elige: la tabla
                       nace entera en tinta de apoyo. Marcar una fila por defecto
                       sería volver a afirmar un nivel, que es justo lo que se ha
                       quitado de arriba. */
                    className={esElElegido ? "font-semibold text-texto" : "text-texto-apoyo"}
                    aria-current={esElElegido ? "true" : undefined}
                  >
                    {/* `font-[inherit]`: un `th` nace en negrita por defecto, y
                        aquí quien decide el peso es la FILA. Sin esto, la
                        columna de niveles salía toda en negrita y la marca del
                        elegido dejaba de distinguirse justo en su propia celda. */}
                    <th scope="row" className="p-0 text-start font-[inherit]">
                      {/*
                        Un BOTÓN de verdad dentro de la celda, y no un `onClick`
                        sobre la fila.

                        Una `<tr>` con manejador no es alcanzable con el
                        tabulador, no se activa con Enter y no se anuncia como
                        algo que se pueda pulsar: quien navegue con teclado o
                        con lector de pantalla se encontraría una tabla con una
                        interacción invisible. El botón lo trae todo hecho, y
                        `aria-pressed` dice además cuál está elegido.

                        Ocupa la celda entera (`w-full`, relleno propio) para
                        que el objetivo táctil sea la fila y no el texto: son
                        44 px largos de alto con el umbral debajo.
                      */}
                      <button
                        type="button"
                        onClick={() => elegir(nivel)}
                        aria-pressed={esElElegido}
                        className="pulsable w-full rounded-control py-2.5 pe-3 text-start"
                      >
                        <span className="block">LV{nivel}</span>
                        {/* El umbral, debajo y pequeño: es la condición de esa
                            fila, no una cuarta cifra que comparar con las otras
                            tres. Puesto en su propia columna, la tabla pasaba de
                            cuatro columnas a cinco y en un móvil de 390 px las de
                            dinero se partían en dos líneas. */}
                        {requisito && (
                          <span className="block text-rotulo font-normal opacity-70">
                            {t.nivelHaceFalta(requisito.minimo.texto)}
                          </span>
                        )}
                      </button>
                    </th>
                    {tiers.map((fila) => (
                      <td key={fila.tier} className="py-2.5 ps-3 text-end">
                        {fila.porNivel[String(nivel)]?.texto ?? "—"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-apoyo text-texto-apoyo">{t.comoSubeElNivel}</p>
        {/* La línea que evita el malentendido caro: un agente que lea esta
            pantalla puede concluir que cobra menos por estar en un nivel bajo, y
            no es así. Se dice aquí, pegada a la escalera que lo sugiere. */}
        <p className="mt-2 text-apoyo text-texto-apoyo">{t.tuComisionNoDependeDelNivel}</p>
      </Banda>
    </Pantalla>
  );
}

/**
 * Un tier: su precio y, plegados, sus países.
 *
 * Los países van en un `<details>` NATIVO y no en un desplegable propio. Son
 * entre quince y treinta y pico por tier —más de setenta en total—, y pintarlos
 * todos deja la respuesta enterrada bajo un muro de nombres. Plegados, la
 * pantalla contesta primero lo que se pregunta siempre —cuánto— y guarda para
 * un toque lo que se pregunta a veces —si tal país entra—.
 *
 * Nativo porque un `<details>` ya trae el estado abierto/cerrado, el foco, el
 * teclado y el anuncio al lector de pantalla, y porque el buscador del navegador
 * encuentra texto dentro de uno cerrado. Reinventarlo con `useState` habría sido
 * cambiar todo eso por una flecha propia.
 *
 * Los países van como texto separado por comas y no como una retícula de
 * píldoras: son una lista de nombres, se leen como una frase, y treinta cápsulas
 * con borde convertirían un dato en un panel de control.
 */
function FilaDePrecio({
  fila,
  nivel,
  etiquetas: t,
}: {
  fila: FilaTier;
  /** `null` mientras no se haya elegido ninguno: entonces no hay precio que dar. */
  nivel: number | null;
  etiquetas: Cadenas;
}) {
  const precio = nivel === null ? undefined : fila.porNivel[String(nivel)];

  return (
    <li>
      <details className="group">
        {/* `min-h-14` son 56 px, muy por encima del mínimo táctil de 44: se
            despliega con el pulgar, de pie y a menudo delante de otra persona.
            `list-none` + el `::-webkit-details-marker` de la hoja quitan el
            triángulo del navegador, que no es el chevron de esta aplicación. */}
        <summary className="pulsable -mx-2 flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-control px-2 [&::-webkit-details-marker]:hidden">
          <span className="text-cuerpo font-semibold">{fila.tier}</span>
          <span className="text-apoyo text-texto-apoyo">{t.paisesDelTier(fila.paises.length)}</span>
          <span className="cifra ms-auto tabular-nums">{precio?.texto ?? "—"}</span>
          {/* Gira 90° al abrir, sin transición: la gramática de movimiento de
              esta aplicación dice que solo se mueve lo que MIDE algo, y un
              chevron no mide nada. Lo que hace es cambiar de estado, y eso se
              acusa con la posición final. */}
          <Icono
            nombre="avance"
            tam={18}
            className="shrink-0 text-texto-apoyo group-open:rotate-90"
          />
        </summary>

        {/* Ordenados alfabéticamente y no en el orden de Sophon: se busca un
            país concreto —«¿y Colombia?»—, y en una lista de treinta nombres sin
            orden esa búsqueda es leerla entera. */}
        <p className="-mt-1 pb-3.5 text-apoyo text-texto-apoyo">
          {[...fila.paises].sort((a, b) => a.localeCompare(b)).join(", ")}
        </p>
      </details>
    </li>
  );
}
