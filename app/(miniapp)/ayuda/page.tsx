"use client";

import { Icono } from "@/components/Icono";
import { Banda, Pantalla } from "@/components/Pantalla";
import { useCadenas, useTelegram } from "@/components/TelegramProvider";
import type { Comisiones } from "@/lib/api/comisiones";
import { useRecurso } from "@/lib/api/recurso";
import { faq, type SeccionFaq } from "@/lib/faq";

/**
 * La ayuda: las preguntas que hasta ahora se contestaban por Telegram.
 *
 * ── PARA QUÉ SE ABRE ──
 *
 * No para aprender la aplicación: para desatascarse. Se abre con una duda
 * concreta y con algo de prisa —«¿por qué mi disponible es menos que lo
 * ganado?», «¿cuánto tarda un cobro?»— y muchas veces con la otra pantalla a
 * medias. Eso decide la forma entera:
 *
 *  · **Todas las preguntas visibles de golpe, las respuestas plegadas.** Un
 *    índice de veintitantas líneas se recorre con el pulgar en dos segundos;
 *    veintitantas respuestas abiertas son ocho pantallas de scroll en las que
 *    hay que ir leyendo para encontrar la tuya.
 *  · **`<details>` nativo y no un acordeón con estado.** Abre y cierra sin
 *    JavaScript, lleva el foco de teclado puesto y el buscador del sistema
 *    encuentra el texto aunque esté cerrado. Esta es la pantalla que se abre
 *    cuando algo va mal, así que es la última que puede depender de que la
 *    hidratación haya terminado.
 *  · **Sin buscador.** Cinco secciones con nombre y veintitrés preguntas caben
 *    en un índice; un campo de búsqueda aquí sería una caja que hay que llenar
 *    para empezar a leer, y encima obligaría a resolver la búsqueda sin acentos
 *    en cinco lenguas incluida una que no se escribe con el mismo alfabeto.
 *
 * ── LAS CIFRAS SON LAS DE VERDAD ──
 *
 * Las respuestas que hablan de dinero —lo que se cobra por registro, el
 * porcentaje del PRO, el mínimo para pedir, el primer nivel del bono— no llevan
 * el número escrito en el texto: entran por `/api/agente/comisiones`, que los
 * lee de la tarifa y la escalera vigentes. Un FAQ que promete «0,03 $» tres
 * meses después de que la tarifa cambiara es peor que no tener FAQ.
 *
 * Y cada respuesta tiene su redacción sin cifra para cuando el dato todavía no
 * existe. Eso vive en `lib/faq.ts`, con el texto; aquí solo se pinta.
 *
 * ── LO QUE NO SE ENSEÑA ──
 *
 * La regla de siempre: ni el precio global, ni lo que cobra el webmaster, ni el
 * reparto de arriba. Esto contesta a «¿cuánto cobro yo?». Lo del webmaster está
 * en `/precios`, que es la pantalla que existe para enseñárselo a él.
 */
