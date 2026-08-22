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
      /*
       * `position: relative` NO es decorativo: contiene al texto alternativo.
       *
       * El `<span>` de abajo va en `position: absolute` para quedar fuera de la
       * vista y seguir leyéndose en voz alta. Sin un ancestro posicionado, su
       * bloque contenedor es el documento entero, así que **se escapa de
       * cualquier contenedor con desplazamiento** en el que esté la cifra: en la
       * tabla de webmasters, los importes de la columna derecha aterrizaban a
       * 750 px del borde izquierdo de la PÁGINA y estiraban el documento medio
       * metro. En un móvil eso es la pantalla saliéndose por la derecha, con la
       * franja de fondo sin pintar y los botones cortados.
       *
       * Se vio midiendo, no leyendo: ningún elemento visible se salía del
       * ancho, y el desbordamiento venía de un span de 1×1 píxel que nadie ve.
       */
      style={{
        position: "relative",
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
        ...style,
      }}
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
