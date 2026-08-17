/**
 * Dar de alta un webmaster: la atribución **y** el año de PRO.
 *
 * ── POR QUÉ ESTO VIVE AQUÍ Y NO EN LA RUTA ──
 *
 * Estaba entero dentro de `POST /api/webmaster/activar`, y mientras la Mini App
 * fue la única puerta eso estuvo bien. Ha dejado de serlo: el agente puede dar
 * de alta escribiendo `/activar correo@ejemplo.com` en el chat del bot, y ese
 * comando necesita EXACTAMENTE esta secuencia —reservar en local, pedírselo a
 * Sophon, deshacer si rechaza, conceder el año, auditar—.
 *
 * Copiarla habría sido tener dos versiones de la única operación de la
 * aplicación que mueve dinero y crea atribuciones, y la segunda copia envejece
 * sola: el día que alguien arregle aquí la carrera entre dos agentes, la del bot
 * se queda con el defecto. Así que hay un solo cuerpo y dos llamantes.
 *
 * ── QUÉ DEVUELVE, Y POR QUÉ NO DEVUELVE TEXTO ──
 *
 * Devuelve **claves del catálogo**, no frases. Los dos llamantes pintan cosas
 * distintas —la ruta un JSON con `error` y `apoyo`, el bot un mensaje de
 * Telegram en HTML— y cada uno resuelve el idioma por su cuenta. Si esto
 * devolviera texto ya traducido, el bot tendría que volver a partirlo para
 * componer su mensaje, y el compilador dejaría de avisar cuando una clave se
 * renombra.
 *
 * `estado` es el código HTTP. Al bot no le sirve de nada y lo ignora; sacarlo de
 * aquí obligaría a la ruta a mantener su propia tabla motivo → estado, que es
 * justo la que hay que mirar junto a los motivos para entenderla.
 */

import { db } from "../db.ts";
import { claveIdempotencia, normalizarEmail } from "../cripto.ts";
import type { Cadenas } from "../i18n.ts";
import type { Idioma } from "../idiomas.ts";
import { concederAnio } from "../pro/conceder.ts";
import { clienteSophon } from "../sophon/instancia.ts";
import { clasificarAlta, hayQueAvisarAlOperador } from "../sophon/errores.ts";
import { avisarErrorSinClasificarAlOperador } from "../bot/avisos.ts";
import { hoyContable } from "../sync/registros.ts";
import { confirmarEnSophon } from "../sync/webmasters.ts";

/**
 * Claves del catálogo cuyo valor es texto plano.
 *
 * Las tablas de errores nombran claves y no textos, y el compilador tiene que
 * rechazar tanto una clave que no existe como una que es función: interpolar
 * una función en la respuesta le enseñaría al agente un `[object Function]`.
 */
export type ClaveTexto = {
  [K in keyof Cadenas]: Cadenas[K] extends string ? K : never;
}[keyof Cadenas];

export interface AltaRechazada {
  ok: false;
  /** Código HTTP. Lo usa la ruta; el bot no lo mira. */
  estado: number;
  claveError: ClaveTexto;
  claveApoyo: ClaveTexto;
}

export interface AltaHecha {
  ok: true;
  email: string;
  /** `AAAA-MM-DD` desde el que este webmaster devenga. */
  devengaDesde: string;
  pro:
    | { concedido: true; renovado: boolean; vigenteHasta: Date | string | null }
    | { concedido: false; renovado: false; error: string | null; apoyo: string | null };
}

export type ResultadoAlta = AltaHecha | AltaRechazada;

/**
 * La tabla de rechazos de Sophon.
 *
 * Nombra CLAVES, no textos. Escrita con literales, los seis rechazos salían
 * siempre en español aunque el agente tuviera la aplicación en otro idioma. Con
 * las claves, el mapa sigue leyéndose de un vistazo —qué motivo da qué código y
 * qué mensaje— y el texto lo pone quien llama.
 */
const RESPUESTAS: Record<
  ReturnType<typeof clasificarAlta>["motivo"],
  { estado: number; claveError: ClaveTexto; claveApoyo: ClaveTexto }
> = {
  SIN_WHITELIST: { estado: 503, claveError: "errSinWhitelist", claveApoyo: "errSinWhitelistApoyo" },
  // Sophon confirma lo que la comprobación local no siempre puede ver: esa
  // cuenta ya estaba en el programa de socios, así que es antigua.
  YA_AFILIADO: { estado: 409, claveError: "errYaEnSophon", claveApoyo: "errYaEnSophonApoyo" },
  NO_REGISTRADO: {
    estado: 404,
    claveError: "errNoExisteEnSophon",
    claveApoyo: "errNoExisteEnSophonApoyo",
  },
  PETICION_MAL_FORMADA: {
    estado: 500,
    claveError: "errSinClasificar",
    claveApoyo: "errSinClasificarApoyo",
  },
  SIN_RESPUESTA: {
    estado: 502,
    claveError: "errSophonNoResponde",
    claveApoyo: "errSophonNoRespondeApoyo",
  },
  // Sophon SÍ ha contestado, y ha dicho que no. Por eso no se invita a
  // reintentar: repetir contra un rechazo firme no lo convierte en un sí.
  DESCONOCIDO: { estado: 502, claveError: "errSophonRechaza", claveApoyo: "errSophonRechazaApoyo" },
};

