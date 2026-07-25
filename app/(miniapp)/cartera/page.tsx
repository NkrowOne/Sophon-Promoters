"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Escalera, type Cartera } from "@/components/Escalera";
import { Importe } from "@/components/Importe";
import { Aviso, Cargando, Pantalla } from "@/components/Pantalla";
import { BotonPrincipalAccion, useCadenas, useTelegram } from "@/components/TelegramProvider";
import { api, ErrorApi, nuevaIdempotencia } from "@/lib/api/cliente";
import { formatearMicros, microsACadena } from "@/lib/devengo/dinero";
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

interface Respuesta {
  cartera: Cartera;
  minimo: { micros: string; texto: string };
  historial: Solicitud[];
}

export default function CarteraPagina() {
  const { haptica } = useTelegram();
  const t = useCadenas();
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [importe, setImporte] = useState("");
  const [red, setRed] = useState<IdRed>("TRC20");
  const [wallet, setWallet] = useState("");
  const [enviando, setEnviando] = useState(false);
  const idempotencia = useRef(nuevaIdempotencia());

  const cargar = useCallback(() => {
    setError(null);
    api
      .get<Respuesta>("/api/retiro")
      .then(setDatos)
      .catch((e) =>
        setError(e instanceof ErrorApi ? e : new ErrorApi(t.algoHaFallado, 0, null)),
      );
  }, []);

  useEffect(cargar, [cargar]);

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
      setImporte("");
      setWallet("");
      // Clave nueva: la siguiente solicitud es otra intención, no un reintento
      // de esta.
      idempotencia.current = nuevaIdempotencia();
      cargar();
    } catch (e) {
      haptica("error");
      setError(e instanceof ErrorApi ? e : new ErrorApi(t.algoHaFallado, 0, null));
    } finally {
      setEnviando(false);
    }
  }, [importeValido, walletValida, enviando, importeMicros, red, wallet, haptica, cargar]);

  if (error && !datos) {
    return (
      <Pantalla titulo={t.cartera} volverA="/">
        <Aviso error={error.message} apoyo={error.apoyo} onReintentar={cargar} />
      </Pantalla>
    );
  }
  if (!datos) {
    return (
      <Pantalla titulo={t.cartera} volverA="/">
        <Cargando />
      </Pantalla>
    );
  }

  return (
    <Pantalla titulo={t.cartera} volverA="/">
      <Escalera cartera={datos.cartera} etiquetas={t} />

      {/* Una sola línea aquí: la que explica por qué disponible < devengado, que
          es la pregunta que nace al mirar la escalera. Lo que tarda el
          superadmin se dice junto al botón de pedir, que es cuando importa. */}
      <p className="mt-3 text-apoyo text-texto-apoyo">{t.soloConsolidado}</p>

      {viva ? (
        <section className="mt-8 border-s-2 border-vivo ps-3" aria-label={t.solicitudEnCurso}>
          <p className="text-rotulo text-texto-apoyo">{t.solicitudEnCurso}</p>
          <p className="mt-1.5">
            <Importe texto={viva.importe.texto} className="text-cifra" />
          </p>
          <p className="mt-1 text-apoyo text-texto-apoyo">
            {estadoLegible(viva.estado, t)} · {viva.red} ·{" "}
            <span className="cifra">{viva.wallet}</span>
          </p>
          <p className="mt-2 text-apoyo text-texto-apoyo">
            {t.pedidaEl(formatoFecha(viva.solicitadoEn))} {t.soloUnaALaVez}
          </p>
        </section>
      ) : (
        <section className="mt-8" aria-label={t.solicitarRetiro}>
          <p className="text-rotulo mb-3 border-b border-borde pb-2 text-texto-apoyo">
            {t.solicitarRetiro.toUpperCase()}
          </p>

          <label htmlFor="importe" className="text-rotulo block text-texto-apoyo">
            {t.cuanto}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="importe"
              value={importe}
              onChange={(e) => setImporte(e.target.value.replace(/[^\d.,]/g, ""))}
              inputMode="decimal"
              placeholder={paraEscribir(minimoMicros)}
              className="cifra min-w-0 flex-1 rounded-pieza border border-borde bg-superficie px-3.5 py-3.5 text-cuerpo outline-none focus:border-tinta"
            />
            {/* «Todo» evita el error más común de este formulario: teclear el
                disponible a mano y equivocarse en un céntimo, que el servidor
                rechaza por pasarse del saldo. */}
            <button
              type="button"
              onClick={() => setImporte(paraEscribir(disponibleMicros))}
              disabled={disponibleMicros < minimoMicros}
              className="shrink-0 rounded-pieza border border-borde px-4 text-apoyo font-medium disabled:opacity-40"
            >
              {t.todo}
            </button>
          </div>
          <p className="mt-2 text-apoyo text-texto-apoyo">
            {t.disponibleYMinimo} <Importe texto={datos.cartera.disponible.texto} /> ·{" "}
            {t.minimo} <Importe texto={datos.minimo.texto} />
          </p>
          {importeMicros !== null && importeMicros > disponibleMicros && (
            <p className="mt-1 text-apoyo text-vivo">
              {t.tePasasEn(formatearMicros(importeMicros - disponibleMicros))}
            </p>
          )}
          {importeMicros !== null &&
            importeMicros < minimoMicros &&
            importeMicros > 0n && (
              <p className="mt-1 text-apoyo text-vivo">
                {t.teFaltanParaElMinimo(formatearMicros(minimoMicros - importeMicros))}
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
                  className={[
                    "rounded-pieza py-2.5 text-apoyo font-medium",
                    "transition-transform duration-150 ease-sonda active:scale-[0.98]",
                    red === r.id ? "bg-tinta text-fondo" : "border border-borde",
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
              className="cifra mt-2 w-full break-all rounded-pieza border border-borde bg-superficie px-3.5 py-3.5 text-apoyo outline-none focus:border-tinta"
            />
            <p
              className={`mt-2 text-apoyo ${
                wallet && !walletValida ? "text-vivo" : "text-texto-apoyo"
              }`}
            >
              {wallet && !walletValida
                ? t.direccionMalFormada(definicionRed.nombre, definicionRed.pista(t))
                : t.usdtEn(definicionRed.nombre, definicionRed.pista(t))}
            </p>
          </div>

          {/* Lo que tarda, junto al botón: es donde la espera se convierte en
              una expectativa concreta y no en una duda. */}
          <p className="mt-6 border-s-2 border-borde ps-3 text-apoyo text-texto-apoyo">
            {t.revisionManual}
          </p>

          {error && (
            <div className="mt-5">
              <Aviso error={error.message} apoyo={error.apoyo} />
            </div>
          )}

          <BotonPrincipalAccion
            texto={
              importeValido ? t.pedirImporte(formatearMicros(importeMicros!)) : t.pedirRetiro
            }
            onClick={solicitar}
            activo={importeValido && walletValida}
            cargando={enviando}
          />
        </section>
      )}

      {/* Historial SIN la solicitud viva: ya está arriba, con más detalle. Que
          apareciera dos veces en la misma pantalla hacía dudar de si eran dos
          solicitudes distintas, que es justo la confusión que este flujo —una
          sola viva a la vez— tiene que evitar. */}
      <section className="mt-10" aria-label="Solicitudes anteriores">
        <p className="text-rotulo mb-1 border-b border-borde pb-2 text-texto-apoyo">
          {t.solicitudesAnteriores}
        </p>
        {resueltas.length === 0 ? (
          <p className="py-4 text-apoyo text-texto-apoyo">{t.sinMovimientos}</p>
        ) : (
          <ul className="divide-y divide-borde" role="list">
            {resueltas.map((h) => (
              <li key={h.id} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <Importe texto={h.importe.texto} className="text-cuerpo" />
                  <span
                    className={`text-apoyo ${
                      h.estado === "RECHAZADO" ? "text-vivo" : "text-texto-apoyo"
                    }`}
                  >
                    {estadoLegible(h.estado, t)}
                  </span>
                </div>
                <p className="mt-0.5 text-apoyo text-texto-apoyo">
                  {formatoFecha(h.solicitadoEn)} · {h.red} ·{" "}
                  <span className="cifra">{h.wallet}</span>
                </p>
                {/* Un rechazo sin motivo obliga a preguntar por Telegram; con el
                    motivo, el agente corrige y vuelve a pedir. */}
                {h.motivo && <p className="mt-1 text-apoyo text-vivo">{h.motivo}</p>}
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
      </section>
    </Pantalla>
  );
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
