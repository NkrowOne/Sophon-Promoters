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
        <header
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "1rem",
            borderBottom: "1px solid var(--p-borde)",
            paddingBottom: "0.75rem",
            marginBottom: "1.75rem",
            flexWrap: "wrap",
          }}
        >
          {/* `flexWrap` y no una barra rígida: en un móvil los cinco enlaces no
              caben en una línea y sin esto «Bonos» se salía de la pantalla. */}
          <nav style={{ display: "flex", gap: "1rem 1.25rem", alignItems: "center", flexWrap: "wrap" }}>
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
          <form action="/admin/salir" method="post">
            <button type="submit" className="apoyo" style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}>
              Cerrar sesión
            </button>
          </form>
        </header>
        {children}
      </div>
    </div>
  );
}
