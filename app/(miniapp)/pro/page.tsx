"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Mecha, unidadComun } from "@/components/Mecha";
import { Aviso, Banda, Cargando, FalloDeCarga, Pantalla, Vacio } from "@/components/Pantalla";
import { useCadenas, useTelegram } from "@/components/TelegramProvider";
import { api, ErrorApi, nuevaIdempotencia } from "@/lib/api/cliente";
import type { Cadenas } from "@/lib/i18n";

/**
 * Renovaciones.
 *
 * Esta pantalla era «elige a quién y elige durante cuánto». Ya no: el PRO va
 * atado al alta del webmaster y **siempre dura un año**, así que no queda nada
 * que elegir. Lo que queda es la única pregunta que sobrevive al cambio:
 * **¿a quién se le está apagando?**
 *
 * Tres decisiones que salen de esa pregunta:
 *
 *  - **El orden es la respuesta.** Primero los que nunca tuvieron PRO —un
 *    webmaster sin PRO casi siempre es un alta que se quedó a medias—, después
 *    por días restantes. El agente no tiene que buscar: lo urgente está arriba.
 *  - **Cada fila lleva su propia Mecha**, la misma pieza que su ficha. La
 *    longitud de lo encendido es el tiempo que le queda, así que la lista se
 *    lee de un vistazo sin comparar fechas.
 *  - **El coste sigue escrito en el botón**, pero ahora el coste es un plazo y
 *    no un cupo: `RENOVAR · 1 AÑO`. Renovar no gasta nada del agente, y por eso
 *    desapareció el contador que presidía esta pantalla.
 */

/** Mismo umbral que La Mecha: por debajo, renovar deja de ser previsión. */
const DIAS_URGENTE = 30;

interface WebmasterPro {
  email: string;
  id: string;
  bloqueado: boolean;
  proVigenteHasta: string | null;
  diasRestantes: number | null;
  diasConcedidos: number | null;
  sinPro: boolean;
}

interface EstadoPro {
  diasAviso: number;
  webmasters: WebmasterPro[];
  urgentes: number;
}

export default function Renovaciones() {
  const { haptica } = useTelegram();
  const t = useCadenas();

  const [datos, setDatos] = useState<EstadoPro | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [hecho, setHecho] = useState<{ email: string; vigenteHasta: string | null } | null>(null);
  // A quién se intentó renovar por última vez: es lo que el aviso de error
  // necesita para poder ofrecer «reintentar» en vez de solo dar la mala noticia.
  const [ultimo, setUltimo] = useState<WebmasterPro | null>(null);

  // Una clave por webmaster, generada UNA vez por intención: si el agente pulsa
  // dos veces sobre la misma fila, el servidor reconoce el duplicado en vez de
  // conceder dos años seguidos.
  const claves = useRef(new Map<string, string>());

  const cargar = useCallback(() => {
    setError(null);
    api
      .get<EstadoPro>("/api/pro")
      .then(setDatos)
      .catch((e) => setError(e instanceof ErrorApi ? e : new ErrorApi(t.algoHaFallado, 0, null)));
  }, [t]);

  useEffect(cargar, [cargar]);

  const renovar = useCallback(
    async (w: WebmasterPro) => {
      if (enCurso) return;
      setEnCurso(w.id);
      setUltimo(w);
      setError(null);
      let clave = claves.current.get(w.id);
      if (!clave) {
        clave = nuevaIdempotencia();
        claves.current.set(w.id, clave);
      }
      try {
        const r = await api.post<{ email: string; vigenteHasta: string | null }>(
          "/api/pro/conceder",
          { email: w.email, idempotencia: clave },
        );
        haptica("exito");
        setHecho({ email: r.email ?? w.email, vigenteHasta: r.vigenteHasta ?? null });
        // Clave nueva la próxima vez: la renovación del año que viene es otra
        // intención, no un reintento de esta.
        claves.current.delete(w.id);
        cargar();
      } catch (e) {
        haptica("error");
        setError(e instanceof ErrorApi ? e : new ErrorApi(t.algoHaFallado, 0, null));
      } finally {
        setEnCurso(null);
      }
    },
    [enCurso, haptica, cargar, t],
  );

  if (error && !datos) {
    return (
      <Pantalla titulo={t.colaRenovaciones} volverA="/">
        <FalloDeCarga error={error} onReintentar={cargar} />
      </Pantalla>
    );
  }
  if (!datos) {
    return (
      <Pantalla titulo={t.colaRenovaciones} volverA="/">
        <Cargando />
      </Pantalla>
    );
  }
  if (datos.webmasters.length === 0) {
    return (
      <Pantalla titulo={t.colaRenovaciones} volverA="/">
        <Vacio
          titulo={t.sinWebmasters}
          apoyo={t.sinWebmastersApoyo}
          accion={{ texto: t.activarElPrimero, href: "/activar" }}
        />
      </Pantalla>
    );
  }

  // Una sola unidad para toda la lista: ver la explicación en `Mecha`.
  const porSemanas = unidadComun(datos.webmasters.map((w) => w.diasRestantes));

  return (
    <Pantalla titulo={t.colaRenovaciones} volverA="/">
      <Banda tono={0} como="header" className="pb-6">
        {/* Lo primero es cuántos piden actuar. Que no haya ninguno también es
            información: confirma que hoy no hay nada que hacer aquí. */}
        <p className={`text-apoyo ${datos.urgentes > 0 ? "text-vivo" : "text-texto-apoyo"}`}>
          {datos.urgentes > 0 ? t.seApagan(datos.urgentes) : t.ningunoSeApaga(datos.diasAviso)}
        </p>

        {hecho && (
          <p className="mt-4 border-s-2 border-tinta ps-3 text-apoyo">
            {t.renovado(hecho.email, hecho.vigenteHasta ? formatoDia(hecho.vigenteHasta) : "—")}
          </p>
        )}

        {/* El error de una renovación se reintenta renovando otra vez, así que
            el aviso lleva la acción: sin ella el agente solo podía volver a
            buscar la fila y adivinar si el toque anterior llegó a contar. */}
        {error && (
          <div className="mt-4">
            <Aviso
              error={error.message}
              apoyo={error.apoyo}
              onReintentar={ultimo ? () => renovar(ultimo) : undefined}
            />
          </div>
        )}
      </Banda>

      <Banda tono={1} etiqueta={t.colaRenovaciones} className="py-2">
        <ul className="divide-y divide-borde" role="list">
          {datos.webmasters.map((w) => (
            <li key={w.id} className="py-4">
              <Fila
                w={w}
                t={t}
                porSemanas={porSemanas}
                cargando={enCurso === w.id}
                deshabilitado={Boolean(enCurso)}
                onRenovar={() => renovar(w)}
              />
            </li>
          ))}
        </ul>
      </Banda>

      {datos.urgentes === 0 && (
        <Banda tono={0} className="pt-5">
          <p className="text-apoyo text-texto-apoyo">{t.todoAlDia}</p>
        </Banda>
      )}
    </Pantalla>
  );
}

