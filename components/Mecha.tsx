/**
 * La Mecha: cuánto le queda de PRO a un webmaster.
 *
 * `membership_end_at` no se puede consultar en la API de Sophon —solo llega en
 * la respuesta de conceder—, así que este dato solo existe porque la app lo
 * guardó. Es la única alarma temporal de toda la aplicación y merece una pieza
 * propia.
 *
 * **Por qué marcas y no una barra de progreso.** Una barra continua contesta
 * «¿qué proporción queda?», y esa no es la pregunta: la pregunta es «¿cuántos
 * días?». Con marcas discretas —una por día— los plazos cortos se CUENTAN de un
 * vistazo, que es justo cuando el plazo importa. Cuando quedan meses, las marcas
 * pasan a semanas y el rótulo cambia de unidad con ellas: nadie cuenta 300 días
 * uno a uno, se piensa en semanas.
 *
 * Lo consumido no se borra: queda como marcas apagadas a la izquierda, para que
 * se vea cuánto se concedió y no solo cuánto resta.
 */

/**
 * Las marcas tienen PASO FIJO, no `flex`.
 *
 * La primera versión las repartía con `flex-1` y salió al revés de lo que
 * pretendía: siete días quedaban como siete bloques anchos ocupando toda la
 * pantalla, y cuarenta y seis semanas, como cuarenta y seis marcas finas
 * ocupando exactamente lo mismo. Los dos plazos medían igual, que es justo lo
 * que una mecha no puede hacer. Con paso fijo, la longitud de lo encendido ES
 * el tiempo que queda, y se acorta a medida que se consume.
 */
const PASO_PX = 5;
const ANCHO_MARCA_PX = 3;
/** Tope de marcas que caben en el ancho útil de un móvil de 390 px. */
const MARCAS_MAXIMAS = 58;
/** Por debajo de este plazo la mecha se marca como urgente. */
export const DIAS_URGENTE = 7;

export function Mecha({
  diasRestantes,
  diasConcedidos,
  vigenteHasta,
  plan,
}: {
  diasRestantes: number;
  diasConcedidos: number | null;
  vigenteHasta: string;
  plan: string | null;
}) {
  const restan = Math.max(0, diasRestantes);
  const caducado = diasRestantes <= 0;
  const urgente = !caducado && restan <= DIAS_URGENTE;

  // Cambio de unidad: se cuenta en días mientras contarlos sea posible y útil.
  // Nadie cuenta trescientos días de uno en uno; se piensa en semanas, y el
  // rótulo cambia con las marcas para que no digan cosas distintas.
  const porSemanas = restan > MARCAS_MAXIMAS;
  const unidad = porSemanas ? 7 : 1;
  const marcasVivas = caducado ? 0 : Math.max(1, Math.ceil(restan / unidad));

  const concedidas =
    diasConcedidos !== null ? Math.max(0, Math.round((diasConcedidos - restan) / unidad)) : 0;
  // El pasado se muestra, pero nunca a costa del futuro: lo gastado se recorta
  // antes que lo que queda, que es el dato que hay que poder contar.
  const marcasGastadas = Math.min(concedidas, Math.max(0, MARCAS_MAXIMAS - marcasVivas));

  return (
    <section aria-label="Tiempo restante de PRO">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-rotulo text-texto-apoyo">
          PRO{plan ? ` · ${plan.replace("vip.", "").toUpperCase()}` : ""}
        </span>
        <span className={`text-apoyo ${urgente || caducado ? "text-vivo" : "text-texto-apoyo"}`}>
          {caducado ? "caducado" : `vence el ${formatoDia(vigenteHasta)}`}
        </span>
      </div>

      <div className="flex h-6 items-stretch" aria-hidden>
        {Array.from({ length: marcasGastadas }, (_, i) => (
          <Marca key={`gastada-${i}`} className="bg-superficie-alta" />
        ))}
        {Array.from({ length: marcasVivas }, (_, i) => (
          <Marca key={`viva-${i}`} className={urgente ? "bg-vivo" : "bg-tinta"} />
        ))}
        {caducado && <span className="w-16 self-end border-b-2 border-vivo" />}
      </div>

      <p className={`mt-2 text-apoyo ${urgente || caducado ? "text-vivo" : ""}`}>
        {caducado ? (
          "El PRO ya ha caducado."
        ) : (
          <>
            <span className="cifra">{porSemanas ? Math.floor(restan / 7) : restan}</span>{" "}
            {porSemanas
              ? Math.floor(restan / 7) === 1
                ? "semana"
                : "semanas"
              : restan === 1
                ? "día"
                : "días"}{" "}
            de PRO
            {urgente ? " — renuévalo antes de que se apague." : "."}
          </>
        )}
      </p>
    </section>
  );
}

/** Una marca de la mecha: paso fijo, para que la longitud mida el tiempo. */
function Marca({ className }: { className: string }) {
  return (
    <span
      className={`shrink-0 ${className}`}
      style={{ width: ANCHO_MARCA_PX, marginRight: PASO_PX - ANCHO_MARCA_PX }}
    />
  );
}

/**
 * Estado sin PRO: la mecha existe pero está sin encender.
 *
 * Se dibuja igualmente, con el raíl hueco, en lugar de ocultar la sección. Un
 * hueco marcado dice «esto puede activarse»; no mostrar nada no dice nada.
 */
export function MechaApagada() {
  return (
    <section aria-label="Sin PRO">
      <p className="text-rotulo mb-2 text-texto-apoyo">PRO</p>
      <div className="flex h-6 items-stretch gap-[2px]" aria-hidden>
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i} className="flex-1 border-b border-borde" />
        ))}
      </div>
      <p className="mt-2 text-apoyo text-texto-apoyo">Sin PRO activo.</p>
    </section>
  );
}

function formatoDia(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a?.slice(2)}`;
}
