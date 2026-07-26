/**
 * Cadenas de la interfaz.
 *
 * Voz: tuteo, verbo delante, sin jerga de afiliación y sin felicitaciones. El
 * agente es un profesional que cobra, no alguien a quien hay que animar. Los
 * errores dicen siempre qué pasó, por qué y qué hacer ahora.
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
  vincularCuenta: "Vincular cuenta",
  reintentar: "Reintentar",
  activar: "Activar",
  entrar: "Entrar",
  activarOtro: "Activar otro",
  verMiRed: "Ver red",
  verSuFicha: "Ver ficha",
  volverAlInicio: "Volver al inicio",
  activarElPrimero: "Activar webmaster",

  // ── Estados vacíos: invitan a actuar, no se disculpan ──────────────────────
  sinWebmasters: "Sin webmasters activados.",
  sinWebmastersApoyo: "La activación se hace con el correo del webmaster en Sophon.",
  sinIngresos: "Sin registros en la red.",
  sinIngresosApoyo: "Los registros aparecen aquí en cuanto se producen desde sus enlaces.",
  sinMovimientos: "Sin retiros solicitados.",
  sinVinculo: "Cuenta sin vincular.",

  // ── Alta del agente ───────────────────────────────────────────────────────
  vinculaTuCuenta: "Vinculación de cuenta",
  soloSeHaceUnaVez: "La vinculación se hace una sola vez. Los accesos posteriores se realizan desde Telegram.",
  codigoDeActivacion: "Código de activación",
  teLoDaElSuperadmin: "Lo facilita el superadmin.",
  tuCorreo: "Correo",
  seraTuIdentificador: "Identificador de acceso. Se envía a esa dirección un código de verificación de 6 dígitos.",
  enviarmeElCodigo: "Enviar código",
  confirmaQueEresTu: "Verificación",
  pideCodigo: "Introduce el código de activación.",
  otpEnviado: (email: string) =>
    `Código de verificación enviado a ${email}. Caduca en 10 minutos.`,
  codigoDeSeisDigitos: "Código de 6 dígitos",
  cambiarElCorreo: "Cambiar correo",
  reenviarEn: (segundos: number) => `Reenviar en ${segundos} s`,
  reenviarElCodigo: "Reenviar código",

  // ── Inicio ────────────────────────────────────────────────────────────────
  devengadoTreintaDias: "Devengado · 30 días",
  registrosYWebmasters: (registros: number, webmasters: number) =>
    `${registros} registros · ${webmasters} webmasters`,
  repartoPorTier: "Registros por tier",
  acciones: "Acciones",
  estadoDeTuDinero: "Estado del saldo",
  // ── Bono por hitos ────────────────────────────────────────────────────────
  bonoDelMes: "Bono del mes",
  registrosEsteMes: (n: number) => `${n.toLocaleString("es-ES")} registros este mes`,
  faltanParaElBono: (faltan: number, premio: string) =>
    `Faltan ${faltan.toLocaleString("es-ES")} registros para ${premio}.`,
  bonoMaximoAlcanzado: "Alcanzado el hito más alto del mes.",
  bonoGanado: (importe: string) => `${importe} ganados`,

  // ── Activar webmaster ─────────────────────────────────────────────────────
  correoDelWebmaster: "Correo del webmaster",
  tieneQueExistirYa: "Debe ser una cuenta ya registrada en Sophon.",
  yaEstaEnTuRed: (email: string) => `${email} ya consta en la red.`,
  cobrarasDesdeHoy: "La comisión se aplica a los registros posteriores a la activación. Los anteriores no computan.",

  // ── Tu red ────────────────────────────────────────────────────────────────
  conIncidencia: (n: number) => `${n} con incidencia`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} sin actividad en los últimos ${dias} días, de ${total}`,
  todosProduciendo: (n: number) => `${n} con actividad`,
  escalaComun: (dias: number) =>
    `Cada columna, ${dias} días. La altura indica el volumen de registros; la escala es común, de modo que los webmasters se comparan entre sí.`,

  // ── Estado de un webmaster ────────────────────────────────────────────────
  bloqueado: "Bloqueado",
  seVaABorrar: "Pendiente de borrado",
  desaparecido: "No consta",
  proCaducado: "PRO caducado",
  sinActividad: "Sin actividad",
  diasParado: (dias: number) => `${dias} días sin actividad`,
  activoEnSophon: "Activo en Sophon",
  bloqueadoEnSophon: "Bloqueado en Sophon",
  pendienteDeBorrado: "Pendiente de borrado",
  yaNoApareceEnSophon: "No consta en Sophon",
  estadoSinComprobar: "Estado sin comprobar",

  // ── Ficha de webmaster ────────────────────────────────────────────────────
  enTuRedDesde: (fecha: string) => `en la red desde el ${fecha}`,
  teHaDado: "Aportado",
  registrosEnDias: (registros: number, dias: number) => `${registros} registros en ${dias} días`,
  compraronPro: (n: number) => `${n} compraron PRO`,
  cobrasDesde: (fecha: string) =>
    `La comisión se aplica a los registros desde el ${fecha}. Los anteriores no computan.`,
  ultimosDias: (dias: number) => `Últimos ${dias} días`,
  todaviaSinRegistros: "Sin registros.",
  registroDeSondeo: "Actividad",

  // ── Enlaces de reparto ────────────────────────────────────────────────────
  susEnlaces: "Enlaces",
  conQueCapta: "Enlaces de captación activos. Datos en directo de Sophon.",
  sinEnlaces: "Sin enlaces publicados.",
  enlacesNoDisponibles: "Enlaces no disponibles. Se pueden consultar más tarde.",
  enlaceCopiado: "Enlace copiado",
  registrosCortos: (n: number) => `${n} registros`,

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
  incluyeUnAnio: "La activación incluye un año de PRO.",
  continuar: "Continuar",
  vasAActivar: "Activación de webmaster",
  corregirElCorreo: "Corregir correo",
  altaNoSeDeshace: "La activación no se puede deshacer. El webmaster queda vinculado en Sophon.",
  proConcedido: (fecha: string) => `PRO activo hasta el ${fecha}.`,
  proNoConcedido: "El webmaster consta en la red, pero el PRO no se ha concedido.",
  proNoConcedidoApoyo: "El PRO se puede reintentar desde su ficha. La activación no se repite.",
  renovarUnAnio: "Renovar un año",
  darUnAnio: "Conceder un año de PRO",
  renovado: (email: string, fecha: string) => `${email} tiene PRO hasta el ${fecha}.`,
  colaRenovaciones: "Renovaciones",
  puedesRenovar: (n: number) => `${n} para renovar`,
  ningunoRenovable: "Sin renovaciones disponibles.",
  nuncaTuvoPro: "Sin PRO previo",
  puedesRenovarAhora: "Renovación disponible",
  proActivo: "PRO activo",
  podrasRenovarloCuandoSeApague: "La renovación se habilita al caducar el PRO.",

  // ── Histórico ─────────────────────────────────────────────────────────────
  enDias: (dias: number) => `en ${dias} días`,
  tocaUnDia: "Selecciona un día para ver el desglose.",
  columnaDia: "Día",
  columnaDolares: "Dólares",
  perforando: "Cargando el desglose",
  aquiEmpieza: "Inicio del histórico. No hay datos anteriores.",
  desglose: (registros: number, t1: number, t2: number, t3: number) =>
    `${registros} registros · T1 ${t1} · T2 ${t2} · T3 ${t3}`,
  dePago: (n: number) => `${n} de pago`,
  diaAbierto: "Día en curso: los datos pueden variar.",

  // ── Cartera ───────────────────────────────────────────────────────────────
  soloConsolidado: "Solo se puede solicitar el saldo consolidado. Los últimos días están sujetos a revisión.",
  revisionManual: "Las revisiones son manuales. Plazo de resolución: de 1 a 3 días.",
  solicitudEnCurso: "Solicitud en curso",
  pendienteDeRevision: "Pendiente de revisión",
  aprobadoPendientePago: "Aprobado, pendiente de pago",
  estadoPagado: "Pagado",
  estadoRechazado: "Rechazado",
  estadoCancelado: "Cancelado",
  pedidaEl: (fecha: string) => `Solicitada el ${fecha}.`,
  soloUnaALaVez: "Solo se admite una solicitud a la vez. La siguiente se habilita al resolverse la anterior.",
  cuanto: "Importe",
  todo: "Todo",
  disponibleYMinimo: "Disponible",
  minimo: "mínimo",
  tePasasEn: (importe: string) => `El importe supera el disponible en ${importe}.`,
  teFaltanParaElMinimo: (importe: string) => `El importe queda ${importe} por debajo del mínimo.`,
  enQueRed: "Red",
  walletUsdt: "Wallet USDT",
  usdtEn: (red: string, pista: string) =>
    `USDT en ${red}. ${pista} Los pagos a una red incorrecta no se recuperan.`,
  direccionMalFormada: (red: string, pista: string) =>
    `Dirección no válida para ${red}. ${pista}`,
  pistaTrc20: "Empieza por T y tiene 34 caracteres.",
  pistaBsc: "Empieza por 0x y tiene 42 caracteres.",
  pistaTon: "Empieza por EQ o UQ y tiene 48 caracteres.",
  pedirImporte: (importe: string) => `Solicitar ${importe}`,
  pedirRetiro: "Solicitar retiro",
  solicitudesAnteriores: "Anteriores",

  // ── Errores: qué pasó · por qué · qué hago ahora ──────────────────────────
  sesionCaducada: "Sesión caducada.",
  sesionCaducadaApoyo: "El acceso se restablece con el correo de la cuenta.",
  algoHaFallado: "No se ha podido completar la operación.",
  comoCobras: "Comisión de 0,03 $ por usuario registrado, con independencia del país.",

  // ── El bot ────────────────────────────────────────────────────────────────
  //
  // El bot habla el idioma del agente igual que la Mini App. Los dos son la
  // misma aplicación vista desde sitios distintos, y un menú en español delante
  // de una pantalla en árabe delata que la traducción se hizo por encima.
  //
  // Los comandos de gestión —/codigo, /agentes, /retiros, /panel— NO están
  // aquí: los usa una sola persona y traducirlos sería trabajo sin destino.
  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "El acceso requiere un código de activación. Lo facilita el superadmin.",
  botCuandoLoTengas: "Con el código, la cuenta se vincula desde aquí.",
  botHola: (nombre: string) => `Hola, ${nombre}. Selecciona una opción.`,
  botVincularCuenta: "Vincular cuenta",
  botSuspendido: "Cuenta suspendida. La reactivación se solicita al superadmin.",
  botSinPublicar: "La aplicación no está publicada todavía.",
  botCadaComando: "Cada comando abre una pantalla:",
  botOStart: "O /start para el menú completo.",
  botComandoDesconocido: "Comando no reconocido. Usa /ayuda.",
  botUsaStart: "Usa /start para abrir la aplicación.",

  // Avisos que salen del panel hacia el agente.
  botRetiroPagado: (importe: string) => `Retiro de ${importe} pagado.`,
  botRedTitulo: "Actividad de la red",
  botRedParados: (n: number, total: number) =>
    `${n} de ${total} webmasters sin registros recientes:`,
  botRedDiasParado: (dias: number) => `${dias} días sin actividad`,
  botRedIncidencias: (n: number) =>
    `${n} ${n === 1 ? "webmaster" : "webmasters"} con incidencia en Sophon:`,
  botRedYOtros: (n: number) => `…y ${n} más.`,
  botRedComoVerlo: "Los enlaces de captación se consultan en «Red».",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `Referencia: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `Retiro de ${importe} aprobado. Pago pendiente de emisión.`,
  botRetiroRechazado: (importe: string) =>
    `Retiro de ${importe} rechazado. El saldo vuelve a estar disponible.`,
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
  vincularCuenta: "Link account",
  reintentar: "Try again",
  activar: "Activate",
  entrar: "Sign in",
  activarOtro: "Activate another",
  verMiRed: "View network",
  verSuFicha: "View details",
  volverAlInicio: "Back to home",
  activarElPrimero: "Activate webmaster",

  sinWebmasters: "No webmasters activated.",
  sinWebmastersApoyo: "Activation is done with the webmaster's Sophon email.",
  sinIngresos: "No signups in the network.",
  sinIngresosApoyo: "Signups appear here as they come in through their links.",
  sinMovimientos: "No payouts requested.",
  sinVinculo: "Account not linked.",

  vinculaTuCuenta: "Account linking",
  soloSeHaceUnaVez: "Linking is done once. Subsequent access is through Telegram.",
  codigoDeActivacion: "Activation code",
  teLoDaElSuperadmin: "Provided by the superadmin.",
  tuCorreo: "Email",
  seraTuIdentificador: "Sign-in identifier. A 6-digit verification code is sent to that address.",
  enviarmeElCodigo: "Send code",
  confirmaQueEresTu: "Verification",
  pideCodigo: "Enter the activation code.",
  otpEnviado: (email: string) =>
    `Verification code sent to ${email}. Expires in 10 minutes.`,
  codigoDeSeisDigitos: "6-digit code",
  cambiarElCorreo: "Change email",
  reenviarEn: (segundos: number) => `Resend in ${segundos}s`,
  reenviarElCodigo: "Resend code",

  devengadoTreintaDias: "Earned · 30 days",
  registrosYWebmasters: (registros: number, webmasters: number) =>
    `${registros} signups · ${webmasters} webmasters`,
  repartoPorTier: "Signups by tier",
  acciones: "Actions",
  estadoDeTuDinero: "Balance status",
  bonoDelMes: "Monthly bonus",
  registrosEsteMes: (n: number) => `${n.toLocaleString("en-US")} signups this month`,
  faltanParaElBono: (faltan: number, premio: string) =>
    `${faltan.toLocaleString("en-US")} signups to reach ${premio}.`,
  bonoMaximoAlcanzado: "Top milestone reached for this month.",
  bonoGanado: (importe: string) => `${importe} earned`,

  correoDelWebmaster: "Webmaster's email",
  tieneQueExistirYa: "Must be an account already registered on Sophon.",
  yaEstaEnTuRed: (email: string) => `${email} is already in the network.`,
  cobrarasDesdeHoy: "Commission applies to signups after activation. Earlier ones do not count.",

  conIncidencia: (n: number) => `${n} with an issue`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} with no activity in the last ${dias} days, out of ${total}`,
  todosProduciendo: (n: number) => `${n} active`,
  escalaComun: (dias: number) =>
    `Each column is ${dias} days. Height shows signup volume; the scale is shared, so webmasters can be compared directly.`,

  bloqueado: "Blocked",
  seVaABorrar: "Pending deletion",
  desaparecido: "Not found",
  proCaducado: "PRO expired",
  sinActividad: "No activity",
  diasParado: (dias: number) => `${dias} days inactive`,
  activoEnSophon: "Active on Sophon",
  bloqueadoEnSophon: "Blocked on Sophon",
  pendienteDeBorrado: "Pending deletion",
  yaNoApareceEnSophon: "Not found on Sophon",
  estadoSinComprobar: "Status not checked",

  enTuRedDesde: (fecha: string) => `in the network since ${fecha}`,
  teHaDado: "Contributed",
  registrosEnDias: (registros: number, dias: number) => `${registros} signups in ${dias} days`,
  compraronPro: (n: number) => `${n} bought PRO`,
  cobrasDesde: (fecha: string) =>
    `Commission applies to signups from ${fecha}. Earlier ones do not count.`,
  ultimosDias: (dias: number) => `Last ${dias} days`,
  todaviaSinRegistros: "No signups.",
  registroDeSondeo: "Activity",

  susEnlaces: "Links",
  conQueCapta: "Active acquisition links. Live data from Sophon.",
  sinEnlaces: "No links published.",
  enlacesNoDisponibles: "Links unavailable. They can be checked later.",
  enlaceCopiado: "Link copied",
  registrosCortos: (n: number) => `${n} signups`,

  tiempoRestanteDePro: "PRO time left",
  venceEl: (fecha: string) => `ends ${fecha}`,
  caducado: "expired",
  diasDePro: (dias: number) => `${dias} ${dias === 1 ? "day" : "days"} of PRO`,
  semanasDePro: (semanas: number) => `${semanas} ${semanas === 1 ? "week" : "weeks"} of PRO`,
  proYaCaducado: "PRO expired",
  sinProActivo: "No active PRO.",
  sinPro: "No PRO",

  incluyeUnAnio: "Activation includes one year of PRO.",
  continuar: "Continue",
  vasAActivar: "Webmaster activation",
  corregirElCorreo: "Edit email",
  altaNoSeDeshace: "Activation cannot be undone. The webmaster remains linked on Sophon.",
  proConcedido: (fecha: string) => `PRO active until ${fecha}.`,
  proNoConcedido: "The webmaster is in the network, but PRO was not granted.",
  proNoConcedidoApoyo: "PRO can be retried from the webmaster's details. Activation is not repeated.",
  renovarUnAnio: "Renew for a year",
  darUnAnio: "Grant one year of PRO",
  renovado: (email: string, fecha: string) => `${email} has PRO until ${fecha}.`,
  colaRenovaciones: "Renewals",
  puedesRenovar: (n: number) => `${n} ready to renew`,
  ningunoRenovable: "No renewals available.",
  nuncaTuvoPro: "No prior PRO",
  puedesRenovarAhora: "Renewal available",
  proActivo: "PRO active",
  podrasRenovarloCuandoSeApague: "Renewal is enabled when PRO expires.",

  enDias: (dias: number) => `over ${dias} days`,
  tocaUnDia: "Select a day to see the breakdown.",
  columnaDia: "Day",
  columnaDolares: "Dollars",
  perforando: "Loading breakdown",
  aquiEmpieza: "Start of history. No earlier data.",
  desglose: (registros: number, t1: number, t2: number, t3: number) =>
    `${registros} signups · T1 ${t1} · T2 ${t2} · T3 ${t3}`,
  dePago: (n: number) => `${n} paying`,
  diaAbierto: "Day in progress: data may change.",

  soloConsolidado: "Only the consolidated balance can be requested. Recent days are subject to review.",
  revisionManual: "Reviews are manual. Resolution time: 1 to 3 days.",
  solicitudEnCurso: "Request in progress",
  pendienteDeRevision: "Awaiting review",
  aprobadoPendientePago: "Approved, awaiting payment",
  estadoPagado: "Paid",
  estadoRechazado: "Rejected",
  estadoCancelado: "Cancelled",
  pedidaEl: (fecha: string) => `Requested on ${fecha}.`,
  soloUnaALaVez: "Only one request at a time. The next is enabled once the previous is resolved.",
  cuanto: "Amount",
  todo: "All",
  disponibleYMinimo: "Available",
  minimo: "minimum",
  tePasasEn: (importe: string) => `Amount exceeds the available balance by ${importe}.`,
  teFaltanParaElMinimo: (importe: string) => `Amount is ${importe} below the minimum.`,
  enQueRed: "Network",
  walletUsdt: "USDT wallet",
  usdtEn: (red: string, pista: string) =>
    `USDT on ${red}. ${pista} Payments to the wrong network cannot be recovered.`,
  direccionMalFormada: (red: string, pista: string) =>
    `Invalid address for ${red}. ${pista}`,
  pistaTrc20: "Starts with T and is 34 characters long.",
  pistaBsc: "Starts with 0x and is 42 characters long.",
  pistaTon: "Starts with EQ or UQ and is 48 characters long.",
  pedirImporte: (importe: string) => `Request ${importe}`,
  pedirRetiro: "Request payout",
  solicitudesAnteriores: "Earlier",

  sesionCaducada: "Session expired.",
  sesionCaducadaApoyo: "Access is restored with the account email.",
  algoHaFallado: "The operation could not be completed.",
  comoCobras: "$0.03 commission per registered user, regardless of country.",

  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "Access requires an activation code. Provided by the superadmin.",
  botCuandoLoTengas: "With the code, the account is linked from here.",
  botHola: (nombre: string) => `Hello, ${nombre}. Select an option.`,
  botVincularCuenta: "Link account",
  botSuspendido: "Account suspended. Reactivation is requested from the superadmin.",
  botSinPublicar: "The app is not published yet.",
  botCadaComando: "Each command opens a screen:",
  botOStart: "Or /start for the full menu.",
  botComandoDesconocido: "Command not recognized. Use /ayuda.",
  botUsaStart: "Use /start to open the app.",

  botRetiroPagado: (importe: string) => `Payout of ${importe} paid.`,
  botRedTitulo: "Network activity",
  botRedParados: (n: number, total: number) =>
    `${n} of ${total} webmasters with no recent signups:`,
  botRedDiasParado: (dias: number) => `${dias} days inactive`,
  botRedIncidencias: (n: number) =>
    `${n} ${n === 1 ? "webmaster" : "webmasters"} with an issue on Sophon:`,
  botRedYOtros: (n: number) => `…and ${n} more.`,
  botRedComoVerlo: "Acquisition links are available under “Network”.",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `Reference: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `Payout of ${importe} approved. Payment pending.`,
  botRetiroRechazado: (importe: string) =>
    `Payout of ${importe} rejected. The balance is available again.`,
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
  vincularCuenta: "Collega account",
  reintentar: "Riprova",
  activar: "Attiva",
  entrar: "Entra",
  activarOtro: "Attivane un altro",
  verMiRed: "Visualizza rete",
  verSuFicha: "Visualizza scheda",
  volverAlInicio: "Torna all'inizio",
  activarElPrimero: "Attiva webmaster",

  sinWebmasters: "Nessun webmaster attivato.",
  sinWebmastersApoyo: "L'attivazione si effettua con l'email del webmaster su Sophon.",
  sinIngresos: "Nessuna iscrizione nella rete.",
  sinIngresosApoyo: "Le iscrizioni compaiono qui non appena arrivano dai link dei webmaster.",
  sinMovimientos: "Nessun prelievo richiesto.",
  sinVinculo: "Account non collegato.",

  vinculaTuCuenta: "Collegamento account",
  soloSeHaceUnaVez: "Il collegamento si effettua una sola volta. Gli accessi successivi avvengono da Telegram.",
  codigoDeActivacion: "Codice di attivazione",
  teLoDaElSuperadmin: "Fornito dal superadmin.",
  tuCorreo: "Email",
  seraTuIdentificador: "Identificativo di accesso. A tale indirizzo viene inviato un codice di verifica di 6 cifre.",
  enviarmeElCodigo: "Invia codice",
  confirmaQueEresTu: "Verifica",
  pideCodigo: "Inserire il codice di attivazione.",
  otpEnviado: (email: string) =>
    `Codice di verifica inviato a ${email}. Scade tra 10 minuti.`,
  codigoDeSeisDigitos: "Codice di 6 cifre",
  cambiarElCorreo: "Cambia email",
  reenviarEn: (segundos: number) => `Rinvia tra ${segundos} s`,
  reenviarElCodigo: "Rinvia codice",

  devengadoTreintaDias: "Maturato · 30 giorni",
  registrosYWebmasters: (registros: number, webmasters: number) =>
    `${registros} iscrizioni · ${webmasters} webmaster`,
  repartoPorTier: "Iscrizioni per tier",
  acciones: "Azioni",
  estadoDeTuDinero: "Stato del saldo",
  bonoDelMes: "Bonus del mese",
  registrosEsteMes: (n: number) => `${n.toLocaleString("it-IT")} iscrizioni questo mese`,
  faltanParaElBono: (faltan: number, premio: string) =>
    `Mancano ${faltan.toLocaleString("it-IT")} iscrizioni per ${premio}.`,
  bonoMaximoAlcanzado: "Raggiunta la soglia più alta del mese.",
  bonoGanado: (importe: string) => `${importe} guadagnati`,

  correoDelWebmaster: "Email del webmaster",
  tieneQueExistirYa: "Deve essere un account già registrato su Sophon.",
  yaEstaEnTuRed: (email: string) => `${email} risulta già nella rete.`,
  cobrarasDesdeHoy: "La commissione si applica alle iscrizioni successive all'attivazione. Le precedenti non sono conteggiate.",

  conIncidencia: (n: number) => `${n} con un problema`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} senza attività negli ultimi ${dias} giorni, su ${total}`,
  todosProduciendo: (n: number) => `${n} con attività`,
  escalaComun: (dias: number) =>
    `Ogni colonna, ${dias} giorni. L'altezza indica il volume di iscrizioni; la scala è comune, quindi i webmaster sono confrontabili tra loro.`,

  bloqueado: "Bloccato",
  seVaABorrar: "In attesa di cancellazione",
  desaparecido: "Non risulta",
  proCaducado: "PRO scaduto",
  sinActividad: "Nessuna attività",
  diasParado: (dias: number) => `${dias} giorni senza attività`,
  activoEnSophon: "Attivo su Sophon",
  bloqueadoEnSophon: "Bloccato su Sophon",
  pendienteDeBorrado: "In attesa di cancellazione",
  yaNoApareceEnSophon: "Non risulta su Sophon",
  estadoSinComprobar: "Stato non verificato",

  enTuRedDesde: (fecha: string) => `nella rete dal ${fecha}`,
  teHaDado: "Contributo",
  registrosEnDias: (registros: number, dias: number) =>
    `${registros} iscrizioni in ${dias} giorni`,
  compraronPro: (n: number) => `${n} hanno comprato PRO`,
  cobrasDesde: (fecha: string) =>
    `La commissione si applica alle iscrizioni dal ${fecha}. Le precedenti non sono conteggiate.`,
  ultimosDias: (dias: number) => `Ultimi ${dias} giorni`,
  todaviaSinRegistros: "Nessuna iscrizione.",
  registroDeSondeo: "Attività",

  susEnlaces: "Link",
  conQueCapta: "Link di acquisizione attivi. Dati in tempo reale da Sophon.",
  sinEnlaces: "Nessun link pubblicato.",
  enlacesNoDisponibles: "Link non disponibili. Si possono consultare più tardi.",
  enlaceCopiado: "Link copiato",
  registrosCortos: (n: number) => `${n} iscrizioni`,

  tiempoRestanteDePro: "Tempo di PRO rimasto",
  venceEl: (fecha: string) => `scade il ${fecha}`,
  caducado: "scaduto",
  diasDePro: (dias: number) => `${dias} ${dias === 1 ? "giorno" : "giorni"} di PRO`,
  semanasDePro: (semanas: number) =>
    `${semanas} ${semanas === 1 ? "settimana" : "settimane"} di PRO`,
  proYaCaducado: "PRO scaduto",
  sinProActivo: "Nessun PRO attivo.",
  sinPro: "Senza PRO",

  incluyeUnAnio: "L'attivazione include un anno di PRO.",
  continuar: "Continua",
  vasAActivar: "Attivazione webmaster",
  corregirElCorreo: "Correggi email",
  altaNoSeDeshace: "L'attivazione non è reversibile. Il webmaster resta collegato su Sophon.",
  proConcedido: (fecha: string) => `PRO attivo fino al ${fecha}.`,
  proNoConcedido: "Il webmaster risulta nella rete, ma il PRO non è stato concesso.",
  proNoConcedidoApoyo: "Il PRO si può riprovare dalla sua scheda. L'attivazione non si ripete.",
  renovarUnAnio: "Rinnova un anno",
  darUnAnio: "Concedi un anno di PRO",
  renovado: (email: string, fecha: string) => `${email} ha il PRO fino al ${fecha}.`,
  colaRenovaciones: "Rinnovi",
  puedesRenovar: (n: number) => `${n} da rinnovare`,
  ningunoRenovable: "Nessun rinnovo disponibile.",
  nuncaTuvoPro: "Nessun PRO precedente",
  puedesRenovarAhora: "Rinnovo disponibile",
  proActivo: "PRO attivo",
  podrasRenovarloCuandoSeApague: "Il rinnovo si abilita alla scadenza del PRO.",

  enDias: (dias: number) => `in ${dias} giorni`,
  tocaUnDia: "Selezionare un giorno per visualizzare il dettaglio.",
  columnaDia: "Giorno",
  columnaDolares: "Dollari",
  perforando: "Caricamento del dettaglio",
  aquiEmpieza: "Inizio dello storico. Nessun dato precedente.",
  desglose: (registros: number, t1: number, t2: number, t3: number) =>
    `${registros} iscrizioni · T1 ${t1} · T2 ${t2} · T3 ${t3}`,
  dePago: (n: number) => `${n} paganti`,
  diaAbierto: "Giorno in corso: i dati possono variare.",

  soloConsolidado: "Si può richiedere solo il saldo consolidato. Gli ultimi giorni sono soggetti a revisione.",
  revisionManual: "Le revisioni sono manuali. Tempo di risoluzione: da 1 a 3 giorni.",
  solicitudEnCurso: "Richiesta in corso",
  pendienteDeRevision: "In attesa di revisione",
  aprobadoPendientePago: "Approvata, in attesa di pagamento",
  estadoPagado: "Pagata",
  estadoRechazado: "Respinta",
  estadoCancelado: "Annullata",
  pedidaEl: (fecha: string) => `Richiesta il ${fecha}.`,
  soloUnaALaVez: "Si ammette una sola richiesta alla volta. La successiva si abilita alla risoluzione della precedente.",
  cuanto: "Importo",
  todo: "Tutto",
  disponibleYMinimo: "Disponibile",
  minimo: "minimo",
  tePasasEn: (importe: string) => `L'importo supera il disponibile di ${importe}.`,
  teFaltanParaElMinimo: (importe: string) => `L'importo è inferiore al minimo di ${importe}.`,
  enQueRed: "Rete",
  walletUsdt: "Wallet USDT",
  usdtEn: (red: string, pista: string) =>
    `USDT su ${red}. ${pista} I pagamenti su una rete errata non sono recuperabili.`,
  direccionMalFormada: (red: string, pista: string) =>
    `Indirizzo non valido per ${red}. ${pista}`,
  pistaTrc20: "Inizia con T ed è lungo 34 caratteri.",
  pistaBsc: "Inizia con 0x ed è lungo 42 caratteri.",
  pistaTon: "Inizia con EQ o UQ ed è lungo 48 caratteri.",
  pedirImporte: (importe: string) => `Richiedi ${importe}`,
  pedirRetiro: "Richiedi prelievo",
  solicitudesAnteriores: "Precedenti",

  sesionCaducada: "Sessione scaduta.",
  sesionCaducadaApoyo: "L'accesso si ripristina con l'email dell'account.",
  algoHaFallado: "Non è stato possibile completare l'operazione.",
  comoCobras: "Commissione di 0,03 $ per utente registrato, indipendentemente dal paese.",

  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "L'accesso richiede un codice di attivazione. Fornito dal superadmin.",
  botCuandoLoTengas: "Con il codice, l'account si collega da qui.",
  botHola: (nombre: string) => `Salve, ${nombre}. Selezionare un'opzione.`,
  botVincularCuenta: "Collega account",
  botSuspendido: "Account sospeso. La riattivazione si richiede al superadmin.",
  botSinPublicar: "L'applicazione non è ancora pubblicata.",
  botCadaComando: "Ogni comando apre una schermata:",
  botOStart: "Oppure /start per il menu completo.",
  botComandoDesconocido: "Comando non riconosciuto. Usare /ayuda.",
  botUsaStart: "Usa /start per aprire l'applicazione.",

  botRetiroPagado: (importe: string) => `Prelievo di ${importe} pagato.`,
  botRedTitulo: "Attività della rete",
  botRedParados: (n: number, total: number) =>
    `${n} di ${total} webmaster senza iscrizioni recenti:`,
  botRedDiasParado: (dias: number) => `${dias} giorni senza attività`,
  botRedIncidencias: (n: number) =>
    `${n} ${n === 1 ? "webmaster" : "webmasters"} con un problema su Sophon:`,
  botRedYOtros: (n: number) => `…e altri ${n}.`,
  botRedComoVerlo: "I link di acquisizione si consultano in «Rete».",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `Riferimento: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `Prelievo di ${importe} approvato. Pagamento in attesa di emissione.`,
  botRetiroRechazado: (importe: string) =>
    `Prelievo di ${importe} rifiutato. Il saldo torna disponibile.`,
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
  vincularCuenta: "Associar conta",
  reintentar: "Tentar de novo",
  activar: "Ativar",
  entrar: "Entrar",
  activarOtro: "Ativar outro",
  verMiRed: "Ver rede",
  verSuFicha: "Ver ficha",
  volverAlInicio: "Voltar ao início",
  activarElPrimero: "Ativar webmaster",

  sinWebmasters: "Sem webmasters ativados.",
  sinWebmastersApoyo: "A ativação faz-se com o email do webmaster na Sophon.",
  sinIngresos: "Sem registos na rede.",
  sinIngresosApoyo: "Os registos aparecem aqui assim que ocorrem através dos links dos webmasters.",
  sinMovimientos: "Sem levantamentos solicitados.",
  sinVinculo: "Conta não associada.",

  vinculaTuCuenta: "Associação da conta",
  soloSeHaceUnaVez: "A associação faz-se uma única vez. Os acessos seguintes efetuam-se a partir do Telegram.",
  codigoDeActivacion: "Código de ativação",
  teLoDaElSuperadmin: "Fornecido pelo superadmin.",
  tuCorreo: "Email",
  seraTuIdentificador: "Identificador de acesso. Envia-se para esse endereço um código de verificação de 6 dígitos.",
  enviarmeElCodigo: "Enviar código",
  confirmaQueEresTu: "Verificação",
  pideCodigo: "Introduza o código de ativação.",
  otpEnviado: (email: string) =>
    `Código de verificação enviado para ${email}. Expira em 10 minutos.`,
  codigoDeSeisDigitos: "Código de 6 dígitos",
  cambiarElCorreo: "Alterar email",
  reenviarEn: (segundos: number) => `Reenviar em ${segundos} s`,
  reenviarElCodigo: "Reenviar código",

  devengadoTreintaDias: "Acumulado · 30 dias",
  registrosYWebmasters: (registros: number, webmasters: number) =>
    `${registros} registos · ${webmasters} webmasters`,
  repartoPorTier: "Registos por tier",
  acciones: "Ações",
  estadoDeTuDinero: "Estado do saldo",
  bonoDelMes: "Bónus do mês",
  registrosEsteMes: (n: number) => `${n.toLocaleString("pt-PT")} registos este mês`,
  faltanParaElBono: (faltan: number, premio: string) =>
    `Faltam ${faltan.toLocaleString("pt-PT")} registos para ${premio}.`,
  bonoMaximoAlcanzado: "Atingido o patamar mais alto do mês.",
  bonoGanado: (importe: string) => `${importe} ganhos`,

  correoDelWebmaster: "Email do webmaster",
  tieneQueExistirYa: "Tem de ser uma conta já registada na Sophon.",
  yaEstaEnTuRed: (email: string) => `${email} já consta na rede.`,
  cobrarasDesdeHoy: "A comissão aplica-se aos registos posteriores à ativação. Os anteriores não contam.",

  conIncidencia: (n: number) => `${n} com problema`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} sem atividade nos últimos ${dias} dias, de ${total}`,
  todosProduciendo: (n: number) => `${n} com atividade`,
  escalaComun: (dias: number) =>
    `Cada coluna, ${dias} dias. A altura indica o volume de registos; a escala é comum, pelo que os webmasters se comparam entre si.`,

  bloqueado: "Bloqueado",
  seVaABorrar: "Pendente de eliminação",
  desaparecido: "Não consta",
  proCaducado: "PRO expirado",
  sinActividad: "Sem atividade",
  diasParado: (dias: number) => `${dias} dias sem atividade`,
  activoEnSophon: "Ativo na Sophon",
  bloqueadoEnSophon: "Bloqueado na Sophon",
  pendienteDeBorrado: "A aguardar eliminação",
  yaNoApareceEnSophon: "Não consta na Sophon",
  estadoSinComprobar: "Estado por verificar",

  enTuRedDesde: (fecha: string) => `na rede desde ${fecha}`,
  teHaDado: "Gerado",
  registrosEnDias: (registros: number, dias: number) => `${registros} registos em ${dias} dias`,
  compraronPro: (n: number) => `${n} compraram PRO`,
  cobrasDesde: (fecha: string) =>
    `A comissão aplica-se aos registos a partir de ${fecha}. Os anteriores não contam.`,
  ultimosDias: (dias: number) => `Últimos ${dias} dias`,
  todaviaSinRegistros: "Sem registos.",
  registroDeSondeo: "Atividade",

  susEnlaces: "Links",
  conQueCapta: "Links de captação ativos. Dados em direto da Sophon.",
  sinEnlaces: "Sem links publicados.",
  enlacesNoDisponibles: "Links indisponíveis. Podem consultar-se mais tarde.",
  enlaceCopiado: "Link copiado",
  registrosCortos: (n: number) => `${n} registos`,

  tiempoRestanteDePro: "Tempo de PRO que falta",
  venceEl: (fecha: string) => `acaba a ${fecha}`,
  caducado: "expirado",
  diasDePro: (dias: number) => `${dias} ${dias === 1 ? "dia" : "dias"} de PRO`,
  semanasDePro: (semanas: number) => `${semanas} ${semanas === 1 ? "semana" : "semanas"} de PRO`,
  proYaCaducado: "PRO expirado",
  sinProActivo: "Sem PRO ativo.",
  sinPro: "Sem PRO",

  incluyeUnAnio: "A ativação inclui um ano de PRO.",
  continuar: "Continuar",
  vasAActivar: "Ativação de webmaster",
  corregirElCorreo: "Corrigir email",
  altaNoSeDeshace: "A ativação é irreversível. O webmaster fica associado na Sophon.",
  proConcedido: (fecha: string) => `PRO ativo até ${fecha}.`,
  proNoConcedido: "O webmaster consta na rede, mas o PRO não foi concedido.",
  proNoConcedidoApoyo: "O PRO pode voltar a ser concedido a partir da ficha. A ativação não se repete.",
  renovarUnAnio: "Renovar um ano",
  darUnAnio: "Conceder um ano de PRO",
  renovado: (email: string, fecha: string) => `${email} tem PRO até ${fecha}.`,
  colaRenovaciones: "Renovações",
  puedesRenovar: (n: number) => `${n} para renovar`,
  ningunoRenovable: "Sem renovações disponíveis.",
  nuncaTuvoPro: "Sem PRO anterior",
  puedesRenovarAhora: "Renovação disponível",
  proActivo: "PRO ativo",
  podrasRenovarloCuandoSeApague: "A renovação fica disponível quando o PRO expirar.",

  enDias: (dias: number) => `em ${dias} dias`,
  tocaUnDia: "Selecione um dia para ver o detalhe.",
  columnaDia: "Dia",
  columnaDolares: "Dólares",
  perforando: "A carregar o detalhe",
  aquiEmpieza: "Início do histórico. Não há dados anteriores.",
  desglose: (registros: number, t1: number, t2: number, t3: number) =>
    `${registros} registos · T1 ${t1} · T2 ${t2} · T3 ${t3}`,
  dePago: (n: number) => `${n} pagantes`,
  diaAbierto: "Dia em curso: os dados podem variar.",

  soloConsolidado: "Só se pode solicitar o saldo consolidado. Os últimos dias estão sujeitos a revisão.",
  revisionManual: "As revisões são manuais. Prazo de resolução: 1 a 3 dias.",
  solicitudEnCurso: "Pedido em curso",
  pendienteDeRevision: "A aguardar revisão",
  aprobadoPendientePago: "Aprovado, a aguardar pagamento",
  estadoPagado: "Pago",
  estadoRechazado: "Recusado",
  estadoCancelado: "Cancelado",
  pedidaEl: (fecha: string) => `Solicitado a ${fecha}.`,
  soloUnaALaVez: "Só se admite um pedido de cada vez. O seguinte fica disponível quando o anterior for resolvido.",
  cuanto: "Montante",
  todo: "Tudo",
  disponibleYMinimo: "Disponível",
  minimo: "mínimo",
  tePasasEn: (importe: string) => `O montante excede o disponível em ${importe}.`,
  teFaltanParaElMinimo: (importe: string) => `O montante fica ${importe} abaixo do mínimo.`,
  enQueRed: "Rede",
  walletUsdt: "Carteira USDT",
  usdtEn: (red: string, pista: string) =>
    `USDT na ${red}. ${pista} Os pagamentos numa rede incorreta não se recuperam.`,
  direccionMalFormada: (red: string, pista: string) =>
    `Endereço inválido para ${red}. ${pista}`,
  pistaTrc20: "Começa por T e tem 34 caracteres.",
  pistaBsc: "Começa por 0x e tem 42 caracteres.",
  pistaTon: "Começa por EQ ou UQ e tem 48 caracteres.",
  pedirImporte: (importe: string) => `Solicitar ${importe}`,
  pedirRetiro: "Solicitar levantamento",
  solicitudesAnteriores: "Anteriores",

  sesionCaducada: "Sessão expirada.",
  sesionCaducadaApoyo: "O acesso restabelece-se com o email da conta.",
  algoHaFallado: "Não foi possível concluir a operação.",
  comoCobras: "Comissão de 0,03 $ por utilizador registado, independentemente do país.",

  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "O acesso requer um código de ativação. Fornecido pelo superadmin.",
  botCuandoLoTengas: "Com o código, a conta associa-se aqui.",
  botHola: (nombre: string) => `Olá, ${nombre}. Selecione uma opção.`,
  botVincularCuenta: "Associar conta",
  botSuspendido: "Conta suspensa. A reativação solicita-se ao superadmin.",
  botSinPublicar: "A aplicação ainda não está publicada.",
  botCadaComando: "Cada comando abre um ecrã:",
  botOStart: "Ou /start para o menu completo.",
  botComandoDesconocido: "Comando não reconhecido. Utilize /ayuda.",
  botUsaStart: "Usa /start para abrir a aplicação.",

  botRetiroPagado: (importe: string) => `Levantamento de ${importe} pago.`,
  botRedTitulo: "Atividade da rede",
  botRedParados: (n: number, total: number) =>
    `${n} de ${total} webmasters sem registos recentes:`,
  botRedDiasParado: (dias: number) => `${dias} dias sem atividade`,
  botRedIncidencias: (n: number) =>
    `${n} ${n === 1 ? "webmaster" : "webmasters"} com problema na Sophon:`,
  botRedYOtros: (n: number) => `…e mais ${n}.`,
  botRedComoVerlo: "Os links de captação consultam-se em «Rede».",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `Referência: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `Levantamento de ${importe} aprovado. Pagamento pendente de emissão.`,
  botRetiroRechazado: (importe: string) =>
    `Levantamento de ${importe} recusado. O saldo volta a estar disponível.`,
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
  red: "شبكتك",
  historico: "السجل",
  cartera: "المحفظة",
  webmaster: "مشرف الموقع",
  devengado: "المستحق",
  disponible: "المتاح",
  solicitado: "المطلوب",
  pagado: "المدفوع",
  volver: "رجوع",
  cargando: "جارٍ التحميل",
  sondeando: "جارٍ السبر",

  activarWebmaster: "تفعيل مشرف موقع",
  solicitarRetiro: "طلب سحب",
  vincularCuenta: "ربط حسابي",
  reintentar: "أعد المحاولة",
  activar: "تفعيل",
  entrar: "دخول",
  activarOtro: "تفعيل آخر",
  verMiRed: "عرض شبكتي",
  verSuFicha: "فتح صفحته",
  volverAlInicio: "العودة إلى الرئيسية",
  activarElPrimero: "فعّل الأول",

  sinWebmasters: "لم تفعّل أي مشرف موقع بعد.",
  sinWebmastersApoyo: "فعّل الأول ببريده في Sophon وستبدأ العيّنة بالتكوّن.",
  sinIngresos: "لم يجلب مشرفوك أي تسجيلات بعد.",
  sinIngresosApoyo:
    "بمجرد أن يسجّل أحد عبر رابطهم ستظهر الطبقة الأولى هنا. عادةً يستغرق ذلك بضع ساعات.",
  sinMovimientos: "لم تطلب أي سحب بعد.",
  sinVinculo: "لم تربط حسابك بعد.",

  vinculaTuCuenta: "اربط حسابك",
  soloSeHaceUnaVez: "تفعل هذا مرة واحدة فقط. بعدها تدخل دائمًا من هذا التليجرام.",
  codigoDeActivacion: "رمز التفعيل",
  teLoDaElSuperadmin: "يعطيك إياه المشرف العام.",
  tuCorreo: "بريدك الإلكتروني",
  seraTuIdentificador: "سيكون معرّفك للدخول. سنرسل إليه رمزًا من 6 أرقام.",
  enviarmeElCodigo: "أرسل لي الرمز",
  confirmaQueEresTu: "أكّد أنك أنت",
  pideCodigo: "اكتب رمز التفعيل الذي أعطاك إياه المشرف العام.",
  otpEnviado: (email: string) => `أرسلنا رمزًا من 6 أرقام إلى ${email}. ينتهي خلال 10 دقائق.`,
  codigoDeSeisDigitos: "رمز من 6 أرقام",
  cambiarElCorreo: "تغيير البريد",
  reenviarEn: (segundos: number) => `إعادة الإرسال بعد ${segundos} ث`,
  reenviarElCodigo: "إعادة إرسال الرمز",

  devengadoTreintaDias: "المستحق · 30 يومًا",
  registrosYWebmasters: (registros: number, webmasters: number) =>
    `${registros} تسجيل · ${webmasters} مشرف موقع`,
  repartoPorTier: "التسجيلات حسب الفئة",
  acciones: "الإجراءات",
  estadoDeTuDinero: "أين أموالك",
  bonoDelMes: "مكافأة الشهر",
  registrosEsteMes: (n: number) => `${n.toLocaleString("ar-EG")} تسجيل هذا الشهر`,
  faltanParaElBono: (faltan: number, premio: string) =>
    `يتبقّى ${faltan.toLocaleString("ar-EG")} تسجيل للوصول إلى ${premio}.`,
  bonoMaximoAlcanzado: "تم بلوغ أعلى مستوى لهذا الشهر.",
  bonoGanado: (importe: string) => `${importe} مُحقّقة`,

  correoDelWebmaster: "بريد مشرف الموقع",
  tieneQueExistirYa: "البريد الذي سجّل به في Sophon. يجب أن يكون موجودًا مسبقًا.",
  yaEstaEnTuRed: (email: string) => `${email} أصبح الآن في شبكتك.`,
  cobrarasDesdeHoy: "تربح عن المستخدمين الذين يسجّلهم من اليوم فصاعدًا. من جلبهم قبل ذلك لا يُحتسب.",

  conIncidencia: (n: number) => `${n} بها مشكلة`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} بلا نشاط خلال آخر ${dias} يومًا، من أصل ${total}`,
  todosProduciendo: (n: number) => `الـ ${n} جميعهم ينتجون`,
  escalaComun: (dias: number) =>
    `كل عمود يمثّل ${dias} يومًا. الارتفاع هو حجم التسجيلات والمقياس مشترك، فتُقارن المربعات ببعضها.`,

  bloqueado: "محظور",
  seVaABorrar: "سيُحذف",
  desaparecido: "مفقود",
  proCaducado: "انتهى PRO",
  sinActividad: "بلا نشاط",
  diasParado: (dias: number) => `متوقف منذ ${dias} يومًا`,
  activoEnSophon: "نشط في Sophon",
  bloqueadoEnSophon: "محظور في Sophon",
  pendienteDeBorrado: "بانتظار الحذف",
  yaNoApareceEnSophon: "لم يعد يظهر في Sophon",
  estadoSinComprobar: "الحالة غير مُتحقق منها",

  enTuRedDesde: (fecha: string) => `في شبكتك منذ ${fecha}`,
  teHaDado: "أعطاك",
  registrosEnDias: (registros: number, dias: number) => `${registros} تسجيل خلال ${dias} يومًا`,
  compraronPro: (n: number) => `${n} اشتروا PRO`,
  cobrasDesde: (fecha: string) => `تربح عمّا يسجّله ابتداءً من ${fecha}. وما قبله لا يُحتسب.`,
  ultimosDias: (dias: number) => `آخر ${dias} يومًا`,
  todaviaSinRegistros: "لم يجلب أي تسجيل بعد.",
  registroDeSondeo: "سجل السبر",

  susEnlaces: "روابطه",
  conQueCapta: "ما الذي يجلب به المستخدمين. مباشرةً من Sophon.",
  sinEnlaces: "لم يشارك أي رابط بعد.",
  enlacesNoDisponibles: "لا يمكن الاطّلاع على روابطه الآن.",
  enlaceCopiado: "نُسخ الرابط",
  registrosCortos: (n: number) => `${n} تسجيل`,

  tiempoRestanteDePro: "ما تبقّى من PRO",
  venceEl: (fecha: string) => `ينتهي في ${fecha}`,
  caducado: "منتهٍ",
  diasDePro: (dias: number) => `${dias} يومًا من PRO`,
  semanasDePro: (semanas: number) => `${semanas} أسبوعًا من PRO`,
  proYaCaducado: "انتهت صلاحية PRO",
  sinProActivo: "لا يوجد PRO نشط.",
  sinPro: "بلا PRO",

  incluyeUnAnio: "بتفعيله تمنحه سنة من PRO. لا شيء آخر عليك فعله.",
  continuar: "متابعة",
  vasAActivar: "ستفعّل",
  corregirElCorreo: "تصحيح البريد",
  altaNoSeDeshace: "التفعيل لا يُلغى: يبقى مرتبطًا بك في Sophon.",
  proConcedido: (fecha: string) => `منحته سنة من PRO، حتى ${fecha}.`,
  proNoConcedido: "المشرف صار في شبكتك، لكن الـ PRO لم يُمنح.",
  proNoConcedidoApoyo: "أعد المحاولة من صفحته؛ لا داعي لتكرار التفعيل.",
  renovarUnAnio: "تجديد · سنة",
  darUnAnio: "امنح سنة من PRO",
  renovado: (email: string, fecha: string) => `${email} لديه PRO حتى ${fecha}.`,
  colaRenovaciones: "التجديدات",
  puedesRenovar: (n: number) => `${n} للتجديد`,
  ningunoRenovable: "لا يمكن تجديد أي منها بعد.",
  nuncaTuvoPro: "لم يحصل على PRO قط",
  puedesRenovarAhora: "يمكن تجديدها الآن",
  proActivo: "PRO نشط",
  podrasRenovarloCuandoSeApague: "ستتمكن من تجديده عندما ينطفئ.",

  enDias: (dias: number) => `خلال ${dias} يومًا`,
  tocaUnDia: "المس يومًا لترى من أين جاء.",
  columnaDia: "اليوم",
  columnaDolares: "دولار",
  perforando: "جارٍ الحفر",
  aquiEmpieza: "من هنا يبدأ سجلك. لا يوجد شيء قبله.",
  desglose: (registros: number, t1: number, t2: number, t3: number) =>
    `${registros} تسجيل · T1 ${t1} · T2 ${t2} · T3 ${t3}`,
  dePago: (n: number) => `${n} مدفوع`,
  diaAbierto: "يوم مفتوح: ما زال قابلاً للتغيّر.",

  soloConsolidado: "لا يُطلب إلا المستقر: الأيام الأخيرة ما زالت قابلة للمراجعة.",
  revisionManual: "يراجع المشرف العام كل طلب يدويًا. يستغرق عادةً من يوم إلى ثلاثة أيام.",
  solicitudEnCurso: "طلب قيد المعالجة",
  pendienteDeRevision: "بانتظار المراجعة",
  aprobadoPendientePago: "موافق عليه، بانتظار الدفع",
  estadoPagado: "مدفوع",
  estadoRechazado: "مرفوض",
  estadoCancelado: "ملغى",
  pedidaEl: (fecha: string) => `طُلب في ${fecha}.`,
  soloUnaALaVez: "طلب واحد في كل مرة؛ بمجرد حسمه يمكنك طلب التالي.",
  cuanto: "كم",
  todo: "الكل",
  disponibleYMinimo: "المتاح",
  minimo: "الحد الأدنى",
  tePasasEn: (importe: string) => `تجاوزت بمقدار ${importe}.`,
  teFaltanParaElMinimo: (importe: string) => `ينقصك ${importe} للوصول إلى الحد الأدنى.`,
  enQueRed: "على أي شبكة",
  walletUsdt: "محفظة USDT",
  usdtEn: (red: string, pista: string) =>
    `USDT على ${red}. ${pista} الدفع على الشبكة الخطأ لا يمكن استرجاعه.`,
  direccionMalFormada: (red: string, pista: string) =>
    `هذا العنوان ليس بصيغة ${red}. ${pista}`,
  pistaTrc20: "يبدأ بحرف T وطوله 34 خانة.",
  pistaBsc: "يبدأ بـ 0x وطوله 42 خانة.",
  pistaTon: "يبدأ بـ EQ أو UQ وطوله 48 خانة.",
  pedirImporte: (importe: string) => `اطلب ${importe}`,
  pedirRetiro: "اطلب سحبًا",
  solicitudesAnteriores: "السابقة",

  sesionCaducada: "انتهت جلستك.",
  sesionCaducadaApoyo: "ادخل مرة أخرى ببريدك. لا تفقد شيئًا مما لك.",
  algoHaFallado: "حدث خطأ ما.",
  comoCobras: "تربح 0,03 $ عن كل مستخدم يسجّله، أيًّا كان بلده.",

  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "للدخول تحتاج رمز تفعيل من المشرف العام.",
  botCuandoLoTengas: "حين تحصل عليه، افتحه هنا واربط بريدك.",
  botHola: (nombre: string) => `مرحبًا ${nombre}. اختر من أين تبدأ.`,
  botVincularCuenta: "اربط حسابي",
  botSuspendido: "حسابك موقوف. راسل المشرف العام لإعادة تفعيله.",
  botSinPublicar: "التطبيق لم يُنشر بعد. أبلغ المشرف العام.",
  botCadaComando: "كل أمر يفتح شاشة:",
  botOStart: "أو /start للقائمة الكاملة.",
  botComandoDesconocido: "لا أعرف هذا الأمر. جرّب /ayuda.",
  botUsaStart: "استخدم /start لفتح التطبيق.",

  botRetiroPagado: (importe: string) => `حوّلنا لك ${importe}.`,
  botRedTitulo: "شبكتك تحتاج مكالمة",
  botRedParados: (n: number, total: number) =>
    `${n} من أصل ${total} من مشرفيك لم يجلبوا أي تسجيل منذ مدة:`,
  botRedDiasParado: (dias: number) => `متوقّف منذ ${dias} يومًا`,
  botRedIncidencias: (n: number) => `${n} لديهم مشكلة في Sophon ولا يمكنهم الإنتاج:`,
  botRedYOtros: (n: number) => `…و${n} آخرون.`,
  botRedComoVerlo: "افتحهم في «شبكتك» لترى بأي روابط يجلبون المستخدمين.",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `المرجع: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `طلب سحبك بقيمة ${importe} تمت الموافقة عليه. التحويل قريبًا.`,
  botRetiroRechazado: (importe: string) =>
    `طلب سحبك بقيمة ${importe} لم يتم. الرصيد متاح من جديد.`,
  botMotivo: (motivo: string) => `السبب: ${motivo}`,
};

const catalogos: Record<Idioma, Cadenas> = { es, en, ar, it, pt };

export function cadenas(idioma: Idioma = IDIOMA_POR_DEFECTO): Cadenas {
  return catalogos[idioma];
}
