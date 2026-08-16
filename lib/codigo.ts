/**
 * La FORMA de un código de activación, sin criptografía.
 *
 * Existe por una razón de empaquetado, no de organización: `lib/cripto.ts`
 * importa `node:crypto`, y la pantalla de alta —que es un componente de
 * cliente— necesita saber normalizar y formatear un código. Importarlo desde
 * allí arrastraba `node:crypto` al paquete del navegador y el build fallaba con
 * `UnhandledSchemeError: Reading from "node:crypto" is not handled by plugins`.
 *
 * Así que lo que es puro vive aquí y lo que necesita entropía se queda allí.
 * `lib/cripto.ts` reexporta estas tres cosas, de modo que quien ya las importaba
 * de allí sigue haciéndolo y no hay dos sitios donde buscar.
 *
 * La regla que gobierna las tres: **se guarda y se compara siempre lo
 * normalizado**; los guiones son cosa de la presentación. Costó un defecto
 * aprenderla —el bot generaba «MR7MD-APD6R», eso se guardaba con el guion y las
 * rutas de alta buscaban por el normalizado, así que ningún código generado
 * podía canjearse jamás—.
 */

/**
 * La longitud de un código de activación, en un solo sitio.
 *
 * La necesita también el campo de alta, para saber cuándo está COMPLETO. Sin
 * esto, la pantalla habilitaba su botón con `length >= 4` —el mínimo defensivo
 * del esquema del servidor, no la longitud real— y el agente con cuatro
 * caracteres escritos gastaba una ida y vuelta para que le contestaran «el
 * código no es válido», que dice que está MAL cuando está INCOMPLETO. El agente
 * concluye que el Operador le ha dado un código malo.
 */
export const LONGITUD_CODIGO = 10;

/** Cuántos caracteres van entre guiones al ENSEÑAR un código. */
const GRUPO_CODIGO = 5;

export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Forma legible de un código: grupos de cinco separados por guion.
 *
 * Solo para enseñarlo y dictarlo. Nunca se guarda ni se compara así.
 */
export function formatearCodigo(codigo: string): string {
  return (normalizarCodigo(codigo).match(new RegExp(`.{1,${GRUPO_CODIGO}}`, "g")) ?? []).join("-");
}
