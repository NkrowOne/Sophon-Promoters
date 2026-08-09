/**
 * Lo que ve una página del panel sin sesión.
 *
 * Se renderiza en lugar del contenido en vez de redirigir porque una
 * redirección desde un componente de servidor obliga a lanzar, y aquí no hay
 * nada excepcional: no tener sesión es el estado normal de quien no ha entrado.
 *
 * No revela nada de lo que hay detrás.
 */
export function Cerrada() {
  return (
    <div style={{ paddingTop: "2rem", maxWidth: "34rem" }}>
      <h1 style={{ fontSize: "1.3125rem", fontWeight: 600, letterSpacing: "-0.015em" }}>
        Sesión requerida
      </h1>
      <p style={{ marginTop: "0.6rem", fontSize: "0.875rem", lineHeight: 1.6 }}>
        El comando <code>/panel</code> del bot genera un enlace de un solo uso. Solo
        funciona desde el Telegram del Operador.
      </p>
    </div>
  );
}
