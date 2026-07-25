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
  red: "Tu red",
  historico: "Histórico",
  cartera: "Cartera",
  webmaster: "Webmaster",
  devengado: "DEVENGADO",
  disponible: "DISPONIBLE",
  solicitado: "SOLICITADO",
  pagado: "PAGADO",
  volver: "Volver",
  cargando: "Cargando",
  sondeando: "Sondeando",

  // ── Acciones ──────────────────────────────────────────────────────────────
  activarWebmaster: "Activar webmaster",
  concederPro: "Conceder PRO",
  renovarPro: "Renovar PRO",
  solicitarRetiro: "Solicitar retiro",
  vincularCuenta: "Vincular mi cuenta",
  reintentar: "Reintentar",
  activar: "ACTIVAR",
  entrar: "ENTRAR",
  activarOtro: "Activar otro",
  verMiRed: "Ver mi red",
  verSuFicha: "Ver su ficha",
  volverAlInicio: "Volver al inicio",
  activarElPrimero: "Activar el primero",

  // ── Estados vacíos: invitan a actuar, no se disculpan ──────────────────────
  sinWebmasters: "Aún no has activado ningún webmaster.",
  sinWebmastersApoyo:
    "Activa el primero con su correo de Sophon y el testigo empezará a formarse.",
  sinIngresos: "Tus webmasters aún no han traído registros.",
  sinIngresosApoyo:
    "En cuanto alguien se registre desde su enlace, verás la primera capa aquí. Suele tardar unas horas.",
  sinMovimientos: "Todavía no has pedido ningún retiro.",
  sinVinculo: "Aún no has vinculado tu cuenta.",

  // ── Alta del agente ───────────────────────────────────────────────────────
  vinculaTuCuenta: "Vincula tu cuenta",
  soloSeHaceUnaVez: "Solo se hace una vez. Después entras siempre desde este Telegram.",
  codigoDeActivacion: "CÓDIGO DE ACTIVACIÓN",
  teLoDaElSuperadmin: "Te lo da el superadmin.",
  tuCorreo: "TU CORREO",
  seraTuIdentificador:
    "Será tu identificador para entrar. Te mandaremos ahí un código de 6 dígitos.",
  enviarmeElCodigo: "ENVIARME EL CÓDIGO",
  confirmaQueEresTu: "Confirma que eres tú",
  pideCodigo: "Escribe el código de activación que te ha dado el superadmin.",
  otpEnviado: (email: string) =>
    `Te hemos enviado un código de 6 dígitos a ${email}. Caduca en 10 minutos.`,
  codigoDeSeisDigitos: "CÓDIGO DE 6 DÍGITOS",
  cambiarElCorreo: "Cambiar el correo",
  reenviarEn: (segundos: number) => `Reenviar en ${segundos} s`,
  reenviarElCodigo: "Reenviar el código",

  // ── Inicio ────────────────────────────────────────────────────────────────
  devengadoTreintaDias: "DEVENGADO · 30 DÍAS",
  registrosYWebmasters: (registros: number, webmasters: number) =>
    `${registros} registros · ${webmasters} webmasters`,
  repartoPorTier: "Reparto de registros por tier",
  acciones: "Acciones",
  estadoDeTuDinero: "Estado de tu dinero",

  // ── Activar webmaster ─────────────────────────────────────────────────────
  correoDelWebmaster: "CORREO DEL WEBMASTER",
  tieneQueExistirYa: "El correo con el que se registró en Sophon. Tiene que existir ya.",
  alActivarlo: "Al activarlo pasa a tu red.",
  yaEstaEnTuRed: (email: string) => `${email} ya está en tu red.`,
  cobrarasDesdeHoy:
    "Cobrarás por los usuarios que registre a partir de hoy. Los que trajera antes no cuentan.",

  // ── Tu red ────────────────────────────────────────────────────────────────
  conIncidencia: (n: number) => `${n} con incidencia`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} sin actividad en los últimos ${dias} días, de ${total}`,
  todosProduciendo: (n: number) => `Los ${n} están produciendo`,
  escalaComun: (dias: number) =>
    `Cada columna son ${dias} días. La altura es el volumen de registros y la escala es común, así que las teselas se comparan entre sí.`,

  // ── Estado de un webmaster ────────────────────────────────────────────────
  bloqueado: "BLOQUEADO",
  seVaABorrar: "SE VA A BORRAR",
  desaparecido: "DESAPARECIDO",
  proCaducado: "PRO CADUCADO",
  proVenceEn: (dias: number) => `PRO VENCE ${dias} D`,
  sinActividad: "SIN ACTIVIDAD",
  diasParado: (dias: number) => `${dias} DÍAS PARADO`,
  activoEnSophon: "Activo en Sophon",
  bloqueadoEnSophon: "Bloqueado en Sophon",
  pendienteDeBorrado: "Pendiente de borrado",
  yaNoApareceEnSophon: "Ya no aparece en Sophon",
  estadoSinComprobar: "Estado sin comprobar",

  // ── Ficha de webmaster ────────────────────────────────────────────────────
  enTuRedDesde: (fecha: string) => `en tu red desde el ${fecha}`,
  teHaDado: "TE HA DADO",
  registrosEnDias: (registros: number, dias: number) => `${registros} registros en ${dias} días`,
  compraronPro: (n: number) => `${n} compraron PRO`,
  cobrasDesde: (fecha: string) =>
    `Cobras por lo que registre a partir del ${fecha}. Lo anterior no cuenta.`,
  ultimosDias: (dias: number) => `ÚLTIMOS ${dias} DÍAS`,
  todaviaSinRegistros: "Todavía no ha traído ningún registro.",
  noEstaEnTuRed: "Ese webmaster no está en tu red.",
  noEstaEnTuRedApoyo: "Comprueba el correo, o actívalo si aún no lo has hecho.",
  registroDeSondeo: "Registro de sondeo",

  // ── La Mecha ──────────────────────────────────────────────────────────────
  tiempoRestanteDePro: "Tiempo restante de PRO",
  venceEl: (fecha: string) => `vence el ${fecha}`,
  caducado: "caducado",
  diasDePro: (dias: number) => `${dias} ${dias === 1 ? "día" : "días"} de PRO`,
  semanasDePro: (semanas: number) => `${semanas} ${semanas === 1 ? "semana" : "semanas"} de PRO`,
  renuevaloAntes: " — renuévalo antes de que se apague.",
  proYaCaducado: "El PRO ya ha caducado.",
  sinProActivo: "Sin PRO activo.",
  sinPro: "Sin PRO",

  // ── PRO: siempre un año y atado al alta ───────────────────────────────────
  quedaRegistrado: "Quedará registrado con tu nombre y hora.",
  incluyeUnAnio: "Al activarlo le das un año de PRO. No hay que hacer nada más.",
  proConcedido: (fecha: string) => `Le has dado un año de PRO, hasta el ${fecha}.`,
  proNoConcedido: "El webmaster ya está en tu red, pero el PRO no ha entrado.",
  proNoConcedidoApoyo: "Reinténtalo desde su ficha; el alta no hay que repetirla.",
  renovarUnAnio: "RENOVAR · 1 AÑO",
  darUnAnio: "DAR UN AÑO DE PRO",
  renovado: (email: string, fecha: string) => `${email} tiene PRO hasta el ${fecha}.`,
  colaRenovaciones: "Renovaciones",
  seApagan: (n: number) => `${n} piden atención`,
  ningunoSeApaga: (dias: number) => `Ninguno se apaga en ${dias} días`,
  nuncaTuvoPro: "Nunca llegó a tener PRO",
  todoAlDia: "Toda tu red tiene el PRO al día.",

  // ── Histórico ─────────────────────────────────────────────────────────────
  enDias: (dias: number) => `en ${dias} días`,
  tocaUnDia: "Toca un día para ver de dónde salió.",
  columnaDia: "DÍA",
  columnaDolares: "DÓLARES",
  perforando: "Perforando",
  aquiEmpieza: "Aquí empieza tu registro. No hay nada anterior.",
  desglose: (registros: number, t1: number, t2: number, t3: number) =>
    `${registros} registros · T1 ${t1} · T2 ${t2} · T3 ${t3}`,
  dePago: (n: number) => `${n} de pago`,
  diaAbierto: "Día abierto: aún puede cambiar.",

  // ── Cartera ───────────────────────────────────────────────────────────────
  soloConsolidado: "Solo lo consolidado se puede pedir: los últimos días aún pueden revisarse.",
  revisionManual: "El superadmin revisa cada solicitud a mano. Suele tardar de 1 a 3 días.",
  solicitudEnCurso: "SOLICITUD EN CURSO",
  pendienteDeRevision: "Pendiente de revisión",
  aprobadoPendientePago: "Aprobado, pendiente de pago",
  estadoPagado: "Pagado",
  estadoRechazado: "Rechazado",
  estadoCancelado: "Cancelado",
  pedidaEl: (fecha: string) => `Pedida el ${fecha}.`,
  soloUnaALaVez:
    "Solo puedes tener una a la vez; en cuanto se resuelva podrás pedir la siguiente.",
  cuanto: "CUÁNTO",
  todo: "Todo",
  disponibleYMinimo: "Disponible",
  minimo: "mínimo",
  tePasasEn: (importe: string) => `Te pasas en ${importe}.`,
  teFaltanParaElMinimo: (importe: string) => `Te faltan ${importe} para el mínimo.`,
  enQueRed: "EN QUÉ RED",
  walletUsdt: "WALLET USDT",
  usdtEn: (red: string, pista: string) =>
    `USDT en ${red}. ${pista} Un pago a la red equivocada no se recupera.`,
  direccionMalFormada: (red: string, pista: string) =>
    `Esa dirección no tiene forma de ${red}. ${pista}`,
  pistaTrc20: "Empieza por T y tiene 34 caracteres.",
  pistaBsc: "Empieza por 0x y tiene 42 caracteres.",
  pistaTon: "Empieza por EQ o UQ y tiene 48 caracteres.",
  pedirImporte: (importe: string) => `PEDIR ${importe}`,
  pedirRetiro: "PEDIR RETIRO",
  solicitudesAnteriores: "ANTERIORES",

  // ── Errores: qué pasó · por qué · qué hago ahora ──────────────────────────
  sesionCaducada: "Tu sesión ha caducado.",
  sesionCaducadaApoyo: "Vuelve a entrar con tu correo. No pierdes nada de lo tuyo.",
  algoHaFallado: "Algo ha fallado.",
  comoCobras: "Cobras 0,03 $ por cada usuario que registre, sea cual sea su país.",
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
  red: "Your network",
  historico: "History",
  cartera: "Wallet",
  webmaster: "Webmaster",
  devengado: "EARNED",
  disponible: "AVAILABLE",
  solicitado: "REQUESTED",
  pagado: "PAID",
  volver: "Back",
  cargando: "Loading",
  sondeando: "Drilling",

  activarWebmaster: "Activate webmaster",
  concederPro: "Grant PRO",
  renovarPro: "Renew PRO",
  solicitarRetiro: "Request payout",
  vincularCuenta: "Link my account",
  reintentar: "Try again",
  activar: "ACTIVATE",
  entrar: "SIGN IN",
  activarOtro: "Activate another",
  verMiRed: "See my network",
  verSuFicha: "Open their page",
  volverAlInicio: "Back to home",
  activarElPrimero: "Activate the first one",

  sinWebmasters: "You haven't activated any webmaster yet.",
  sinWebmastersApoyo:
    "Activate the first one with their Sophon email and the core will start forming.",
  sinIngresos: "Your webmasters haven't brought any signups yet.",
  sinIngresosApoyo:
    "As soon as somebody signs up through their link, the first layer shows here. It usually takes a few hours.",
  sinMovimientos: "You haven't requested any payout yet.",
  sinVinculo: "You haven't linked your account yet.",

  vinculaTuCuenta: "Link your account",
  soloSeHaceUnaVez: "You only do this once. After that you always come in from this Telegram.",
  codigoDeActivacion: "ACTIVATION CODE",
  teLoDaElSuperadmin: "The superadmin gives it to you.",
  tuCorreo: "YOUR EMAIL",
  seraTuIdentificador: "It will be your sign-in ID. We'll send a 6-digit code there.",
  enviarmeElCodigo: "SEND ME THE CODE",
  confirmaQueEresTu: "Confirm it's you",
  pideCodigo: "Type the activation code the superadmin gave you.",
  otpEnviado: (email: string) =>
    `We sent a 6-digit code to ${email}. It expires in 10 minutes.`,
  codigoDeSeisDigitos: "6-DIGIT CODE",
  cambiarElCorreo: "Change the email",
  reenviarEn: (segundos: number) => `Resend in ${segundos}s`,
  reenviarElCodigo: "Resend the code",

  devengadoTreintaDias: "EARNED · 30 DAYS",
  registrosYWebmasters: (registros: number, webmasters: number) =>
    `${registros} signups · ${webmasters} webmasters`,
  repartoPorTier: "Signups by tier",
  acciones: "Actions",
  estadoDeTuDinero: "Where your money is",

  correoDelWebmaster: "WEBMASTER'S EMAIL",
  tieneQueExistirYa: "The email they signed up to Sophon with. It has to exist already.",
  alActivarlo: "Activating them adds them to your network.",
  yaEstaEnTuRed: (email: string) => `${email} is now in your network.`,
  cobrarasDesdeHoy:
    "You earn on the users they sign up from today onwards. Anyone they brought before doesn't count.",

  conIncidencia: (n: number) => `${n} with an issue`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} with no activity in the last ${dias} days, out of ${total}`,
  todosProduciendo: (n: number) => `All ${n} are producing`,
  escalaComun: (dias: number) =>
    `Each column is ${dias} days. Height is signup volume and the scale is shared, so tiles compare against each other.`,

  bloqueado: "BLOCKED",
  seVaABorrar: "BEING DELETED",
  desaparecido: "GONE",
  proCaducado: "PRO EXPIRED",
  proVenceEn: (dias: number) => `PRO ENDS ${dias}D`,
  sinActividad: "NO ACTIVITY",
  diasParado: (dias: number) => `${dias} DAYS IDLE`,
  activoEnSophon: "Active on Sophon",
  bloqueadoEnSophon: "Blocked on Sophon",
  pendienteDeBorrado: "Pending deletion",
  yaNoApareceEnSophon: "No longer on Sophon",
  estadoSinComprobar: "Status not checked",

  enTuRedDesde: (fecha: string) => `in your network since ${fecha}`,
  teHaDado: "THEY'VE EARNED YOU",
  registrosEnDias: (registros: number, dias: number) => `${registros} signups in ${dias} days`,
  compraronPro: (n: number) => `${n} bought PRO`,
  cobrasDesde: (fecha: string) =>
    `You earn on what they sign up from ${fecha} onwards. Anything before doesn't count.`,
  ultimosDias: (dias: number) => `LAST ${dias} DAYS`,
  todaviaSinRegistros: "They haven't brought any signups yet.",
  noEstaEnTuRed: "That webmaster isn't in your network.",
  noEstaEnTuRedApoyo: "Check the email, or activate them if you haven't yet.",
  registroDeSondeo: "Drill log",

  tiempoRestanteDePro: "PRO time left",
  venceEl: (fecha: string) => `ends ${fecha}`,
  caducado: "expired",
  diasDePro: (dias: number) => `${dias} ${dias === 1 ? "day" : "days"} of PRO`,
  semanasDePro: (semanas: number) => `${semanas} ${semanas === 1 ? "week" : "weeks"} of PRO`,
  renuevaloAntes: " — renew it before it burns out.",
  proYaCaducado: "PRO has already expired.",
  sinProActivo: "No active PRO.",
  sinPro: "No PRO",

  quedaRegistrado: "It will be logged with your name and the time.",
  incluyeUnAnio: "Activating them gives them a year of PRO. Nothing else to do.",
  proConcedido: (fecha: string) => `You gave them a year of PRO, until ${fecha}.`,
  proNoConcedido: "The webmaster is in your network, but the PRO didn't go through.",
  proNoConcedidoApoyo: "Retry from their page; you don't need to activate them again.",
  renovarUnAnio: "RENEW · 1 YEAR",
  darUnAnio: "GIVE A YEAR OF PRO",
  renovado: (email: string, fecha: string) => `${email} has PRO until ${fecha}.`,
  colaRenovaciones: "Renewals",
  seApagan: (n: number) => `${n} need attention`,
  ningunoSeApaga: (dias: number) => `None burns out within ${dias} days`,
  nuncaTuvoPro: "Never had PRO",
  todoAlDia: "Your whole network is up to date on PRO.",

  enDias: (dias: number) => `over ${dias} days`,
  tocaUnDia: "Tap a day to see where it came from.",
  columnaDia: "DAY",
  columnaDolares: "DOLLARS",
  perforando: "Drilling",
  aquiEmpieza: "Your record starts here. There's nothing earlier.",
  desglose: (registros: number, t1: number, t2: number, t3: number) =>
    `${registros} signups · T1 ${t1} · T2 ${t2} · T3 ${t3}`,
  dePago: (n: number) => `${n} paying`,
  diaAbierto: "Day still open: this can change.",

  soloConsolidado: "Only settled money can be requested: the last few days can still be revised.",
  revisionManual: "The superadmin reviews every request by hand. It usually takes 1 to 3 days.",
  solicitudEnCurso: "REQUEST IN PROGRESS",
  pendienteDeRevision: "Awaiting review",
  aprobadoPendientePago: "Approved, awaiting payment",
  estadoPagado: "Paid",
  estadoRechazado: "Rejected",
  estadoCancelado: "Cancelled",
  pedidaEl: (fecha: string) => `Requested on ${fecha}.`,
  soloUnaALaVez: "Only one at a time; once it's resolved you can request the next.",
  cuanto: "HOW MUCH",
  todo: "All",
  disponibleYMinimo: "Available",
  minimo: "minimum",
  tePasasEn: (importe: string) => `That's ${importe} over.`,
  teFaltanParaElMinimo: (importe: string) => `You're ${importe} short of the minimum.`,
  enQueRed: "WHICH NETWORK",
  walletUsdt: "USDT WALLET",
  usdtEn: (red: string, pista: string) =>
    `USDT on ${red}. ${pista} A payment on the wrong network can't be recovered.`,
  direccionMalFormada: (red: string, pista: string) =>
    `That address isn't shaped like ${red}. ${pista}`,
  pistaTrc20: "Starts with T and is 34 characters long.",
  pistaBsc: "Starts with 0x and is 42 characters long.",
  pistaTon: "Starts with EQ or UQ and is 48 characters long.",
  pedirImporte: (importe: string) => `REQUEST ${importe}`,
  pedirRetiro: "REQUEST PAYOUT",
  solicitudesAnteriores: "EARLIER",

  sesionCaducada: "Your session has expired.",
  sesionCaducadaApoyo: "Sign in again with your email. Nothing of yours is lost.",
  algoHaFallado: "Something went wrong.",
  comoCobras: "You earn $0.03 for every user they sign up, whatever the country.",
};

