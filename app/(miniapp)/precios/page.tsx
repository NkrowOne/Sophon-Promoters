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
 * ── LA JERARQUÍA, Y EL NIVEL QUE LA GOBIERNA ──
 *
 * Todo lo que se pinta depende de UN nivel, así que ese nivel preside: va en la
 * placa, y su rótulo es además el título de la pantalla. Debajo, la tarjeta con
 * los tres precios de ese nivel —lo que el agente lee en voz alta— y después la
 * escalera entera, que contesta otra pregunta: «¿y esto puede subir?».
 *
 * La escalera no solo se lee: **se toca**. Elegir una fila cambia el nivel de la
 * placa y los precios de la tarjeta, que es como se enseña «si llegas aquí,
 * cobrarías esto». Al entrar manda el primer peldaño, el de quien empieza hoy.
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
 * Y nada de la CUENTA MAESTRA. Estuvieron aquí su volumen de compra del mes
 * —«te faltan X para LV5»— y su nivel, con una píldora «LV4» arriba, y los dos
 * se han ido: el primero contaba a cada agente el tamaño del negocio de arriba,
 * y el segundo afirmaba de quien mira un nivel que no es el de ningún
 * webmaster. El nivel de la placa no dice en cuál ESTÁ nadie: dice cuál se está
 * mirando.
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
  niveles: number[];
  /** Porcentajes ya formateados. `agente` es `null` si no hay tarifa en vigor. */
  reparto: { webmaster: string; agente: string | null };
  tiers: FilaTier[];
  requisitos: { nivel: number; minimo: Importe }[];
}

