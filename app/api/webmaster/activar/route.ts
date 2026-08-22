import { NextResponse } from "next/server";
import { z } from "zod";

import { cadenas } from "@/lib/i18n";
import { esRespuesta, exigirAgente } from "@/lib/api/agente";
import { altaDeWebmaster } from "@/lib/webmaster/alta";
import { intentoDeClaveDeOperador, ipDe } from "@/lib/auth/clave-operador";

/**
 * Activar un webmaster desde la Mini App.
 *
 * **Aquí ya no vive la operación**, solo su puerta HTTP: valida el cuerpo,
 * comprueba la sesión y traduce el resultado a JSON. La secuencia entera
 * —reservar en local, pedírselo a Sophon, deshacer si rechaza, conceder el año,
 * auditar— está en `lib/webmaster/alta.ts`, y el porqué está escrito allí: el
 * bot da de alta con `/activar correo@ejemplo.com` y necesita exactamente la
 * misma secuencia. Dos copias de la única operación que mueve dinero y crea
 * atribuciones es una copia que envejece sola.
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
  const { agenteId, idioma } = ctx.sesion;
  const t = cadenas(idioma);

  const crudo = await peticion.json().catch(() => null);

  /*
   * ── LA CLAVE DEL OPERADOR, TAMBIÉN AQUÍ ──
   *
   * Estaba solo en el campo de correo de la pantalla de ACCESO, y falló en el
   * primer uso real por un motivo que no tiene nada que ver con la seguridad:
   * **esa no es la pantalla donde el Operador ve un campo de correo.** Quien ya
   * tiene sesión solo ve este, el del webmaster que va a dar de alta. La
   * trampilla estaba en la puerta que casi nunca se abre.
   *
   * Va ANTES de validar porque el esquema exige que el campo sea un correo: una
   * clave que no lo parezca moriría en el `safeParse` sin llegar a comprobarse.
   *
   * La lógica —freno, registro, comparación en tiempo constante— vive entera en
   * `lib/auth/clave-operador.ts` y la comparten las dos rutas. Con una copia en
   * cada una, el próximo cambio se haría en una y la otra se quedaría vieja.
   */
  const escrito = typeof crudo?.email === "string" ? crudo.email.trim() : "";
  // `telegramId` puede ser nulo en una sesión antigua; sin él no hay a quién
  // contarle los intentos, y un freno que no sabe a quién frenar no frena. En
  // ese caso la puerta simplemente no está: se entra por la pantalla de acceso.
  if (
    ctx.sesion.telegramId !== null &&
    !z.string().email().max(254).safeParse(escrito).success
  ) {
    const respuesta = await intentoDeClaveDeOperador(
      escrito,
      ctx.sesion.telegramId,
      ipDe(peticion),
    );
    if (respuesta) return respuesta;
    // No era la clave: cae al `safeParse` de abajo y recibe el mismo «formato de
    // correo» que cualquiera. Nada en la respuesta delata que aquí hay puerta.
  }

  const parseado = Cuerpo.safeParse(crudo);
  if (!parseado.success) {
    return NextResponse.json(
      { error: t.errFormatoCorreo, apoyo: t.errFormatoCorreoApoyo },
      { status: 400 },
    );
  }

  const resultado = await altaDeWebmaster({
    agenteId,
    idioma,
    email: parseado.data.email,
    idempotencia: parseado.data.idempotencia,
  });

  // El texto se resuelve AQUÍ y no en el módulo: el bot pinta las mismas claves
  // en HTML de Telegram, así que lo que viaja entre los dos es la clave.
  if (!resultado.ok) {
    return NextResponse.json(
      { error: t[resultado.claveError], apoyo: t[resultado.claveApoyo] },
      { status: resultado.estado },
    );
  }

  return NextResponse.json({
    ok: true,
    email: resultado.email,
    devengaDesde: resultado.devengaDesde,
    nuevo: true,
    pro: resultado.pro,
  });
}
