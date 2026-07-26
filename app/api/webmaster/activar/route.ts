import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { claveIdempotencia, normalizarEmail } from "@/lib/cripto";
import { esRespuesta, exigirAgente } from "@/lib/api/agente";
import { concederAnio } from "@/lib/pro/conceder";
import { clienteSophon } from "@/lib/sophon/instancia";
import { clasificarAlta, hayQueAvisarAlSuperadmin } from "@/lib/sophon/errores";
import { avisarErrorSinClasificarAlSuperadmin } from "@/lib/bot/avisos";
import { hoyContable } from "@/lib/sync/registros";
import { confirmarEnSophon } from "@/lib/sync/webmasters";

/**
 * Activar un webmaster: la acción que crea la atribución **y concede el PRO**.
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
 * superadmin.
 *
 * Y esa frontera no la calcula esta aplicación: **el alta ES el registro en el
 * programa**, de modo que la autoridad es la respuesta de `bind_sub_aff`. Si
 * dice que sí, la cuenta entra nueva, recibe su año de PRO y aparece ya en la
 * lista de ganancias. Si dice que no, el motivo decide qué se le cuenta al
 * agente, y por eso la clasificación del error vive en su propio módulo
 * (`lib/sophon/errores.ts`) en vez de en dos expresiones regulares aquí dentro:
 * distinguir «esa cuenta ya estaba» de «esa cuenta no existe» es la diferencia
 * entre un rechazo definitivo y un «que se registre y vuelve».
 *
 * La comprobación local del paso 1 —si ya conocemos el correo, se rechaza sin
 * llamar— es un ATAJO, no la regla: cualquier correo que la aplicación conozca
 * llegó por uno de los dos barridos, que recorren el árbol entero del
 * superadmin, así que Sophon iba a responder «already an affiliate» igualmente.
 * Ahorra la llamada y le da al agente una respuesta instantánea.
 *
 * No hay tope de altas: el agente puede activar cuantas cuentas nuevas traiga.
 */

export const dynamic = "force-dynamic";

const Cuerpo = z.object({
  email: z.string().email().max(254),
  /** La genera el cliente y hace seguro reintentar sin conceder dos años. */
  idempotencia: z.string().min(8).max(64),
});

