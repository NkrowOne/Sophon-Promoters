/**
 * Cadenas de la interfaz.
 *
 * ── LA VOZ, EN CINCO REGLAS ──
 *
 * 1. **Tuteo y verbo conjugado.** «Has alcanzado el hito», nunca «Alcanzado el
 *    hito». Un participio suelto dirigido al agente es telegrama, no español.
 * 2. **El agente es el sujeto de lo que hace él.** La pasiva refleja vale para
 *    estados del sistema —«las revisiones son manuales»— y no para algo que
 *    tiene que hacer alguien: «la reactivación se solicita al superadmin» no
 *    dice quién la solicita, y quien la solicita es él.
 * 3. **Pretérito perfecto compuesto**, que es el uso peninsular para lo
 *    reciente: «has alcanzado», no «alcanzaste».
 * 4. **Sin felicitaciones, sin exclamaciones, sin emoji.** El agente es un
 *    profesional que cobra, no alguien a quien hay que animar. La recompensa es
 *    dinero y con enseñarlo bien basta.
 * 5. **Los errores dicen qué ha pasado, por qué y qué hacer ahora.** Los tres,
 *    y en ese orden.
 *
 * Están escritas porque su ausencia salió cara. Este fichero decía «tuteo,
 * verbo delante» mientras noventa de sus cadenas hacían lo contrario: una pasada
 * de «registro profesional» confundió profesional con impersonal y convirtió
 * media interfaz en etiquetas nominales —«Ver red», «Correo», «Aportado»— cuando
 * los propios nombres de las claves decían `verMiRed`, `tuCorreo`, `teHaDado`.
 * Profesional no es impersonal: es conjugar bien.
 *
 * Y las CINCO lenguas comparten estas reglas. Cada catálogo usa la segunda
 * persona de su idioma —`tu` en italiano y en portugués europeo, no `Lei` ni
 * `você`— porque un mismo producto no puede tutear en español y tratar de usted
 * en italiano.
 *
 * REGLA DURA: ninguna cadena puede revelar el reparto del superadmin ni el
 * importe que cobra el webmaster. El agente solo ve lo suyo.
 *
 * **Los catálogos son completos, no parciales.** Con `Partial` una clave sin
 * traducir cae al español sin avisar, y a un agente árabe le llega media
 * pantalla en un idioma que no lee mientras el build pasa en verde. Al exigir
 * el catálogo entero, olvidarse de una cadena es un error de compilación.
 *
 * El panel de superadmin NO se traduce: lo usa una sola persona, y mantener
 * cinco versiones de una pantalla que solo ella abre sería trabajo sin destino.
 */

import { IDIOMA_POR_DEFECTO, type Idioma } from "./idiomas";

