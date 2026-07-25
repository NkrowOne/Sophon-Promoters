import Link from "next/link";

/**
 * Ruta que no existe.
 *
 * Pasa de verdad: un enlace guardado de una versión anterior, o un correo de
 * webmaster que ya no está en la red. Dentro del WebView de Telegram no hay
 * barra de direcciones, así que sin esta página el agente se queda mirando el
 * 404 por defecto de Next sin ninguna manera de volver.
 */
export default function NoEncontrado() {
  return (
    <main className="min-h-dvh px-4 pt-16">
      <h1 className="text-titulo">Esa pantalla ya no existe.</h1>
      <p className="mt-2 text-apoyo text-texto-apoyo">
        Puede que el enlace sea de una versión anterior.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-pieza bg-tinta px-5 py-3 text-cuerpo font-semibold text-fondo"
      >
        Ir al inicio
      </Link>
    </main>
  );
}
