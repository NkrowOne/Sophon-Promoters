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

/**
 * La forma de una página de registros, que es la que sostiene la contabilidad.
 *
 * Es la validación que más importa de todo el cliente, porque su ausencia no
 * fallaba: **producía ceros**. `json.data as T` no comprueba nada, y si Sophon
 * renombra un campo, aguas abajo `microsDesdeCadena(undefined)` da `0n` y
 * `Number(undefined) || 0` da `0`. El objetivo del devengo cae a cero para todas
 * las filas, el motor lo lee como «Sophon ha revisado el día a la baja» y emite
 * reversos por todo lo asentado. Un cambio de nombre de campo en el proveedor
 * vaciaría el saldo de todos los agentes a la vez, sin un solo error en el log.
 *
 * Se comprueba la PRIMERA fila y no todas: con 200 por página y un barrido cada
 * media hora, recorrerlas enteras cuesta sin añadir nada —si el proveedor cambia
 * el contrato, lo cambia para toda la respuesta, no para la fila 137—.
 *
 * Una página vacía es válida: hay días sin registros.
 */
export function formaDeRegistros(datos: unknown): string | null {
  if (datos === null || typeof datos !== "object") return "`data` no es un objeto";
  const filas = (datos as PaginaRegistros).registers;
  if (filas === undefined || filas === null) return "falta `registers`";
  if (!Array.isArray(filas)) return "`registers` no es una lista";
  if (filas.length === 0) return null;

  const primera = filas[0] as unknown as Record<string, unknown>;
  // Las que el barrido lee para calcular dinero. Si falta una, el devengo de esa
  // fila sale a cero y se convierte en un reverso.
  const exigidas = ["countRegister", "countPayingUsers", "paymentAmount", "myEarning"];
  const ausentes = exigidas.filter((c) => primera[c] === undefined);
  return ausentes.length > 0 ? `a las filas les falta ${ausentes.join(", ")}` : null;
}

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
      // POST, pero pedir un token dos veces no duplica ningún efecto: es la
      // única escritura de este cliente que sí se puede repetir sola.
      idempotente: true,
      validar: (d) =>
        d && typeof (d as TokenPartner).token === "string" && (d as TokenPartner).token.length > 0
          ? null
          : "el token no viene o no es una cadena",
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
      { validar: formaDeRegistros },
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
    /*
     * Se pagina hasta que llega una página corta, y `total` NO manda.
     *
     * Estaba al revés: `while (vistos < total)` con
     * `total = Number(p.pagePagination?.total ?? 0)`. Un campo ausente,
     * renombrado o no numérico daba `0` o `NaN`, y entonces el bucle se paraba
     * TRAS LA PRIMERA PÁGINA sin decir nada. Con 200 filas por página y una red
     * grande, eso son días de registros que el barrido no ve — y lo que no se
     * ve se lee como «ese día no hubo nada», que dispara reversos.
     *
     * La parada fiable es la página corta, y ya estaba escrita dos líneas más
     * abajo. `total` se queda solo como comprobación al final: si no cuadra, se
     * avisa en vez de dar el barrido por bueno en silencio.
     */
    const tamano = params.tamano ?? 200;
    let pagina = 1;
    let vistos = 0;
    let declarado: number | null = null;

    for (;;) {
      const p = await this.detalleRegistros({ ...params, pagina, tamano });
      const bruto = Number(p.pagePagination?.total);
      if (Number.isFinite(bruto) && bruto >= 0) declarado = bruto;
      const filas = p.registers ?? [];
      for (const f of filas) yield f;
      vistos += filas.length;
      // Una página más corta que el tamaño pedido es la última. Es la única
      // señal que no depende de un campo que el proveedor puede renombrar.
      if (filas.length < tamano) break;
      pagina++;
    }

    if (declarado !== null && declarado > 0 && vistos !== declarado) {
      console.warn(
        `[sophon] la paginación no cuadra: ${vistos} filas leídas frente a ${declarado} declaradas`,
      );
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

  /**
   * ¿El envoltorio dice que la sesión ya no vale?
   *
   * Sophon devuelve sus errores con **HTTP 200 y `code !== 0`**, y eso incluye la
   * caducidad de la sesión. La única invalidación que había miraba
   * `respuesta.status === 401`, que en esta API no llega casi nunca, así que el
   * token muerto se quedaba en la caché hasta que expiraba por su cuenta —siete
   * días— y todas las llamadas de por medio fallaban sin que nadie renovara.
   *
   * Se detecta por mensaje porque el catálogo de códigos de Sophon no es
   * público. Es una heurística, y por eso solo puede provocar UNA renovación por
   * petición: si se equivoca, el coste es un token pedido de más.
   */
  private esSesionCaducada(codigo: number, mensaje: string): boolean {
    if (codigo === 401) return true;
    return /token|unauthor|expired|expire|invalid.*(session|credential)|not.*logged/i.test(mensaje);
  }

  private async peticion<T>(
    metodo: "GET" | "POST",
    ruta: string,
    opts: {
      cuerpo?: unknown;
      sinToken?: boolean;
      /**
       * ¿Se puede repetir esta llamada sin duplicar su efecto?
       *
       * Por defecto, solo los GET. **Es la corrección más importante de este
       * fichero.** El bucle reintentaba CUALQUIER llamada hasta cuatro veces,
       * incluidos los dos POST que cambian algo en Sophon —vincular un
       * subafiliado y conceder una membresía—, y un `AbortSignal.timeout` no
       * deshace nada en el servidor: si Sophon ya procesó la escritura y solo se
       * perdió la respuesta, el reintento la manda otra vez.
       *
       * Medido con un `fetch` falso que aborta dos veces: salían **tres** POST
       * de `setmembership`. Y con `bind_sub_aff`, la vinculación buena la hacía
       * el primer intento y el agente recibía «esa cuenta ya era de otro»,
       * porque el segundo se encontraba su propio trabajo hecho.
       *
       * `pedirToken` es POST y sí lo marca: pedir un token dos veces no duplica
       * nada.
       */
      idempotente?: boolean;
      /**
       * Comprueba la FORMA de `data` antes de devolverla.
       *
       * Sin esto, `return json.data as T` es una promesa al compilador y nada
       * más: si Sophon renombra un campo, `data` llega con otra forma, y aguas
       * abajo `microsDesdeCadena(undefined)` da `0n` y `Number(undefined) || 0`
       * da `0`. El objetivo del devengo cae a cero para TODAS las filas y el
       * motor emite reversos por todo lo asentado. Un cambio de nombre de campo
       * en el proveedor vaciaría el saldo de todos los agentes a la vez, y en
       * los registros no habría un solo error.
       *
       * Devuelve el motivo si algo falta, o `null` si la forma es buena.
       */
      validar?: (datos: unknown) => string | null;
    } = {},
  ): Promise<T> {
    if (this.ahora() < this.abiertoHasta) {
      throw new ErrorSophon(
        "cortacircuitos abierto: demasiados fallos consecutivos contra Sophon",
        -1,
        ruta,
        null,
      );
    }

    // Solo los GET se repiten solos. Ver la nota de `idempotente`.
    const sePuedeRepetir = opts.idempotente ?? metodo === "GET";
    // La renovación por sesión caducada va aparte del reintento normal: vale
    // también para las escrituras, porque una llamada rechazada por token no ha
    // llegado a hacer nada, y se permite UNA sola vez para no dar vueltas.
    let yaRenovoToken = false;

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

          /*
           * La sesión ha caducado: se tira el token y se repite UNA vez.
           *
           * Vale también para las escrituras, y no contradice a `idempotente`:
           * una llamada que Sophon rechaza por token no ha llegado a hacer nada,
           * así que repetirla no puede duplicar ningún efecto.
           */
          if (!opts.sinToken && !yaRenovoToken && this.esSesionCaducada(json.code, err.message)) {
            yaRenovoToken = true;
            this.invalidarToken();
            ultimoError = err;
            continue;
          }

          // Una escritura rechazada NO se repite: Sophon ya ha contestado que no,
          // y volver a preguntar solo puede hacer daño si la primera sí entró.
          if (!sePuedeRepetir) throw err;

          ultimoError = err;
          if (intento === MAX_INTENTOS) throw err;
          await this.esperar(intento);
          continue;
        }

        /*
         * La forma se comprueba ANTES de devolver.
         *
         * `json.data as T` no comprueba nada: es una anotación para el
         * compilador. Ver la nota de `validar`: un campo renombrado por el
         * proveedor se convertía en ceros aguas abajo y disparaba reversos por
         * todo lo asentado.
         */
        const queFalta = opts.validar?.(json.data);
        if (queFalta) {
          throw new ErrorSophon(
            `respuesta de Sophon con forma inesperada: ${queFalta}`,
            json.code,
            ruta,
            traceId,
          );
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
        /*
         * UN FALLO DE TRANSPORTE EN UNA ESCRITURA NO SE REINTENTA. NUNCA.
         *
         * Aquí es donde se duplicaban las concesiones de PRO y las
         * vinculaciones. Un timeout o un corte de red no dice «no ha pasado
         * nada»: dice «no sé qué ha pasado», y son cosas distintas. Si Sophon ya
         * procesó el POST y solo se perdió la respuesta, repetirlo lo aplica
         * otra vez — y `conceder.ts` reconoce por escrito que no se sabe si
         * Sophon SUMA o SUSTITUYE el plazo, así que ni siquiera se puede acotar
         * el daño.
         *
         * Se sale con el error y que lo resuelva quien llama, que es quien tiene
         * la clave de idempotencia y el `uid` para conciliar después.
         */
        if (!sePuedeRepetir) break;
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