export const es = {
  // ── Navegación y rótulos ──────────────────────────────────────────────────
  inicio: "Inicio",
  red: "Red",
  historico: "Histórico",
  cartera: "Cartera",
  webmaster: "Webmaster",
  devengado: "Devengado",
  disponible: "Disponible",
  solicitado: "Solicitado",
  pagado: "Pagado",
  volver: "Volver",
  cargando: "Cargando",
  sondeando: "Cargando datos",

  // ── Acciones ──────────────────────────────────────────────────────────────
  activarWebmaster: "Activar webmaster",
  solicitarRetiro: "Solicitar retiro",
  vincularCuenta: "Vincular mi cuenta",
  reintentar: "Reintentar",
  activar: "Activar",
  entrar: "Entrar",
  activarOtro: "Activar otro",
  verMiRed: "Ver mi red",
  verSuFicha: "Ver su ficha",
  volverAlInicio: "Volver al inicio",
  activarElPrimero: "Activar el primero",

  // ── Estados vacíos: invitan a actuar, no se disculpan ──────────────────────
  sinWebmasters: "Todavía no has activado ningún webmaster.",
  sinWebmastersApoyo: "Actívalo con su correo de Sophon.",
  sinIngresos: "Tu red aún no ha traído registros.",
  sinIngresosApoyo: "Aparecerán aquí en cuanto alguien se registre desde sus enlaces.",
  sinMovimientos: "Todavía no has solicitado ningún retiro.",
  sinVinculo: "Todavía no has vinculado tu cuenta.",

  // ── Alta del agente ───────────────────────────────────────────────────────
  vinculaTuCuenta: "Vincula tu cuenta",
  soloSeHaceUnaVez: "Solo lo haces una vez. Después entras siempre desde Telegram.",
  codigoDeActivacion: "Código de activación",
  teLoDaElSuperadmin: "Te lo da el superadmin.",
  tuCorreo: "Tu correo",
  seraTuIdentificador: "Será tu identificador. Te enviamos ahí un código de 6 dígitos.",
  enviarmeElCodigo: "Enviarme el código",
  confirmaQueEresTu: "Confirma que eres tú",
  pideCodigo: "Escribe el código que te ha dado el superadmin.",
  otpEnviado: (email: string) =>
    `Te hemos enviado un código de 6 dígitos a ${email}. Caduca en 10 minutos.`,
  codigoDeSeisDigitos: "Código de 6 dígitos",
  cambiarElCorreo: "Cambiar correo",
  reenviarEn: (segundos: number) => `Reenviar en ${segundos} s`,
  reenviarElCodigo: "Reenviar código",

  // ── Inicio ────────────────────────────────────────────────────────────────
  devengadoTreintaDias: "Devengado · 30 días",
  registrosYWebmasters: (registros: number, webmasters: number) =>
    `${registros.toLocaleString("es-ES")} ${registros === 1 ? "registro" : "registros"} · ${webmasters} ${
      webmasters === 1 ? "webmaster" : "webmasters"
    }`,
  repartoPorTier: "Registros por nivel",
  acciones: "Acciones",
  estadoDeTuDinero: "Estado de tu dinero",
  // ── Bono por hitos ────────────────────────────────────────────────────────
  bonoDelMes: "Bono del mes",
  registrosEsteMes: (n: number) =>
    `${n.toLocaleString("es-ES")} ${n === 1 ? "registro" : "registros"} este mes`,
  faltanParaElBono: (faltan: number, premio: string) =>
    `Te ${faltan === 1 ? "falta" : "faltan"} ${faltan.toLocaleString("es-ES")} ${
      faltan === 1 ? "registro" : "registros"
    } para ${premio}.`,
  bonoMaximoAlcanzado: "Has alcanzado el hito más alto del mes.",
  bonoGanado: (importe: string) => `Has ganado ${importe}`,
  escaleraDelBono: "Escalones del bono",
  /*
   * El ritmo y la recta final: las dos cifras que SÍ se mueven todos los días.
   *
   * Con los umbrales de hoy la barra del hito marca poco y va a seguir
   * marcando poco. Falsear su escala para que parezca más sería mentir sobre
   * lo que falta, así que lo que se añade es otra medida —la del propio
   * agente— que responde al trabajo de esta mañana aunque la meta esté lejos.
   */
  ritmoYRecta: (ritmo: number, dias: number) =>
    `Vas a ${ritmo.toLocaleString("es-ES")} ${ritmo === 1 ? "registro" : "registros"} al día y te ${
      dias === 1 ? "queda" : "quedan"
    } ${dias} ${dias === 1 ? "día" : "días"} de mes.`,
  loAlcanzarasEl: (dia: number) => `A este ritmo lo alcanzarás el día ${dia}.`,
  cerrarasElMesEn: (registros: number) =>
    `A este ritmo cerrarás el mes en ${registros.toLocaleString("es-ES")}.`,
  frenteAlMesPasado: (porcentaje: number) =>
    `${porcentaje >= 0 ? "+" : "−"}${Math.abs(porcentaje)} % sobre el mes pasado`,
  quienTeAcerca: "Quién te está acercando",

  // ── Activar webmaster ─────────────────────────────────────────────────────
  correoDelWebmaster: "Correo del webmaster",
  tieneQueExistirYa: "Debe ser una cuenta ya registrada en Sophon.",
  yaEstaEnTuRed: (email: string) => `${email} ya está en tu red.`,
  cobrarasDesdeHoy: "Cobrarás por los registros posteriores a la activación. Los anteriores no cuentan.",

  // ── Tu red ────────────────────────────────────────────────────────────────
  conIncidencia: (n: number) => `${n} con incidencia`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} sin actividad en los últimos ${dias} ${dias === 1 ? "día" : "días"}, de ${total}`,
  todosProduciendo: (n: number) => `Los ${n} están produciendo`,
  escalaComun: (dias: number) =>
    `Cada columna, ${dias} ${dias === 1 ? "día" : "días"}. La altura indica el volumen de registros; la escala es común, así que puedes compararlos entre sí.`,

  // ── Estado de un webmaster ────────────────────────────────────────────────
  bloqueado: "Bloqueado",
  seVaABorrar: "Se va a borrar",
  desaparecido: "No consta",
  proCaducado: "Se le ha caducado el PRO",
  sinActividad: "Sin actividad",
  diasParado: (dias: number) => `${dias} ${dias === 1 ? "día" : "días"} sin actividad`,
  activoEnSophon: "Activo en Sophon",
  bloqueadoEnSophon: "Bloqueado en Sophon",
  pendienteDeBorrado: "Pendiente de borrado",
  yaNoApareceEnSophon: "No consta en Sophon",
  estadoSinComprobar: "Estado sin comprobar",

  // ── Ficha de webmaster ────────────────────────────────────────────────────
  enTuRedDesde: (fecha: string) => `en tu red desde el ${fecha}`,
  teHaDado: "Te ha aportado",
  registrosEnDias: (registros: number, dias: number) =>
    `${registros.toLocaleString("es-ES")} ${registros === 1 ? "registro" : "registros"} en ${dias} ${
      dias === 1 ? "día" : "días"
    }`,
  compraronPro: (n: number) => `${n} ${n === 1 ? "ha comprado" : "han comprado"} PRO`,
  cobrasDesde: (fecha: string) =>
    `Cobras por los registros desde el ${fecha}. Los anteriores no cuentan.`,
  ultimosDias: (dias: number) => (dias === 1 ? "Último día" : `Últimos ${dias} días`),
  todaviaSinRegistros: "Todavía no te ha traído ningún registro.",
  registroDeSondeo: "Actividad",

  // ── Enlaces de reparto ────────────────────────────────────────────────────
  susEnlaces: "Sus enlaces",
  conQueCapta: "Con estos enlaces capta. Datos en directo de Sophon.",
  sinEnlaces: "Todavía no ha publicado ningún enlace.",
  enlacesNoDisponibles: "Ahora no podemos consultar sus enlaces. Inténtalo más tarde.",
  enlaceCopiado: "Enlace copiado",
  numero: (n: number) => n.toLocaleString("es-ES"),
  registrosCortos: (n: number) =>
    `${n.toLocaleString("es-ES")} ${n === 1 ? "registro" : "registros"}`,

  // ── La Mecha ──────────────────────────────────────────────────────────────
  tiempoRestanteDePro: "Tiempo restante de PRO",
  venceEl: (fecha: string) => `vence el ${fecha}`,
  caducado: "caducado",
  diasDePro: (dias: number) => `${dias} ${dias === 1 ? "día" : "días"} de PRO`,
  semanasDePro: (semanas: number) => `${semanas} ${semanas === 1 ? "semana" : "semanas"} de PRO`,
  proYaCaducado: "PRO caducado",
  sinProActivo: "Sin PRO activo.",
  sinPro: "Sin PRO",

  // ── PRO: siempre un año y atado al alta ───────────────────────────────────
  incluyeUnAnio: "Al activarlo le das un año de PRO.",
  continuar: "Continuar",
  vasAActivar: "Vas a activar",
  corregirElCorreo: "Corregir correo",
  altaNoSeDeshace: "No podrás deshacer la activación: el webmaster queda vinculado a ti en Sophon.",
  proConcedido: (fecha: string) => `Le has dado PRO hasta el ${fecha}.`,
  proNoConcedido: "Ya tienes al webmaster en tu red, pero no hemos podido darle el PRO.",
  proNoConcedidoApoyo: "Reinténtalo desde su ficha. No tienes que repetir el alta.",
  renovarUnAnio: "Renovar un año",
  darUnAnio: "Darle un año de PRO",
  renovado: (email: string, fecha: string) => `${email} tiene PRO hasta el ${fecha}.`,
  colaRenovaciones: "Renovaciones",
  puedesRenovar: (n: number) => `${n} ${n === 1 ? "listo" : "listos"} para renovar`,
  ningunoRenovable: "Todavía no puedes renovar ninguno.",
  nuncaTuvoPro: "Nunca ha tenido PRO",
  puedesRenovarAhora: "Ya puedes renovarlo",
  proActivo: "PRO activo",
  podrasRenovarloCuandoSeApague: "Podrás renovarlo cuando le caduque el PRO.",

  // ── Histórico ─────────────────────────────────────────────────────────────
  enDias: (dias: number) => `en ${dias} ${dias === 1 ? "día" : "días"}`,
  tocaUnDia: "Toca un día para ver el desglose.",
  columnaDia: "Día",
  columnaDolares: "Dólares",
  perforando: "Cargando el desglose",
  aquiEmpieza: "Aquí empieza tu histórico. No hay nada anterior.",
  desglose: (registros: number, t1: number, t2: number, t3: number) =>
    `${registros.toLocaleString("es-ES")} ${
      registros === 1 ? "registro" : "registros"
    } · T1 ${t1} · T2 ${t2} · T3 ${t3}`,
  dePago: (n: number) => `${n} de pago`,
  diaAbierto: "Día en curso: los datos pueden variar.",

  // ── Cartera ───────────────────────────────────────────────────────────────
  soloConsolidado: "Solo puedes solicitar el saldo consolidado: los últimos días siguen sujetos a revisión.",
  revisionManual: "Las revisiones son manuales. Plazo de resolución: de 1 a 3 días.",
  solicitudEnCurso: "Solicitud en curso",
  pendienteDeRevision: "Pendiente de revisión",
  aprobadoPendientePago: "Aprobado: te pagamos en breve",
  estadoPagado: "Pagado",
  estadoRechazado: "Rechazado",
  estadoCancelado: "Cancelado",
  pedidaEl: (fecha: string) => `La solicitaste el ${fecha}.`,
  soloUnaALaVez: "Solo puedes tener una solicitud a la vez. Podrás pedir la siguiente en cuanto resolvamos esta.",
  cuanto: "Cuánto quieres retirar",
  todo: "Todo",
  disponibleYMinimo: "Disponible",
  minimo: "mínimo",
  tePasasEn: (importe: string) => `El importe supera el disponible en ${importe}.`,
  teFaltanParaElMinimo: (importe: string) => `El importe queda ${importe} por debajo del mínimo.`,
  enQueRed: "En qué red",
  walletUsdt: "Monedero USDT",
  usdtEn: (red: string, pista: string) =>
    `USDT en ${red}. ${pista} Si te equivocas de red, perderás el pago.`,
  direccionMalFormada: (red: string, pista: string) =>
    `Dirección no válida para ${red}. ${pista}`,
  pistaTrc20: "Empieza por T y tiene 34 caracteres.",
  pistaBsc: "Empieza por 0x y tiene 42 caracteres.",
  pistaTon: "Empieza por EQ o UQ y tiene 48 caracteres.",
  pedirImporte: (importe: string) => `Solicitar ${importe}`,
  pedirRetiro: "Solicitar retiro",
  solicitudesAnteriores: "Anteriores",

  // ── Errores: qué pasó · por qué · qué hago ahora ──────────────────────────
  sesionCaducada: "Se te ha caducado la sesión.",
  sesionCaducadaApoyo: "Vuelve a entrar con tu correo. No pierdes nada de lo tuyo.",
  algoHaFallado: "No hemos podido completar la operación.",
  comoCobras: "Cobras 0,03 $ por cada usuario que registre, sea cual sea su país.",

  // ── El bot ────────────────────────────────────────────────────────────────
  //
  // El bot habla el idioma del agente igual que la Mini App. Los dos son la
  // misma aplicación vista desde sitios distintos, y un menú en español delante
  // de una pantalla en árabe delata que la traducción se hizo por encima.
  //
  // Los comandos de gestión —/codigo, /agentes, /retiros, /panel— NO están
  // aquí: los usa una sola persona y traducirlos sería trabajo sin destino.
  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "Para entrar necesitas un código de activación. Te lo da el superadmin.",
  botCuandoLoTengas: "Cuando lo tengas, vincula tu cuenta aquí.",
  botHola: (nombre: string) => `Hola, ${nombre}. Elige por dónde empiezas.`,
  botVincularCuenta: "Vincular mi cuenta",
  botSuspendido: "Tienes la cuenta suspendida. Escribe al superadmin para reactivarla.",
  botSinPublicar: "La aplicación no está publicada todavía. Avisa al superadmin.",
  botCadaComando: "Cada comando abre una pantalla:",
  botOStart: "O /start para el menú completo.",
  botComandoDesconocido: "No conozco ese comando. Prueba /ayuda.",
  botUsaStart: "Usa /start para abrir la aplicación.",

  // Avisos que salen del panel hacia el agente.
  botRetiroPagado: (importe: string) => `Has cobrado ${importe}.`,
  // ── Aviso diario: la red se está apagando ─────────────────────────────────
  botRedTitulo: "Tu red necesita una llamada",
  botRedParados: (n: number, total: number) =>
    `${n} de tus ${total} webmasters llevan tiempo sin traer un registro:`,
  botRedDiasParado: (dias: number) => `${dias} ${dias === 1 ? "día" : "días"} sin actividad`,
  // La consecuencia va en la cadena, no en la cabeza de quien lea. «Con
  // incidencia» a secas se puede leer como una molestia menor; lo que hace que
  // el agente coja el teléfono es saber que ese webmaster no produce.
  botRedIncidencias: (n: number) =>
    `${n} ${n === 1 ? "webmaster" : "webmasters"} con incidencia en Sophon; no ${
      n === 1 ? "puede" : "pueden"
    } generar registros:`,
  botRedYOtros: (n: number) => `…y ${n} más.`,
  botRedComoVerlo: "Ábrelos en «Tu red» para ver con qué enlaces captan.",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `Referencia: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `Hemos aprobado tu retiro de ${importe}. El pago sale en breve.`,
  botRetiroRechazado: (importe: string) =>
    `Hemos rechazado tu retiro de ${importe}. Vuelves a tener el saldo disponible.`,
  botMotivo: (motivo: string) => `Motivo: ${motivo}`,
} as const;

