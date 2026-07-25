"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { Aviso, Pantalla } from "@/components/Pantalla";
import { BotonPrincipalAccion, useTelegram } from "@/components/TelegramProvider";
import { api, ErrorApi } from "@/lib/api/cliente";
import { es } from "@/lib/i18n";

/**
 * Activar webmaster.
 *
 * Pantalla de tarea: **un solo campo**. El teclado de Telegram se come media
 * pantalla, así que todo lo que importa vive arriba y la acción la ejecuta el
 * botón principal, que tiene reserva en el DOM por si el nativo queda tapado.
 *
 * Antes de pulsar se dice lo que va a pasar —qué gana el agente— en vez de
 * dejarlo en letra pequeña después. Un estado previo explicado evita la mitad
 * de las preguntas.
 */
export default function Activar() {
  const router = useRouter();
  const { haptica } = useTelegram();
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  const valido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  const activar = useCallback(async () => {
    if (!valido || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await api.post<{ email: string }>("/api/webmaster/activar", {
        email: email.trim(),
      });
      haptica("exito");
      setHecho(r.email);
    } catch (e) {
      haptica("error");
      setError(e instanceof ErrorApi ? e : new ErrorApi("Algo ha fallado.", 0, null));
    } finally {
      setEnviando(false);
    }
  }, [email, valido, enviando, haptica]);

  if (hecho) {
    return (
      <Pantalla titulo={es.activarWebmaster} volverA="/" tarea>
        <p className="text-cuerpo font-medium">{hecho} ya está en tu red.</p>
        <p className="mt-1.5 text-apoyo text-texto-apoyo">
          Cobrarás por los usuarios que registre a partir de hoy. Los que trajera antes
          no cuentan.
        </p>
        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={() => {
              setHecho(null);
              setEmail("");
            }}
            className="flex-1 rounded-pieza border border-borde px-4 py-3 text-cuerpo font-medium"
          >
            Activar otro
          </button>
          <button
            type="button"
            onClick={() => router.push("/red")}
            className="flex-1 rounded-pieza bg-tinta px-4 py-3 text-cuerpo font-semibold text-fondo"
          >
            Ver mi red
          </button>
        </div>
      </Pantalla>
    );
  }

  return (
    <Pantalla titulo={es.activarWebmaster} volverA="/" tarea>
      <label htmlFor="email" className="text-rotulo block text-texto-apoyo">
        CORREO DEL WEBMASTER
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
      <p className="mt-2 text-apoyo text-texto-apoyo">
        El correo con el que se registró en Sophon. Tiene que existir ya.
      </p>

      {/* Estado previo: qué pasa al pulsar. No es letra pequeña, es contexto. */}
      <div className="mt-6 border-l-2 border-borde pl-3">
        <p className="text-apoyo">
          Al activarlo pasa a tu red. {es.comoCobras}
        </p>
      </div>

      {error && (
        <div className="mt-5">
          <Aviso error={error.message} apoyo={error.apoyo} />
        </div>
      )}

      <BotonPrincipalAccion
        texto="ACTIVAR"
        onClick={activar}
        activo={valido}
        cargando={enviando}
      />
    </Pantalla>
  );
}
