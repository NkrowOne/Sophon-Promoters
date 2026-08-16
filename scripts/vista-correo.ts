/**
 * Pinta el correo del código a un fichero, para poder MIRARLO.
 *
 * Hasta ahora la única forma de ver este correo era mandarlo, así que en la
 * práctica no se revisaba nunca — y es el camino crítico de acceso: si sale
 * mal, el agente no entra.
 *
 *   node --experimental-strip-types scripts/vista-correo.ts [idioma] [codigo]
 *
 * Escribe `vista-correo-<idioma>.html` en el directorio actual. La marca sale
 * como hueco: viaja incrustada por `cid:` y eso no existe fuera de un cliente de
 * correo, así que la vista la sustituye por un recuadro del tamaño exacto para
 * que la maquetación se juzgue con el sitio ya ocupado.
 */

import { writeFile } from "node:fs/promises";

import { plantillaOtp } from "../lib/correo.ts";
import { IDIOMAS, type Idioma } from "../lib/idiomas.ts";

const pedido = process.argv[2];
const idiomas: readonly Idioma[] =
  pedido && (IDIOMAS as readonly string[]).includes(pedido) ? [pedido as Idioma] : IDIOMAS;
const codigo = process.argv[3] ?? "384102";

for (const idioma of idiomas) {
  const { html, asunto, texto } = plantillaOtp({
    codigo,
    minutosValidez: 10,
    idioma,
    marcaIncrustada: true,
  });

  // El `cid:` no resuelve fuera de un cliente de correo. Se sustituye por un
  // bloque del mismo tamaño para no juzgar la maquetación con un hueco de más.
  const vista = html.replace(
    /<img src="cid:[^"]*"[^>]*>/,
    '<div style="width:52px;height:52px;border-radius:12px;background:#f9d027;border:1px solid #a8850b"></div>',
  );

  const salida = `<!doctype html>
<meta charset="utf-8">
<title>${asunto}</title>
<div style="font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#5f5f67;padding:16px;background:#ededef">
  <div style="max-width:440px;margin:0 auto 12px">
    <strong style="color:#17171a">Asunto:</strong> ${asunto}
  </div>
</div>
${vista}
<div style="font:13px/1.6 ui-monospace,monospace;color:#5f5f67;padding:24px 16px;background:#ededef;white-space:pre-wrap">
<strong style="color:#17171a">Versión en texto plano (la que ve un cliente sin HTML):</strong>

${texto}
</div>`;

  const fichero = `vista-correo-${idioma}.html`;
  await writeFile(fichero, salida, "utf8");
  console.info(`[correo] ${fichero}`);
}