const it: Cadenas = {
  inicio: "Inizio",
  red: "La tua rete",
  historico: "Storico",
  cartera: "Portafoglio",
  webmaster: "Webmaster",
  devengado: "MATURATO",
  disponible: "DISPONIBILE",
  solicitado: "RICHIESTO",
  pagado: "PAGATO",
  volver: "Indietro",
  cargando: "Caricamento",
  sondeando: "Sondaggio",

  activarWebmaster: "Attiva webmaster",
  concederPro: "Assegna PRO",
  renovarPro: "Rinnova PRO",
  solicitarRetiro: "Richiedi prelievo",
  vincularCuenta: "Collega il mio account",
  reintentar: "Riprova",
  activar: "ATTIVA",
  entrar: "ENTRA",
  activarOtro: "Attivane un altro",
  verMiRed: "Vedi la mia rete",
  verSuFicha: "Apri la sua scheda",
  volverAlInicio: "Torna all'inizio",
  activarElPrimero: "Attiva il primo",

  sinWebmasters: "Non hai ancora attivato nessun webmaster.",
  sinWebmastersApoyo:
    "Attiva il primo con la sua email di Sophon e la carota inizierà a formarsi.",
  sinIngresos: "I tuoi webmaster non hanno ancora portato iscrizioni.",
  sinIngresosApoyo:
    "Appena qualcuno si iscrive dal loro link, qui compare il primo strato. Di solito ci vogliono alcune ore.",
  sinMovimientos: "Non hai ancora chiesto nessun prelievo.",
  sinVinculo: "Non hai ancora collegato il tuo account.",

  vinculaTuCuenta: "Collega il tuo account",
  soloSeHaceUnaVez: "Si fa una volta sola. Poi entri sempre da questo Telegram.",
  codigoDeActivacion: "CODICE DI ATTIVAZIONE",
  teLoDaElSuperadmin: "Te lo dà il superadmin.",
  tuCorreo: "LA TUA EMAIL",
  seraTuIdentificador: "Sarà il tuo identificativo per entrare. Ti manderemo lì un codice di 6 cifre.",
  enviarmeElCodigo: "MANDAMI IL CODICE",
  confirmaQueEresTu: "Conferma che sei tu",
  pideCodigo: "Scrivi il codice di attivazione che ti ha dato il superadmin.",
  otpEnviado: (email: string) =>
    `Ti abbiamo mandato un codice di 6 cifre a ${email}. Scade tra 10 minuti.`,
  codigoDeSeisDigitos: "CODICE DI 6 CIFRE",
  cambiarElCorreo: "Cambia l'email",
  reenviarEn: (segundos: number) => `Rinvia tra ${segundos} s`,
  reenviarElCodigo: "Rinvia il codice",

  devengadoTreintaDias: "MATURATO · 30 GIORNI",
  registrosYWebmasters: (registros: number, webmasters: number) =>
    `${registros} iscrizioni · ${webmasters} webmaster`,
  repartoPorTier: "Iscrizioni per tier",
  acciones: "Azioni",
  estadoDeTuDinero: "Dove sono i tuoi soldi",

  correoDelWebmaster: "EMAIL DEL WEBMASTER",
  tieneQueExistirYa: "L'email con cui si è registrato su Sophon. Deve esistere già.",
  alActivarlo: "Attivandolo passa nella tua rete.",
  yaEstaEnTuRed: (email: string) => `${email} è ora nella tua rete.`,
  cobrarasDesdeHoy:
    "Guadagni sugli utenti che registra da oggi in poi. Quelli portati prima non contano.",

  conIncidencia: (n: number) => `${n} con un problema`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} senza attività negli ultimi ${dias} giorni, su ${total}`,
  todosProduciendo: (n: number) => `Tutti e ${n} stanno producendo`,
  escalaComun: (dias: number) =>
    `Ogni colonna è ${dias} giorni. L'altezza è il volume di iscrizioni e la scala è comune, così le tessere si confrontano tra loro.`,

  bloqueado: "BLOCCATO",
  seVaABorrar: "IN CANCELLAZIONE",
  desaparecido: "SPARITO",
  proCaducado: "PRO SCADUTO",
  proVenceEn: (dias: number) => `PRO FINISCE ${dias} G`,
  sinActividad: "NESSUNA ATTIVITÀ",
  diasParado: (dias: number) => `${dias} GIORNI FERMO`,
  activoEnSophon: "Attivo su Sophon",
  bloqueadoEnSophon: "Bloccato su Sophon",
  pendienteDeBorrado: "In attesa di cancellazione",
  yaNoApareceEnSophon: "Non compare più su Sophon",
  estadoSinComprobar: "Stato non verificato",

  enTuRedDesde: (fecha: string) => `nella tua rete dal ${fecha}`,
  teHaDado: "TI HA DATO",
  registrosEnDias: (registros: number, dias: number) =>
    `${registros} iscrizioni in ${dias} giorni`,
  compraronPro: (n: number) => `${n} hanno comprato PRO`,
  cobrasDesde: (fecha: string) =>
    `Guadagni su quello che registra dal ${fecha}. Quello precedente non conta.`,
  ultimosDias: (dias: number) => `ULTIMI ${dias} GIORNI`,
  todaviaSinRegistros: "Non ha ancora portato nessuna iscrizione.",
  noEstaEnTuRed: "Quel webmaster non è nella tua rete.",
  noEstaEnTuRedApoyo: "Controlla l'email, oppure attivalo se non l'hai ancora fatto.",
  registroDeSondeo: "Registro di sondaggio",

  tiempoRestanteDePro: "Tempo di PRO rimasto",
  venceEl: (fecha: string) => `scade il ${fecha}`,
  caducado: "scaduto",
  diasDePro: (dias: number) => `${dias} ${dias === 1 ? "giorno" : "giorni"} di PRO`,
  semanasDePro: (semanas: number) =>
    `${semanas} ${semanas === 1 ? "settimana" : "settimane"} di PRO`,
  renuevaloAntes: " — rinnovalo prima che si spenga.",
  proYaCaducado: "Il PRO è già scaduto.",
  sinProActivo: "Nessun PRO attivo.",
  sinPro: "Senza PRO",

  quedaRegistrado: "Resterà registrato con il tuo nome e l'ora.",
  incluyeUnAnio: "Attivandolo gli dai un anno di PRO. Non serve altro.",
  proConcedido: (fecha: string) => `Gli hai dato un anno di PRO, fino al ${fecha}.`,
  proNoConcedido: "Il webmaster è nella tua rete, ma il PRO non è passato.",
  proNoConcedidoApoyo: "Riprova dalla sua scheda; l'attivazione non va rifatta.",
  renovarUnAnio: "RINNOVA · 1 ANNO",
  darUnAnio: "DAI UN ANNO DI PRO",
  renovado: (email: string, fecha: string) => `${email} ha il PRO fino al ${fecha}.`,
  colaRenovaciones: "Rinnovi",
  seApagan: (n: number) => `${n} chiedono attenzione`,
  ningunoSeApaga: (dias: number) => `Nessuno si spegne entro ${dias} giorni`,
  nuncaTuvoPro: "Non ha mai avuto il PRO",
  todoAlDia: "Tutta la tua rete ha il PRO in regola.",

  enDias: (dias: number) => `in ${dias} giorni`,
  tocaUnDia: "Tocca un giorno per vedere da dove viene.",
  columnaDia: "GIORNO",
  columnaDolares: "DOLLARI",
  perforando: "Perforazione",
  aquiEmpieza: "Qui inizia il tuo registro. Non c'è niente di precedente.",
  desglose: (registros: number, t1: number, t2: number, t3: number) =>
    `${registros} iscrizioni · T1 ${t1} · T2 ${t2} · T3 ${t3}`,
  dePago: (n: number) => `${n} paganti`,
  diaAbierto: "Giorno aperto: può ancora cambiare.",

  soloConsolidado:
    "Si può chiedere solo quello consolidato: gli ultimi giorni possono ancora essere rivisti.",
  revisionManual: "Il superadmin controlla ogni richiesta a mano. Di solito ci vogliono 1-3 giorni.",
  solicitudEnCurso: "RICHIESTA IN CORSO",
  pendienteDeRevision: "In attesa di revisione",
  aprobadoPendientePago: "Approvata, in attesa di pagamento",
  estadoPagado: "Pagata",
  estadoRechazado: "Respinta",
  estadoCancelado: "Annullata",
  pedidaEl: (fecha: string) => `Chiesta il ${fecha}.`,
  soloUnaALaVez: "Puoi averne solo una alla volta; appena si risolve puoi chiedere la successiva.",
  cuanto: "QUANTO",
  todo: "Tutto",
  disponibleYMinimo: "Disponibile",
  minimo: "minimo",
  tePasasEn: (importe: string) => `Sfori di ${importe}.`,
  teFaltanParaElMinimo: (importe: string) => `Ti mancano ${importe} per il minimo.`,
  enQueRed: "SU QUALE RETE",
  walletUsdt: "WALLET USDT",
  usdtEn: (red: string, pista: string) =>
    `USDT su ${red}. ${pista} Un pagamento sulla rete sbagliata non si recupera.`,
  direccionMalFormada: (red: string, pista: string) =>
    `Quell'indirizzo non ha la forma di ${red}. ${pista}`,
  pistaTrc20: "Inizia con T ed è lungo 34 caratteri.",
  pistaBsc: "Inizia con 0x ed è lungo 42 caratteri.",
  pistaTon: "Inizia con EQ o UQ ed è lungo 48 caratteri.",
  pedirImporte: (importe: string) => `CHIEDI ${importe}`,
  pedirRetiro: "CHIEDI PRELIEVO",
  solicitudesAnteriores: "PRECEDENTI",

  sesionCaducada: "La tua sessione è scaduta.",
  sesionCaducadaApoyo: "Rientra con la tua email. Non perdi niente di tuo.",
  algoHaFallado: "Qualcosa è andato storto.",
  comoCobras: "Guadagni 0,03 $ per ogni utente che registra, da qualunque paese arrivi.",
};