export default function Ayuda() {
  const t = useCadenas();
  const { idioma } = useTelegram();
  /*
   * ESTA PANTALLA NO SE BLOQUEA POR LA API, y es la única de la aplicación que
   * puede permitírselo porque es la única cuyo contenido es LOCAL.
   *
   * Las demás gatean con `Cargando` y `FalloDeCarga`, y hacen bien: sin datos no
   * tienen nada que enseñar. Aquí sí lo hay —veintitrés respuestas, en el
   * paquete—, y encima esta es la pantalla que se abre justo cuando algo va
   * mal. Un aviso de «no hemos podido cargar» tapando la ayuda el día que la red
   * falla es el peor momento posible para quedarse sin ayuda.
   *
   * Así que las cifras son un ADORNO que llega si llega: cada respuesta que usa
   * una tiene su redacción sin ella, escrita en `lib/faq.ts`.
   */
  const { datos } = useRecurso<Comisiones>("/api/agente/comisiones");

  const primero = datos?.bonos[0];
  const secciones = faq(idioma, {
    cpa: datos?.cpa?.texto ?? null,
    cps: datos?.cps ?? null,
    minimo: datos?.minimoRetiro.texto ?? null,
    primerNivel: primero
      ? { usuarios: t.numero(primero.usuarios), premio: primero.premio.texto }
      : null,
  });

  return (
    <Pantalla titulo={t.ayuda}>
      {/*
        Sin placa. La placa presenta LA RESPUESTA de su pantalla y aquí no hay
        ninguna cifra que presida: lo que preside es una lista de preguntas.
        Ponerle una banda de espresso con un recuento —«23 preguntas»— sería
        titular con un dato que a nadie le hace falta.
      */}
      {/* Las bandas van como HERMANAS directas, sin envoltorio: la junta entre
          estratos es `.banda + .banda`, un selector de hermano adyacente, y un
          `div` en medio la desactiva entera. Ya pasó en `/red/[id]` y en
          `/alta`, y se ve igual: cinco secciones sin una sola línea entre
          ellas. El aire de arriba lo pone este párrafo. */}
      <p className="mb-1 text-apoyo text-texto-apoyo">{t.ayudaApoyo}</p>

      {secciones.map((seccion, i) => (
        <Seccion key={seccion.titulo} seccion={seccion} orden={i} />
      ))}

      {/*
        La salida. Un FAQ sin salida es un callejón: quien llega al final es
        justo quien no ha encontrado lo suyo, y dejarle ahí con la última
        respuesta de otra persona es la peor forma de terminar una ayuda.
      */}
      <Banda tono={0} orden={secciones.length} etiqueta={t.ayudaNoResuelta} className="py-7">
        <p className="text-cuerpo font-semibold">{t.ayudaNoResuelta}</p>
        <p className="mt-1.5 text-apoyo text-texto-apoyo">{t.ayudaNoResueltaApoyo}</p>
      </Banda>
    </Pantalla>
  );
}

/**
 * Una sección: su nombre y sus preguntas.
 *
 * Cada una es una BANDA y no una tarjeta. Cinco tarjetas iguales apiladas son
 * la forma por defecto de partir una pantalla y no significan nada aquí; los
 * estratos a sangre son la gramática que esta aplicación ya usa para decir
 * «esto es otro asunto», y alternar los tres tonos hace que se distingan sin
 * una sola línea de más.
 *
 * El rótulo NO es un `h2` decorativo: al ir dentro de una `section` con
 * `aria-label`, un lector de pantalla puede saltar de sección en sección, que
 * es exactamente cómo se recorre un índice de veintitrés preguntas sin verlo.
 */
function Seccion({ seccion, orden }: { seccion: SeccionFaq; orden: number }) {
  return (
    <Banda tono={(orden % 3) as 0 | 1 | 2} orden={orden} etiqueta={seccion.titulo} className="py-6">
      <h2 className="text-rotulo text-texto-apoyo">{seccion.titulo}</h2>
      {/* La junta separa preguntas dentro de una sección, igual que separa
          filas en el menú de la portada o cobros en el historial. Es la misma
          línea con el mismo significado: «esto de aquí es otra fila». */}
      <div className="mt-1 divide-y divide-junta">
        {seccion.preguntas.map((p) => (
          <details key={p.pregunta} className="pregunta">
            <summary>
              {/* La pregunta va en cuerpo y en peso medio: es el índice, y lo que
                  el pulgar recorre buscando la suya. La respuesta va en apoyo,
                  un escalón por detrás, porque solo se lee una vez encontrada. */}
              <span className="text-cuerpo font-medium">{p.pregunta}</span>
              {/* `mt-0.5` alinea el chevron con la PRIMERA línea de la pregunta
                  y no con el centro del bloque: con dos líneas, centrado se
                  queda flotando entre las dos y deja de señalar nada. */}
              <Icono nombre="desplegar" tam={20} className="chevron mt-0.5 text-texto-apoyo" />
            </summary>
            <div className="respuesta pb-4">
              {p.respuesta.map((parrafo, i) => (
                <p key={i} className={`text-apoyo text-texto-apoyo ${i > 0 ? "mt-2" : ""}`}>
                  {parrafo}
                </p>
              ))}
            </div>
          </details>
        ))}
      </div>
    </Banda>
  );
}
