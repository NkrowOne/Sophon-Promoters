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
/*
 * ── EL MISMO NOMBRE QUE VE EL AGENTE ──
 *
 * El panel se había inventado su propio vocabulario, y era el de un chat:
 * «desaparecido», «se borra», «nunca tuvo». La Mini App, para los mismos
 * estados, ya decía «Ya no figura en Sophon» y «Baja programada». Dos nombres
 * para lo mismo en dos caras del mismo producto, y el peor de los dos era el que
 * mira el Operador para decidir.
 *
 * «Desaparecido» además no es lo que pasa. Nadie ha desaparecido: Sophon ha
 * dejado de listar esa cuenta en el programa de socios. Puede ser que la
 * borraran, que la desvincularan o que el barrido no la alcanzara — lo único que
 * consta es que no figura, y eso es exactamente lo que dice.
 *
 * «Baja programada» es un plazo abierto por Sophon que todavía no ha vencido: la
 * cuenta sigue viva y todavía se puede parar. Decía «se borra», que se lee como
 * hecho consumado, que es la lectura que hace que nadie intente evitarlo.
 */
const ESTADOS_WEBMASTER: Record<string, { texto: string; tono: Tono }> = {
  ACTIVO: { texto: "activo", tono: "bien" },
  BLOQUEADO: { texto: "bloqueado", tono: "problema" },
  PENDIENTE_BORRADO: { texto: "baja programada", tono: "problema" },
  DESAPARECIDO: { texto: "no figura en Sophon", tono: "problema" },
  PENDIENTE_CONFIRMACION: { texto: "en confirmación", tono: "atencion" },
  DESCONOCIDO: { texto: "sin determinar", tono: "atencion" },
};

export function EstadoWebmaster({ estado }: { estado: string }) {
  const e = ESTADOS_WEBMASTER[estado] ?? { texto: estado.toLowerCase(), tono: "atencion" as Tono };
  return <Senal tono={e.tono}>{e.texto}</Senal>;
}

/*
 * El estado de un agente, con su texto escrito y no deducido del enum.
 *
 * Pintaba `estado.toLowerCase()`, o sea el nombre de la constante en minúsculas.
 * Funciona mientras los nombres se parezcan a palabras y falla el día que
 * alguien añada un `BAJA_VOLUNTARIA`: la pantalla lo enseñaría tal cual. Y «baja»
 * a secas no dice si el agente se ha ido o si le hemos dado de baja nosotros.
 */
const ESTADOS_AGENTE: Record<string, { texto: string; tono: Tono }> = {
  ACTIVO: { texto: "activo", tono: "bien" },
  PENDIENTE: { texto: "pendiente de alta", tono: "atencion" },
  SUSPENDIDO: { texto: "suspendido", tono: "problema" },
  BAJA: { texto: "dado de baja", tono: "problema" },
};

export function EstadoAgente({ estado }: { estado: string }) {
  const e = ESTADOS_AGENTE[estado] ?? { texto: estado.toLowerCase(), tono: "atencion" as Tono };
  return <Senal tono={e.tono}>{e.texto}</Senal>;
}

/**
 * El PRO, en una señal que dice lo ACCIONABLE.
 *
 * «Caduca en 200 días» no es información para el Operador: no hay nada que hacer
 * con ella y ocuparía la misma celda que un «sin PRO», que sí lo es. La misma
 * regla que sigue la Malla del agente.
 *
 * ── Y POR ESO YA NO CUENTA DÍAS ──
 *
 * Ponía «365 d · 2027-08-22». Los días sobraban por lo de arriba, y encima hacían
 * daño: puestos al lado del recuento de concesiones que había en la celda de
 * al lado, la fila entera se leía como si el plazo se hubiera SUMADO. El PRO no
 * acumula —hay uno solo, de 365 días desde la activación— y una pantalla que
 * insinúa lo contrario contradice la única regla de esta aplicación que puede
 * quitarle algo a un webmaster.
 *
 * Queda «activo», que es lo único que hay que saber, con la fecha de liberación
 * detrás y en gris: no es una alarma, es el día en que vuelve a haber botón.
 */
export function SenalPro({
  diasDePro,
  proVigenteHasta,
}: {
  diasDePro: number | null;
  proVigenteHasta: Date | null;
}) {
  // «Sin conceder» y no «nunca tuvo»: nombra el estado del expediente, que es lo
  // que el Operador puede cambiar, y no una carencia del webmaster.
  if (proVigenteHasta === null) return <Senal tono="problema">sin conceder</Senal>;
  if (diasDePro !== null && diasDePro <= 0) return <Senal tono="problema">caducado</Senal>;
  return (
    <Senal tono="bien">
      activo
      <span style={{ fontWeight: 400, opacity: 0.75 }}> · hasta {dia(proVigenteHasta)}</span>
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

/**
 * Un apartado: rótulo con filete, apoyo opcional, y el cuerpo debajo.
 *
 * ── ES LA ÚNICA FORMA DE PARTIR UNA PÁGINA DEL PANEL ──
 *
 * La ficha del agente se leía como siete bloques porque los tenía; la plantilla
 * y la tabla general se leían como una tirada continua porque no. Título,
 * cuatro cifras, filtros, una frase gris y cincuenta filas, todo separado por el
 * mismo hueco: sin un solo filete, no había forma de saber dónde acaba una cosa
 * y empieza otra. Ahora las tres páginas usan esto, y son la misma página.
 *
 * `titulo` acepta un nodo y no solo texto porque el rótulo del apartado a veces
 * ES el dato —«13 webmasters»—, y contar en la cabecera ahorra la frase suelta
 * que antes flotaba entre los filtros y la tabla sin pertenecer a ninguno.
 *
 * Las medidas viven en `admin.css`: en un móvil el hueco de arriba baja, y un
 * atributo `style` no admite consulta de medios.
 */
export function Seccion({
  titulo,
  apoyo,
  children,
}: {
  titulo: React.ReactNode;
  apoyo?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="seccion">
      <p className="rotulo">{titulo}</p>
      {apoyo && <p className="apoyo">{apoyo}</p>}
      <div className="cuerpo">{children}</div>
    </section>
  );
}
