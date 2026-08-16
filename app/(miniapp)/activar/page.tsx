"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Aviso, Banda, Marca, Pantalla } from "@/components/Pantalla";
import { BotonPrincipalAccion, useCadenas, useTelegram } from "@/components/TelegramProvider";
import { ErrorApi, aErrorApi, api, nuevaIdempotencia } from "@/lib/api/cliente";

/**
 * Activar webmaster.
 *
 * Pantalla de tarea: **un solo campo por paso**. El teclado de Telegram se come
 * media pantalla, así que todo lo que importa vive arriba y la acción la ejecuta
 * el botón principal, que tiene reserva en el DOM por si el nativo queda tapado.
 *
 * Es además donde se concede el PRO, porque alta y PRO son el mismo acto: el
 * webmaster entra con un año. Eso se dice ANTES de pulsar —no en letra pequeña
 * después— porque cambia lo que el agente cree estar haciendo.
 *
 * **Por qué hay un paso de confirmación.** Activar es irreversible: vincula a esa
 * persona a este agente en Sophon para siempre y gasta el año de PRO del alta.
 * Un solo toque desde un campo de texto con autocorrección es demasiado poco
 * para eso, y el correo mal escrito no da error —da de alta a otro—.
 *
 * **Y por qué el paso vive en la URL** (`?paso=`). Estaba en estado de
 * componente, así que el botón «atrás» NATIVO de Telegram —que la app cablea a
 * `router.back()`— salía de la pantalla entera y se llevaba lo escrito. Con el
 * paso en el historial, atrás retrocede un paso y el correo sigue ahí: el
 * componente no se remonta al cambiar un parámetro de búsqueda.
 *
 * Y el resultado se cuenta con precisión: si el alta entra y el PRO no, la
 * pantalla lo dice y ofrece la reparación en la ficha, en vez de dar por bueno
 * un trabajo hecho a medias.
 *
 * ── LO QUE CAMBIA EN ESTA PASADA ──
 *
 * Los tres pasos eran texto plano sobre papel: ni un objeto con relieve en toda
 * la tarea, que es la mitad de «lo veo muy soso». Ahora hay **una sola tarjeta
 * por paso y siempre en el mismo sitio** —debajo del título, primera banda—, y
 * lo que cambia entre pasos es lo que lleva dentro: primero el campo donde se
 * teclea el correo, después el correo ya escrito y grande para revisarlo. El
 * objeto no se mueve; lo que se endurece es su contenido, de campo a
 * afirmación, y ese es justo el gesto que el paso de confirmación describe.
 *
 * El motivo de malla va detrás de las dos, como en `/alta`: la tarea de la
 * pantalla es esa tarjeta, así que es ahí donde el amarillo tiene permiso para
 * aparecer sin ser un botón. La chapa sigue siendo una sola y la pone Telegram
 * abajo.
 *
 * El paso «hecho» repetía a mano el par de botones —el mismo que `error.tsx` y
 * `not-found.tsx` escriben cada uno por su cuenta: `min-h-12`, `rounded-control`,
 * `bg-tinta` y la clase del borde— y ese calco es la razón de que los tres
 * midieran distinto. Ahora son `.chapa-hueca` y `.chapa-tinta`, que ya traen la
 * forma, los 46 px y la sombra del sistema.
 */
interface Resultado {
  email: string;
  devengaDesde: string;
  nuevo: boolean;
  pro: { concedido: boolean; vigenteHasta?: string | null } | null;
}

