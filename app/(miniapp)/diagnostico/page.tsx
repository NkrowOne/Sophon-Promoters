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
 *
 * ── CÓMO SE VE ──
 *
 * La conclusión va en TARJETA con sombra y las dos mitades del circuito en
 * tarjeta de BORDE. Es la distinción del sistema —sombra para lo que se levanta
 * del papel, filete para lo denso, porque once sombras seguidas son ruido— y
 * aquí además dice la jerarquía de la pantalla con relieve en vez de con
 * tamaño: arriba la frase que hay que leer, debajo las pruebas en las que se
 * apoya.
 *
 * Las píldoras marcan **solo los tres pasos binarios del circuito** —¿hay
 * cliente?, ¿trae `initData`?, ¿llega la cabecera?—, que es lo que el Operador
 * escanea antes de leer una sola palabra. El veredicto no lleva ninguna: es una
 * frase del servidor, de largo imprevisible, y una cápsula no parte líneas; y
 * ya está contado arriba. Teñir las once filas convertiría esto en el panel de
 * control genérico del que huye el resto de la aplicación.
 */

interface Diagnostico {
  veredicto: string;
  variante: string | null;
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
      {/* La respuesta, y en el único objeto con sombra de la pantalla. Todo lo
          que hay debajo es la prueba de esta frase. */}
      <Banda orden={0} tono={0} className="pb-6">
        <div className="tarjeta">
          <p className="text-rotulo text-texto-apoyo">CONCLUSIÓN</p>
          <p className="mt-2 text-cuerpo">{conclusion}</p>
        </div>
      </Banda>

      {/* El rótulo se queda FUERA de la tarjeta: nombra la mitad del circuito,
          que es un trozo de la página, y meterlo dentro lo convertiría en un
          título de la tarjeta. El hueco entre filas lo pone el `gap` y no un
          margen por fila, para que la primera no empiece separada del canto. */}
      <Banda orden={1} tono={1} className="py-6">
        <p className="text-rotulo text-texto-apoyo">AQUÍ (TELEGRAM)</p>
        <div className="tarjeta-borde mt-3 flex flex-col gap-3">
          <Dato que="Cliente de Telegram" vale={webApp ? "sí" : "NO"} pasa={webApp !== null} />
          <Dato que="Versión" vale={webApp?.version ?? "—"} />
          <Dato que="Plataforma" vale={webApp?.platform ?? "—"} />
          <Dato
            que="initData"
            vale={initData ? `${initData.length} caracteres` : "VACÍO"}
            pasa={initData !== ""}
          />
        </div>
      </Banda>

      <Banda orden={2} tono={2} className="py-6">
        <p className="text-rotulo text-texto-apoyo">ALLÍ (SERVIDOR)</p>
        {/* Ni el fallo de red ni la espera van en tarjeta: no hay nada tabular
            que encuadrar, y una sola frase dentro de un filete se lee como un
            dato más en vez de como la ausencia de todos. */}
        {falloRed ? (
          <p className="mt-2 text-cuerpo">Sin respuesta. Comprueba que el contenedor esté en ejecución.</p>
        ) : !servidor ? (
          <p className="mt-2 text-apoyo text-texto-apoyo">Consultando…</p>
        ) : (
          <div className="tarjeta-borde mt-3 flex flex-col gap-3">
            <Dato que="Veredicto" vale={servidor.veredicto} />
            {servidor.variante && <Dato que="Forma del resumen" vale={servidor.variante} />}
            <Dato que="Bot configurado" vale={servidor.bot.id ?? "sin forma reconocible"} />
            <Dato
              que="Cabecera recibida"
              vale={`${servidor.cabecera.longitud} caracteres`}
              pasa={servidor.cabecera.longitud > 0}
            />
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
          </div>
        )}
      </Banda>
    </Pantalla>
  );
}

/**
 * Una fila del circuito.
 *
 * `pasa` solo lo llevan los tres eslabones que se contestan con sí o no. Ahí la
 * píldora hace un trabajo que el texto no puede hacer: dice de qué lado está el
 * corte sin que haya que leer la fila. En los demás el valor es una medida o
 * una frase, y una cápsula de color sobre una medida no significa nada.
 *
 * Se LEE y no se pulsa, que es toda la regla de la píldora: va al ancho de su
 * texto, dentro de una fila, y nunca al ancho de la tarjeta.
 */
function Dato({ que, vale, pasa }: { que: string; vale: string; pasa?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-apoyo text-texto-apoyo">{que}</span>
      {pasa === undefined ? (
        // `break-all`: la lista de campos y algunos motivos son largos y sin
        // espacios donde partir.
        <span className="cifra break-all text-end text-apoyo">{vale}</span>
      ) : (
        <span className={`pildora cifra ${pasa ? "pildora-exito" : "pildora-peligro"}`}>{vale}</span>
      )}
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
  if (falloRed) return "El servidor no responde.";
  if (!hayCliente) {
    return "La aplicación no se ha abierto dentro de Telegram, o el guion telegram-web-app.js no ha cargado. Ábrela con el botón del bot.";
  }
  if (!initData) {
    return "Telegram no ha entregado el initData. Ocurre cuando la aplicación se abre por un enlace en vez de por un botón de Mini App.";
  }
  if (!servidor) return "Consultando el servidor…";
  if (servidor.cabecera.longitud === 0) {
    return "El navegador tiene el initData pero al servidor llega vacío: algo en el trayecto elimina la cabecera x-telegram-init-data.";
  }
  if (servidor.veredicto === "ok") {
    return "Firma verificada correctamente. Si aun así aparece «Telegram no ha verificado tu acceso», el problema está en la sesión, no en la firma.";
  }
  if (servidor.veredicto.includes("firma")) {
    return `La firma no coincide. El servidor usa el token del bot ${servidor.bot.id ?? "?"}; comprueba en BotFather que sea el bot desde el que se ha abierto la aplicación.`;
  }
  if (servidor.veredicto.includes("caducado") || servidor.veredicto.includes("futuro")) {
    return `Relojes desalineados: ${servidor.reloj.desfaseSegundos} s de desfase entre el servidor y la firma.`;
  }
  return servidor.veredicto;
}
