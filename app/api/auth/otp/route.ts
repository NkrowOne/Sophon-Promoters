import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { normalizarCodigo, normalizarEmail, verificarOtp } from "@/lib/cripto";
import { cadenas } from "@/lib/i18n";
import { idiomaDesdeTelegram } from "@/lib/idiomas";
import { decidirEntrada } from "@/lib/auth/entrada";
import { emitirSesion, opcionesCookie, NOMBRE_COOKIE, telegramDeLaPeticion } from "@/lib/auth/sesion";

/**
 * Paso 2 de la entrada: verificar el OTP, y crear el agente si no lo había.
 *
 * Todo ocurre en una transacción. Si se creara el agente fuera de ella y algo
 * fallara después, quedaría una cuenta a medias que ya no podría volver a darse
 * de alta —el Telegram constaría vinculado— y solo se arreglaría a mano.
 *
 * El código de activación es **opcional aquí por la misma razón que en
 * `/api/auth/codigo`**: el agente que vuelve no tiene ninguno. Y el reparto es
 * el mismo, para que las dos rutas no puedan opinar distinto sobre el mismo
 * correo: si `Agente` existe se revincula sin código, y si no existe se exige.
 */

export const dynamic = "force-dynamic";

const Cuerpo = z.object({
  email: z.string().email().max(254),
  otp: z.string().regex(/^\d{6}$/, "el código son 6 dígitos"),
  codigo: z.string().min(4).max(32).optional(),
  nombre: z.string().trim().min(1).max(80).optional(),
});