function Fila({
  w,
  t,
  porSemanas,
  cargando,
  deshabilitado,
  onRenovar,
}: {
  w: WebmasterPro;
  t: Cadenas;
  porSemanas: boolean;
  cargando: boolean;
  deshabilitado: boolean;
  onRenovar: () => void;
}) {
  const urgente = w.sinPro || (w.diasRestantes !== null && w.diasRestantes <= DIAS_URGENTE);

  return (
    <>
      <p className="break-all text-cuerpo">{w.email}</p>

      <div className="mt-2">
        {w.sinPro || w.proVigenteHasta === null ? (
          // Sin PRO no hay mecha que dibujar: hay un hueco. Decirlo con palabras
          // es más honesto que pintar un raíl vacío, que se leería como un plazo
          // agotado en vez de como un plazo que nunca existió.
          <p className={`text-apoyo ${w.bloqueado ? "text-texto-apoyo" : "text-vivo"}`}>
            {t.nuncaTuvoPro}
          </p>
        ) : (
          <Mecha
            diasRestantes={w.diasRestantes ?? 0}
            diasConcedidos={w.diasConcedidos}
            vigenteHasta={w.proVigenteHasta}
            etiquetas={t}
            porSemanas={porSemanas}
          />
        )}
      </div>

      <button
        type="button"
        onClick={onRenovar}
        disabled={deshabilitado || w.bloqueado}
        className={[
          "mt-3 w-full rounded-pieza py-3 text-apoyo font-semibold",
          "transition-transform duration-150 ease-sonda active:scale-[0.99]",
          "disabled:opacity-40",
          // El énfasis solo va a lo que exige acción hoy; lo demás es un filete.
          urgente ? "bg-tinta text-fondo" : "border border-borde",
        ].join(" ")}
      >
        {cargando ? "…" : w.sinPro ? t.darUnAnio : t.renovarUnAnio}
      </button>

      {w.bloqueado && <p className="mt-1.5 text-apoyo text-texto-apoyo">{t.bloqueadoEnSophon}</p>}
    </>
  );
}

function formatoDia(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a?.slice(2)}`;
}
