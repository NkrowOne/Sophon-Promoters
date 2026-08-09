/**
 * Cliente HTTP de la API de Sophon.
 *
 * Encapsula las trampas de integración verificadas en vivo, para que ninguna
 * vuelva a morder en otra capa:
 *
 *  - Los errores llegan con **HTTP 200 y `code !== 0`**. Mirar el status HTTP
 *    daría por bueno un `caller not in allowed list`.
 *  - Los importes viajan como cadena; se devuelven como cadena y solo el módulo
 *    de dinero los convierte a micros.
 *  - La documentación va en snake_case y la API responde en camelCase.
 *  - El router devuelve **404 ante el método equivocado** y `SYSTEM_ERROR` (999999)
 *    cuando falta un parámetro obligatorio: un 404 no prueba que la ruta no exista.
 *  - Toda respuesta trae cabecera `traceid`; se registra siempre, también en éxito,
 *    porque es lo único que soporte de Sophon puede rastrear.
 */

import {
  type CodigoMembresia,
  NivelAfiliado,
  type PaginaEnlaces,
  type PaginaRegistros,
  type RespuestaSophon,
  type RespuestaSubAfiliados,
  type ResultadoMembresia,
  type ResumenRegistros,
  type TarifasRegion,
  type Tesoreria,
  type TokenPartner,
} from "./tipos.ts";

export const HOST_POR_DEFECTO = "https://tool-api.newsophon.com";

/** Código de éxito del envoltorio de Sophon. */
const CODIGO_OK = 0;
/** Sophon lo devuelve cuando falta un parámetro obligatorio, no cuando algo está roto. */
const CODIGO_ERROR_SISTEMA = 999999;

export class ErrorSophon extends Error {
  // Campos explícitos y no propiedades de parámetro: el modo de type-stripping
  // nativo de Node no soporta esa azúcar sintáctica, y los tests y el script de
  // diagnóstico se ejecutan sin compilar.
  readonly codigo: number;
  readonly ruta: string;
  readonly traceId: string | null;

  constructor(mensaje: string, codigo: number, ruta: string, traceId: string | null) {
    super(mensaje);
    this.name = "ErrorSophon";
    this.codigo = codigo;
    this.ruta = ruta;
    this.traceId = traceId;
  }

  /** El UID del llamante no está autorizado para la Tool API. */
  get esFaltaWhitelist(): boolean {
    return /caller not in allowed list/i.test(this.message);
  }

  /** Falta un parámetro obligatorio: es un fallo nuestro, no de Sophon. */
  get esParametrosIncompletos(): boolean {
    return this.codigo === CODIGO_ERROR_SISTEMA;
  }
}

export interface OpcionesCliente {
  email: string;
  password: string;
  host?: string;
  /** Se invoca en cada llamada; permite volcar `traceid` al log de la aplicación. */
  registrar?: (evento: RegistroLlamada) => void;
  /** Inyectable para los tests. */
  fetchImpl?: typeof fetch;
  ahora?: () => number;
}

export interface RegistroLlamada {
  ruta: string;
  metodo: string;
  codigo: number | null;
  traceId: string | null;
  duracionMs: number;
  intento: number;
  error?: string;
}

interface TokenEnCache {
  token: string;
  expiraEn: number;
}

/** Margen de renovación: se pide token nuevo antes de que caduque de verdad. */
const MARGEN_RENOVACION_MS = 30 * 60 * 1000;
const MAX_INTENTOS = 4;
const ESPERA_BASE_MS = 500;
/** Fallos consecutivos antes de abrir el cortacircuitos. */
const UMBRAL_CORTACIRCUITOS = 5;
const REPOSO_CORTACIRCUITOS_MS = 60_000;

export class ClienteSophon {
  private readonly opciones: OpcionesCliente;
  private readonly host: string;
  private readonly fetchImpl: typeof fetch;
  private readonly ahora: () => number;
  private cache: TokenEnCache | null = null;
  private renovacionEnCurso: Promise<string> | null = null;
  private fallosConsecutivos = 0;
  private abiertoHasta = 0;