export async function POST(peticion: Request): Promise<NextResponse> {
  const usuario = telegramDeLaPeticion(peticion);

  /*
   * El idioma sale del `language_code` FIRMADO, no del `initDataUnsafe` que usa
   * la interfaz. Se persiste en el agente, así que tiene que venir de datos
   * verificados: es lo que decidirá en qué idioma se le avisa de que se le ha
   * pagado.
   *
   * Se resuelve aquí arriba, antes que nada, porque los errores de esta ruta
   * también lo necesitan y en este punto todavía no hay agente ni sesión de la
   * que sacarlo. Sin initData válido no hay ni `language_code` y se cae al
   * idioma por defecto.
   */
  const idioma = idiomaDesdeTelegram(usuario?.language_code);
  const t = cadenas(idioma);

  if (!usuario) {
    return NextResponse.json(
      { error: t.errSinTelegram, apoyo: t.errSinTelegramApoyo },
      { status: 401 },
    );
  }

  const parseado = Cuerpo.safeParse(await peticion.json().catch(() => null));
  if (!parseado.success) {
    return NextResponse.json(
      { error: t.errDatosNoValidos, apoyo: t.errDatosNoValidosApoyo },
      { status: 400 },
    );
  }

  const emailNormalizado = normalizarEmail(parseado.data.email);
  const codigoInvitacion = parseado.data.codigo
    ? normalizarCodigo(parseado.data.codigo)
    : null;

  const registro = await db.codigoOtp.findFirst({
    where: { emailNormalizado, proposito: "VINCULAR_CUENTA", consumidoEn: null },
    orderBy: { creadoEn: "desc" },
  });

  if (!registro || registro.expiraEn < new Date()) {
    return NextResponse.json(
      { error: t.errOtpCaducado, apoyo: t.errOtpCaducadoApoyo },
      { status: 400 },
    );
  }

  if (registro.intentos >= registro.maxIntentos) {
    return NextResponse.json(
      { error: t.errOtpSinIntentos, apoyo: t.errOtpSinIntentosApoyo },
      { status: 429 },
    );
  }

  if (!verificarOtp(parseado.data.otp, emailNormalizado, registro.codigoHash)) {
    const actualizado = await db.codigoOtp.update({
      where: { id: registro.id },
      data: { intentos: { increment: 1 } },
      select: { intentos: true, maxIntentos: true },
    });
    const restantes = actualizado.maxIntentos - actualizado.intentos;
    /*
     * Dos mensajes, no uno con el número pegado detrás. `errOtpIncorrecto` ya
     * lleva la cuenta dentro y concuerda el plural, pero con cero intentos
     * diría «te quedan 0 intentos», que es la forma más fría de decir que el
     * código está muerto. Ese caso lo cuenta `errOtpSinIntentos`, que además
     * dice qué hacer: pedir otro.
     */
    return NextResponse.json(
      restantes > 0
        ? { error: t.errOtpIncorrecto(restantes), intentosRestantes: restantes }
        : {
            error: t.errOtpSinIntentos,
            apoyo: t.errOtpSinIntentosApoyo,
            intentosRestantes: 0,
          },
      { status: 400 },
    );
  }

  // El OTP se pidió desde este Telegram: si no coincide, alguien está usando un
  // código que no le llegó a él.
  if (registro.telegramId !== null && registro.telegramId !== BigInt(usuario.id)) {
    return NextResponse.json(
      { error: t.errOtpOtraCuenta, apoyo: t.errOtpOtraCuentaApoyo },
      { status: 403 },
    );
  }

  const nombre =
    parseado.data.nombre?.trim() ||
    [usuario.first_name, usuario.last_name].filter(Boolean).join(" ").trim() ||
    parseado.data.email.split("@")[0] ||
    "Agente";

  let agenteId: string;
  /** Alta nueva o vuelta de un agente que ya estaba. Solo cambia lo que se anota. */
  let esAlta = true;
  try {
    agenteId = await db.$transaction(async (tx) => {
      /*
       * El agente EXISTENTE se mira primero, y esto no es un reordenado
       * cosmético: antes la invitación se validaba arriba del todo, así que
       * quien ya tenía cuenta seguía necesitando un código de activación en la
       * mano para volver a entrar. Un correo solo puede tener una cuenta, así
       * que si existe se revincula en vez de duplicar.
       */
      const existente = await tx.agente.findUnique({ where: { emailNormalizado } });

      /*
       * El MISMO reparto que aplicó `/api/auth/codigo` al mandar este OTP. Si
       * las dos rutas lo decidieran por su cuenta, la discrepancia llegaría el
       * día en que alguien tocara una sola: o se mandan códigos que aquí se
       * rechazan, o entra por aquí quien allí no pasó.
       */
      const camino = decidirEntrada({
        existente,
        telegramId: BigInt(usuario.id),
        codigo: codigoInvitacion,
      });

      if (camino.via === "correo_ajeno") throw new Error("EMAIL_EN_USO");
      /*
       * Una cuenta parada NO se reactiva por volver a entrar.
       *
       * El `estado: "ACTIVO"` de abajo estaba suelto, sin condición: un agente
       * SUSPENDIDO o de BAJA se levantaba el castigo él solo repitiendo el
       * alta, y en el panel del Operador aparecía activo sin que nadie lo
       * hubiera reactivado. Ahora ACTIVO solo sube desde PENDIENTE, que es lo
       * que este trámite significa: correo verificado.
       */
      if (camino.via === "cuenta_parada") throw new Error("SUSPENDIDO");
      // Sin cuenta y sin código no hay nada que crear. Aquí sí es un error: se
      // ha llegado con un OTP verificado y sin el papel que el alta necesita.
      if (camino.via === "pide_codigo") throw new Error("FALTA_CODIGO");

      /*
       * Se pregunta por `existente` y no por `camino.via === "vuelta"`, aunque
       * digan lo mismo: es lo que le deja a TypeScript saber que `existente.id`
       * existe. Los otros dos caminos que salen de un agente encontrado
       * —ajeno y parado— ya han lanzado arriba, así que llegar aquí con
       * `existente` es exactamente «vuelta».
       */
      if (existente) {
        await tx.agente.update({
          where: { id: existente.id },
          data: {
            telegramId: BigInt(usuario.id),
            telegramUsuario: usuario.username ?? null,
            estado: "ACTIVO",
            idioma,
          },
        });
        esAlta = false;
        return existente.id;
      }
      // Sin agente y sin «alta» no queda ningún camino, pero el compilador no
      // lo sabe y aquí abajo hace falta el código para leer la invitación.
      if (camino.via !== "alta") throw new Error("FALTA_CODIGO");

      const invitacion = await tx.codigoActivacion.findUnique({
        where: { codigo: camino.codigo },
      });
      if (
        !invitacion ||
        invitacion.anuladoEn ||
        invitacion.expiraEn < new Date() ||
        invitacion.usosActuales >= invitacion.usosMaximos
      ) {
        throw new Error("CODIGO_INVALIDO");
      }

      const creado = await tx.agente.create({
        data: {
          emailNormalizado,
          emailOriginal: parseado.data.email,
          nombreVisible: nombre,
          telegramId: BigInt(usuario.id),
          telegramUsuario: usuario.username ?? null,
          estado: "ACTIVO",
          idioma,
        },
      });

      await tx.codigoActivacion.update({
        where: { id: invitacion.id },
        data: { usosActuales: { increment: 1 }, agenteId: creado.id },
      });

      return creado.id;
    });
  } catch (e) {
    const motivo = e instanceof Error ? e.message : "";
    if (motivo === "CODIGO_INVALIDO" || motivo === "FALTA_CODIGO") {
      return NextResponse.json(
        { error: t.errCodigoNoVale, apoyo: t.teLoDaElOperador },
        { status: 400 },
      );
    }
    if (motivo === "SUSPENDIDO") {
      return NextResponse.json(
        { error: t.errSuspendido, apoyo: t.errSuspendidoApoyo },
        { status: 403 },
      );
    }
    if (motivo === "EMAIL_EN_USO") {
      return NextResponse.json(
        { error: t.errCorreoYaVinculado, apoyo: t.errCorreoYaVinculadoApoyo },
        { status: 409 },
      );
    }
    console.error("[auth] alta fallida", e);
    return NextResponse.json(
      { error: t.errNoVinculado, apoyo: t.errNoVinculadoApoyo },
      { status: 500 },
    );
  }

  // Se consume DESPUÉS de que el alta haya salido bien: si se marcara antes y la
  // transacción fallara, el agente se quedaría sin código y sin cuenta.
  await db.codigoOtp.update({
    where: { id: registro.id },
    data: { consumidoEn: new Date() },
  });

  const token = await emitirSesion({
    agenteId,
    telegramId: BigInt(usuario.id),
    ip: peticion.headers.get("x-forwarded-for"),
    agenteUsuario: peticion.headers.get("user-agent"),
  });

  await db.auditoria.create({
    data: {
      actorTipo: "AGENTE",
      actorId: agenteId,
      accion: esAlta ? "alta.completada" : "sesion.reabierta",
      recurso: emailNormalizado,
      detalle: { telegramId: String(usuario.id) },
    },
  });

  const respuesta = NextResponse.json({ ok: true, alta: esAlta, email: parseado.data.email, nombre });
  respuesta.cookies.set(NOMBRE_COOKIE, token, opcionesCookie());
  return respuesta;
}
