"use client";

import { useMemo, useState } from "react";

import { Icono } from "@/components/Icono";
import { MedidorObjetivos } from "@/components/MedidorObjetivos";
import { Banda, Pantalla } from "@/components/Pantalla";
import { useCadenas, useTelegram } from "@/components/TelegramProvider";
import type { Comisiones } from "@/lib/api/comisiones";
import { useRecurso } from "@/lib/api/recurso";
import { contarPreguntas, faq, filtrarFaq, type SeccionFaq } from "@/lib/faq";

/**
 * La ayuda: las preguntas que hasta ahora se contestaban por Telegram.
 *
 * ── PARA QUÉ SE ABRE ──
 *
 * No para aprender la aplicación: para desatascarse. Se abre con una duda
 * concreta y con algo de prisa, y muchas veces con la otra pantalla a medias.
 *
 * ── LO QUE ESTABA MAL, Y SE VEÍA EN UNA CAPTURA ──
 *
 * Veintitrés preguntas en cinco secciones se leían apelmazadas: una sola
 * textura gris de arriba abajo. El diagnóstico, mirando la pantalla con los
 * ojos entrecerrados:
 *
 *  · **Los encabezados de sección no encabezaban.** Iban en `text-rotulo`
 *    atenuado —13 px— mientras las preguntas iban en cuerpo blanco de 16. O
 *    sea que lo que estructura pesaba MENOS que lo estructurado, y las cinco
 *    secciones no separaban nada.
 *  · **Un solo intervalo, repetido.** Mismo relleno en las veintitrés filas.
 *    Sin contraste entre lo apretado y lo suelto no hay ritmo, y sin ritmo una
 *    lista larga es una textura.
 *  · **Ninguna forma de saltar.** ~1.200 px de índice y solo el recorrido
 *    lineal para atravesarlo.
 *
 * ── LO QUE SE HACE ──
 *
 *  1. **Un buscador, y arriba del todo.** Aquí decía «sin buscador: cinco
 *     secciones con nombre y veintitrés preguntas caben en un índice». Cabían,
 *     pero recorrerlas cuesta cinco pantallas de pulgar con una duda concreta
 *     en la cabeza. Filtra por pregunta Y por respuesta, porque nadie teclea
 *     «¿Qué ocurre si la red es incorrecta?»: teclea «red» o «TRC20», y esas
 *     palabras están en el cuerpo.
 *  2. **Los encabezados pasan a título**, en tinta plena y con aire generoso
 *     por encima. Más espacio arriba que abajo: un encabezado pertenece a lo
 *     que abre, no a lo que cierra.
 *  3. **Ritmo.** Las filas respiran (44 px de objetivo táctil holgado), la
 *     separación entre secciones es cuatro veces la separación entre filas, y
 *     la respuesta abre con su propio aire.
 *
 * ── LO QUE NO CAMBIA ──
 *
 * El elemento `details` nativo: abre y cierra sin JavaScript, trae el foco de
 * teclado puesto y el buscador del sistema encuentra el texto aunque esté
 * cerrado. Es la pantalla que se abre cuando algo va mal, así que es la última
 * que puede depender de la hidratación. El filtro sí necesita JavaScript, y por
 * eso degrada bien: sin él, el campo no filtra y están las veintitrés.
 *
 * Y las cifras siguen sin bloquear la pantalla: el texto es local y entran si
 * entran.
 */
