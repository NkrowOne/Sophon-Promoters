/**
 * Conceder PRO: un año, y solo desde aquí.
 *
 * Existe como módulo y no como código dentro de una ruta porque **dos sitios
 * distintos conceden**: el alta de un webmaster nuevo y la renovación. Si cada
 * uno construyera su propia llamada, bastaría con que uno de los dos olvidara
 * la duración explícita para conceder 30 días creyendo conceder un año —que es
 * exactamente el fallo que traía el código anterior—.
 *
 * Las cuatro reglas que encapsula:
 *
 *  1. **Siempre `vip.year` con la duración en segundos escrita.** El código de
 *     membresía NO fija el plazo: `duration: 0` da 30 días con cualquier
 *     código. La documentación de Sophon lo dice y es fácil de leer al revés.
 *  2. **La fila se reserva ANTES de llamar a Sophon**, con clave de
 *     idempotencia. Un doble toque no concede dos años.
 *  3. **`membership_end_at` es la única fuente de la caducidad.** No hay
 *     endpoint que la consulte después: si no se persiste aquí, se pierde.
 *  4. **Un PRO vigente no se toca.** Ver `vigencia.ts`: no sabemos si Sophon
 *     suma el plazo o lo sustituye, y no podemos comprobarlo. El guardián va
 *     aquí y no en la ruta precisamente porque este módulo existe para que los
 *     dos caminos que conceden no puedan divergir.
 */

import { db } from "../db.ts";
import { cadenas } from "../i18n.ts";
import { type Idioma } from "../idiomas.ts";
import { clienteSophon } from "../sophon/instancia.ts";
import { ErrorSophon } from "../sophon/cliente.ts";
import { PLAN_UNICO, SEGUNDOS_UN_ANIO, type ResultadoMembresia } from "../sophon/tipos.ts";
import { proActivo } from "./vigencia.ts";
import { ZONA_POR_DEFECTO } from "../fechas.ts";

export type MotivoConcesion = "ALTA" | "RENOVACION";

export interface ResultadoConcesion {
  ok: boolean;
  /** Fecha de caducidad tal como la devolvió Sophon, en ISO corto. */
  vigenteHasta: string | null;
  /**
   * El PRO ya estaba vigente, así que NO se ha llamado a Sophon.
   *
   * Los dos caminos leen esto al revés y por eso se devuelve en vez de
   * decidirse aquí:
   *
   *  - En una **renovación** es el motivo del rechazo, y es el caso normal: la
   *    regla de la casa es que un PRO vigente no se renueva.
   *  - En un **alta** es éxito, y hoy es una red de seguridad más que un caso
   *    de negocio. Lo justificaba adoptar un huérfano que ya venía con PRO, y
   *    eso ya no puede pasar: un alta solo acepta cuentas nuevas. Si aun así
   *    Sophon dijera que la membresía está viva, lo correcto sigue siendo no
   *    tocarla y dar el alta por buena —el webmaster tiene justo lo que el alta
   *    le iba a dar—.
   */
  yaActivo?: boolean;
  /**
   * Motivo legible cuando no ha salido bien. Nunca un código ni un stack.
   *
   * Sale ya traducido al idioma que se pasa en `params.idioma`: los dos
   * llamantes lo meten tal cual en la respuesta HTTP, así que si se devolviera
   * una clave habría que resolverla en dos sitios y uno de los dos acabaría
   * enseñando el nombre de la clave.
   */
  error?: string;
  apoyo?: string;
  /** Distingue «Sophon aún no nos autoriza» de «Sophon no responde». */
  estado?: number;
}

/** Marca interna para salir de la transacción; nunca sale del módulo. */
const YA_ACTIVO = "YA_ACTIVO:";
const REPETIDA = "REPETIDA:";

const isoCorto = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