function formatoDia(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a?.slice(2)}`;
}

export default function Activar() {
  // `useSearchParams` obliga a un límite de suspensión en el prerenderizado.
  return (
    <Suspense fallback={null}>
      <ActivarPasos />
    </Suspense>
  );
}

function ActivarPasos() {
  const router = useRouter();
  const parametros = useSearchParams();
  const { haptica } = useTelegram();
  const t = useCadenas();
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [hecho, setHecho] = useState<Resultado | null>(null);
  // Una clave por intención: reintentar tras un fallo de red no puede acabar
  // concediendo dos años.
  const clave = useRef(nuevaIdempotencia());

  const valido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  // El paso sale de la URL, pero nunca por delante de los datos: llegar a
  // `?paso=hecho` a mano —o recargar ahí— no puede pintar un resultado que no
  // existe, ni `?paso=confirmar` un correo que no se ha escrito.
  const pedido = parametros.get("paso");
  const paso = hecho ? "hecho" : pedido === "confirmar" && valido ? "confirmar" : "email";

  const irA = useCallback(
    (destino: "email" | "confirmar") => {
      haptica("toque");
      router.push(destino === "email" ? "/activar" : "/activar?paso=confirmar");
    },
    [router, haptica],
  );

  const activar = useCallback(async () => {
    if (!valido || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await api.post<Resultado>("/api/webmaster/activar", {
        email: email.trim(),
        idempotencia: clave.current,
      });
      haptica("exito");
      setHecho(r);
      // `replace` y no `push`: volver atrás desde el resultado a la pantalla de
      // confirmar solo serviría para volver a mandar un alta ya hecha.
      router.replace("/activar?paso=hecho");
    } catch (e) {
      haptica("error");
      setError(aErrorApi(e));
    } finally {
      setEnviando(false);
    }
  }, [email, valido, enviando, haptica, router]);

  if (hecho) {
    // El alta entró y el PRO no: es la única rama en la que queda trabajo, y
    // decide tres cosas de esta pantalla —el remate de la banda, el objeto de
    // aviso y a dónde lleva el botón de tinta—, así que se resuelve una vez.
    const proFallado = Boolean(hecho.pro && !hecho.pro.concedido);

    return (
      <Pantalla titulo={t.activarWebmaster}>
        {/* El alta y, debajo, sus consecuencias en la misma banda.

            El PRO tenía estrato propio con su rótulo «PRO», y eso lo convertía
            en un segundo acto: dos bloques del mismo tamaño para un alta y para
            una consecuencia automática del alta. Conceder el año no es una tarea
            que el agente haya hecho, es algo que pasó porque dio de alta a
            alguien, así que se cuenta en una línea junto a «cobrarás desde hoy».

            Los ARCOS DE MARCA, solo cuando todo salió bien. Es el único remate
            decorativo de la tarea y aquí se lo ha ganado —esta banda es el
            desenlace de tres pasos y no tiene chapa ni cifra que la sostengan—,
            pero adornar con la geometría del isotipo un estrato que justo debajo
            confiesa un fallo es celebrar a medias. Sin PRO la banda se queda
            desnuda y el peso visual se lo lleva el problema, que es lo único que
            queda por hacer. */}
        <Banda orden={0} tono={0} className={proFallado ? "pb-6" : "motivo-arcos pb-6"}>
          <p className="text-cuerpo font-medium">{t.yaEstaEnTuRed(hecho.email)}</p>
          <p className="mt-1.5 text-apoyo text-texto-apoyo">
            {t.cobrarasDesdeHoy}
            {hecho.pro?.concedido && hecho.pro.vigenteHasta && (
              <> · {t.proConcedido(formatoDia(hecho.pro.vigenteHasta))}</>
            )}
          </p>

          {/* Lo que NO se funde con la prosa es el fallo. Si el PRO no entró, el
              alta sí y la suscripción no, y eso hay que repararlo.

              Va en `.tarjeta-borde` y no en el filete lateral que tenía: en una
              pantalla donde ya no queda nada pendiente, lo único pendiente tiene
              que ser un OBJETO y no un párrafo más de la misma columna. Filete y
              no sombra porque la tarjeta con relieve es la de la TAREA —la de
              los otros dos pasos— y esto es una nota al pie del resultado. La
              jerarquía de dentro es la de `Aviso`: qué pasa en cuerpo, qué hacer
              en apoyo. */}
          {proFallado && (
            <div className="tarjeta-borde mt-5">
              <p className="text-cuerpo">
                <Marca icono="aviso" tono="problema">{t.proNoConcedido}</Marca>
              </p>
              <p className="mt-1.5 text-apoyo text-texto-apoyo">{t.proNoConcedidoApoyo}</p>
            </div>
          )}
        </Banda>

        <Banda orden={1} tono={0} className="pt-6">
          {/* Las dos salidas, con las chapas del sistema.

              Estaban escritas a mano —`min-h-12`, `rounded-control`, `bg-tinta`,
              el borde— igual que en `error.tsx` y en `not-found.tsx`: el mismo
              par calcado en tres sitios y con tres alturas distintas. Ninguna de
              las dos es amarilla, y aquí no hay ninguna que lo sea: el trabajo
              ya está hecho, así que no hay acción principal, solo dos destinos.

              El acuse de la de tinta se escribe aquí y no con `.pulsable`: esa
              clase tiñe el fondo con especificidad (0,2,0) y le ganaría al campo
              de `.chapa-tinta` (0,1,0), así que la chapa oscura se pondría gris
              claro con su texto blanco encima durante 120 ms. Solo `transform`,
              y solo si no se ha pedido quietud. La hueca sí lo lleva: sobre un
              fondo de tarjeta el velo de superficie es justo el acuse correcto.

              `min-w-0` con `flex-1`: sin él, un rótulo largo —«Ver a minha
              equipa» en portugués— impone su ancho mínimo y las dos chapas dejan
              de medir lo mismo. */}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => {
                setHecho(null);
                setEmail("");
                clave.current = nuevaIdempotencia();
                router.replace("/activar");
              }}
              className="chapa-hueca pulsable min-w-0 flex-1 text-cuerpo"
            >
              {t.activarOtro}
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(
                  proFallado ? `/red/${encodeURIComponent(hecho.email.toLowerCase())}` : "/red",
                )
              }
              className="chapa-tinta min-w-0 flex-1 text-cuerpo transition-transform duration-toque ease-sonda motion-safe:active:scale-[0.97]"
            >
              {proFallado ? t.verSuFicha : t.verMiRed}
            </button>
          </div>
        </Banda>
      </Pantalla>
    );
  }

  if (paso === "confirmar") {
    return (
      <Pantalla titulo={t.activarWebmaster}>
        <Banda orden={0} tono={0} className="pb-6">
          {/* La MISMA tarjeta del paso anterior, en el mismo sitio y con el
              mismo motivo detrás: lo único que ha cambiado es que el correo ya
              no se teclea, se lee. Que el objeto no se mueva entre los dos pasos
              es lo que hace que la confirmación se entienda como una relectura
              de lo escrito y no como otra pantalla más de la que hay que
              enterarse.

              Y el correo va en cuerpo de cifra, no de campo: es lo único que hay
              que revisar aquí, y revisarlo en el tamaño de un formulario es no
              revisarlo. `break-all` porque un correo largo no ofrece puntos de
              corte y a 22 px desbordaría la tarjeta. */}
          <div className="tarjeta campo-malla">
            <p className="text-rotulo text-texto-apoyo">{t.vasAActivar}</p>
            <p className="cifra mt-2 break-all text-cifra">{email.trim()}</p>
            {/*
              Mismo arreglo que en `/alta`, y aquí importa todavía más: este es el
              único camino para corregir un correo mal tecleado ANTES de activarlo,
              y un alta sobre el correo equivocado no se deshace —crea la
              atribución en Sophon y consume el año de PRO—. Un objetivo de 20 px
              para la última salida antes de una acción irreversible.

              `-mb-3` y no `-my-3`: por arriba el `mt-1.5` ya separa del correo,
              así que solo hay que devolverle a la tarjeta los 12 px que la altura
              táctil añade por abajo. Sin eso el relleno se lee descuadrado —18 px
              arriba y 30 abajo—, que en un objeto con canto propio sí se nota.
            */}
            <button
              type="button"
              onClick={() => irA("email")}
              className="-mb-3 mt-1.5 inline-flex min-h-11 items-center text-apoyo font-medium underline underline-offset-4"
            >
              {t.corregirElCorreo}
            </button>
          </div>
        </Banda>

        <Banda orden={1} tono={1} className="py-5">
          <p className="text-apoyo">{t.incluyeUnAnio}</p>
          <p className="mt-1.5 text-apoyo text-texto-apoyo">{t.comoCobras}</p>
          <p className="mt-3 text-apoyo text-texto-apoyo">{t.altaNoSeDeshace}</p>
        </Banda>

        {error && (
          <Banda orden={2} tono={0} className="pt-5">
            <Aviso error={error} onReintentar={activar} />
          </Banda>
        )}

        <BotonPrincipalAccion texto={t.activar} onClick={activar} cargando={enviando} />
      </Pantalla>
    );
  }

  return (
    <Pantalla titulo={t.activarWebmaster}>
      <Banda orden={0} tono={0} className="pb-6">
        {/* El campo, dentro de la tarjeta y con la malla detrás, igual que en
            `/alta`: la tarea de la pantalla es escribir este correo, así que es
            el único objeto que se levanta del papel y el único sitio donde el
            amarillo aparece sin ser la acción. Suelto sobre la banda era un
            rectángulo perfilado sobre papel blanco, y la pantalla entera se leía
            como un formulario sin protagonista. */}
        <div className="tarjeta campo-malla">
          <label htmlFor="email" className="text-rotulo block text-texto-apoyo">
            {t.correoDelWebmaster}
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="mt-2 w-full rounded-control border border-borde-control bg-fondo px-4 py-3.5 text-cuerpo outline-none transition-colors duration-toque ease-sonda focus:border-tinta"
          />
          {/* La ayuda no repite el rótulo: dice lo que el rótulo no puede, que la
              cuenta tiene que existir ya en Sophon. Es el motivo por el que se
              cae la mitad de los altas, y enterarse después de pulsar cuesta una
              ida y vuelta al servidor. */}
          <p className="mt-2 text-apoyo text-texto-apoyo">{t.tieneQueExistirYa}</p>
        </div>
      </Banda>

      {/* Estado previo: qué pasa al continuar. No es letra pequeña, es contexto,
          y desde que el alta concede un año de PRO lo es todavía más. */}
      <Banda orden={1} tono={1} className="py-5">
        <p className="text-apoyo">{t.incluyeUnAnio}</p>
        <p className="mt-1.5 text-apoyo text-texto-apoyo">{t.comoCobras}</p>
      </Banda>

      <BotonPrincipalAccion
        texto={t.continuar}
        onClick={() => irA("confirmar")}
        activo={valido}
      />
    </Pantalla>
  );
}
