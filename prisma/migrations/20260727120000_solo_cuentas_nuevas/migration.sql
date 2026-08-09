-- Solo cuentas nuevas: se cierra la adopción y se empieza de cero.
--
-- Un agente cobra por lo que capta él, así que solo puede dar de alta cuentas
-- que se registren por él. Todo lo que ya estaba en el programa de socios es del
-- Operador, y hasta ahora un agente podía quedárselo sin más que teclear su
-- correo en «Activar webmaster»: la ruta de alta adoptaba cualquier fila sin
-- agente y le ponía la atribución encima.
--
-- ── 1. La confirmación del registro en el programa de socios ──
--
-- `bind_sub_aff` devuelve un `void`: la única prueba de que vinculó era que no
-- lanzara excepción, y el webmaster se quedaba en `DESCONOCIDO` hasta que
-- pasara el barrido. Esta columna guarda CUÁNDO se comprobó contra Sophon que
-- el webmaster aparece de verdad en el programa. Nula quiere decir «pendiente
-- de confirmar», que es distinto de «comprobado y no está».
ALTER TABLE "Webmaster" ADD COLUMN "confirmadoEn" TIMESTAMP(3);

-- Los que ya llevan estado real de Sophon están confirmados por definición: ese
-- estado solo puede haber salido de `sub-aff/status`, o sea de la lista del
-- programa de socios. Sin esto, todos los webmasters existentes aparecerían de
-- golpe como pendientes.
UPDATE "Webmaster"
SET "confirmadoEn" = COALESCE("vistoPorUltimaVezEn", "creadoEn")
WHERE "estadoSophon" <> 'DESCONOCIDO';

-- ── 2. Empezar de cero ──
--
-- Toda atribución vuelve al Operador. A partir de aquí cada agente reconstruye
-- su red solo con altas nuevas, y como esos correos pasan a ser conocidos por la
-- aplicación, ninguno se puede reclamar: el alta los rechaza antes de llamar a
-- Sophon, y Sophon respondería «already an affiliate» de todos modos.
--
-- **El ledger NO se toca.** `AsientoComision` es append-only y conserva su
-- `agenteId`: lo ya devengado sigue siendo del agente que lo devengó y su
-- cartera no se mueve un céntimo. Esto solo cambia la atribución futura.
UPDATE "Webmaster"
SET "agenteId" = NULL,
    "origen" = 'HUERFANO',
    "atribuidoEn" = NULL,
    "devengaDesde" = NULL
WHERE "agenteId" IS NOT NULL;
