import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { revisarEntorno } from "@/lib/entorno";

/**
 * ¿Está viva de verdad?
 *
 * Un healthcheck que solo devuelve `200 OK` responde a «¿hay un proceso
 * escuchando?», y esa nunca es la pregunta: el proceso puede estar en pie con la
 * base de datos caída, sirviendo errores a todo el mundo. Aquí se toca la base
 * con la consulta más barata que existe y el estado sale de ahí.
 *
 * **Distingue vivo de listo, y esa distinción es la que usa el orquestador.**
 * Un `503` con la base caída hace que Skyway no mande tráfico a esta réplica y
 * que un despliegue nuevo no sustituya al anterior si arranca roto; un `200`
 * con avisos deja que sirva mientras alguien mira qué pieza falta.
 *
 * **Cuenta las carencias, no las nombra.** Es una ruta sin autenticar a
 * propósito —un healthcheck que necesita credenciales no lo puede usar el
 * orquestador—, así que todo lo que devuelva es público. La primera versión
 * enumeraba las variables que faltan, y eso es publicar el mapa de la
 * configuración: no es explotable —las piezas sin su variable responden 503 en
 * vez de quedarse abiertas— pero tampoco tiene por qué saberlo cualquiera.
 *
 * Los nombres siguen estando donde hacen falta: en la consola, que es donde
 * mira el operador, y ahí ya los escribe `exigirEntorno` al arrancar. La
 * respuesta HTTP se queda con el recuento, que es lo único que necesita una
 * máquina para decidir si manda tráfico.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(): Promise<NextResponse> {
  const inicio = Date.now();
  const entorno = revisarEntorno();

  let base: "ok" | "caida" = "ok";
  let detalleBase: string | null = null;
  try {
    // `SELECT 1` y no un `count`: hay que saber si la conexión responde, no
    // cuántas filas hay. Un recuento sobre una tabla grande convertiría el
    // healthcheck —que corre cada pocos segundos— en carga permanente.
    await db.$queryRaw`SELECT 1`;
  } catch (e) {
    base = "caida";
    // El mensaje de Prisma puede llevar la cadena de conexión; solo sale la
    // clase del error, que es lo que distingue «no resuelve el host» de
    // «credenciales rechazadas» sin publicar ninguna de las dos.
    detalleBase = e instanceof Error ? e.name : "error desconocido";
    console.error("[salud] la base de datos no responde", e);
  }

  const sano = base === "ok" && entorno.faltanEsenciales.length === 0;

  return NextResponse.json(
    {
      estado: sano ? "sano" : "enfermo",
      base,
      detalleBase,
      // Cuántas, no cuáles: los nombres van a la consola. Ver la nota de arriba.
      faltanEsenciales: entorno.faltanEsenciales.length,
      faltanDeFuncion: entorno.faltanDeFuncion.length,
      duracionMs: Date.now() - inicio,
    },
    {
      status: sano ? 200 : 503,
      // Que ningún proxy guarde la respuesta: un healthcheck cacheado sigue
      // diciendo que todo va bien cinco minutos después de caerse.
      headers: { "cache-control": "no-store" },
    },
  );
}
