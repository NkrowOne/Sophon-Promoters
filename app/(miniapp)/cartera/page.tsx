"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CifraProtagonista } from "@/components/Animacion";
import { BonoDelMes, type Hito } from "@/components/BonoDelMes";
import { Escalera, type Cartera } from "@/components/Escalera";
import { Icono } from "@/components/Icono";
import { Importe } from "@/components/Importe";
import { Aviso, Banda, Cargando, FalloDeCarga, Pantalla } from "@/components/Pantalla";
import { BotonPrincipalAccion, useCadenas, useTelegram } from "@/components/TelegramProvider";
import { ErrorApi, aErrorApi, api, nuevaIdempotencia } from "@/lib/api/cliente";
import { formatearMicros, microsACadena } from "@/lib/devengo/dinero";
import { LOCALES, type Idioma } from "@/lib/idiomas";
import type { Cadenas } from "@/lib/i18n";

/**
 * Cartera.
 *
 * La pregunta es «¿cuándo cobro?», y la respuesta no es un saldo: es dónde está
 * el dinero dentro de una secuencia. Por eso lo primero es La Escalera y no una
 * cifra grande —una cifra grande no distingue lo que ya se puede pedir de lo que
 * todavía puede revisarse a la baja—.
 *
 * El formulario solo aparece cuando tiene sentido. Con una solicitud viva no se
 * enseña deshabilitado: se enseña la solicitud, que es lo que el agente ha
 * venido a mirar.
 */

/**
 * Las tres redes.
 *
 * El rótulo del botón es la abreviatura y no el nombre largo: «BNB Smart Chain»
 * obligaba a una retícula de dos más uno, y una fila descuadrada en el momento
 * de elegir la red de un pago es exactamente donde no conviene. El nombre
 * completo se dice debajo, en la línea de ayuda, que es donde se lee antes de
 * pegar la dirección.
 */
const REDES = [
  {
    id: "TRC20",
    corto: "TRC20",
    nombre: "TRON · TRC20",
    // Formas conocidas de cada red. No prueban que la dirección exista, pero sí
    // atrapan el error caro: pegar una wallet de otra red. Un pago a la red
    // equivocada no se recupera.
    forma: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
    pista: (t: Cadenas) => t.pistaTrc20,
    ejemplo: "TQn9Y2khDD95J42FQtQTdwVVR93ct…",
  },
  {
    id: "BSC",
    corto: "BSC",
    nombre: "BNB Smart Chain (BEP-20)",
    forma: /^0x[0-9a-fA-F]{40}$/,
    pista: (t: Cadenas) => t.pistaBsc,
    ejemplo: "0x71C7656EC7ab88b098defB751B…",
  },
  {
    id: "TON",
    corto: "TON",
    nombre: "TON",
    forma: /^[EU]Q[A-Za-z0-9_-]{46}$/,
    pista: (t: Cadenas) => t.pistaTon,
    ejemplo: "EQBvW8Z5huBkMJYdnfAEM5JqTNk…",
  },
] as const;

/**
 * La caja de campo del sistema, en un solo sitio.
 *
 * Los dos campos de esta pantalla la llevan idéntica, y escrita dos veces se
 * queda vieja en una de las dos: es la pantalla con más controles de la
 * aplicación y la que más veces se ha retocado.
 *
 * El contorno va de `--borde-control` y no de `--borde`: WCAG 1.4.11 pide 3:1
 * para el contorno de algo que se puede USAR, y aquí es donde el agente teclea
 * la dirección a la que le mandamos su dinero. Al foco el canto sube a tinta y
 * aparece el anillo de 3 px del amarillo diluido —el mismo gesto que la casilla
 * activa del código—: es la única marca amarilla del campo y dura lo que dura el
 * cursor dentro, así que no le discute nada al botón de pedir.
 *
 * `bg-fondo` y no la superficie de la banda: sobre el estrato 1 el campo queda
 * un escalón por delante en claro y un escalón por detrás en oscuro, y en las
 * dos polaridades se lee como un hueco donde se escribe.
 */
