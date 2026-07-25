-- CreateTable
CREATE TABLE "SesionAdmin" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "canjeHash" TEXT,
    "canjeadoEn" TIMESTAMP(3),
    "telegramId" BIGINT NOT NULL,
    "emitidaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "ultimoUsoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revocadaEn" TIMESTAMP(3),
    "ip" TEXT,

    CONSTRAINT "SesionAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SesionAdmin_tokenHash_key" ON "SesionAdmin"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "SesionAdmin_canjeHash_key" ON "SesionAdmin"("canjeHash");

-- CreateIndex
CREATE INDEX "SesionAdmin_expiraEn_idx" ON "SesionAdmin"("expiraEn");

