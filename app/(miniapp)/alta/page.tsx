"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Aparece } from "@/components/Animacion";
import { Aviso } from "@/components/Pantalla";
import { BotonPrincipalAccion, useTelegram } from "@/components/TelegramProvider";
import { TestigoVacio } from "@/components/testigo/Testigo";
import { api, ErrorApi } from "@/lib/api/cliente";
import { es } from "@/lib/i18n";

/**
 * Alta del agente: código → correo → OTP.
 *
 * Es la primera pantalla que ve un agente nuevo y todavía no tiene datos, así
 * que el raíl aparece como **columna hueca con la retícula marcada**: aún no ha
 * perforado. Es el mismo elemento que después llevará su histórico, no una
 * ilustración de bienvenida.
 *
 * **Por qué el código y el correo van juntos y el OTP aparte.** La disciplina de
 * la app es un campo por pantalla, pero el servidor canjea el código y manda el
 * OTP en la misma llamada: separarlos haría que el agente escribiera su correo
 * para enterarse después de que el código no valía. El OTP sí va aparte porque
 * llega por otro canal y hay una espera en medio.
 */

const SEGUNDOS_REENVIO = 60;

export default function Alta() {
  const router = useRouter();
  const { haptica } = useTelegram();

  const [paso, setPaso] = useState<"credenciales" | "otp">("credenciales");
  const [codigo, setCodigo] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [espera, setEspera] = useState(0);
  const campoOtp = useRef<HTMLInputElement>(null);

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const credencialesListas = codigo.trim().length >= 4 && emailValido;

  // Cuenta atrás del reenvío. El servidor rechaza un segundo envío antes de 60 s;
  // enseñar el plazo evita que el agente lo descubra con un error.
  useEffect(() => {
    if (espera <= 0) return;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  const pedirOtp = useCallback(async () => {
    if (!credencialesListas || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await api.post("/api/auth/codigo", { codigo: codigo.trim(), email: email.trim() });
      haptica("exito");
      setPaso("otp");
      setEspera(SEGUNDOS_REENVIO);
      setOtp("");
      // El foco va al campo nuevo: sin esto, en móvil el teclado se cierra y el
      // agente tiene que volver a tocar para escribir el código que acaba de
      // recibir.
      setTimeout(() => campoOtp.current?.focus(), 60);
    } catch (e) {
      haptica("error");
      setError(e instanceof ErrorApi ? e : new ErrorApi("Algo ha fallado.", 0, null));
    } finally {
      setEnviando(false);
    }
  }, [codigo, email, credencialesListas, enviando, haptica]);

  const verificar = useCallback(async () => {
    if (otp.length !== 6 || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await api.post("/api/auth/otp", { codigo: codigo.trim(), email: email.trim(), otp });
      haptica("exito");
      // Reemplazo, no empuje: volver atrás al alta ya completada no lleva a
      // ningún sitio útil.
      router.replace("/");
    } catch (e) {
      haptica("error");
      setError(e instanceof ErrorApi ? e : new ErrorApi("Algo ha fallado.", 0, null));
      setOtp("");
    } finally {
      setEnviando(false);
    }
  }, [otp, codigo, email, enviando, haptica, router]);

  return (
    <main className="relative min-h-dvh pl-testigo">
      {/* Aún no has perforado: el raíl vacío es el estado inicial del Testigo,
          no un adorno. Cuando el agente vuelva mañana estará empezando a
          llenarse con lo mismo que hoy está hueco.

          Sin la clase `testigo-terreno`: esa trama y las marcas del propio
          TestigoVacio son la misma retícula dibujada dos veces, y superpuestas
          se veían como un rayado sucio en lugar de como profundidad. */}
      <div className="fixed inset-y-0 left-0 w-testigo overflow-hidden bg-superficie">
        <TestigoVacio alto={900} />
      </div>

      <div className="px-4 pb-16 pt-10">
        {paso === "credenciales" ? (
          <>
            <Aparece orden={0}>
              <h1 className="text-titulo">Vincula tu cuenta</h1>
              <p className="mt-1.5 text-apoyo text-texto-apoyo">
                Solo se hace una vez. Después entras siempre desde este Telegram.
              </p>
            </Aparece>

            <Aparece orden={1}>
              <div className="mt-8">
                <label htmlFor="codigo" className="text-rotulo block text-texto-apoyo">
                  CÓDIGO DE ACTIVACIÓN
                </label>
                <input
                  id="codigo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="XXXX-XXXX"
                  className="cifra mt-2 w-full rounded-pieza border border-borde bg-superficie px-3.5 py-3.5 text-cuerpo tracking-[0.2em] outline-none focus:border-tinta"
                />
                {/* La ayuda no repite el rótulo: bajo «CÓDIGO DE ACTIVACIÓN»,
                    una línea que dice «escribe el código de activación» ocupa
                    sitio para no añadir nada. Solo se dice lo que el rótulo no
                    puede: de dónde sale. */}
                <p className="mt-2 text-apoyo text-texto-apoyo">Te lo da el superadmin.</p>
              </div>
            </Aparece>

            <Aparece orden={2}>
              <div className="mt-6">
                <label htmlFor="email" className="text-rotulo block text-texto-apoyo">
                  TU CORREO
                </label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="mt-2 w-full rounded-pieza border border-borde bg-superficie px-3.5 py-3.5 text-cuerpo outline-none focus:border-tinta"
                />
                <p className="mt-2 text-apoyo text-texto-apoyo">
                  Será tu identificador para entrar. Te mandaremos ahí un código de 6
                  dígitos.
                </p>
              </div>
            </Aparece>

            {error && (
              <div className="mt-6">
                <Aviso error={error.message} apoyo={error.apoyo} />
              </div>
            )}

            <BotonPrincipalAccion
              texto="ENVIARME EL CÓDIGO"
              onClick={pedirOtp}
              activo={credencialesListas}
              cargando={enviando}
            />
          </>
        ) : (
          <>
            <h1 className="text-titulo">Confirma que eres tú</h1>
            <p className="mt-1.5 text-apoyo text-texto-apoyo">{es.otpEnviado(email.trim())}</p>

            <div className="mt-8">
              <label htmlFor="otp" className="text-rotulo block text-texto-apoyo">
                CÓDIGO DE 6 DÍGITOS
              </label>

              {/* UN campo, no seis casillas. Seis inputs es el patrón por
                  defecto y rompe justo lo que hace fácil este paso: el pegado
                  desde el correo y el autorrelleno del código de un solo uso de
                  iOS. La retícula de abajo da la lectura de seis huecos sin
                  pagar ese precio. */}
              <div className="relative mt-2">
                <input
                  id="otp"
                  ref={campoOtp}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  className="cifra w-full rounded-pieza border border-borde bg-superficie px-3.5 pb-4 pt-3.5 text-center text-cifra tracking-[0.55em] indent-[0.55em] outline-none placeholder:text-texto-apoyo focus:border-tinta"
                />
                <span
                  className="pointer-events-none absolute inset-x-3.5 bottom-2.5 flex gap-1.5"
                  aria-hidden
                >
                  {Array.from({ length: 6 }, (_, i) => (
                    <span
                      key={i}
                      className={`h-[2px] flex-1 ${i < otp.length ? "bg-tinta" : "bg-borde"}`}
                    />
                  ))}
                </span>
              </div>
            </div>

            {error && (
              <div className="mt-5">
                <Aviso error={error.message} apoyo={error.apoyo} />
              </div>
            )}

            <div className="mt-6 flex items-baseline justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setPaso("credenciales");
                  setError(null);
                }}
                className="text-apoyo text-texto-apoyo underline underline-offset-4"
              >
                Cambiar el correo
              </button>
              <button
                type="button"
                onClick={pedirOtp}
                disabled={espera > 0 || enviando}
                className="text-apoyo font-medium underline underline-offset-4 disabled:no-underline disabled:opacity-50"
              >
                {espera > 0 ? `Reenviar en ${espera} s` : "Reenviar el código"}
              </button>
            </div>

            <BotonPrincipalAccion
              texto="ENTRAR"
              onClick={verificar}
              activo={otp.length === 6}
              cargando={enviando}
            />
          </>
        )}
      </div>
    </main>
  );
}
