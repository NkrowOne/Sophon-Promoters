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

/**
 * La escalera de bonos por hitos que se pidió.
 *
 * ⚠️ Con el tráfico actual estos umbrales son inalcanzables: la cuenta ENTERA
 * hace unos 8.600 registros al mes y el primer escalón pide 10.000 a un solo
 * agente. Se siembran así porque son los valores acordados y porque se cambian
 * en diez segundos desde `/admin/bonos`, donde la columna «alcanzado por» dice
 * cuántos agentes llegaron a cada uno el mes pasado.
 */
const ESCALERA_BONO: [usuarios: number, recompensaMicros: bigint][] = [
  [10_000, 50_000_000n],  // 50 $
  [20_000, 100_000_000n], // 100 $
  [30_000, 150_000_000n], // 150 $
];

async function main(): Promise<void> {
  const yaHay = await db.tarifaVersion.count();
  if (yaHay > 0) {
    console.log(`[semilla] ya hay ${yaHay} versión(es) de tarifa; la tarifa no se toca.`);
    await sembrarEscalera();
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

  await sembrarEscalera();
}

/**
 * La escalera de bonos, con guardián PROPIO.
 *
 * Separada de la tarifa a propósito: una instalación que ya venía funcionando
 * tiene tarifa y no tiene escalera, así que un guardián único —«si hay tarifa no
 * hagas nada»— la dejaría sin sembrar para siempre, que es justo el caso de
 * cualquier despliegue anterior al bono.
 */
async function sembrarEscalera(): Promise<void> {
  if ((await db.bonoVersion.count()) > 0) return;

  await db.bonoVersion.create({
    data: {
      nota: "Escalera inicial creada por la semilla. Cámbiala en /admin/bonos.",
      escalones: {
        create: ESCALERA_BONO.map(([usuarios, recompensaMicros]) => ({
          usuarios,
          recompensaMicros,
        })),
      },
    },
  });

  await db.auditoria.create({
    data: {
      actorTipo: "SISTEMA",
      actorId: "semilla",
      accion: "bono.escalera_cambiada",
      recurso: "bono",
      detalle: { escalones: "10.000 → 50 $ · 20.000 → 100 $ · 30.000 → 150 $" },
    },
  });

  console.log("[semilla] escalera de bonos: 10.000 → 50 $, 20.000 → 100 $, 30.000 → 150 $.");
}

main()
  .catch((e) => {
    console.error("[semilla] falló:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
