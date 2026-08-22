import Link from "next/link";
import { cookies } from "next/headers";

import { Isotipo } from "@/components/Isotipo";
import { COOKIE_DESDE_TELEGRAM } from "@/lib/auth/admin";

/**
 * Armazón del panel.
 *
 * No comprueba la sesión: cada página lo hace por su cuenta. Un guardia en el
 * layout parece más limpio y es más frágil —el layout no envuelve las rutas de
 * `/admin/entrar` ni `/admin/salir`, que son manejadores de ruta, así que quien
 * añadiera otro mañana lo dejaría abierto sin darse cuenta—.
 */

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  /*
   * ¿Se ha entrado desde la Mini App?
   *
   * Si sí, el panel ocupa la pantalla entera DENTRO de Telegram y no hay ninguna
   * puerta de vuelta: ni pestañas, ni barra de direcciones, ni botón atrás del
   * navegador. Sin esta salida, el Operador que entra desde su móvil se queda
   * encerrado en el panel y tiene que cerrar la Mini App entera para volver.
   *
   * La marca no es una credencial —no protege nada— así que se lee y ya: lo peor
   * que puede hacer alguien falseándola es enseñarse a sí mismo un enlace de más.
   */
  const desdeTelegram = (await cookies()).get(COOKIE_DESDE_TELEGRAM)?.value === "1";

  return (
    <div className="panel">
      {/* El marco vive en `admin.css` y no aquí: tiene consulta de medios —en un
          móvil el relleno baja— y un estilo en línea no puede tenerla. 1320 y no
          1080 porque desde que hay tablas de quince columnas el ancho anterior
          obligaba a desplazarse en horizontal para leer una fila. */}
      <div className="marco">
        <header className="cabecera">
          {/* En el escritorio envuelve; en un móvil se convierte en un carril que
              se arrastra. Envolviendo allí también, los seis enlaces y «Cerrar
              sesión» ocupaban tres renglones —«Bonos» solo en uno— y la cabecera
              se comía el primer tercio de la pantalla. La consulta de medios que
              lo arregla está en `admin.css`: un atributo `style` no puede
              tenerla, que es por lo que esto dejó de ir en línea. */}
          <nav className="navegacion">
            {/* El isotipo hace de inicio, y sustituye a la palabra «Panel».
                Un rótulo de navegación que dice «Panel» dentro del panel no
                informa de nada: el sitio ya se sabe. La marca sí dice algo —de
                qué producto es esto— y ocupa el mismo hueco. Toma la tinta del
                enlace, así que sigue al tema del panel sin tocar nada. */}
            <Link
              href="/admin"
              aria-label="Panel de Sophon Promoters"
              style={{ display: "inline-flex", textDecoration: "none", color: "var(--p-tinta)" }}
            >
              <Isotipo ancho={44} />
            </Link>
            <Link href="/admin/agentes" className="apoyo" style={{ textDecoration: "none" }}>
              Agentes
            </Link>
            <Link href="/admin/webmasters" className="apoyo" style={{ textDecoration: "none" }}>
              Webmasters
            </Link>
            <Link href="/admin/retiros" className="apoyo" style={{ textDecoration: "none" }}>
              Retiros
            </Link>
            <Link href="/admin/tarifas" className="apoyo" style={{ textDecoration: "none" }}>
              Tarifas
            </Link>
            <Link href="/admin/bonos" className="apoyo" style={{ textDecoration: "none" }}>
              Bonos
            </Link>
          </nav>
          <div className="salida">
            {desdeTelegram && (
              /* `<a>` y no `<Link>`: la Mini App es OTRO grupo de rutas, con su
                 propia raíz y su propia hoja. El enrutador intentaría montarla
                 dentro del panel; aquí hace falta un documento nuevo. */
              <a href="/" className="apoyo" style={{ textDecoration: "none" }}>
                ← Mi Mini App
              </a>
            )}
            <form action="/admin/salir" method="post">
              <button type="submit" className="apoyo" style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}>
                Cerrar sesión
              </button>
            </form>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
