import Link from "next/link";

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
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "1.5rem 1.25rem 4rem" }}>
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
          <nav style={{ display: "flex", gap: "1.25rem", alignItems: "baseline" }}>
            <Link href="/admin" style={{ fontWeight: 600, textDecoration: "none" }}>
              Panel
            </Link>
            <Link href="/admin/agentes" className="apoyo" style={{ textDecoration: "none" }}>
              Agentes
            </Link>
            <Link href="/admin/retiros" className="apoyo" style={{ textDecoration: "none" }}>
              Retiros
            </Link>
            <Link href="/admin/tarifas" className="apoyo" style={{ textDecoration: "none" }}>
              Tarifas
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