export default function Precios() {
  const t = useCadenas();
  const { haptica } = useTelegram();
  /*
   * El nivel ELEGIDO A MANO, o `null` si todavía no se ha tocado ninguno.
   *
   * `null` no significa «sin nivel»: significa «sin elegir», y entonces se
   * enseña el primero de la escalera. Se guarda así, y no con el nivel ya
   * dentro, porque el estado se declara antes de que la respuesta llegue: con
   * un valor inicial habría que corregirlo en un efecto en cuanto se supiera
   * cuál es el primero de verdad, y esa corrección es un repintado y un
   * fotograma con el nivel equivocado.
   */
  const [elegido, setElegido] = useState<number | null>(null);

  const elegir = useCallback(
    (nivel: number) => {
      haptica("seleccion");
      // Sin alternar: tocar el elegido NO lo suelta. Al arrancar en el primer
      // nivel siempre hay uno puesto, así que «ninguno» dejaría la placa sin
      // cifra y la tarjeta sin precios — un estado que ya no significa nada.
      setElegido(nivel);
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

  const { niveles, tiers, requisitos, reparto } = datos;

  /*
   * El nivel que se está enseñando: el elegido a mano, o el PRIMERO de la
   * escalera mientras no se haya tocado ninguno.
   *
   * El primero y no un cero escrito a mano: los niveles salen de Sophon, y si
   * algún día su escalera empezara en otro sitio, un `0` fijo pediría precios
   * de un nivel que no existe y la tarjeta se llenaría de guiones.
   */
  const nivelVisto = elegido ?? niveles[0] ?? 0;
  const esElInicial = nivelVisto === niveles[0];
  const requisitoVisto = requisitos.find((r) => r.nivel === nivelVisto);

  return (
    <Pantalla
      /*
       * LA PLACA: el nivel que gobierna todo lo que hay debajo.
       *
       * Su rótulo es el `h1` de la pantalla —así lo define `Placa`—, de modo que
       * nombrar la pantalla y presentar la cifra son la misma pieza. Por eso el
       * rótulo sigue siendo «Precios del programa» y no «Nivel»: lo que esto es
       * sigue siendo una tabla de precios; el nivel es la llave para leerla.
       *
       * La cifra es el nivel y no un importe, y es la primera placa de la
       * aplicación que no lleva dinero. Cabe: la placa presenta LA RESPUESTA de
       * su pantalla, y aquí la respuesta a «¿cuánto cobra?» empieza por «¿en qué
       * nivel?». Los tres importes vienen justo debajo, en la tarjeta.
       *
       * El apoyo cambia con el nivel: en el primero dice que es el de partida
       * —que es lo que hay que contarle a alguien que empieza— y en los demás,
       * lo que hace falta para llegar.
       */
      placa={{
        rotulo: t.preciosDelPrograma,
        valor: <span className="text-cifra-mayor tabular-nums">LV{nivelVisto}</span>,
        apoyo: esElInicial
          ? t.nivelInicial
          : requisitoVisto
            ? t.nivelHaceFalta(requisitoVisto.minimo.texto)
            : undefined,
      }}
    >
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
          no era verdad de nadie. El nivel que manda ahora es el de la placa, y
          arranca en el primero de la escalera: el de quien empieza hoy.
        */}
        <div className="tarjeta campo-malla mt-6">
          <p className="text-rotulo text-texto-apoyo">{t.loQueCobraTuWebmaster}</p>
          <p className="mt-1 text-apoyo text-texto-apoyo">{t.porCadaCienUsuarios}</p>

          <ul className="mt-4 divide-y divide-junta" role="list">
            {tiers.map((fila) => (
              <FilaDePrecio key={fila.tier} fila={fila} nivel={nivelVisto} etiquetas={t} />
            ))}
          </ul>
        </div>

        {/*
          EL OTRO INGRESO, y va FUERA de la tarjeta a propósito.

          La tarjeta contesta «cuánto por cada 100 registros». Esto contesta otra
          cosa: qué porcentaje se lleva de lo que esos usuarios gasten después en
          su PRO. Son dos ingresos que conviven —se cobran los dos— y meterlos en
          la misma caja hace pensar que uno sustituye al otro.

          La parte del agente va en su propia frase y detrás. Es la única línea
          de la pantalla que habla de lo que cobra ÉL, y el resto está escrito
          desde el punto de vista del webmaster; mezclarlas en una sola frase
          —«él el 35 % y tú el 5 %»— convierte la pantalla que se enseña en una
          pantalla que hay que tapar a medias.
        */}
        <p className="mt-5 text-apoyo text-texto-apoyo">
          {t.repartoDeLasCompras(reparto.webmaster)}
          {/* Sin tarifa configurada no hay porcentaje que dar, y no se inventa
              un cero: «cobras el 0 %» no es lo mismo que «esto aún no está
              puesto», y el agente no puede distinguirlos desde aquí. */}
          {reparto.agente !== null && ` ${t.repartoDelAgente(reparto.agente)}`}
        </p>
      </Banda>

      {/* La escalera entera. Contesta «¿y esto puede subir?», que es otra
          pregunta que la de arriba, y por eso es otra banda y no otro párrafo
          dentro de la tarjeta. */}
      <Banda orden={1} tono={1} etiqueta={t.losNiveles} className="py-6">
        <p className="text-rotulo text-texto-apoyo">{t.losNiveles}</p>
        {/* Va aquí, pegada al control, y no al pie: el resultado de tocar sale
            en la placa, que con siete filas de tabla por medio queda fuera de la
            vista. Si no dice dónde mirar, el toque parece no hacer nada. */}
        <p className="mt-1 text-apoyo text-texto-apoyo">{t.tocaUnNivel}</p>

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
                const esElElegido = nivel === nivelVisto;
                const requisito = requisitos.find((r) => r.nivel === nivel);
                return (
                  <tr
                    key={nivel}
                    /* El nivel elegido se marca por PESO y por tinta, no por
                       color: es el mismo criterio que los escalones del bono en
                       la portada, y es lo único que se distingue en escala de
                       grises y con cualquier tema raro del cliente.

                       Lo marcado es lo que se está VIENDO, que al entrar es el
                       primer nivel. No se afirma nada de quien mira —eso era la
                       píldora «LV4» que se quitó—: se dice qué fila corresponde
                       a los precios de arriba, que es lo que ata las dos mitades
                       de la pantalla. */
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
        {/* Cuándo se cierra la cuenta y desde cuándo rige. Va en su propio
            párrafo y detrás: primero de dónde sale el nivel, después cuándo
            entra. Juntos en uno, la fecha se pierde dentro de la explicación, y
            es justo la mitad que el agente tiene que saber decir —alcanzar el
            hito no es cobrarlo ya—. */}
        <p className="mt-2 text-apoyo text-texto-apoyo">{t.cuandoSeAplicaElNivel}</p>
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
