/**
 * Desde cuándo devenga un webmaster, según cómo llegó.
 *
 * Vive en su propio módulo y sin dependencias por la MISMA razón que
 * `auth/cookie-admin.ts` y `devengo/saldos.ts`: `alta.ts` importa el cliente de
 * Sophon, Prisma y el bot, así que una prueba que quisiera comprobar esta regla
 * —que es la que decide si un agente cobra o no— se caería al importar, sin
 * llegar a ejecutar una sola aserción. Es la cuarta vez que este proyecto se
 * topa con lo mismo, y la respuesta es siempre la misma: lo que se puede probar
 * con Node pelado se saca a su propio fichero.
 *
 * ── LA REGLA ──
 *
 * La frontera existe para que un agente no cobre el tráfico que su webmaster ya
 * traía ANTES de que él lo captara. Solo tiene sentido cuando hay un antes.
 *
 * En un alta no lo hay. El alta rechaza cualquier correo que la aplicación ya
 * conozca —`YA_EN_SOPHON`—, porque conocerlo significa que esa cuenta ya estaba
 * en el programa de socios. Toda alta que llega a crear una fila es una cuenta
 * que no existía, así que no hay pasado del que protegerse y la frontera solo
 * puede quitar.
 *
 * Y quitaba, todos los días. Ver la nota de regresión de abajo.
 */

/** Cómo llegó el webmaster a la aplicación. Refleja el enum del esquema. */
export type OrigenWebmaster = "VINCULADO_APP" | "HUERFANO" | "ASIGNADO_MANUAL";

/**
 * La fecha desde la que devenga, o `null` si devenga todo lo suyo.
 *
 * ── REGRESIÓN: EL DESFASE QUE SE COMÍA EL PRIMER DÍA ──
 *
 * El alta estampaba la frontera SIEMPRE, con `hoyContable()`. Y `hoyContable()`
 * es el día en la zona contable —UTC+8—, mientras que Sophon fecha los registros
 * en el día que acaba de cerrar. Un alta de la tarde europea cae ya en el día
 * contable siguiente, así que la frontera quedaba por delante de los registros
 * que ese mismo webmaster estaba trayendo:
 *
 *     registros de Sophon   2026-08-22
 *     devengaDesde          2026-08-23   →  «2026-08-22 >= 2026-08-23» es falso
 *
 * El agente veía sus registros y 0,00 $. Y el Operador SÍ cobraba esas filas
 * —su ingreso no filtra por esta fecha—, así que se quedaba con el cien por
 * cien de un dinero que entró porque ese agente trajo a ese webmaster.
 */
export function fronteraDeAtribucion(origen: OrigenWebmaster, hoy: string): Date | null {
  // Cuenta nueva traída por el agente: todo lo que produzca es suyo.
  if (origen === "VINCULADO_APP") return null;
  // Adoptada: existía antes, y lo de antes no es de quien la adopta.
  return new Date(hoy);
}