/*
 * El estilo del campo se ha ido a `.campo-texto`, en `globals.css`.
 *
 * Vivía aquí como una cadena, así que los dos campos de esta pantalla tenían
 * anillo de foco y los de `/alta` y `/activar` no: el mismo objeto se comportaba
 * distinto según por dónde hubieras entrado. Y su anillo iba de `--brand-soft`,
 * que sobre papel blanco da 1,09:1 — o sea que tampoco estaba de verdad.
 */

/**
 * Importe para escribir en un campo: coma decimal y sin ceros de relleno.
 *
 * `microsACadena` devuelve los seis decimales del micro —«96.200000»— que es lo
 * correcto para mandarlo al servidor y absurdo para enseñárselo a alguien.
 */
function paraEscribir(micros: bigint): string {
  const crudo = microsACadena(micros);
  const [enteros = "0", decimales = ""] = crudo.split(".");
  const recortado = decimales.replace(/0+$/, "").padEnd(2, "0");
  return `${enteros},${recortado}`;
}

type IdRed = (typeof REDES)[number]["id"];

interface Solicitud {
  id: string;
  importe: { micros: string; texto: string };
  red: string;
  wallet: string;
  estado: string;
  solicitadoEn: string;
  resueltoEn: string | null;
  motivo: string | null;
  referenciaPago: string | null;
}

interface Desglose {
  registros: { micros: string; texto: string };
  pro: { micros: string; texto: string };
  bonos: { micros: string; texto: string };
  ajustes: { micros: string; texto: string };
}

interface BonoCobrado {
  /** `AAAA-MM`. */
  mes: string;
  importe: { micros: string; texto: string };
  /** El nivel más alto que se pagó ese mes, o `null` si el asiento no lo lleva. */
  usuarios: number | null;
  consolidado: boolean;
}

interface Respuesta {
  cartera: Cartera;
  desglose: Desglose;
  bonos: BonoCobrado[];
  minimo: { micros: string; texto: string };
  /**
   * El bono EN CURSO: el mes natural, sus niveles y lo que llevas andado.
   *
   * `null` cuando no hay escalera configurada, y entonces la banda no se pinta:
   * un objetivo que no existe se enseña peor con una barra vacía que con nada.
   */
  hito: Hito | null;
  historial: Solicitud[];
}

