"use client";

import { useCallback, useEffect, useState } from "react";

import { Pantalla } from "@/components/Pantalla";
import { api, ErrorApi } from "@/lib/api/cliente";
import { useTelegram } from "@/components/TelegramProvider";

/**
 * El puente entre la Mini App y el panel de Operador.
 *
 * ── QUÉ HACE, EN UNA LÍNEA ──
 *
 * Cambia la firma de Telegram por una sesión del panel y salta a `/admin`. El
 * Operador no ve esta pantalla más que un instante.
 *
 * ── POR QUÉ ES UNA PÁGINA Y NO UN BOTÓN QUE LLAMA A LA API ──
 *
 * Porque hay DOS puertas y las dos tienen que llegar al mismo sitio: la fila del
 * panel en la portada de la Mini App, y el botón `web_app` que manda el bot con
 * `/panel`. La segunda no puede ejecutar código de la portada —abre una URL— así
 * que el puente tiene que ser una URL. Con un botón en la portada, el Operador
 * que no es agente no tendría por dónde entrar: la portada le exige una sesión de
 * agente que él no tiene.
 *
 * ── POR QUÉ `location.assign` Y NO `router.push` ──
 *
 * `/admin` vive en OTRO grupo de rutas, con su propia raíz `<html>`, su propia
 * hoja de estilos y sin nada de Telegram. Una navegación del enrutador
 * intentaría montarlo dentro del árbol de la Mini App y no cargaría ni su tema ni
 * su tipografía. Aquí se quiere justo lo contrario de lo habitual: un documento
 * nuevo. Y de paso garantiza que la cookie recién puesta viaje en la petición.
 *
 * ── Y POR QUÉ ESTÁ EN ESPAÑOL A PELO ──
 *
 * El resto de la Mini App se traduce a cinco idiomas porque la leen los agentes.
 * Esta pantalla la ve UNA persona, la misma que el panel al que lleva, y el panel
 * ya es español y solo español. Meter cuatro traducciones en el catálogo para
 * cadenas que nadie va a leer nunca es trabajo que además hay que mantener.
 */

export default function PuentePanel() {
  const { listo } = useTelegram();
  const [error, setError] = useState<{ titulo: string; apoyo: string } | null>(null);

  const entrar = useCallback(async () => {
    setError(null);
    try {
      await api.post<{ ok: boolean }>("/api/operador", {});
      // Documento nuevo, no navegación del enrutador. Ver la cabecera.
      window.location.assign("/admin");
    } catch (e) {
      const err = e instanceof ErrorApi ? e : null;
      if (err?.estado === 403) {
        setError({
          titulo: "Esta pantalla es solo del Operador",
          apoyo: "Tu cuenta de Telegram no es la que administra el programa.",
        });
        return;
      }
      if (err?.estado === 401) {
        /*
         * Sin firma de Telegram. Casi siempre es la URL abierta a mano en un
         * navegador, que es la puerta equivocada y no un fallo: se dice qué
         * hacer en vez de enseñar un error.
         */
        setError({
          titulo: "Ábrelo desde Telegram",
          apoyo: "Esta pantalla necesita que la lance Telegram. Escribe /panel en el chat del bot.",
        });
        return;
      }
      setError({
        titulo: "No se ha podido abrir el panel",
        apoyo: "Puede ser un corte de red. Vuelve a intentarlo.",
      });
    }
  }, []);

  // En cuanto Telegram ha entregado el `initData`, y no antes: sin él la
  // petición sale sin firma y el servidor contesta un 401 que no significa nada.
  useEffect(() => {
    if (listo) void entrar();
  }, [listo, entrar]);

  return (
    <Pantalla titulo={error ? error.titulo : "Abriendo el panel"}>
      <p className="text-apoyo text-texto-apoyo">
        {error ? error.apoyo : "Un momento."}
      </p>
      {error && (
        <button type="button" className="chapa pulsable mt-6 text-cuerpo" onClick={() => void entrar()}>
          Reintentar
        </button>
      )}
    </Pantalla>
  );
}
