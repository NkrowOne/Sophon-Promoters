/**
 * Quién puede entrar, y por qué puerta.
 *
 * ── POR QUÉ ESTO ES UNA FUNCIÓN Y NO DOS `if` ──
 *
 * La decisión la toman DOS rutas sobre el mismo correo, en dos momentos
 * distintos y con un buzón de por medio: `/api/auth/codigo` decide si manda el
 * OTP y `/api/auth/otp` decide si crea la cuenta. Si discrepan, el agujero no
 * es teórico:
 *
 *  · si la primera es más laxa, se mandan OTPs a correos que la segunda va a
 *    rechazar después, y el agente recorre todo el trámite para chocar al final;
 *  · si la segunda es más laxa, un correo que la primera dio por ajeno acaba
 *    creando o revinculando una cuenta.
 *
 * Escrita dos veces, la discrepancia llega el día en que alguien toca una sola.
 * Aquí está escrita una vez, y es lo único de este trámite que se puede probar
 * sin base de datos: es aritmética sobre cuatro datos.
 *
 * ── LA REGLA, EN UNA FRASE ──
 *
 * **El código de activación es papel de alta, no llave.** Solo se pide a quien
 * todavía no tiene cuenta. Quien ya la tiene entra con su correo y el código de
 * verificación que le llega a él, siempre, sin límite de tiempo y sin tener que
 * pedirle nada al Operador.
 */

/** El estado de la cuenta, tal cual lo escribe Prisma (`EstadoAgente`). */
export type EstadoAgente = "PENDIENTE" | "ACTIVO" | "SUSPENDIDO" | "BAJA";

/** Lo poco que hace falta saber del agente que ya existe con ese correo. */
export interface AgenteConocido {
  telegramId: bigint | null;
  estado: EstadoAgente;
}

export type Entrada =
  /** Ya tiene cuenta y es suya: se le manda el OTP y punto. */
  | { via: "vuelta" }
  /** Correo nuevo con código válido en la mano: es un alta. */
  | { via: "alta"; codigo: string }
  /** Correo nuevo y sin código: hay que pedírselo antes de mandar nada. */
  | { via: "pide_codigo" }
  /** El correo tiene cuenta y es de OTRO Telegram. */
  | { via: "correo_ajeno" }
  /** Suspendido o de baja: no entra, y se le dice antes de gastar el trámite. */
  | { via: "cuenta_parada" };

export function decidirEntrada(params: {
  /** El agente que ya existe con ese correo normalizado, o `null`. */
  existente: AgenteConocido | null;
  /** El Telegram firmado que está preguntando. */
  telegramId: bigint;
  /** El código de activación normalizado, si la pantalla lo ha mandado. */
  codigo: string | null;
}): Entrada {
  const { existente, telegramId, codigo } = params;

  if (!existente) {
    // Sin cuenta y sin código no hay error: hay una pregunta que hacer.
    return codigo ? { via: "alta", codigo } : { via: "pide_codigo" };
  }

  /*
   * El correo tiene dueño y no es quien pregunta.
   *
   * Se corta ANTES de mandar nada, y eso es la mitad del arreglo: sin este
   * corte, cualquiera con un Telegram podía hacer que le llegara un OTP al
   * buzón de otro agente una vez por minuto, indefinidamente. Que ese OTP no le
   * sirviera de nada —el segundo paso compara el Telegram— no arregla el correo
   * basura ni el susto de quien lo recibe.
   *
   * `telegramId` a null es el caso legítimo de una cuenta que el Operador creó a
   * mano y que todavía no ha reclamado nadie: ahí sí se sigue.
   */
  if (existente.telegramId !== null && existente.telegramId !== telegramId) {
    return { via: "correo_ajeno" };
  }

  /*
   * `PENDIENTE` NO se para, y la diferencia importa: es la cuenta creada que
   * aún no ha verificado su correo, y verificarlo es exactamente lo que está a
   * punto de pasar. Pararla sería negarle el trámite que la activa.
   */
  if (existente.estado === "SUSPENDIDO" || existente.estado === "BAJA") {
    return { via: "cuenta_parada" };
  }

  /*
   * Y se vuelve AUNQUE traiga un código. Un agente que ya está dado de alta y
   * todavía guarda su código de activación no debe gastarlo por entrar: el
   * código lleva usos contados (`usosMaximos`) y puede estar emitido para
   * repartirlo. Aquí se ignora, que es lo que significa «papel de alta».
   */
  return { via: "vuelta" };
}
