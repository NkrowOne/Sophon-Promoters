"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { Icono } from "@/components/Icono";
import { Malla, DIAS_APAGADO, type WebmasterMalla } from "@/components/Malla";
import { Banda, Cargando, FalloDeCarga, Pantalla, Vacio } from "@/components/Pantalla";
import { useCadenas, useTelegram } from "@/components/TelegramProvider";
import { useRecurso } from "@/lib/api/recurso";

interface Respuesta {
  webmasters: WebmasterMalla[];
  dias: number;
}

/**
 * Mi equipo.
 *
 * La pantalla existe para responder una sola pregunta —¿cuál se me ha
 * apagado?— y por eso lo primero que se ve es la cuenta de los parados, no el
 * total de webmasters. El total no exige ninguna decisión; los parados sí.
 *
 * Sin placa, y no por falta: la respuesta de esta pantalla no es una cifra que
 * quepa en una cabecera, es un mosaico. Lo que hace de veredicto es la tarjeta
 * de arriba, que dice si hay algo que atender antes de que el ojo baje a
 * buscarlo.
 */
export default function Red() {
  const router = useRouter();
  const { haptica } = useTelegram();
  const t = useCadenas();
  // Igual que la portada: lo último que se supo se pinta en el primer
  // fotograma al volver, en vez de reconstruir la pantalla desde cero. Ver
  // `lib/api/recurso.ts`.
  const { datos, error, recargar: cargar } = useRecurso<Respuesta>("/api/agente/red");

  const abrir = useCallback(
    (id: string) => {
      haptica("seleccion");
      router.push(`/red/${encodeURIComponent(id)}`);
    },
    [router, haptica],
  );

  if (error) {
    return (
      <Pantalla titulo={t.red}>
        <FalloDeCarga error={error} onReintentar={cargar} />
      </Pantalla>
    );
  }
  if (!datos) {
    return (
      <Pantalla titulo={t.red}>
        <Cargando que={t.sondeando} />
      </Pantalla>
    );
  }
  if (datos.webmasters.length === 0) {
    return (
      <Pantalla titulo={t.red}>
        <Vacio
          titulo={t.sinWebmasters}
          apoyo={t.sinWebmastersApoyo}
          accion={{ texto: t.activarElPrimero, href: "/activar" }}
        />
      </Pantalla>
    );
  }

  const parados = datos.webmasters.filter(
    (w) => w.diasSinActividad === null || w.diasSinActividad >= DIAS_APAGADO,
  ).length;
  /*
   * «Confirmando» NO cuenta como incidencia, y esto era un defecto.
   *
   * El filtro era `estado !== "ACTIVO"` a secas, así que un alta de hace diez
   * minutos —vinculada en Sophon pero aún sin publicar en el programa de
   * socios— sumaba al recuento de problemas: el veredicto abría con «1 con
   * problema» en rojo mientras su tesela, que sí lo separa, decía «Confirmando»
   * en neutro. Dos lecturas del mismo estado en la misma pantalla.
   *
   * La regla es la de la Malla: solo es incidencia lo que el agente no puede
   * arreglar esperando.
   */
  const conProblema = datos.webmasters.filter(
    (w) => w.estado !== "ACTIVO" && w.estado !== "PENDIENTE_CONFIRMACION",
  ).length;
  const todoEnOrden = conProblema === 0 && parados === 0;

  return (
    <Pantalla titulo={t.red}>
      {/* Dos estratos, dos preguntas: «¿hay algo que atender?» y «¿quién».
          El veredicto va sobre el papel desnudo y el mosaico sobre superficie:
          es lo que le da a las teselas un suelo contra el que medirse en vez de
          flotar sobre la página, y lo que hace que su sombra se vea. */}
      <Banda orden={0} tono={0} como="header" className="pb-6">
        {/*
          El veredicto, en tarjeta de BORDE y no de sombra.

          Era un párrafo suelto sobre el fondo de página, y ahí el resumen de la
          pantalla pesaba menos que cualquiera de las seis teselas de abajo. Le
          toca superficie, pero la de filete: la sombra es lo que levanta a las
          teselas, y si además la lleva la línea de arriba deja de significar
          «esto se pulsa» —el veredicto no se pulsa—.

          Compacta a propósito. Con los 18 px de la tarjeta, una sola línea de
          píldoras se queda flotando en una caja que le sobra por todas partes.
        */}
        <div className="tarjeta-borde flex flex-wrap items-center gap-x-2.5 gap-y-2 !px-4 !py-3.5">
          {/* Lo primero es lo que exige actuar, y es lo único con color: una
              cuenta bloqueada o borrada no se arregla desde aquí, así que el
              agente tiene que verla antes de leer nada. */}
          {conProblema > 0 && (
            <span className="pildora pildora-peligro">
              <Icono nombre="aviso" tam={13} />
              {t.conIncidencia(conProblema)}
            </span>
          )}

          {/* Que no haya nada que atender TAMBIÉN es información, y por eso se
              dice en píldora en vez de callarse: una tarjeta con una frase gris
              suelta se lee como un pie de página, no como un veredicto.

              El recuento de parados se queda en texto y no en cápsula porque la
              píldora va al ancho de su texto y sin partir línea —«2 sin
              actividad en los últimos 4 días, de 6» sería una cápsula más ancha
              que el móvil—. */}
          {todoEnOrden ? (
            <span className="pildora pildora-exito">
              <Icono nombre="activo" tam={13} />
              {t.todosProduciendo(datos.webmasters.length)}
            </span>
          ) : (
            <span className="cifra text-apoyo text-texto-apoyo">
              {parados > 0
                ? t.sinActividadDe(parados, DIAS_APAGADO, datos.webmasters.length)
                : t.todosProduciendo(datos.webmasters.length)}
            </span>
          )}
        </div>
      </Banda>

      <Banda orden={1} tono={1} etiqueta={t.red} className="py-6">
        <Malla webmasters={datos.webmasters} dias={datos.dias} onAbrir={abrir} />
        <p className="mt-5 text-apoyo text-texto-apoyo">{t.escalaComun(datos.dias)}</p>
      </Banda>
    </Pantalla>
  );
}
