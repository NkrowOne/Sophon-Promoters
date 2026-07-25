-- CreateEnum
CREATE TYPE "MotivoConcesion" AS ENUM ('ALTA', 'RENOVACION');

-- DropIndex
DROP INDEX "ConcesionPro_agenteId_periodoCupo_idx";

-- DropIndex
DROP INDEX "IntentoVinculacion_agenteId_idx";

-- AlterTable
ALTER TABLE "Agente" DROP COLUMN "cupoProMensual",
DROP COLUMN "planesAutorizados",
DROP COLUMN "puedeConcederPro",
ADD COLUMN     "cupoAltasMensual" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "puedeActivarWebmasters" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ConcesionPro" DROP COLUMN "periodoCupo",
ADD COLUMN     "motivo" "MotivoConcesion" NOT NULL,
ALTER COLUMN "duracionSegundos" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Webmaster" DROP COLUMN "proPlanActual";

-- CreateIndex
CREATE INDEX "ConcesionPro_agenteId_creadoEn_idx" ON "ConcesionPro"("agenteId", "creadoEn");

-- CreateIndex
CREATE INDEX "IntentoVinculacion_agenteId_exito_creadoEn_idx" ON "IntentoVinculacion"("agenteId", "exito", "creadoEn");

