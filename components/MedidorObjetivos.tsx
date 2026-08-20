"use client";

/**
 * EL MEDIDOR DE OBJETIVOS DEL BONO.
 *
 * La escalera del bono y el progreso hacia ella eran DOS objetos separados: un
 * raíl continuo escalado al escalón siguiente, y debajo una rejilla de tarjetas
 * con los umbrales y sus premios. Funcionaba, y tenía dos costes que solo se ven
 * al mirarlos juntos.
 *
 * **El raíl no sabía dónde acababa el juego.** Medía hasta el escalón siguiente
 * —una decisión correcta, porque contra la escalera entera un 2,4 % no se ve— y
 * las muescas de los escalones ya pasados quedaban comprimidas a su izquierda.
 * O sea que la pieza que enseña el progreso no enseñaba los objetivos, y la que
 * enseñaba los objetivos no enseñaba el progreso. Emparejarlas era trabajo del
 * agente.
 *
 * **Y la rejilla se leía como cuatro cosas.** Cuatro tarjetas de filete en fila
 * son cuatro objetos; lo que hay ahí es UNA escalera con cuatro peldaños.
 *
 * ── EL EJE ES ORDINAL, Y POR ESO ESTO NO MIENTE ──
 *
 * Un segmento por nivel, todos del mismo ancho, y el relleno de cada uno mide
 * el avance dentro de SU tramo. El reparto y el argumento entero de por qué un
 * eje ordinal no distorsiona ninguna escala están en
 * `lib/devengo/objetivos.ts`, que es donde se puede probar.
 *
 * ── EL ESTADO NO VA POR COLOR ──
 *
 * Ni aquí ni en el resto de la aplicación: va por CONTRASTE y por PESO, así que
 * se distingue en escala de grises, en oscuro y con cualquier tema raro del
 * cliente de Telegram. Alcanzado es tinta plena y peso semi; en curso es tinta
 * plena con el raíl un escalón más marcado —`--borde-control` en vez de
 * `--borde`— para que se vea cuál está vivo; pendiente es tinta de apoyo.
 *
 * Nada de amarillo. El amarillo de este sistema es la ACCIÓN, y un progreso no
 * se pulsa. Y nada de medallas, insignias ni rachas: la regla de voz dice que
 * el agente es un profesional que cobra, no alguien a quien haya que animar. Lo
 * que engancha aquí es ver el juego entero y verse dentro de él.
 *
 * ── EL MOMENTO ANIMADO ──
 *
 * Uno solo, y narra la escalera: los segmentos se llenan EN ORDEN, 90 ms uno
 * detrás de otro, de modo que la entrada recorre los niveles de izquierda a
 * derecha y se detiene donde está el agente. Reusa `BarraCreciente`, que es la
 * única forma que tiene esta aplicación de dibujar una medida, y con
 * `prefers-reduced-motion` nace dibujado.
 */

import { tramosDelMedidor, type EscalonObjetivo } from "@/lib/devengo/objetivos";

import { BarraCreciente } from "./Animacion";
import { Importe } from "./Importe";
import { useCadenas } from "./TelegramProvider";

