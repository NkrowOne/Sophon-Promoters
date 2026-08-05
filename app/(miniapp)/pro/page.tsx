"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Icono } from "@/components/Icono";
import { Mecha, unidadComun } from "@/components/Mecha";
import { Aviso, Banda, Cargando, FalloDeCarga, Marca, Pantalla, Vacio } from "@/components/Pantalla";
import { useCadenas, useTelegram } from "@/components/TelegramProvider";
import { ErrorApi, aErrorApi, api, nuevaIdempotencia } from "@/lib/api/cliente";
import type { Cadenas } from "@/lib/i18n";

/**
 * Renovaciones.
 *
 * La pregunta de esta pantalla ha cambiado dos veces. Fue «elige a quién y elige
 * durante cuánto», pasó a «¿a quién se le está apagando?» y ahora es la única
 * que se puede contestar con un botón: **¿a quién PUEDO renovar hoy?**
 *
 * El motivo es la regla de `lib/pro/vigencia.ts`: **un PRO vigente no se
 * renueva**. No es solo negocio —no sabemos si Sophon suma el plazo o lo
 * sustituye, y no podemos comprobarlo—, y su consecuencia sobre esta pantalla es
 * total: «se apaga en 12 días» deja de ser accionable, así que ordenar por
 * urgencia deja de significar nada. Para casi todos, la respuesta es «a nadie,
 * todavía».
 *
 * De ahí la partición en dos grupos, que es lo que la pantalla hace ahora:
 *
 *  1. **Renovables ahora** — sin PRO o ya apagado. Son los únicos con botón, y
 *     los únicos con amarillo. Encaja con la disciplina de color en vez de
 *     pelearse con ella: el campo aparece exactamente donde hay una acción
 *     posible, y en ninguna fila más.
 *  2. **Activos** — no hay nada que hacer. La Mecha sigue enseñando lo que
 *     queda, pero como información y no como alarma.
 *
 * Y por eso desapareció «renuévalo antes de que se apague»: con la regla nueva
 * es un consejo imposible de seguir. Lo que se puede decir de un PRO vivo es
 * cuándo se libera.
 */

interface WebmasterPro {
  email: string;
  id: string;
  bloqueado: boolean;
  proVigenteHasta: string | null;
  diasRestantes: number | null;
  diasConcedidos: number | null;
  sinPro: boolean;
  /** Se le puede conceder hoy. Lo decide el servidor, con la misma regla que el guardián. */
  renovable: boolean;
  /** Cuándo se libera. `null` si nunca tuvo PRO —ya está libre—. */
  renovableEl: string | null;
}

