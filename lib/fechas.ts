/**
 * Fechas de la zona contable.
 *
 * `inicioDelMes` vivía en `lib/pro/conceder.ts`, que importa `db` y
 * `clienteSophon`. El devengo del bono la necesita y es un módulo **puro**, así
 * que usarla desde allí habría arrastrado la base de datos y el cliente de
 * Sophon a un fichero cuyo valor entero es no tener ninguna dependencia.
 *
 * El corte contable es una decisión declarada del §5.9 y vive en `ZONA_HORARIA`.
 * El contenedor va en UTC a propósito (ver `docker-compose.yml`): el reparto por
 * día lo hace la aplicación, no la base de datos, para que no haya dos
 * respuestas a «¿de qué día es este devengo?».
 */

/**
 * El día contable es el de SOPHON, y por eso es UTC+8.
 *
 * Sophon cierra su día a las 00:00 UTC+8 y publica entonces los contadores del
 * día anterior. La etiqueta de fecha de cada fila —`fila.date`, que es el hecho
 * contable de este sistema— viene de ellos y se guarda tal cual, así que la
 * única forma de que «hoy» signifique lo mismo a los dos lados del cable es
 * cortar el día donde lo cortan ellos.
 *
 * Estaba en `Europe/Madrid`, y eso metía un desfase de siete u ocho horas: entre
 * las 16:00 UTC y la medianoche de Madrid, Sophon ya iba por el día siguiente y
 * la aplicación seguía llamando «hoy» al anterior. Consecuencias medibles: la
 * ventana de revisión pedía `endAt` de un día que ya no era el último, el mes
 * del bono se reiniciaba con horas de retraso respecto al contador real, y una
 * sincronización disparada justo después del cierre de Sophon no llegaba a
 * leer lo que Sophon acababa de publicar.
 *
 * **`Asia/Shanghai` y no un `+08:00` a mano** porque es UTC+8 todo el año, sin
 * horario de verano: el desdoble estacional que obligaba a advertir sobre las
 * madrugadas del día 1 en Madrid deja de existir.
 */
export const ZONA_POR_DEFECTO = "Asia/Shanghai";

function zona(): string {
  return process.env["ZONA_HORARIA"] ?? ZONA_POR_DEFECTO;
}

/**
 * El instante UTC en que empieza un día contable.
 *
 * Existe porque comparar una fecha contable contra `` `${fecha}T00:00:00Z` ``
 * solo es correcto cuando la zona contable ES UTC, y la nuestra no lo es. Con
 * Madrid ese atajo desplazaba una o dos horas; con UTC+8 desplaza ocho, y ahí
 * deja de ser un matiz: un cerrojo diario que compare así **no cierra durante
 * las ocho primeras horas de cada día**.
 *
 * Sirve para columnas de INSTANTE (`creadoEn`, `iniciadaEn`). Para las columnas
 * `@db.Date` —`fecha`, `fechaDevengo`— sigue valiendo `inicioDeMes` y la
 * medianoche UTC, porque ahí la fecha es una etiqueta, no un momento.
 */
export function inicioDelDiaContable(fecha: string): Date {
  // Se busca el desfase real de la zona ese día concreto: pedirle a `Intl` que
  // formatee un instante conocido y ver en qué hora local cae. Así funciona
  // igual con zonas de horario de verano si algún día se cambia.
  const medianocheUtc = Date.parse(`${fecha}T00:00:00Z`);
  const enZona = new Intl.DateTimeFormat("en-CA", {
    timeZone: zona(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(medianocheUtc));

  const parte = (tipo: string) => Number(enZona.find((p) => p.type === tipo)?.value ?? 0);
  const comoUtc = Date.UTC(
    parte("year"),
    parte("month") - 1,
    parte("day"),
    parte("hour") % 24,
    parte("minute"),
    parte("second"),
  );

  return new Date(medianocheUtc - (comoUtc - medianocheUtc));
}

/**
 * El mes contable de hoy, en `AAAA-MM`.
 *
 * `en-CA` da directamente `AAAA-MM-DD`, que es el formato que ordena
 * léxicamente y el que habla la API de Sophon.
 */
export function mesContable(momento: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona() }).format(momento).slice(0, 7);
}

/** El mes natural al que pertenece una fecha `AAAA-MM-DD`. */
export function mesDe(fecha: string): string {
  return fecha.slice(0, 7);
}

/**
 * Primer instante de un mes `AAAA-MM`, como medianoche UTC.
 *
 * Es lo correcto para comparar contra `FilaDiariaSophon.fecha` y
 * `AsientoComision.fechaDevengo`, que son columnas `@db.Date` y se guardan
 * precisamente como medianoche UTC. **No** lo es para columnas de instante como
 * `creadoEn`: ahí, en horario de verano de Madrid, lo creado entre las 00:00 y
 * las 02:00 del día 1 caería en el mes anterior.
 */
export function inicioDeMes(mes: string): Date {
  return new Date(`${mes}-01T00:00:00Z`);
}

/** Primer instante del mes SIGUIENTE a `mes`. El extremo abierto de un rango. */
export function inicioDelMesSiguiente(mes: string): Date {
  const [anio, m] = mes.split("-").map(Number) as [number, number];
  return m === 12
    ? new Date(`${anio + 1}-01-01T00:00:00Z`)
    : new Date(`${anio}-${String(m + 1).padStart(2, "0")}-01T00:00:00Z`);
}

/** El mes anterior a `mes`, en `AAAA-MM`. */
export function mesAnterior(mes: string): string {
  const [anio, m] = mes.split("-").map(Number) as [number, number];
  return m === 1 ? `${anio - 1}-12` : `${anio}-${String(m - 1).padStart(2, "0")}`;
}

/**
 * Primer instante del mes en curso.
 *
 * Se conserva con este nombre porque ya la usaba
 * `app/(admin)/admin/agentes/page.tsx` para contar las altas del mes.
 */
export function inicioDelMes(): Date {
  return inicioDeMes(mesContable());
}

/** Cuántos días tiene `mes`. Sale de la resta, así que los bisiestos salen solos. */
export function diasDelMes(mes: string): number {
  const desde = inicioDeMes(mes).getTime();
  const hasta = inicioDelMesSiguiente(mes).getTime();
  return Math.round((hasta - desde) / 86_400_000);
}

/**
 * En qué día del mes va `fecha`, contando desde 1.
 *
 * Es el DENOMINADOR del ritmo, y por eso cuenta el día en curso: a media
 * mañana del día 4 se llevan cuatro días de trabajo, no tres. Dividir entre los
 * días ya cerrados exageraría el ritmo cada mañana y lo devolvería a su sitio
 * cada noche, que es la clase de cifra que nadie se cree la segunda vez.
 */
export function diaDelMes(fecha: string): number {
  return Number(fecha.slice(8, 10));
}

/**
 * Días que quedan del mes contando hoy, que es como los cuenta cualquiera.
 *
 * El último día del mes devuelve 1 —«hoy»— y nunca 0: mientras el mes esté
 * abierto queda margen, y un contador a cero un día que todavía suma registros
 * diría lo contrario.
 */
export function diasQueQuedanDelMes(fecha: string): number {
  return diasDelMes(mesDe(fecha)) - diaDelMes(fecha) + 1;
}
