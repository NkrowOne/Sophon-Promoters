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
import { estaCerrado, planificarAsientos, type FilaDiaria } from "./motor.ts";
import { hoyContable, tarifaVigente } from "../sync/registros.ts";

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


/** Lo que ha hecho —o haría— una pasada del reparador. */
export interface ResultadoReparacion {
  /** `false` cuando no se puede devengar y hay que arreglar otra cosa antes. */
  ok: boolean;
  /** Qué lo impide, para poder decirlo con palabras en vez de con un cero. */
  motivo?: "sin-tarifa" | "tarifa-a-cero";
  /** Cuántos asientos se han escrito, o se escribirían en seco. */
  asientos: number;
  importeMicros: bigint;
  /** Filas repasadas. */
  filas: number;
  /** Las primeras líneas, para poder enseñar QUÉ se va a hacer antes de hacerlo. */
  detalle: { fecha: string; email: string; tipo: string; importeMicros: bigint }[];
}

const DETALLE_MAXIMO = 40;

/**
 * Devenga las filas que se quedaron sin devengar.
 *
 * ── VIVE AQUÍ Y NO EN EL GUION ──
 *
 * Porque el guion no se puede ejecutar donde hace falta. La imagen de despliegue
 * es la salida autocontenida de Next: lleva el servidor y nada más —ni
 * `scripts/`, ni las fuentes de `lib/`— así que `npm run devengo:reparar` en
 * producción muere con `Cannot find module`. Se descubrió intentándolo, y afecta
 * igual a los otros guiones de reparación.
 *
 * Con la lógica aquí, la acción del panel la ejecuta DENTRO del servidor que ya
 * está corriendo: sin terminal, sin despliegue especial, y desde el móvil, que
 * es desde donde el Operador mira esto. El guion sigue existiendo para el
 * escritorio y llama a esta misma función, así que no hay dos implementaciones
 * que puedan divergir.
 *
 * No inventa nada: vuelve a pasar las mismas filas por el MISMO motor
 * —`planificarAsientos`— con la tarifa de hoy. Solo mira filas sin NINGÚN
 * asiento; una que devengó de menos es trabajo del barrido y de sus reversos,
 * que sí saben distinguir un alza de una baja.
 */
export async function repararDevengo(
  opciones: { aplicar: boolean } = { aplicar: false },
): Promise<ResultadoReparacion> {
  const vacio = { asientos: 0, importeMicros: 0n, filas: 0, detalle: [] };

  const tarifa = await tarifaVigente();
  if (!tarifa) return { ok: false, motivo: "sin-tarifa", ...vacio };

  /*
   * Una tarifa a cero se para aquí y se dice.
   *
   * Sin esto, el reparador recorrería las filas, el motor devolvería lista vacía
   * para todas —cero por cualquier número es cero— y terminaría con un «0
   * asientos» que se lee como «no hacía falta». Y sí hacía falta: lo que pasa es
   * que la tarifa no paga.
   */
  if (tarifa.cpaPorRegistroMicros === 0n && tarifa.cpsBps === 0n) {
    return { ok: false, motivo: "tarifa-a-cero", ...vacio };
  }

  const hoy = hoyContable();
  const filas = await filasSinDevengar();
  const detalle: ResultadoReparacion["detalle"] = [];
  let asientos = 0;
  let importeMicros = 0n;

  for (const f of filas) {
    const filaDominio: FilaDiaria = {
      webmasterId: f.webmasterId,
      fecha: f.fecha,
      countRegister: f.countRegister,
      countT1Register: f.countT1Register,
      countT2Register: f.countT2Register,
      countT3Register: f.countT3Register,
      countPayingUsers: f.countPayingUsers,
      paymentAmountMicros: f.paymentAmountMicros,
      gananciaTotalMicros: f.gananciaTotalMicros,
      gananciaWebmasterMicros: f.gananciaWebmasterMicros,
    };

    const cerrado = estaCerrado(f.fecha, hoy);
    const planificados = planificarAsientos({
      fila: filaDominio,
      tarifa,
      // Sin asientos previos: es la condición con la que se seleccionó la fila.
      previo: { cpaMicros: 0n, cpsMicros: 0n, secuencia: 0 },
      devengaDesde: f.devengaDesde,
      fechaAjuste: hoy,
      diaCerrado: cerrado,
    });

    for (const a of planificados) {
      asientos += 1;
      importeMicros += a.importeMicros;
      if (detalle.length < DETALLE_MAXIMO) {
        detalle.push({
          fecha: f.fecha,
          email: f.email,
          tipo: a.tipo,
          importeMicros: a.importeMicros,
        });
      }
      if (!opciones.aplicar) continue;

      await db.asientoComision.create({
        data: {
          agenteId: f.agenteId,
          webmasterId: f.webmasterId,
          filaId: f.filaId,
          tipo: a.tipo,
          estado: cerrado ? "CONSOLIDADO" : "PROVISIONAL",
          importeMicros: a.importeMicros,
          baseRegistros: a.baseRegistros,
          baseMicros: a.baseMicros,
          tarifaId: a.tarifaId,
          fechaDevengo: new Date(a.fechaDevengo),
          claveIdempotencia: a.claveIdempotencia,
          // Queda escrito en el libro: este asiento no lo puso el barrido, y su
          // tarifa es la de hoy y no necesariamente la del día del hecho.
          nota: `Reparado el ${hoy}: la fila no había devengado.`,
        },
      });
    }
  }

  return { ok: true, asientos, importeMicros, filas: filas.length, detalle };
}
