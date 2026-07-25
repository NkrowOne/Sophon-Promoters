"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useTelegram } from "./TelegramProvider";

/**
 * Conecta el botón «atrás» NATIVO de Telegram con el historial de la app.
 *
 * Telegram dibuja su propia flecha en la cabecera de la Mini App, y hasta
 * ahora no hacía nada: la app nunca la registraba. El agente veía un botón de
 * volver del sistema que no volvía, que es peor que no tenerlo, y además la
 * flecha «‹» de la aplicación aparecía justo debajo de la del cliente.
 *
 * Se muestra en todas las pantallas menos en la portada, que es la raíz: allí
 * el atrás del sistema cierra la Mini App, que es lo correcto.
 *
 * Va montado una vez en el layout y no pantalla por pantalla, porque el estado
 * del botón es del cliente de Telegram —global y persistente entre rutas—: si
 * cada pantalla lo montara y desmontara, quedaría visible en la portada al
 * volver de cualquier otra.
 */
export function AtrasDeTelegram() {
  const { webApp } = useTelegram();
  const router = useRouter();
  const ruta = usePathname();

  useEffect(() => {
    const atras = webApp?.BackButton;
    if (!atras) return;

    const enRaiz = ruta === "/";
    if (enRaiz) {
      atras.hide();
      return;
    }

    const volver = () => router.back();
    atras.onClick(volver);
    atras.show();

    return () => {
      atras.offClick(volver);
      atras.hide();
    };
  }, [webApp, ruta, router]);

  return null;
}