/**
 * Lo que este módulo necesita del mundo exterior.
 *
 * Existe para poder **comprobar que un PRO vigente no llega a Sophon**, que es
 * la única garantía que da la regla de vigencia y la que no se puede verificar
 * en producción: la whitelist del Tool API no está activa, así que el caso no se
 * puede provocar en vivo. Sin esta costura, la regla que decide si a un
 * webmaster se le borran meses de suscripción quedaría sin una sola prueba.
 *
 * Los tipos son estructurales y describen solo lo que se usa: un doble de
 * pruebas no tiene que implementar Prisma entero para poder existir.
 */
export interface DependenciasConcesion {
  db: {
    $transaction: {
      <T>(fn: (tx: TransaccionConcesion) => Promise<T>): Promise<T>;
      (operaciones: unknown[]): Promise<unknown>;
    };
    concesionPro: { update: (a: unknown) => unknown };
    webmaster: { update: (a: unknown) => unknown };
    auditoria: { create: (a: unknown) => unknown };
  };
  /** Se resuelve por llamada, no al importar: sin PRO vigente nunca se invoca. */
  sophon: () => {
    concederMembresia: (
      email: string,
      codigo: typeof PLAN_UNICO,
      duracionSegundos: number,
    ) => Promise<ResultadoMembresia>;
  };
  /**
   * El reloj contra el que se mide la vigencia.
   *
   * En producción es el del sistema y no se pasa. Existe porque sin él la
   * prueba que garantiza la regla —«a un PRO vivo no se le llama a Sophon»—
   * era una **bomba de relojería**: fijaba «ahora» en una fecha concreta,
   * construía la vigencia relativa a ella y luego `proActivo` comparaba contra
   * el reloj de verdad. Mientras esa fecha estuvo en el futuro pasó; al
   * quedarse atrás, un PRO «de un día por delante» se leyó como caducado y la
   * prueba empezó a fallar sola, sin que nadie tocara el código.
   *
   * Una regla que decide si a un webmaster se le borran meses de suscripción no
   * puede tener por única prueba una que caduca.
   */
  ahora?: () => Date;
}

interface TransaccionConcesion {
  concesionPro: {
    findUnique: (a: unknown) => Promise<{
      id: string;
      estado: string;
      vigenteHasta: Date | null;
    } | null>;
    delete: (a: unknown) => Promise<unknown>;
    create: (a: unknown) => Promise<{ id: string }>;
  };
  webmaster: {
    findUnique: (a: unknown) => Promise<{ proVigenteHasta: Date | null } | null>;
  };
}

const REALES: DependenciasConcesion = {
  db: db as unknown as DependenciasConcesion["db"],
  sophon: clienteSophon,
};

/**
 * Reserva la concesión y la ejecuta.
 *
 * No lanza: devuelve el resultado. Quien llama decide qué hacer con un fallo,
 * y en el caso del alta la respuesta correcta **no** es deshacer nada.
 */
