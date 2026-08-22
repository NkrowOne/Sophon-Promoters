/**
 * Las piezas del control de mando.
 *
 * Están juntas y no repartidas por las tres páginas porque son el vocabulario:
 * una chapa de estado tiene que decir lo mismo en la plantilla, en la ficha y en
 * la tabla de webmasters. Con tres copias, la primera vez que alguien decida que
 * «sin confirmar» ya no es un problema sino una espera, dos pantallas seguirían
 * pintándolo en rojo.
 *
 * Ninguna es cliente: todo esto se pinta en el servidor. El panel no tiene
 * estado en el navegador —los filtros viven en la URL— y meterle un `use client`
 * a una chapa sería mandar JavaScript para dibujar un borde.
 */

import Link from "next/link";

/** El tono dice qué hacer, no qué es: teñir por teñir apaga los tres colores. */
export type Tono = "neutro" | "bien" | "atencion" | "problema";

/**
 * El estado de algo, dicho con tipografía.
 *
 * Se llamaba `Chapa` y pintaba una píldora: borde, relleno y esquina de 999 px
 * alrededor de cada «activo» o «bloqueado». En una tabla de quince columnas eso
 * eran cuarenta cajas por pantalla, y cuarenta cajas no jerarquizan — suben el
 * ruido de fondo hasta que ninguna destaca.
 *
 * Ahora es peso y color, sin contenedor. Lo normal retrocede en gris; lo que hay
 * que mirar salta en rojo. El ojo encuentra un rojo entre grises mucho antes que
 * una píldora entre píldoras.
 *
 * El nombre cambió con la cosa: `Chapa` describía una forma que ya no existe, y
 * un nombre que miente es peor que un nombre feo.
 */
export function Senal({ tono = "neutro", children }: { tono?: Tono; children: React.ReactNode }) {
  return <span className={tono === "neutro" ? "senal" : `senal ${tono}`}>{children}</span>;
}

/**
 * Varias señales seguidas, separadas por un punto medio.
 *
 * Sin esto se pegan y se leen como una sola frase. El separador lo pone el CSS
 * entre hermanas, así que da igual cuántas haya y no hay que decidir dónde va la
 * coma al pintarlas.
 */
export function Senales({ children }: { children: React.ReactNode }) {
  return <span className="senales">{children}</span>;
}

/**
 * El estado de un webmaster, ya traducido y con su tono.
 *
 * La tabla de traducción vive aquí y no en `lib/i18n.ts` a propósito: el panel
 * es solo para el Operador y va siempre en español, mientras que el catálogo
 * traduce a cinco idiomas para los agentes. Mezclarlos obligaría a mantener en
 * árabe unas cadenas que nadie va a leer nunca.
 */
const ESTADOS_WEBMASTER: Record<string, { texto: string; tono: Tono }> = {
  ACTIVO: { texto: "activo", tono: "bien" },
  BLOQUEADO: { texto: "bloqueado", tono: "problema" },
  // «Baja programada» y no «se borra»: es la misma palabra que ve el agente en
  // su Mini App para este estado, y el panel no puede llamarle de otra forma a lo
  // mismo. Además dice lo que es —un plazo abierto por Sophon, todavía
  // reversible— y no lo que parece: que ya está borrado.
  PENDIENTE_BORRADO: { texto: "baja programada", tono: "problema" },
  DESAPARECIDO: { texto: "desaparecido", tono: "problema" },
  PENDIENTE_CONFIRMACION: { texto: "sin confirmar", tono: "atencion" },
  DESCONOCIDO: { texto: "desconocido", tono: "atencion" },
};

export function EstadoWebmaster({ estado }: { estado: string }) {
  const e = ESTADOS_WEBMASTER[estado] ?? { texto: estado.toLowerCase(), tono: "atencion" as Tono };
  return <Senal tono={e.tono}>{e.texto}</Senal>;
}

const ESTADOS_AGENTE: Record<string, Tono> = {
  ACTIVO: "bien",
  PENDIENTE: "atencion",
  SUSPENDIDO: "problema",
  BAJA: "problema",
};

export function EstadoAgente({ estado }: { estado: string }) {
  return <Senal tono={ESTADOS_AGENTE[estado] ?? "atencion"}>{estado.toLowerCase()}</Senal>;
}

/**
 * El PRO, en una señal que dice lo ACCIONABLE.
 *
 * «Caduca en 200 días» no es información para el Operador: no hay nada que hacer
 * con ella y ocuparía la misma celda que un «sin PRO», que sí lo es. La misma
 * regla que sigue la Malla del agente.
 */
