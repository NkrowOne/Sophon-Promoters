/**
 * Las filas que TENÍAN que haber devengado y no devengaron.
 *
 * ── POR QUÉ HACE FALTA MIRAR ESTO, SI EL BARRIDO YA CORRE ──
 *
 * Porque el barrido solo repasa los últimos `DIAS_VENTANA_REVISION` días. Es lo
 * correcto para lo que se diseñó —Sophon solo revisa a la baja dentro de esa
 * ventana— pero convierte cualquier hueco en PERMANENTE: si el día que entraron
 * los registros no se pudo devengar, cuando la causa se arregla ese día ya está
 * fuera de la ventana y nadie lo vuelve a mirar. El dinero no se pierde por un
 * cálculo malo, se pierde porque nadie recalcula.
 *
 * Y las causas de que un día no devengue son varias, todas silenciosas:
 *
 *  1. **No había tarifa** cuando pasó el barrido. Esta la avisaba el panel, pero
 *     el aviso desaparece en cuanto se configura una, y los días de antes se
 *     quedan a cero para siempre.
 *  2. **La tarifa está a cero.** Una `TarifaVersion` con `cpaPorRegistroMicros`
 *     a 0 existe, así que la alarma de «no hay tarifa» no salta, y no paga nada.
 *  3. **El webmaster no tenía agente** ese día y se le asignó después.
 *  4. Cualquier otra que aparezca mañana.
 *
 * Todas se ven igual desde fuera: el agente ve 0,00 $ con registros entrando, y
 * el margen del Operador sale al 100 % — o sea, la página se lee como un mes
 * excelente justo cuando nadie está cobrando. Por eso esto no comprueba las
 * causas una a una, comprueba el SÍNTOMA: filas con registros, con agente, dentro
 * de su ventana de atribución, y sin un solo asiento.
 *
 * La consulta va en SQL crudo y no en Prisma porque compara dos columnas de dos
 * tablas —`f.fecha >= w."devengaDesde"`—, y eso el `where` de Prisma no lo sabe
 * expresar. Escrita con Prisma habría que traerse las filas y filtrar en
 * memoria, que sobre un histórico entero es justo lo que no se puede hacer en
 * una página que se pinta en cada visita.
 */

import { db } from "../db.ts";

/** Lo que se ha quedado sin devengar, en una línea. */
export interface HuecoDeDevengo {
  /** Filas (webmaster × día) que debían tener asiento y no lo tienen. */
  filas: number;
  /** Registros que representan esas filas. Es la magnitud del agujero. */
  registros: number;
  /** El día más antiguo afectado, para saber desde cuándo viene. */
  desde: string | null;
}

/**
 * Cuántas filas debían devengar y no lo hicieron.
 *
 * Cuenta, no lista: esto lo llama la portada del panel en cada carga y lo único
 * que necesita para decidir si grita es si el número es mayor que cero.
 */
export async function huecoDeDevengo(): Promise<HuecoDeDevengo> {
  const [fila] = await db.$queryRaw<
    { filas: bigint; registros: bigint | null; desde: Date | null }[]
  >`
    SELECT count(*)                    AS filas,
           sum(f."countRegister")      AS registros,
           min(f.fecha)                AS desde
      FROM "FilaDiariaSophon" f
      JOIN "Webmaster" w ON w.id = f."webmasterId"
     WHERE f."countRegister" > 0
       AND w."agenteId" IS NOT NULL
       AND (w."devengaDesde" IS NULL OR f.fecha >= w."devengaDesde")
       AND NOT EXISTS (
             SELECT 1 FROM "AsientoComision" a WHERE a."filaId" = f.id
           )
  `;

  return {
    filas: Number(fila?.filas ?? 0n),
    registros: Number(fila?.registros ?? 0n),
    desde: fila?.desde ? fila.desde.toISOString().slice(0, 10) : null,
  };
}

/** Una fila concreta a reparar, con lo que el motor necesita para replanificarla. */
export interface FilaSinDevengar {
  filaId: string;
  webmasterId: string;
  agenteId: string;
  email: string;
  fecha: string;
  countRegister: number;
  countT1Register: number;
  countT2Register: number;
  countT3Register: number;
  countPayingUsers: number;
  paymentAmountMicros: bigint;
  gananciaTotalMicros: bigint;
  gananciaWebmasterMicros: bigint;
  devengaDesde: string | null;
}

/**
 * Las filas al detalle, para el reparador.
 *
 * Mismo criterio que el recuento —tiene que serlo, o el panel avisaría de un
 * agujero que el reparador no encuentra— y con `limite` porque un histórico
 * entero sin devengar podría ser decenas de miles de filas y esto se procesa
 * fila a fila contra Sophon… no, contra nada: los datos ya están en la fila. Aun
 * así el tope existe para que una pasada sea acotada y repetible.
 */
export async function filasSinDevengar(limite = 5_000): Promise<FilaSinDevengar[]> {
  const filas = await db.$queryRaw<
    {
      filaId: string;
      webmasterId: string;
      agenteId: string;
      email: string;
      fecha: Date;
      countRegister: number;
      countT1Register: number;
      countT2Register: number;
      countT3Register: number;
      countPayingUsers: number;
      paymentAmountMicros: bigint;
      gananciaTotalMicros: bigint;
      gananciaWebmasterMicros: bigint;
      devengaDesde: Date | null;
    }[]
  >`
    SELECT f.id                        AS "filaId",
           f."webmasterId"             AS "webmasterId",
           w."agenteId"                AS "agenteId",
           w."emailNormalizado"        AS email,
           f.fecha                     AS fecha,
           f."countRegister"           AS "countRegister",
           f."countT1Register"         AS "countT1Register",
           f."countT2Register"         AS "countT2Register",
           f."countT3Register"         AS "countT3Register",
           f."countPayingUsers"        AS "countPayingUsers",
           f."paymentAmountMicros"     AS "paymentAmountMicros",
           f."gananciaTotalMicros"     AS "gananciaTotalMicros",
           f."gananciaWebmasterMicros" AS "gananciaWebmasterMicros",
           w."devengaDesde"            AS "devengaDesde"
      FROM "FilaDiariaSophon" f
      JOIN "Webmaster" w ON w.id = f."webmasterId"
     WHERE f."countRegister" > 0
       AND w."agenteId" IS NOT NULL
       AND (w."devengaDesde" IS NULL OR f.fecha >= w."devengaDesde")
       AND NOT EXISTS (
             SELECT 1 FROM "AsientoComision" a WHERE a."filaId" = f.id
           )
     ORDER BY f.fecha ASC
     LIMIT ${limite}
  `;

  return filas.map((f) => ({
    ...f,
    fecha: f.fecha.toISOString().slice(0, 10),
    devengaDesde: f.devengaDesde ? f.devengaDesde.toISOString().slice(0, 10) : null,
  }));
}
