import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { normalizarCodigo, normalizarEmail, verificarOtp } from "@/lib/cripto";
import { idiomaDesdeTelegram } from "@/lib/idiomas";
import { emitirSesion, opcionesCookie, NOMBRE_COOKIE, telegramDeLaPeticion } from "@/lib/auth/sesion";

/**
 * Paso 2 del alta: verificar el OTP, crear el agente y abrir sesión.
 *
 * Todo ocurre en una transacción. Si se creara el agente fuera de ella y algo
 * fallara después, quedaría una cuenta a medias que ya no podría volver a darse
 * de alta —el Telegram constaría vinculado— y solo se arreglaría a mano.
 */

export const dynamic = "force-dynamic";

const Cuerpo = z.object({
  email: z.string().email().max(254),
  otp: z.string().regex(/^\d{6}$/, "el código son 6 dígitos"),
  codigo: z.string().min(4).max(32),
  nombre: z.string().trim().min(1).max(80).optional(),
});

export async function POST(peticion: Request): Promise<NextResponse> {
  const usuario = telegramDeLaPeticion(peticion);
  if (!usuario) {
    return NextResponse.json(
      { error: "Abre la aplicación desde Telegram para darte de alta." },
      { status: 401 },
    );
  }

  const parseado = Cuerpo.safeParse(await peticion.json().catch(() => null));
  if (!parseado.success) {
    return NextResponse.json({ error: "El código son 6 dígitos." }, { status: 400 });
  }

  const emailNormalizado = normalizarEmail(parseado.data.email);
  const codigoInvitacion = normalizarCodigo(parseado.data.codigo);

  const registro = await db.codigoOtp.findFirst({
    where: { emailNormalizado, proposito: "VINCULAR_CUENTA", consumidoEn: null },
    orderBy: { creadoEn: "desc" },
  });

  if (!registro || registro.expiraEn < new Date()) {
    return NextResponse.json(
      { error: "El código ha caducado.", apoyo: "Pide uno nuevo." },
      { status: 400 },
    );
  }

  if (registro.intentos >= registro.maxIntentos) {
    return NextResponse.json(
      { error: "Demasiados intentos fallidos.", apoyo: "Pide un código nuevo." },
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
    return NextResponse.json(
      {
        error: "El código no coincide.",
        apoyo:
          restantes > 0
            ? `Te ${restantes === 1 ? "queda 1 intento" : `quedan ${restantes} intentos`}.`
            : "Pide un código nuevo.",
        intentosRestantes: Math.max(restantes, 0),
      },
      { status: 400 },
    );
  }

  // El OTP se pidió desde este Telegram: si no coincide, alguien está usando un
  // código que no le llegó a él.
  if (registro.telegramId !== null && registro.telegramId !== BigInt(usuario.id)) {
    return NextResponse.json(
      { error: "Ese código se pidió desde otra cuenta de Telegram." },
      { status: 403 },
    );
  }

  const nombre =
    parseado.data.nombre?.trim() ||
    [usuario.first_name, usuario.last_name].filter(Boolean).join(" ").trim() ||
    parseado.data.email.split("@")[0] ||
    "Agente";

  // El idioma sale del `language_code` FIRMADO, no del `initDataUnsafe` que usa
  // la interfaz. Aquí se persiste, así que tiene que venir de datos verificados:
  // es lo que decidirá en qué idioma se le avisa de que se le ha pagado.
  const idioma = idiomaDesdeTelegram(usuario.language_code);

  let agenteId: string;
  try {
    agenteId = await db.$transaction(async (tx) => {
      const invitacion = await tx.codigoActivacion.findUnique({
        where: { codigo: codigoInvitacion },
      });
      if (
        !invitacion ||
        invitacion.anuladoEn ||
        invitacion.expiraEn < new Date() ||
        invitacion.usosActuales >= invitacion.usosMaximos
      ) {
        throw new Error("CODIGO_INVALIDO");
      }

      // Un correo solo puede tener una cuenta: si ya existe, se revincula en vez
      // de duplicar, que es el caso de un agente que cambió de Telegram.
      const existente = await tx.agente.findUnique({ where: { emailNormalizado } });
      if (existente) {
        if (existente.telegramId !== null && existente.telegramId !== BigInt(usuario.id)) {
          throw new Error("EMAIL_EN_USO");
        }
        await tx.agente.update({
          where: { id: existente.id },
          data: {
            telegramId: BigInt(usuario.id),
            telegramUsuario: usuario.username ?? null,
            estado: "ACTIVO",
            idioma,
          },
        });
        return existente.id;
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
    if (motivo === "CODIGO_INVALIDO") {
      return NextResponse.json(
        { error: "Ese código ya no es válido.", apoyo: "Pide uno nuevo al superadmin." },
        { status: 400 },
      );
    }
    if (motivo === "EMAIL_EN_USO") {
      return NextResponse.json(
        {
          error: "Ese correo ya está vinculado a otro Telegram.",
          apoyo: "Escribe al superadmin para recuperarlo.",
        },
        { status: 409 },
      );
    }
    console.error("[auth] alta fallida", e);
    return NextResponse.json({ error: "No se ha podido completar el alta." }, { status: 500 });
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
      accion: "alta.completada",
      recurso: emailNormalizado,
      detalle: { telegramId: String(usuario.id) },
    },
  });

  const respuesta = NextResponse.json({ ok: true, email: parseado.data.email, nombre });
  respuesta.cookies.set(NOMBRE_COOKIE, token, opcionesCookie());
  return respuesta;
}
