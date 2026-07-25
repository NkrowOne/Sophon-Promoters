"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { cadenas, type Cadenas } from "@/lib/i18n";
import { esRtl, idiomaDesdeTelegram, IDIOMA_POR_DEFECTO, type Idioma } from "@/lib/idiomas";

/**
 * Puente con el cliente de Telegram.
 *
 * Resuelve tres problemas que rompen una Mini App en móvil real:
 *
 *  1. El tema puede cambiar CON LA APP ABIERTA. Si el modo claro/oscuro se
 *     calcula una sola vez al montar, el usuario que cambia a oscuro se queda
 *     con los colores claros sobre fondo oscuro. Nos suscribimos a `themeChanged`
 *     y volvemos a estampar el atributo y los parámetros del botón principal.
 *
 *  2. En Android el `MainButton` nativo puede quedar TAPADO por el teclado. Se
 *     expone `botonTapado` para que las pantallas con formulario rendericen un
 *     botón de reserva en el DOM: sin eso, la única acción de la pantalla
 *     desaparece justo cuando el usuario está escribiendo.
 *
 *  3. La háptica se mantiene con `prefers-reduced-motion`: no es movimiento
 *     visual, y para quien ha desactivado animaciones es el único canal de
 *     confirmación que le queda.
 */

interface BotonPrincipal {
  setText: (t: string) => void;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  showProgress: (dejarActivo?: boolean) => void;
  hideProgress: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
  setParams: (p: Record<string, unknown>) => void;
}

interface UsuarioInicial {
  id?: number;
  language_code?: string;
}

interface WebApp {
  initData: string;
  /** Datos SIN verificar: solo se usan para elegir idioma, nunca para autorizar. */
  initDataUnsafe?: { user?: UsuarioInicial };
  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;
  viewportStableHeight?: number;
  MainButton: BotonPrincipal;
  HapticFeedback?: {
    impactOccurred: (estilo: string) => void;
    notificationOccurred: (tipo: string) => void;
    selectionChanged: () => void;
  };
  ready: () => void;
  expand: () => void;
  onEvent: (evento: string, cb: () => void) => void;
  offEvent: (evento: string, cb: () => void) => void;
  showPopup?: (p: unknown, cb?: (id: string) => void) => void;
}

interface Contexto {
  webApp: WebApp | null;
  listo: boolean;
  oscuro: boolean;
  /** El MainButton nativo puede no ser visible; entonces hay que dibujar uno propio. */
  botonTapado: boolean;
  haptica: (tipo: "exito" | "error" | "toque" | "seleccion") => void;
  idioma: Idioma;
  /** Cadenas ya resueltas al idioma del agente. */
  t: Cadenas;
}

const ContextoTelegram = createContext<Contexto>({
  webApp: null,
  listo: false,
  oscuro: false,
  botonTapado: false,
  haptica: () => {},
  idioma: IDIOMA_POR_DEFECTO,
  t: cadenas(IDIOMA_POR_DEFECTO),
});

export function useTelegram(): Contexto {
  return useContext(ContextoTelegram);
}

/**
 * Atajo para las pantallas, que casi siempre solo quieren las cadenas.
 *
 * Existe para que traducir una pantalla sea cambiar `es.` por `t.` y nada más:
 * si cada una tuviera que sacar el idioma del contexto y resolver el catálogo,
 * la traducción se habría quedado a medias en la primera que se olvidara.
 */