  constructor(opciones: OpcionesCliente) {
    this.opciones = opciones;
    this.host = opciones.host ?? HOST_POR_DEFECTO;
    this.fetchImpl = opciones.fetchImpl ?? fetch;
    this.ahora = opciones.ahora ?? (() => Date.now());
  }

  // ─────────────────────────────── Autenticación ───────────────────────────────

  /**
   * Devuelve un token válido, renovándolo si hace falta.
   *
   * Las renovaciones simultáneas comparten la misma promesa: durante una
   * sincronización se lanzan decenas de peticiones a la vez y sin esto cada una
   * pediría su propio token.
   */
  async token(): Promise<string> {
    const cache = this.cache;
    if (cache && cache.expiraEn - MARGEN_RENOVACION_MS > this.ahora()) {
      return cache.token;
    }
    if (this.renovacionEnCurso) return this.renovacionEnCurso;

    this.renovacionEnCurso = this.pedirToken().finally(() => {
      this.renovacionEnCurso = null;
    });
    return this.renovacionEnCurso;
  }

  private async pedirToken(): Promise<string> {
    const datos = await this.peticion<TokenPartner>("POST", "/api/uc/partner/token", {
      cuerpo: { email: this.opciones.email, password: this.opciones.password },
      sinToken: true,
    });
    const segundos = Number(datos.expiresIn) || 604_800;
    this.cache = { token: datos.token, expiraEn: this.ahora() + segundos * 1000 };
    return datos.token;
  }

  /** Descarta el token en caché. Se usa cuando Sophon responde 401 a mitad de un lote. */
  invalidarToken(): void {
    this.cache = null;
  }

  // ───────────────────────────── Datos económicos ─────────────────────────────

  /**
   * Resumen del programa de afiliados.
   *
   * OJO: no confundir con `/api/uc/aff/brief/register`, que es el programa de
   * "invita a un amigo" (mide `rewardStorageBytes`) y devuelve ceros.
   */
  async resumenRegistros(nivel: NivelAfiliado): Promise<ResumenRegistros> {
    return this.peticion<ResumenRegistros>(
      "GET",
      `/api/uc/aff/cpacps/brief/register?affiliate_level=${nivel}`,
    );
  }

  /**
   * Detalle de registros. Es el endpoint que sostiene toda la contabilidad.
   *
   * Sin `groupField` agrupa por fecha; con `groupField=uid` agrupa por webmaster
   * (y fecha), que es lo que permite atribuir a cada agente lo suyo.
   */
  async detalleRegistros(params: {
    desde: string;
    hasta: string;
    nivel: NivelAfiliado;
    emails?: readonly string[];
    agruparPorWebmaster?: boolean;
    pagina?: number;
    tamano?: number;
  }): Promise<PaginaRegistros> {
    const q = new URLSearchParams({
      startAt: params.desde,
      endAt: params.hasta,
      affiliateLevel: String(params.nivel),
      "pagePagination.pageNum": String(params.pagina ?? 1),
      "pagePagination.pageSize": String(params.tamano ?? 200),
    });
    if (params.agruparPorWebmaster) q.set("groupField", "uid");
    // La API acepta varios emails separados por coma. Verificado.
    if (params.emails?.length) q.set("email", params.emails.join(","));

    return this.peticion<PaginaRegistros>(
      "GET",
      `/api/uc/aff/cpacps/detail/register?${q.toString()}`,
    );
  }

  /** Recorre todas las páginas de `detalleRegistros`. */
  async *todosLosRegistros(params: {
    desde: string;
    hasta: string;
    nivel: NivelAfiliado;
    emails?: readonly string[];
    agruparPorWebmaster?: boolean;
    tamano?: number;
  }): AsyncGenerator<PaginaRegistros["registers"][number]> {
    const tamano = params.tamano ?? 200;
    let pagina = 1;
    let vistos = 0;
    let total = Number.POSITIVE_INFINITY;

    while (vistos < total) {
      const p = await this.detalleRegistros({ ...params, pagina, tamano });
      total = Number(p.pagePagination?.total ?? 0);
      const filas = p.registers ?? [];
      if (filas.length === 0) break;
      for (const f of filas) yield f;
      vistos += filas.length;
      pagina++;
    }
  }

