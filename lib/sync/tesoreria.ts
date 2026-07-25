/**
 * Barrido de tesorería: el control que impide pagar sobre cifras equivocadas.
 *
 * Cuadra **nuestro ledger contra Sophon**: la suma de lo que hemos registrado
 * como ganancia total debe coincidir con `totalRevenue`. Si nos separamos, el
 * devengo a los agentes está construido sobre una base que no cuadra, y se
 * estaría pagando dinero calculado sobre datos incompletos.
 *
 * Un descuadre **no se absorbe**: se guarda con su importe y marca la ejecución
 * como parcial para que el panel lo muestre. El silencio es el peor resultado
 * posible aquí.
 *
 * NO se consulta el historial de retiros de Sophon. Los agentes no retiran allí
 * —no tienen cuenta— y sus pagos los hace el superadmin a mano contra
 * `SolicitudRetiro`. Son dos flujos de dinero distintos y mezclarlos en el mismo
 * cuadre haría que un movimiento del superadmin en Sophon pareciera un descuadre
 * de las comisiones de sus agentes.
 */

import { db, CERROJO, conCerrojo } from "../db.ts";
import { formatearMicros, microsDesdeCadena, type Micros } from "../devengo/dinero.ts";
import { conciliar } from "../devengo/motor.ts";
import type { ClienteSophon } from "../sophon/cliente.ts";
import { NivelAfiliado } from "../sophon/tipos.ts";

export interface ResultadoTesoreria {
  totalMicros: Micros;
  enProcesoMicros: Micros;
  disponibleMicros: Micros;
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
      const [tesoreria, resumen] = await Promise.all([
        cliente.tesoreria(),
        cliente.resumenRegistros(NivelAfiliado.Total),
      ]);

      const totalMicros = microsDesdeCadena(tesoreria.total);
      const enProcesoMicros = microsDesdeCadena(tesoreria.processing);
      const disponibleMicros = microsDesdeCadena(tesoreria.withdrawable);

      // El cuadre: lo que hemos guardado frente a lo que Sophon declara.
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
          cuadra: ledger.cuadra,
          detalle: [
            `ledger ${ledger.cuadra ? "OK" : `DESCUADRE ${formatearMicros(ledger.descuadreMicros)}`}`,
            `disponible en Sophon ${formatearMicros(disponibleMicros)}`,
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
          estado: ledger.cuadra ? "COMPLETADA" : "PARCIAL",
          terminadaEn: new Date(),
          error: ledger.cuadra
            ? null
            : `descuadre del ledger: ${formatearMicros(ledger.descuadreMicros)}`,
        },
      });

      return {
        totalMicros,
        enProcesoMicros,
        disponibleMicros,
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
