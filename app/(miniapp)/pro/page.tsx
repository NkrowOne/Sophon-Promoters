"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Icono } from "@/components/Icono";
import { Mecha, unidadComun } from "@/components/Mecha";
import { Aviso, Banda, Cargando, FalloDeCarga, Pantalla, Vacio } from "@/components/Pantalla";
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
 *
 * ── La forma ──
 *
 * Cada webmaster es una TARJETA, separadas 12 px, y no una fila de una lista con
 * filete. Un webmaster es una UNIDAD —un correo, un plazo y, si toca, su
 * acción—, y con `divide-y` los dos grupos se leían como una misma tabla
 * continua en la que la única diferencia entre «puedo» y «no puedo» era que unas
 * filas traían botón. Ahora la diferencia empieza en el objeto: sombra arriba
 * —lo que se levanta porque hay algo que hacer— y filete abajo, que además es lo
 * que evita que veinte sombras seguidas se conviertan en ruido.
 *
 * El amarillo aparece una vez por ACCIÓN y ni una más. Que haya varias chapas no
 * rompe la regla de un amarillo por pantalla: es la MISMA acción repetida por
 * destinatario, que es literalmente de lo que va una cola. Lo que la regla
 * prohíbe —y esta pantalla es donde se rompió— es teñir de campo algo que no se
 * pulsa: los estados van en PÍLDORA, cápsula al ancho de su texto, y nunca en
 * ámbar, porque una etiqueta ámbar a 16 px de un botón amarillo es exactamente
 * el defecto que el usuario rodeó con un círculo rojo.
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
    /*
     * SIN `t` en las dependencias, y ya no hace falta.
     *
     * Estaba porque el respaldo del error se construía aquí con el catálogo, y
     * era la única pantalla que lo declaraba bien. Pero declararlo bien tenía su
     * propio precio: `useEffect(cargar, [cargar])` vuelve a disparar cuando
     * `cargar` cambia de identidad, y `t` cambia una vez —al resolverse el
     * idioma en el efecto de `TelegramProvider`—, así que TODO agente que no
     * lea en español pedía `/api/pro` dos veces en cada arranque en frío.
     *
     * Con el texto genérico resuelto al pintar, `cargar` ya no toca el catálogo
     * y la dependencia se cae sola. Es el mismo arreglo mirado desde el otro
     * lado: cuando el texto se traduce donde toca, la petición deja de
     * duplicarse.
     */
  }, []);

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
    // Sin `t`: no se toca el catálogo aquí dentro —el aviso lo traduce al
    // pintar—, y una dependencia que no se usa vuelve a cambiar la identidad del
    // callback al resolverse el idioma, que es el mismo defecto que se explica
    // arriba en `cargar`.
    [enCurso, haptica, cargar],
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

  /*
   * ¿Hay cabecera?
   *
   * Se pintaba siempre, así que en el caso normal —hay renovables, no se ha
   * renovado nada aún, no hay error— quedaba una banda vacía de 24 px justo
   * debajo de la placa: una franja muerta en el sitio de más valor de la
   * pantalla.
   *
   * Se calcula UNA vez porque decide dos cosas: si la banda existe y, con ella,
   * cuál es la primera y por tanto a quién le toca ir sin relleno superior. Con
   * la condición escrita dos veces se desincronizan a la primera, y el síntoma
   * es una costura de fondo entre la placa y el estrato que debería morderla.
   *
   * El invariante que lo sostiene: si no hay cabecera es porque hay renovables
   * —`datos.renovables === 0` la enciende—, o sea que hay placa y la banda de
   * renovables es la primera.
   */
  const cabecera = datos.renovables === 0 || Boolean(hecho) || Boolean(error);

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
              /*
               * La única placa de la aplicación cuyo valor es una FRASE y no una
               * cifra suelta, y se queda así a propósito.
               *
               * Convertirla en cifra sería poner «3» bajo el rótulo, y el rótulo
               * de la placa es el `h1` —el nombre de la pantalla, «Renovaciones»,
               * no hay otro título debajo—, así que no puede hacer de unidad como
               * «Disponible» hace con los dólares del saldo. Un «3» bajo
               * «Renovaciones» se lee como tres renovaciones, que es justo la
               * pregunta que esta pantalla NO contesta: contesta a cuántos puedo
               * renovar HOY. Y sacar el dígito de `puedesRenovar` para agrandarlo
               * solo obliga a rebanar cinco catálogos traducidos —uno de ellos en
               * árabe— confiando en que el número siga yendo delante.
               *
               * Lo que sí sube es el PESO: la frase toma la cara de las cifras
               * protagonistas (`display`, Archivo Black), que además cae sobre el
               * número porque las cinco traducciones lo ponen primero. El tamaño
               * no sube a los 40 px de una cifra porque una frase a 40 px son tres
               * líneas en un móvil de 390, y esta cabecera es pegajosa: su alto lo
               * paga la pantalla entera mientras dure el scroll.
               */
              valor: (
                <p className="display text-cifra tabular-nums">
                  {t.puedesRenovar(datos.renovables)}
                </p>
              ),
            }
          : undefined
      }
    >
      {cabecera && (
        /* Sin relleno superior: cuando hay placa, la cabecera tiene que
           MORDERLA —una franja de fondo entre las dos se lee como una costura
           mal cerrada justo debajo de la pieza que abre la pantalla—, y cuando
           no la hay el aire lo pone `Pantalla`, que en esa rama sí abre con
           `pt`. */
        <Banda orden={0} tono={0} como="header" className="pb-6">
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
              fallar igual, y lo que hace falta es la lista al día. Por eso el
              409 no ofrece acción —ya se ha recargado sola—. */}
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
        /* Cuando no hay cabecera, esta es la primera banda y le toca a ella
           morder la placa; con cabecera delante recupera su aire de estrato. */
        <Banda
          orden={1}
          tono={1}
          etiqueta={t.puedesRenovarAhora}
          className={cabecera ? "py-6" : "pb-6"}
        >
          <p className="pb-3 text-rotulo text-texto-apoyo">{t.puedesRenovarAhora}</p>
          {/* 12 px entre tarjetas: es la separación que las deja leerse como
              objetos sueltos sobre el estrato. Menos y la sombra de una toca a
              la siguiente, que es lo que hace que una pila de tarjetas se lea
              otra vez como una tabla. */}
          <ul className="flex flex-col gap-3" role="list">
            {renovables.map((w) => (
              <li key={w.id}>
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
        <Banda orden={2} tono={2} etiqueta={t.proActivo} className="py-6">
          <p className="pb-3 text-rotulo text-texto-apoyo">{t.proActivo}</p>
          <ul className="flex flex-col gap-3" role="list">
            {activos.map((w) => (
              <li key={w.id}>
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
    /*
     * Sombra o filete según el grupo, y lo decide el mismo `renovable` que ha
     * partido las listas: así no hay una segunda fuente de verdad que se pueda
     * quedar atrás. El relieve dice lo que dice el estrato —arriba hay algo que
     * hacer— sin gastar ni una palabra, y en la lista larga de los activos el
     * filete evita que veinte sombras seguidas se conviertan en textura.
     */
    <div className={w.renovable ? "tarjeta" : "tarjeta-borde"}>
      <p className="break-all text-cuerpo">{w.email}</p>

      <div className="mt-2.5">
        {w.sinPro || w.proVigenteHasta === null ? (
          // Sin PRO no hay mecha que dibujar: hay un hueco. Decirlo con palabras
          // es más honesto que pintar un raíl vacío, que se leería como un plazo
          // agotado en vez de como un plazo que nunca existió.
          //
          // En PÍLDORA y NEUTRA. Esta etiqueta es el origen de todo el sistema de
          // formas: era una chapa amarilla, del mismo ancho y el mismo radio que
          // el botón amarillo que tiene 16 px más abajo, y es la que el usuario
          // rodeó con un círculo rojo. La cápsula al ancho de su texto ya no se
          // puede confundir con un bloque de 50 px a sangre; y se queda en el
          // gris de estado en vez del ámbar que le pondría `pildora-aviso`,
          // porque a esta distancia de una chapa cualquier cosa entre amarilla y
          // ámbar vuelve a plantear la misma duda que costó la versión anterior.
          <span className="pildora">
            <Icono nombre="caducado" tam={13} />
            {t.nuncaTuvoPro}
          </span>
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

        Lo que se pone en su lugar no es un hueco: es la única respuesta útil a
        «¿y este cuándo?», y hasta ahora ese renglón estaba escrito en el
        catálogo y no lo pintaba nadie —la tarjeta del activo terminaba en la
        mecha, o sea que la ausencia de botón no la explicaba nada—.

        El alto táctil ya no se pide aquí: `.chapa` trae sus 50 px, y estos
        botones medían 314×43 —un píxel por debajo del mínimo— cuando el tamaño
        lo ponía la propia pantalla.
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
      ) : (
        <p className="mt-3 text-apoyo text-texto-apoyo">{t.podrasRenovarloCuandoSeApague}</p>
      )}

      {/* El único color de la tarjeta, y solo aquí: una cuenta bloqueada en
          Sophon va mal y el agente no lo puede arreglar desde esta pantalla,
          que es exactamente lo que el sistema reserva para el tinte de peligro.
          Además cierra el sentido del botón gris que tiene encima —una chapa
          deshabilitada sin motivo escrito parece un fallo de la aplicación—. */}
      {w.bloqueado && (
        <p className="mt-3">
          <span className="pildora pildora-peligro">
            <Icono nombre="bloqueado" tam={13} />
            {t.bloqueadoEnSophon}
          </span>
        </p>
      )}
    </div>
  );
}

function formatoDia(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a?.slice(2)}`;
}
