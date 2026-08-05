/**
 * Genera el juego de iconos a partir de la geometría de la marca.
 *
 *     node scripts/iconos.mjs
 *
 * ── Por qué existe si ya había un SVG ──
 *
 * `public/icono.svg` cubría el favicon y ahí se acababa. La declaración decía
 * además `apple: "/icono.svg"`, y eso **no funciona**: Safari solo acepta PNG
 * en `apple-touch-icon`, así que un agente que añadía la Mini App a su pantalla
 * de inicio —que es exactamente lo que hace quien la usa a diario— se
 * encontraba con una captura de la página en lugar de la marca. El único sitio
 * donde el logotipo tenía que estar sí o sí era el único donde no estaba.
 *
 * ── Por qué se generan y no se dibujan a mano ──
 *
 * Los trazados son los mismos tres círculos de `components/Isotipo.tsx`, y esa
 * es toda la gracia: si la marca se retoca, se vuelve a lanzar esto y las siete
 * piezas se rehacen iguales. Un juego de PNG dibujado a mano se desincroniza a
 * la primera, y el síntoma —el icono de la pantalla de inicio con la marca
 * vieja— no lo ve nadie que trabaje en el repositorio.
 *
 * Se rasteriza con el Chromium que ya trae Playwright para las capturas, así
 * que no entra ninguna dependencia nueva. Los PNG resultantes SE VERSIONAN: la
 * imagen de producción no ejecuta este guion, y un icono que hay que generar en
 * el despliegue es un icono que un día no está.
 */

import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLICO = join(RAIZ, "public");

/** El campo y la tinta de la marca. Los mismos que `--campo` y `--campo-tinta`. */
const CAMPO = "#F9D027";
const TINTA = "#1A1206";
/** El espresso de la Placa, que es el otro color de la casa. */
const ESPRESSO = "#482304";

/**
 * Los tres trazos, en la retícula de 120 × 68,21 de `components/Isotipo.tsx`.
 *
 * Copiados literalmente de allí. Si divergen, divergen la marca de la interfaz
 * y la del icono, que es el fallo que este guion existe para no cometer.
 */
const ANCHO_MARCA = 120;
const ALTO_MARCA = 68.21;
const TRAZOS = `
  <circle cx="19.61" cy="46.57" r="13.56" stroke-width="12.10"/>
  <path d="M31.20 18.50A27.49 27.49 0 1 1 45.73 60.37" stroke-width="13.23"/>
  <path d="M97.90 31.68A14.25 14.25 0 1 1 91.13 57.21" stroke-width="12.12"/>
`;

/**
 * La marca centrada en un lienzo, ocupando la fracción de ancho que se pida.
 *
 * `proporcion` es lo que decide el aire, y cada destino quiere el suyo: en una
 * pestaña de 16 px la marca tiene que ir apretada para que se lea, y en un icono
 * enmascarable tiene que ir holgada para que el recorte circular de Android no
 * se coma un trazo.
 */
function lienzo({ ancho, alto, fondo, tinta, proporcion, radio = 0 }) {
  const anchoMarca = ancho * proporcion;
  const altoMarca = (anchoMarca * ALTO_MARCA) / ANCHO_MARCA;
  const escala = anchoMarca / ANCHO_MARCA;
  const x = (ancho - anchoMarca) / 2;
  const y = (alto - altoMarca) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
  ${fondo ? `<rect width="${ancho}" height="${alto}" rx="${radio}" fill="${fondo}"/>` : ""}
  <g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${escala.toFixed(4)})"
     fill="none" stroke="${tinta}" stroke-linecap="round">${TRAZOS}</g>
