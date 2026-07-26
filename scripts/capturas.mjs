/**
 * Capturas de las pantallas, con la API simulada.
 *
 * La disciplina del proyecto es que **ninguna pantalla se da por buena sin
 * mirarla**: todos los defectos de diseño que se han encontrado aquí —el T3 a
 * 2,19:1, las teselas de distinto alto, el plazo truncado, el verde oliva del
 * modo oscuro— salieron de mirar o de medir, y ninguno de leer el código.
 *
 * No hace falta base de datos ni sesión: se interceptan las rutas de la API con
 * `page.route()` y se sirven respuestas fijas. El guion de `telegram.org` se
 * sustituye por uno vacío, porque en un navegador de escritorio no existe el
 * WebView y la app tiene que sostenerse igual —que es además como se comprueba
 * que los respaldos de tema funcionan—.
 *
 *   node scripts/capturas.mjs <puerto> <carpeta>
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const PUERTO = process.argv[2] ?? "3100";
const SALIDA = process.argv[3] ?? "capturas";
const BASE = `http://127.0.0.1:${PUERTO}`;

const hoy = new Date("2026-07-26T00:00:00Z");
const dia = (atras) =>
  new Date(hoy.getTime() - atras * 86_400_000).toISOString().slice(0, 10);

/** Una serie con forma: días buenos, días flojos y un par en blanco. */
const serie = Array.from({ length: 60 }, (_, i) => {
  const registros = [0, 3, 12, 7, 21, 0, 9, 14, 5, 18][i % 10] + (i % 7 === 0 ? 11 : 0);
  const micros = BigInt(registros) * 30_000n;
  return {
    fecha: dia(59 - i),
    importeMicros: micros.toString(),
    importe: `${(Number(micros) / 1e6).toFixed(2).replace(".", ",")} $`,
    registros,
    registrosT1: Math.round(registros * 0.2),
    registrosT2: Math.round(registros * 0.35),
    registrosT3: registros - Math.round(registros * 0.2) - Math.round(registros * 0.35),
    usuariosPago: i % 9 === 0 ? 1 : 0,
    provisional: i > 57,
  };
});

const ficha = {
  email: "esgabrielcabrera@gmail.com",
  id: "esgabrielcabrera@gmail.com",
  estado: "ACTIVO",
  origen: "ACTIVADO",
  activadoEn: dia(210),
  devengaDesde: null,
  pro: {
    vigenteHasta: dia(-198),
    concedidoEn: dia(167),
    diasRestantes: 198,
    diasConcedidos: 365,
  },
  proRenovable: false,
  dias: 60,
  serie,
  totales: {
    ganado: { micros: "247880000", texto: "247,88 $" },
    registros: 604,
    registrosT1: 121,
    registrosT2: 211,
    registrosT3: 272,
    usuariosPago: 7,
  },
};

const enlaces = {
  dias: 60,
  enlaces: [
    {
      enlace: "https://newsophon.com/r/gVn2Kq8sT4",
      registros: 318,
      usuariosPago: 5,
      pagado: { micros: "41200000", texto: "41,20 $" },
    },
    {
      enlace: "https://newsophon.com/r/pW7dLm1xZ9?src=telegram",
      registros: 214,
      usuariosPago: 2,
      pagado: { micros: "16750000", texto: "16,75 $" },
    },
    {
      enlace: "https://newsophon.com/r/aH4bRj6cY0",
      registros: 72,
      usuariosPago: 0,
      pagado: { micros: "0", texto: "0,00 $" },
    },
  ],
};

/*
 * La forma la manda la RUTA, no la imaginación.
 *
 * La primera versión de este simulacro inventó `{devengado, registros, tiers,
 * serie}` y la portada respondió con su estado vacío, porque `/api/agente/
 * resumen` devuelve `{dias, webmasters, cartera}` y ninguno de esos campos
 * existía. Una captura contra un simulacro que no case con el servidor no
 * enseña la pantalla: enseña otra.
 */
const resumen = {
  dias: serie
    .slice(30)
    .map((d) => ({ ...d, concesiones: 0 }))
    .reverse(),
  webmasters: 6,
  cartera: {
    devengado: { micros: "128440000", texto: "128,44 $" },
    disponible: { micros: "96200000", texto: "96,20 $" },
    solicitado: { micros: "0", texto: "0,00 $" },
    pagado: { micros: "32240000", texto: "32,24 $" },
  },
};