export async function concederAnio(
  params: {
    agenteId: string;
    webmasterId: string;
    emailWebmaster: string;
    motivo: MotivoConcesion;
    claveIdempotencia: string;
    /**
     * El idioma del AGENTE que concede, no el del webmaster: los mensajes de
     * este módulo se los lee él. Viene de `sesion.idioma` en los dos llamantes
     * porque aquí no hay petición de la que deducirlo.
     */
    idioma: Idioma;
  },
  deps: DependenciasConcesion = REALES,
): Promise<ResultadoConcesion> {
  const { agenteId, webmasterId, emailWebmaster, motivo, claveIdempotencia } = params;
  const { db, sophon } = deps;
  const ahora = deps.ahora ?? (() => new Date());
  const t = cadenas(params.idioma);

  // ── Reserva ────────────────────────────────────────────────────────────
  let concesionId: string;
  try {
    concesionId = await db.$transaction(async (tx) => {
      const previa = await tx.concesionPro.findUnique({
        where: { claveIdempotencia },
        select: { id: true, estado: true, vigenteHasta: true },
      });

      if (previa) {
        // Un intento FALLIDO no entregó nada, así que no puede bloquear la
        // clave para siempre: se descarta y se vuelve a reservar. Si no, el
        // agente se quedaría sin poder reintentar con el mismo botón.
        if (previa.estado === "FALLIDA") {
          await tx.concesionPro.delete({ where: { id: previa.id } });
        } else {
          throw new Error(`${REPETIDA}${isoCorto(previa.vigenteHasta)}`);
        }
      }

      /*
       * El guardián de vigencia, y va DESPUÉS de la idempotencia a propósito.
       *
       * Al revés estaría roto justo en el caso para el que existe la clave: el
       * agente renueva un PRO caducado, la concesión prospera, y el reintento
       * de la red llega con la misma clave. Para entonces el PRO YA está
       * vigente —lo acaba de conceder él—, así que un guardián por delante
       * respondería «no se puede renovar» a una operación que salió bien. Con
       * este orden, la clave contesta primero y devuelve la fecha que consiguió.
       *
       * Dentro de la transacción y no antes porque es donde se decide: leerlo
       * fuera dejaría una ventana entre la comprobación y la reserva.
       */
      const actual = await tx.webmaster.findUnique({
        where: { id: webmasterId },
        select: { proVigenteHasta: true },
      });
      if (proActivo(actual?.proVigenteHasta ?? null, ahora())) {
        throw new Error(`${YA_ACTIVO}${isoCorto(actual?.proVigenteHasta)}`);
      }

      const creada = await tx.concesionPro.create({
        data: {
          agenteId,
          webmasterId,
          codigoMembresia: PLAN_UNICO,
          duracionSegundos: SEGUNDOS_UN_ANIO,
          motivo,
          claveIdempotencia,
          estado: "RESERVADA",
        },
        select: { id: true },
      });
      return creada.id;
    });
  } catch (e) {
    const motivoError = e instanceof Error ? e.message : "";
    if (motivoError.startsWith(REPETIDA)) {
      // Reintento sobre algo que sí prosperó: se devuelve tal cual. Es lo que
      // hace seguro pulsar dos veces.
      return { ok: true, vigenteHasta: motivoError.slice(REPETIDA.length) || null };
    }
    if (motivoError.startsWith(YA_ACTIVO)) {
      /*
       * Ni error ni concesión: **no se ha llamado a Sophon**, que es lo único
       * que este camino tiene que garantizar.
       *
       * Sale con `ok: true` porque para el alta esto ES el resultado correcto
       * —el webmaster ya tiene lo que se le iba a dar— y quien quiera tratarlo
       * como rechazo tiene `yaActivo` para hacerlo. Devolverlo como error
       * obligaría al alta a distinguir «Sophon no responde» de «no hacía falta»
       * leyendo un texto, que es justo la clase de deducción que este módulo
       * existe para no repartir por las rutas.
       */
      return {
        ok: true,
        yaActivo: true,
        vigenteHasta: motivoError.slice(YA_ACTIVO.length) || null,
      };
    }
    console.error("[pro] reserva fallida", e);
    return {
      ok: false,
      vigenteHasta: null,
      error: t.errProNoRegistrado,
      apoyo: t.errProNoRegistradoApoyo,
      estado: 500,
    };
  }

  // ── Concesión en Sophon ────────────────────────────────────────────────
  try {
    const r = await sophon().concederMembresia(emailWebmaster, PLAN_UNICO, SEGUNDOS_UN_ANIO);

    /*
     * El inicio se guarda aunque hoy nadie lo lea. Es la evidencia que falta
     * para saber si Sophon SUMA o SUSTITUYE el plazo —si al conceder sobre algo
     * vigente el inicio se mueve a hoy, sustituye— y no cuesta más que una
     * columna. Sin esto, la primera vez que ocurra pasará sin dejar rastro, que
     * es exactamente lo que ya pasó con los «30 días».
     */
    const inicio = fechaDeMembresia(r, CLAVES_INICIO);
    const finDeSophon = fechaDeMembresia(r, CLAVES_FIN);

    /*
     * ── LA CADUCIDAD NO PUEDE QUEDARSE VACÍA ──
     *
     * Esto se escribía como `vigenteHasta: fechaDeSophon(r.membership_end_at)`,
     * y cuando esa lectura daba `null` —Sophon aceptó la concesión y devolvió un
     * cuerpo sin la fecha, o con otro nombre— la concesión se guardaba
     * CONFIRMADA con la caducidad a nulo. Pasó en producción y costó caro:
     *
     *  1. `Webmaster.proVigenteHasta` se quedaba a nulo, así que la Malla decía
     *     «Sin PRO» de un webmaster que SÍ tenía su año y sus 6 TB.
     *  2. Y como el guardián de vigencia lee ese mismo campo, `proActivo`
     *     respondía «no tiene nada» y la pantalla de renovaciones seguía
     *     ofreciendo el botón. Cada toque era otro `setmembership` sobre una
     *     membresía viva: exactamente la llamada que toda la regla de
     *     `vigencia.ts` existe para no hacer nunca. Se contaron seis en un mismo
     *     minuto sobre la misma cuenta.
     *
     * Así que si Sophon ha dicho que sí pero no dice hasta cuándo, se deduce del
     * plazo que se pidió, que es el dato que sí conocemos con certeza: se mandó
     * `duration = SEGUNDOS_UN_ANIO`. Deducir puede errar por horas; dejarlo a
     * nulo erraba por un año entero y encima abría la puerta a repetir la
     * concesión.
     *
     * La respuesta cruda se guarda en `mensaje` porque es la única forma de
     * enterarse de qué devuelve Sophon de verdad: no hay endpoint que consulte
     * una membresía después de concederla.
     */
    const fin =
      finDeSophon ?? new Date((inicio ?? ahora()).getTime() + SEGUNDOS_UN_ANIO * 1000);
    const deducida = finDeSophon === null;
    if (deducida) {
      console.error(
        "[pro] setmembership aceptó sin fecha de caducidad legible; se deduce del plazo pedido",
        { email: emailWebmaster, respuesta: resumenRespuesta(r) },
      );
    }

    await db.$transaction([
      db.concesionPro.update({
        where: { id: concesionId },
        data: {
          estado: "CONFIRMADA",
          vigenteHasta: fin,
          vigenteDesde: inicio,
          uidSophon: uidDeSophon(r),
          // Solo cuando hay algo que contar: en el camino normal la columna se
          // queda limpia y una concesión con `mensaje` es, por sí sola, la lista
          // de las que hay que mirar.
          ...(deducida ? { mensaje: `SIN_FECHA_EN_RESPUESTA ${resumenRespuesta(r)}` } : {}),
        },
      }),
      db.webmaster.update({
        where: { id: webmasterId },
        data: { proVigenteHasta: fin },
      }),
      db.auditoria.create({
        data: {
          actorTipo: "AGENTE",
          actorId: agenteId,
          accion: motivo === "ALTA" ? "pro.concedido_en_alta" : "pro.renovado",
          recurso: emailWebmaster,
          detalle: {
            vigenteHasta: fin.toISOString(),
            segundos: SEGUNDOS_UN_ANIO,
            /** La fecha la puso el plazo pedido, no Sophon. */
            fechaDeducida: deducida,
          },
        },
      }),
    ]);

    return { ok: true, vigenteHasta: fin.toISOString().slice(0, 10) };
  } catch (e) {
    const err = e instanceof ErrorSophon ? e : null;
    await db.concesionPro.update({
      where: { id: concesionId },
      data: {
        estado: "FALLIDA",
        mensaje: err?.message ?? String(e),
        traceId: err?.traceId ?? null,
      },
    });

    if (err?.esFaltaWhitelist) {
      return {
        ok: false,
        vigenteHasta: null,
        error: t.errProSinWhitelist,
        apoyo: t.errProSinWhitelistApoyo,
        estado: 503,
      };
    }
    return {
      ok: false,
      vigenteHasta: null,
      error: t.errProRechazado,
      apoyo: t.errProRechazadoApoyo,
      estado: 502,
    };
  }
}