export function useCadenas(): Cadenas {
  return useContext(ContextoTelegram).t;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp };
  }
}

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [webApp, setWebApp] = useState<WebApp | null>(null);
  const [listo, setListo] = useState(false);
  const [oscuro, setOscuro] = useState(false);
  const [botonTapado, setBotonTapado] = useState(false);
  const [idioma, setIdioma] = useState<Idioma>(IDIOMA_POR_DEFECTO);

  const aplicarTema = useCallback((app: WebApp) => {
    const esOscuro = app.colorScheme === "dark";
    setOscuro(esOscuro);
    // El atributo alimenta los respaldos estáticos de globals.css, que son los
    // que sostienen la app cuando el WebView no soporta color-mix.
    document.documentElement.setAttribute("data-luz", esOscuro ? "oscuro" : "claro");

    for (const [clave, valor] of Object.entries(app.themeParams ?? {})) {
      document.documentElement.style.setProperty(`--tg-theme-${clave.replace(/_/g, "-")}`, valor);
    }
  }, []);

  useEffect(() => {
    const app = window.Telegram?.WebApp;
    if (!app) {
      // Fuera de Telegram (desarrollo o navegador suelto) la app sigue siendo
      // navegable: se degrada a los colores por defecto en vez de romperse.
      setListo(true);
      return;
    }

    app.ready();
    app.expand();
    aplicarTema(app);
    setWebApp(app);
    setListo(true);

    // El idioma sale de `initDataUnsafe`, que NO está verificado. Es correcto
    // aquí y solo aquí: elegir catálogo no autoriza nada, y esperar a que el
    // servidor validara la firma dejaría la primera pantalla en español para
    // alguien que no lo lee. Todo lo que decide permisos sigue saliendo del
    // `initData` firmado.
    const elegido = idiomaDesdeTelegram(app.initDataUnsafe?.user?.language_code);
    setIdioma(elegido);
    document.documentElement.lang = elegido;
    // El árabe invierte el layout entero, raíl del Testigo incluido.
    document.documentElement.dir = esRtl(elegido) ? "rtl" : "ltr";

    const alCambiarTema = () => aplicarTema(app);
    const alCambiarViewport = () => {
      // Heurística: si el alto estable se reduce mucho, el teclado está abierto
      // y el botón nativo puede haber quedado debajo.
      const alto = app.viewportStableHeight ?? window.innerHeight;
      setBotonTapado(alto < window.innerHeight * 0.75);
    };

    app.onEvent("themeChanged", alCambiarTema);
    app.onEvent("viewportChanged", alCambiarViewport);
    alCambiarViewport();

    return () => {
      app.offEvent("themeChanged", alCambiarTema);
      app.offEvent("viewportChanged", alCambiarViewport);
    };
  }, [aplicarTema]);

  const haptica = useCallback(
    (tipo: "exito" | "error" | "toque" | "seleccion") => {
      const h = webApp?.HapticFeedback;
      if (!h) return;
      if (tipo === "exito") h.notificationOccurred("success");
      else if (tipo === "error") h.notificationOccurred("error");
      else if (tipo === "seleccion") h.selectionChanged();
      else h.impactOccurred("light");
    },
    [webApp],
  );

  const valor = useMemo(
    () => ({ webApp, listo, oscuro, botonTapado, haptica, idioma, t: cadenas(idioma) }),
    [webApp, listo, oscuro, botonTapado, haptica, idioma],
  );

  return <ContextoTelegram.Provider value={valor}>{children}</ContextoTelegram.Provider>;
}

/**
 * Botón de acción principal.
 *
 * Usa el MainButton nativo cuando está disponible y visible, y cae a un botón
 * en el DOM en cuanto detecta que puede estar tapado. Nunca deja la pantalla
 * sin su acción.
 */
export function BotonPrincipalAccion({
  texto,
  onClick,
  activo = true,
  cargando = false,
}: {
  texto: string;
  onClick: () => void;
  activo?: boolean;
  cargando?: boolean;
}) {
  const { webApp, botonTapado } = useTelegram();

  useEffect(() => {
    const boton = webApp?.MainButton;
    if (!boton || botonTapado) return;

    boton.setText(texto);
    boton.show();
    if (activo && !cargando) boton.enable();
    else boton.disable();
    if (cargando) boton.showProgress(false);
    else boton.hideProgress();

    boton.onClick(onClick);
    return () => {
      boton.offClick(onClick);
      boton.hide();
    };
  }, [webApp, botonTapado, texto, onClick, activo, cargando]);

  // Reserva en el DOM: siempre presente fuera de Telegram y cuando el nativo
  // pueda estar tapado por el teclado.
  if (webApp && !botonTapado) return null;

  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-borde bg-fondo px-4 pb-[env(safe-area-inset-bottom)] pt-3">
      <button
        type="button"
        onClick={onClick}
        disabled={!activo || cargando}
        className="w-full rounded-pieza bg-tinta py-3.5 text-cuerpo font-semibold text-fondo transition-opacity duration-150 disabled:opacity-40"
      >
        {cargando ? "…" : texto}
      </button>
    </div>
  );
}
