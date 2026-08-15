-- El cerrojo de los barridos deja de ser un bloqueo consultivo de Postgres y
-- pasa a ser una fila.
--
-- Los consultivos son por SESIÓN y Prisma reparte las consultas entre las
-- conexiones de un pool, así que `pg_try_advisory_lock` se ejecutaba en una
-- conexión y `pg_advisory_unlock` en otra. El log de la base lo cantaba:
--
--     WARNING: you don't own a lock of type ExclusiveLock
--
-- Lo grave no era el aviso, sino que el bloqueo de la primera conexión no se
-- soltaba nunca: a partir de ahí todos los barridos se saltaban en silencio y el
-- devengado se habría quedado clavado sin un solo error.
CREATE TABLE "Cerrojo" (
    "clave" TEXT NOT NULL,
    "duenno" TEXT NOT NULL,
    "tomadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cerrojo_pkey" PRIMARY KEY ("clave")
);

CREATE INDEX "Cerrojo_expiraEn_idx" ON "Cerrojo"("expiraEn");
