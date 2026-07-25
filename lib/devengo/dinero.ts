/**
 * Aritmética monetaria exacta en micros de dólar.
 *
 * Todo el dinero del sistema vive aquí como `bigint` en micros (1 $ = 1.000.000 µ$).
 * Nunca `number`: la API de Sophon devuelve los importes como cadenas decimales
 * ("55842.05", "0.225") y convertirlas a coma flotante introduce un error que se
 * acumula sobre cientos de miles de registros hasta descuadrar la conciliación.
 *
 * Se eligen micros y no céntimos porque las tarifas por registro llegan a la
 * milésima (T2 = 0,275 $) y el reparto al agente aplica porcentajes: con céntimos
 * el redondeo se comería la señal antes de poder repartirla.
 */

/** Micros de dólar que forman una unidad. */
export const MICROS_POR_DOLAR = 1_000_000n;

/** Puntos básicos que forman el 100 %. */
export const BPS_100_POR_CIENTO = 10_000n;

/** Importe en micros de dólar. Alias semántico: el tipo real es `bigint`. */
export type Micros = bigint;

/** Porcentaje en puntos básicos (1 % = 100 bps). */
export type Bps = bigint;

export class ErrorDinero extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorDinero";
  }
}

const PATRON_DECIMAL = /^(-)?(\d*)(?:[.,](\d*))?$/;

/**
 * Convierte una cadena decimal —tal cual la devuelve la API de Sophon— a micros.
 *
 * Trunca hacia cero a partir del sexto decimal en lugar de redondear: un importe
 * con más precisión que el micro solo puede venir de un cálculo intermedio ajeno,
 * y truncar mantiene la propiedad de que la suma de las partes nunca supera al todo.
 */
export function microsDesdeCadena(valor: string | null | undefined): Micros {
  if (valor === null || valor === undefined) return 0n;
  const limpio = valor.trim();
  if (limpio === "" || limpio === "-") return 0n;

  const coincidencia = PATRON_DECIMAL.exec(limpio);
  if (!coincidencia) {
    throw new ErrorDinero(`importe no numérico: ${JSON.stringify(valor)}`);
  }

  const [, signo, enteraCruda, decimalCruda] = coincidencia;
  const entera = enteraCruda === "" ? "0" : (enteraCruda ?? "0");
  const decimal = (decimalCruda ?? "").slice(0, 6).padEnd(6, "0");

  const magnitud = BigInt(entera) * MICROS_POR_DOLAR + BigInt(decimal);
  return signo === "-" ? -magnitud : magnitud;
}

/**
 * Convierte un número entero de unidades (p. ej. un contador de registros) a micros.
 * No acepta decimales: si necesitas un importe fraccionario, usa `microsDesdeCadena`.
 */
export function microsDesdeEntero(unidades: number | bigint): Micros {
  const n = typeof unidades === "bigint" ? unidades : BigInt(Math.trunc(unidades));
  if (typeof unidades === "number" && !Number.isInteger(unidades)) {
    throw new ErrorDinero(`se esperaba un entero, llegó ${unidades}`);
  }
  return n * MICROS_POR_DOLAR;
}

/** Representación decimal exacta con seis decimales, para persistir o depurar. */
export function microsACadena(micros: Micros): string {
  const negativo = micros < 0n;
  const magnitud = negativo ? -micros : micros;
  const entera = magnitud / MICROS_POR_DOLAR;
  const resto = magnitud % MICROS_POR_DOLAR;
  const decimales = resto.toString().padStart(6, "0");
  return `${negativo ? "-" : ""}${entera}.${decimales}`;
}

/**
 * Formatea para mostrar al usuario: coma decimal, separador de millares y `$`
 * pospuesto, que es la convención española que sigue toda la interfaz.
 */
export function formatearMicros(micros: Micros, decimales: 2 | 4 = 2): string {
  const negativo = micros < 0n;
  const magnitud = negativo ? -micros : micros;
  const factor = 10n ** BigInt(6 - decimales);
  // Redondeo al alza a la mitad, solo para presentación: los cálculos usan el valor íntegro.
  const escalado = (magnitud + factor / 2n) / factor;
  const divisor = 10n ** BigInt(decimales);
  const entera = escalado / divisor;
  const resto = (escalado % divisor).toString().padStart(decimales, "0");

  const enteraConMillares = entera
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${negativo ? "−" : ""}${enteraConMillares},${resto} $`;
}

/**
 * Aplica un porcentaje en bps repartiendo el residuo.
 *
 * Devuelve el importe y el residuo que ha quedado sin asignar por el truncado.
 * Quien acumula comisiones sobre muchos eventos debe arrastrar ese residuo
 * (`arrastrarResiduo`) o perderá hasta un micro por operación: sobre cientos de
 * miles de registros eso descuadra la conciliación contra Sophon.
 */
export function aplicarBps(
  base: Micros,
  bps: Bps,
  residuoPrevio: Micros = 0n,
): { importe: Micros; residuo: Micros } {
  if (bps < 0n) throw new ErrorDinero(`bps negativos: ${bps}`);
  const numerador = base * bps + residuoPrevio;
  const importe = numerador / BPS_100_POR_CIENTO;
  const residuo = numerador % BPS_100_POR_CIENTO;
  return { importe, residuo };
}

/**
 * Reparte un importe entre varios pesos sin perder ni un micro.
 * El residuo del truncado se entrega a las primeras posiciones, de modo que
 * la suma de las partes es *exactamente* igual al total.
 */
export function repartir(total: Micros, pesos: readonly bigint[]): Micros[] {
  const suma = pesos.reduce((a, b) => a + b, 0n);
  if (suma <= 0n) throw new ErrorDinero("los pesos deben sumar un valor positivo");

  const partes = pesos.map((p) => (total * p) / suma);
  let repartido = partes.reduce((a, b) => a + b, 0n);
  let sobra = total - repartido;

  // El signo importa: con importes negativos (reversos) el residuo también lo es.
  const paso = sobra >= 0n ? 1n : -1n;
  for (let i = 0; sobra !== 0n && i < partes.length; i++) {
    if (pesos[i] === 0n) continue;
    partes[i] = (partes[i] ?? 0n) + paso;
    sobra -= paso;
  }
  return partes;
}

/** Convierte un porcentaje legible (5, 35, 15) a bps. Acepta un decimal. */
export function bpsDesdePorcentaje(porcentaje: number): Bps {
  const escalado = Math.round(porcentaje * 100);
  if (!Number.isFinite(escalado)) {
    throw new ErrorDinero(`porcentaje inválido: ${porcentaje}`);
  }
  return BigInt(escalado);
}

/** Suma segura de una lista de importes. */
export function sumar(importes: Iterable<Micros>): Micros {
  let total = 0n;
  for (const m of importes) total += m;
  return total;
}

/** Valor absoluto, útil al comparar descuadres contra una tolerancia. */
export function absMicros(micros: Micros): Micros {
  return micros < 0n ? -micros : micros;
}