const RUTAS = [
  [/\/api\/agente\/webmaster\/[^/]+\/enlaces/, enlaces],
  [/\/api\/agente\/webmaster\/[^/]+$/, ficha],
  [/\/api\/agente\/resumen/, resumen],
];

const PANTALLAS = [
  ["inicio", "/"],
  ["ficha", `/red/${encodeURIComponent(ficha.email)}`],
  // La primera pantalla, y la única que lleva el isotipo: es donde el agente
  // todavía no sabe en qué aplicación está.
  ["alta", "/alta"],
];

await mkdir(SALIDA, { recursive: true });

/*
 * El Chromium del entorno, si lo hay.
 *
 * Playwright busca el navegador por número de build exacto, así que una versión
 * del paquete que no case con la del navegador ya instalado manda a
 * `playwright install` a bajarse cientos de megas para pintar dos PNG.
 * `PLAYWRIGHT_CHROMIUM` deja apuntar al que ya está.
 */
const navegador = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM }
    : {},
);

for (const [nombre, luz] of [
  ["claro", "light"],
  ["oscuro", "dark"],
]) {
  const ctx = await navegador.newContext({
    viewport: { width: 390, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: luz,
  });

  // El guion de Telegram no existe fuera del WebView: se sirve vacío para que
  // no cuelgue el `beforeInteractive`.
  await ctx.route("https://telegram.org/**", (r) =>
    r.fulfill({ status: 200, contentType: "application/javascript", body: "" }),
  );

  for (const [patron, cuerpo] of RUTAS) {
    await ctx.route(patron, (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(cuerpo) }),
    );
  }

  const pagina = await ctx.newPage();

  /*
   * Un `window.Telegram.WebApp` de mentira, y no un `data-luz` puesto a mano.
   *
   * Forzar el atributo daba capturas idénticas en claro y en oscuro, y el
   * motivo es que la app NO lee la media query del sistema: lee
   * `WebApp.colorScheme` en el guion `beforeInteractive` y vuelve a leerlo en
   * `TelegramProvider`. Sin objeto de Telegram se queda en el `data-luz="claro"`
   * que trae el HTML del servidor, así que el atributo se reescribía y el
   * arranque de la app lo pisaba otra vez.
   *
   * Simulando el objeto se ejercita el camino real —el mismo que corre dentro
   * de Telegram—, que es lo único que sirve para dar por buena una captura.
   */
  await pagina.addInitScript((modo) => {
    const noOp = () => {};
    window.Telegram = {
      WebApp: {
        initData: "",
        initDataUnsafe: {},
        colorScheme: modo === "oscuro" ? "dark" : "light",
        themeParams: {},
        ready: noOp,
        expand: noOp,
        onEvent: noOp,
        offEvent: noOp,
        setBackgroundColor: noOp,
        setHeaderColor: noOp,
        /*
         * El MainButton necesita su interfaz COMPLETA, no la mitad.
         *
         * La primera versión de este simulacro se dejó `setText`, `enable` y
         * `disable`, y `/alta` —la única pantalla capturada que usa
         * `BotonPrincipalAccion`— reventaba contra su frontera de error y salía
         * fotografiada como «Algo se ha roto». Las otras dos pantallas no lo
         * tocan, así que el fallo parecía de la pantalla y era del simulacro.
         */
        MainButton: {
          setText: noOp,
          setParams: noOp,
          show: noOp,
          hide: noOp,
          enable: noOp,
          disable: noOp,
          showProgress: noOp,
          hideProgress: noOp,
          onClick: noOp,
          offClick: noOp,
          isVisible: false,
          isActive: true,
        },
        BackButton: { show: noOp, hide: noOp, onClick: noOp, offClick: noOp },
        HapticFeedback: { impactOccurred: noOp, notificationOccurred: noOp },
      },
    };
  }, nombre);

  for (const [titulo, ruta] of PANTALLAS) {
    await pagina.goto(`${BASE}${ruta}`, { waitUntil: "networkidle" });
    // Que terminen las animaciones de entrada antes de disparar.
    await pagina.waitForTimeout(900);
    const destino = `${SALIDA}/${titulo}-${nombre}.png`;
    await pagina.screenshot({ path: destino, fullPage: true });
    console.log(destino);
  }

  await ctx.close();
}

await navegador.close();
