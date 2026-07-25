/**
 * Diagnóstico de la integración con Sophon.
 *
 * Responde de un vistazo a las preguntas que, si se dan por supuestas, hacen
 * perder horas: ¿la cuenta está en la whitelist?, ¿en qué `partnerLevel` está y
 * por tanto qué tarifas se le aplican?, ¿los endpoints devuelven la forma que
 * espera el cliente?
 *
 * Se ejecuta con `npm run sophon:diagnostico`. No escribe nada: solo lee.
 */

import { ClienteSophon, ErrorSophon } from "../lib/sophon/cliente.ts";
import { formatearMicros, microsDesdeCadena } from "../lib/devengo/dinero.ts";
import { NivelAfiliado } from "../lib/sophon/tipos.ts";

const VERDE = "[32m";
const ROJO = "[31m";
const AMBAR = "[33m";
const GRIS = "[90m";
const FIN = "[0m";

function titulo(t: string): void {
  console.log(`\n${GRIS}${"─".repeat(64)}${FIN}\n  ${t}`);
}

function ok(t: string): void {
  console.log(`  ${VERDE}✓${FIN} ${t}`);
}
function mal(t: string): void {
  console.log(`  ${ROJO}✗${FIN} ${t}`);
}
function aviso(t: string): void {
  console.log(`  ${AMBAR}!${FIN} ${t}`);
}

async function main(): Promise<void> {
  const email = process.env["SOPHON_EMAIL"];
  const password = process.env["SOPHON_PASSWORD"];
  if (!email || !password) {
    mal("Faltan SOPHON_EMAIL y SOPHON_PASSWORD en el entorno.");
    process.exit(1);
  }

  const cliente = new ClienteSophon({
    email,
    password,
    host: process.env["SOPHON_HOST"],
  });

  titulo(`Cuenta: ${email}`);
  try {
    await cliente.token();
    ok("Token de partner obtenido (válido 7 días).");
  } catch (e) {
    mal(`No se pudo autenticar: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  // ── Whitelist: el prerrequisito de todo lo que escribe ──────────────────
  titulo("Whitelist del Tool API");
  try {
    const estado = await cliente.estadoSubAfiliados("");
    ok(
      `Activa. ${estado.summary.total} sub-afiliados: ` +
        `${estado.summary.active} activos, ${estado.summary.locked} bloqueados, ` +
        `${estado.summary.pendingDeletion} pendientes de borrado.`,
    );
  } catch (e) {
    if (e instanceof ErrorSophon && e.esFaltaWhitelist) {
      mal("NO activa: Sophon responde «caller not in allowed list».");
      aviso("Activar webmasters fallará hasta que soporte la habilite, y con ello el año\n  de PRO que va incluido en cada alta.");
      aviso("El resto de la aplicación (lecturas, devengo, panel) sí funciona.");
    } else {
      mal(`Error inesperado: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── Nivel y tarifas: determinan cuánto se cobra por registro ────────────
  titulo("Nivel de partner y tarifas vigentes");
  try {
    const resumen = await cliente.resumenRegistros(NivelAfiliado.Total);
    ok(`partnerLevel = ${resumen.partnerLevel}`);
    console.log(
      `    ingresos totales ${formatearMicros(microsDesdeCadena(resumen.totalRevenue))} · ` +
        `hoy ${formatearMicros(microsDesdeCadena(resumen.todayRevenue))} · ` +
        `${resumen.countRegister} registros`,
    );
    console.log(
      `    pago mensual acumulado de invitados: ` +
        `${formatearMicros(microsDesdeCadena(resumen.monthlyInvitedUsersPaid))}`,
    );

    const tarifas = await cliente.tarifas();
    for (const region of tarifas.regionLevelPrices) {
      const precio = region.levelPrice.find((p) => p.partnerLevel === resumen.partnerLevel);
      const paises = region.region.split(",").length;
      console.log(
        `    ${region.classification}: ${precio?.unitPrice ?? "?"} $/registro ` +
          `${GRIS}(${paises} países)${FIN}`,
      );
    }
  } catch (e) {
    mal(`No se pudieron leer nivel ni tarifas: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── Forma de las respuestas: detecta cambios de la API antes de que rompan ──
  titulo("Forma de las respuestas");
  const hasta = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env["ZONA_HORARIA"] ?? "Europe/Madrid",
  }).format(new Date());
  const desde = new Date(Date.parse(`${hasta}T00:00:00Z`) - 30 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  try {
    const pagina = await cliente.detalleRegistros({
      desde,
      hasta,
      nivel: NivelAfiliado.Total,
      agruparPorWebmaster: true,
      tamano: 5,
    });
    const fila = pagina.registers?.[0];
    if (!fila) {
      aviso(`Sin filas entre ${desde} y ${hasta}. La cuenta puede no tener actividad.`);
    } else {
      const esperados = [
        "email",
        "countRegister",
        "countT1Register",
        "countT2Register",
        "countT3Register",
        "countPayingUsers",
        "paymentAmount",
        "myEarning",
        "date",
      ];
      const faltan = esperados.filter((c) => !(c in fila));
      if (faltan.length === 0) ok(`Todos los campos esperados presentes (${esperados.length}).`);
      else mal(`Faltan campos en cpacps/detail/register: ${faltan.join(", ")}`);
      console.log(`    total de filas en el rango: ${pagina.pagePagination?.total ?? "?"}`);
    }
  } catch (e) {
    mal(`detalle/register falló: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── Tesorería de la cuenta maestra ──────────────────────────────────────
  // No se consultan los retiros de Sophon: los agentes no retiran allí y sus
  // pagos los hace el superadmin a mano. Aquí solo interesa cuánto hay.
  titulo("Tesorería de la cuenta maestra");
  try {
    const t = await cliente.tesoreria();
    console.log(`    generado en total: ${formatearMicros(microsDesdeCadena(t.total))}`);
    console.log(`    en proceso:        ${formatearMicros(microsDesdeCadena(t.processing))}`);
    console.log(`    disponible:        ${formatearMicros(microsDesdeCadena(t.withdrawable))}`);
    ok("Leída correctamente.");
    aviso("El cuadre real es Σ ganancias registradas frente a totalRevenue: lo hace el barrido.");
  } catch (e) {
    mal(`No se pudo leer la tesorería: ${e instanceof Error ? e.message : String(e)}`);
  }

  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
