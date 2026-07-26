import { PrismaClient } from "@prisma/client";

/**
 * Cliente Prisma único.
 *
 * En desarrollo Next recarga los módulos en caliente y cada recarga crearía un
 * cliente nuevo, agotando el pool de conexiones de Postgres en pocos minutos.
 * Se guarda en `globalThis` para sobrevivir a la recarga.
 */
const global_ = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  global_.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") global_.prisma = db;

/**
 * Claves de bloqueo consultivo de Postgres.
 *
 * Los barridos se disparan por cron y pueden solaparse si uno tarda más de su
 * intervalo. Sin bloqueo, dos ejecuciones simultáneas leerían el mismo estado
 * «ya asentado» y escribirían el mismo devengo dos veces: la clave de
 * idempotencia frenaría la segunda, pero con un error feo en vez de un
 * comportamiento previsto.
 */
export const CERROJO = {
  SYNC_REGISTROS: 811_001,
  SYNC_WEBMASTERS: 811_002,
  SYNC_TESORERIA: 811_003,
  SYNC_AVISOS: 811_004,
} as const;

/**
 * Ejecuta `fn` sosteniendo un bloqueo consultivo. Si otro proceso lo tiene,
 * devuelve `null` de inmediato en lugar de esperar: para un barrido periódico
 * es preferible saltarse una vuelta que encolar ejecuciones.
 */
export async function conCerrojo<T>(
  clave: number,
  fn: () => Promise<T>,
): Promise<T | null> {
  const [fila] = await db.$queryRaw<{ pg_try_advisory_lock: boolean }[]>`
    SELECT pg_try_advisory_lock(${clave}::bigint)
  `;
  if (!fila?.pg_try_advisory_lock) return null;

  try {
    return await fn();
  } finally {
    await db.$queryRaw`SELECT pg_advisory_unlock(${clave}::bigint)`;
  }
}
