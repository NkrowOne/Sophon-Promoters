/**
 * Previsualizador de piezas de la Mini App, CON LAS FUENTES DE VERDAD.
 *
 * Existe por un error que costó dos rondas de diseño: las capturas con las que
 * se estaban tomando decisiones se pintaban con la serif por defecto de
 * Chromium. El armazón de prueba cargaba `globals.css` compilado y nada más, y
 * las fuentes de esta aplicación no viven ahí: las descarga `next/font` en
 * tiempo de BUILD y las declara en su propia hoja, con `--fuente` y
 * `--fuente-display` puestas en el `<html>` por el layout.
 *
 * O sea que se juzgaron el ritmo, los tamaños y el espaciado de una pieza
 * tipográfica sobre una tipografía que no es la del producto. Archivo es un
 * grotesco de altura de x grande y cifras tabulares; una serif de sistema mide
 * distinto en todo.
 *
 * Esto lo arregla en un sitio: coge las reglas `@font-face` que `next build`
 * dejó en `.next/static/css`, reescribe sus rutas a los ficheros reales de
 * `.next/static/media`, y monta la página con las mismas variables que pone el
 * layout. Lo que se mira es lo que se sirve.
 *
 * Uso:
 *   npm run build                       (una vez: es de donde salen las fuentes)
 *   node scripts/vista.mjs <pieza.html> <salida> [--luz oscuro] [--ancho 390]
 *
 * `pieza.html` es solo el cuerpo: este guion le pone el armazón, la hoja y las
 * fuentes.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const MEDIA = join(RAIZ, ".next/static/media");
const CSS_BUILD = join(RAIZ, ".next/static/css");

function argumento(nombre, pordefecto) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i > 0 ? process.argv[i + 1] : pordefecto;
}

/**
 * Las `@font-face` del build, con las rutas apuntando a los ficheros de disco.
 *
 * Se recogen de TODAS las hojas y se deduplican: Next parte el CSS por rutas y
 * la misma familia aparece en varias, una vez por subconjunto de caracteres.
 * Sin el árabe, una captura en RTL volvería a mentir igual que mentían estas.
 */
function fuentes() {
  if (!existsSync(CSS_BUILD)) {
    throw new Error("No hay build. Ejecuta `npm run build` antes: las fuentes salen de ahí.");
  }
  const caras = new Set();
  for (const hoja of readdirSync(CSS_BUILD).filter((f) => f.endsWith(".css"))) {
    const css = readFileSync(join(CSS_BUILD, hoja), "utf8");
    for (const regla of css.match(/@font-face\{[^}]*\}/g) ?? []) {
      caras.add(regla.replace(/url\(\/_next\/static\/media\/([^)]+)\)/g, `url(file://${MEDIA}/$1)`));
    }
  }
  return [...caras].join("\n");
}

const cuerpo = readFileSync(resolve(process.argv[2]), "utf8");
const salida = resolve(process.argv[3]);
const luz = argumento("luz", "claro");
const ancho = Number(argumento("ancho", "390"));
const dir = argumento("dir", "ltr");
const lang = argumento("lang", dir === "rtl" ? "ar" : "es");

const trabajo = mkdtempSync(join(tmpdir(), "vista-"));
const hoja = join(trabajo, "app.css");
execFileSync(
  "npx",
  ["tailwindcss", "-c", "tailwind.config.ts", "-i", "app/(miniapp)/globals.css", "-o", hoja, "--minify"],
  { cwd: RAIZ, stdio: "pipe" },
);

const pagina = `<!doctype html>
<html lang="${lang}" dir="${dir}" data-luz="${luz}">
<head><meta charset="utf-8">
<style>${fuentes()}</style>
<style>${readFileSync(hoja, "utf8")}</style>
<style>
  /* Las mismas variables que el layout pone en el <html>. */
  :root {
    --fuente: "Archivo", "Archivo Fallback";
    --fuente-display: "Archivo Black", "Archivo Black Fallback";
    --fuente-arabe: "Noto Sans Arabic", "Noto Sans Arabic Fallback";
  }
  body { margin: 0; }
</style>
</head>
<body>${cuerpo}</body></html>`;

const html = join(trabajo, "vista.html");
writeFileSync(html, pagina);

const { chromium } = await import("playwright");
const navegador = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const pagina2 = await navegador.newPage({
  viewport: { width: ancho, height: Number(argumento("alto", "800")) },
  deviceScaleFactor: 2,
});
await pagina2.goto(`file://${html}`);
// A que las caras estén listas: sin esto se captura el fallback y volvemos al
// problema que este guion existe para no repetir.
await pagina2.evaluate(() => document.fonts.ready);
await pagina2.waitForTimeout(250);
const objetivo = argumento("selector", "body");
await (await pagina2.$(objetivo)).screenshot({ path: salida });
await navegador.close();
console.log(salida);
