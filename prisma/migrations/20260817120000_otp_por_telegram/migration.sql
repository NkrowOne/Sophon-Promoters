-- Índice para el techo de envíos de OTP por cuenta de Telegram.
--
-- Desde que se puede entrar solo con el correo, el freno de «un OTP por correo
-- cada 60 s» no basta: cada dirección estrena su propio contador, así que un
-- mismo Telegram puede recorrer una lista de correos sin chocar con él ni una
-- vez. `/api/auth/codigo` añade por eso un techo por cuenta —cinco envíos cada
-- quince minutos— que se calcula así:
--
--     SELECT count(*) FROM "CodigoOtp"
--      WHERE "telegramId" = $1 AND "creadoEn" > now() - interval '15 minutes'
--
-- Sin índice eso es un recorrido de la tabla entera, y esta tabla crece con cada
-- intento de entrada de todos los agentes. O sea que el freno contra el abuso
-- sería precisamente lo más caro de servir el día que alguien abusara: la forma
-- más tonta de convertir una defensa en el ataque.
CREATE INDEX "CodigoOtp_telegramId_creadoEn_idx"
    ON "CodigoOtp" ("telegramId", "creadoEn");
