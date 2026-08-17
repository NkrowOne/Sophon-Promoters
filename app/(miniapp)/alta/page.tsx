"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { CampoCodigo } from "@/components/CampoCodigo";
import { Aviso, Banda, Pantalla } from "@/components/Pantalla";
import { BotonPrincipalAccion, useCadenas, useTelegram } from "@/components/TelegramProvider";
import { ErrorApi, aErrorApi, api } from "@/lib/api/cliente";
// De `lib/codigo` y NO de `lib/cripto`: aquel importa `node:crypto` y esta
// pantalla es un componente de cliente, así que traerlo de allí lo mete en el
// paquete del navegador y el build se cae.
import { LONGITUD_CODIGO, formatearCodigo, normalizarCodigo } from "@/lib/codigo";

/**
 * Entrada del agente: correo → (código de activación) → OTP.
 *
 * ── POR QUÉ EL CORREO VA SOLO Y PRIMERO ──
 *
 * Antes esta pantalla pedía el código de activación y el correo a la vez, y eso
 * daba por hecho que todo el que llega es nuevo. La mayoría no lo es: es un
 * agente que ya está dado de alta y ha perdido la sesión —móvil nuevo, Telegram
 * reinstalado, la app cerrada demasiado tiempo—. A ese le estábamos pidiendo un
 * papel que ya gastó, y como los códigos son de un solo uso, la única salida
 * era escribir al Operador para que le diera otro. Por volver a abrir la app.
 *
 * Ahora la pantalla pregunta lo único que el agente siempre tiene: **su
 * correo**. El servidor mira si ese correo ya tiene cuenta y hay dos finales:
 *
 *   ya la tiene  → se le manda el código de verificación y a la siguiente
 *                  pantalla. No hay código de activación de por medio.
 *   no la tiene  → se despliega el campo del código de activación, porque
 *                  entonces sí es un alta.
 *
 * El campo se DESPLIEGA en vez de estar puesto desde el principio: enseñarlo a
 * todo el mundo vuelve a poner el papel delante del 90 % que no lo necesita, y
 * hacerlo aparecer de golpe no dice que la pantalla haya cambiado por algo. La
 * animación —`.desplegable`, en `globals.css`— es el único momento animado de
 * la pantalla y su trabajo es ese: hace falta una cosa más.
 *
 * ── EL PASO VIVE EN LA URL ──
 *
 * (`?paso=otp`). Estaba en estado de componente, así que el botón «atrás»
 * nativo de Telegram salía de la pantalla y se llevaba el correo ya escrito.
 * Ahora atrás retrocede un paso y lo conserva.
 *
 * ── LOS DEFECTOS QUE ARREGLÓ LA PASADA ANTERIOR, Y QUE SIGUEN CERRADOS ──
 *
 * 1. **La retícula del OTP no cuadraba con los dígitos.** Seis rayas repartidas
 *    a lo ancho bajo un texto centrado son dos geometrías distintas: el dígito
 *    nunca caía sobre su raya mientras se escribía. Ahora son casillas de verdad
 *    y el dibujo lo hace un solo elemento. Ver `components/CampoCodigo.tsx`.
 *
 * 2. **El placeholder del código enseñaba una forma que no existe.** Ponía
 *    `XXXX-XXXX` —grupos de cuatro— y los códigos que emite el bot son de diez
 *    caracteres en grupos de CINCO. Ahora el campo se formatea solo mientras se
 *    escribe, con los mismos grupos, así que no hay nada que comparar.
 *
 * 3. **Al fallar la verificación se perdía el foco.** `setOtp("")` vaciaba el
 *    campo y el teclado se cerraba, así que reintentar costaba un toque extra
 *    justo en el momento de más prisa. Ahora el foco vuelve al campo y el error
 *    se anuncia sin robárselo.
 *
 * 4. **El error movía la pantalla.** El `<Aviso>` se montaba y empujaba hacia
 *    abajo las dos salidas —«cambiar correo» y «reenviar»— justo cuando el dedo
 *    iba hacia una de ellas. Ahora su hueco está reservado.
 *
 * 5. **No había forma rápida de traer el código del correo.** El botón «Pegar»
 *    lee el portapapeles de una vez; es la otra mitad del correo, que ya trae el
 *    código en un bloque preparado para seleccionarlo de un toque.
 */

