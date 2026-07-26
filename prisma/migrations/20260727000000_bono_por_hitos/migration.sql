-- El bono mensual por hitos de registros.
--
-- El agente cobra un premio si los webmasters de su red acumulan X registros
-- dentro del mes natural. No es acumulable —alcanzar el escalón más alto paga su
-- recompensa, no la suma de todas— y el contador se resetea cada mes.
--
-- `ADD VALUE` va SOLO en esta sentencia y sin usarse después en la misma
-- transacción: Postgres permite añadir un valor a un enum dentro de una, pero no
-- utilizarlo hasta que confirme. Las tablas de abajo no lo mencionan.
--
-- AlterEnum
ALTER TYPE "TipoAsiento" ADD VALUE 'BONO';

-- La escalera vigente, versionada igual que `TarifaVersion` y por el mismo
-- motivo: los asientos ya emitidos apuntan a su escalón, así que editar uno en
-- sitio reescribiría la explicación de dinero ya pagado.
--
-- CreateTable
CREATE TABLE "BonoVersion" (
    "id" TEXT NOT NULL,
    "validaDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validaHasta" TIMESTAMP(3),
    "creadoPorId" TEXT,
    "nota" TEXT,

    CONSTRAINT "BonoVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonoEscalon" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "usuarios" INTEGER NOT NULL,
    "recompensaMicros" BIGINT NOT NULL,

    CONSTRAINT "BonoEscalon_pkey" PRIMARY KEY ("id")
);

-- El escalón que explica cada asiento de BONO. Nulo en los demás tipos.
--
-- AlterTable
ALTER TABLE "AsientoComision" ADD COLUMN "bonoEscalonId" TEXT;

-- CreateIndex
CREATE INDEX "BonoVersion_validaDesde_validaHasta_idx" ON "BonoVersion"("validaDesde", "validaHasta");

-- CreateIndex
CREATE INDEX "BonoEscalon_versionId_idx" ON "BonoEscalon"("versionId");

-- Dos escalones con el mismo umbral en una misma versión serían ambiguos: el
-- devengo no sabría cuál de los dos paga.
--
-- CreateIndex
CREATE UNIQUE INDEX "BonoEscalon_versionId_usuarios_key" ON "BonoEscalon"("versionId", "usuarios");

-- AddForeignKey
ALTER TABLE "BonoEscalon" ADD CONSTRAINT "BonoEscalon_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "BonoVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ON DELETE SET NULL y no CASCADE: borrar una escalera no puede llevarse por
-- delante los asientos que pagó. El ledger es append-only.
--
-- AddForeignKey
ALTER TABLE "AsientoComision" ADD CONSTRAINT "AsientoComision_bonoEscalonId_fkey" FOREIGN KEY ("bonoEscalonId") REFERENCES "BonoEscalon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
