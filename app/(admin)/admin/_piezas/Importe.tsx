import { formatearMicros, type Micros } from "@/lib/devengo/dinero";

/**
 * Un importe en el panel.
 *
 * Mismo problema y misma solución que en la Mini App: `formatearMicros`
 * devuelve «42,50 $» y en tipografía monoespaciada ese espacio mide un dígito
 * entero, así que la cifra aparece partida en dos. El panel tiene su propia
 * copia porque no comparte hoja de estilos con la Mini App —vive fuera de
 * Telegram y de Tailwind—, y hacer que una dependiera de la otra habría atado
 * dos interfaces que se despliegan igual pero se miran en sitios distintos.
 */
export function Importe({
  micros,
  className,
  style,
}: {
  micros: Micros;
  className?: string;
  style?: React.CSSProperties;
}) {
  const texto = formatearMicros(micros);
  const numero = texto.replace(/\s*\$$/, "");

  return (
    <span
      className={className}
      style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", ...style }}
    >
      <span aria-hidden>{numero}</span>
      <span aria-hidden style={{ marginLeft: "0.16em", fontSize: "0.82em", color: "var(--p-apoyo)" }}>
        $
      </span>
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {numero} dólares
      </span>
    </span>
  );
}