/**
 * Ensancha los tipos literales del catálogo español.
 *
 * `as const` hace que cada cadena de `es` sea su propio tipo —«Inicio» en vez
 * de `string`—, lo cual es útil dentro del español y hace imposible escribir
 * los demás idiomas: «Home» no es asignable a «Inicio». Esto conserva la lista
 * exacta de claves y las firmas de las funciones, pero deja el valor como
 * `string`, que es lo que de verdad se quiere exigir.
 */
type Ensanchar<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => unknown ? (...args: A) => string : string;
};

export type Cadenas = Ensanchar<typeof es>;

const en: Cadenas = {
  inicio: "Home",
  red: "Network",
  historico: "History",
  cartera: "Wallet",
  webmaster: "Webmaster",
  devengado: "Earned",
  disponible: "Available",
  solicitado: "Requested",
  pagado: "Paid",
  volver: "Back",
  cargando: "Loading",
  sondeando: "Loading data",

  activarWebmaster: "Activate webmaster",
  solicitarRetiro: "Request payout",
  vincularCuenta: "Link my account",
  reintentar: "Try again",
  activar: "Activate",
  entrar: "Sign in",
  activarOtro: "Activate another",
  verMiRed: "View my network",
  verSuFicha: "View their details",
  volverAlInicio: "Back to home",
  activarElPrimero: "Activate your first one",

  sinWebmasters: "You have not activated any webmaster yet.",
  sinWebmastersApoyo: "Activate them with their Sophon email.",
  sinIngresos: "Your network has not brought any signups yet.",
  sinIngresosApoyo: "They will show up here as soon as someone signs up through their links.",
  sinMovimientos: "You have not requested any payout yet.",
  sinVinculo: "You have not linked your account yet.",

  vinculaTuCuenta: "Link your account",
  soloSeHaceUnaVez: "You only do this once. After that you always come in from Telegram.",
  codigoDeActivacion: "Activation code",
  teLoDaElSuperadmin: "The superadmin gives it to you.",
  tuCorreo: "Your email",
  seraTuIdentificador: "It will be your sign-in. We send a 6-digit code to that address.",
  enviarmeElCodigo: "Send me the code",
  confirmaQueEresTu: "Confirm it is you",
  pideCodigo: "Type the code the superadmin gave you.",
  otpEnviado: (email: string) =>
    `We have sent a 6-digit code to ${email}. It expires in 10 minutes.`,
  codigoDeSeisDigitos: "6-digit code",
  cambiarElCorreo: "Change email",
  reenviarEn: (segundos: number) => `Resend in ${segundos}s`,
  reenviarElCodigo: "Resend code",

  devengadoTreintaDias: "Earned · 30 days",
  registrosYWebmasters: (registros: number, webmasters: number) =>
    `${registros.toLocaleString("en-US")} ${registros === 1 ? "signup" : "signups"} · ${webmasters} ${
      webmasters === 1 ? "webmaster" : "webmasters"
    }`,
  repartoPorTier: "Signups by level",
  acciones: "Actions",
  estadoDeTuDinero: "Where your money is",
  bonoDelMes: "Monthly bonus",
  registrosEsteMes: (n: number) =>
    `${n.toLocaleString("en-US")} ${n === 1 ? "signup" : "signups"} this month`,
  faltanParaElBono: (faltan: number, premio: string) =>
    `You need ${faltan.toLocaleString("en-US")} more ${
      faltan === 1 ? "signup" : "signups"
    } to reach ${premio}.`,
  bonoMaximoAlcanzado: "You have reached the top milestone of the month.",
  bonoGanado: (importe: string) => `You have earned ${importe}`,
  escaleraDelBono: "Bonus milestones",
  ritmoYRecta: (ritmo: number, dias: number) =>
    `You are averaging ${ritmo.toLocaleString("en-US")} ${
      ritmo === 1 ? "signup" : "signups"
    } a day, with ${dias} ${dias === 1 ? "day" : "days"} left in the month.`,
  loAlcanzarasEl: (dia: number) => `At this rate you will reach it on day ${dia}.`,
  cerrarasElMesEn: (registros: number) =>
    `At this rate you will close the month at ${registros.toLocaleString("en-US")}.`,
  frenteAlMesPasado: (porcentaje: number) =>
    `${porcentaje >= 0 ? "+" : "−"}${Math.abs(porcentaje)} % vs last month`,
  quienTeAcerca: "Who is getting you there",

  correoDelWebmaster: "Webmaster's email",
  tieneQueExistirYa: "Must be an account already registered on Sophon.",
  yaEstaEnTuRed: (email: string) => `${email} is already in your network.`,
  cobrarasDesdeHoy: "You will earn on signups after activation. Earlier ones do not count.",

  conIncidencia: (n: number) => `${n} with an issue`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} with no activity in the last ${dias} ${dias === 1 ? "day" : "days"}, out of ${total}`,
  todosProduciendo: (n: number) => `All ${n} are producing`,
  escalaComun: (dias: number) =>
    `Each column is ${dias} days. Height shows signup volume; the scale is shared, so you can compare webmasters directly.`,

  bloqueado: "Blocked",
  seVaABorrar: "About to be deleted",
  desaparecido: "Not found",
  proCaducado: "Their PRO has expired",
  sinActividad: "No activity",
  diasParado: (dias: number) => `${dias} ${dias === 1 ? "day" : "days"} inactive`,
  activoEnSophon: "Active on Sophon",
  bloqueadoEnSophon: "Blocked on Sophon",
  pendienteDeBorrado: "Pending deletion",
  yaNoApareceEnSophon: "Not found on Sophon",
  estadoSinComprobar: "Status not checked",

  enTuRedDesde: (fecha: string) => `in your network since ${fecha}`,
  teHaDado: "They have brought you",
  registrosEnDias: (registros: number, dias: number) => `${registros.toLocaleString("en-US")} ${registros === 1 ? "signup" : "signups"} in ${dias} ${
      dias === 1 ? "day" : "days"
    }`,
  compraronPro: (n: number) => `${n} ${n === 1 ? "has" : "have"} bought PRO`,
  cobrasDesde: (fecha: string) =>
    `You earn on signups from ${fecha}. Earlier ones do not count.`,
  ultimosDias: (dias: number) => (dias === 1 ? "Last day" : `Last ${dias} days`),
  todaviaSinRegistros: "They have not brought you a single signup yet.",
  registroDeSondeo: "Activity",

  susEnlaces: "Their links",
  conQueCapta: "These are the links they sign people up with. Live data from Sophon.",
  sinEnlaces: "They have not published any link yet.",
  enlacesNoDisponibles: "We cannot reach their links right now. Try again later.",
  enlaceCopiado: "Link copied",
  numero: (n: number) => n.toLocaleString("en-US"),
  registrosCortos: (n: number) =>
    `${n.toLocaleString("en-US")} ${n === 1 ? "signup" : "signups"}`,

  tiempoRestanteDePro: "PRO time left",
  venceEl: (fecha: string) => `ends ${fecha}`,
  caducado: "expired",
  diasDePro: (dias: number) => `${dias} ${dias === 1 ? "day" : "days"} of PRO`,
  semanasDePro: (semanas: number) => `${semanas} ${semanas === 1 ? "week" : "weeks"} of PRO`,
  proYaCaducado: "PRO expired",
  sinProActivo: "No active PRO.",
  sinPro: "No PRO",

  incluyeUnAnio: "Activating them gives them a year of PRO.",
  continuar: "Continue",
  vasAActivar: "You are about to activate",
  corregirElCorreo: "Edit email",
  altaNoSeDeshace: "You will not be able to undo this: the webmaster stays linked to you on Sophon.",
  proConcedido: (fecha: string) => `You gave them PRO until ${fecha}.`,
  proNoConcedido: "You have the webmaster in your network, but we could not give them PRO.",
  proNoConcedidoApoyo: "Try again from their details. You do not have to activate them again.",
  renovarUnAnio: "Renew for a year",
  darUnAnio: "Give them a year of PRO",
  renovado: (email: string, fecha: string) => `${email} has PRO until ${fecha}.`,
  colaRenovaciones: "Renewals",
  puedesRenovar: (n: number) => `${n} ready to renew`,
  ningunoRenovable: "You cannot renew any of them yet.",
  nuncaTuvoPro: "Has never had PRO",
  puedesRenovarAhora: "You can renew it now",
  proActivo: "PRO active",
  podrasRenovarloCuandoSeApague: "You will be able to renew it when their PRO expires.",

  enDias: (dias: number) => `over ${dias} ${dias === 1 ? "day" : "days"}`,
  tocaUnDia: "Tap a day to see the breakdown.",
  columnaDia: "Day",
  columnaDolares: "Dollars",
  perforando: "Loading breakdown",
  aquiEmpieza: "Your history starts here. There is nothing earlier.",
  desglose: (registros: number, t1: number, t2: number, t3: number) =>
    `${registros.toLocaleString("en-US")} ${
      registros === 1 ? "signup" : "signups"
    } · T1 ${t1} · T2 ${t2} · T3 ${t3}`,
  dePago: (n: number) => `${n} paying`,
  diaAbierto: "Day in progress: data may change.",

  soloConsolidado: "You can only request the consolidated balance: recent days are still under review.",
  revisionManual: "Reviews are manual. Resolution time: 1 to 3 days.",
  solicitudEnCurso: "Request in progress",
  pendienteDeRevision: "Awaiting review",
  aprobadoPendientePago: "Approved: we pay you shortly",
  estadoPagado: "Paid",
  estadoRechazado: "Rejected",
  estadoCancelado: "Cancelled",
  pedidaEl: (fecha: string) => `You requested it on ${fecha}.`,
  soloUnaALaVez: "You can only have one request at a time. You will be able to make the next one as soon as we resolve this one.",
  cuanto: "How much you want to withdraw",
  todo: "All",
  disponibleYMinimo: "Available",
  minimo: "minimum",
  tePasasEn: (importe: string) => `You are ${importe} over what you have available.`,
  teFaltanParaElMinimo: (importe: string) => `You need ${importe} more to reach the minimum.`,
  enQueRed: "Which network",
  walletUsdt: "USDT wallet",
  usdtEn: (red: string, pista: string) =>
    `USDT on ${red}. ${pista} If you pick the wrong network, you lose the payment.`,
  direccionMalFormada: (red: string, pista: string) =>
    `Invalid address for ${red}. ${pista}`,
  pistaTrc20: "Starts with T and is 34 characters long.",
  pistaBsc: "Starts with 0x and is 42 characters long.",
  pistaTon: "Starts with EQ or UQ and is 48 characters long.",
  pedirImporte: (importe: string) => `Request ${importe}`,
  pedirRetiro: "Request payout",
  solicitudesAnteriores: "Earlier",

  sesionCaducada: "Your session has expired.",
  sesionCaducadaApoyo: "Sign in again with your email. You lose nothing of yours.",
  algoHaFallado: "We could not complete the operation.",
  comoCobras: "You earn $0.03 for every user they sign up, whatever their country.",

  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "You need an activation code to come in. The superadmin gives it to you.",
  botCuandoLoTengas: "Once you have it, link your account here.",
  botHola: (nombre: string) => `Hello, ${nombre}. Pick where you start.`,
  botVincularCuenta: "Link my account",
  botSuspendido: "Your account is suspended. Write to the superadmin to reactivate it.",
  botSinPublicar: "The app is not published yet. Let the superadmin know.",
  botCadaComando: "Each command opens a screen:",
  botOStart: "Or /start for the full menu.",
  botComandoDesconocido: "I do not know that command. Try /ayuda.",
  botUsaStart: "Use /start to open the app.",

  botRetiroPagado: (importe: string) => `You have been paid ${importe}.`,
  botRedTitulo: "Your network needs a call",
  botRedParados: (n: number, total: number) =>
    `${n} of your ${total} webmasters have gone a while without a signup:`,
  botRedDiasParado: (dias: number) => `${dias} ${dias === 1 ? "day" : "days"} inactive`,
  botRedIncidencias: (n: number) =>
    `${n} ${n === 1 ? "webmaster" : "webmasters"} with an issue on Sophon; cannot generate signups:`,
  botRedYOtros: (n: number) => `…and ${n} more.`,
  botRedComoVerlo: "Open them under “Your network” to see which links they use.",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `Reference: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `We have approved your ${importe} payout. The payment goes out shortly.`,
  botRetiroRechazado: (importe: string) =>
    `We have rejected your ${importe} payout. You have the balance available again.`,
  botMotivo: (motivo: string) => `Reason: ${motivo}`,
};

