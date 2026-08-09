-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EstadoAgente" AS ENUM ('PENDIENTE', 'ACTIVO', 'SUSPENDIDO', 'BAJA');

-- CreateEnum
CREATE TYPE "OrigenAtribucion" AS ENUM ('VINCULADO_APP', 'ASIGNADO_MANUAL', 'HUERFANO');

-- CreateEnum
CREATE TYPE "EstadoSophon" AS ENUM ('DESCONOCIDO', 'ACTIVO', 'BLOQUEADO', 'PENDIENTE_BORRADO');

-- CreateEnum
CREATE TYPE "PropositoOtp" AS ENUM ('VINCULAR_CUENTA', 'RECUPERAR_ACCESO');

-- CreateEnum
CREATE TYPE "EstadoConcesion" AS ENUM ('RESERVADA', 'CONFIRMADA', 'FALLIDA');

-- CreateEnum
CREATE TYPE "TipoAsiento" AS ENUM ('CPA', 'CPS', 'AJUSTE_REVERSO', 'AJUSTE_MANUAL', 'RETIRO');

-- CreateEnum
CREATE TYPE "EstadoAsiento" AS ENUM ('PROVISIONAL', 'CONSOLIDADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "EstadoRetiro" AS ENUM ('SOLICITADO', 'APROBADO', 'RECHAZADO', 'PAGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "RedCripto" AS ENUM ('TRC20', 'BSC', 'TON');

-- CreateEnum
CREATE TYPE "TipoSync" AS ENUM ('REGISTROS', 'WEBMASTERS', 'TESORERIA', 'CADUCIDADES', 'TARIFAS');

-- CreateEnum
CREATE TYPE "EstadoSync" AS ENUM ('EN_CURSO', 'COMPLETADA', 'PARCIAL', 'FALLIDA');

-- CreateEnum
CREATE TYPE "ActorTipo" AS ENUM ('AGENTE', 'OPERADOR', 'SISTEMA');

-- CreateTable
CREATE TABLE "Agente" (
    "id" TEXT NOT NULL,
    "emailNormalizado" TEXT NOT NULL,
    "emailOriginal" TEXT NOT NULL,
    "nombreVisible" TEXT NOT NULL,
    "telegramId" BIGINT,
    "telegramUsuario" TEXT,
    "estado" "EstadoAgente" NOT NULL DEFAULT 'PENDIENTE',
    "cpaPorRegistroMicros" BIGINT,
    "cpsBps" INTEGER,
    "puedeConcederPro" BOOLEAN NOT NULL DEFAULT false,
    "planesAutorizados" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cupoProMensual" INTEGER NOT NULL DEFAULT 0,
    "epocaSesion" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SesionAgente" (
    "id" TEXT NOT NULL,
    "agenteId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "epocaSesion" INTEGER NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "emitidaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "ultimoUsoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revocadaEn" TIMESTAMP(3),
    "ip" TEXT,
    "agenteUsuario" TEXT,

    CONSTRAINT "SesionAgente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodigoActivacion" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "emailDestino" TEXT,
    "usosMaximos" INTEGER NOT NULL DEFAULT 1,
    "usosActuales" INTEGER NOT NULL DEFAULT 0,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "anuladoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agenteId" TEXT,

    CONSTRAINT "CodigoActivacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodigoOtp" (
    "id" TEXT NOT NULL,
    "emailNormalizado" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "proposito" "PropositoOtp" NOT NULL,
    "telegramId" BIGINT,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "maxIntentos" INTEGER NOT NULL DEFAULT 5,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "consumidoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodigoOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webmaster" (
    "id" TEXT NOT NULL,
    "emailNormalizado" TEXT NOT NULL,
    "emailOriginal" TEXT NOT NULL,
    "uidSophon" TEXT,
    "agenteId" TEXT,
    "origen" "OrigenAtribucion" NOT NULL DEFAULT 'HUERFANO',
    "atribuidoEn" TIMESTAMP(3),
    "devengaDesde" TIMESTAMP(3),
    "estadoSophon" "EstadoSophon" NOT NULL DEFAULT 'DESCONOCIDO',
    "vistoPorUltimaVezEn" TIMESTAMP(3),
    "desaparecidoEn" TIMESTAMP(3),
    "proVigenteHasta" TIMESTAMP(3),
    "proPlanActual" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webmaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntentoVinculacion" (
    "id" TEXT NOT NULL,
    "emailNormalizado" TEXT NOT NULL,
    "agenteId" TEXT NOT NULL,
    "webmasterId" TEXT,
    "exito" BOOLEAN NOT NULL DEFAULT false,
    "codigoRespuesta" INTEGER,
    "mensaje" TEXT,
    "traceId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltoEn" TIMESTAMP(3),

    CONSTRAINT "IntentoVinculacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilaDiariaSophon" (
    "id" TEXT NOT NULL,
    "webmasterId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "countRegister" INTEGER NOT NULL,
    "countT1Register" INTEGER NOT NULL,
    "countT2Register" INTEGER NOT NULL,
    "countT3Register" INTEGER NOT NULL,
    "countPayingUsers" INTEGER NOT NULL,
    "paymentAmountMicros" BIGINT NOT NULL,
    "gananciaTotalMicros" BIGINT NOT NULL,
    "gananciaWebmasterMicros" BIGINT NOT NULL,
    "gananciaOperadorMicros" BIGINT NOT NULL,
    "cerrado" BOOLEAN NOT NULL DEFAULT false,
    "primeraVezEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimaVezEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilaDiariaSophon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarifaVersion" (
    "id" TEXT NOT NULL,
    "cpaPorRegistroMicros" BIGINT NOT NULL,
    "cpsBps" INTEGER NOT NULL,
    "partnerLevel" INTEGER,
    "validaDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validaHasta" TIMESTAMP(3),
    "creadoPorId" TEXT,
    "nota" TEXT,

    CONSTRAINT "TarifaVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsientoComision" (
    "id" TEXT NOT NULL,
    "agenteId" TEXT NOT NULL,
    "webmasterId" TEXT,
    "filaId" TEXT,
    "tipo" "TipoAsiento" NOT NULL,
    "estado" "EstadoAsiento" NOT NULL DEFAULT 'PROVISIONAL',
    "importeMicros" BIGINT NOT NULL,
    "baseRegistros" INTEGER,
    "baseMicros" BIGINT,
    "tarifaId" TEXT,
    "fechaDevengo" DATE NOT NULL,
    "claveIdempotencia" TEXT NOT NULL,
    "retiroId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nota" TEXT,

    CONSTRAINT "AsientoComision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConcesionPro" (
    "id" TEXT NOT NULL,
    "agenteId" TEXT NOT NULL,
    "webmasterId" TEXT NOT NULL,
    "codigoMembresia" TEXT NOT NULL,
    "duracionSegundos" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoConcesion" NOT NULL DEFAULT 'RESERVADA',
    "vigenteHasta" TIMESTAMP(3),
    "uidSophon" TEXT,
    "periodoCupo" TEXT NOT NULL,
    "claveIdempotencia" TEXT NOT NULL,
    "traceId" TEXT,
    "mensaje" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConcesionPro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudRetiro" (
    "id" TEXT NOT NULL,
    "agenteId" TEXT NOT NULL,
    "importeMicros" BIGINT NOT NULL,
    "red" "RedCripto" NOT NULL,
    "wallet" TEXT NOT NULL,
    "estado" "EstadoRetiro" NOT NULL DEFAULT 'SOLICITADO',
    "solicitadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltoEn" TIMESTAMP(3),
    "resueltoPor" TEXT,
    "motivo" TEXT,
    "referenciaPago" TEXT,
    "claveIdempotencia" TEXT NOT NULL,

    CONSTRAINT "SolicitudRetiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EjecucionSync" (
    "id" TEXT NOT NULL,
    "tipo" "TipoSync" NOT NULL,
    "estado" "EstadoSync" NOT NULL DEFAULT 'EN_CURSO',
    "desde" TIMESTAMP(3),
    "hasta" TIMESTAMP(3),
    "filasLeidas" INTEGER NOT NULL DEFAULT 0,
    "filasEscritas" INTEGER NOT NULL DEFAULT 0,
    "asientosCreados" INTEGER NOT NULL DEFAULT 0,
    "iniciadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminadaEn" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "EjecucionSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conciliacion" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalSophonMicros" BIGINT NOT NULL,
    "totalLocalMicros" BIGINT NOT NULL,
    "descuadreMicros" BIGINT NOT NULL,
    "cuadra" BOOLEAN NOT NULL,
    "detalle" TEXT,

    CONSTRAINT "Conciliacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL,
    "actorTipo" "ActorTipo" NOT NULL,
    "actorId" TEXT,
    "accion" TEXT NOT NULL,
    "recurso" TEXT,
    "detalle" JSONB,
    "ip" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("clave")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agente_emailNormalizado_key" ON "Agente"("emailNormalizado");

-- CreateIndex
CREATE UNIQUE INDEX "Agente_telegramId_key" ON "Agente"("telegramId");

-- CreateIndex
CREATE INDEX "Agente_estado_idx" ON "Agente"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "SesionAgente_tokenHash_key" ON "SesionAgente"("tokenHash");

-- CreateIndex
CREATE INDEX "SesionAgente_agenteId_revocadaEn_idx" ON "SesionAgente"("agenteId", "revocadaEn");

-- CreateIndex
CREATE INDEX "SesionAgente_expiraEn_idx" ON "SesionAgente"("expiraEn");

-- CreateIndex
CREATE UNIQUE INDEX "CodigoActivacion_codigo_key" ON "CodigoActivacion"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "CodigoActivacion_agenteId_key" ON "CodigoActivacion"("agenteId");

-- CreateIndex
CREATE INDEX "CodigoActivacion_expiraEn_anuladoEn_idx" ON "CodigoActivacion"("expiraEn", "anuladoEn");

-- CreateIndex
CREATE INDEX "CodigoOtp_emailNormalizado_proposito_consumidoEn_idx" ON "CodigoOtp"("emailNormalizado", "proposito", "consumidoEn");

-- CreateIndex
CREATE INDEX "CodigoOtp_expiraEn_idx" ON "CodigoOtp"("expiraEn");

-- CreateIndex
CREATE UNIQUE INDEX "Webmaster_emailNormalizado_key" ON "Webmaster"("emailNormalizado");

-- CreateIndex
CREATE UNIQUE INDEX "Webmaster_uidSophon_key" ON "Webmaster"("uidSophon");

-- CreateIndex
CREATE INDEX "Webmaster_agenteId_estadoSophon_idx" ON "Webmaster"("agenteId", "estadoSophon");

-- CreateIndex
CREATE INDEX "Webmaster_proVigenteHasta_idx" ON "Webmaster"("proVigenteHasta");

-- CreateIndex
CREATE INDEX "IntentoVinculacion_emailNormalizado_creadoEn_idx" ON "IntentoVinculacion"("emailNormalizado", "creadoEn");

-- CreateIndex
CREATE INDEX "IntentoVinculacion_agenteId_idx" ON "IntentoVinculacion"("agenteId");

-- CreateIndex
CREATE INDEX "FilaDiariaSophon_fecha_idx" ON "FilaDiariaSophon"("fecha");

-- CreateIndex
CREATE INDEX "FilaDiariaSophon_cerrado_fecha_idx" ON "FilaDiariaSophon"("cerrado", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "FilaDiariaSophon_webmasterId_fecha_key" ON "FilaDiariaSophon"("webmasterId", "fecha");

-- CreateIndex
CREATE INDEX "TarifaVersion_validaDesde_validaHasta_idx" ON "TarifaVersion"("validaDesde", "validaHasta");

-- CreateIndex
CREATE UNIQUE INDEX "AsientoComision_claveIdempotencia_key" ON "AsientoComision"("claveIdempotencia");

-- CreateIndex
CREATE INDEX "AsientoComision_agenteId_fechaDevengo_idx" ON "AsientoComision"("agenteId", "fechaDevengo");

-- CreateIndex
CREATE INDEX "AsientoComision_agenteId_estado_idx" ON "AsientoComision"("agenteId", "estado");

-- CreateIndex
CREATE INDEX "AsientoComision_fechaDevengo_idx" ON "AsientoComision"("fechaDevengo");

-- CreateIndex
CREATE UNIQUE INDEX "ConcesionPro_claveIdempotencia_key" ON "ConcesionPro"("claveIdempotencia");

-- CreateIndex
CREATE INDEX "ConcesionPro_agenteId_periodoCupo_idx" ON "ConcesionPro"("agenteId", "periodoCupo");

-- CreateIndex
CREATE INDEX "ConcesionPro_webmasterId_idx" ON "ConcesionPro"("webmasterId");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudRetiro_claveIdempotencia_key" ON "SolicitudRetiro"("claveIdempotencia");

-- CreateIndex
CREATE INDEX "SolicitudRetiro_agenteId_estado_idx" ON "SolicitudRetiro"("agenteId", "estado");

-- CreateIndex
CREATE INDEX "SolicitudRetiro_estado_solicitadoEn_idx" ON "SolicitudRetiro"("estado", "solicitadoEn");

-- CreateIndex
CREATE INDEX "EjecucionSync_tipo_iniciadaEn_idx" ON "EjecucionSync"("tipo", "iniciadaEn");

-- CreateIndex
CREATE INDEX "Conciliacion_fecha_idx" ON "Conciliacion"("fecha");

-- CreateIndex
CREATE INDEX "Auditoria_actorTipo_actorId_creadoEn_idx" ON "Auditoria"("actorTipo", "actorId", "creadoEn");

-- CreateIndex
CREATE INDEX "Auditoria_accion_creadoEn_idx" ON "Auditoria"("accion", "creadoEn");

-- AddForeignKey
ALTER TABLE "SesionAgente" ADD CONSTRAINT "SesionAgente_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodigoActivacion" ADD CONSTRAINT "CodigoActivacion_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webmaster" ADD CONSTRAINT "Webmaster_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntentoVinculacion" ADD CONSTRAINT "IntentoVinculacion_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntentoVinculacion" ADD CONSTRAINT "IntentoVinculacion_webmasterId_fkey" FOREIGN KEY ("webmasterId") REFERENCES "Webmaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilaDiariaSophon" ADD CONSTRAINT "FilaDiariaSophon_webmasterId_fkey" FOREIGN KEY ("webmasterId") REFERENCES "Webmaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoComision" ADD CONSTRAINT "AsientoComision_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoComision" ADD CONSTRAINT "AsientoComision_webmasterId_fkey" FOREIGN KEY ("webmasterId") REFERENCES "Webmaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoComision" ADD CONSTRAINT "AsientoComision_filaId_fkey" FOREIGN KEY ("filaId") REFERENCES "FilaDiariaSophon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoComision" ADD CONSTRAINT "AsientoComision_tarifaId_fkey" FOREIGN KEY ("tarifaId") REFERENCES "TarifaVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoComision" ADD CONSTRAINT "AsientoComision_retiroId_fkey" FOREIGN KEY ("retiroId") REFERENCES "SolicitudRetiro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConcesionPro" ADD CONSTRAINT "ConcesionPro_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConcesionPro" ADD CONSTRAINT "ConcesionPro_webmasterId_fkey" FOREIGN KEY ("webmasterId") REFERENCES "Webmaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudRetiro" ADD CONSTRAINT "SolicitudRetiro_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

