/**
 * Tipos de la API de Sophon, verificados en vivo contra la cuenta real el 2026-07-25.
 *
 * Dos avisos que condicionan todo lo de abajo:
 *
 *  1. La documentación oficial usa `snake_case` pero la API responde en `camelCase`
 *     (`region_level_prices` → `regionLevelPrices`, `my_earning` → `myEarning`).
 *     El cliente normaliza ambas formas; aquí se declara la que llega de verdad.
 *
 *  2. Todos los importes y contadores viajan como **cadena**, incluso los enteros
 *     (`"161756"`, `"0.225"`). Se conservan como cadena hasta convertirlos a micros.
 */

/** Envoltorio uniforme de todas las respuestas. `code === 0` es éxito. */
export interface RespuestaSophon<T> {
  code: number;
  msg: string;
  data: T | null;
}

/**
 * Nivel de agregación de `myEarning`, resuelto empíricamente sobre datos reales:
 * con `1` Sophon devuelve la ganancia TOTAL (CPS al 50 %) y con `2` la del
 * WEBMASTER (CPS al 35 %). La diferencia entre ambas es lo que entra al superadmin.
 */
export const NivelAfiliado = {
  /** Ganancia TOTAL del registro (incluye la parte del webmaster y la del superadmin). */
  Total: 1,
  /** Ganancia del WEBMASTER únicamente. */
  Webmaster: 2,
} as const;
export type NivelAfiliado = (typeof NivelAfiliado)[keyof typeof NivelAfiliado];

/** Códigos de membresía. Usan PUNTO, no guion bajo (commit 825d4c1 del repo oficial). */
export const CODIGOS_MEMBRESIA = ["vip.day", "vip.week", "vip.month", "vip.year"] as const;
export type CodigoMembresia = (typeof CODIGOS_MEMBRESIA)[number];

/** Duración por defecto que aplica Sophon cuando `duration` es 0: 30 días. */
export const DURACION_POR_DEFECTO_SEGUNDOS = 2_592_000;

export interface TokenPartner {
  token: string;
  /** Segundos de validez. Observado: "604800" (7 días). */
  expiresIn: string;
}

/** Fila de `cpacps/detail/register`. Es el hecho contable del sistema. */
export interface FilaRegistro {
  /** Vacío cuando la consulta agrupa por fecha; el email del webmaster con `groupField=uid`. */
  email: string;
  countRegister: string;
  countT1Register: string;
  countT2Register: string;
  countT3Register: string;
  countPayingUsers: string;
  paymentAmount: string;
  /** Ganancia calculada por Sophon. El motor devenga con esto, no recalculando. */
  myEarning: string;
  date: string;
}

export interface PaginaRegistros {
  registers: FilaRegistro[];
  pagePagination: { total: string };
}

export interface ResumenRegistros {
  totalRevenue: string;
  todayRevenue: string;
  /** Aquí sí llega como número, no como cadena. */
  countRegister: number;
  partnerLevel: number;
  monthlyInvitedUsersPaid: string;
}

export interface FilaEnlace {
  shareLink: string;
  countRegister: string;
  countPayingUsers: string;
  paymentAmount: string;
  date?: string;
  email?: string;
  shareType: number;
}

export interface PaginaEnlaces {
  shareLinks: FilaEnlace[];
  pagePagination: { total: string };
}

export interface AgenteSophon {
  uid: string;
  email: string;
}

export interface PrecioNivel {
  partnerLevel: number;
  unitPrice: string;
}

export interface PrecioRegion {
  classification: "T1" | "T2" | "T3" | string;
  /** Deprecado según la documentación oficial: usar `levelPrice`. */
  unitPrice: string;
  /** Lista de países separados por coma. */
  region: string;
  levelPrice: PrecioNivel[];
}

export interface RequisitoNivel {
  partnerLevel: number;
  /** Importe de pago mensual acumulado, NO un número de usuarios. */
  minMonthlyInvitedUsersPaid: string;
}

export interface TarifasRegion {
  regionLevelPrices: PrecioRegion[];
  partnerLevelRequires: RequisitoNivel[];
}

export interface Tesoreria {
  total: string;
  processing: string;
  withdrawable: string;
  todayRevenue?: string;
}

/*
 * Los tipos de retiro de Sophon se eliminaron a propósito: los agentes no
 * retiran en Sophon —no tienen cuenta allí— y sus pagos los hace el superadmin
 * a mano. Ver `SolicitudRetiro` en el esquema.
 */

/** Estado de un sub-afiliado. Ojo: la API responde `pendingDeletion` en camelCase. */
export interface ResumenSubAfiliados {
  total: number;
  active: number;
  locked: number;
  pendingDeletion: number;
}

export interface EstadoSubAfiliado {
  email: string;
  status: "active" | "locked" | "pending_deletion" | string;
}

export interface RespuestaSubAfiliados {
  summary: ResumenSubAfiliados;
  items: EstadoSubAfiliado[];
  total: number;
}

export interface ResultadoMembresia {
  uid: string;
  membership_code: string;
  membership_start_at: { seconds?: number } | string;
  /** Única fuente de la fecha de caducidad: hay que persistirla al conceder. */
  membership_end_at: { seconds?: number } | string;
}
