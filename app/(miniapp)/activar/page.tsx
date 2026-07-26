"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Aviso, Banda, Marca, Pantalla } from "@/components/Pantalla";
import { BotonPrincipalAccion, useCadenas, useTelegram } from "@/components/TelegramProvider";
import { api, ErrorApi, nuevaIdempotencia } from "@/lib/api/cliente";

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
      setError(e instanceof ErrorApi ? e : new ErrorApi(t.algoHaFallado, 0, null));
    } finally {
      setEnviando(false);
    }
  }, [email, valido, enviando, haptica, router, t]);

  if (hecho) {
    return (
      <Pantalla titulo={t.activarWebmaster}>
        <Banda tono={0} className="pb-6">
          <p className="text-cuerpo font-medium">{t.yaEstaEnTuRed(hecho.email)}</p>
          <p className="mt-1.5 text-apoyo text-texto-apoyo">{t.cobrarasDesdeHoy}</p>
        </Banda>

        {/* El PRO tiene su propio estrato porque puede haber ido distinto que
            el alta, y fundir los dos resultados en una sola frase de éxito
            escondería justo el caso que hay que reparar. */}
        <Banda tono={1} etiqueta="PRO" className="py-5">
          {hecho.pro?.concedido && hecho.pro.vigenteHasta && (
            <p className="text-apoyo">{t.proConcedido(formatoDia(hecho.pro.vigenteHasta))}</p>
          )}
          {hecho.pro && !hecho.pro.concedido && (
            <div>
              <p className="text-apoyo">
                <Marca>{t.proNoConcedido}</Marca>
              </p>
              <p className="mt-1 text-apoyo text-texto-apoyo">{t.proNoConcedidoApoyo}</p>
            </div>
          )}
        </Banda>

        <Banda tono={0} className="pt-6">
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => {
                setHecho(null);
                setEmail("");
                clave.current = nuevaIdempotencia();
                router.replace("/activar");
              }}
              className="flex min-h-12 flex-1 items-center justify-center rounded-control border border-borde px-4 text-cuerpo font-medium"
            >
              {t.activarOtro}
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(
                  hecho.pro && !hecho.pro.concedido
                    ? `/red/${encodeURIComponent(hecho.email.toLowerCase())}`
                    : "/red",
                )
              }
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control bg-tinta px-4 text-cuerpo font-semibold text-fondo"
            >
              {hecho.pro && !hecho.pro.concedido ? t.verSuFicha : t.verMiRed}
            </button>
          </div>
        </Banda>
      </Pantalla>
    );
  }

  if (paso === "confirmar") {
    return (
      <Pantalla titulo={t.activarWebmaster}>
        <Banda tono={0} className="pb-6">
          <p className="text-rotulo text-texto-apoyo">{t.vasAActivar}</p>
          {/* El correo grande y entero: es lo único que hay que revisar aquí, y
              revisarlo en el tamaño de un campo de formulario es no revisarlo. */}
          <p className="cifra mt-2 break-all text-cuerpo font-semibold">{email.trim()}</p>
          <button
            type="button"
            onClick={() => irA("email")}
            className="mt-3 text-apoyo font-medium underline underline-offset-4"
          >
            {t.corregirElCorreo}
          </button>
        </Banda>

        <Banda tono={1} className="py-5">
          <p className="text-apoyo">{t.incluyeUnAnio}</p>
          <p className="mt-1.5 text-apoyo text-texto-apoyo">{t.comoCobras}</p>
          <p className="mt-3 text-apoyo text-texto-apoyo">{t.altaNoSeDeshace}</p>
        </Banda>

        {error && (
          <Banda tono={0} className="pt-5">
            <Aviso error={error.message} apoyo={error.apoyo} onReintentar={activar} />
          </Banda>
        )}

        <BotonPrincipalAccion texto={t.activar} onClick={activar} cargando={enviando} />
      </Pantalla>
    );
  }

  return (
    <Pantalla titulo={t.activarWebmaster}>
      <Banda tono={0} className="pb-6">
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
          className="mt-2 w-full rounded-control border border-borde bg-fondo px-4 py-3.5 text-cuerpo outline-none focus:border-tinta"
        />
        <p className="mt-2 text-apoyo text-texto-apoyo">{t.tieneQueExistirYa}</p>
      </Banda>

      {/* Estado previo: qué pasa al continuar. No es letra pequeña, es contexto,
          y desde que el alta concede un año de PRO lo es todavía más. */}
      <Banda tono={1} className="py-5">
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
