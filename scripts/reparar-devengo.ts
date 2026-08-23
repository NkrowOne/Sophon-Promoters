/**
 * Devenga las filas que se quedaron sin devengar, desde la línea de órdenes.
 *
 *   npm run devengo:reparar              # en seco: dice qué haría y no toca nada
 *   npm run devengo:reparar -- --aplicar # escribe los asientos
 *
 * ── ESTO NO CORRE EN PRODUCCIÓN, Y ES A PROPÓSITO ──
 *
 * La imagen de despliegue es la salida autocontenida de Next: lleva el servidor
 * y nada más —ni `scripts/`, ni las fuentes de `lib/`—, así que esto muere allí
 * con `Cannot find module`. Se descubrió intentándolo.
 *
 * Por eso la lógica no está aquí sino en `lib/devengo/sin-devengar.ts`, y el
 * camino de verdad es el botón del panel, que la ejecuta dentro del servidor que
 * ya está corriendo. Este guion es para el escritorio —con el repositorio
 * delante y `DATABASE_URL` apuntando a donde toque— y llama a la MISMA función,
 * así que no hay dos implementaciones que puedan divergir.
 */

import { db } from "../lib/db.ts";
import { formatearMicros } from "../lib/devengo/dinero.ts";
import { huecoDeDevengo, repararDevengo } from "../lib/devengo/sin-devengar.ts";

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

  const r = await repararDevengo({ aplicar: APLICAR });

  if (!r.ok) {
    console.error(
      r.motivo === "sin-tarifa"
        ? "\nNo hay tarifa en vigor, así que no hay con qué devengar. Configúrala en " +
            "/admin/tarifas y vuelve a ejecutar esto."
        : "\nLa tarifa en vigor está a CERO: 0,00 $ por registro y 0 % de las compras. " +
            "Devengar con ella escribiría asientos de cero. Corrígela en /admin/tarifas.",
    );
    process.exitCode = 1;
    return;
  }

  for (const d of r.detalle) {
    console.log(
      `  ${d.fecha}  ${d.email.padEnd(34)} ${d.tipo.padEnd(6)} ` +
        `${formatearMicros(d.importeMicros).padStart(10)}`,
    );
  }
  if (r.asientos > r.detalle.length) {
    console.log(`  … y ${r.asientos - r.detalle.length} más.`);
  }

  console.log(
    `\n${r.asientos} ${r.asientos === 1 ? "asiento" : "asientos"}, ` +
      `${formatearMicros(r.importeMicros)} en total.`,
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
