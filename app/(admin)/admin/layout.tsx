import Link from "next/link";

import { Isotipo } from "@/components/Isotipo";

/**
 * Armazón del panel.
 *
 * No comprueba la sesión: cada página lo hace por su cuenta. Un guardia en el
 * layout parece más limpio y es más frágil —el layout no envuelve las rutas de
 * `/admin/entrar` ni `/admin/salir`, que son manejadores de ruta, así que quien
 * añadiera otro mañana lo dejaría abierto sin darse cuenta—.
 */

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel">
      {/* El marco vive en `admin.css` y no aquí: tiene consulta de medios —en un
          móvil el relleno baja— y un estilo en línea no puede tenerla. 1320 y no
          1080 porque desde que hay tablas de quince columnas el ancho anterior
          obligaba a desplazarse en horizontal para leer una fila. */}
      <div className="marco">
        {/*
          UNA SOLA FILA, Y ENTERA PARA EL MENÚ.

          Aquí había un segundo bloque pegado a la derecha con «← Mi Mini App» y
          «Cerrar sesión». En un escritorio sobraba sitio; en el móvil se comía
          casi la mitad de la cabecera y dejaba el menú cortado en «Webmas…»
          —tres de los seis enlaces no se veían sin arrastrar—.

          El enlace de vuelta se ha ido del todo porque Telegram ya lo pone: la
          Mini App se abre con su propia barra y su «‹ Atrás» nativo justo encima
          de esta línea. Dos botones de volver, uno debajo del otro, no es una
          salida de más: es dudar de cuál es la buena.

          «Cerrar sesión» se queda, pero al final del carril y detrás de un
          filete. Es lo que menos se usa de la cabecera y lo único que no es
          navegación, así que ocupa el sitio que le toca: el último, y sin
          quitarle ancho a lo que sí se pulsa todos los días.
        */}
        <header className="cabecera">
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
            <form action="/admin/salir" method="post" className="salida">
              <button
                type="submit"
                className="apoyo"
                style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}
              >
                Cerrar sesión
              </button>
            </form>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