  /** Estadísticas por enlace de reparto. Requiere el rango de fechas: si falta, SYSTEM_ERROR. */
  async enlacesReparto(params: {
    desde: string;
    hasta: string;
    emails?: readonly string[];
    pagina?: number;
    tamano?: number;
  }): Promise<PaginaEnlaces> {
    const q = new URLSearchParams({
      startAt: params.desde,
      endAt: params.hasta,
      "pagePagination.pageNum": String(params.pagina ?? 1),
      "pagePagination.pageSize": String(params.tamano ?? 200),
    });
    if (params.emails?.length) q.set("email", params.emails.join(","));
    return this.peticion<PaginaEnlaces>(
      "GET",
      `/api/uc/aff/cpacps/share_link/list?${q.toString()}`,
    );
  }

  /** Tarifas por tier y nivel de partner, más los umbrales de nivel. */
  async tarifas(): Promise<TarifasRegion> {
    return this.peticion<TarifasRegion>("GET", "/api/uc/aff/region/reward");
  }

  /**
   * Tesorería de la cuenta maestra: cuánto ha generado el programa en total,
   * cuánto está en proceso y cuánto queda disponible. Se usa para conciliar
   * contra lo que hemos registrado nosotros.
   *
   * NOTA: los endpoints de retiro de Sophon (`/api/uc/withdraw/*`) NO se usan
   * a propósito. Los agentes no retiran nada en Sophon —no tienen cuenta allí—
   * y sus pagos los hace el Operador a mano desde `SolicitudRetiro`. Añadir
   * aquí el historial de retiros de Sophon mezclaría dos flujos de dinero
   * distintos: el que la plataforma paga al Operador y el que el Operador
   * paga a sus agentes.
   */
  async tesoreria(): Promise<Tesoreria> {
    return this.peticion<Tesoreria>("GET", "/api/uc/aff/brief/revenue");
  }

  // ─────────────────────── Tool API (requiere whitelist) ───────────────────────

  /** Vincula un email como sub-afiliado del titular del token. */
  async vincularSubAfiliado(email: string): Promise<void> {
    await this.peticion<unknown>("POST", "/api/uc/tool/user/bind_sub_aff", {
      cuerpo: { email },
    });
  }

  /** Estado de los sub-afiliados. `size` está topado a 20 por la API. */
  async estadoSubAfiliados(
    filtro: "" | "all" | "non_active" = "",
    pagina = 1,
    tamano = 20,
  ): Promise<RespuestaSubAfiliados> {
    const q = new URLSearchParams({
      page: String(pagina),
      size: String(Math.min(tamano, 20)),
    });
    if (filtro) q.set("filter", filtro);
    return this.peticion<RespuestaSubAfiliados>(
      "GET",
      `/api/uc/tool/sub-aff/status?${q.toString()}`,
    );
  }

  /**
   * Concede una membresía PRO a un sub-afiliado.
   *
   * La respuesta es la **única** fuente de `membership_end_at`: no hay endpoint
   * para consultar la caducidad después, así que hay que persistirla aquí mismo.
   *
   * ⚠️ **`duracionSegundos` es OBLIGATORIO.** Tenía `= 0` por defecto, y ese
   * cero es justo el valor que la documentación de Sophon traduce en **30
   * días** —el código de membresía nombra el plan, `duration` fija el plazo—.
   * Es decir: el defecto que ya costó una corrección entera estaba armado en la
   * firma, esperando al siguiente llamante que no supiera esto. Hoy no explota
   * porque `conceder.ts` siempre pasa el valor; mañana explota en silencio y el
   * agente cree haber regalado un año.
   */
  async concederMembresia(
    email: string,
    codigo: CodigoMembresia,
    duracionSegundos: number,
  ): Promise<ResultadoMembresia> {
    return this.peticion<ResultadoMembresia>("POST", "/api/uc/tool/user/setmembership", {
      cuerpo: { email, membership_code: codigo, duration: duracionSegundos },
    });
  }