</svg>`;
}

/**
 * Las siete piezas y para qué es cada una.
 *
 * `radio` va en píxeles del propio lienzo, no en porcentaje: iOS enmascara por
 * su cuenta el `apple-touch-icon` —y le da igual lo que traiga dentro—, así que
 * ese va CUADRADO y a sangre. Redondearlo antes deja una orla del fondo de la
 * pantalla de inicio asomando por las esquinas.
 */
const PIEZAS = [
  {
    fichero: "apple-touch-icon.png",
    ancho: 180,
    alto: 180,
    fondo: CAMPO,
    tinta: TINTA,
    proporcion: 0.62,
    // Sin radio: la máscara la pone iOS. Ver arriba.
    radio: 0,
  },
  { fichero: "icono-192.png", ancho: 192, alto: 192, fondo: CAMPO, tinta: TINTA, proporcion: 0.62, radio: 42 },
  { fichero: "icono-512.png", ancho: 512, alto: 512, fondo: CAMPO, tinta: TINTA, proporcion: 0.62, radio: 112 },
  {
    // Enmascarable: Android recorta hasta un círculo inscrito, así que lo que
    // sobresalga de la zona segura —el 80 % central— se pierde. Con la marca al
    // 62 % los remates de los arcos caían justo en el filo del recorte.
    fichero: "icono-maskable-512.png",
    ancho: 512,
    alto: 512,
    fondo: CAMPO,
    tinta: TINTA,
    proporcion: 0.46,
    radio: 0,
  },
  { fichero: "icono-32.png", ancho: 32, alto: 32, fondo: CAMPO, tinta: TINTA, proporcion: 0.74, radio: 6 },
  { fichero: "icono-16.png", ancho: 16, alto: 16, fondo: CAMPO, tinta: TINTA, proporcion: 0.8, radio: 3 },
  {
    /*
     * La marca para el correo del código de acceso.
     *
     * Va en PNG y no en SVG porque Gmail y Outlook descartan el SVG sin
     * avisar, y se manda incrustada (`cid:`) en vez de enlazada: una imagen
     * remota en un correo de verificación la bloquea el cliente por defecto,
     * así que el único correo que el agente necesita reconocer como auténtico
     * llegaría sin lo único que lo identifica.
     *
     * A 2× del tamaño al que se pinta (144 → 72 CSS px), que es lo que pide una
     * pantalla de retina.
     */
    fichero: "marca-correo.png",
    ancho: 144,
    alto: 144,
    fondo: CAMPO,
    tinta: TINTA,
    proporcion: 0.62,
    radio: 32,
  },
  {
    /*
     * La previsualización del enlace: espresso con la marca en amarillo.
     *
     * SIN TEXTO, y no por ahorro. El título y la descripción los pone Telegram
     * desde las etiquetas Open Graph, en la tipografía del cliente y en el
     * idioma que corresponda; escribirlos también dentro de la imagen los
     * duplicaría en una sola lengua y con otra letra. La imagen aporta lo único
     * que el texto no puede: de quién es esto.
     */
    fichero: "og.png",
    ancho: 1200,
    alto: 630,
    fondo: ESPRESSO,
    tinta: CAMPO,
    proporcion: 0.34,
    radio: 0,
  },
];

/**
 * Empaqueta un PNG dentro de un contenedor .ico.
 *
 * El formato admite el PNG tal cual desde Windows Vista, así que no hay que
 * recodificar a BMP ni construir la máscara de transparencia de los .ico
 * clásicos: seis bytes de cabecera, dieciséis de entrada de directorio y el
 * PNG detrás.
 *
 * Hace falta porque los navegadores piden `/favicon.ico` a pelo, fuera de las
 * etiquetas del documento, y sin fichero eso es un 404 en cada carga. El SVG
 * sigue siendo el favicon bueno para todo lo moderno; esto es la red de abajo.
 */
function empaquetarIco(png, lado) {
  const cabecera = Buffer.alloc(6);
  cabecera.writeUInt16LE(0, 0); // reservado
  cabecera.writeUInt16LE(1, 2); // 1 = icono
  cabecera.writeUInt16LE(1, 4); // una sola imagen

  const entrada = Buffer.alloc(16);
  // 0 significa 256: el campo es de un byte y por eso el formato tope ahí.
  entrada.writeUInt8(lado >= 256 ? 0 : lado, 0);
  entrada.writeUInt8(lado >= 256 ? 0 : lado, 1);
  entrada.writeUInt8(0, 2); // colores de paleta: ninguna
  entrada.writeUInt8(0, 3); // reservado
  entrada.writeUInt16LE(1, 4); // planos
  entrada.writeUInt16LE(32, 6); // bits por píxel
  entrada.writeUInt32LE(png.length, 8);
  entrada.writeUInt32LE(6 + 16, 12); // desplazamiento del primer byte del PNG

  return Buffer.concat([cabecera, entrada, png]);
}

/**
 * El ejecutable de Chromium.
 *
 * En un entorno de trabajo con los navegadores ya instalados fuera del sitio
 * por defecto —el caso de este contenedor— Playwright no los encuentra solo.
 * `CHROMIUM_BIN` deja apuntarlo sin tocar el guion.
 */
function opcionesNavegador() {
  const ruta = process.env["CHROMIUM_BIN"];
  return ruta ? { executablePath: ruta } : {};
}

async function principal() {
  await mkdir(PUBLICO, { recursive: true });

  const navegador = await chromium.launch(opcionesNavegador());
  const pagina = await navegador.newPage();

  try {
    for (const pieza of PIEZAS) {
      const svg = lienzo(pieza);
      await pagina.setViewportSize({ width: pieza.ancho, height: pieza.alto });
      // `margin:0` y fondo transparente: sin ellos el `body` mete ocho píxeles
      // de márgen por lado y la marca sale descentrada en las piezas pequeñas.
      await pagina.setContent(
        `<style>html,body{margin:0;padding:0;background:transparent}</style>${svg}`,
      );
      const png = await pagina.screenshot({ omitBackground: true });
      await writeFile(join(PUBLICO, pieza.fichero), png);
      console.log(`  ✓ ${pieza.fichero} (${pieza.ancho}×${pieza.alto})`);

      if (pieza.fichero === "icono-32.png") {
        await writeFile(join(PUBLICO, "favicon.ico"), empaquetarIco(png, 32));
        console.log("  ✓ favicon.ico (32×32, PNG dentro del contenedor .ico)");
      }
    }
  } finally {
    await navegador.close();
  }
}

principal().catch((e) => {
  console.error("no se han podido generar los iconos:", e);
  process.exit(1);
});
