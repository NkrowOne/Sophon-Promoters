/**
 * Devenga las filas que se quedaron sin devengar.
 *
 *   npm run devengo:reparar              # en seco: dice qué haría y no toca nada
 *   npm run devengo:reparar -- --aplicar # escribe los asientos
 *
 * ── POR QUÉ NO LO ARREGLA EL BARRIDO ──
 *
 * Porque el barrido solo repasa los últimos `DIAS_VENTANA_REVISION` días, y eso
 * es correcto para lo que se diseñó: Sophon solo revisa a la baja dentro de esa
 * ventana, así que releer más atrás sería trabajo tirado. El efecto secundario
 * es que cualquier hueco se vuelve PERMANENTE. Si el día que entraron los
 * registros no se pudo devengar —no había tarifa, la tarifa estaba a cero, el
 * webmaster todavía no tenía agente—, cuando la causa se arregla ese día ya está
 * fuera de la ventana y nadie lo vuelve a mirar nunca.
 *
 * Este guion es la única forma de recuperarlo, y por eso existe.
 *
 * ── LO QUE NO HACE ──
 *
 * No inventa nada. Vuelve a pasar por el MISMO motor —`planificarAsientos`— con
 * los mismos datos que ya están en la fila y la tarifa que hay hoy. Si el motor
 * dice que no hay nada que escribir, no escribe. Y solo mira filas SIN NINGÚN
 * asiento: una fila que ya devengó, aunque fuera de menos, no se toca desde
 * aquí, porque corregir un importe ya asentado es trabajo del barrido y de sus
 * reversos, que sí saben distinguir un alza de una baja.
 *
 * ── LA TARIFA QUE SE APLICA ES LA DE HOY ──
 *
 * Y hay que decirlo porque no es obvio: si la tarifa cambió entre el día del
 * hecho y hoy, estos asientos van con la de hoy. Es lo único que se puede hacer
 * —no hay forma de saber qué tarifa «debería» haber estado en vigor un día en
 * que no había ninguna— y queda escrito en la nota de cada asiento para que
 * quien audite el libro sepa que esa fecha y esa tarifa no se corresponden.
 */

import { db } from "../lib/db.ts";
import { estaCerrado, planificarAsientos, type FilaDiaria } from "../lib/devengo/motor.ts";
import { formatearMicros } from "../lib/devengo/dinero.ts";
import { filasSinDevengar, huecoDeDevengo } from "../lib/devengo/sin-devengar.ts";
import { hoyContable, tarifaVigente } from "../lib/sync/registros.ts";

const APLICAR = process.argv.includes("--aplicar");

async function main(): Promise<void> {
  const hueco = await huecoDeDevengo();
  if (hueco.filas === 0) {
    console.log("Nada que reparar: todas las filas con registros y agente tienen asiento.");
    return;
  }

  console.log(
    `${hueco.filas} ${hueco.filas === 1 ? "fila" : "filas"} sin devengar` +
      `${hueco.desde ? `, desde el ${hueco.desde}` : ""}` +
      `, con ${hueco.registros} ${hueco.registros === 1 ? "registro" : "registros"}.`,
  );

  const tarifa = await tarifaVigente();
  if (!tarifa) {
    console.error(
      "\nNo hay tarifa en vigor, así que no hay con qué devengar. Configúrala en " +
        "/admin/tarifas y vuelve a ejecutar esto.",
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `Tarifa que se aplicará: ${formatearMicros(tarifa.cpaPorRegistroMicros)} por registro, ` +
      `${Number(tarifa.cpsBps) / 100} % de las compras.`,
  );

  /*
   * Un CPA a cero es el caso que trajo aquí, así que se dice y se para.
   *
   * Sin esto el guion recorrería las filas, el motor devolvería lista vacía para
   * todas —cero por cualquier número es cero— y terminaría con un «0 asientos»
   * que se lee como «no hacía falta». Y sí hacía falta: lo que pasa es que la
   * tarifa no paga.
   */
  if (tarifa.cpaPorRegistroMicros === 0n && tarifa.cpsBps === 0n) {
    console.error(
      "\nLa tarifa en vigor está a CERO: 0,00 $ por registro y 0 % de las compras. " +
        "Devengar con ella escribiría asientos de cero. Corrige la tarifa en /admin/tarifas " +
        "y vuelve a ejecutar esto.",
    );
    process.exitCode = 1;
    return;
  }

  const hoy = hoyContable();
  const filas = await filasSinDevengar();
  let escritos = 0;
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
      importeMicros += a.importeMicros;
      escritos += 1;
      console.log(
        `  ${f.fecha}  ${f.email.padEnd(34)} ${a.tipo.padEnd(6)} ` +
          `${formatearMicros(a.importeMicros).padStart(10)}  ` +
          `(${a.baseRegistros ?? 0} reg.)${cerrado ? "  [consolidado]" : ""}`,
      );

      if (!APLICAR) continue;
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

  console.log(
    `\n${escritos} ${escritos === 1 ? "asiento" : "asientos"}, ` +
      `${formatearMicros(importeMicros)} en total.`,
  );
  console.log(
    APLICAR
      ? "Escritos. Los agentes ya lo ven en su saldo."
      : "En seco: no se ha escrito nada. Repite con `-- --aplicar`.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