/**
 * Dónde puede venir la caducidad, por orden de preferencia.
 *
 * El tipo declara `membership_end_at` y esa sigue siendo la primera opción, pero
 * el tipo describe lo que ESPERAMOS, no lo que llega: la misma API mezcla los
 * dos estilos —el cuerpo de la petición va en `snake_case` (`membership_code`,
 * `duration`) y las lecturas vuelven en `camelCase` (`partnerLevel`,
 * `countRegister`, `rewardStorageBytes`)—. Buscar por varios nombres cuesta un
 * bucle y evita que un cambio de estilo en el otro extremo vuelva a dejar la
 * caducidad a nulo sin que nadie se entere.
 */
const CLAVES_FIN = ["membership_end_at", "membershipEndAt", "end_at", "endAt"] as const;
const CLAVES_INICIO = [
  "membership_start_at",
  "membershipStartAt",
  "start_at",
  "startAt",
] as const;

/** La primera de esas claves que traiga una fecha legible. */
function fechaDeMembresia(respuesta: unknown, claves: readonly string[]): Date | null {
  if (!respuesta || typeof respuesta !== "object") return null;
  const obj = respuesta as Record<string, unknown>;
  for (const clave of claves) {
    const fecha = fechaDeSophon(obj[clave]);
    if (fecha) return fecha;
  }
  return null;
}