const pt: Cadenas = {
  inicio: "Início",
  red: "A tua rede",
  historico: "Histórico",
  cartera: "Carteira",
  webmaster: "Webmaster",
  devengado: "ACUMULADO",
  disponible: "DISPONÍVEL",
  solicitado: "SOLICITADO",
  pagado: "PAGO",
  volver: "Voltar",
  cargando: "A carregar",
  sondeando: "A sondar",

  activarWebmaster: "Ativar webmaster",
  concederPro: "Conceder PRO",
  renovarPro: "Renovar PRO",
  solicitarRetiro: "Pedir levantamento",
  vincularCuenta: "Ligar a minha conta",
  reintentar: "Tentar de novo",
  activar: "ATIVAR",
  entrar: "ENTRAR",
  activarOtro: "Ativar outro",
  verMiRed: "Ver a minha rede",
  verSuFicha: "Abrir a ficha",
  volverAlInicio: "Voltar ao início",
  activarElPrimero: "Ativar o primeiro",

  sinWebmasters: "Ainda não ativaste nenhum webmaster.",
  sinWebmastersApoyo:
    "Ativa o primeiro com o email dele na Sophon e o testemunho começa a formar-se.",
  sinIngresos: "Os teus webmasters ainda não trouxeram registos.",
  sinIngresosApoyo:
    "Assim que alguém se registar pelo link deles, vês aqui a primeira camada. Costuma demorar umas horas.",
  sinMovimientos: "Ainda não pediste nenhum levantamento.",
  sinVinculo: "Ainda não ligaste a tua conta.",

  vinculaTuCuenta: "Liga a tua conta",
  soloSeHaceUnaVez: "Só se faz uma vez. Depois entras sempre a partir deste Telegram.",
  codigoDeActivacion: "CÓDIGO DE ATIVAÇÃO",
  teLoDaElSuperadmin: "É o superadmin que to dá.",
  tuCorreo: "O TEU EMAIL",
  seraTuIdentificador: "Vai ser o teu identificador para entrar. Enviamos aí um código de 6 dígitos.",
  enviarmeElCodigo: "ENVIAR-ME O CÓDIGO",
  confirmaQueEresTu: "Confirma que és tu",
  pideCodigo: "Escreve o código de ativação que o superadmin te deu.",
  otpEnviado: (email: string) =>
    `Enviámos um código de 6 dígitos para ${email}. Expira em 10 minutos.`,
  codigoDeSeisDigitos: "CÓDIGO DE 6 DÍGITOS",
  cambiarElCorreo: "Mudar o email",
  reenviarEn: (segundos: number) => `Reenviar em ${segundos} s`,
  reenviarElCodigo: "Reenviar o código",

  devengadoTreintaDias: "ACUMULADO · 30 DIAS",
  registrosYWebmasters: (registros: number, webmasters: number) =>
    `${registros} registos · ${webmasters} webmasters`,
  repartoPorTier: "Registos por tier",
  acciones: "Ações",
  estadoDeTuDinero: "Onde está o teu dinheiro",

  correoDelWebmaster: "EMAIL DO WEBMASTER",
  tieneQueExistirYa: "O email com que se registou na Sophon. Tem de existir já.",
  alActivarlo: "Ao ativá-lo passa para a tua rede.",
  yaEstaEnTuRed: (email: string) => `${email} já está na tua rede.`,
  cobrarasDesdeHoy:
    "Ganhas pelos utilizadores que ele registar a partir de hoje. Os que trouxe antes não contam.",

  conIncidencia: (n: number) => `${n} com problema`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} sem atividade nos últimos ${dias} dias, de ${total}`,
  todosProduciendo: (n: number) => `Os ${n} estão a produzir`,
  escalaComun: (dias: number) =>
    `Cada coluna são ${dias} dias. A altura é o volume de registos e a escala é comum, por isso as peças comparam-se entre si.`,

  bloqueado: "BLOQUEADO",
  seVaABorrar: "VAI SER APAGADO",
  desaparecido: "DESAPARECIDO",
  proCaducado: "PRO EXPIRADO",
  proVenceEn: (dias: number) => `PRO ACABA ${dias} D`,
  sinActividad: "SEM ATIVIDADE",
  diasParado: (dias: number) => `${dias} DIAS PARADO`,
  activoEnSophon: "Ativo na Sophon",
  bloqueadoEnSophon: "Bloqueado na Sophon",
  pendienteDeBorrado: "A aguardar eliminação",
  yaNoApareceEnSophon: "Já não aparece na Sophon",
  estadoSinComprobar: "Estado por verificar",

  enTuRedDesde: (fecha: string) => `na tua rede desde ${fecha}`,
  teHaDado: "DEU-TE",
  registrosEnDias: (registros: number, dias: number) => `${registros} registos em ${dias} dias`,
  compraronPro: (n: number) => `${n} compraram PRO`,
  cobrasDesde: (fecha: string) =>
    `Ganhas pelo que ele registar a partir de ${fecha}. O anterior não conta.`,
  ultimosDias: (dias: number) => `ÚLTIMOS ${dias} DIAS`,
  todaviaSinRegistros: "Ainda não trouxe nenhum registo.",
  noEstaEnTuRed: "Esse webmaster não está na tua rede.",
  noEstaEnTuRedApoyo: "Confirma o email, ou ativa-o se ainda não o fizeste.",
  registroDeSondeo: "Registo de sondagem",

  tiempoRestanteDePro: "Tempo de PRO que falta",
  venceEl: (fecha: string) => `acaba a ${fecha}`,
  caducado: "expirado",
  diasDePro: (dias: number) => `${dias} ${dias === 1 ? "dia" : "dias"} de PRO`,
  semanasDePro: (semanas: number) => `${semanas} ${semanas === 1 ? "semana" : "semanas"} de PRO`,
  renuevaloAntes: " — renova antes que se apague.",
  proYaCaducado: "O PRO já expirou.",
  sinProActivo: "Sem PRO ativo.",
  sinPro: "Sem PRO",

  quedaRegistrado: "Fica registado com o teu nome e a hora.",
  incluyeUnAnio: "Ao ativá-lo dás-lhe um ano de PRO. Não é preciso mais nada.",
  proConcedido: (fecha: string) => `Deste-lhe um ano de PRO, até ${fecha}.`,
  proNoConcedido: "O webmaster já está na tua rede, mas o PRO não entrou.",
  proNoConcedidoApoyo: "Tenta outra vez a partir da ficha dele; a ativação não se repete.",
  renovarUnAnio: "RENOVAR · 1 ANO",
  darUnAnio: "DAR UM ANO DE PRO",
  renovado: (email: string, fecha: string) => `${email} tem PRO até ${fecha}.`,
  colaRenovaciones: "Renovações",
  seApagan: (n: number) => `${n} pedem atenção`,
  ningunoSeApaga: (dias: number) => `Nenhum se apaga em ${dias} dias`,
  nuncaTuvoPro: "Nunca chegou a ter PRO",
  todoAlDia: "Toda a tua rede tem o PRO em dia.",

  enDias: (dias: number) => `em ${dias} dias`,
  tocaUnDia: "Toca num dia para veres de onde veio.",
  columnaDia: "DIA",
  columnaDolares: "DÓLARES",
  perforando: "A perfurar",
  aquiEmpieza: "O teu registo começa aqui. Não há nada antes.",
  desglose: (registros: number, t1: number, t2: number, t3: number) =>
    `${registros} registos · T1 ${t1} · T2 ${t2} · T3 ${t3}`,
  dePago: (n: number) => `${n} pagantes`,
  diaAbierto: "Dia aberto: ainda pode mudar.",

  soloConsolidado:
    "Só se pode pedir o consolidado: os últimos dias ainda podem ser revistos.",
  revisionManual: "O superadmin revê cada pedido à mão. Costuma demorar de 1 a 3 dias.",
  solicitudEnCurso: "PEDIDO EM CURSO",
  pendienteDeRevision: "A aguardar revisão",
  aprobadoPendientePago: "Aprovado, a aguardar pagamento",
  estadoPagado: "Pago",
  estadoRechazado: "Recusado",
  estadoCancelado: "Cancelado",
  pedidaEl: (fecha: string) => `Pedido a ${fecha}.`,
  soloUnaALaVez: "Só podes ter um de cada vez; assim que ficar resolvido podes pedir o seguinte.",
  cuanto: "QUANTO",
  todo: "Tudo",
  disponibleYMinimo: "Disponível",
  minimo: "mínimo",
  tePasasEn: (importe: string) => `Passas-te em ${importe}.`,
  teFaltanParaElMinimo: (importe: string) => `Faltam-te ${importe} para o mínimo.`,
  enQueRed: "EM QUE REDE",
  walletUsdt: "CARTEIRA USDT",
  usdtEn: (red: string, pista: string) =>
    `USDT na ${red}. ${pista} Um pagamento na rede errada não se recupera.`,
  direccionMalFormada: (red: string, pista: string) =>
    `Esse endereço não tem a forma de ${red}. ${pista}`,
  pistaTrc20: "Começa por T e tem 34 caracteres.",
  pistaBsc: "Começa por 0x e tem 42 caracteres.",
  pistaTon: "Começa por EQ ou UQ e tem 48 caracteres.",
  pedirImporte: (importe: string) => `PEDIR ${importe}`,
  pedirRetiro: "PEDIR LEVANTAMENTO",
  solicitudesAnteriores: "ANTERIORES",

  sesionCaducada: "A tua sessão expirou.",
  sesionCaducadaApoyo: "Entra outra vez com o teu email. Não perdes nada do que é teu.",
  algoHaFallado: "Alguma coisa correu mal.",
  comoCobras: "Ganhas 0,03 $ por cada utilizador que ele registar, seja de que país for.",
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
  concederPro: "منح PRO",
  renovarPro: "تجديد PRO",
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

  correoDelWebmaster: "بريد مشرف الموقع",
  tieneQueExistirYa: "البريد الذي سجّل به في Sophon. يجب أن يكون موجودًا مسبقًا.",
  alActivarlo: "بتفعيله ينضم إلى شبكتك.",
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
  proVenceEn: (dias: number) => `ينتهي PRO خلال ${dias} ي`,
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
  noEstaEnTuRed: "هذا المشرف ليس في شبكتك.",
  noEstaEnTuRedApoyo: "تحقّق من البريد، أو فعّله إن لم تفعل بعد.",
  registroDeSondeo: "سجل السبر",

  tiempoRestanteDePro: "ما تبقّى من PRO",
  venceEl: (fecha: string) => `ينتهي في ${fecha}`,
  caducado: "منتهٍ",
  diasDePro: (dias: number) => `${dias} يومًا من PRO`,
  semanasDePro: (semanas: number) => `${semanas} أسبوعًا من PRO`,
  renuevaloAntes: " — جدّده قبل أن ينطفئ.",
  proYaCaducado: "انتهت صلاحية PRO بالفعل.",
  sinProActivo: "لا يوجد PRO نشط.",
  sinPro: "بلا PRO",

  quedaRegistrado: "سيُسجَّل باسمك ووقته.",
  incluyeUnAnio: "بتفعيله تمنحه سنة من PRO. لا شيء آخر عليك فعله.",
  proConcedido: (fecha: string) => `منحته سنة من PRO، حتى ${fecha}.`,
  proNoConcedido: "المشرف صار في شبكتك، لكن الـ PRO لم يُمنح.",
  proNoConcedidoApoyo: "أعد المحاولة من صفحته؛ لا داعي لتكرار التفعيل.",
  renovarUnAnio: "تجديد · سنة",
  darUnAnio: "امنح سنة من PRO",
  renovado: (email: string, fecha: string) => `${email} لديه PRO حتى ${fecha}.`,
  colaRenovaciones: "التجديدات",
  seApagan: (n: number) => `${n} بحاجة إلى انتباه`,
  ningunoSeApaga: (dias: number) => `لا أحد ينطفئ خلال ${dias} يومًا`,
  nuncaTuvoPro: "لم يحصل على PRO قط",
  todoAlDia: "كل شبكتك محدَّثة في PRO.",

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
};

const catalogos: Record<Idioma, Cadenas> = { es, en, ar, it, pt };

export function cadenas(idioma: Idioma = IDIOMA_POR_DEFECTO): Cadenas {
  return catalogos[idioma];
}