  // ────────────────────────────── Fontanería HTTP ──────────────────────────────

  private async peticion<T>(
    metodo: "GET" | "POST",
    ruta: string,
    opts: { cuerpo?: unknown; sinToken?: boolean } = {},
  ): Promise<T> {
    if (this.ahora() < this.abiertoHasta) {
      throw new ErrorSophon(
        "cortacircuitos abierto: demasiados fallos consecutivos contra Sophon",
        -1,
        ruta,
        null,
      );
    }

    let ultimoError: unknown;
    for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
      const inicio = this.ahora();
      let traceId: string | null = null;
      try {
        const cabeceras: Record<string, string> = { "Content-Type": "application/json" };
        if (!opts.sinToken) cabeceras["Authorization"] = `Bearer ${await this.token()}`;

        const respuesta = await this.fetchImpl(this.host + ruta, {
          method: metodo,
          headers: cabeceras,
          body: opts.cuerpo === undefined ? undefined : JSON.stringify(opts.cuerpo),
          signal: AbortSignal.timeout(45_000),
        });
        traceId = respuesta.headers.get("traceid");

        // Un 401 real invalida el token: la siguiente vuelta lo renueva.
        if (respuesta.status === 401 && !opts.sinToken) {
          this.invalidarToken();
          throw new ErrorSophon("token rechazado por Sophon", 401, ruta, traceId);
        }

        const json = (await respuesta.json()) as RespuestaSophon<T>;

        this.opciones.registrar?.({
          ruta,
          metodo,
          codigo: json.code,
          traceId,
          duracionMs: this.ahora() - inicio,
          intento,
        });

        // El punto crítico: el éxito lo marca `code`, nunca el status HTTP.
        if (json.code !== CODIGO_OK) {
          const err = new ErrorSophon(json.msg || `code ${json.code}`, json.code, ruta, traceId);
          // Un parámetro que falta no se arregla reintentando.
          if (err.esParametrosIncompletos || err.esFaltaWhitelist) throw err;
          ultimoError = err;
          if (intento === MAX_INTENTOS) throw err;
          await this.esperar(intento);
          continue;
        }

        this.fallosConsecutivos = 0;
        return json.data as T;
      } catch (e) {
        if (e instanceof ErrorSophon && (e.esParametrosIncompletos || e.esFaltaWhitelist)) {
          this.opciones.registrar?.({
            ruta,
            metodo,
            codigo: e.codigo,
            traceId,
            duracionMs: this.ahora() - inicio,
            intento,
            error: e.message,
          });
          throw e;
        }
        ultimoError = e;
        this.opciones.registrar?.({
          ruta,
          metodo,
          codigo: null,
          traceId,
          duracionMs: this.ahora() - inicio,
          intento,
          error: e instanceof Error ? e.message : String(e),
        });
        if (intento === MAX_INTENTOS) break;
        await this.esperar(intento);
      }
    }

    this.fallosConsecutivos++;
    if (this.fallosConsecutivos >= UMBRAL_CORTACIRCUITOS) {
      this.abiertoHasta = this.ahora() + REPOSO_CORTACIRCUITOS_MS;
      this.fallosConsecutivos = 0;
    }
    throw ultimoError instanceof Error
      ? ultimoError
      : new ErrorSophon(String(ultimoError), -1, ruta, null);
  }

  /** Espera exponencial con jitter, para no sincronizar los reintentos entre procesos. */
  private esperar(intento: number): Promise<void> {
    const base = ESPERA_BASE_MS * 2 ** (intento - 1);
    const jitter = Math.floor(Math.random() * base * 0.3);
    return new Promise((r) => setTimeout(r, base + jitter));
  }
}