export function MedidorObjetivos({
  registros,
  escalones,
  /**
   * Sin la línea de recuento debajo.
   *
   * La ayuda enseña el medidor para explicar QUÉ es el bono, y allí la banda de
   * la portada ya contesta «cuántos llevas» con su propia línea de métricas
   * —ritmo, proyección, comparación con el mes pasado—. Repetir ahí solo el
   * recuento sería la mitad de esa frase, fuera de su sitio.
   */
  compacto = false,
}: {
  registros: number;
  escalones: readonly EscalonObjetivo[];
  compacto?: boolean;
}) {
  const t = useCadenas();
  const tramos = tramosDelMedidor(registros, escalones);
  if (tramos.length === 0) return null;

  const enCurso = tramos.find((tr) => tr.enCurso);
  const alcanzados = tramos.filter((tr) => tr.alcanzado).length;

  return (
    <section aria-label={t.objetivosDelBono}>
      {/*
        Una sola rejilla para el raíl Y las etiquetas.

        Con dos rejillas hermanas la alineación depende de que las dos declaren
        las mismas columnas y el mismo hueco, y basta con tocar una para que las
        etiquetas dejen de caer bajo su segmento. Con las dos cosas en la misma
        celda, el umbral está debajo de SU tramo por construcción.

        `role="list"` explícito: `list-style: none` le quita a Safari con
        VoiceOver la semántica de lista, y esto es exactamente una lista —los
        niveles del bono, en orden—.
      */}
      <ol
        role="list"
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${tramos.length}, minmax(0, 1fr))` }}
      >
        {tramos.map((tr, i) => (
          <li key={tr.escalon.usuarios} className="min-w-0">
            {/*
              El segmento. Píldora y no un trozo de raíl continuo: el hueco de
              6 px es lo que dice que son NIVELES y no un solo recorrido, y es
              lo que permite que el eje sea ordinal sin tener que explicarlo.

              EL RAÍL ES EL MISMO EN LOS CUATRO, y esto se corrigió mirándolo.
              El tramo en curso llevaba `--borde-control` para marcar cuál está
              vivo, y en claro ese token es un gris medio —existe para que el
              contorno de un control llegue a 3:1 contra el papel—: con el
              relleno al 7 %, la barra viva se leía como una barra LLENA de gris
              oscuro con una muesca casi negra en la punta. La marca de estado
              se comía la medida.

              Cuál está vivo lo dice ya el propio relleno —es el único segmento
              con la barra a medias— y lo confirman sus etiquetas, que van en
              tinta plena mientras las de los pendientes van en tinta de apoyo.
              Dos señales, ninguna de ellas encima del dato.
            */}
            <span className="block h-2 overflow-hidden rounded-marca bg-borde">
              {/* `Math.max(…, 0)` y no un mínimo visible: un nivel que todavía
                  no ha empezado tiene que verse vacío. El mínimo de 1,5 % que
                  usan las barras de la Escalera existe para que un cero se
                  distinga de un fallo de pintado; aquí el raíl vacío ya es un
                  estado legible, y un asomo de relleno en tres niveles sin
                  tocar diría que se ha avanzado en todos. */}
              {tr.relleno > 0 && (
                <BarraCreciente
                  porcentaje={tr.relleno}
                  className="bg-tinta"
                  /* En ORDEN: la entrada recorre la escalera de izquierda a
                     derecha y se para donde está el agente. 90 ms es lo que
                     separa dos peldaños sin que la secuencia se note lenta con
                     cinco niveles. */
                  retardoMs={i * 90}
                />
              )}
            </span>

            {/* El umbral, en cifra tabular para que las cinco columnas alineen
                sus dígitos. Va antes que el premio porque es lo que identifica
                el nivel; el premio es su consecuencia. */}
            <p
              className={`mt-2 text-apoyo tabular-nums ${
                tr.alcanzado || tr.enCurso ? "text-texto" : "text-texto-apoyo"
              }`}
            >
              {t.numero(tr.escalon.usuarios)}
            </p>
            {/* El premio manda dentro de la celda: es la razón de perseguir el
                nivel. Alcanzado en semi, el resto en regular — peso y contraste,
                nunca color. */}
            <p className="mt-0.5">
              <Importe
                texto={tr.escalon.premio.texto}
                className={`text-apoyo ${tr.alcanzado ? "font-semibold" : ""}`}
                apagado={!tr.alcanzado && !tr.enCurso}
              />
            </p>
          </li>
        ))}
      </ol>

      {/*
        La línea que SIEMPRE se mueve.

        Es lo que hace que la pieza siga diciendo algo el día 2 del mes, cuando
        los cuatro segmentos están casi vacíos: cuántos niveles llevas de cuántos
        y cuánto falta para el siguiente. Las dos cifras cambian con el trabajo
        de esta mañana aunque el primer umbral esté a nueve mil registros.
      */}
      {!compacto && (
        <p className="mt-3 text-apoyo text-texto-apoyo tabular-nums">
          {t.nivelesAlcanzados(alcanzados, tramos.length)}
          {enCurso && ` · ${t.faltanRegistros(enCurso.escalon.usuarios - registros)}`}
        </p>
      )}
    </section>
  );
}