export default function CarteraPagina() {
  const { haptica, idioma } = useTelegram();
  const t = useCadenas();
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [importe, setImporte] = useState("");
  const [red, setRed] = useState<IdRed>("TRC20");
  const [wallet, setWallet] = useState("");
  const [enviando, setEnviando] = useState(false);
  const idempotencia = useRef(nuevaIdempotencia());

  // Devuelve la promesa a propósito: `solicitar` necesita esperar a que la
  // recarga confirme que el retiro quedó guardado antes de tocar el formulario.
  const cargar = useCallback(() => {
    setError(null);
    return api
      .get<Respuesta>("/api/retiro")
      .then(setDatos)
      .catch((e) =>
        setError(aErrorApi(e)),
      );
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const viva = useMemo(
    () => datos?.historial.find((h) => h.estado === "SOLICITADO" || h.estado === "APROBADO") ?? null,
    [datos],
  );
  const resueltas = useMemo(
    () => (datos?.historial ?? []).filter((h) => h.id !== viva?.id),
    [datos, viva],
  );

  const disponibleMicros = datos ? BigInt(datos.cartera.disponible.micros) : 0n;
  const minimoMicros = datos ? BigInt(datos.minimo.micros) : 0n;
  const definicionRed = REDES.find((r) => r.id === red)!;

  const importeMicros = useMemo(() => {
    const limpio = importe.trim().replace(",", ".");
    if (!/^\d+(\.\d{1,6})?$/.test(limpio)) return null;
    const [enteros, decimales = ""] = limpio.split(".");
    return BigInt(enteros!) * 1_000_000n + BigInt(decimales.padEnd(6, "0"));
  }, [importe]);

  const walletValida = definicionRed.forma.test(wallet.trim());
  const importeValido =
    importeMicros !== null && importeMicros >= minimoMicros && importeMicros <= disponibleMicros;

  const solicitar = useCallback(async () => {
    if (!importeValido || !walletValida || enviando || importeMicros === null) return;
    setEnviando(true);
    setError(null);
    try {
      await api.post("/api/retiro", {
        importe: microsACadena(importeMicros),
        red,
        wallet: wallet.trim(),
        idempotencia: idempotencia.current,
      });
      haptica("exito");
      // Clave nueva: la siguiente solicitud es otra intención, no un reintento
      // de esta.
      idempotencia.current = nuevaIdempotencia();
      // El formulario se vacía DESPUÉS de recargar, no antes. Se limpiaba nada
      // más responder el POST, así que si la recarga fallaba el agente se
      // quedaba con la pantalla en blanco: ni la solicitud viva —que no había
      // podido leer— ni el importe y la wallet que acababa de escribir, y sin
      // saber si su retiro existía o no.
      await cargar();
      setImporte("");
      setWallet("");
    } catch (e) {
      haptica("error");
      setError(aErrorApi(e));
    } finally {
      setEnviando(false);
    }
  }, [importeValido, walletValida, enviando, importeMicros, red, wallet, haptica, cargar]);

  if (error && !datos) {
    return (
      <Pantalla titulo={t.cartera}>
        <FalloDeCarga error={error} onReintentar={cargar} />
      </Pantalla>
    );
  }
  if (!datos) {
    return (
      <Pantalla titulo={t.cartera}>
        <Cargando />
      </Pantalla>
    );
  }

  /*
   * El puesto de cada banda en la secuencia de entrada.
   *
   * La del bono es CONDICIONAL —sin escalera configurada no hay objetivos que
   * pintar—, así que el puesto de las de abajo se calcula en vez de escribirse a
   * mano: escrito, esa rama abriría un hueco de 40 ms en el escalonado, que es
   * exactamente el defecto que la portada ya tuvo cuando se le metió una banda
   * nueva por en medio.
   */
  const trasElBono = datos.hito ? 1 : 0;

  return (
    <Pantalla
      titulo={t.cartera}
      /* «¿Cuándo cobro?» empieza por «¿cuánto puedo pedir ya?». Eso es lo que
         va sobre la placa; la Escalera de debajo explica por qué el disponible
         no es igual al devengado.

         En la cara de display y contando desde cero, como la de la portada: es
         LA cifra de la pantalla —de ella salen el mínimo, el «Todo» y el importe
         del botón— y verla subir dice de dónde viene. Que las dos placas de la
         aplicación se pinten con la misma pieza es además lo que impide que una
         se quede con la cifra de la otra. */
      placa={{ rotulo: t.disponible, valor: <CifraProtagonista micros={disponibleMicros} /> }}
    >
      <Banda orden={0} tono={0} className="pb-6">
        {/* La Escalera va en TARJETA. Los cuatro estados son un mismo dinero
            avanzando, así que son una unidad: levantada del papel se lee de un
            vistazo como una sola cosa, y suelta sobre la banda eran cuatro
            renglones que había que agrupar con la vista. Una tarjeta dentro de
            una banda; nunca al revés. */}
        <div className="tarjeta">
          <Escalera cartera={datos.cartera} etiquetas={t} />
        </div>

        {/* Una sola línea aquí, y FUERA de la tarjeta: la que explica por qué
            disponible < devengado, que es la pregunta que nace al mirar la
            escalera. Dentro se leería como un peldaño más. Lo que tarda el
            Operador se dice junto al botón de pedir, que es cuando importa. */}
        <p className="mt-4 text-apoyo text-texto-apoyo">{t.soloConsolidado}</p>

        {/* El aviso vive FUERA del ternario de abajo. Estaba dentro de la rama
            que solo se pinta cuando no hay solicitud viva, así que un fallo al
            recargar después de enviar —justo el momento en que el agente más
            necesita saber qué ha pasado con su dinero— no se veía en ninguna
            parte. */}
        {error && (
          <div className="mt-5">
            <Aviso error={error} onReintentar={() => void cargar()} />
          </div>
        )}
      </Banda>

      {viva ? (
        <Banda orden={1} tono={1} etiqueta={t.solicitudEnCurso} className="py-6">
          {/*
            La solicitud viva, en TARJETA y con MALLA.

            Es una unidad —un importe, un estado, una wallet, una fecha— y es a
            lo que el agente ha venido: levantarla del papel es exactamente para
            lo que existe la tarjeta.

            La malla se la queda esta rama y solo esta: cuando hay una solicitud
            en curso no hay formulario, o sea que no hay chapa, o sea que no hay
            un solo píxel amarillo en toda la pantalla. El motivo pone la marca
            detrás de la respuesta sin fingir que se pulsa —un campo radial
            diluido no tiene forma de botón— y devuelve el color a la única
            pantalla del flujo que se quedaba sin él.
          */}
          <div className="tarjeta campo-malla">
            <p className="text-rotulo text-texto-apoyo">{t.solicitudEnCurso}</p>
            <p className="mt-1.5">
              <Importe texto={viva.importe.texto} className="text-cifra" />
            </p>
            {/* Píldora NEUTRA. Las dos formas de estar viva —pendiente de
                revisión y aprobada sin pagar— son esperas, y el tinte de color
                se reserva a lo que ya se cobró o a lo que salió mal: un verde
                aquí diría que el dinero ha llegado.

                El icono se pide por su DIBUJO y no por su nombre: `caducado` es
                un reloj, y lo que dice aquí es que hay un plazo corriendo. */}
            <p className="mt-2.5">
              <span className="pildora">
                <Icono nombre="caducado" tam={13} />
                {estadoLegible(viva.estado, t)}
              </span>
            </p>
            {/* `break-all` en la wallet: son 42 caracteres en mono sin ningún
                sitio por donde partir, así que sin esto la línea se sale de la
                banda. En árabe se veía desbordar por la izquierda; en español
                desbordaba igual, solo que hacia fuera de la pantalla. */}
            <p className="mt-3 break-all text-apoyo text-texto-apoyo">
              {viva.red} · <span className="cifra">{viva.wallet}</span>
            </p>
            <p className="mt-2 text-apoyo text-texto-apoyo">
              {t.pedidaEl(formatoFecha(viva.solicitadoEn))} {t.soloUnaALaVez}
            </p>
          </div>
        </Banda>
      ) : (
        <Banda orden={1} tono={1} etiqueta={t.solicitarRetiro} className="py-6">
          <p className="text-rotulo mb-3 border-b border-junta pb-2 text-texto-apoyo">
            {t.solicitarRetiro}
          </p>

          <label htmlFor="importe" className="text-rotulo block text-texto-apoyo">
            {t.cuanto}
          </label>
          {/* El importe y «Todo» comparten fila, y los dos llegan al mínimo
              táctil por la misma vía: el campo mide 56 px por su propio relleno
              y el botón es un hermano flexible sin altura propia, así que se
              estira hasta la del campo. Nada de esto depende de una altura
              escrita a mano que haya que recordar cuando cambie el cuerpo. */}
          <div className="mt-2 flex gap-2">
            <input
              id="importe"
              value={importe}
              onChange={(e) => setImporte(e.target.value.replace(/[^\d.,]/g, ""))}
              inputMode="decimal"
              placeholder={paraEscribir(minimoMicros)}
              /* El importe se teclea en cuerpo de cifra: es el dato de la
                 pantalla, y escrito a 16 px pesaba menos que la etiqueta que lo
                 nombra. */
              className="campo-texto cifra min-w-0 flex-1 text-cifra"
            />
            {/* «Todo» evita el error más común de este formulario: teclear el
                disponible a mano y equivocarse en un céntimo, que el servidor
                rechaza por pasarse del saldo.
                Chapa HUECA: se pulsa, así que tiene forma de control, pero el
                amarillo es de la acción principal y aquí solo hay sitio para
                una. Deshabilitada pierde el canto y la sombra en vez de bajar la
                opacidad —una chapa lavada del mismo color sigue pareciendo
                pulsable—, que es lo que hace `.chapa:disabled`. */}
            <button
              type="button"
              onClick={() => setImporte(paraEscribir(disponibleMicros))}
              disabled={disponibleMicros < minimoMicros}
              className="chapa-hueca pulsable shrink-0 text-cuerpo disabled:border-borde disabled:bg-superficie-alta disabled:text-[var(--text-disabled)] disabled:shadow-none"
            >
              {t.todo}
            </button>
          </div>
          <p className="mt-2 text-apoyo text-texto-apoyo">
            {t.disponibleYMinimo} <Importe texto={datos.cartera.disponible.texto} /> ·{" "}
            {t.minimo} <Importe texto={datos.minimo.texto} />
          </p>
          {importeMicros !== null && importeMicros > disponibleMicros && (
            <p className="mt-1 text-apoyo text-peligro">
              {t.tePasasEn(formatearMicros(importeMicros - disponibleMicros, 2, idioma))}
            </p>
          )}
          {importeMicros !== null &&
            importeMicros < minimoMicros &&
            importeMicros > 0n && (
              <p className="mt-1 text-apoyo text-peligro">
                {t.teFaltanParaElMinimo(formatearMicros(minimoMicros - importeMicros, 2, idioma))}
              </p>
            )}

          <div className="mt-6">
            <p className="text-rotulo mb-2 text-texto-apoyo">{t.enQueRed}</p>
            <div className="grid grid-cols-3 gap-2">
              {REDES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    haptica("seleccion");
                    setRed(r.id);
                  }}
                  /*
                    Las tres chapas del sistema, que ya traen los 46 px de alto:
                    medían 114×41 y elegir la red de un pago es el control donde
                    menos conviene fallar un toque —una wallet en la red
                    equivocada no se recupera—.

                    La red elegida va de TINTA y no de campo: es un estado, no
                    una acción. Reservar el amarillo para lo que hay que pulsar
                    es lo que hace que signifique algo cuando aparece.

                    Y el acuse del toque se escribe aquí en vez de con
                    `.pulsable`: esa clase tiñe el fondo al pulsar con
                    especificidad (0,2,0), o sea que le ganaría al campo de
                    `.chapa-tinta` (0,1,0) y la chapa oscura se pondría gris
                    claro con su texto blanco encima durante 120 ms. Es el mismo
                    defecto que `.chapa:active:not(:disabled)` corrige para la
                    amarilla. Solo `transform`, y solo si no se ha pedido
                    quietud.
                  */
                  className={[
                    "text-cuerpo transition-transform duration-toque ease-sonda",
                    "motion-safe:active:scale-[0.97]",
                    red === r.id ? "chapa-tinta" : "chapa-hueca",
                  ].join(" ")}
                >
                  {r.corto}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="wallet" className="text-rotulo block text-texto-apoyo">
              {t.walletUsdt}
            </label>
            {/* El marcador de posición es un EJEMPLO de dirección, no la
                explicación: repetir en el hueco lo mismo que dice la línea de
                abajo ocupaba dos sitios para decir una cosa, y ninguno de los
                dos enseñaba qué forma tiene una wallet de esta red. */}
            <input
              id="wallet"
              value={wallet}
              onChange={(e) => setWallet(e.target.value.trim())}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={definicionRed.ejemplo}
              className="campo-texto cifra mt-2 w-full break-all"
            />
            <p
              className={`mt-2 text-apoyo ${
                wallet && !walletValida ? "text-peligro" : "text-texto-apoyo"
              }`}
            >
              {wallet && !walletValida
                ? t.direccionMalFormada(definicionRed.nombre, definicionRed.pista(t))
                : t.usdtEn(definicionRed.nombre, definicionRed.pista(t))}
            </p>
          </div>

          {/* Lo que tarda, junto al botón: es donde la espera se convierte en
              una expectativa concreta y no en una duda. */}
          <p className="mt-6 border-s-2 border-tinta ps-3 text-apoyo text-texto-apoyo">
            {t.revisionManual}
          </p>

          <BotonPrincipalAccion
            texto={
              importeValido ? t.pedirImporte(formatearMicros(importeMicros!, 2, idioma)) : t.solicitarRetiro
            }
            onClick={solicitar}
            activo={importeValido && walletValida}
            cargando={enviando}
          />
        </Banda>
      )}

      {/*
        EL BONO DEL MES: el juego, en la pantalla donde se cobra.

        Aquí no había ni objetivo ni avance. La pantalla contaba el PASADO —el
        desglose del saldo y los bonos ya registrados— así que un agente que
        entra a retirar veía «Bonos 0,00 $» y «No hay bonos registrados» y nada
        que dijera qué hay que hacer para que esa línea deje de ser cero. El
        avance existía, pero solo en la portada: dos pantallas de la misma
        aplicación contando la mitad de la misma historia cada una.

        Es la MISMA pieza que la portada —`components/BonoDelMes.tsx`— y no una
        versión reducida: la escalera entera con el premio de cada nivel, el
        relleno de cada tramo, el ritmo del mes y los días que quedan. Con el mes
        a cero también se ve, que es justo el caso que la hizo falta: sin ningún
        registro, el medidor enseña los cuatro niveles con lo que paga cada uno y
        la línea de abajo dice cuánto falta para el primero.

        Va DESPUÉS del formulario y antes del origen del saldo, que es el orden
        de las preguntas: cuánto puedo pedir → lo pido → qué hay en juego este
        mes → de qué está hecho el total. Delante del formulario habría empujado
        la acción fuera de la primera pantalla de scroll.

        La malla SOLO cuando no hay solicitud viva: cuando la hay, la tarjeta de
        la solicitud ya se la queda, y el motivo de marca repetido dos veces en
        la misma pantalla deja de ser una firma y pasa a ser un fondo.
      */}
      {datos.hito && (
        <Banda orden={2} tono={2} etiqueta={t.bonoDelMes} className="py-6">
          <BonoDelMes hito={datos.hito} malla={!viva} />
        </Banda>
      )}

      {/*
        DE DÓNDE SALE: la otra mitad de la pregunta del dinero.

        La Escalera de arriba contesta a DÓNDE está —ganado, disponible, pedido,
        cobrado—. Lo que no contestaba nadie es de QUÉ está hecho, y el que se
        perdía por ahí era el bono: se ganaba, se anunciaba por Telegram, entraba
        en el total y desaparecía. Un premio que solo se ve el día que se gana es
        un premio que no se cuenta dos veces, y contarlo es la mitad de para qué
        existe.

        Va DESPUÉS del formulario y no antes: lo que trae al agente a esta
        pantalla es pedir su dinero, y una explicación entre la cifra y el botón
        habría empujado la acción fuera de la primera pantalla de scroll. Aquí
        contesta a la pregunta que nace DESPUÉS de mirar el saldo.
      */}
      <Banda orden={2 + trasElBono} tono={2} etiqueta={t.deDondeSale} className="py-6">
        <p className="text-rotulo text-texto-apoyo">{t.deDondeSale}</p>
        <p className="mt-1 text-apoyo text-texto-apoyo">{t.deDondeSaleApoyo}</p>

        {/* En TARJETA, como la Escalera y por lo mismo: las tres vías son un
            mismo saldo repartido, no tres magnitudes sueltas. Levantada del
            papel se lee de un vistazo como una sola cosa. */}
        <div className="tarjeta mt-4">
          <ul className="divide-y divide-junta" role="list">
            <FilaOrigen etiqueta={t.porRegistros} importe={datos.desglose.registros} />
            <FilaOrigen etiqueta={t.porComprasPro} importe={datos.desglose.pro} />
            <FilaOrigen etiqueta={t.porBonos} importe={datos.desglose.bonos} />
            {/* Los ajustes solo si los hay. Una fila a cero en un sitio donde
                cero es lo normal enseña una corrección que nunca ha pasado, y
                deja al agente buscando qué le han quitado. */}
            {datos.desglose.ajustes.micros !== "0" && (
              <FilaOrigen etiqueta={t.porAjustes} importe={datos.desglose.ajustes} />
            )}
          </ul>
        </div>

        {/* Y los bonos, uno por uno. El reparto de arriba dice CUÁNTO llevas de
            bonos; esto dice de qué meses y por qué nivel, que es lo que permite
            compararlo con el mes que viene. */}
        <p className="text-rotulo mt-6 text-texto-apoyo">{t.bonosCobrados}</p>
        {datos.bonos.length === 0 ? (
          <>
            <p className="mt-2 text-apoyo text-texto-apoyo">{t.sinBonos}</p>
            {/* El estado vacío ENSEÑA la regla en vez de disculparse: quien
                todavía no ha cobrado ninguno es justo quien necesita saber que
                el contador empieza de cero el día 1. */}
            <p className="mt-1 text-apoyo text-texto-apoyo">{t.sinBonosApoyo}</p>
          </>
        ) : (
          /* Tarjeta de BORDE y no de sombra, igual que el historial de cobros:
             es una lista densa, y una sombra bajo doce filas no levanta nada,
             hace ruido. La junta vuelve a verse porque la lista va sobre la
             tarjeta y no sobre el estrato 2, que es el más oscuro de los tres. */
          <ul className="tarjeta-borde mt-3 divide-y divide-junta" role="list">
            {datos.bonos.map((b) => (
              <li key={b.mes} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-cuerpo">{mesLargo(b.mes, idioma)}</span>
                  <Importe texto={b.importe.texto} className="text-cuerpo font-semibold" />
                </div>
                <p className="mt-0.5 text-apoyo text-texto-apoyo">
                  {b.usuarios !== null ? t.bonoNivelDe(b.usuarios) : t.bonoSinNivel}
                  {/* Un bono del mes en curso todavía puede subir de nivel, así
                      que decir solo la cifra sería prometer un total que no está
                      cerrado. */}
                  {!b.consolidado && ` · ${t.todaviaEnRevision}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Banda>

      {/* Historial SIN la solicitud viva: ya está arriba, con más detalle. Que
          apareciera dos veces en la misma pantalla hacía dudar de si eran dos
          solicitudes distintas, que es justo la confusión que este flujo —una
          sola viva a la vez— tiene que evitar. */}
      <Banda orden={3 + trasElBono} tono={2} etiqueta={t.solicitudesAnteriores} className="py-6">
        {/* Sin filete bajo el rótulo: la raya existe para separarlo de un
            contenido suelto, y aquí lo que viene debajo es una tarjeta que ya
            trae su propio canto. Dos líneas horizontales a catorce píxeles una
            de otra no separan nada, solo se ven. */}
        <p className="text-rotulo mb-3 text-texto-apoyo">{t.solicitudesAnteriores}</p>
        {resueltas.length === 0 ? (
          <p className="py-4 text-apoyo text-texto-apoyo">{t.sinMovimientos}</p>
        ) : (
          /*
            Tarjeta de BORDE, y por dos motivos que se suman.

            Uno: es lo denso. Cada cobro son hasta cuatro líneas, y una sombra
            bajo una lista de veinte no levanta nada, hace ruido.

            Dos: es lo que hace legible el arreglo de abajo. La lista se
            separaba con `divide-borde` —el canto de un objeto— mientras las
            demás listas de la casa usan `divide-junta`, pero la junta está
            calibrada contra papel casi blanco: sobre el estrato 2, que es el
            más oscuro de los tres, se queda en 1,03:1 y desaparece. Con la
            lista sobre la tarjeta, la junta vuelve a tener el mismo contraste
            que en el menú de la portada y las filas se distinguen otra vez.

            Los peldaños llevan `first:pt-0 last:pb-0`: el aire de los extremos
            lo pone el relleno de la tarjeta, y sumado al de la fila abría el
            doble arriba y abajo que entre filas.
          */
          <ul className="tarjeta-borde divide-y divide-junta" role="list">
            {resueltas.map((h) => (
              <li key={h.id} className="py-3 first:pt-0 last:pb-0">
                {/* `items-center` y no `items-baseline`: la píldora es una caja,
                    y alinear una cápsula por la línea base de su texto la deja
                    montada sobre la cifra de al lado. */}
                <div className="flex items-center justify-between gap-3">
                  <Importe texto={h.importe.texto} className="text-cuerpo" />
                  <EstadoResuelto estado={h.estado} t={t} />
                </div>
                <p className="mt-0.5 break-all text-apoyo text-texto-apoyo">
                  {formatoFecha(h.solicitadoEn)} · {h.red} ·{" "}
                  <span className="cifra">{h.wallet}</span>
                </p>
                {/* Un rechazo sin motivo obliga a preguntar por Telegram; con el
                    motivo, el agente corrige y vuelve a pedir. */}
                {h.motivo && <p className="mt-1 text-apoyo text-peligro">{h.motivo}</p>}
                {/* El hash de la transacción va recortado por los dos extremos,
                    que es como se compara de verdad contra un explorador de
                    bloques. Los cuarenta caracteres enteros ocupaban tres
                    líneas y no se leían mejor. */}
                {h.referenciaPago && (
                  <p
                    className="cifra mt-1 text-apoyo text-texto-apoyo"
                    title={h.referenciaPago}
                  >
                    {h.referenciaPago.length > 20
                      ? `${h.referenciaPago.slice(0, 10)}…${h.referenciaPago.slice(-8)}`
                      : h.referenciaPago}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Banda>
    </Pantalla>
  );
}

/**
 * El estado de una solicitud ya resuelta.
 *
 * Píldora SOLO en los dos extremos: cobrado y rechazado. Es la regla de escasez
 * de la cápsula, y sin ella vuelve el defecto que la hizo desaparecer de esta
 * aplicación —una lista donde cada fila lleva su chip de color es la firma del
 * panel de control genérico, y además el tinte deja de significar nada en cuanto
 * lo lleva todo—. Una cancelada no es ni una cosa ni la otra, así que se dice en
 * texto de apoyo: que un dato secundario se lea como secundario es la opción
 * aburrida y es la correcta.
 *
 * El rechazo lleva además su motivo justo debajo, en la fila: la píldora dice
 * que pasó algo y el motivo dice qué, que es lo que permite corregir y volver a
 * pedir sin escribir al Operador.
 */
function EstadoResuelto({ estado, t }: { estado: string; t: Cadenas }) {
  if (estado === "PAGADO") {
    return (
      <span className="pildora pildora-exito">
        <Icono nombre="activo" tam={13} />
        {estadoLegible(estado, t)}
      </span>
    );
  }
  if (estado === "RECHAZADO") {
    return (
      <span className="pildora pildora-peligro">
        <Icono nombre="aviso" tam={13} />
        {estadoLegible(estado, t)}
      </span>
    );
  }
  return <span className="text-apoyo text-texto-apoyo">{estadoLegible(estado, t)}</span>;
}

/** El estado de una solicitud, dicho en el idioma del agente. */
function estadoLegible(estado: string, t: Cadenas): string {
  switch (estado) {
    case "SOLICITADO":
      return t.pendienteDeRevision;
    case "APROBADO":
      return t.aprobadoPendientePago;
    case "PAGADO":
      return t.estadoPagado;
    case "RECHAZADO":
      return t.estadoRechazado;
    default:
      return t.estadoCancelado;
  }
}

function formatoFecha(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
}

/**
 * Una vía de ingreso: de qué es y cuánto llevas por ella.
 *
 * `apagado` en el cero, que es la convención de `Importe` en toda la casa: una
 * vía que todavía no ha dado nada se lee como el hueco que es, sin desaparecer
 * de la lista. Quitarla sería peor —el agente no puede echar de menos una vía
 * que nunca ha visto—, y pintarla con el mismo peso que las que sí pagan
 * llenaría la tarjeta de ceros con voz de dato.
 */
function FilaOrigen({
  etiqueta,
  importe,
}: {
  etiqueta: string;
  importe: { micros: string; texto: string };
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="text-rotulo text-texto-apoyo">{etiqueta}</span>
      <Importe texto={importe.texto} className="text-cuerpo" apagado={importe.micros === "0"} />
    </li>
  );
}

/**
 * `AAAA-MM` dicho como se dice un mes, en el idioma del agente.
 *
 * Se construye con el día 1 en UTC y se formatea en UTC: con la fecha local, un
 * agente al oeste de Greenwich vería «julio» donde el ledger apuntó agosto,
 * porque `new Date("2026-08-01")` es medianoche UTC y ahí ya es el 31.
 */
function mesLargo(mes: string, idioma: Idioma): string {
  return new Intl.DateTimeFormat(LOCALES[idioma], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${mes}-01T00:00:00Z`));
}
