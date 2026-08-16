"use client";

import { useEffect, useState } from "react";

import { Banda, Pantalla } from "@/components/Pantalla";
import { useTelegram } from "@/components/TelegramProvider";
import { api } from "@/lib/api/cliente";

/**
 * Por qué esta instalación no verifica el acceso.
 *
 * Se abre desde el bot con `/diagnostico`, que es comando del Operador. Tiene
 * que abrirse DESDE EL BOT: la mitad de la respuesta es si Telegram entrega el
 * `initData`, y eso solo pasa dentro de Telegram.
 *
 * En español y sin traducir, como el resto de lo del Operador: lo usa una sola
 * persona y solo cuando algo va mal.
 *
 * Mira las dos mitades del circuito, que es lo que ninguna de las dos por
 * separado podía decir:
 *
 *  · **Aquí (el navegador).** ¿Existe `window.Telegram.WebApp`? ¿Trae
 *    `initData` y de qué tamaño? Si esto falla, el problema es que el guion de
 *    Telegram no ha cargado o la app no se ha abierto desde el bot, y no hay
 *    nada que tocar en el servidor.
 *  · **Allí (el servidor).** Con esa misma cadena, ¿qué dice `validarInitData`?
 *    ¿Qué bot cree el servidor que es? ¿Cuánto se llevan los relojes?
 *
 * No enseña el `initData` ni ningún valor suyo: lleva el nombre y el id de
 * Telegram de quien abre la app. Nombres de campo y tamaños, que es lo que
 * distingue una cadena buena de una recortada.
 */

interface Diagnostico {
  veredicto: string;
  cabecera: { presente: boolean; longitud: number; campos: string[] };
  bot: { id: string | null; pega: string | null };
  reloj: { servidor: string; initData: string | null; desfaseSegundos: number | null };
}

export default function DiagnosticoPagina() {
  const { webApp } = useTelegram();
  const [servidor, setServidor] = useState<Diagnostico | null>(null);
  const [falloRed, setFalloRed] = useState(false);

  // Se lee de `window` y no del contexto: lo que hay que comprobar es
  // exactamente lo que manda `lib/api/cliente.ts` en la cabecera.
  const initData = typeof window === "undefined" ? "" : (window.Telegram?.WebApp?.initData ?? "");

  useEffect(() => {
    api
      .get<Diagnostico>("/api/diagnostico")
      .then(setServidor)
      .catch(() => setFalloRed(true));
  }, []);

  const conclusion = concluir(webApp !== null, initData, servidor, falloRed);

  return (
    <Pantalla titulo="Diagnóstico">
      <Banda orden={0} tono={0} className="pb-6">
        <p className="text-rotulo text-texto-apoyo">CONCLUSIÓN</p>
        <p className="mt-2 text-cuerpo">{conclusion}</p>
      </Banda>

      <Banda orden={1} tono={1} className="py-6">
        <p className="text-rotulo text-texto-apoyo">AQUÍ (TELEGRAM)</p>
        <Dato que="Cliente de Telegram" vale={webApp ? "sí" : "NO"} />
        <Dato que="Versión" vale={webApp?.version ?? "—"} />
        <Dato que="Plataforma" vale={webApp?.platform ?? "—"} />
        <Dato que="initData" vale={initData ? `${initData.length} caracteres` : "VACÍO"} />
      </Banda>

      <Banda orden={2} tono={2} className="py-6">
        <p className="text-rotulo text-texto-apoyo">ALLÍ (SERVIDOR)</p>
        {falloRed ? (
          <p className="mt-2 text-cuerpo">No responde. Mira si el contenedor está en pie.</p>
        ) : !servidor ? (
          <p className="mt-2 text-apoyo text-texto-apoyo">Preguntando…</p>
        ) : (
          <>
            <Dato que="Veredicto" vale={servidor.veredicto} />
            <Dato que="Bot configurado" vale={servidor.bot.id ?? "sin forma reconocible"} />
            <Dato que="Cabecera recibida" vale={`${servidor.cabecera.longitud} caracteres`} />
            <Dato que="Campos" vale={servidor.cabecera.campos.join(", ") || "—"} />
            <Dato
              que="Desfase de reloj"
              vale={
                servidor.reloj.desfaseSegundos === null
                  ? "—"
                  : `${servidor.reloj.desfaseSegundos} s`
              }
            />
            {servidor.bot.pega && <Dato que="Aviso del token" vale={servidor.bot.pega} />}
          </>
        )}
      </Banda>
    </Pantalla>
  );
}

function Dato({ que, vale }: { que: string; vale: string }) {
  return (
    <div className="mt-3 flex items-baseline justify-between gap-4">
      <span className="text-apoyo text-texto-apoyo">{que}</span>
      {/* `break-all`: la lista de campos y algunos motivos son largos y sin
          espacios donde partir. */}
      <span className="cifra break-all text-end text-apoyo">{vale}</span>
    </div>
  );
}

/**
 * La frase que hay que leer, y solo esa.
 *
 * El orden importa: se contesta por la primera cosa que está mal empezando por
 * el principio del circuito, porque arreglar la segunda sin la primera no sirve
 * de nada.
 */
function concluir(
  hayCliente: boolean,
  initData: string,
  servidor: Diagnostico | null,
  falloRed: boolean,
): string {
  if (falloRed) return "El servidor no contesta.";
  if (!hayCliente) {
    return "Esto no se ha abierto dentro de Telegram, o el guion telegram-web-app.js no ha cargado. Ábrelo con el botón del bot.";
  }
  if (!initData) {
    return "Telegram no ha entregado el initData. Pasa cuando la app se abre por un enlace normal en vez de por un botón de Mini App.";
  }
  if (!servidor) return "Preguntando al servidor…";
  if (servidor.cabecera.longitud === 0) {
    return "El navegador tiene el initData pero al servidor le llega vacío: algo por el camino borra la cabecera x-telegram-init-data.";
  }
  if (servidor.veredicto === "ok") {
    return "Todo correcto: la firma se verifica. Si aun así ves «Telegram no ha verificado tu acceso», es de la sesión, no de la firma.";
  }
  if (servidor.veredicto.includes("firma")) {
    return `La firma no cuadra. El servidor está usando el token del bot ${servidor.bot.id ?? "?"}; comprueba en BotFather que ese sea el bot desde el que has abierto la app.`;
  }
  if (servidor.veredicto.includes("caducado") || servidor.veredicto.includes("futuro")) {
    return `Relojes desalineados: ${servidor.reloj.desfaseSegundos} s entre el servidor y la firma.`;
  }
  return servidor.veredicto;
}
