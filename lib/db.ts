import { randomUUID } from "node:crypto";

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
 * Las claves de los cerrojos de barrido.
 *
 * Los barridos se disparan por reloj y pueden solaparse si uno tarda más que su
 * intervalo. Sin cerrojo, dos ejecuciones simultáneas leerían el mismo estado
 * «ya asentado» y escribirían el mismo devengo dos veces: la clave de
 * idempotencia frenaría la segunda, pero con un error feo en vez de un
 * comportamiento previsto.
 */
export const CERROJO = {
  SYNC_REGISTROS: "sync.registros",
  SYNC_WEBMASTERS: "sync.webmasters",
  SYNC_TESORERIA: "sync.tesoreria",
  SYNC_AVISOS: "sync.avisos",
} as const;

export type ClaveCerrojo = (typeof CERROJO)[keyof typeof CERROJO];

/**
 * Quién sostiene el cerrojo. Uno por proceso, para poder soltar solo lo propio.
 *
 * `randomUUID` y no el PID: en un despliegue con varias réplicas los PID se
 * repiten —cada contenedor empieza por 1— y dos réplicas distintas se creerían
 * la misma.
 */
const YO = randomUUID();

/**
 * Cuánto vale un cerrojo antes de considerarse abandonado.
 *
 * Es el seguro contra un proceso que muere a mitad de barrido: sin caducidad, un
 * contenedor reiniciado en el peor momento dejaría el cerrojo tomado para
 * siempre y ningún barrido volvería a correr jamás.
 *
 * Quince minutos: mucho más de lo que tarda el barrido más largo —los medidos
 * van entre 1,7 y 3,1 segundos— y menos que la cadencia de 30 minutos, así que
 * un abandono se recupera antes de la vuelta siguiente.
 */
const VIDA_MS = 15 * 60_000;

/**
 * Ejecuta `fn` sosteniendo el cerrojo. Si otro lo tiene, devuelve `null` de
 * inmediato en lugar de esperar: para un barrido periódico es preferible
 * saltarse una vuelta que encolar ejecuciones.
 *
 * ── POR QUÉ NO SON YA BLOQUEOS CONSULTIVOS DE POSTGRES ──
 *
 * Lo eran, y estaban rotos de una forma que solo se ve en el log de la base:
 *
 *     WARNING: you don't own a lock of type ExclusiveLock
 *
 * Los bloqueos consultivos de Postgres son **por sesión**, y Prisma reparte las
 * consultas entre las conexiones de un pool. Así que
 * `SELECT pg_try_advisory_lock(...)` se ejecutaba en una conexión y el
 * `pg_advisory_unlock(...)` del `finally` en OTRA: el aviso lo emite la segunda,
 * que efectivamente no tenía nada que soltar.
 *
 * Y lo grave no es el aviso: **el bloqueo de la primera conexión no se soltaba
 * nunca**. Se quedaba tomado mientras esa conexión viviera en el pool, de modo
 * que a partir de ahí `pg_try_advisory_lock` devolvía falso y TODOS los barridos
 * siguientes se saltaban en silencio —`conCerrojo` devuelve `null`, que el
 * llamante lee como «ya hay otro en curso»—. El síntoma sería el peor de todos:
 * un devengado clavado, sin un solo error, hasta que alguien reiniciara.
 *
 * Un cerrojo en una FILA no depende de qué conexión lo tome. Sobrevive al
 * reparto del pool, se ve con un `SELECT` cuando hay que depurarlo, y caduca
 * solo si quien lo tenía se muere.
 */
export async function conCerrojo<T>(
  clave: ClaveCerrojo,
  fn: () => Promise<T>,
  vidaMs: number = VIDA_MS,
): Promise<T | null> {
  /*
   * Tomarlo es UNA sentencia, y tiene que serlo.
   *
   * `ON CONFLICT ... DO UPDATE ... WHERE` es atómico: o inserta, o pisa un
   * cerrojo caducado, o no hace nada. Leer primero y escribir después dejaría
   * una ventana entre las dos en la que dos réplicas se lo llevarían las dos.
   *
   * `$executeRaw` devuelve el número de filas afectadas: 1 si es nuestro, 0 si
   * lo tiene otro y sigue vigente.
   */
  const tomadas = await db.$executeRaw`
    INSERT INTO "Cerrojo" ("clave", "duenno", "tomadoEn", "expiraEn")
    VALUES (${clave}, ${YO}, now(), now() + make_interval(secs => ${vidaMs / 1000}))
    ON CONFLICT ("clave") DO UPDATE
      SET "duenno" = EXCLUDED."duenno",
          "tomadoEn" = EXCLUDED."tomadoEn",
          "expiraEn" = EXCLUDED."expiraEn"
      WHERE "Cerrojo"."expiraEn" < now()
  `;
  if (tomadas === 0) return null;

  try {
    return await fn();
  } finally {
    /*
     * Se suelta solo lo PROPIO.
     *
     * El `AND "duenno"` no es celo: si nuestro cerrojo hubiera caducado a mitad
     * de barrido y otro proceso lo hubiera tomado, un borrado a secas le
     * quitaría el suyo y los dos acabarían corriendo a la vez, que es
     * exactamente lo que este código existe para impedir.
     */
    await db.$executeRaw`
      DELETE FROM "Cerrojo" WHERE "clave" = ${clave} AND "duenno" = ${YO}
    `;
  }
}

/**
 * ¿Este error es el índice único parcial diciendo «ya hay una viva»?
 *
 * Prisma emite `P2002` para cualquier violación de unicidad, así que se mira
 * además el nombre del índice: en esta tabla también es único
 * `claveIdempotencia`, y ese caso ya lo resuelve la lectura de `REPETIDA` antes
 * de llegar aquí. Confundirlos convertiría un reenvío idempotente —que debe
 * contestar «ok, ya estaba»— en un 409 de «ya tienes una en curso».
 *
 * Se comprueba por forma y no con `instanceof PrismaClientKnownRequestError`
 * para no importar el cliente de Prisma solo por un tipo.
 *
 * Vive aquí y no en la ruta por lo mismo que `saldos` no vive en
 * `lib/api/agente.ts`: la ruta importa `next/server`, y `next` no publica mapa
 * de `exports`, así que Node no lo resuelve fuera del empaquetador y el test
 * no podía ni importar el fichero. Interpretar un error de Prisma es además
 * asunto de quien tiene el cliente de Prisma.
 */
export function esChoqueDeSolicitudViva(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const { code, meta } = e as { code?: unknown; meta?: { target?: unknown } };
  if (code !== "P2002") return false;
  const objetivo = meta?.target;
  const texto = Array.isArray(objetivo) ? objetivo.join(",") : String(objetivo ?? "");
  return texto.includes("una_viva_por_agente");
}