const SEGUNDOS_REENVIO = 60;
const DIGITOS_OTP = 6;

/** Lo que contesta `/api/auth/codigo`. `paso` es lo que decide la pantalla. */
interface RespuestaCodigo {
  ok: true;
  paso: "codigo" | "otp";
  registrado?: boolean;
  minutosValidez?: number;
}

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
  /*
   * DE QUÉ es el error, que no es lo mismo que si lo hay.
   *
   * Las dos llamadas de esta pantalla escriben en `error`: la que pide el
   * código y la que lo verifica. El campo se pintaba de rojo y se sacudía con
   * las dos, así que un fallo de red al pulsar «Reenviar código» acusaba al
   * código que el agente tenía escrito —o al campo vacío, si acababa de
   * reenviar— de estar mal. El aviso decía una cosa y el campo otra.
   *
   * Solo «codigo» tiñe el campo. El de envío se lee en el aviso, que es donde
   * está su explicación.
   */
  const [origenError, setOrigenError] = useState<"codigo" | "envio" | null>(null);
  const [espera, setEspera] = useState(0);
  // Solo se puede estar en el paso del OTP si el servidor llegó a mandarlo.
  // Sin esto, `?paso=otp` escrito a mano pediría un código que no existe.
  const [enviado, setEnviado] = useState(false);
  /*
   * El correo del que el servidor YA ha dicho que no tiene cuenta.
   *
   * Se guarda el correo, no un booleano, y esa es la diferencia entre estar en
   * lo cierto y parecerlo. Con un `necesitaCodigo: boolean`, el agente que
   * escribe un correo desconocido, ve desplegarse el campo y entonces se da
   * cuenta de que se ha equivocado de dirección, seguiría con el código exigido
   * para un correo sobre el que nadie ha preguntado nada — y ese correo puede
   * ser justo el suyo, el que sí tiene cuenta.
   *
   * Guardando cuál era, la exigencia se cae sola en cuanto el correo cambia y el
   * botón vuelve a decir «Continuar». El campo desplegado NO se recoge: plegarlo
   * a la primera tecla de una corrección es un salto en mitad de escribir, y
   * dejarlo abierto no cuesta nada porque lo que manda es lo que vaya escrito
   * cuando se pulse.
   */
  const [correoSondeado, setCorreoSondeado] = useState<string | null>(null);
  const [desplegado, setDesplegado] = useState(false);
  const campoOtp = useRef<HTMLInputElement>(null);
  const campoCodigo = useRef<HTMLInputElement>(null);
  /*
   * El último código que se llegó a enviar a verificar.
   *
   * Lo comparte `verificar` —que lo LIMPIA al fallar— con el efecto de
   * verificación automática, que lo usa para no reenviar dos veces el mismo
   * valor. Va declarado aquí arriba, con los demás refs, y no junto al efecto:
   * lo leen dos cosas y esconderlo al lado de una de ellas hace pensar que es
   * suya.
   */
  const yaIntentado = useRef<string | null>(null);

  const emailLimpio = email.trim();
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailLimpio);
  /*
   * Se mide lo NORMALIZADO, no lo que se ve: `MR7MD-APD6R` son diez, no once.
   *
   * Y se exige la longitud COMPLETA. Estaba en `>= 4`, que es el mínimo
   * defensivo del esquema del servidor y no la longitud real: con cuatro
   * caracteres escritos el botón ya se ponía amarillo, y pulsarlo gastaba una
   * ida y vuelta para recibir «el código no es válido» —que dice que está MAL
   * cuando está INCOMPLETO—. El agente concluye que le han dado un código malo.
   */
  const codigoLimpio = normalizarCodigo(codigo);
  const codigoCompleto = codigoLimpio.length === LONGITUD_CODIGO;
  /** Exigido solo para el correo del que consta que no tiene cuenta. */
  const exigeCodigo = correoSondeado !== null && correoSondeado === emailLimpio.toLowerCase();
  const listoParaEnviar = emailValido && (!exigeCodigo || codigoCompleto);
  const paso = parametros.get("paso") === "otp" && enviado ? "otp" : "credenciales";
  const otpCompleto = otp.length === DIGITOS_OTP;

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
    if (!listoParaEnviar || enviando) return;
    setEnviando(true);
    setError(null);
    setOrigenError(null);
    try {
      /*
       * El código se manda solo si está COMPLETO, y no según si el campo está
       * a la vista. Un código a medias mandado «porque el campo está abierto»
       * vuelve como «el código no vale», que acusa al papel de estar mal cuando
       * lo que pasa es que faltan letras. Y el servidor lo ignora de todas
       * formas cuando el correo ya tiene cuenta.
       */
      const r = await api.post<RespuestaCodigo>("/api/auth/codigo", {
        email: emailLimpio,
        ...(codigoCompleto ? { codigo: codigoLimpio } : {}),
      });

      // Correo sin cuenta: no se ha mandado nada, hace falta el código.
      if (r.paso === "codigo") {
        haptica("toque");
        setCorreoSondeado(emailLimpio.toLowerCase());
        setDesplegado(true);
        setEnviando(false);
        // Tras la apertura del pliegue: enfocarlo mientras la fila todavía mide
        // cero deja el teclado apuntando a un campo que aún no se ve.
        setTimeout(() => campoCodigo.current?.focus(), 240);
        return;
      }

      haptica("exito");
      setEnviado(true);
      setEspera(SEGUNDOS_REENVIO);
      setOtp("");
      if (paso !== "otp") router.push("/alta?paso=otp");
      // Reenviar desde el propio paso del OTP vacía el campo; sin esto, el
      // teclado se cierra y hay que volver a tocar para escribir el código que
      // está a punto de llegar.
      else setTimeout(() => campoOtp.current?.focus(), 0);
    } catch (e) {
      haptica("error");
      setError(aErrorApi(e));
      setOrigenError("envio");
      /*
       * Si YA se mandó un código antes, el paso del OTP sigue siendo un destino
       * válido aunque este envío falle — y hay que poder llegar.
       *
       * El agente que toca «Cambiar correo» solo para comprobar la dirección
       * volvía a la pantalla de credenciales, pulsaba «Enviar código», recibía
       * el 429 de los 60 segundos y se quedaba encerrado fuera: con un OTP
       * válido en la mano y sin ningún sitio donde escribirlo. El `router.push`
       * estaba dentro del `try`, así que solo se navegaba cuando el envío salía
       * bien, y este es justo el caso en que falla por estar todo correcto.
       */
      if (enviado && paso !== "otp") router.push("/alta?paso=otp");
    } finally {
      setEnviando(false);
    }
  }, [
    codigoCompleto,
    codigoLimpio,
    emailLimpio,
    listoParaEnviar,
    enviando,
    enviado,
    haptica,
    paso,
    router,
  ]);

  const verificar = useCallback(async () => {
    if (otp.length !== DIGITOS_OTP || enviando) return;
    setEnviando(true);
    setError(null);
    setOrigenError(null);
    try {
      // Mismo criterio que arriba: el código solo viaja si está entero. Quien
      // vuelve a entrar no tiene ninguno y el servidor no se lo pide.
      await api.post("/api/auth/otp", {
        email: emailLimpio,
        otp,
        ...(codigoCompleto ? { codigo: codigoLimpio } : {}),
      });
      haptica("exito");
      // Reemplazo, no empuje: volver atrás al alta ya completada no lleva a
      // ningún sitio útil.
      router.replace("/");
      /*
       * Y se sale SIN apagar el estado de carga.
       *
       * `router.replace` es una transición de cliente: el componente sigue
       * montado mientras Next trae la portada. Apagar `enviando` ahí devolvía
       * el botón a amarillo y pulsable sobre una pantalla que ya no hace nada, y
       * un segundo toque disparaba otra verificación con un OTP ya consumido,
       * que contesta «el código ha caducado» justo antes de que la pantalla
       * desaparezca.
       *
       * Por eso NO hay `finally`: un `finally` se ejecuta también cuando el
       * `try` retorna, así que ahí no había forma de saltárselo. Apagarlo en la
       * rama de error, que es la única donde el agente se queda en la pantalla,
       * dice lo mismo y solo cuando es verdad.
       */
      return;
    } catch (e) {
      haptica("error");
      setError(aErrorApi(e));
      setOrigenError("codigo");
      setOtp("");
      /*
       * Y se OLVIDA el intento, que es lo que permite reintentar el mismo.
       *
       * `yaIntentado` guarda el ultimo codigo enviado para que el efecto de
       * verificacion automatica no se dispare dos veces con el mismo valor. Sin
       * limpiarlo aqui, el agente que se equivoca de digito, lo corrige y vuelve
       * a escribir EL MISMO codigo —porque el fallo estaba en otra parte: el
       * codigo caducado, el reenvio que trajo otro— completaba las seis casillas
       * y no pasaba nada. La pantalla se quedaba quieta con el codigo puesto.
       *
       * Se limpia solo en el fallo: tras un acierto no hay a donde volver.
       */
      yaIntentado.current = null;
      /*
       * El foco VUELVE al campo.
       *
       * Vaciarlo sin devolver el foco cerraba el teclado, así que el reintento
       * costaba un toque de más justo cuando hay prisa. El `setTimeout` espera a
       * que React pinte el campo vacío: enfocar antes lo enfoca y lo pierde.
       */
      setTimeout(() => campoOtp.current?.focus(), 0);
      setEnviando(false);
    }
  }, [otp, codigoCompleto, codigoLimpio, emailLimpio, enviando, haptica, router]);

  /*
   * Verificación automática al completar los seis dígitos.
   *
   * Es lo que hace que pegar el código sea UN gesto en vez de dos: el agente que
   * llega del correo toca «Pegar» y ya está dentro; el que lo teclea no llega a
   * mirar el botón de abajo porque el sexto dígito lo dispara.
   *
   * `yaIntentado` evita el bucle. Sin él, un código incorrecto se vacía, se
   * vuelve a completar con el mismo valor —el usuario reintenta— y se reenvía
   * en cuanto coincide, para siempre. Se declara arriba, con los refs, y
   * `verificar` lo limpia al fallar para que reintentar el MISMO código vuelva
   * a valer.
   */
  useEffect(() => {
    if (!otpCompleto || enviando) return;
    if (yaIntentado.current === otp) return;
    yaIntentado.current = otp;
    void verificar();
  }, [otp, otpCompleto, enviando, verificar]);

  /*
   * El código, formateado mientras se escribe y CON EL CURSOR EN SU SITIO.
   *
   * Transformar el valor de un input controlado manda el cursor al final: si lo
   * que React pinta (`AB3KM-P7RQX`) no coincide con lo que hay en el DOM, React
   * asigna `node.value`, y asignar `value` reinicia la selección al final de la
   * cadena. Con `toUpperCase` ya pasaba —corregir la tercera letra mandaba el
   * cursor al final y la tecla siguiente iba al sitio equivocado— y al meter los
   * guiones pasaría siempre.
   *
   * Se arregla contando lo que de verdad importa: cuántos caracteres ÚTILES
   * —los del alfabeto, sin guiones— había antes del cursor. Ese número no lo
   * cambia el formateo, así que después basta con avanzar por el texto nuevo
   * hasta haber pasado los mismos y dejar ahí el cursor.
   */
  const alCambiarCodigo = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const bruto = e.target.value;
      const utilesAntes = normalizarCodigo(bruto.slice(0, e.target.selectionStart ?? bruto.length))
        .length;
      /*
       * Se RECORTA a la longitud de un código.
       *
       * `formatearCodigo` agrupa lo que le den, así que sin esto el campo
       * aceptaba treinta caracteres y los enseñaba en seis grupos. El botón no
       * se habilitaba —pide exactamente `LONGITUD_CODIGO`— pero eso deja al
       * agente mirando un campo lleno y un botón apagado sin nada que le diga
       * cuál de las dos cosas está mal.
       *
       * El recorte va sobre lo NORMALIZADO y antes de formatear: cortar el texto
       * ya agrupado se llevaría por delante un guion y descuadraría el resto.
       */
      const formateado = formatearCodigo(normalizarCodigo(bruto).slice(0, LONGITUD_CODIGO));
      if (error) setError(null);
      setCodigo(formateado);

      // Tras el pintado: antes, el `value` que se reasigna borra la selección.
      requestAnimationFrame(() => {
        const campo = campoCodigo.current;
        if (!campo) return;
        let i = 0;
        let vistos = 0;
        while (i < formateado.length && vistos < utilesAntes) {
          if (formateado[i] !== "-") vistos++;
          i++;
        }
        campo.setSelectionRange(i, i);
      });
    },
    [error],
  );

  /*
   * Traer el código del portapapeles.
   *
   * Es la mitad de la app de un gesto que empieza en el correo, donde el código
   * va en un bloque preparado para seleccionarlo de un toque. Un correo NO puede
   * llevar un botón que copie —no ejecuta JavaScript, ni siquiera con AMP—, así
   * que el botón vive en el único sitio donde puede existir.
   *
   * `readText` pide permiso en unos navegadores y no existe en otros; si falla,
   * el campo se queda como estaba y solo recibe el foco. No se enseña error: un
   * atajo que no está disponible no es un fallo, y un aviso ahí diría que algo
   * se ha roto cuando lo único que pasa es que hay que teclear.
   */
  const pegar = useCallback(async () => {
    try {
      const texto = await navigator.clipboard.readText();
      const digitos = texto.replace(/\D/g, "").slice(0, DIGITOS_OTP);
      if (digitos.length === 0) {
        campoOtp.current?.focus();
        return;
      }
      haptica("seleccion");
      setError(null);
      setOrigenError(null);
      setOtp(digitos);
      campoOtp.current?.focus();
    } catch {
      campoOtp.current?.focus();
    }
  }, [haptica]);

  if (paso === "otp") {
    return (
      <Pantalla titulo={t.confirmaQueEresTu}>
        <Banda orden={0} tono={0} className="pb-6">
          <p className="text-apoyo text-texto-apoyo">{t.otpEnviado(emailLimpio)}</p>

          {/*
            La tarjeta con el campo.

            Es el único objeto con relieve de la pantalla y lleva el motivo de
            malla detrás: aquí está la tarea, así que aquí va el color. Los tres
            bloques de esta pantalla dicen tres cosas de peso distinto
            —enunciado, tarea, salidas— y antes eran tres párrafos del mismo
            tamaño uno debajo de otro.
          */}
          <div className="tarjeta campo-malla mt-5">
            <div className="flex items-baseline justify-between gap-3">
              <span id="rotulo-otp" className="text-rotulo text-texto-apoyo">
                {t.codigoDeVerificacion}
              </span>
              {/*
                «Pegar» es un ATAJO, así que va de píldora pulsable y no de
                chapa: la chapa es la acción principal de la pantalla y esa la
                pone Telegram abajo. Dos chapas compitiendo sería el defecto de
                §12 con otra ropa.

                `min-h-11` con margen negativo que devuelve lo que la altura
                añade: 44 px de objetivo táctil sin que el bloque cambie de
                aspecto.
              */}
              <button
                type="button"
                onClick={pegar}
                className="pulsable -my-2.5 inline-flex min-h-11 items-center rounded-pildora px-2.5 text-apoyo font-semibold"
              >
                {t.pegarCodigo}
              </button>
            </div>

            <div className="mt-3">
              <CampoCodigo
                id="otp"
                campoRef={campoOtp}
                valor={otp}
                onCambio={(v) => {
                  if (error) {
                    setError(null);
                    setOrigenError(null);
                  }
                  setOtp(v);
                }}
                casillas={DIGITOS_OTP}
                modo="numerico"
                autoComplete="one-time-code"
                /*
                  Sin estado de «éxito»: verde es «el servidor lo ha dado por
                  bueno», y aquí lo único que se sabe es que hay seis dígitos.
                  Se pintaba en el instante entre completar y recibir respuesta,
                  o sea que celebraba justo antes de poder fallar. Lo que acusa
                  que el código está completo es la animación `confirmar`, que
                  no promete nada.
                */
                estado={origenError === "codigo" ? "error" : "normal"}
                etiquetadoPor="rotulo-otp"
              />
            </div>
          </div>

          {/*
            El hueco del error está RESERVADO.

            Montarlo empujaba hacia abajo las dos salidas de la pantalla justo en
            el momento en que el agente va a tocar una de ellas, que es la forma
            más fácil de que toque la que no era.

            Los 64 px son MEDIDOS, no estimados: el aviso de esta pantalla ocupa
            62 px con una línea y 64 con su línea de apoyo —los dos casos que
            devuelve `/api/auth/otp`—, así que con este hueco no se mueve nada en
            ninguno de los dos. Estaba en 44 y se quedaba corto por 18.
          */}
          <div className="mt-5" style={{ minHeight: 64 }}>
            {error && <Aviso error={error} />}
          </div>
        </Banda>

        <Banda orden={1} tono={1} className="py-6">
          {/*
            Las dos salidas de esta pantalla, y las dos medían 20 px de alto.

            Un texto de 14 px subrayado es un objetivo táctil de la altura de su
            línea: por debajo del mínimo de 24 px que pide WCAG 2.5.8 y muy por
            debajo de los 44 px de un dedo. Y no son enlaces accesorios: si el
            correo del código no llega, «reenviar» ES la recuperación, y se
            pulsa con prisa y a menudo en la calle.

            `items-center` en vez de `items-baseline`: con dos cajas de 44 px
            cuyo texto no ocupa toda la altura, alinear por la base de la letra
            las descuadra.
          */}
          <div className="-my-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setOrigenError(null);
                router.back();
              }}
              className="inline-flex min-h-11 items-center text-apoyo text-texto-apoyo underline underline-offset-4"
            >
              {t.cambiarElCorreo}
            </button>
            <button
              type="button"
              onClick={pedirOtp}
              disabled={espera > 0 || enviando}
              /*
                `.cifra` = `tabular-nums`. Sin ella, la cuenta atrás temblaba
                cada segundo —cifras proporcionales, cada dígito con su ancho— y
                daba un salto claro al pasar de dos cifras a una. Era lo único en
                movimiento en una pantalla que se supone quieta mientras se
                escribe el código.
              */
              className="cifra inline-flex min-h-11 items-center text-apoyo font-medium underline underline-offset-4 disabled:no-underline disabled:opacity-50"
            >
              {espera > 0 ? t.reenviarEn(espera) : t.reenviarElCodigo}
            </button>
          </div>
        </Banda>

        <BotonPrincipalAccion
          texto={t.entrar}
          onClick={verificar}
          activo={otpCompleto}
          cargando={enviando}
        />
      </Pantalla>
    );
  }

  return (
    // `marca`: el isotipo sobre el título. Es la única pantalla de la Mini App
    // que lo lleva; el porqué está en la prop, en `Pantalla`.
    <Pantalla titulo={t.entrarEnTuCuenta} marca>
      <Banda orden={0} tono={0} className="pb-6">
        <p className="text-apoyo text-texto-apoyo">{t.introduceTuCorreo}</p>

        <div className="tarjeta campo-malla mt-6">
          <div>
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
              onChange={(e) => {
                if (error) setError(null);
                setEmail(e.target.value);
              }}
              placeholder="correo@ejemplo.com"
              className="campo-texto mt-2"
            />
            <p className="mt-2 text-apoyo text-texto-apoyo">{t.seraTuIdentificador}</p>
          </div>

          {/*
            El código de activación, plegado hasta que el servidor dice que hace
            falta.

            El pliegue es un `grid-template-rows: 0fr → 1fr` (`.desplegable`, en
            `globals.css`): no hay que adivinar ninguna altura, así que el bloque
            entra entero cuando el texto de dentro ocupa dos líneas en árabe.

            `aria-hidden` mientras está cerrado, y los campos `disabled`: un
            `overflow: hidden` esconde a la vista pero NO al lector de pantalla
            ni al tabulador. Sin esto, quien navega con teclado tabula hacia un
            campo invisible de altura cero y el foco desaparece de la pantalla.
          */}
          <div className="desplegable" data-abierto={desplegado ? "si" : "no"}>
            <div>
              <div className="pt-6" aria-hidden={!desplegado}>
                {/*
                  La línea que explica POR QUÉ ha aparecido esto. Sin ella el
                  campo sale de la nada y parece que estaba desde el principio y
                  no se había visto.

                  Va con una regla encima porque separa dos cosas distintas
                  —quién eres / de dónde vienes— dentro de una misma tarjeta, y
                  con la regla se lee como un bloque nuevo en vez de como un
                  tercer campo del mismo formulario.
                */}
                <div className="border-t border-[color:var(--campo-canto-suave)] pt-5">
                  <p className="text-apoyo font-medium">{t.correoSinCuenta}</p>
                  <p className="mt-1 text-apoyo text-texto-apoyo">{t.correoSinCuentaApoyo}</p>
                </div>

                <label htmlFor="codigo" className="text-rotulo mt-5 block text-texto-apoyo">
                  {t.codigoDeActivacion}
                </label>
                {/*
                  Se formatea SOLO mientras se escribe.

                  El placeholder decía `XXXX-XXXX` —grupos de cuatro— y los
                  códigos que emite el bot son de diez caracteres en grupos de
                  CINCO (`formatearCodigo`, `lib/codigo.ts`). O sea que el campo
                  enseñaba una plantilla que ningún código real cumple.

                  Formatearlo, en vez de solo corregir el placeholder, resuelve
                  además el caso de quien pega `mr7md-apd6r` de un chat: entra en
                  minúsculas y sale canónico.

                  El alfabeto de los códigos no tiene O, I, L, 0 ni 1
                  (`ALFABETO_CODIGO`), así que no hay ambigüedad que deshacer: lo
                  que no es del alfabeto, sobra.
                */}
                <input
                  id="codigo"
                  ref={campoCodigo}
                  value={codigo}
                  onChange={alCambiarCodigo}
                  disabled={!desplegado}
                  tabIndex={desplegado ? undefined : -1}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  inputMode="text"
                  maxLength={39}
                  placeholder="XXXXX-XXXXX"
                  className="campo-texto cifra mt-2 tracking-[0.14em]"
                />
                {/* La ayuda no repite el rótulo: bajo «CÓDIGO DE ACTIVACIÓN»,
                    una línea que dice «escribe el código de activación» ocupa
                    sitio para no añadir nada. Solo se dice lo que el rótulo no
                    puede: de dónde sale. */}
                <p className="mt-2 text-apoyo text-texto-apoyo">{t.teLoDaElOperador}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mismo hueco reservado que en el paso del OTP, y por lo mismo: justo
            debajo está el botón principal de Telegram. */}
        <div className="mt-6" style={{ minHeight: 44 }}>
          {error && <Aviso error={error} onReintentar={pedirOtp} />}
        </div>
      </Banda>

      {/*
        El botón dice lo que va a pasar, y eso cambia con el paso.

        «Continuar» mientras solo hay un correo: no se sabe todavía si habrá
        correo que mandar o un código que pedir, y prometer «Enviar código»
        para acabar desplegando un campo es prometer de más. En cuanto consta
        que ese correo es un alta, pasa a «Enviar código», que ya es exacto.
      */}
      <BotonPrincipalAccion
        texto={exigeCodigo ? t.enviarmeElCodigo : t.continuar}
        onClick={pedirOtp}
        activo={listoParaEnviar}
        cargando={enviando}
      />
    </Pantalla>
  );
}