export default function Ayuda() {
  const t = useCadenas();
  const { idioma } = useTelegram();
  const { datos } = useRecurso<Comisiones>("/api/agente/comisiones");
  const [busqueda, setBusqueda] = useState("");

  const primero = datos?.bonos[0];
  const secciones = useMemo(
    () =>
      faq(idioma, {
        cpa: datos?.cpa?.texto ?? null,
        cps: datos?.cps ?? null,
        minimo: datos?.minimoRetiro.texto ?? null,
        primerNivel: primero
          ? { usuarios: t.numero(primero.usuarios), premio: primero.premio.texto }
          : null,
      }),
    [idioma, datos, primero, t],
  );

  const filtradas = useMemo(() => filtrarFaq(secciones, busqueda), [secciones, busqueda]);
  const total = contarPreguntas(secciones);
  const encontradas = contarPreguntas(filtradas);
  const buscando = busqueda.trim().length > 0;

  return (
    <Pantalla titulo={t.ayuda}>
      <p className="text-apoyo text-texto-apoyo">{t.ayudaApoyo}</p>

      {/*
        EL BUSCADOR, y pegajoso.

        Suelto arriba serviría para la primera pantalla y para ninguna más: la
        duda concreta aparece a mitad de recorrido, y entonces hay que subir
        cinco pantallas para poder escribirla. Pegado, el atajo está donde se
        necesita sin ocupar sitio permanente en la lectura.

        `top: -1px` y no `0`: con el borde exacto, el redondeo del navegador
        deja pasar una línea del contenido por encima del campo al desplazar.
        Un píxel de solape lo cierra y no se ve.
      */}
      <div className="sticky top-[-1px] z-10 -mx-[var(--margen-pantalla)] mt-4 bg-fondo px-[var(--margen-pantalla)] pb-3 pt-3">
        <div className="relative">
          {/*
            La lupa DENTRO del campo y no fuera: un icono al lado es un adorno;
            dentro, es lo que dice para qué sirve la caja antes de leer el texto
            de ayuda. `pointer-events-none` para que el toque siempre caiga en
            el campo, incluso justo encima del dibujo.
          */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 flex items-center text-texto-apoyo"
            /* Propiedad lógica: en árabe la lupa se va sola al otro lado. */
            style={{ insetInlineStart: "0.875rem" }}
          >
            <Icono nombre="buscar" tam={18} />
          </span>
          <input
            type="search"
            inputMode="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t.buscarEnLaAyuda}
            aria-label={t.buscarEnLaAyuda}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            /* El hueco de la lupa y el del aspa los pone `.campo-busqueda`, en la
               hoja: con utilidades no se aplicaban —`.campo-texto` declara
               `padding` en atajo y esta hoja va detrás de Tailwind—, y el
               marcador de posición se pintaba encima de la lupa. */
            className="campo-texto campo-busqueda w-full text-cuerpo"
          />
          {buscando && (
            /* La equis solo cuando hay algo que borrar. Objetivo de 44 px
               aunque el aspa mida 16, que es la diferencia entre un control y
               un dibujo que hay que acertar. */
            <button
              type="button"
              onClick={() => setBusqueda("")}
              aria-label={t.limpiarBusqueda}
              className="absolute inset-y-0 my-auto flex h-11 w-11 items-center justify-center text-texto-apoyo"
              style={{ insetInlineEnd: "0.25rem" }}
            >
              <Icono nombre="cerrar" tam={17} />
            </button>
          )}
        </div>

        {/* El recuento solo mientras se filtra. Fijo diría «23 de 23» en una
            pantalla donde nadie ha preguntado cuántas hay. */}
        {buscando && (
          <p className="mt-2 text-apoyo text-texto-apoyo tabular-nums" aria-live="polite">
            {t.preguntasEncontradas(encontradas, total)}
          </p>
        )}
      </div>

      {filtradas.length === 0 ? (
        /* Sin resultados. Dice qué se buscó —para que se vea la errata— y
           ofrece la salida, que es la misma con la que termina la página. */
        <Banda tono={0} orden={0} etiqueta={t.sinResultados(busqueda.trim())} className="py-8">
          <p className="text-cuerpo">{t.sinResultados(busqueda.trim())}</p>
          <p className="mt-1.5 text-apoyo text-texto-apoyo">{t.ayudaNoResueltaApoyo}</p>
        </Banda>
      ) : (
        filtradas.map((seccion, i) => (
          <Seccion key={seccion.titulo} seccion={seccion} orden={i} datos={datos} />
        ))
      )}

      {/*
        La salida. Un FAQ sin salida es un callejón: quien llega al final es
        justo quien no ha encontrado lo suyo. Se calla mientras se filtra —ahí
        el estado vacío ya la ofrece— para no repetirla dos veces en la misma
        pantalla.
      */}
      {!buscando && (
        <Banda
          tono={0}
          orden={filtradas.length}
          etiqueta={t.ayudaNoResuelta}
          className="py-8"
        >
          <p className="text-cuerpo font-semibold">{t.ayudaNoResuelta}</p>
          <p className="mt-1.5 text-apoyo text-texto-apoyo">{t.ayudaNoResueltaApoyo}</p>
        </Banda>
      )}
    </Pantalla>
  );
}

/**
 * Una sección: su nombre y sus preguntas.
 *
 * Cada una es una BANDA y no una tarjeta. Cinco tarjetas iguales apiladas son
 * la forma por defecto de partir una pantalla y no significan nada aquí; los
 * estratos a sangre son la gramática que esta aplicación ya usa para decir
 * «esto es otro asunto», y alternar los tres tonos las distingue sin una sola
 * línea de más.
 *
 * El encabezado va en TÍTULO y en tinta plena. Iba en rótulo atenuado, o sea
 * más pequeño y más apagado que las preguntas que ordena: lo que estructura
 * pesaba menos que lo estructurado. Con `py-8` en la banda y `mb-1` bajo el
 * título, el aire de encima cuadruplica al de debajo — un encabezado pertenece
 * a lo que abre.
 */
function Seccion({
  seccion,
  orden,
  datos,
}: {
  seccion: SeccionFaq;
  orden: number;
  datos: Comisiones | null;
}) {
  return (
    <Banda tono={(orden % 3) as 0 | 1 | 2} orden={orden} etiqueta={seccion.titulo} className="py-8">
      <h2 className="text-titulo">{seccion.titulo}</h2>
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
            <div className="respuesta pb-5">
              {p.respuesta.map((parrafo, i) => (
                <p key={i} className={`text-apoyo text-texto-apoyo ${i > 0 ? "mt-2.5" : ""}`}>
                  {parrafo}
                </p>
              ))}
              {/*
                La pieza que pide la respuesta, cuando hay datos para dibujarla.

                Una explicación del bono sin el avance del agente delante se lee
                una vez y no se vuelve. Con el medidor debajo, la misma pregunta
                contesta «qué es» y «cuánto llevo», y la segunda mitad cambia
                todos los días — que es lo que hace que la ayuda se abra otra vez.
              */}
              {p.pieza === "objetivosBono" && datos && datos.bonos.length > 0 && (
                <div className="mt-4">
                  <MedidorObjetivos
                    registros={datos.registrosDelMes}
                    escalones={datos.bonos}
                    compacto
                  />
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </Banda>
  );
}
