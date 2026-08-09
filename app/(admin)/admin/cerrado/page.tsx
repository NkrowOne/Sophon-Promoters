/**
 * Puerta cerrada.
 *
 * Es lo único del panel que se ve sin sesión, así que no dice nada de lo que
 * hay dentro: ni cuántos agentes hay, ni si el enlace existía. Solo qué hacer
 * ahora, que es lo único útil para quien tiene derecho a entrar y lo único
 * inútil para quien no.
 */

import { MINUTOS_CANJE } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

const MOTIVOS: Record<string, string> = {
  falta: "Enlace incompleto: falta el token de entrada.",
  caducado: `Enlace no válido: ya se ha usado o han pasado sus ${MINUTOS_CANJE} minutos de vigencia.`,
};

export default async function Cerrado({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;

  return (
    <div style={{ paddingTop: "3rem", maxWidth: "34rem" }}>
      <h1 style={{ fontSize: "1.3125rem", fontWeight: 600, letterSpacing: "-0.015em" }}>
        Panel cerrado
      </h1>
      <p className="apoyo" style={{ marginTop: "0.5rem", lineHeight: 1.5 }}>
        {(motivo && MOTIVOS[motivo]) ?? "La sesión ha terminado."}
      </p>
      <p style={{ marginTop: "1.25rem", fontSize: "0.875rem", lineHeight: 1.6 }}>
        El comando <code>/panel</code> del bot genera un enlace nuevo. Solo funciona desde
        el Telegram del Operador.
      </p>
    </div>
  );
}
