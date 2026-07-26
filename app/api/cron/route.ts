import { NextResponse } from "next/server";

import { barrerRegistros } from "@/lib/sync/registros";
import { barrerTesoreria } from "@/lib/sync/tesoreria";
import { barrerWebmasters } from "@/lib/sync/webmasters";
import { clienteSophon } from "@/lib/sophon/instancia";
import { formatearMicros } from "@/lib/devengo/dinero";

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

type Tarea = "registros" | "webmasters" | "tesoreria" | "todo";

export async function POST(peticion: Request): Promise<NextResponse> {
  const secreto = process.env["CRON_SECRET"];
  if (!secreto) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado; la ruta queda deshabilitada" },
      { status: 503 },
    );
  }

  // Cabecera y no parámetro de URL: los parámetros acaban en los logs de acceso
  // de cualquier proxy por el que pase la petición.
  if (peticion.headers.get("x-cron-secret") !== secreto) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
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