/**
 * Las fechas de `setmembership` llegan de varias formas y hay que aceptarlas todas.
 *
 * Con protobuf sobre JSON, un `Timestamp` sale como `{seconds}`; por la pasarela
 * HTTP, como cadena ISO. Se observaron ambas contra la cuenta real. Se aceptan
 * además el número suelto y la cadena de dígitos porque esta API devuelve
 * rutinariamente sus números como texto —`expiresIn: "604800"`,
 * `countRegister: "12"`— y un `{ seconds: "1790000000" }` es exactamente la
 * clase de detalle que ya se tragó una caducidad entera.
 *
 * Devuelve `null` solo cuando de verdad no hay nada legible. Nunca una fecha
 * inválida: un `Invalid Date` llegando a Prisma es un fallo mucho más ruidoso y
 * mucho más tarde.
 */
function fechaDeSophon(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") return fechaDeEpoca((v as { seconds?: unknown }).seconds);
  if (typeof v === "number") return fechaDeEpoca(v);
  if (typeof v === "string") {
    if (!v) return null;
    if (/^\d+$/.test(v)) return fechaDeEpoca(v);
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Segundos o milisegundos desde la época, vengan como número o como texto. */
function fechaDeEpoca(v: unknown): Date | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  // Sophon manda segundos. Un milisegundo suelto se reconoce por magnitud: en
  // segundos, 1e11 es el año 5138.
  const d = new Date(n > 1e11 ? n : n * 1000);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** El UID, si viene. No es crítico: se guarda para poder cruzar con Sophon. */
function uidDeSophon(respuesta: unknown): string | null {
  if (!respuesta || typeof respuesta !== "object") return null;
  const uid = (respuesta as { uid?: unknown }).uid;
  return typeof uid === "string" && uid ? uid : null;
}

/**
 * La respuesta cruda, recortada, para dejarla escrita en la concesión.
 *
 * Es la pieza que faltaba cuando esto falló: la aplicación no guardaba en
 * ninguna parte qué había contestado Sophon, así que la única forma de
 * investigar era deducirlo. El recorte evita que un cuerpo enorme llene la
 * columna, y `catch` cubre lo que no se pueda serializar.
 */
function resumenRespuesta(respuesta: unknown): string {
  try {
    return JSON.stringify(respuesta ?? null).slice(0, 500);
  } catch {
    return String(respuesta).slice(0, 500);
  }
}

/** Primer instante del mes en curso, en la zona horaria contable declarada. */
export function inicioDelMes(): Date {
  const zona = process.env["ZONA_HORARIA"] ?? ZONA_POR_DEFECTO;
  const mes = new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(new Date()).slice(0, 7);
  return new Date(`${mes}-01T00:00:00Z`);
}
