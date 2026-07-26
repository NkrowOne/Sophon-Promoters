"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Malla, DIAS_APAGADO, type WebmasterMalla } from "@/components/Malla";
import { Banda, Cargando, FalloDeCarga, Marca, Pantalla, Vacio } from "@/components/Pantalla";
import { useCadenas, useTelegram } from "@/components/TelegramProvider";
import { api, ErrorApi } from "@/lib/api/cliente";

interface Respuesta {
  webmasters: WebmasterMalla[];
  dias: number;
}

/**
 * Tu red.
 *
 * La pantalla existe para responder una sola pregunta —¿cuál se me ha
 * apagado?— y por eso lo primero que se ve es la cuenta de los parados, no el
 * total de webmasters. El total no exige ninguna decisión; los parados sí.
 */
export default function Red() {
  const router = useRouter();
  const { haptica } = useTelegram();
  const t = useCadenas();
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);

  const cargar = useCallback(() => {
    setError(null);
    api
      .get<Respuesta>("/api/agente/red")
      .then(setDatos)
      .catch((e) => setError(e instanceof ErrorApi ? e : new ErrorApi(t.algoHaFallado, 0, null)));
  }, []);

  useEffect(cargar, [cargar]);

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
  const conProblema = datos.webmasters.filter((w) => w.estado !== "ACTIVO").length;

  return (
    <Pantalla titulo={t.red}>
      {/* Dos estratos, dos preguntas: «¿hay algo que atender?» y «¿quién».
          El veredicto va en el fondo desnudo y el mosaico sobre superficie, que
          es lo que le da a las teselas un suelo contra el que medirse en vez de
          flotar sobre la página. */}
      <Banda orden={0} tono={0} como="header" className="pb-5">
        {/* Lo primero es lo que exige actuar. Si no hay nada parado, se dice:
            confirmar que está todo bien también es información. */}
        {/* Al quitar la cápsula, las dos frases se leían de corrido —«1 con
            incidencia 2 sin actividad…»—. El punto medio las separa, que es el
            mismo separador que usa el resto de la aplicación, y el recuento de
            incidencias sí lleva color: es lo único de esta línea sobre lo que
            hay que hacer algo. */}
        <p className="text-apoyo text-texto-apoyo">
          {conProblema > 0 && (
            <>
              <Marca icono="aviso" tono="problema">
                {t.conIncidencia(conProblema)}
              </Marca>
              {" · "}
            </>
          )}
          <span className="tabular-nums">
            {parados > 0
              ? t.sinActividadDe(parados, DIAS_APAGADO, datos.webmasters.length)
              : t.todosProduciendo(datos.webmasters.length)}
          </span>
        </p>
      </Banda>

      <Banda orden={1} tono={1} etiqueta={t.red} className="py-6">
        <Malla webmasters={datos.webmasters} dias={datos.dias} onAbrir={abrir} />
        <p className="mt-5 text-apoyo text-texto-apoyo">{t.escalaComun(datos.dias)}</p>
      </Banda>
    </Pantalla>
  );
}
