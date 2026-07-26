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

export const ZONA_POR_DEFECTO = "Europe/Madrid";

function zona(): string {
  return process.env["ZONA_HORARIA"] ?? ZONA_POR_DEFECTO;
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
