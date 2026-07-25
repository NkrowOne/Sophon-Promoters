/**
 * Barrido de tesorería: el control que impide pagar sobre cifras equivocadas.
 *
 * Comprueba dos cuadres independientes y guarda el resultado:
 *
 *  1. **Identidad de Sophon**: `total = Σ retiros + en proceso + disponible`.
 *     Verificada al céntimo contra la cuenta real. Si deja de cumplirse, o
 *     hemos leído mal o Sophon cambió algo; en ambos casos hay que enterarse
 *     antes de liquidar a nadie.
 *
 *  2. **Nuestro ledger contra Sophon**: la suma de lo que hemos registrado como
 *     ganancia total debe coincidir con `totalRevenue`. Si nos separamos, el
 *     devengo a los agentes está construido sobre una base que no cuadra.
 *
 * Un descuadre **no se absorbe**: se guarda con su importe y se marca para que
 * el panel lo muestre. El silencio es el peor resultado posible aquí.
 */

import { db, CERROJO, conCerrojo } from "../db.ts";
import { formatearMicros, microsDesdeCadena, type Micros } from "../devengo/dinero.ts";
import { conciliar, verificarTesoreria } from "../devengo/motor.ts";
import type { ClienteSophon } from "../sophon/cliente.ts";
import { NivelAfiliado } from "../sophon/tipos.ts";

export interface ResultadoTesoreria {
  totalMicros: Micros;
  enProcesoMicros: Micros;
  disponibleMicros: Micros;
  retiradoMicros: Micros;
  /** ¿Cierra la identidad de Sophon? */
  identidadCuadra: boolean;
  /** ¿Cuadra nuestro ledger con el total que declara Sophon? */
  ledgerCuadra: boolean;
  descuadreLedgerMicros: Micros;
  partnerLevel: number;
}

export async function barrerTesoreria(
  cliente: ClienteSophon,
): Promise<ResultadoTesoreria | null> {
  return conCerrojo(CERROJO.SYNC_TESORERIA, async () => {
    const ejecucion = await db.ejecucionSync.create({ data: { tipo: "TESORERIA" } });

    try {
      const [tesoreria, retiros, resumen] = await Promise.all([
        cliente.tesoreria(),
        cliente.historialRetiros(),
        cliente.resumenRegistros(NivelAfiliado.Total),
      ]);

      const totalMicros = microsDesdeCadena(tesoreria.total);
      const enProcesoMicros = microsDesdeCadena(tesoreria.processing);
      const disponibleMicros = microsDesdeCadena(tesoreria.withdrawable);
      const retirosMicros = retiros.map((r) => microsDesdeCadena(r.amount));
      const retiradoMicros = retirosMicros.reduce((a, b) => a + b, 0n);

      const identidad = verificarTesoreria({
        totalMicros,
        enProcesoMicros,
        disponibleMicros,
        retirosMicros,
      });

      // Segundo cuadre: lo que hemos guardado frente a lo que Sophon declara.
      const agregado = await db.filaDiariaSophon.aggregate({
        _sum: { gananciaTotalMicros: true },
      });
      const local = agregado._sum.gananciaTotalMicros ?? 0n;
      const declarado = microsDesdeCadena(resumen.totalRevenue);
      const ledger = conciliar(declarado, [local]);

      await db.conciliacion.create({
        data: {
          totalSophonMicros: declarado,
          totalLocalMicros: local,
          descuadreMicros: ledger.descuadreMicros,
          cuadra: ledger.cuadra && identidad.cuadra,
          detalle: [
            `identidad ${identidad.cuadra ? "OK" : `DESCUADRE ${formatearMicros(identidad.descuadreMicros)}`}`,
            `ledger ${ledger.cuadra ? "OK" : `DESCUADRE ${formatearMicros(ledger.descuadreMicros)}`}`,
            `partnerLevel ${resumen.partnerLevel}`,
          ].join(" · "),
        },
      });

      // El nivel de partner determina la tarifa por registro. Si cambia, se
      // deja constancia: los devengos anteriores conservan el suyo congelado,
      // pero conviene saber desde cuándo aplica el nuevo.
      const nivelGuardado = await db.configuracion.findUnique({
        where: { clave: "sophon.partnerLevel" },
      });
      if (nivelGuardado?.valor !== String(resumen.partnerLevel)) {
        await db.configuracion.upsert({
          where: { clave: "sophon.partnerLevel" },
          create: { clave: "sophon.partnerLevel", valor: String(resumen.partnerLevel) },
          update: { valor: String(resumen.partnerLevel) },
        });
        await db.auditoria.create({
          data: {
            actorTipo: "SISTEMA",
            accion: "sophon.cambio_partner_level",
            detalle: { antes: nivelGuardado?.valor ?? null, despues: resumen.partnerLevel },
          },
        });
      }

      await db.ejecucionSync.update({
        where: { id: ejecucion.id },
        data: {
          estado: identidad.cuadra && ledger.cuadra ? "COMPLETADA" : "PARCIAL",
          terminadaEn: new Date(),
          filasLeidas: retiros.length,
          error:
            identidad.cuadra && ledger.cuadra
              ? null
              : `descuadre: identidad ${formatearMicros(identidad.descuadreMicros)}, ledger ${formatearMicros(ledger.descuadreMicros)}`,
        },
      });

      return {
        totalMicros,
        enProcesoMicros,
        disponibleMicros,
        retiradoMicros,
        identidadCuadra: identidad.cuadra,
        ledgerCuadra: ledger.cuadra,
        descuadreLedgerMicros: ledger.descuadreMicros,
        partnerLevel: resumen.partnerLevel,
      };
    } catch (e) {
      await db.ejecucionSync.update({
        where: { id: ejecucion.id },
        data: {
          estado: "FALLIDA",
          terminadaEn: new Date(),
          error: e instanceof Error ? e.message : String(e),
        },
      });
      throw e;
    }
  });
}
