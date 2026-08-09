-- «superadmin» pasa a llamarse «Operador».
--
-- Es un renombrado de vocabulario, no un cambio de modelo: el mismo actor, la
-- misma columna, los mismos datos. Por eso las dos sentencias son RENAME y no
-- un par crear/copiar/borrar:
--
--   · `ALTER TYPE ... RENAME VALUE` reetiqueta el valor del enum EN SITIO. Las
--     filas de `Auditoria` ya escritas siguen apuntando al mismo actor sin que
--     haya que reescribir ni una. La alternativa —añadir OPERADOR, migrar las
--     filas, borrar SUPERADMIN— habría necesitado tres pasos y habría dejado un
--     estado intermedio en el que el enum admite dos nombres para lo mismo.
--
--   · `ALTER TABLE ... RENAME COLUMN` conserva los datos, el tipo y los índices.
--
-- Las dos son instantáneas: solo tocan el catálogo de Postgres, no reescriben la
-- tabla. Sobre `FilaDiariaSophon`, que es la tabla que crece sin parar, eso es
-- la diferencia entre un despliegue de un segundo y uno que bloquea la tabla
-- mientras copia millones de filas.
--
-- `ALTER TYPE ... RENAME VALUE` necesita PostgreSQL 10 o superior.
ALTER TYPE "ActorTipo" RENAME VALUE 'SUPERADMIN' TO 'OPERADOR';

ALTER TABLE "FilaDiariaSophon"
  RENAME COLUMN "gananciaSuperadminMicros" TO "gananciaOperadorMicros";