const it: Cadenas = {
  inicio: "Inizio",
  red: "Rete",
  historico: "Storico",
  cartera: "Portafoglio",
  webmaster: "Webmaster",
  devengado: "Maturato",
  disponible: "Disponibile",
  solicitado: "Richiesto",
  pagado: "Pagato",
  volver: "Indietro",
  cargando: "Caricamento",
  sondeando: "Caricamento dati",

  activarWebmaster: "Attiva webmaster",
  solicitarRetiro: "Richiedi prelievo",
  vincularCuenta: "Collega il mio account",
  reintentar: "Riprova",
  activar: "Attiva",
  entrar: "Entra",
  activarOtro: "Attivane un altro",
  verMiRed: "Vedi la mia rete",
  verSuFicha: "Vedi la sua scheda",
  volverAlInicio: "Torna all'inizio",
  activarElPrimero: "Attiva il primo",

  sinWebmasters: "Non hai ancora attivato nessun webmaster.",
  sinWebmastersApoyo: "Attivalo con la sua email di Sophon.",
  sinIngresos: "La tua rete non ha ancora portato iscrizioni.",
  sinIngresosApoyo: "Compariranno qui appena qualcuno si iscrive dai suoi link.",
  sinMovimientos: "Non hai ancora richiesto nessun prelievo.",
  sinVinculo: "Non hai ancora collegato il tuo account.",

  vinculaTuCuenta: "Collega il tuo account",
  soloSeHaceUnaVez: "Lo fai una sola volta. Dopo entri sempre da Telegram.",
  codigoDeActivacion: "Codice di attivazione",
  teLoDaElSuperadmin: "Te lo dà il superadmin.",
  tuCorreo: "La tua email",
  seraTuIdentificador: "Sarà il tuo identificativo. Ti inviamo lì un codice di 6 cifre.",
  enviarmeElCodigo: "Inviami il codice",
  confirmaQueEresTu: "Conferma che sei tu",
  pideCodigo: "Scrivi il codice che ti ha dato il superadmin.",
  otpEnviado: (email: string) =>
    `Ti abbiamo inviato un codice di 6 cifre a ${email}. Scade tra 10 minuti.`,
  codigoDeSeisDigitos: "Codice di 6 cifre",
  cambiarElCorreo: "Cambia email",
  reenviarEn: (segundos: number) => `Rinvia tra ${segundos} s`,
  reenviarElCodigo: "Rinvia codice",

  devengadoTreintaDias: "Maturato · 30 giorni",
  registrosYWebmasters: (registros: number, webmasters: number) =>
    `${registros.toLocaleString("it-IT")} ${registros === 1 ? "iscrizione" : "iscrizioni"} · ${webmasters} webmaster`,
  repartoPorTier: "Iscrizioni per livello",
  acciones: "Azioni",
  estadoDeTuDinero: "Dove sono i tuoi soldi",
  bonoDelMes: "Bonus del mese",
  registrosEsteMes: (n: number) =>
    `${n.toLocaleString("it-IT")} ${n === 1 ? "iscrizione" : "iscrizioni"} questo mese`,
  faltanParaElBono: (faltan: number, premio: string) =>
    `Ti ${faltan === 1 ? "manca" : "mancano"} ${faltan.toLocaleString("it-IT")} ${
      faltan === 1 ? "iscrizione" : "iscrizioni"
    } per ${premio}.`,
  bonoMaximoAlcanzado: "Hai raggiunto la soglia più alta del mese.",
  bonoGanado: (importe: string) => `Hai guadagnato ${importe}`,
  escaleraDelBono: "Soglie del bonus",
  ritmoYRecta: (ritmo: number, dias: number) =>
    `Vai a ${ritmo.toLocaleString("it-IT")} ${
      ritmo === 1 ? "iscrizione" : "iscrizioni"
    } al giorno e ti ${dias === 1 ? "resta" : "restano"} ${dias} ${
      dias === 1 ? "giorno" : "giorni"
    } di mese.`,
  loAlcanzarasEl: (dia: number) => `Di questo passo la raggiungerai il ${dia}.`,
  cerrarasElMesEn: (registros: number) =>
    `Di questo passo chiuderai il mese a ${registros.toLocaleString("it-IT")}.`,
  frenteAlMesPasado: (porcentaje: number) =>
    `${porcentaje >= 0 ? "+" : "−"}${Math.abs(porcentaje)} % rispetto al mese scorso`,
  quienTeAcerca: "Chi ti sta avvicinando",

  correoDelWebmaster: "Email del webmaster",
  tieneQueExistirYa: "Deve essere un account già registrato su Sophon.",
  yaEstaEnTuRed: (email: string) => `${email} è già nella tua rete.`,
  cobrarasDesdeHoy: "Guadagnerai sulle iscrizioni successive all'attivazione. Le precedenti non contano.",

  conIncidencia: (n: number) => `${n} con un problema`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} senza attività negli ultimi ${dias} ${dias === 1 ? "giorno" : "giorni"}, su ${total}`,
  todosProduciendo: (n: number) => `Tutti e ${n} stanno producendo`,
  escalaComun: (dias: number) =>
    `Ogni colonna, ${dias} giorni. L'altezza indica il volume di iscrizioni; la scala è comune, quindi puoi confrontarli tra loro.`,

  bloqueado: "Bloccato",
  seVaABorrar: "Sta per essere cancellato",
  desaparecido: "Non risulta",
  proCaducado: "Gli è scaduto il PRO",
  sinActividad: "Nessuna attività",
  diasParado: (dias: number) => `${dias} ${dias === 1 ? "giorno" : "giorni"} senza attività`,
  activoEnSophon: "Attivo su Sophon",
  bloqueadoEnSophon: "Bloccato su Sophon",
  pendienteDeBorrado: "In attesa di cancellazione",
  yaNoApareceEnSophon: "Non risulta su Sophon",
  estadoSinComprobar: "Stato non verificato",

  enTuRedDesde: (fecha: string) => `nella tua rete dal ${fecha}`,
  teHaDado: "Ti ha portato",
  registrosEnDias: (registros: number, dias: number) =>
    `${registros.toLocaleString("it-IT")} ${registros === 1 ? "iscrizione" : "iscrizioni"} in ${dias} ${
      dias === 1 ? "giorno" : "giorni"
    }`,
  compraronPro: (n: number) => `${n} ${n === 1 ? "ha" : "hanno"} comprato PRO`,
  cobrasDesde: (fecha: string) =>
    `Guadagni sulle iscrizioni dal ${fecha}. Le precedenti non contano.`,
  ultimosDias: (dias: number) => (dias === 1 ? "Ultimo giorno" : `Ultimi ${dias} giorni`),
  todaviaSinRegistros: "Non ti ha ancora portato nessuna iscrizione.",
  registroDeSondeo: "Attività",

  susEnlaces: "I suoi link",
  conQueCapta: "Con questi link acquisisce. Dati in tempo reale da Sophon.",
  sinEnlaces: "Non ha ancora pubblicato nessun link.",
  enlacesNoDisponibles: "Ora non riusciamo a leggere i suoi link. Riprova più tardi.",
  enlaceCopiado: "Link copiato",
  numero: (n: number) => n.toLocaleString("it-IT"),
  registrosCortos: (n: number) =>
    `${n.toLocaleString("it-IT")} ${n === 1 ? "iscrizione" : "iscrizioni"}`,

  tiempoRestanteDePro: "Tempo di PRO rimasto",
  venceEl: (fecha: string) => `scade il ${fecha}`,
  caducado: "scaduto",
  diasDePro: (dias: number) => `${dias} ${dias === 1 ? "giorno" : "giorni"} di PRO`,
  semanasDePro: (semanas: number) =>
    `${semanas} ${semanas === 1 ? "settimana" : "settimane"} di PRO`,
  proYaCaducado: "PRO scaduto",
  sinProActivo: "Nessun PRO attivo.",
  sinPro: "Senza PRO",

  incluyeUnAnio: "Attivandolo gli dai un anno di PRO.",
  continuar: "Continua",
  vasAActivar: "Stai per attivare",
  corregirElCorreo: "Correggi email",
  altaNoSeDeshace: "Non potrai annullare l'attivazione: il webmaster resta collegato a te su Sophon.",
  proConcedido: (fecha: string) => `Gli hai dato PRO fino al ${fecha}.`,
  proNoConcedido: "Hai già il webmaster nella tua rete, ma non siamo riusciti a dargli il PRO.",
  proNoConcedidoApoyo: "Riprova dalla sua scheda. Non devi ripetere l'attivazione.",
  renovarUnAnio: "Rinnova un anno",
  darUnAnio: "Dagli un anno di PRO",
  renovado: (email: string, fecha: string) => `${email} ha il PRO fino al ${fecha}.`,
  colaRenovaciones: "Rinnovi",
  puedesRenovar: (n: number) => `${n} da rinnovare`,
  ningunoRenovable: "Non puoi ancora rinnovarne nessuno.",
  nuncaTuvoPro: "Non ha mai avuto PRO",
  puedesRenovarAhora: "Puoi già rinnovarlo",
  proActivo: "PRO attivo",
  podrasRenovarloCuandoSeApague: "Potrai rinnovarlo quando gli scadrà il PRO.",

  enDias: (dias: number) => `in ${dias} ${dias === 1 ? "giorno" : "giorni"}`,
  tocaUnDia: "Tocca un giorno per vedere il dettaglio.",
  columnaDia: "Giorno",
  columnaDolares: "Dollari",
  perforando: "Caricamento del dettaglio",
  aquiEmpieza: "Qui inizia il tuo storico. Non c'è nulla di precedente.",
  desglose: (registros: number, t1: number, t2: number, t3: number) =>
    `${registros.toLocaleString("it-IT")} ${
      registros === 1 ? "iscrizione" : "iscrizioni"
    } · T1 ${t1} · T2 ${t2} · T3 ${t3}`,
  dePago: (n: number) => `${n} paganti`,
  diaAbierto: "Giorno in corso: i dati possono variare.",

  soloConsolidado: "Puoi richiedere solo il saldo consolidato: gli ultimi giorni sono ancora soggetti a revisione.",
  revisionManual: "Le revisioni sono manuali. Tempo di risoluzione: da 1 a 3 giorni.",
  solicitudEnCurso: "Richiesta in corso",
  pendienteDeRevision: "In attesa di revisione",
  aprobadoPendientePago: "Approvata: ti paghiamo a breve",
  estadoPagado: "Pagata",
  estadoRechazado: "Respinta",
  estadoCancelado: "Annullata",
  pedidaEl: (fecha: string) => `L'hai richiesta il ${fecha}.`,
  soloUnaALaVez: "Puoi avere una sola richiesta alla volta. Potrai fare la successiva appena risolviamo questa.",
  cuanto: "Quanto vuoi prelevare",
  todo: "Tutto",
  disponibleYMinimo: "Disponibile",
  minimo: "minimo",
  tePasasEn: (importe: string) => `Superi di ${importe} quello che hai disponibile.`,
  teFaltanParaElMinimo: (importe: string) => `Ti mancano ${importe} per arrivare al minimo.`,
  enQueRed: "Su quale rete",
  walletUsdt: "Portafoglio USDT",
  usdtEn: (red: string, pista: string) =>
    `USDT su ${red}. ${pista} Se sbagli rete, perdi il pagamento.`,
  direccionMalFormada: (red: string, pista: string) =>
    `Indirizzo non valido per ${red}. ${pista}`,
  pistaTrc20: "Inizia con T ed è lungo 34 caratteri.",
  pistaBsc: "Inizia con 0x ed è lungo 42 caratteri.",
  pistaTon: "Inizia con EQ o UQ ed è lungo 48 caratteri.",
  pedirImporte: (importe: string) => `Richiedi ${importe}`,
  pedirRetiro: "Richiedi prelievo",
  solicitudesAnteriores: "Precedenti",

  sesionCaducada: "La tua sessione è scaduta.",
  sesionCaducadaApoyo: "Rientra con la tua email. Non perdi nulla di tuo.",
  algoHaFallado: "Non siamo riusciti a completare l'operazione.",
  comoCobras: "Guadagni 0,03 $ per ogni utente che registra, qualunque sia il suo paese.",

  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "Per entrare ti serve un codice di attivazione. Te lo dà il superadmin.",
  botCuandoLoTengas: "Quando ce l'hai, collega il tuo account qui.",
  botHola: (nombre: string) => `Ciao, ${nombre}. Scegli da dove inizi.`,
  botVincularCuenta: "Collega il mio account",
  botSuspendido: "Hai l'account sospeso. Scrivi al superadmin per riattivarlo.",
  botSinPublicar:
    "L'applicazione non è ancora pubblicata. Il problema si segnala al superadmin.",
  botCadaComando: "Ogni comando apre una schermata:",
  botOStart: "Oppure /start per il menu completo.",
  botComandoDesconocido: "Non conosco questo comando. Prova /ayuda.",
  botUsaStart: "Usa /start per aprire l'applicazione.",

  botRetiroPagado: (importe: string) => `Hai incassato ${importe}.`,
  botRedTitulo: "La tua rete ha bisogno di una chiamata",
  botRedParados: (n: number, total: number) =>
    `${n} dei tuoi ${total} webmaster non portano un'iscrizione da tempo:`,
  botRedDiasParado: (dias: number) => `${dias} ${dias === 1 ? "giorno" : "giorni"} senza attività`,
  // «webmaster» es invariable en italiano —como «computer» o «manager»—, igual
  // que en `botRedParados` dos líneas más arriba. El plural va en el verbo.
  botRedIncidencias: (n: number) =>
    `${n} webmaster con un problema su Sophon; non ${
      n === 1 ? "può" : "possono"
    } generare iscrizioni:`,
  botRedYOtros: (n: number) => `…e altri ${n}.`,
  botRedComoVerlo: "Aprili in «La tua rete» per vedere con quali link acquisiscono.",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `Riferimento: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `Abbiamo approvato il tuo prelievo di ${importe}. Il pagamento parte a breve.`,
  botRetiroRechazado: (importe: string) =>
    `Abbiamo rifiutato il tuo prelievo di ${importe}. Hai di nuovo il saldo disponibile.`,
  botMotivo: (motivo: string) => `Motivo: ${motivo}`,
};

const pt: Cadenas = {
  inicio: "Início",
  red: "Rede",
  historico: "Histórico",
  cartera: "Carteira",
  webmaster: "Webmaster",
  devengado: "Acumulado",
  disponible: "Disponível",
  solicitado: "Solicitado",
  pagado: "Pago",
  volver: "Voltar",
  cargando: "A carregar",
  sondeando: "A carregar dados",

  activarWebmaster: "Ativar webmaster",
  solicitarRetiro: "Pedir levantamento",
  vincularCuenta: "Associar a minha conta",
  reintentar: "Tentar de novo",
  activar: "Ativar",
  entrar: "Entrar",
  activarOtro: "Ativar outro",
  verMiRed: "Ver a minha rede",
  verSuFicha: "Ver a ficha dele",
  volverAlInicio: "Voltar ao início",
  activarElPrimero: "Ativar o primeiro",

  sinWebmasters: "Ainda não ativaste nenhum webmaster.",
  sinWebmastersApoyo: "Ativa-o com o email dele na Sophon.",
  sinIngresos: "A tua rede ainda não trouxe registos.",
  sinIngresosApoyo: "Vão aparecer aqui assim que alguém se registar pelos links dele.",
  sinMovimientos: "Ainda não pediste nenhum levantamento.",
  sinVinculo: "Ainda não associaste a tua conta.",

  vinculaTuCuenta: "Associa a tua conta",
  soloSeHaceUnaVez: "Só o fazes uma vez. Depois entras sempre pelo Telegram.",
  codigoDeActivacion: "Código de ativação",
  teLoDaElSuperadmin: "É o superadmin que to dá.",
  tuCorreo: "O teu email",
  seraTuIdentificador: "Vai ser o teu identificador. Enviamos-te aí um código de 6 dígitos.",
  enviarmeElCodigo: "Enviar-me o código",
  confirmaQueEresTu: "Confirma que és tu",
  pideCodigo: "Escreve o código que o superadmin te deu.",
  otpEnviado: (email: string) =>
    `Enviámos-te um código de 6 dígitos para ${email}. Expira em 10 minutos.`,
  codigoDeSeisDigitos: "Código de 6 dígitos",
  cambiarElCorreo: "Alterar email",
  reenviarEn: (segundos: number) => `Reenviar em ${segundos} s`,
  reenviarElCodigo: "Reenviar código",

  devengadoTreintaDias: "Acumulado · 30 dias",
  registrosYWebmasters: (registros: number, webmasters: number) =>
    `${registros.toLocaleString("pt-PT")} ${registros === 1 ? "registo" : "registos"} · ${webmasters} ${
      webmasters === 1 ? "webmaster" : "webmasters"
    }`,
  repartoPorTier: "Registos por nível",
  acciones: "Ações",
  estadoDeTuDinero: "Onde está o teu dinheiro",
  bonoDelMes: "Bónus do mês",
  registrosEsteMes: (n: number) =>
    `${n.toLocaleString("pt-PT")} ${n === 1 ? "registo" : "registos"} este mês`,
  faltanParaElBono: (faltan: number, premio: string) =>
    `${faltan === 1 ? "Falta-te" : "Faltam-te"} ${faltan.toLocaleString("pt-PT")} ${
      faltan === 1 ? "registo" : "registos"
    } para ${premio}.`,
  bonoMaximoAlcanzado: "Atingiste o patamar mais alto do mês.",
  bonoGanado: (importe: string) => `Ganhaste ${importe}`,
  escaleraDelBono: "Patamares do bónus",
  ritmoYRecta: (ritmo: number, dias: number) =>
    `Vais a ${ritmo.toLocaleString("pt-PT")} ${
      ritmo === 1 ? "registo" : "registos"
    } por dia e ${dias === 1 ? "falta-te" : "faltam-te"} ${dias} ${
      dias === 1 ? "dia" : "dias"
    } de mês.`,
  loAlcanzarasEl: (dia: number) => `A este ritmo atinges-lo no dia ${dia}.`,
  cerrarasElMesEn: (registros: number) =>
    `A este ritmo fechas o mês em ${registros.toLocaleString("pt-PT")}.`,
  frenteAlMesPasado: (porcentaje: number) =>
    `${porcentaje >= 0 ? "+" : "−"}${Math.abs(porcentaje)} % sobre o mês passado`,
  quienTeAcerca: "Quem te está a aproximar",

  correoDelWebmaster: "Email do webmaster",
  tieneQueExistirYa: "Tem de ser uma conta já registada na Sophon.",
  yaEstaEnTuRed: (email: string) => `${email} já está na tua rede.`,
  cobrarasDesdeHoy: "Vais ganhar pelos registos posteriores à ativação. Os anteriores não contam.",

  conIncidencia: (n: number) => `${n} com problema`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} sem atividade nos últimos ${dias} ${dias === 1 ? "dia" : "dias"}, de ${total}`,
  todosProduciendo: (n: number) => `Os ${n} estão a produzir`,
  escalaComun: (dias: number) =>
    `Cada coluna, ${dias} dias. A altura indica o volume de registos; a escala é comum, por isso podes compará-los entre si.`,

  bloqueado: "Bloqueado",
  seVaABorrar: "Vai ser eliminado",
  desaparecido: "Não consta",
  proCaducado: "Expirou-lhe o PRO",
  sinActividad: "Sem atividade",
  diasParado: (dias: number) => `${dias} ${dias === 1 ? "dia" : "dias"} sem atividade`,
  activoEnSophon: "Ativo na Sophon",
  bloqueadoEnSophon: "Bloqueado na Sophon",
  pendienteDeBorrado: "A aguardar eliminação",
  yaNoApareceEnSophon: "Não consta na Sophon",
  estadoSinComprobar: "Estado por verificar",

  enTuRedDesde: (fecha: string) => `na tua rede desde ${fecha}`,
  teHaDado: "Trouxe-te",
  registrosEnDias: (registros: number, dias: number) => `${registros.toLocaleString("pt-PT")} ${registros === 1 ? "registo" : "registos"} em ${dias} ${
      dias === 1 ? "dia" : "dias"
    }`,
  compraronPro: (n: number) => `${n} ${n === 1 ? "comprou" : "compraram"} PRO`,
  cobrasDesde: (fecha: string) =>
    `Ganhas pelos registos a partir de ${fecha}. Os anteriores não contam.`,
  ultimosDias: (dias: number) => (dias === 1 ? "Último dia" : `Últimos ${dias} dias`),
  todaviaSinRegistros: "Ainda não te trouxe nenhum registo.",
  registroDeSondeo: "Atividade",

  susEnlaces: "Os links dele",
  conQueCapta: "É com estes links que capta. Dados em direto da Sophon.",
  sinEnlaces: "Ainda não publicou nenhum link.",
  enlacesNoDisponibles: "Agora não conseguimos ler os links dele. Tenta mais tarde.",
  enlaceCopiado: "Link copiado",
  numero: (n: number) => n.toLocaleString("pt-PT"),
  registrosCortos: (n: number) =>
    `${n.toLocaleString("pt-PT")} ${n === 1 ? "registo" : "registos"}`,

  tiempoRestanteDePro: "Tempo de PRO que falta",
  venceEl: (fecha: string) => `acaba a ${fecha}`,
  caducado: "expirado",
  diasDePro: (dias: number) => `${dias} ${dias === 1 ? "dia" : "dias"} de PRO`,
  semanasDePro: (semanas: number) => `${semanas} ${semanas === 1 ? "semana" : "semanas"} de PRO`,
  proYaCaducado: "PRO expirado",
  sinProActivo: "Sem PRO ativo.",
  sinPro: "Sem PRO",

  incluyeUnAnio: "Ao ativá-lo dás-lhe um ano de PRO.",
  continuar: "Continuar",
  vasAActivar: "Vais ativar",
  corregirElCorreo: "Corrigir email",
  altaNoSeDeshace: "Não vais poder desfazer a ativação: o webmaster fica associado a ti na Sophon.",
  proConcedido: (fecha: string) => `Deste-lhe PRO até ${fecha}.`,
  proNoConcedido: "Já tens o webmaster na tua rede, mas não conseguimos dar-lhe o PRO.",
  proNoConcedidoApoyo: "Tenta outra vez a partir da ficha dele. Não tens de repetir a ativação.",
  renovarUnAnio: "Renovar um ano",
  darUnAnio: "Dar-lhe um ano de PRO",
  renovado: (email: string, fecha: string) => `${email} tem PRO até ${fecha}.`,
  colaRenovaciones: "Renovações",
  puedesRenovar: (n: number) => `${n} ${n === 1 ? "pronto" : "prontos"} para renovar`,
  ningunoRenovable: "Ainda não podes renovar nenhum.",
  nuncaTuvoPro: "Nunca teve PRO",
  puedesRenovarAhora: "Já o podes renovar",
  proActivo: "PRO ativo",
  podrasRenovarloCuandoSeApague: "Vais poder renová-lo quando lhe expirar o PRO.",

  enDias: (dias: number) => `em ${dias} ${dias === 1 ? "dia" : "dias"}`,
  tocaUnDia: "Toca num dia para veres o detalhe.",
  columnaDia: "Dia",
  columnaDolares: "Dólares",
  perforando: "A carregar o detalhe",
  aquiEmpieza: "Aqui começa o teu histórico. Não há nada anterior.",
  desglose: (registros: number, t1: number, t2: number, t3: number) =>
    `${registros.toLocaleString("pt-PT")} ${
      registros === 1 ? "registo" : "registos"
    } · T1 ${t1} · T2 ${t2} · T3 ${t3}`,
  dePago: (n: number) => `${n} pagantes`,
  diaAbierto: "Dia em curso: os dados podem variar.",

  soloConsolidado: "Só podes pedir o saldo consolidado: os últimos dias ainda estão sujeitos a revisão.",
  revisionManual: "As revisões são manuais. Prazo de resolução: 1 a 3 dias.",
  solicitudEnCurso: "Pedido em curso",
  pendienteDeRevision: "A aguardar revisão",
  aprobadoPendientePago: "Aprovado: pagamos-te em breve",
  estadoPagado: "Pago",
  estadoRechazado: "Recusado",
  estadoCancelado: "Cancelado",
  pedidaEl: (fecha: string) => `Pediste-o a ${fecha}.`,
  soloUnaALaVez: "Só podes ter um pedido de cada vez. Vais poder fazer o seguinte assim que resolvermos este.",
  cuanto: "Quanto queres levantar",
  todo: "Tudo",
  disponibleYMinimo: "Disponível",
  minimo: "mínimo",
  tePasasEn: (importe: string) => `Passas-te em ${importe} do que tens disponível.`,
  teFaltanParaElMinimo: (importe: string) => `Faltam-te ${importe} para chegares ao mínimo.`,
  enQueRed: "Em que rede",
  walletUsdt: "Carteira USDT",
  usdtEn: (red: string, pista: string) =>
    `USDT na ${red}. ${pista} Se te enganares na rede, perdes o pagamento.`,
  direccionMalFormada: (red: string, pista: string) =>
    `Endereço inválido para ${red}. ${pista}`,
  pistaTrc20: "Começa por T e tem 34 caracteres.",
  pistaBsc: "Começa por 0x e tem 42 caracteres.",
  pistaTon: "Começa por EQ ou UQ e tem 48 caracteres.",
  pedirImporte: (importe: string) => `Solicitar ${importe}`,
  pedirRetiro: "Solicitar levantamento",
  solicitudesAnteriores: "Anteriores",

  sesionCaducada: "A tua sessão expirou.",
  sesionCaducadaApoyo: "Volta a entrar com o teu email. Não perdes nada do que é teu.",
  algoHaFallado: "Não conseguimos concluir a operação.",
  comoCobras: "Ganhas 0,03 $ por cada utilizador que registe, seja qual for o país.",

  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "Para entrares precisas de um código de ativação. É o superadmin que to dá.",
  botCuandoLoTengas: "Quando o tiveres, associa aqui a tua conta.",
  botHola: (nombre: string) => `Olá, ${nombre}. Escolhe por onde começas.`,
  botVincularCuenta: "Associar a minha conta",
  botSuspendido: "Tens a conta suspensa. Escreve ao superadmin para a reativar.",
  botSinPublicar:
    "A aplicação ainda não está publicada. A incidência é comunicada ao superadmin.",
  botCadaComando: "Cada comando abre um ecrã:",
  botOStart: "Ou /start para o menu completo.",
  botComandoDesconocido: "Não conheço esse comando. Experimenta /ayuda.",
  botUsaStart: "Usa /start para abrir a aplicação.",

  botRetiroPagado: (importe: string) => `Recebeste ${importe}.`,
  botRedTitulo: "A tua rede precisa de uma chamada",
  botRedParados: (n: number, total: number) =>
    `${n} dos teus ${total} webmasters já não trazem um registo há algum tempo:`,
  botRedDiasParado: (dias: number) => `${dias} ${dias === 1 ? "dia" : "dias"} sem atividade`,
  botRedIncidencias: (n: number) =>
    `${n} ${n === 1 ? "webmaster" : "webmasters"} com problema na Sophon; não ${
      n === 1 ? "pode" : "podem"
    } gerar registos:`,
  botRedYOtros: (n: number) => `…e mais ${n}.`,
  botRedComoVerlo: "Abre-os em «A tua rede» para veres com que links captam.",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `Referência: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `Aprovámos o teu levantamento de ${importe}. O pagamento sai em breve.`,
  botRetiroRechazado: (importe: string) =>
    `Recusámos o teu levantamento de ${importe}. Voltas a ter o saldo disponível.`,
  botMotivo: (motivo: string) => `Motivo: ${motivo}`,
};

/**
 * Árabe.
 *
 * El layout se invierte entero (`dir="rtl"`), pero los importes y los recuentos
 * siguen escribiéndose con cifras occidentales: es lo que usan las carteras de
 * criptomonedas y los exploradores de bloques que el agente va a mirar al lado,
 * y mezclar dos juegos de dígitos en una pantalla de dinero invita a error.
 */
const ar: Cadenas = {
  inicio: "الرئيسية",
  red: "الشبكة",
  historico: "السجل",
  cartera: "المحفظة",
  webmaster: "مشرف الموقع",
  devengado: "المستحق",
  disponible: "المتاح",
  solicitado: "المطلوب",
  pagado: "المدفوع",
  volver: "رجوع",
  cargando: "جارٍ التحميل",
  sondeando: "جارٍ تحميل البيانات",

  activarWebmaster: "تفعيل مشرف موقع",
  solicitarRetiro: "طلب سحب",
  vincularCuenta: "اربط حسابي",
  reintentar: "أعد المحاولة",
  activar: "تفعيل",
  entrar: "دخول",
  activarOtro: "تفعيل آخر",
  verMiRed: "شبكتي",
  verSuFicha: "بطاقته",
  volverAlInicio: "العودة إلى الرئيسية",
  activarElPrimero: "فعّل أول واحد",

  sinWebmasters: "لم تفعّل أي webmaster بعد.",
  sinWebmastersApoyo: "فعّله ببريده في Sophon.",
  sinIngresos: "شبكتك لم تجلب تسجيلات بعد.",
  sinIngresosApoyo: "ستظهر هنا فور أن يسجّل أحدهم عبر روابطه.",
  sinMovimientos: "لم تطلب أي سحب بعد.",
  sinVinculo: "لم تربط حسابك بعد.",

  vinculaTuCuenta: "اربط حسابك",
  soloSeHaceUnaVez: "تفعل ذلك مرة واحدة فقط. بعدها تدخل دائمًا من Telegram.",
  codigoDeActivacion: "رمز التفعيل",
  teLoDaElSuperadmin: "يعطيك إياه superadmin.",
  tuCorreo: "بريدك الإلكتروني",
  seraTuIdentificador: "سيكون معرّفك. نرسل إليه رمزًا من 6 أرقام.",
  enviarmeElCodigo: "أرسل لي الرمز",
  confirmaQueEresTu: "أكّد أنك أنت",
  pideCodigo: "اكتب الرمز الذي أعطاك إياه superadmin.",
  otpEnviado: (email: string) => `أرسلنا إليك رمزًا من 6 أرقام إلى ${email}. تنتهي صلاحيته خلال 10 دقائق.`,
  codigoDeSeisDigitos: "رمز من 6 أرقام",
  cambiarElCorreo: "تغيير البريد",
  reenviarEn: (segundos: number) => `إعادة الإرسال بعد ${segundos} ث`,
  reenviarElCodigo: "إعادة إرسال الرمز",

  devengadoTreintaDias: "المستحق · 30 يومًا",
  registrosYWebmasters: (registros: number, webmasters: number) =>
    `${registros.toLocaleString("ar-EG")} تسجيل · ${webmasters} webmaster`,
  repartoPorTier: "التسجيلات حسب المستوى",
  acciones: "الإجراءات",
  estadoDeTuDinero: "أين أموالك",
  bonoDelMes: "مكافأة الشهر",
  registrosEsteMes: (n: number) => `${n.toLocaleString("ar-EG")} تسجيل هذا الشهر`,
  faltanParaElBono: (faltan: number, premio: string) =>
    `يتبقّى لك ${faltan.toLocaleString("ar-EG")} تسجيل للوصول إلى ${premio}.`,
  bonoMaximoAlcanzado: "لقد بلغت أعلى مستوى لهذا الشهر.",
  bonoGanado: (importe: string) => `لقد ربحت ${importe}`,
  escaleraDelBono: "مستويات المكافأة",
  ritmoYRecta: (ritmo: number, dias: number) =>
    `معدّلك ${ritmo.toLocaleString("ar-EG")} تسجيل يوميًا، ويتبقّى ${dias} ${
      dias === 1 ? "يوم" : "أيام"
    } من الشهر.`,
  loAlcanzarasEl: (dia: number) => `بهذا المعدّل ستبلغه في اليوم ${dia}.`,
  cerrarasElMesEn: (registros: number) =>
    `بهذا المعدّل ستنهي الشهر عند ${registros.toLocaleString("ar-EG")}.`,
  frenteAlMesPasado: (porcentaje: number) =>
    `${porcentaje >= 0 ? "+" : "−"}${Math.abs(porcentaje)} % عن الشهر الماضي`,
  quienTeAcerca: "من يقرّبك من الهدف",

  correoDelWebmaster: "بريد مشرف الموقع",
  tieneQueExistirYa: "يجب أن يكون الحساب مسجَّلًا في Sophon مسبقًا.",
  yaEstaEnTuRed: (email: string) => `${email} موجود في شبكتك بالفعل.`,
  cobrarasDesdeHoy: "ستربح من التسجيلات اللاحقة للتفعيل. السابقة لا تُحتسب.",

  conIncidencia: (n: number) => `${n} بها مشكلة`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} بلا نشاط خلال آخر ${dias} يومًا، من أصل ${total}`,
  todosProduciendo: (n: number) => `الـ ${n} جميعهم ينتجون`,
  escalaComun: (dias: number) =>
    `كل عمود ${dias} أيام. يشير الارتفاع إلى حجم التسجيلات، والمقياس موحَّد بما يتيح لك المقارنة بينهم.`,

  bloqueado: "محظور",
  seVaABorrar: "على وشك الحذف",
  desaparecido: "غير مُدرج",
  proCaducado: "انتهت صلاحية PRO الخاص به",
  sinActividad: "بلا نشاط",
  diasParado: (dias: number) => `${dias} أيام بلا نشاط`,
  activoEnSophon: "نشط في Sophon",
  bloqueadoEnSophon: "محظور في Sophon",
  pendienteDeBorrado: "بانتظار الحذف",
  yaNoApareceEnSophon: "غير مُدرج في Sophon",
  estadoSinComprobar: "الحالة غير مُتحقق منها",

  enTuRedDesde: (fecha: string) => `في شبكتك منذ ${fecha}`,
  teHaDado: "جلب لك",
  registrosEnDias: (registros: number, dias: number) => `${registros} تسجيل خلال ${dias} يومًا`,
  compraronPro: (n: number) => `${n} اشترى PRO`,
  cobrasDesde: (fecha: string) => `تربح من التسجيلات منذ ${fecha}. السابقة لا تُحتسب.`,
  ultimosDias: (dias: number) => `آخر ${dias} يومًا`,
  todaviaSinRegistros: "لم يجلب لك أي تسجيل بعد.",
  registroDeSondeo: "النشاط",

  susEnlaces: "روابطه",
  conQueCapta: "بهذه الروابط يستقطب. بيانات مباشرة من Sophon.",
  sinEnlaces: "لم ينشر أي رابط بعد.",
  enlacesNoDisponibles: "لا نستطيع قراءة روابطه الآن. حاول لاحقًا.",
  enlaceCopiado: "نُسخ الرابط",
  numero: (n: number) => n.toLocaleString("ar-EG"),
  registrosCortos: (n: number) => `${n.toLocaleString("ar-EG")} تسجيل`,

  tiempoRestanteDePro: "ما تبقّى من PRO",
  venceEl: (fecha: string) => `ينتهي في ${fecha}`,
  caducado: "منتهٍ",
  diasDePro: (dias: number) => `${dias} يومًا من PRO`,
  semanasDePro: (semanas: number) => `${semanas} أسبوعًا من PRO`,
  proYaCaducado: "انتهت صلاحية PRO",
  sinProActivo: "لا يوجد PRO نشط.",
  sinPro: "بلا PRO",

  incluyeUnAnio: "بتفعيله تمنحه سنة من PRO.",
  continuar: "متابعة",
  vasAActivar: "أنت على وشك تفعيل",
  corregirElCorreo: "تصحيح البريد",
  altaNoSeDeshace: "لن تستطيع التراجع عن التفعيل: يبقى webmaster مرتبطًا بك في Sophon.",
  proConcedido: (fecha: string) => `منحته PRO حتى ${fecha}.`,
  proNoConcedido: "أصبح webmaster في شبكتك، لكننا لم نتمكن من منحه PRO.",
  proNoConcedidoApoyo: "أعد المحاولة من بطاقته. لا حاجة لتكرار التفعيل.",
  renovarUnAnio: "تجديد · سنة",
  darUnAnio: "امنحه سنة من PRO",
  renovado: (email: string, fecha: string) => `${email} لديه PRO حتى ${fecha}.`,
  colaRenovaciones: "التجديدات",
  puedesRenovar: (n: number) => `${n} للتجديد`,
  ningunoRenovable: "لا يمكنك تجديد أي منهم بعد.",
  nuncaTuvoPro: "لم يحصل على PRO قط",
  puedesRenovarAhora: "يمكنك تجديده الآن",
  proActivo: "PRO نشط",
  podrasRenovarloCuandoSeApague: "ستتمكن من تجديده عند انتهاء صلاحية PRO الخاص به.",

  enDias: (dias: number) => `خلال ${dias} يومًا`,
  tocaUnDia: "المس يومًا لترى التفصيل.",
  columnaDia: "اليوم",
  columnaDolares: "دولار",
  perforando: "جارٍ تحميل التفصيل",
  aquiEmpieza: "هنا يبدأ سجلك. لا يوجد شيء قبل ذلك.",
  desglose: (registros: number, t1: number, t2: number, t3: number) =>
    `${registros} تسجيل · T1 ${t1} · T2 ${t2} · T3 ${t3}`,
  dePago: (n: number) => `${n} مدفوع`,
  diaAbierto: "اليوم الجاري: البيانات قابلة للتغيّر.",

  soloConsolidado: "لا يمكنك طلب سوى الرصيد المُثبَّت: الأيام الأخيرة ما زالت خاضعة للمراجعة.",
  revisionManual: "المراجعات يدوية. مدة البتّ: من 1 إلى 3 أيام.",
  solicitudEnCurso: "طلب قيد المعالجة",
  pendienteDeRevision: "بانتظار المراجعة",
  aprobadoPendientePago: "تمت الموافقة: سندفع لك قريبًا",
  estadoPagado: "مدفوع",
  estadoRechazado: "مرفوض",
  estadoCancelado: "ملغى",
  pedidaEl: (fecha: string) => `طلبته في ${fecha}.`,
  soloUnaALaVez: "لا يمكنك أن يكون لديك سوى طلب واحد في كل مرة. ستتمكن من طلب التالي بمجرد أن نبتّ في هذا.",
  cuanto: "كم تريد أن تسحب",
  todo: "الكل",
  disponibleYMinimo: "المتاح",
  minimo: "الحد الأدنى",
  tePasasEn: (importe: string) => `تجاوزت المتاح لديك بمقدار ${importe}.`,
  teFaltanParaElMinimo: (importe: string) => `يتبقى لك ${importe} للوصول إلى الحد الأدنى.`,
  enQueRed: "على أي شبكة",
  walletUsdt: "محفظة USDT",
  usdtEn: (red: string, pista: string) =>
    `USDT على ${red}. ${pista} إن أخطأت الشبكة، ستخسر المبلغ.`,
  direccionMalFormada: (red: string, pista: string) =>
    `عنوان غير صالح لـ ${red}. ${pista}`,
  pistaTrc20: "يبدأ بحرف T وطوله 34 خانة.",
  pistaBsc: "يبدأ بـ 0x وطوله 42 خانة.",
  pistaTon: "يبدأ بـ EQ أو UQ وطوله 48 خانة.",
  pedirImporte: (importe: string) => `طلب ${importe}`,
  pedirRetiro: "طلب سحب",
  solicitudesAnteriores: "السابقة",

  sesionCaducada: "انتهت صلاحية جلستك.",
  sesionCaducadaApoyo: "ادخل من جديد ببريدك. لن تفقد شيئًا مما لك.",
  algoHaFallado: "لم نتمكن من إتمام العملية.",
  comoCobras: "تربح 0,03 $ عن كل مستخدم يسجّله، أيًا كان بلده.",

  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "تحتاج رمز تفعيل للدخول. يعطيك إياه superadmin.",
  botCuandoLoTengas: "عندما تحصل عليه، اربط حسابك هنا.",
  botHola: (nombre: string) => `مرحبًا، ${nombre}. اختر من أين تبدأ.`,
  botVincularCuenta: "اربط حسابي",
  botSuspendido: "حسابك موقوف. راسل superadmin لإعادة تفعيله.",
  botSinPublicar: "التطبيق غير منشور بعد. أبلغ superadmin.",
  botCadaComando: "كل أمر يفتح شاشة:",
  botOStart: "أو /start للقائمة الكاملة.",
  botComandoDesconocido: "لا أعرف هذا الأمر. جرّب /ayuda.",
  botUsaStart: "استخدم /start لفتح التطبيق.",

  botRetiroPagado: (importe: string) => `لقد استلمت ${importe}.`,
  botRedTitulo: "شبكتك تحتاج مكالمة",
  botRedParados: (n: number, total: number) =>
    `${n} من webmasters الـ ${total} لديك لم يجلبوا تسجيلًا منذ فترة:`,
  botRedDiasParado: (dias: number) => `${dias} أيام بلا نشاط`,
  botRedIncidencias: (n: number) =>
    `${n} ${n === 1 ? "webmaster" : "webmasters"} بمشكلة في Sophon؛ لا ${
      n === 1 ? "يستطيع" : "يستطيعون"
    } توليد تسجيلات:`,
  botRedYOtros: (n: number) => `…و${n} آخرون.`,
  botRedComoVerlo: "افتحهم في «شبكتك» لترى بأي روابط يستقطبون.",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `المرجع: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `وافقنا على سحبك بمبلغ ${importe}. سيصدر الدفع قريبًا.`,
  botRetiroRechazado: (importe: string) =>
    `رفضنا سحبك بمبلغ ${importe}. عاد الرصيد متاحًا لك.`,
  botMotivo: (motivo: string) => `السبب: ${motivo}`,
};

const catalogos: Record<Idioma, Cadenas> = { es, en, ar, it, pt };

export function cadenas(idioma: Idioma = IDIOMA_POR_DEFECTO): Cadenas {
  return catalogos[idioma];
}
