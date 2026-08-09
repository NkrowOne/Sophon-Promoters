import type { MetadataRoute } from "next";

/**
 * Nada de esto se indexa. Nada, no «casi nada».
 *
 * El panel ya lo pedía por su cuenta (`robots: { index: false }` en su layout),
 * pero la Mini App no decía nada y por defecto eso significa «indexa lo que
 * quieras». Las pantallas del agente son datos de negocio de otra empresa
 * —correos de webmasters, importes, redes comerciales— y `/alta` es una puerta
 * de entrada que no gana nada con estar en un buscador.
 *
 * Una etiqueta `noindex` por página habría dejado fuera lo que no es página:
 * las rutas de `/api`, los manejadores de `/admin/entrar`. Un `Disallow: /` es
 * la única forma de cubrirlas todas, incluidas las que se añadan mañana.
 *
 * No es una medida de seguridad y no se usa como tal: un robots.txt lo respeta
 * quien quiere. Lo que protege de verdad son la firma del initData y las
 * sesiones; esto solo evita que las URL acaben publicadas.
 */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
