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
  hito: hitoDe(Number(process.env.CAPTURA_HITO ?? 720)),
};

/*
 * El progreso del bono, con los tres estados que hay que mirar.
 *
 * `CAPTURA_HITO` fija los registros del mes. El caso de 720 es el IMPORTANTE:
 * es lo que produce hoy el mayor webmaster real en un mes, o sea la barra que va
 * a ver todo el mundo mientras los umbrales sigan donde están.
 */
function hitoDe(registros) {
  const escalera = [
    { usuarios: 10_000, premio: { micros: "50000000", texto: "50,00 $" } },
    { usuarios: 20_000, premio: { micros: "100000000", texto: "100,00 $" } },
    { usuarios: 30_000, premio: { micros: "150000000", texto: "150,00 $" } },
  ];
  const alcanzados = escalera.filter((e) => registros >= e.usuarios);
  const siguiente = escalera.find((e) => registros < e.usuarios) ?? null;
  const ganado = alcanzados.at(-1)?.premio ?? { micros: "0", texto: "0,00 $" };

  // 26 de julio: 26 días corridos y 6 por delante. Los mismos que devuelve la
  // ruta, para que la captura enseñe la aritmética real y no una plausible.
  const transcurridos = 26;
  // Misma regla que `app/api/agente/resumen`: bajo diez, un decimal; a partir
  // de ahí, entero. Un «1346,2 al día» finge una precisión que no existe.
  const porDia = registros / transcurridos;
  const ritmo = porDia < 10 ? Math.round(porDia * 10) / 10 : Math.round(porDia);
  const diasParaElHito = siguiente
    ? Math.ceil((siguiente.usuarios - registros) / porDia)
    : null;

  return {
    registros,
    ganado,
    siguiente: siguiente
      ? {
          usuarios: siguiente.usuarios,
          faltan: siguiente.usuarios - registros,
          premio: siguiente.premio,
          /*
           * Lo que se gana DE MÁS, que es lo que pinta la tarjeta cuando ya hay
           * un nivel alcanzado. Faltaba, así que `CAPTURA_HITO=15000` —el caso
           * «ya has ganado 50 $ y vas a por los 100»— reventaba contra la
           * frontera de error y salía fotografiado como «Algo se ha roto». Con
           * el valor por defecto no se notaba: a 720 registros no hay nada
           * ganado todavía y esa rama no se pisa.
           */
          incremento: {
            micros: String(
              Number(siguiente.premio.micros) - Number(ganado.micros),
            ),
            texto: `${((Number(siguiente.premio.micros) - Number(ganado.micros)) / 1e6)
              .toFixed(2)
              .replace(".", ",")} $`,
          },
        }
      : null,
    escalones: escalera.map((e) => ({ ...e, alcanzado: registros >= e.usuarios })),
    ritmo,
    proyeccion: Math.round(porDia * 31),
    diasRestantes: 6,
    llegaEl: diasParaElHito !== null && diasParaElHito <= 6 ? "2026-07-30" : null,
    mesAnterior: Math.round(registros * 0.85),
    porWebmaster: [
      { webmasterId: "w1", email: "esgabrielcabrera@gmail.com", registros: Math.round(registros * 0.57) },
      { webmasterId: "w2", email: "negocios20233@gmail.com", registros: Math.round(registros * 0.28) },
      { webmasterId: "w3", email: "mediapartner.es@gmail.com", registros: Math.round(registros * 0.15) },
    ],
  };
}

/*
 * La CARTERA, que no se estaba mirando.
 *
 * Es la pantalla a la que se entra a cobrar, y hasta ahora no tenía captura: el
 * defecto que la obligó —«Bonos 0,00 $» sin un objetivo ni un avance al lado—
 * llevaba ahí desde que existe la pantalla y no lo vio nadie, porque nadie la
 * miraba.
 *
 * Los bonos van VACÍOS y el hito en curso a 720 registros a propósito: es el
 * caso del agente que todavía no ha cobrado ninguno, o sea el que enseña si la
 * pantalla sabe decir algo cuando no hay nada que contar del pasado.
 */
const retiro = {
  cartera: resumen.cartera,
  desglose: {
    registros: { micros: "104200000", texto: "104,20 $" },
    pro: { micros: "24240000", texto: "24,24 $" },
    bonos: { micros: "0", texto: "0,00 $" },
    ajustes: { micros: "0", texto: "0,00 $" },
  },
  bonos: [],
  minimo: { micros: "20000000", texto: "20,00 $" },
  hito: resumen.hito,
  historial: [
    {
      id: "r1",
      importe: { micros: "32240000", texto: "32,24 $" },
      red: "TRC20",
      wallet: "TQn9Y2…dwVVR93ct",
      estado: "PAGADO",
      solicitadoEn: `${dia(38)}T09:12:00.000Z`,
      resueltoEn: `${dia(36)}T11:40:00.000Z`,
      motivo: null,
      referenciaPago: "0x9f2c41ab77e3d5c8be1a04f6d29c7b3e5518aa20",
    },
  ],
};

const RUTAS = [
  [/\/api\/agente\/webmaster\/[^/]+\/enlaces/, enlaces],
  [/\/api\/agente\/webmaster\/[^/]+$/, ficha],
  [/\/api\/agente\/resumen/, resumen],
  [/\/api\/retiro/, retiro],
];

const PANTALLAS = [
  ["inicio", "/"],
  ["ficha", `/red/${encodeURIComponent(ficha.email)}`],
  // Donde se cobra, y donde ahora se ve el bono en curso.
  ["cartera", "/cartera"],
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
