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
/**
 * Por debajo de este plazo la mecha se marca como urgente.
 *
 * Eran 7 días, calibrados cuando el PRO podía durar uno solo. Ahora dura
 * siempre un año, y avisar con una semana es avisar tarde: el agente tiene que
 * poder hablar con el webmaster antes de que se le apague, no el día antes.
 */
export const DIAS_URGENTE = 30;

/** Lo que necesita traducido. Se pasa desde la pantalla, que ya tiene el catálogo. */
export interface EtiquetasMecha {
  tiempoRestanteDePro: string;
  venceEl: (fecha: string) => string;
  caducado: string;
  diasDePro: (dias: number) => string;
  semanasDePro: (semanas: number) => string;
  renuevaloAntes: string;
  proYaCaducado: string;
  sinProActivo: string;
}

export function Mecha({
  diasRestantes,
  diasConcedidos,
  vigenteHasta,
  etiquetas,
  porSemanas: unidadForzada,
}: {
  diasRestantes: number;
  diasConcedidos: number | null;
  vigenteHasta: string;
  etiquetas: EtiquetasMecha;
  /**
   * Fuerza la unidad de las marcas.
   *
   * Suelta, cada mecha elige la suya y el rótulo la nombra. En una LISTA eso
   * rompe la comparación, que es justo para lo que sirve la lista: con unidad
   * automática, 60 días se dibujan como 9 marcas de semana y 25 días como 25
   * marcas de día, así que el menos urgente parece el más urgente. Quien pinta
   * varias mechas juntas decide una unidad y la impone a todas.
   */
  porSemanas?: boolean;
}) {
  const restan = Math.max(0, diasRestantes);
  const caducado = diasRestantes <= 0;
  const urgente = !caducado && restan <= DIAS_URGENTE;

  // Cambio de unidad: se cuenta en días mientras contarlos sea posible y útil.
  // Nadie cuenta trescientos días de uno en uno; se piensa en semanas, y el
  // rótulo cambia con las marcas para que no digan cosas distintas.
  // La unidad de las MARCAS y la del RÓTULO se deciden por separado.
  //
  // Las marcas comparten vara con las demás mechas de la lista para que las
  // barras se puedan ordenar de un vistazo. El rótulo no tiene ese problema
  // —cada uno se lee solo— y sí tiene el contrario: forzarlo a semanas hacía
  // que «8 días» apareciera como «1 semana», perdiendo precisión justo en el
  // plazo urgente, que es el único donde el día exacto importa.
  const porSemanas = unidadForzada ?? restan > MARCAS_MAXIMAS;
  const rotuloEnSemanas = restan > MARCAS_MAXIMAS;
  const unidad = porSemanas ? 7 : 1;
  const marcasVivas = caducado ? 0 : Math.max(1, Math.ceil(restan / unidad));

  const concedidas =
    diasConcedidos !== null ? Math.max(0, Math.round((diasConcedidos - restan) / unidad)) : 0;
  // El pasado se muestra, pero nunca a costa del futuro: lo gastado se recorta
  // antes que lo que queda, que es el dato que hay que poder contar.
  const marcasGastadas = Math.min(concedidas, Math.max(0, MARCAS_MAXIMAS - marcasVivas));

  return (
    <section aria-label={etiquetas.tiempoRestanteDePro}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        {/* Sin nombre de plan: solo hay uno y rotularlo en cada ficha sería
            repetir «AÑO» por toda la aplicación para no distinguir nada. */}
        <span className="text-rotulo text-texto-apoyo">PRO</span>
        <span className={`text-apoyo ${urgente || caducado ? "text-vivo" : "text-texto-apoyo"}`}>
          {caducado ? etiquetas.caducado : etiquetas.venceEl(formatoDia(vigenteHasta))}
        </span>
      </div>

      <div className="flex h-6 items-stretch" aria-hidden>
        {Array.from({ length: marcasGastadas }, (_, i) => (
          // `bg-borde` y no `bg-superficie-alta`: la parte gastada define la
          // longitud total, que es la referencia contra la que se lee lo que
          // queda. Con el tono de la banda más profunda desaparecía justo
          // dentro de esa banda, y entonces media mecha no medía nada.
          <Marca key={`gastada-${i}`} className="bg-borde" />
        ))}
        {Array.from({ length: marcasVivas }, (_, i) => (
          <Marca key={`viva-${i}`} className={urgente ? "bg-vivo" : "bg-tinta"} />
        ))}
        {caducado && <span className="w-16 self-end border-b-2 border-vivo" />}
      </div>

      <p className={`mt-2 text-apoyo tabular-nums ${urgente || caducado ? "text-vivo" : ""}`}>
        {caducado
          ? etiquetas.proYaCaducado
          : `${
              rotuloEnSemanas
                ? etiquetas.semanasDePro(Math.floor(restan / 7))
                : etiquetas.diasDePro(restan)
            }${urgente ? etiquetas.renuevaloAntes : "."}`}
      </p>
    </section>
  );
}

/**
 * Decide la unidad para un grupo de mechas que se van a ver juntas.
 *
 * La marca la fija el plazo MÁS LARGO del grupo: si el mayor no cabe en días,
 * todas pasan a semanas. Así todas las barras de una lista miden con la misma
 * vara y se pueden ordenar de un vistazo.
 */
export function unidadComun(diasRestantes: readonly (number | null)[]): boolean {
  const mayor = diasRestantes.reduce<number>((a, d) => Math.max(a, d ?? 0), 0);
  return mayor > MARCAS_MAXIMAS;
}

/** Una marca de la mecha: paso fijo, para que la longitud mida el tiempo. */
function Marca({ className }: { className: string }) {
  return (
    <span
      className={`shrink-0 ${className}`}
      // Margen LÓGICO: con `marginRight` la mecha se dibujaría al revés en árabe.
      style={{ width: ANCHO_MARCA_PX, marginInlineEnd: PASO_PX - ANCHO_MARCA_PX }}
    />
  );
}

/**
 * Estado sin PRO: la mecha existe pero está sin encender.
 *
 * Se dibuja igualmente, con el raíl hueco, en lugar de ocultar la sección. Un
 * hueco marcado dice «esto puede activarse»; no mostrar nada no dice nada.
 */
export function MechaApagada({ etiquetas }: { etiquetas: EtiquetasMecha }) {
  return (
    <section aria-label={etiquetas.sinProActivo}>
      <p className="text-rotulo mb-2 text-texto-apoyo">PRO</p>
      <div className="flex h-6 items-stretch gap-[2px]" aria-hidden>
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i} className="flex-1 border-b border-borde" />
        ))}
      </div>
      <p className="mt-2 text-apoyo text-texto-apoyo">{etiquetas.sinProActivo}</p>
    </section>
  );
}

function formatoDia(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a?.slice(2)}`;
}