export function SenalPro({
  diasDePro,
  proVigenteHasta,
}: {
  diasDePro: number | null;
  proVigenteHasta: Date | null;
}) {
  if (proVigenteHasta === null) return <Senal tono="problema">nunca tuvo</Senal>;
  if (diasDePro !== null && diasDePro <= 0) return <Senal tono="problema">caducado</Senal>;
  return (
    <Senal tono="bien">
      {diasDePro} d<span style={{ fontWeight: 400, opacity: 0.75 }}> · {dia(proVigenteHasta)}</span>
    </Senal>
  );
}

/**
 * Catorce días de tráfico en 84 píxeles.
 *
 * Escala compartida por toda la tabla, no por fila: con cada fila normalizada a
 * su propio máximo, un webmaster que trae dos registros y otro que trae
 * doscientos dibujan la misma silueta, y la comparación —que es para lo que está
 * la columna— se vuelve mentira.
 */
export function Serie({ valores, maximo }: { valores: readonly number[]; maximo: number }) {
  const tope = Math.max(1, maximo);
  const total = valores.reduce((s, v) => s + v, 0);
  return (
    <span
      className="serie"
      role="img"
      aria-label={`${total} registros en los últimos ${valores.length} días`}
    >
      {valores.map((v, i) => (
        <i
          key={i}
          data-cero={v === 0 ? "si" : "no"}
          style={{ height: v === 0 ? "1px" : `${Math.max(8, (v / tope) * 100)}%` }}
        />
      ))}
    </span>
  );
}

/**
 * Una dirección de correo que envuelve por donde debe.
 *
 * Sin ayuda, el navegador parte por donde le cabe y en un móvil salía
 * `esgabrielcabrera@gmail.` en un renglón y `com` en el siguiente, que se lee
 * como una dirección rota. Un `<wbr>` detrás de la arroba le da el único punto
 * de corte que un correo tiene de verdad: usuario arriba, dominio abajo.
 *
 * No fuerza nada —si cabe entero, cabe entero— y `overflow-wrap` sigue puesto de
 * red por si aparece una dirección sin arroba y más larga que la pantalla.
 */
export function Correo({ valor }: { valor: string }) {
  const corte = valor.lastIndexOf("@");
  if (corte <= 0) return <>{valor}</>;
  return (
    <>
      {valor.slice(0, corte + 1)}
      <wbr />
      {valor.slice(corte + 1)}
    </>
  );
}

/** `AAAA-MM-DD`. Sin hora: en una tabla de veinte columnas la hora es ruido. */
export function dia(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "—";
}

/** Con hora, para lo que pasa varias veces al día: sesiones, intentos, auditoría. */
export function momento(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 16).replace("T", " ") : "—";
}

/**
 * Un número en una celda, con el cero apagado.
 *
 * En una tabla llena de ceros lo que hay que ver es dónde NO lo hay, y un cero
 * con el mismo peso que un 47 obliga a leer las cien celdas para encontrarlo.
 */
export function Num({ valor, sufijo }: { valor: number; sufijo?: string }) {
  if (valor === 0) return <span className="nulo">0</span>;
  return (
    <>
      {valor.toLocaleString("es-ES")}
      {sufijo}
    </>
  );
}

/** Un dato suelto: rótulo arriba, cifra debajo, apoyo opcional. */
export function Dato({
  etiqueta,
  valor,
  apoyo,
  tono,
  href,
  /** Para los datos de segunda fila: el desglose no compite con el total. */
  pequena = false,
}: {
  etiqueta: string;
  valor: React.ReactNode;
  apoyo?: React.ReactNode;
  tono?: "problema";
  href?: string;
  pequena?: boolean;
}) {
  const clases = ["cifra", pequena ? "pequena" : "", tono === "problema" ? "vivo" : ""]
    .filter(Boolean)
    .join(" ");
  const cuerpo = (
    <>
      <p className="rotulo">{etiqueta}</p>
      <p className={clases}>{valor}</p>
      {apoyo && (
        <p className="apoyo" style={{ marginTop: "0.15rem" }}>
          {apoyo}
        </p>
      )}
    </>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: "none" }}>
      {cuerpo}
    </Link>
  ) : (
    <div>{cuerpo}</div>
  );
}

/** Cabecera de sección: rótulo con filete, como el resto del panel. */
export function Seccion({
  titulo,
  apoyo,
  children,
}: {
  titulo: string;
  apoyo?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: "2.25rem" }}>
      <p
        className="rotulo"
        style={{ borderBottom: "1px solid var(--p-borde)", paddingBottom: "0.5rem" }}
      >
        {titulo}
      </p>
      {apoyo && (
        <p className="apoyo" style={{ marginTop: "0.6rem" }}>
          {apoyo}
        </p>
      )}
      <div style={{ marginTop: "0.9rem" }}>{children}</div>
    </section>
  );
}
