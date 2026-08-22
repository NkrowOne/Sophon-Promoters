/**
 * Repara las concesiones que SÍ se hicieron pero se guardaron sin caducidad.
 *
 *   npm run pro:reparar            → solo mira y cuenta, no toca nada
 *   npm run pro:reparar -- --aplicar → escribe
 *
 * ── QUÉ PASÓ ──
 *
 * `setmembership` aceptó la concesión y devolvió un cuerpo del que no se podía
 * leer `membership_end_at`. La aplicación guardaba la concesión como CONFIRMADA
 * con `vigenteHasta = null` y le ponía `proVigenteHasta = null` al webmaster.
 * Resultado: la Malla decía «Sin PRO» de gente que tenía su año y sus 6 TB, y
 * como el guardián de vigencia lee ese mismo campo, la pantalla de renovaciones
 * seguía ofreciendo el botón —cada toque, otro `setmembership` sobre una
 * membresía viva—.
 *
 * `lib/pro/conceder.ts` ya no puede volver a dejarlo a nulo. Esto es para las
 * filas que quedaron escritas antes del arreglo.
 *
 * ── DE DÓNDE SALE LA FECHA ──
 *
 * De `creadoEn + 365 días`, porque el plazo pedido es el único dato cierto que
 * queda: se mandó `duration = SEGUNDOS_UN_ANIO` y Sophon dijo que sí. No hay
 * endpoint que permita consultarle a Sophon la caducidad real de una membresía
 * después de concederla; si lo hubiera, esto no existiría.
 *
 * Cuando un webmaster tiene VARIAS concesiones sin fecha —el caso de los toques
 * repetidos— se toma la ÚLTIMA. Es la respuesta correcta si Sophon SUSTITUYE el
 * plazo, y la conservadora si lo SUMA: en ese caso la membresía real dura más de
 * lo que diremos, que es el error que no le quita nada a nadie.
 *
 * No escribe nada sobre un PRO que ya tenga fecha: si `proVigenteHasta` ya dice
 * algo más lejano, manda lo que hay.
 */

import { db } from "../lib/db.ts";
import { SEGUNDOS_UN_ANIO } from "../lib/sophon/tipos.ts";

const APLICAR = process.argv.includes("--aplicar");
const MS_UN_ANIO = SEGUNDOS_UN_ANIO * 1000;

const VERDE = "\x1b[32m";
const AMBAR = "\x1b[33m";
const GRIS = "\x1b[90m";
const FIN = "\x1b[0m";

const iso = (d: Date) => d.toISOString().slice(0, 10);

async function main(): Promise<void> {
  const rotas = await db.concesionPro.findMany({
    where: { estado: "CONFIRMADA", vigenteHasta: null },
    select: {
      id: true,
      creadoEn: true,
      webmasterId: true,
      webmaster: { select: { emailOriginal: true, proVigenteHasta: true } },
    },
    orderBy: { creadoEn: "asc" },
  });

  if (rotas.length === 0) {
    console.log(`${VERDE}✓${FIN} No hay concesiones confirmadas sin caducidad. Nada que reparar.`);
    return;
  }

  // Por webmaster, porque la fecha del webmaster la decide su ÚLTIMA concesión.
  const porWebmaster = new Map<string, typeof rotas>();
  for (const c of rotas) {
    const lista = porWebmaster.get(c.webmasterId) ?? [];
    lista.push(c);
    porWebmaster.set(c.webmasterId, lista);
  }

  console.log(
    `\n${rotas.length} concesión(es) sin caducidad, de ${porWebmaster.size} webmaster(s).` +
      `${APLICAR ? "" : `  ${GRIS}(simulación: no se escribe nada)${FIN}`}\n`,
  );

  let webmastersTocados = 0;

  for (const [webmasterId, concesiones] of porWebmaster) {
    const ultima = concesiones[concesiones.length - 1]!;
    const correo = ultima.webmaster.emailOriginal;
    const deducida = new Date(ultima.creadoEn.getTime() + MS_UN_ANIO);
    const actual = ultima.webmaster.proVigenteHasta;

    if (concesiones.length > 1) {
      console.log(
        `${AMBAR}!${FIN} ${correo}: ${concesiones.length} concesiones sin fecha ` +
          `${GRIS}(${concesiones.map((c) => iso(c.creadoEn)).join(", ")})${FIN}`,
      );
      console.log(
        `    Se le llamó a setmembership ${concesiones.length} veces. Se toma la última.`,
      );
    }

    // Cada concesión guarda SU propia fecha: son hechos distintos y la tabla es
    // el historial, no el estado.
    for (const c of concesiones) {
      const fin = new Date(c.creadoEn.getTime() + MS_UN_ANIO);
      if (APLICAR) {
        await db.concesionPro.update({
          where: { id: c.id },
          data: {
            vigenteHasta: fin,
            mensaje: "FECHA_DEDUCIDA_EN_REPARACION (respuesta de Sophon sin membership_end_at)",
          },
        });
      }
    }

    const mejora = actual === null || actual.getTime() < deducida.getTime();
    if (!mejora) {
      console.log(
        `${GRIS}·${FIN} ${correo}: el webmaster ya dice ${iso(actual)}, más lejos. Se respeta.`,
      );
      continue;
    }

    if (APLICAR) {
      await db.webmaster.update({
        where: { id: webmasterId },
        data: { proVigenteHasta: deducida },
      });
      await db.auditoria.create({
        data: {
          actorTipo: "SISTEMA",
          actorId: "reparar-pro-sin-fecha",
          accion: "pro.caducidad_reparada",
          recurso: correo,
          detalle: {
            vigenteHasta: deducida.toISOString(),
            concesiones: concesiones.length,
            desde: actual?.toISOString() ?? null,
          },
        },
      });
    }

    webmastersTocados += 1;
    console.log(
      `${VERDE}✓${FIN} ${correo}: ${actual ? iso(actual) : "sin fecha"} → ${iso(deducida)}`,
    );
  }

  console.log(
    `\n${webmastersTocados} webmaster(s) ${APLICAR ? "reparados" : "por reparar"}, ` +
      `${rotas.length} concesión(es).`,
  );
  if (!APLICAR) {
    console.log(`${GRIS}Vuelve a lanzarlo con --aplicar para escribirlo.${FIN}`);
  }
}

try {
  await main();
} finally {
  await db.$disconnect();
}
