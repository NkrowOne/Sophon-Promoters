-- El idioma en el que el SERVIDOR le habla al agente.
--
-- La Mini App lo resuelve en cada carga desde `initDataUnsafe`, pero el bot no
-- puede: cuando el superadmin resuelve un retiro no hay ninguna actualización
-- de Telegram de la que leer `language_code`. Sin esta columna, «te hemos
-- pagado» salía en español para todos.
--
-- AlterTable
ALTER TABLE "Agente" ADD COLUMN "idioma" TEXT NOT NULL DEFAULT 'es';
