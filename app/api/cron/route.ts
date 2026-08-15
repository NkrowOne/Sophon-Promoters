import { NextResponse } from "next/server";

import { barrerAvisos } from "@/lib/sync/avisos";
import { barrerRegistros } from "@/lib/sync/registros";
import { barrerTesoreria } from "@/lib/sync/tesoreria";
import { barrerWebmasters } from "@/lib/sync/webmasters";
import { clienteSophon } from "@/lib/sophon/instancia";
import { formatearMicros } from "@/lib/devengo/dinero";
import { secretoCron } from "@/lib/secretos";

/**
 * Disparador de los barridos.
 *
 * Sophon no tiene webhooks, así que todo es *polling*. Esta ruta la llama el
 * planificador de Skyway.
 *
 * Cada barrido toma un cerrojo consultivo y devuelve `null` si otro ya estaba
 * corriendo; eso es lo correcto para un proceso periódico, porque encolar
 * ejecuciones solo empeora el atasco. Aquí se refleja como `omitido`.
 */

// La sincronización habla con la base de datos y con una API externa: nunca
// puede servirse desde caché.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Tarea = "registros" | "webmasters" | "tesoreria" | "avisos" | "todo";

export async function POST(peticion: Request): Promise<NextResponse> {
  // Derivado si no está declarado: esta ruta es ya solo el disparador MANUAL
  // —los barridos corren dentro del proceso—, así que su secreto no tiene que
  // viajar a ningún planificador externo.
  const secreto = secretoCron();

  // Cabecera y no parámetro de URL: los parámetros acaban en los logs de acceso
  // de cualquier proxy por el que pase la petición.
  if (peticion.headers.get("x-cron-secret") !== secreto) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const url = new URL(peticion.url);
  const tarea = (url.searchParams.get("tarea") ?? "todo") as Tarea;
  const cliente = clienteSophon();
  const salida: Record<string, unknown> = {};
  const inicio = Date.now();

  try {
    if (tarea === "registros" || tarea === "todo") {
      const r = await barrerRegistros(cliente);
      salida["registros"] = r ?? { omitido: "otro barrido en curso" };
      // Un barrido que lee 40.000 filas y emite cero asientos no puede salir en
      // los logs con el mismo aspecto que uno bueno: sin tarifa en vigor nadie
      // está devengando nada, y esta línea es lo único que lo dice en el sitio
      // donde se mira cuando algo va raro.
      if (r?.sinTarifa) {
        console.error(
          "[cron] SIN TARIFA EN VIGOR: se han guardado las filas pero no se ha devengado nada. Ponla en /admin/tarifas.",
        );
      }
    }

    if (tarea === "webmasters" || tarea === "todo") {
      const r = await barrerWebmasters(cliente);
      salida["webmasters"] = r ?? { omitido: "otro barrido en curso" };
    }

    if (tarea === "tesoreria" || tarea === "todo") {
      const r = await barrerTesoreria(cliente);
      salida["tesoreria"] = r
        ? {
            ...r,
            // Los BigInt no son serializables a JSON, y además interesa leerlo.
            totalMicros: formatearMicros(r.totalMicros),
            enProcesoMicros: formatearMicros(r.enProcesoMicros),
            disponibleMicros: formatearMicros(r.disponibleMicros),
            descuadreLedgerMicros: formatearMicros(r.descuadreLedgerMicros),
          }
        : { omitido: "otro barrido en curso" };
    }

    /*
     * Los avisos van los ÚLTIMOS y sin depender del cliente de Sophon.
     *
     * Después, porque miran lo que los otros tres acaban de escribir: avisar
     * con los datos de ayer diría que alguien lleva parado un día más de la
     * cuenta. Y sin cliente, porque solo leen nuestra base de datos: si Sophon
     * está caído, este es el único barrido que sigue funcionando, y es
     * justamente el que le habla al agente.
     *
     * `null` aquí quiere decir dos cosas —otro barrido en curso, o que hoy ya
     * se avisó—, y la segunda es la normal: el cron corre cada media hora y
     * este barrido es diario.
     */
    if (tarea === "avisos" || tarea === "todo") {
      const r = await barrerAvisos();
      salida["avisos"] = r ?? { omitido: "ya se avisó hoy, o hay otro barrido en curso" };
    }

    return NextResponse.json({ ok: true, duracionMs: Date.now() - inicio, ...salida });
  } catch (e) {
    console.error("[cron] barrido fallido", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        duracionMs: Date.now() - inicio,
        // Lo que sí terminó antes del fallo se devuelve igual: saber qué parte
        // pasó es la mitad del diagnóstico.
        ...salida,
      },
      { status: 500 },
    );
  }
}