interface EstadoPro {
  diasAviso: number;
  webmasters: WebmasterPro[];
  renovables: number;
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
      .catch((e) => setError(aErrorApi(e)));
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
        setError(aErrorApi(e));
      } finally {
        setEnCurso(null);
      }
    },
    [enCurso, haptica, cargar, t],
  );

  if (error && !datos) {
    return (
      <Pantalla titulo={t.colaRenovaciones}>
        <FalloDeCarga error={error} onReintentar={cargar} />
      </Pantalla>
    );
  }
  if (!datos) {
    return (
      <Pantalla titulo={t.colaRenovaciones}>
        <Cargando />
      </Pantalla>
    );
  }
  if (datos.webmasters.length === 0) {
    return (
      <Pantalla titulo={t.colaRenovaciones}>
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

  // El servidor ya los devuelve ordenados con los renovables delante; aquí solo
  // se parten, porque los dos grupos responden a preguntas distintas y no se
  // pueden leer en una sola lista.
  const renovables = datos.webmasters.filter((w) => w.renovable);
  const activos = datos.webmasters.filter((w) => !w.renovable);

  return (
    <Pantalla
      titulo={t.colaRenovaciones}
      /* La respuesta de esta pantalla es a cuántos se les puede dar PRO hoy, así
         que es lo que va sobre la placa. Cuando no hay ninguno la placa NO
         aparece: no hay nada que hacer aquí, y abrir con un titular sobre cero
         acciones es ocupar la primera pantalla para no decir nada. */
      placa={
        datos.renovables > 0
          ? {
              rotulo: t.colaRenovaciones,
              valor: <p className="text-titulo font-semibold">{t.puedesRenovar(datos.renovables)}</p>,
            }
          : undefined
      }
    >
      {/* La banda de cabecera solo existe si tiene ALGO que decir.
          Se pintaba siempre, así que en el caso normal —hay renovables, no se ha
          renovado nada aún, no hay error— quedaba una banda vacía de 24 px justo
          debajo de la placa: una franja muerta en el sitio de más valor de la
          pantalla, y con la placa flotando sobre ella en vez de morder la
          primera lista. */}
      {(datos.renovables === 0 || hecho || error) && (
      <Banda orden={0} tono={0} como="header" className="pb-6 pt-5">
        {datos.renovables === 0 && (
          <p className="text-apoyo text-texto-apoyo">{t.ningunoRenovable}</p>
        )}

        {hecho && (
          <p className="mt-4 border-s-2 border-tinta ps-3 text-apoyo">
            {t.renovado(hecho.email, hecho.vigenteHasta ? formatoDia(hecho.vigenteHasta) : "—")}
          </p>
        )}

        {/* El error de una renovación se reintenta renovando otra vez, así que
            el aviso lleva la acción: sin ella el agente solo podía volver a
            buscar la fila y adivinar si el toque anterior llegó a contar.

            Salvo si el rechazo es «ese PRO sigue activo»: ahí reintentar va a
            fallar igual, y lo que hace falta es la lista al día. Por eso el 409
            no ofrece acción —ya se ha recargado sola—. */}
        {error && (
          <div className="mt-4">
            <Aviso
              error={error}
              onReintentar={ultimo && error.estado !== 409 ? () => renovar(ultimo) : undefined}
            />
          </div>
        )}
      </Banda>
      )}

      {renovables.length > 0 && (
        <Banda orden={1} tono={1} etiqueta={t.puedesRenovarAhora} className="py-2">
          <p className="pb-1 pt-4 text-rotulo text-texto-apoyo">{t.puedesRenovarAhora}</p>
          <ul className="divide-y divide-junta" role="list">
            {renovables.map((w) => (
              <li key={w.id} className="py-5">
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
      )}

      {activos.length > 0 && (
        /* Los activos van en la banda MÁS profunda y sin botón. No es un
           descarte: siguen siendo la red del agente y su plazo es lo que le dice
           cuándo tendrá que volver. Pero no piden nada hoy, y el estrato lo
           dice sin escribirlo. */
        <Banda orden={2} tono={2} etiqueta={t.proActivo} className="py-2">
          <p className="pb-1 pt-4 text-rotulo text-texto-apoyo">{t.proActivo}</p>
          <ul className="divide-y divide-junta" role="list">
            {activos.map((w) => (
              <li key={w.id} className="py-5">
                <Fila w={w} t={t} porSemanas={porSemanas} cargando={false} deshabilitado onRenovar={noop} />
              </li>
            ))}
          </ul>
        </Banda>
      )}
    </Pantalla>
  );
}

function noop() {}

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
  return (
    <>
      <p className="break-all text-cuerpo">{w.email}</p>

      <div className="mt-2.5">
        {w.sinPro || w.proVigenteHasta === null ? (
          // Sin PRO no hay mecha que dibujar: hay un hueco. Decirlo con palabras
          // es más honesto que pintar un raíl vacío, que se leería como un plazo
          // agotado en vez de como un plazo que nunca existió.
          //
          // Y va en PÍLDORA, no en chapa: era la etiqueta amarilla que el usuario
          // rodeó con un círculo rojo justo encima del botón amarillo. Una
          // cápsula perfilada de 26 px no se confunde con un bloque de 50.
          <Marca icono="caducado">{t.nuncaTuvoPro}</Marca>
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

      {/*
        El botón existe SOLO si se puede pulsar.

        Antes se pintaba en las seis filas y se distinguía por color: chapa
        amarilla para los urgentes y filete para el resto. Eso ofrecía una acción
        que el servidor iba a rechazar en casi todas, y encima gastaba el
        amarillo en filas que no lo merecían. Un botón deshabilitado tampoco
        vale: sigue diciendo «esto es lo que hay que hacer aquí», y no lo es.

        Lo que se pone en su lugar no es un hueco: es el dato accionable que
        queda —cuándo se libera—, que es la única respuesta útil a «¿y este
        cuándo?».

        `min-h-11` porque estos botones medían 314×43: un píxel por debajo del
        mínimo táctil, y son la acción de la pantalla.
      */}
      {w.renovable ? (
        <button
          type="button"
          onClick={onRenovar}
          disabled={deshabilitado || w.bloqueado}
          className="chapa pulsable mt-4 w-full text-cuerpo"
        >
          {cargando ? (
            "…"
          ) : (
            <>
              <Icono nombre={w.sinPro ? "pro" : "renovar"} tam={19} />
              {w.sinPro ? t.darUnAnio : t.renovarUnAnio}
            </>
          )}
        </button>
      ) : null}

      {w.bloqueado && (
        <p className="mt-2.5">
          <Marca icono="bloqueado" tono="problema">
            {t.bloqueadoEnSophon}
          </Marca>
        </p>
      )}
    </>
  );
}

function formatoDia(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a?.slice(2)}`;
}
