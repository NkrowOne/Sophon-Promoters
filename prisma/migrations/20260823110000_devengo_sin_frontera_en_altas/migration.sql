-- Quita la frontera de atribución de los webmasters que la aplicación dio de alta.
--
-- `devengaDesde` existe para que un agente no cobre el tráfico que su webmaster
-- ya traía antes de captarlo. Ese caso no puede darse en un alta: el alta
-- rechaza cualquier correo que la aplicación ya conozca (`YA_EN_SOPHON`), así
-- que toda cuenta con origen VINCULADO_APP es una cuenta que no existía.
--
-- Estamparla igual costaba la comisión del primer día, todos los días. El valor
-- se calculaba con `hoyContable()` —el día en la zona contable, UTC+8— mientras
-- que Sophon fecha los registros en el día que acaba de cerrar, así que un alta
-- de la tarde europea dejaba la frontera POR DELANTE de los registros que ese
-- mismo webmaster estaba trayendo:
--
--     registros de Sophon   2026-08-22
--     devengaDesde          2026-08-23   →  «2026-08-22 >= 2026-08-23» es falso
--
-- El agente veía sus registros y 0,00 $. Y el Operador sí cobraba esas filas,
-- porque su ingreso no filtra por esta fecha: se quedaba con el cien por cien de
-- un dinero que entró porque ese agente trajo a ese webmaster.
--
-- Solo VINCULADO_APP. Un huérfano adoptado —HUERFANO, ASIGNADO_MANUAL— sí tiene
-- pasado del que protegerse, y su frontera se queda donde está.
--
-- Los asientos que faltan NO los escribe esta migración: eso es trabajo del
-- motor de devengo, y lo hace el botón «Devengar ahora» de la portada del panel,
-- que pasa las filas por el mismo cálculo que el barrido. Una migración que
-- escribiera asientos sería contabilidad emitida desde un fichero SQL sin tarifa
-- congelada ni clave de idempotencia.
UPDATE "Webmaster"
   SET "devengaDesde" = NULL
 WHERE "origen" = 'VINCULADO_APP'
   AND "devengaDesde" IS NOT NULL;
