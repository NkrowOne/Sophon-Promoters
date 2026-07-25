"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Malla, DIAS_APAGADO, type WebmasterMalla } from "@/components/Malla";
import { Aviso, Cargando, Pantalla, Vacio } from "@/components/Pantalla";
import { useTelegram } from "@/components/TelegramProvider";
import { api, ErrorApi } from "@/lib/api/cliente";
import { es } from "@/lib/i18n";

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
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);

  const cargar = useCallback(() => {
    setError(null);
    api
      .get<Respuesta>("/api/agente/red")
      .then(setDatos)
      .catch((e) => setError(e instanceof ErrorApi ? e : new ErrorApi("Algo ha fallado.", 0, null)));
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
      <Pantalla titulo={es.red} volverA="/">
        <Aviso error={error.message} apoyo={error.apoyo} onReintentar={cargar} />
      </Pantalla>
    );
  }
  if (!datos) {
    return (
      <Pantalla titulo={es.red} volverA="/">
        <Cargando que="Sondeando" />
      </Pantalla>
    );
  }
  if (datos.webmasters.length === 0) {
    return (
      <Pantalla titulo={es.red} volverA="/">
        <Vacio
          titulo={es.sinWebmasters}
          apoyo={es.sinWebmastersApoyo}
          accion={{ texto: "Activar el primero", href: "/activar" }}
        />
      </Pantalla>
    );
  }

  const parados = datos.webmasters.filter(
    (w) => w.diasSinActividad === null || w.diasSinActividad >= DIAS_APAGADO,
  ).length;
  const conProblema = datos.webmasters.filter((w) => w.estado !== "ACTIVO").length;

  return (
    <Pantalla titulo={es.red} volverA="/">
      {/* Lo primero es lo que exige actuar. Si no hay nada parado, se dice:
          confirmar que está todo bien también es información. */}
      <p className="mb-5 text-apoyo text-texto-apoyo">
        {conProblema > 0 && (
          <span className="text-vivo">
            {conProblema} con incidencia ·{" "}
          </span>
        )}
        {parados > 0 ? (
          <>
            <span className="cifra">{parados}</span> sin actividad en los últimos{" "}
            {DIAS_APAGADO} días, de <span className="cifra">{datos.webmasters.length}</span>
          </>
        ) : (
          <>
            Los <span className="cifra">{datos.webmasters.length}</span> están produciendo
          </>
        )}
      </p>

      <Malla webmasters={datos.webmasters} dias={datos.dias} onAbrir={abrir} />

      <p className="mt-5 text-apoyo text-texto-apoyo">
        Cada columna son {datos.dias} días. La altura es el volumen de registros y la
        escala es común, así que las teselas se comparan entre sí.
      </p>
    </Pantalla>
  );
}
