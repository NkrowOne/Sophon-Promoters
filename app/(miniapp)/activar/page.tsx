"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Aviso, Pantalla } from "@/components/Pantalla";
import { BotonPrincipalAccion, useCadenas, useTelegram } from "@/components/TelegramProvider";
import { api, ErrorApi, nuevaIdempotencia } from "@/lib/api/cliente";

/**
 * Activar webmaster.
 *
 * Pantalla de tarea: **un solo campo**. El teclado de Telegram se come media
 * pantalla, así que todo lo que importa vive arriba y la acción la ejecuta el
 * botón principal, que tiene reserva en el DOM por si el nativo queda tapado.
 *
 * Es además donde se concede el PRO, porque alta y PRO son el mismo acto: el
 * webmaster entra con un año. Eso se dice ANTES de pulsar —no en letra pequeña
 * después— porque cambia lo que el agente cree estar haciendo.
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
  const router = useRouter();
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
    } catch (e) {
      haptica("error");
      setError(e instanceof ErrorApi ? e : new ErrorApi(t.algoHaFallado, 0, null));
    } finally {
      setEnviando(false);
    }
  }, [email, valido, enviando, haptica]);

  if (hecho) {
    return (
      <Pantalla titulo={t.activarWebmaster} volverA="/" tarea>
        <p className="text-cuerpo font-medium">{t.yaEstaEnTuRed(hecho.email)}</p>
        <p className="mt-1.5 text-apoyo text-texto-apoyo">{t.cobrarasDesdeHoy}</p>

        {/* El PRO tiene su propio párrafo porque puede haber ido distinto que
            el alta, y fundir los dos resultados en una sola frase de éxito
            escondería justo el caso que hay que reparar. */}
        {hecho.pro?.concedido && hecho.pro.vigenteHasta && (
          <p className="mt-3 text-apoyo">{t.proConcedido(formatoDia(hecho.pro.vigenteHasta))}</p>
        )}
        {hecho.pro && !hecho.pro.concedido && (
          <div className="mt-3 border-s-2 border-vivo ps-3">
            <p className="text-apoyo text-vivo">{t.proNoConcedido}</p>
            <p className="mt-1 text-apoyo text-texto-apoyo">{t.proNoConcedidoApoyo}</p>
          </div>
        )}
        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={() => {
              setHecho(null);
              setEmail("");
              clave.current = nuevaIdempotencia();
            }}
            className="flex-1 rounded-pieza border border-borde px-4 py-3 text-cuerpo font-medium"
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
            className="flex-1 rounded-pieza bg-tinta px-4 py-3 text-cuerpo font-semibold text-fondo"
          >
            {hecho.pro && !hecho.pro.concedido ? t.verSuFicha : t.verMiRed}
          </button>
        </div>
      </Pantalla>
    );
  }

  return (
    <Pantalla titulo={t.activarWebmaster} volverA="/" tarea>
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
        className="mt-2 w-full rounded-pieza border border-borde bg-superficie px-3.5 py-3.5 text-cuerpo outline-none focus:border-tinta"
      />
      <p className="mt-2 text-apoyo text-texto-apoyo">{t.tieneQueExistirYa}</p>

      {/* Estado previo: qué pasa al pulsar. No es letra pequeña, es contexto,
          y desde que el alta concede un año de PRO lo es todavía más. */}
      <div className="mt-6 border-s-2 border-borde ps-3">
        <p className="text-apoyo">{t.incluyeUnAnio}</p>
        <p className="mt-1.5 text-apoyo text-texto-apoyo">{t.comoCobras}</p>
      </div>

      {error && (
        <div className="mt-5">
          <Aviso error={error.message} apoyo={error.apoyo} />
        </div>
      )}

      <BotonPrincipalAccion
        texto={t.activar}
        onClick={activar}
        activo={valido}
        cargando={enviando}
      />
    </Pantalla>
  );
}
