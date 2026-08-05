"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Aviso, Banda, Pantalla } from "@/components/Pantalla";
import { BotonPrincipalAccion, useCadenas, useTelegram } from "@/components/TelegramProvider";
import { ErrorApi, aErrorApi, api } from "@/lib/api/cliente";

/**
 * Alta del agente: código → correo → OTP.
 *
 * Es la primera pantalla que ve un agente nuevo y todavía no tiene datos, así
 * que el raíl aparece como **columna hueca con la retícula marcada**: aún no ha
 * perforado. Es el mismo elemento que después llevará su histórico, no una
 * ilustración de bienvenida.
 *
 * Pasa por `Pantalla` como las demás. Tenía su propio `<main>`, y era la única
 * pantalla de la aplicación sin el armazón común: sin salida, sin bandas y con
 * el raíl montado a mano.
 *
 * **Por qué el código y el correo van juntos y el OTP aparte.** La disciplina de
 * la app es un campo por pantalla, pero el servidor canjea el código y manda el
 * OTP en la misma llamada: separarlos haría que el agente escribiera su correo
 * para enterarse después de que el código no valía. El OTP sí va aparte porque
 * llega por otro canal y hay una espera en medio.
 *
 * **El paso vive en la URL** (`?paso=otp`). Estaba en estado de componente, así
 * que el botón «atrás» nativo de Telegram salía de la pantalla y se llevaba el
 * código y el correo ya escritos. Ahora atrás retrocede un paso y los conserva.
 */

const SEGUNDOS_REENVIO = 60;

export default function Alta() {
  // `useSearchParams` obliga a un límite de suspensión en el prerenderizado.
  return (
    <Suspense fallback={null}>
      <AltaPasos />
    </Suspense>
  );
}

function AltaPasos() {
  const router = useRouter();
  const parametros = useSearchParams();
  const { haptica } = useTelegram();
  const t = useCadenas();

  const [codigo, setCodigo] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [espera, setEspera] = useState(0);
  // Solo se puede estar en el paso del OTP si el servidor llegó a mandarlo.
  // Sin esto, `?paso=otp` escrito a mano pediría un código que no existe.
  const [enviado, setEnviado] = useState(false);
  const campoOtp = useRef<HTMLInputElement>(null);

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const credencialesListas = codigo.trim().length >= 4 && emailValido;
  const paso = parametros.get("paso") === "otp" && enviado ? "otp" : "credenciales";

  // Cuenta atrás del reenvío. El servidor rechaza un segundo envío antes de 60 s;
  // enseñar el plazo evita que el agente lo descubra con un error.
  useEffect(() => {
    if (espera <= 0) return;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  // El foco va al campo nuevo en cuanto el paso cambia: sin esto, en móvil el
  // teclado se cierra y el agente tiene que volver a tocar para escribir el
  // código que acaba de recibir. Va atado al PASO y no al envío porque volver
  // atrás y adelante también trae aquí.
  useEffect(() => {
    if (paso !== "otp") return;
    const id = setTimeout(() => campoOtp.current?.focus(), 60);
    return () => clearTimeout(id);
  }, [paso]);

  const pedirOtp = useCallback(async () => {
    if (!credencialesListas || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await api.post("/api/auth/codigo", { codigo: codigo.trim(), email: email.trim() });
      haptica("exito");
      setEnviado(true);
      setEspera(SEGUNDOS_REENVIO);
      setOtp("");
      if (paso !== "otp") router.push("/alta?paso=otp");
    } catch (e) {
      haptica("error");
      setError(aErrorApi(e));
    } finally {
      setEnviando(false);
    }
  }, [codigo, email, credencialesListas, enviando, haptica, paso, router, t]);

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
      setError(aErrorApi(e));
      setOtp("");
    } finally {
      setEnviando(false);
    }
  }, [otp, codigo, email, enviando, haptica, router, t]);

  if (paso === "otp") {
    return (
      <Pantalla titulo={t.confirmaQueEresTu}>
        <Banda orden={0} tono={0} className="pb-6">
          <p className="text-apoyo text-texto-apoyo">{t.otpEnviado(email.trim())}</p>

          <label htmlFor="otp" className="text-rotulo mt-7 block text-texto-apoyo">
            {t.codigoDeSeisDigitos}
          </label>

          {/* UN campo, no seis casillas. Seis inputs es el patrón por defecto y
              rompe justo lo que hace fácil este paso: el pegado desde el correo
              y el autorrelleno del código de un solo uso de iOS. La retícula de
              abajo da la lectura de seis huecos sin pagar ese precio. */}
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
              className="cifra w-full rounded-control border border-borde-control bg-fondo px-3.5 pb-4 pt-3.5 text-center text-cifra tracking-[0.5em] indent-[0.5em] outline-none focus:border-tinta"
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

          {error && (
            <div className="mt-5">
              <Aviso error={error} />
            </div>
          )}
        </Banda>

        <Banda orden={1} tono={1} className="py-4">
          <div className="flex items-baseline justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                router.back();
              }}
              className="text-apoyo text-texto-apoyo underline underline-offset-4"
            >
              {t.cambiarElCorreo}
            </button>
            <button
              type="button"
              onClick={pedirOtp}
              disabled={espera > 0 || enviando}
              className="text-apoyo font-medium underline underline-offset-4 disabled:no-underline disabled:opacity-50"
            >
              {espera > 0 ? t.reenviarEn(espera) : t.reenviarElCodigo}
            </button>
          </div>
        </Banda>

        <BotonPrincipalAccion
          texto={t.entrar}
          onClick={verificar}
          activo={otp.length === 6}
          cargando={enviando}
        />
      </Pantalla>
    );
  }

  return (
    // `marca`: el isotipo sobre el título. Es la única pantalla de la Mini App
    // que lo lleva; el porqué está en la prop, en `Pantalla`.
    <Pantalla titulo={t.vinculaTuCuenta} marca>
      <Banda orden={0} tono={0} className="pb-7">
          <p className="text-apoyo text-texto-apoyo">{t.soloSeHaceUnaVez}</p>

          <div className="mt-7">
            <label htmlFor="codigo" className="text-rotulo block text-texto-apoyo">
              {t.codigoDeActivacion}
            </label>
            <input
              id="codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="XXXX-XXXX"
              className="cifra mt-2 w-full rounded-control border border-borde-control bg-fondo px-4 py-3.5 text-cuerpo outline-none focus:border-tinta tracking-[0.18em]"
            />
            {/* La ayuda no repite el rótulo: bajo «CÓDIGO DE ACTIVACIÓN», una
                línea que dice «escribe el código de activación» ocupa sitio para
                no añadir nada. Solo se dice lo que el rótulo no puede: de dónde
                sale. */}
            <p className="mt-2 text-apoyo text-texto-apoyo">{t.teLoDaElSuperadmin}</p>
          </div>

          <div className="mt-6">
            <label htmlFor="email" className="text-rotulo block text-texto-apoyo">
              {t.tuCorreo}
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
              className="mt-2 w-full rounded-control border border-borde-control bg-fondo px-4 py-3.5 text-cuerpo outline-none focus:border-tinta"
            />
            <p className="mt-2 text-apoyo text-texto-apoyo">{t.seraTuIdentificador}</p>
          </div>

          {error && (
            <div className="mt-6">
              <Aviso error={error} onReintentar={pedirOtp} />
            </div>
          )}
        </Banda>

      <BotonPrincipalAccion
        texto={t.enviarmeElCodigo}
        onClick={pedirOtp}
        activo={credencialesListas}
        cargando={enviando}
      />
    </Pantalla>
  );
}
