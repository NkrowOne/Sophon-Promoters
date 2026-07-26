/**
 * Semilla: la tarifa del primer arranque.
 *
 * Sin una `TarifaVersion` en vigor, `tarifaVigente()` devuelve `null`,
 * `procesarFila` sale antes de asentar y **el sistema entero se despliega sin
 * devengar un céntimo**, en silencio y con todos los barridos en verde. Es el
 * peor modo de fallo del proyecto porque no se parece a uno: las filas diarias
 * entran, los registros crecen en pantalla y solo falta el dinero.
 *
 * Que exista el panel de tarifas no basta: obliga a acordarse de entrar antes
 * de que el primer barrido pase, y el primer barrido pasa a los treinta minutos
 * del despliegue. La semilla cierra esa ventana.
 *
 * **Idempotente y solo para el arranque en frío.** Si ya hay cualquier versión
 * —aunque esté cerrada— no toca nada: reponer una tarifa por defecto encima de
 * una que el superadmin cambió a conciencia sería devolverle sus decisiones al
 * valor de fábrica en cada despliegue.
 *
 * Los valores son los del planteamiento (§1): de los 0,06 $ por registro y el
 * 15 % del CPS que le entran al superadmin, cede 0,03 $ y el 5 %.
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const CPA_POR_REGISTRO_MICROS = 30_000n; // 0,03 $
const CPS_BPS = 500; // 5 %

async function main(): Promise<void> {
  const yaHay = await db.tarifaVersion.count();
  if (yaHay > 0) {
    console.log(`[semilla] ya hay ${yaHay} versión(es) de tarifa; no se toca nada.`);
    return;
  }

  const tarifa = await db.tarifaVersion.create({
    data: {
      cpaPorRegistroMicros: CPA_POR_REGISTRO_MICROS,
      cpsBps: CPS_BPS,
      nota: "Tarifa inicial creada por la semilla. Cámbiala en /admin/tarifas.",
    },
  });

  // Auditada como cualquier otro cambio de tarifa: el historial del panel no
  // puede empezar con una versión que apareció sin que conste quién la puso.
  await db.auditoria.create({
    data: {
      actorTipo: "SISTEMA",
      actorId: "semilla",
      accion: "tarifa.cambiada",
      recurso: "tarifa",
      detalle: { cpa: "0,0300 $", cps: "5 %", nota: "arranque en frío" },
    },
  });

  console.log(`[semilla] tarifa inicial creada (${tarifa.id}): 0,03 $ por registro y 5 % del CPS.`);
}

main()
  .catch((e) => {
    console.error("[semilla] falló:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