/**
 * Activar un webmaster: crea la atribución **y concede el PRO**.
 *
 * Son un solo acto comercial, no dos: un webmaster se da de alta y entra con un
 * año de PRO. El agente no elige plazo ni plan porque no hay nada que elegir.
 *
 * El orden importa y no es el intuitivo. Se **reserva primero en local** y se
 * llama a Sophon después, porque el índice único sobre `emailNormalizado` es lo
 * único que impide que dos agentes reclamen el mismo webmaster. Si se llamara
 * primero a Sophon, dos peticiones simultáneas pasarían las dos y la carrera se
 * resolvería en la base de datos con uno de los agentes ya convencido de que el
 * webmaster es suyo.
 *
 * Dos reglas sobre el fallo, que aquí no es simétrico:
 *
 *  - Si Sophon rechaza la **vinculación**, la reserva se deshace: no ha pasado nada.
 *  - Si la vinculación va bien y falla el **PRO**, el alta NO se deshace. Sophon
 *    ya vinculó al webmaster y volver a intentarlo daría «already an affiliate»,
 *    así que revertir dejaría al webmaster vinculado allí y huérfano aquí, que
 *    es peor que el trabajo a medias. Se avisa y se reintenta desde su ficha.
 *
 * ── SOLO CUENTAS NUEVAS, Y LO DECIDE SOPHON ──
 *
 * Un agente cobra por lo que capta él, así que solo puede dar de alta cuentas
 * que se registren por él. Las que ya estaban en el programa de socios son del
 * Operador.
 *
 * Y esa frontera no la calcula esta aplicación: **el alta ES el registro en el
 * programa**, de modo que la autoridad es la respuesta de `bind_sub_aff`. Si
 * dice que sí, la cuenta entra nueva, recibe su año de PRO y aparece ya en la
 * lista de ganancias. Si dice que no, el motivo decide qué se le cuenta al
 * agente, y por eso la clasificación del error vive en su propio módulo
 * (`lib/sophon/errores.ts`) en vez de en dos expresiones regulares aquí dentro.
 *
 * No hay tope de altas: el agente puede activar cuantas cuentas nuevas traiga.
 */