export async function POST(peticion: Request): Promise<NextResponse> {
  const ctx = await exigirAgente(peticion);
  if (esRespuesta(ctx)) return ctx;
  const { agenteId } = ctx.sesion;

  const parseado = Cuerpo.safeParse(await peticion.json().catch(() => null));
  if (!parseado.success) {
    return NextResponse.json(
      { error: "Ese correo no tiene un formato válido.", apoyo: "Escribe el correo con el que se registró en Sophon." },
      { status: 400 },
    );
  }

  const emailNormalizado = normalizarEmail(parseado.data.email);
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
       * son el árbol del superadmin: `barrerWebmasters` pagina `sub-aff/status`
       * entero y crea una por cada sub-afiliado que existe en Sophon, y
       * `barrerRegistros` crea una por cada correo que aparezca produciendo. O
       * sea que **si la aplicación ya conoce el correo, esa cuenta ya estaba en
       * el programa de socios**, y no la ha captado este agente.
       *
       * El rechazo se da aquí y no en Sophon por rapidez, no por autoridad:
       * `bind_sub_aff` respondería «already an affiliate» de todas formas.
       * Ahorrarse la llamada le da al agente una respuesta instantánea en el
       * caso más frecuente —teclear el correo de alguien que ya está dentro—.
       */
      if (existente) throw new Error("YA_EN_SOPHON");

      const creado = await tx.webmaster.create({
        data: {
          emailNormalizado,
          emailOriginal: parseado.data.email,
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
      return NextResponse.json(
        {
          error: "Ese webmaster ya es de otro agente.",
          apoyo: "Cada webmaster tiene un solo agente. Si crees que es un error, escribe al superadmin.",
        },
        { status: 409 },
      );
    }
    if (motivo === "YA_ES_TUYO") {
      return NextResponse.json(
        { error: "Ya tienes a ese webmaster en tu red.", apoyo: "Ábrelo desde «Tu red»." },
        { status: 409 },
      );
    }
    if (motivo === "YA_EN_SOPHON") {
      return NextResponse.json(
        {
          error: "Esa cuenta ya estaba en Sophon.",
          apoyo: "Solo puedes dar de alta cuentas nuevas que registres tú. Las que ya existían son del superadmin.",
        },
        { status: 409 },
      );
    }
    console.error("[activar] reserva fallida", e);
    return NextResponse.json(
      {
        error: "No hemos podido registrar la activación.",
        apoyo: "No hemos cambiado nada. Vuelve a intentarlo.",
      },
      { status: 500 },
    );
  }

  // ── Paso 2: pedírselo a Sophon ─────────────────────────────────────────
  const intento = await db.intentoVinculacion.create({
    data: { emailNormalizado, agenteId, webmasterId },
  });

  try {
    await clienteSophon().vincularSubAfiliado(parseado.data.email);
  } catch (e) {
    // Deshacer la reserva. Ahora siempre es un borrado: la fila la acaba de
    // crear el paso 1, porque un correo que ya existiera no habría llegado
    // hasta aquí. Antes había una segunda rama que le quitaba el agente a un
    // huérfano adoptado, y esa ya no puede darse.
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
    if (hayQueAvisarAlSuperadmin(rechazo.motivo)) {
      await avisarErrorSinClasificarAlSuperadmin({
        email: parseado.data.email,
        codigo: rechazo.codigo,
        mensaje: rechazo.mensaje,
        traceId: rechazo.traceId,
      });
    }

    const respuestas: Record<
      typeof rechazo.motivo,
      { estado: number; error: string; apoyo: string }
    > = {
      SIN_WHITELIST: {
        estado: 503,
        error: "La cuenta no está autorizada en Sophon.",
        apoyo: "La autorización se tramita a mano con soporte. No hemos activado nada.",
      },
      // Sophon confirma lo que la comprobación local no siempre puede ver: esa
      // cuenta ya estaba en el programa de socios, así que es antigua.
      YA_AFILIADO: {
        estado: 409,
        error: "Esa cuenta ya estaba en Sophon.",
        apoyo: "Solo puedes dar de alta cuentas nuevas que registres tú. Las que ya existían son del superadmin.",
      },
      NO_REGISTRADO: {
        estado: 404,
        error: "Ese correo no existe en Sophon.",
        apoyo: "Tiene que registrarse en Sophon antes de que puedas activarlo.",
      },
      PETICION_MAL_FORMADA: {
        estado: 500,
        error: "No hemos podido registrar la activación.",
        apoyo: "No hemos activado nada. Ya estamos avisados.",
      },
      SIN_RESPUESTA: {
        estado: 502,
        error: "Sophon no responde.",
        apoyo: "No hemos activado nada. Vuelve a intentarlo en un minuto.",
      },
      // Sophon SÍ ha contestado, y ha dicho que no. Por eso no se invita a
      // reintentar: repetir contra un rechazo firme no lo convierte en un sí.
      DESCONOCIDO: {
        estado: 502,
        error: "Sophon ha rechazado la activación.",
        apoyo: "No hemos activado nada. El superadmin ya está avisado.",
      },
    };

    const { estado, ...cuerpo } = respuestas[rechazo.motivo];
    return NextResponse.json(cuerpo, { status: estado });
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
   * Queda pendiente de confirmar, se ve así en su ficha, y el barrido la sella.
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
  // aquí es una cuenta nueva. Aquí había una salida anticipada para el huérfano
  // adoptado —que no recibía el año, porque adoptar no es registrar— y con la
  // adopción cerrada esa rama no tenía forma de ejecutarse.
  const pro = await concederAnio({
    agenteId,
    webmasterId,
    emailWebmaster: parseado.data.email,
    motivo: "ALTA",
    claveIdempotencia: claveIdempotencia(agenteId, emailNormalizado, parseado.data.idempotencia),
  });

  return NextResponse.json({
    ok: true,
    email: parseado.data.email,
    devengaDesde: hoy,
    nuevo: true,
    /*
     * El alta está hecha pase lo que pase con el PRO. Se informa del resultado
     * en vez de fingir que todo fue bien o de fallar entera una operación que
     * sí ha prosperado.
     *
     * `yaActivo` se sigue leyendo como ÉXITO, y ahora es una red de seguridad y
     * no un caso de negocio: una cuenta recién registrada no puede traer PRO, y
     * si Sophon dijera que sí lo trae, lo que hay que hacer es dejarlo en paz.
     * Tratarlo como error le enseñaría al agente un aviso rojo por una operación
     * que salió bien y le empujaría a reintentar contra una membresía que no hay
     * que tocar. El caso que lo justificaba —adoptar un huérfano que ya venía
     * con PRO— ha dejado de existir.
     *
     * `renovado: false` lo separa de una concesión real: son dos hechos
     * distintos y la pantalla dice cosas distintas de cada uno.
     */
    pro: pro.ok
      ? { concedido: true, renovado: !pro.yaActivo, vigenteHasta: pro.vigenteHasta }
      : { concedido: false, renovado: false, error: pro.error ?? null, apoyo: pro.apoyo ?? null },
  });
}