export async function altaDeWebmaster(params: {
  agenteId: string;
  /** El del AGENTE: los mensajes de vuelta se los lee él. */
  idioma: Idioma;
  /** Tal cual lo escribió, sin normalizar: es lo que viaja a Sophon. */
  email: string;
  /** Hace seguro reintentar sin conceder dos años. */
  idempotencia: string;
}): Promise<ResultadoAlta> {
  const { agenteId, idioma, email, idempotencia } = params;
  const emailNormalizado = normalizarEmail(email);
  const hoy = hoyContable();

  // ── Paso 1: reservar en local ──────────────────────────────────────────
  let webmasterId: string;
  try {
    webmasterId = await db.$transaction(async (tx) => {
      const existente = await tx.webmaster.findUnique({
        where: { emailNormalizado },
        select: { id: true, agenteId: true },
      });

      if (existente?.agenteId && existente.agenteId === agenteId) {
        throw new Error("YA_ES_TUYO");
      }
      if (existente?.agenteId) throw new Error("DE_OTRO_AGENTE");

      /*
       * Aquí estaba la ADOPCIÓN DE HUÉRFANOS, y era la puerta que había que
       * cerrar: si la fila existía sin agente, se le ponía el agente encima con
       * `devengaDesde = hoy` y el webmaster pasaba a ser suyo de ahí en
       * adelante.
       *
       * Una fila sin agente solo puede haber llegado de dos sitios, y los dos
       * son el árbol del Operador: `barrerWebmasters` pagina `sub-aff/status`
       * entero y crea una por cada sub-afiliado que existe en Sophon, y
       * `barrerRegistros` crea una por cada correo que aparezca produciendo. O
       * sea que **si la aplicación ya conoce el correo, esa cuenta ya estaba en
       * el programa de socios**, y no la ha captado este agente.
       *
       * El rechazo se da aquí y no en Sophon por rapidez, no por autoridad:
       * `bind_sub_aff` respondería «already an affiliate» de todas formas.
       */
      if (existente) throw new Error("YA_EN_SOPHON");

      const creado = await tx.webmaster.create({
        data: {
          emailNormalizado,
          emailOriginal: email,
          agenteId,
          origen: "VINCULADO_APP",
          atribuidoEn: new Date(),
          // Se estampa siempre aunque a una cuenta nueva no le haga falta: es la
          // garantía de que el agente no cobre nada anterior a su alta, y no
          // depende de que Sophon nos haya dicho la verdad sobre su antigüedad.
          devengaDesde: new Date(hoy),
        },
        select: { id: true },
      });
      return creado.id;
    });
  } catch (e) {
    const motivo = e instanceof Error ? e.message : "";
    if (motivo === "DE_OTRO_AGENTE") {
      return {
        ok: false,
        estado: 409,
        claveError: "errDeOtroAgente",
        claveApoyo: "errDeOtroAgenteApoyo",
      };
    }
    if (motivo === "YA_ES_TUYO") {
      return {
        ok: false,
        estado: 409,
        claveError: "errYaEnTuEquipo",
        claveApoyo: "errYaEnTuEquipoApoyo",
      };
    }
    if (motivo === "YA_EN_SOPHON") {
      return { ok: false, estado: 409, claveError: "errYaEnSophon", claveApoyo: "errYaEnSophonApoyo" };
    }
    console.error("[alta] reserva fallida", e);
    return {
      ok: false,
      estado: 500,
      claveError: "errAltaNoRegistrada",
      claveApoyo: "errAltaNoRegistradaApoyo",
    };
  }

  // ── Paso 2: pedírselo a Sophon ─────────────────────────────────────────
  const intento = await db.intentoVinculacion.create({
    data: { emailNormalizado, agenteId, webmasterId },
  });

  try {
    await clienteSophon().vincularSubAfiliado(email);
  } catch (e) {
    // Deshacer la reserva. Siempre es un borrado: la fila la acaba de crear el
    // paso 1, porque un correo que ya existiera no habría llegado hasta aquí.
    await db.webmaster.delete({ where: { id: webmasterId } }).catch(() => {});

    const rechazo = clasificarAlta(e);
    await db.intentoVinculacion.update({
      where: { id: intento.id },
      data: {
        exito: false,
        codigoRespuesta: rechazo.codigo,
        mensaje: rechazo.mensaje,
        traceId: rechazo.traceId,
        resueltoEn: new Date(),
      },
    });

    /*
     * Un rechazo que no sabemos leer se cuenta, no se traga.
     *
     * Es la única forma de enterarse de que Sophon ha cambiado el texto de un
     * error: hasta ahora quedaba constancia en `IntentoVinculacion` y nadie
     * mira esa tabla, así que la clasificación se habría degradado en silencio
     * y todos los rechazos habrían pasado a leerse como «Sophon no responde».
     */
    if (hayQueAvisarAlOperador(rechazo.motivo)) {
      await avisarErrorSinClasificarAlOperador({
        email,
        codigo: rechazo.codigo,
        mensaje: rechazo.mensaje,
        traceId: rechazo.traceId,
      });
    }

    return { ok: false, ...RESPUESTAS[rechazo.motivo] };
  }

  await db.intentoVinculacion.update({
    where: { id: intento.id },
    data: { exito: true, codigoRespuesta: 0, resueltoEn: new Date() },
  });

  /*
   * ── Paso 2 bis: preguntarle a Sophon si ya aparece ──
   *
   * `bind_sub_aff` devuelve un `void`, así que hasta aquí la única prueba de que
   * la vinculación prosperó es que no lanzara excepción. Se le pregunta a Sophon
   * si el correo está de verdad en el programa de socios, y con eso el webmaster
   * entra en la red del agente con su estado bueno en vez de quedarse en
   * «desconocido» hasta que pase el barrido.
   *
   * **Si no aparece, el alta NO falla.** Sophon puede tardar en propagarlo, y
   * convertir un retraso en un error mandaría al agente a reintentar contra una
   * vinculación que ya está hecha —y que respondería «already an affiliate»—.
   */
  const estadoConfirmado = await confirmarEnSophon(clienteSophon(), emailNormalizado);
  if (estadoConfirmado) {
    await db.webmaster.update({
      where: { id: webmasterId },
      data: {
        estadoSophon: estadoConfirmado,
        confirmadoEn: new Date(),
        vistoPorUltimaVezEn: new Date(),
      },
    });
  }

  await db.auditoria.create({
    data: {
      actorTipo: "AGENTE",
      actorId: agenteId,
      accion: "webmaster.activado",
      recurso: emailNormalizado,
      detalle: { nuevo: true, confirmado: estadoConfirmado !== null },
    },
  });

  // ── Paso 3: el año de PRO ──────────────────────────────────────────────
  //
  // Sin excepciones, porque ya no hay ninguna que hacer: toda alta que llega
  // aquí es una cuenta nueva.
  const pro = await concederAnio({
    agenteId,
    webmasterId,
    emailWebmaster: email,
    motivo: "ALTA",
    idioma,
    claveIdempotencia: claveIdempotencia(agenteId, emailNormalizado, idempotencia),
  });

  return {
    ok: true,
    email,
    devengaDesde: hoy,
    /*
     * El alta está hecha pase lo que pase con el PRO. Se informa del resultado
     * en vez de fingir que todo fue bien o de fallar entera una operación que
     * sí ha prosperado.
     *
     * `yaActivo` se sigue leyendo como ÉXITO, y es una red de seguridad y no un
     * caso de negocio: una cuenta recién registrada no puede traer PRO, y si
     * Sophon dijera que sí lo trae, lo que hay que hacer es dejarlo en paz.
     */
    pro: pro.ok
      ? { concedido: true, renovado: !pro.yaActivo, vigenteHasta: pro.vigenteHasta }
      : { concedido: false, renovado: false, error: pro.error ?? null, apoyo: pro.apoyo ?? null },
  };
}
