/**
 * Cadenas de la interfaz.
 *
 * ── LA VOZ, EN CINCO REGLAS ──
 *
 * 1. **Tuteo y verbo conjugado.** «Has alcanzado el hito», nunca «Alcanzado el
 *    hito». Un participio suelto dirigido al agente es telegrama, no español.
 * 2. **El agente es el sujeto de lo que hace él.** La pasiva refleja vale para
 *    estados del sistema —«las revisiones son manuales»— y no para algo que
 *    tiene que hacer alguien: «la reactivación se solicita al Operador» no
 *    dice quién la solicita, y quien la solicita es él.
 * 3. **Pretérito perfecto compuesto**, que es el uso peninsular para lo
 *    reciente: «has alcanzado», no «alcanzaste».
 * 4. **Sin felicitaciones, sin exclamaciones, sin emoji.** El agente es un
 *    profesional que cobra, no alguien a quien hay que animar. La recompensa es
 *    dinero y con enseñarlo bien basta.
 * 5. **Los errores dicen qué ha pasado, por qué y qué hacer ahora.** Los tres,
 *    y en ese orden.
 *
 * De `revisionManual`, la cadena que cita la regla 2, se conserva «las
 * revisiones son manuales» —sigue siendo un estado del sistema y la pasiva
 * refleja le vale— y cae «Plazo de resolución», que era jerga de tramitación.
 * El plazo se dice ahora en llano: «Tardamos de 1 a 3 días».
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
 * REGLA DURA: ninguna cadena puede revelar el reparto del Operador ni el
 * importe que cobra el webmaster. El agente solo ve lo suyo.
 *
 * **Los catálogos son completos, no parciales.** Con `Partial` una clave sin
 * traducir cae al español sin avisar, y a un agente árabe le llega media
 * pantalla en un idioma que no lee mientras el build pasa en verde. Al exigir
 * el catálogo entero, olvidarse de una cadena es un error de compilación.
 *
 * El panel de Operador NO se traduce: lo usa una sola persona, y mantener
 * cinco versiones de una pantalla que solo ella abre sería trabajo sin destino.
 */

// Con extensión, como todo el resto de `lib/`: era el único import relativo
// sin ella, y el resolvedor de módulos de Node —que no reescribe rutas como
// hace el empaquetador— no lo encontraba. La prueba de extremo a extremo se
// caía aquí en cuanto el barrido de avisos empezó a necesitar los catálogos.
import { IDIOMA_DE_RESPALDO, type Idioma } from "./idiomas.ts";

export const es = {
  // ── Navegación y rótulos ──────────────────────────────────────────────────
  inicio: "Inicio",
  // «Red» se reserva para la cadena de blockchain (`enQueRed`, `usdtEn`): ahí
  // equivocarse cuesta el pago. Los webmasters del agente pasan a ser «equipo».
  red: "Mi equipo",
  historico: "Historial",
  cartera: "Saldo",
  webmaster: "Webmaster",
  devengado: "Ganado",
  disponible: "Disponible",
  solicitado: "Solicitado",
  pagado: "Pagado",
  volver: "Volver",
  cargando: "Cargando",
  sondeando: "Cargando datos",

  // ── Acciones ──────────────────────────────────────────────────────────────
  activarWebmaster: "Activar webmaster",
  solicitarRetiro: "Retirar",
  /*
   * La chapa de la bienvenida y la de la sesión caducada.
   *
   * Decía «Entrar con mi correo», que es el MÉTODO y no la acción: en la
   * bienvenida la línea de apoyo ya termina con «entra con tu correo», así que
   * el botón repetía la frase que tenía tres renglones encima. Un botón dice lo
   * que pasa al pulsarlo, y con la menor cantidad de palabras que lo diga.
   *
   * Se separa de `entrar`, que rotula el botón principal de Telegram al VERIFICAR
   * el código —ese ya está dentro del alta y termina el trámite—. Aquí se está
   * fuera y lo que se hace es acceder.
   */
  acceder: "Acceder",
  reintentar: "Reintentar",
  activar: "Activar",
  entrar: "Entrar",
  activarOtro: "Activar otro",
  verMiRed: "Ver mi equipo",
  verSuFicha: "Ver su perfil",
  volverAlInicio: "Volver al inicio",

  /* ── La tabla de precios del programa ───────────────────────────────────
   *
   * Es la pantalla que el agente abre DELANTE de otra persona: se la enseña al
   * webmaster al que está captando para decirle qué va a cobrar. Por eso el
   * lenguaje habla del webmaster en tercera persona —«lo que cobra»— y no del
   * agente: aquí el agente no es el sujeto, es quien lo está contando.
   *
   * Ninguna de estas cadenas nombra el precio global ni el reparto: el
   * descuento se aplica en `lib/precios/tabla.ts` y aquí ya solo llega el neto.
   */
  precios: "Precios",
  preciosDelPrograma: "Precios del programa",
  preciosParaEnsenar: "Enséñaselo a tus webmasters: es lo que van a cobrar ellos.",
  loQueCobraTuWebmaster: "Lo que cobra tu webmaster",
  porCadaCienUsuarios: "Por cada 100 usuarios registrados",
  paisesDelTier: (n: number) => `${n} ${n === 1 ? "país" : "países"}`,
  nivelDeLaCuenta: "Nivel de la cuenta",
  losNiveles: "Los niveles",
  nivelHaceFalta: (importe: string) => `desde ${importe}`,
  // Encabeza la COLUMNA que lista todos los niveles, no el del agente: «Tu
  // nivel» decía que esa columna era suya cuando lo que enseña es la escalera
  // entera. El suyo se marca en su fila, que es donde se puede marcar.
  nivel: "Nivel",
  /* Dice QUÉ se acumula, y esa precisión no es cosmética: «Acumulado este mes»
     a secas se lee como «lo que llevas ganado», y entonces un umbral de 15.000 $
     parece inalcanzable. Lo que cuenta para el nivel es lo que COMPRAN los
     usuarios captados —su PRO—, que es una cifra mucho mayor que la recompensa.
     Con el rótulo equivocado, la escalera entera parecía de adorno. */
  acumuladoEsteMes: "Pagado por los usuarios este mes",
  teFaltanParaElNivel: (importe: string, nivel: number) => `Te faltan ${importe} para LV${nivel}.`,
  nivelMasAlto: "Estás en el nivel más alto.",
  // El tercer estado, que se quedaba sin frase: el umbral ya está cubierto pero
  // el nivel todavía no se aplica. Decir solo el acumulado justo el mes en que
  // hay algo que contar era dejarse la buena noticia dentro.
  nivelGanadoEntraElDiaUno: (nivel: number) => `Ya tienes LV${nivel}: entra el día 1.`,
  comoSubeElNivel:
    "El nivel sube con lo que pagan los usuarios captados —su PRO—, no con lo que se gana de recompensa. Cuando el mes llega al mínimo del nivel siguiente, el precio nuevo entra el día 1 del mes de después.",
  tuComisionNoDependeDelNivel: "Tu comisión no cambia con el nivel: cobras lo mismo en todos.",
  sinPrecios: "Todavía no hay precios que enseñar.",
  sinPreciosApoyo: "Sophon no ha devuelto la tabla. Vuelve a intentarlo en un momento.",
  activarElPrimero: "Activar el primero",

  // ── Estados vacíos: invitan a actuar, no se disculpan ──────────────────────
  sinWebmasters: "Todavía no has activado ningún webmaster.",
  sinWebmastersApoyo: "Actívalo con su correo de Sophon.",
  sinIngresos: "Tu equipo aún no ha traído registros.",
  sinIngresosApoyo: "Aparecerán aquí en cuanto alguien se registre desde sus enlaces.",
  sinMovimientos: "Todavía no has solicitado ningún retiro.",

  /* ── La bienvenida ──────────────────────────────────────────────────────────
   *
   * Es lo PRIMERO que ve alguien que abre la Mini App sin sesión, así que es la
   * pantalla que presenta el producto. Decía «Aquí no hay sesión abierta»:
   * describía el estado del servidor —un 401— en vez de recibir a quien llega, y
   * un mensaje de sistema como primera frase de un producto lo hace parecer
   * roto antes de haberlo usado.
   *
   * Sigue las cinco reglas de arriba: recibe con verbo conjugado, sin
   * exclamaciones y sin celebrar nada. Y la línea de apoyo dice de qué va esto
   * —equipo, registros, saldo—, que es lo que el título no puede decir.
   */
  bienvenida: "Te damos la bienvenida a Sophon Promoters",
  bienvenidaApoyo:
    "Tu equipo, tus registros y tu saldo, en un solo sitio. Entra con tu correo para verlo.",

  // ── Alta del agente ───────────────────────────────────────────────────────
  entrarEnTuCuenta: "Entrar",
  introduceTuCorreo: "Escribe tu correo. Si ya tienes cuenta, te mandamos el código de verificación.",
  codigoDeActivacion: "Código de activación",
  teLoDaElOperador: "Lo proporciona el Operador.",
  tuCorreo: "Tu correo",
  seraTuIdentificador: "Es tu identificador en Sophon.",
  correoSinCuenta: "Ese correo todavía no tiene cuenta.",
  correoSinCuentaApoyo: "Añade el código de activación para darte de alta.",
  enviarmeElCodigo: "Enviar código",
  confirmaQueEresTu: "Verificar correo",
  otpEnviado: (email: string) =>
    `Código enviado a ${email}. Caduca en 10 minutos.`,
  codigoDeVerificacion: "Código de verificación",
  cambiarElCorreo: "Cambiar correo",
  reenviarEn: (segundos: number) => `Reenviar en ${segundos} s`,
  reenviarElCodigo: "Reenviar código",
  pegarCodigo: "Pegar",
  /* Las lee un lector de pantalla desde la region viva del campo del codigo.
     Estaban interpoladas en espanol dentro del componente, asi que un agente
     arabe oia «3 de 6» en castellano en el unico punto del que depende poder
     entrar. */
  codigoProgreso: (puestos: number, total: number) => `${puestos} de ${total}`,
  codigoCompleto: "Código completo",

  // ── Inicio ────────────────────────────────────────────────────────────────
  devengadoTreintaDias: "Ganado · 30 días",
  registrosYWebmasters: (registros: number, webmasters: number) =>
    `${registros.toLocaleString("es-ES")} ${registros === 1 ? "registro" : "registros"} · ${webmasters} ${
      webmasters === 1 ? "webmaster" : "webmasters"
    }`,
  repartoPorTier: "Registros por nivel",
  acciones: "Acciones",
  estadoDeTuDinero: "Dónde está tu dinero",
  // ── Bono por niveles ──────────────────────────────────────────────────────
  bonoDelMes: "Bono del mes",
  registrosEsteMes: (n: number) =>
    `${n.toLocaleString("es-ES")} ${n === 1 ? "registro" : "registros"} este mes`,
  // Pendiente de retirar: la sustituyen `bonoMasSiLlegas` y `bonoEsteMesLlevas`.
  // Sigue aquí porque `page.tsx` y `lib/bot/avisos.ts` todavía la llaman y el
  // catálogo no tiene respaldo en ejecución: borrarla antes rompe el build.
  faltanParaElBono: (faltan: number, premio: string) =>
    `Te ${faltan === 1 ? "falta" : "faltan"} ${faltan.toLocaleString("es-ES")} ${
      faltan === 1 ? "registro" : "registros"
    } para ${premio}.`,
  bonoMaximoAlcanzado: "Has llegado al nivel más alto del mes.",
  bonoGanado: (importe: string) => `Has ganado ${importe}`,
  escaleraDelBono: "Niveles del bono",
  /*
   * El bono no es acumulable: pasar de 20.000 a 30.000 no paga los 150 $ del
   * escalón alto, paga los 50 de diferencia. Enseñar el total hacía que el
   * agente contara dos veces el mismo dinero, así que lo que preside la banda
   * es el premio y lo que se anuncia arriba es lo que se gana DE MÁS.
   */
  bonoExtraSi: (umbral: number) =>
    `extra si llegas a ${umbral.toLocaleString("es-ES")} ${
      umbral === 1 ? "registro" : "registros"
    } este mes`,
  bonoMasSiLlegas: (importe: string, umbral: number) =>
    `${importe} más si llegas a ${umbral.toLocaleString("es-ES")} ${
      umbral === 1 ? "registro" : "registros"
    }`,
  bonoYaEsTuyo: "ya es tuyo",
  bonoEsteMesLlevas: (registros: number, faltan: number) =>
    `${registros.toLocaleString("es-ES")} este mes · te ${
      faltan === 1 ? "falta" : "faltan"
    } ${faltan.toLocaleString("es-ES")}`,
  /*
   * El ritmo y la recta final: las dos cifras que SÍ se mueven todos los días.
   *
   * Con los umbrales de hoy la barra del nivel marca poco y va a seguir
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
  yaEstaEnTuRed: (email: string) => `${email} ya está en tu equipo.`,
  cobrarasDesdeHoy: "Cobrarás por los registros posteriores a la activación. Los anteriores no cuentan.",

  // ── Mi equipo ─────────────────────────────────────────────────────────────
  conIncidencia: (n: number) => `${n} con ${n === 1 ? "problema" : "problemas"}`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} sin actividad en los últimos ${dias} ${dias === 1 ? "día" : "días"}, de ${total}`,
  todosProduciendo: (n: number) => `Los ${n} están activos`,
  escalaComun: (dias: number) =>
    `Cada columna, ${dias} ${dias === 1 ? "día" : "días"}. Todas las barras están a la misma escala, así que puedes compararlas.`,

  // ── Estado de un webmaster ────────────────────────────────────────────────
  bloqueado: "Bloqueado",
  seVaABorrar: "Se va a borrar",
  desaparecido: "Ya no está",
  proCaducado: "Se le ha caducado el PRO",
  sinActividad: "Sin actividad",
  diasParado: (dias: number) => `${dias} ${dias === 1 ? "día" : "días"} sin actividad`,
  activoEnSophon: "Activo en Sophon",
  bloqueadoEnSophon: "Bloqueado en Sophon",
  pendienteDeBorrado: "Se va a borrar",
  yaNoApareceEnSophon: "Ya no está en Sophon",
  estadoSinComprobar: "Estado sin comprobar",
  /* Vinculado en Sophon pero todavía sin aparecer en el programa de socios.
     No es un fallo: Sophon tarda en propagarlo y el barrido lo resuelve. */
  pendienteDeConfirmar: "Confirmando",
  pendienteDeConfirmarApoyo: "Sophon todavía no lo ha publicado. Suele resolverse solo.",

  // ── Ficha de webmaster ────────────────────────────────────────────────────
  enTuRedDesde: (fecha: string) => `en tu equipo desde el ${fecha}`,
  teHaDado: "Te ha traído",
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
  conQueCapta: "Con estos enlaces consigue registros. Datos en directo de Sophon.",
  sinEnlaces: "Todavía no ha publicado ningún enlace.",
  enlacesNoDisponibles: "Ahora no podemos consultar sus enlaces. Inténtalo más tarde.",
  enlaceCopiado: "Enlace copiado",
  /**
   * La moneda dicha con todas sus letras, solo para el lector de pantalla.
   *
   * En pantalla el `$` va aparte —más pequeño y apagado, porque es una unidad y
   * no un dato—, y un lector de pantalla que se encuentra «2.147,39 $» a veces
   * lo deletrea y a veces se lo salta. La cadena accesible dice la moneda
   * entera, y por eso tiene que estar traducida: estaba escrita a mano en
   * `components/Importe.tsx` y `components/Animacion.tsx`, así que un agente
   * inglés oía «two thousand one hundred forty-seven point three nine dólares».
   */
  dolares: (importe: string) => `${importe} dólares`,
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
  proNoConcedido: "Ya tienes al webmaster en tu equipo, pero no hemos podido darle el PRO.",
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

  // ── Historial ─────────────────────────────────────────────────────────────
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
  dePago: (n: number) => `${n} ${n === 1 ? "ha pagado" : "han pagado"}`,
  diaAbierto: "Día en curso: los datos pueden variar.",

  // ── Saldo ─────────────────────────────────────────────────────────────────
  soloConsolidado:
    "Solo puedes retirar lo que ya está confirmado. Los últimos días todavía los estamos revisando.",
  revisionManual: "Las revisiones son manuales. Tardamos de 1 a 3 días.",
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
  pedirImporte: (importe: string) => `Retirar ${importe}`,
  /*
   * Fusionada con `solicitarRetiro`: eran la misma cadena en español y solo
   * divergían en inglés, con lo que dos botones del mismo flujo se llamaban
   * distinto según el idioma. Se retira en cuanto `cartera/page.tsx:369` pase
   * a `solicitarRetiro`; mientras tanto se queda con el literal fusionado para
   * que ningún idioma enseñe las dos redacciones a la vez.
   */
  solicitudesAnteriores: "Cobros anteriores",

  // ── Errores: qué pasó · por qué · qué hago ahora ──────────────────────────
  sesionCaducada: "Se te ha caducado la sesión.",
  sesionCaducadaApoyo: "Vuelve a entrar con tu correo. No pierdes nada de lo tuyo.",
  algoHaFallado: "No hemos podido completar la acción.",
  algoHaFalladoApoyo: "No hemos cambiado nada. Vuelve a intentarlo.",
  comoCobras: "Cobras 0,03 $ por cada usuario que registre, sea cual sea su país.",

  /*
   * Errores de la API, uno por caso.
   *
   * Antes las rutas devolvían un puñado de mensajes genéricos y el agente se
   * quedaba sin saber si le habíamos cobrado, activado o no hecho nada. Cada
   * clave lleva su `Apoyo`, y el apoyo dice siempre qué ha quedado tocado:
   * «No hemos activado nada», «No te hemos descontado nada». Es la regla 5.
   */
  errSinTelegram: "Telegram no ha verificado tu acceso.",
  errSinTelegramApoyo: "Abre la aplicación desde el bot.",
  errSuspendido: "Tienes la cuenta suspendida.",
  errSuspendidoApoyo: "Escribe al Operador para recuperar el acceso.",

  errFormatoCodigoCorreo: "El código o el correo no tienen el formato correcto.",
  errFormatoCodigoCorreoApoyo: "Revísalos y vuelve a intentarlo.",
  errCodigoNoVale: "Ese código de activación no vale o ha caducado.",
  errCodigoUsado: "Ese código de activación ya se ha usado.",
  errCodigoUsadoApoyo: "Pídele otro al Operador.",
  errCodigoOtroCorreo: "Ese código se emitió para otro correo.",
  errCodigoOtroCorreoApoyo: "Solo vale con el correo para el que se ha emitido.",
  errTelegramYaVinculado: (correo: string) =>
    `Esta cuenta de Telegram ya está vinculada a ${correo}.`,
  errTelegramYaVinculadoApoyo: "Escribe ese correo aquí y entras sin código.",
  errDemasiadosEnvios: "Has pedido demasiados códigos seguidos.",
  errDemasiadosEnviosApoyo: "Espera unos minutos y vuelve a intentarlo.",
  errEsperaParaOtroCodigo: (segundos: number) =>
    `Podrás pedir otro código en ${segundos} segundos.`,
  errCorreoNoEnviado: "No hemos podido enviarte el correo.",
  errCorreoNoEnviadoApoyo: "Comprueba la dirección y vuelve a intentarlo en un minuto.",
  errDatosNoValidos: "Los datos no son válidos.",
  errDatosNoValidosApoyo: "El código de verificación tiene 6 dígitos.",
  errOtpCaducado: "Se te ha caducado el código de verificación.",
  errOtpCaducadoApoyo: "Los códigos caducan a los 10 minutos. Pide otro.",
  errOtpSinIntentos: "Has agotado los intentos.",
  errOtpSinIntentosApoyo: "Ese código queda anulado. Pide otro.",
  errOtpIncorrecto: (restantes: number) =>
    `El código de verificación no es correcto. Te ${
      restantes === 1 ? "queda" : "quedan"
    } ${restantes} ${restantes === 1 ? "intento" : "intentos"}.`,
  errOtpOtraCuenta: "Ese código se ha pedido desde otra cuenta de Telegram.",
  errOtpOtraCuentaApoyo: "Solo vale en la cuenta que lo pidió.",
  errCorreoYaVinculado: "Ese correo ya está vinculado a otra cuenta de Telegram.",
  errCorreoYaVinculadoApoyo: "Escribe al Operador si necesitas cambiarla.",
  errNoVinculado: "No hemos podido vincular tu cuenta.",
  errNoVinculadoApoyo: "Tu código de activación sigue sin usar. Vuelve a intentarlo.",
  errFormatoCorreo: "Ese correo no tiene el formato correcto.",
  errFormatoCorreoApoyo: "Escribe el correo con el que se registró en Sophon.",

  errYaEnTuEquipo: "Ya tienes a ese webmaster en tu equipo.",
  errYaEnTuEquipoApoyo: "Ábrelo desde «Mi equipo».",
  errDeOtroAgente: "Ese webmaster ya es de otro agente.",
  errDeOtroAgenteApoyo:
    "Cada webmaster tiene un solo agente. Si crees que es un error, escribe al Operador.",
  errYaEnSophon: "Esa cuenta ya estaba en Sophon.",
  errYaEnSophonApoyo:
    "Solo puedes dar de alta cuentas nuevas que registres tú. Las que ya existían son del Operador.",
  errNoExisteEnSophon: "Ese correo no existe en Sophon.",
  errNoExisteEnSophonApoyo: "Tiene que registrarse en Sophon antes de que puedas activarlo.",
  errSinWhitelist: "La cuenta no está autorizada en Sophon.",
  errSinWhitelistApoyo: "La autorización se tramita a mano con soporte. No hemos activado nada.",
  errSophonNoResponde: "Sophon no responde.",
  errSophonNoRespondeApoyo: "No hemos activado nada. Vuelve a intentarlo en un minuto.",
  errSophonRechaza: "Sophon ha rechazado la activación.",
  errSophonRechazaApoyo: "No hemos activado nada. El Operador ya está avisado.",
  errAltaNoRegistrada: "No hemos podido registrar el alta.",
  errAltaNoRegistradaApoyo: "No hemos cambiado nada. Vuelve a intentarlo.",
  errSinClasificar: "No hemos podido completar el alta.",
  errSinClasificarApoyo: "No hemos activado nada. Ya estamos avisados.",

  errNoEsTuyo: "Ese webmaster no está en tu equipo.",
  errNoEsTuyoApoyo: "Solo puedes renovar el PRO de los que has activado tú.",
  /** El 404 de abrir una ficha ajena: ahí el agente no ha pedido renovar nada. */
  errNoEsTuyoAbrirApoyo:
    "Comprueba el correo. Si todavía no lo has dado de alta, hazlo desde «Activar webmaster».",
  errProSigueActivo: "Todavía le queda PRO.",
  errProSigueActivoApoyo: "Podrás renovarlo cuando le caduque.",
  errProNoRegistrado: "No hemos podido registrar el PRO.",
  errProNoRegistradoApoyo: "No hemos cambiado nada. Vuelve a intentarlo desde su ficha.",
  errProSinWhitelist: "La cuenta no está autorizada en Sophon.",
  errProSinWhitelistApoyo: "La autorización se tramita a mano con soporte.",
  errProRechazado: "Sophon no le ha dado el PRO.",
  errProRechazadoApoyo: "Vuelve a intentarlo desde su ficha en un minuto.",

  errRetiroFormato: "El importe o el monedero no tienen el formato correcto.",
  errRetiroFormatoApoyo: "Revísalos y vuelve a intentarlo.",
  errRetiroMinimo: (minimo: string) => `El importe queda por debajo del mínimo de ${minimo}.`,
  errRetiroMinimoApoyo: (importe: string) => `Has pedido ${importe}.`,
  errRetiroSaldo: (disponible: string) =>
    `El importe supera tu saldo disponible de ${disponible}.`,
  errRetiroSaldoApoyo:
    "Lo ganado en los últimos días no lo puedes retirar hasta que se confirme.",
  errRetiroYaHayUna: (importe: string) => `Ya tienes una solicitud pendiente de ${importe}.`,
  errRetiroYaHayUnaApoyo:
    "Solo puedes tener una a la vez. Las revisiones son manuales; puedes cancelar la que tienes.",
  errRetiroNoRegistrado: "No hemos podido registrar tu solicitud.",
  errRetiroNoRegistradoApoyo: "No te hemos descontado nada. Vuelve a intentarlo.",

  // ── El bot ────────────────────────────────────────────────────────────────
  //
  // El bot habla el idioma del agente igual que la Mini App. Los dos son la
  // misma aplicación vista desde sitios distintos, y un menú en español delante
  // de una pantalla en árabe delata que la traducción se hizo por encima.
  //
  // Los comandos de gestión —/codigo, /agentes, /retiros, /panel— NO están
  // aquí: los usa una sola persona y traducirlos sería trabajo sin destino.
  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "Para entrar necesitas un código de activación. Te lo da el Operador.",
  botCuandoLoTengas: "Cuando lo tengas, vincula tu cuenta aquí.",
  botHola: (nombre: string) => `Hola, ${nombre}. Elige por dónde empiezas.`,
  botVincularCuenta: "Vincular mi cuenta",
  botSuspendido: "Tienes la cuenta suspendida. Escribe al Operador para reactivarla.",
  botSinPublicar: "La aplicación no está publicada todavía. Avisa al Operador.",
  botCadaComando: "Cada comando abre una pantalla:",
  botOStart: "O /start para el menú completo.",
  botComandoDesconocido: "No conozco ese comando. Prueba /ayuda.",
  botUsaStart: "Usa /start para abrir la aplicación.",
  /* ── El atajo del alta ──────────────────────────────────────────────────
   *
   * `/activar` es el nombre del comando y NO se traduce: es la ruta de la Mini
   * App, y un `/attiva` italiano obligaría al bot a conocer cinco alfabetos
   * para hacer lo mismo. Lo que sí se traduce es la explicación, que es lo que
   * el agente necesita leer en el suyo.
   */
  botActivarAtajo: "/activar correo@ejemplo.com — dar de alta sin abrir la aplicación",
  botActivarComoSeUsa: "Escribe el correo detrás del comando: /activar correo@ejemplo.com",
  botSinCuenta: "Todavía no tienes cuenta de agente. Escribe /start para darte de alta.",
  botActivado: (email: string) => `${email} ya está en tu equipo, con un año de PRO.`,
  // El alta está hecha aunque el año no haya entrado, y se dicen las dos cosas:
  // fingir que todo fue bien deja al agente sin saber que tiene algo que hacer.
  botActivadoSinPro: (email: string) => `${email} ya está en tu equipo.`,
  botActivadoSinProApoyo: "El año de PRO no ha entrado. Reinténtalo desde su perfil.",

  // Avisos que salen del panel hacia el agente.
  botRetiroPagado: (importe: string) => `Has cobrado ${importe}.`,
  // ── Aviso diario: el equipo se está apagando ──────────────────────────────
  botRedTitulo: "Tu equipo necesita una llamada",
  botRedParados: (n: number, total: number) =>
    `${n} de tus ${total} webmasters llevan tiempo sin traer un registro:`,
  botRedDiasParado: (dias: number) => `${dias} ${dias === 1 ? "día" : "días"} sin actividad`,
  // La consecuencia va en la cadena, no en la cabeza de quien lea. «Con
  // problemas» a secas se puede leer como una molestia menor; lo que hace que
  // el agente coja el teléfono es saber que ese webmaster no produce.
  botRedIncidencias: (n: number) =>
    `${n} ${n === 1 ? "webmaster" : "webmasters"} con problemas en Sophon; no ${
      n === 1 ? "puede" : "pueden"
    } generar registros:`,
  botRedYOtros: (n: number) => `…y ${n} más.`,
  botRedComoVerlo: "Ábrelos desde «Mi equipo» para ver con qué enlaces consiguen registros.",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `Referencia: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `Hemos aprobado tu retiro de ${importe}. El pago sale en breve.`,
  botRetiroRechazado: (importe: string) =>
    `Hemos rechazado tu retiro de ${importe}. Vuelves a tener el saldo disponible.`,
  botMotivo: (motivo: string) => `Motivo: ${motivo}`,

  // ── El correo del código de acceso ────────────────────────────────────────
  //
  // Estaba escrito a mano en `lib/correo.ts`, en español y solo en español, así
  // que un agente italiano recibía la aplicación traducida y, en el ÚNICO punto
  // del que depende poder entrar, un correo que no lee. El idioma se sabía: sale
  // del `language_code` que Telegram firma y la ruta ya lo resolvía para sus
  // propios errores.
  correoOtpAsunto: (codigo: string) => `${codigo} es tu código de acceso`,
  correoOtpTuCodigo: "Tu código de verificación:",
  correoOtpCaduca: (minutos: number) =>
    `Caduca en ${minutos} minutos y solo sirve una vez.`,
  correoOtpNoPedido:
    "Si no has pedido entrar en Sophon Promoters, ignora este correo: sin el código nadie puede acceder a tu cuenta.",
  /* El correo no puede llevar un boton que copie: no ejecuta JavaScript.
     Lo mas rapido que si existe es mantener pulsado el bloque del codigo, que
     va con `user-select: all` para que la seleccion salga entera al primer
     intento en vez de por caracteres. Esto lo dice. */
  correoOtpTocaParaCopiar: "Mantén pulsado el código para copiarlo.",
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
  red: "My team",
  historico: "History",
  cartera: "Balance",
  webmaster: "Webmaster",
  devengado: "Earned",
  disponible: "Available",
  solicitado: "Requested",
  pagado: "Paid",
  volver: "Back",
  cargando: "Loading",
  sondeando: "Loading data",

  activarWebmaster: "Activate webmaster",
  solicitarRetiro: "Withdraw",
  acceder: "Sign in",
  reintentar: "Try again",
  activar: "Activate",
  entrar: "Sign in",
  activarOtro: "Activate another",
  verMiRed: "View my team",
  verSuFicha: "View their details",
  volverAlInicio: "Back to home",
  precios: "Prices",
  preciosDelPrograma: "Programme prices",
  preciosParaEnsenar: "Show it to your webmasters: this is what they will be paid.",
  loQueCobraTuWebmaster: "What your webmaster is paid",
  porCadaCienUsuarios: "Per 100 registered users",
  paisesDelTier: (n: number) => `${n} ${n === 1 ? "country" : "countries"}`,
  nivelDeLaCuenta: "Account level",
  losNiveles: "The levels",
  nivelHaceFalta: (importe: string) => `from ${importe}`,
  nivel: "Level",
  acumuladoEsteMes: "Paid by users this month",
  teFaltanParaElNivel: (importe: string, nivel: number) => `${importe} to go for LV${nivel}.`,
  nivelMasAlto: "You are on the highest level.",
  nivelGanadoEntraElDiaUno: (nivel: number) => `LV${nivel} is yours: it starts on the 1st.`,
  comoSubeElNivel:
    "The level goes up with what the users you bring in pay for their PRO, not with the reward you earn. Once the month reaches the next level's minimum, the new price starts on the 1st of the month after.",
  tuComisionNoDependeDelNivel:
    "Your commission does not change with the level: you are paid the same on all of them.",
  sinPrecios: "There are no prices to show yet.",
  sinPreciosApoyo: "Sophon has not returned the table. Try again in a moment.",
  activarElPrimero: "Activate your first one",

  sinWebmasters: "You have not activated any webmaster yet.",
  sinWebmastersApoyo: "Activate them with their Sophon email.",
  sinIngresos: "Your team has not brought any signups yet.",
  sinIngresosApoyo: "They will show up here as soon as someone signs up through their links.",
  sinMovimientos: "You have not requested any payout yet.",

  bienvenida: "Welcome to Sophon Promoters",
  bienvenidaApoyo:
    "Your team, your signups and your balance, all in one place. Sign in with your email to see it.",

  entrarEnTuCuenta: "Sign in",
  introduceTuCorreo: "Enter your email. If you already have an account, we send you the verification code.",
  codigoDeActivacion: "Activation code",
  teLoDaElOperador: "Provided by the Operator.",
  tuCorreo: "Your email",
  seraTuIdentificador: "It is your identifier on Sophon.",
  correoSinCuenta: "That email does not have an account yet.",
  correoSinCuentaApoyo: "Add the activation code to sign up.",
  enviarmeElCodigo: "Send code",
  confirmaQueEresTu: "Verify email",
  otpEnviado: (email: string) =>
    `Code sent to ${email}. It expires in 10 minutes.`,
  codigoDeVerificacion: "Verification code",
  cambiarElCorreo: "Change email",
  reenviarEn: (segundos: number) => `Resend in ${segundos}s`,
  reenviarElCodigo: "Resend code",
  pegarCodigo: "Paste",
  codigoProgreso: (puestos: number, total: number) => `${puestos} of ${total}`,
  codigoCompleto: "Code complete",

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
  bonoMaximoAlcanzado: "You have reached the highest level of the month.",
  bonoGanado: (importe: string) => `You have earned ${importe}`,
  escaleraDelBono: "Bonus levels",
  bonoExtraSi: (umbral: number) =>
    `extra if you reach ${umbral.toLocaleString("en-US")} ${
      umbral === 1 ? "signup" : "signups"
    } this month`,
  bonoMasSiLlegas: (importe: string, umbral: number) =>
    `${importe} more if you reach ${umbral.toLocaleString("en-US")} ${
      umbral === 1 ? "signup" : "signups"
    }`,
  bonoYaEsTuyo: "already yours",
  bonoEsteMesLlevas: (registros: number, faltan: number) =>
    `${registros.toLocaleString("en-US")} this month · ${faltan.toLocaleString("en-US")} to go`,
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
  yaEstaEnTuRed: (email: string) => `${email} is already on your team.`,
  cobrarasDesdeHoy: "You will earn on signups after activation. Earlier ones do not count.",

  conIncidencia: (n: number) => `${n} with ${n === 1 ? "a problem" : "problems"}`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} with no activity in the last ${dias} ${dias === 1 ? "day" : "days"}, out of ${total}`,
  todosProduciendo: (n: number) => `All ${n} are active`,
  escalaComun: (dias: number) =>
    `Each column is ${dias} ${dias === 1 ? "day" : "days"}. All the bars use the same scale, so you can compare them.`,

  bloqueado: "Blocked",
  seVaABorrar: "About to be deleted",
  desaparecido: "No longer there",
  proCaducado: "Their PRO has expired",
  sinActividad: "No activity",
  diasParado: (dias: number) => `${dias} ${dias === 1 ? "day" : "days"} inactive`,
  activoEnSophon: "Active on Sophon",
  bloqueadoEnSophon: "Blocked on Sophon",
  pendienteDeBorrado: "About to be deleted",
  yaNoApareceEnSophon: "No longer on Sophon",
  estadoSinComprobar: "Status not checked",
  pendienteDeConfirmar: "Confirming",
  pendienteDeConfirmarApoyo: "Sophon has not published it yet. It usually sorts itself out.",

  enTuRedDesde: (fecha: string) => `on your team since ${fecha}`,
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
  conQueCapta: "These are the links they get signups with. Live data from Sophon.",
  sinEnlaces: "They have not published any link yet.",
  enlacesNoDisponibles: "We cannot reach their links right now. Try again later.",
  enlaceCopiado: "Link copied",
  dolares: (importe: string) => `${importe} dollars`,
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
  proNoConcedido: "You have the webmaster on your team, but we could not give them PRO.",
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
  dePago: (n: number) => `${n} ${n === 1 ? "has paid" : "have paid"}`,
  diaAbierto: "Day in progress: data may change.",

  soloConsolidado:
    "You can only withdraw what is already confirmed. We are still reviewing the last few days.",
  revisionManual: "Reviews are manual. We take 1 to 3 days.",
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
  pedirImporte: (importe: string) => `Withdraw ${importe}`,
  solicitudesAnteriores: "Earlier payouts",

  sesionCaducada: "Your session has expired.",
  sesionCaducadaApoyo: "Sign in again with your email. You lose nothing of yours.",
  algoHaFallado: "We could not complete the action.",
  algoHaFalladoApoyo: "We have not changed anything. Try again.",
  comoCobras: "You earn $0.03 for every user they sign up, whatever their country.",

  errSinTelegram: "Telegram has not verified your access.",
  errSinTelegramApoyo: "Open the app from the bot.",
  errSuspendido: "Your account is suspended.",
  errSuspendidoApoyo: "Write to the Operator to get your access back.",

  errFormatoCodigoCorreo: "The code or the email is not in the right format.",
  errFormatoCodigoCorreoApoyo: "Check them and try again.",
  errCodigoNoVale: "That activation code is not valid or has expired.",
  errCodigoUsado: "That activation code has already been used.",
  errCodigoUsadoApoyo: "Ask the Operator for another one.",
  errCodigoOtroCorreo: "That code was issued for a different email.",
  errCodigoOtroCorreoApoyo: "It only works with the email it was issued for.",
  errTelegramYaVinculado: (correo: string) =>
    `This Telegram account is already linked to ${correo}.`,
  errTelegramYaVinculadoApoyo: "Enter that email here and you get in with no code.",
  errDemasiadosEnvios: "You have requested too many codes in a row.",
  errDemasiadosEnviosApoyo: "Wait a few minutes and try again.",
  errEsperaParaOtroCodigo: (segundos: number) =>
    `You can ask for another code in ${segundos} seconds.`,
  errCorreoNoEnviado: "We could not send you the email.",
  errCorreoNoEnviadoApoyo: "Check the address and try again in a minute.",
  errDatosNoValidos: "The details are not valid.",
  errDatosNoValidosApoyo: "The verification code is 6 digits long.",
  errOtpCaducado: "Your verification code has expired.",
  errOtpCaducadoApoyo: "Codes expire after 10 minutes. Ask for another one.",
  errOtpSinIntentos: "You have run out of attempts.",
  errOtpSinIntentosApoyo: "That code is now void. Ask for another one.",
  errOtpIncorrecto: (restantes: number) =>
    `The verification code is not correct. You have ${restantes} ${
      restantes === 1 ? "attempt" : "attempts"
    } left.`,
  errOtpOtraCuenta: "That code was requested from a different Telegram account.",
  errOtpOtraCuentaApoyo: "It only works on the account that requested it.",
  errCorreoYaVinculado: "That email is already linked to a different Telegram account.",
  errCorreoYaVinculadoApoyo: "Write to the Operator if you need to change it.",
  errNoVinculado: "We could not link your account.",
  errNoVinculadoApoyo: "Your activation code is still unused. Try again.",
  errFormatoCorreo: "That email is not in the right format.",
  errFormatoCorreoApoyo: "Type the email it was registered with on Sophon.",

  errYaEnTuEquipo: "You already have that webmaster on your team.",
  errYaEnTuEquipoApoyo: "Open them from “My team”.",
  errDeOtroAgente: "That webmaster already belongs to another agent.",
  errDeOtroAgenteApoyo:
    "Each webmaster has a single agent. If you think this is a mistake, write to the Operator.",
  errYaEnSophon: "That account was already on Sophon.",
  errYaEnSophonApoyo:
    "You can only sign up new accounts that you register yourself. The ones that already existed are the Operator's.",
  errNoExisteEnSophon: "That email does not exist on Sophon.",
  errNoExisteEnSophonApoyo: "They have to register on Sophon before you can activate them.",
  errSinWhitelist: "The account is not authorized on Sophon.",
  errSinWhitelistApoyo:
    "Authorization is handled by hand with support. We have not activated anything.",
  errSophonNoResponde: "Sophon is not responding.",
  errSophonNoRespondeApoyo: "We have not activated anything. Try again in a minute.",
  errSophonRechaza: "Sophon has rejected the activation.",
  errSophonRechazaApoyo:
    "We have not activated anything. The Operator has already been notified.",
  errAltaNoRegistrada: "We could not register the activation.",
  errAltaNoRegistradaApoyo: "We have not changed anything. Try again.",
  errSinClasificar: "We could not complete the activation.",
  errSinClasificarApoyo: "We have not activated anything. We have already been notified.",

  errNoEsTuyo: "That webmaster is not on your team.",
  errNoEsTuyoApoyo: "You can only renew PRO for the ones you activated yourself.",
  errNoEsTuyoAbrirApoyo:
    "Check the email. If you have not activated them yet, do it from «Activate webmaster».",
  errProSigueActivo: "They still have PRO left.",
  errProSigueActivoApoyo: "You will be able to renew it when it expires.",
  errProNoRegistrado: "We could not register the PRO.",
  errProNoRegistradoApoyo: "We have not changed anything. Try again from their details.",
  errProSinWhitelist: "The account is not authorized on Sophon.",
  errProSinWhitelistApoyo: "Authorization is handled by hand with support.",
  errProRechazado: "Sophon has not given them PRO.",
  errProRechazadoApoyo: "Try again from their details in a minute.",

  errRetiroFormato: "The amount or the wallet is not in the right format.",
  errRetiroFormatoApoyo: "Check them and try again.",
  errRetiroMinimo: (minimo: string) => `The amount is below the ${minimo} minimum.`,
  errRetiroMinimoApoyo: (importe: string) => `You asked for ${importe}.`,
  errRetiroSaldo: (disponible: string) =>
    `The amount is over your available balance of ${disponible}.`,
  errRetiroSaldoApoyo:
    "What you earned in the last few days cannot be withdrawn until it is confirmed.",
  errRetiroYaHayUna: (importe: string) => `You already have a pending request for ${importe}.`,
  errRetiroYaHayUnaApoyo:
    "You can only have one at a time. Reviews are manual; you can cancel the one you have.",
  errRetiroNoRegistrado: "We could not register your request.",
  errRetiroNoRegistradoApoyo: "We have not deducted anything. Try again.",

  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "You need an activation code to come in. The Operator gives it to you.",
  botCuandoLoTengas: "Once you have it, link your account here.",
  botHola: (nombre: string) => `Hello, ${nombre}. Pick where you start.`,
  botVincularCuenta: "Link my account",
  botSuspendido: "Your account is suspended. Write to the Operator to reactivate it.",
  botSinPublicar: "The app is not published yet. Let the Operator know.",
  botCadaComando: "Each command opens a screen:",
  botOStart: "Or /start for the full menu.",
  botComandoDesconocido: "I do not know that command. Try /ayuda.",
  botUsaStart: "Use /start to open the app.",
  botActivarAtajo: "/activar email@example.com — sign someone up without opening the app",
  botActivarComoSeUsa: "Type the email after the command: /activar email@example.com",
  botSinCuenta: "You do not have an agent account yet. Type /start to sign up.",
  botActivado: (email: string) => `${email} is now on your team, with a year of PRO.`,
  botActivadoSinPro: (email: string) => `${email} is now on your team.`,
  botActivadoSinProApoyo: "The year of PRO did not go through. Retry it from their profile.",

  botRetiroPagado: (importe: string) => `You have been paid ${importe}.`,
  botRedTitulo: "Your team needs a call",
  botRedParados: (n: number, total: number) =>
    `${n} of your ${total} webmasters have gone a while without a signup:`,
  botRedDiasParado: (dias: number) => `${dias} ${dias === 1 ? "day" : "days"} inactive`,
  botRedIncidencias: (n: number) =>
    `${n} ${n === 1 ? "webmaster" : "webmasters"} with problems on Sophon; cannot generate signups:`,
  botRedYOtros: (n: number) => `…and ${n} more.`,
  botRedComoVerlo: "Open them from “My team” to see which links they get signups with.",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `Reference: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `We have approved your ${importe} payout. The payment goes out shortly.`,
  botRetiroRechazado: (importe: string) =>
    `We have rejected your ${importe} payout. You have the balance available again.`,
  botMotivo: (motivo: string) => `Reason: ${motivo}`,

  // ── El correo del código de acceso ────────────────────────────────────────
  correoOtpAsunto: (codigo: string) => `${codigo} is your access code`,
  correoOtpTuCodigo: "Your verification code:",
  correoOtpCaduca: (minutos: number) =>
    `It expires in ${minutos} minutes and works only once.`,
  correoOtpNoPedido:
    "If you did not ask to sign in to Sophon Promoters, ignore this email: without the code nobody can get into your account.",
  correoOtpTocaParaCopiar: "Press and hold the code to copy it.",
};

const it: Cadenas = {
  inicio: "Inizio",
  red: "Il mio team",
  historico: "Cronologia",
  cartera: "Saldo",
  webmaster: "Webmaster",
  devengado: "Guadagnato",
  disponible: "Disponibile",
  solicitado: "Richiesto",
  pagado: "Pagato",
  volver: "Indietro",
  cargando: "Caricamento",
  sondeando: "Caricamento dati",

  activarWebmaster: "Attiva webmaster",
  solicitarRetiro: "Preleva",
  acceder: "Accedi",
  reintentar: "Riprova",
  activar: "Attiva",
  entrar: "Entra",
  activarOtro: "Attivane un altro",
  verMiRed: "Vedi il mio team",
  verSuFicha: "Vedi il suo profilo",
  volverAlInicio: "Torna all'inizio",
  precios: "Prezzi",
  preciosDelPrograma: "Prezzi del programma",
  preciosParaEnsenar: "Mostralo ai tuoi webmaster: è quello che prenderanno loro.",
  loQueCobraTuWebmaster: "Quanto prende il tuo webmaster",
  porCadaCienUsuarios: "Ogni 100 utenti registrati",
  paisesDelTier: (n: number) => `${n} ${n === 1 ? "paese" : "paesi"}`,
  nivelDeLaCuenta: "Livello dell\'account",
  losNiveles: "I livelli",
  nivelHaceFalta: (importe: string) => `da ${importe}`,
  nivel: "Livello",
  acumuladoEsteMes: "Pagato dagli utenti questo mese",
  teFaltanParaElNivel: (importe: string, nivel: number) => `Ti mancano ${importe} per LV${nivel}.`,
  nivelMasAlto: "Sei al livello più alto.",
  nivelGanadoEntraElDiaUno: (nivel: number) => `Hai già LV${nivel}: entra il 1\u00ba.`,
  comoSubeElNivel:
    "Il livello sale con quello che pagano gli utenti portati per il loro PRO, non con la ricompensa che si guadagna. Quando il mese arriva al minimo del livello successivo, il prezzo nuovo entra il 1\u00ba del mese dopo.",
  tuComisionNoDependeDelNivel:
    "La tua commissione non cambia con il livello: prendi lo stesso in tutti.",
  sinPrecios: "Non ci sono ancora prezzi da mostrare.",
  sinPreciosApoyo: "Sophon non ha restituito la tabella. Riprova tra un momento.",
  activarElPrimero: "Attiva il primo",

  sinWebmasters: "Non hai ancora attivato nessun webmaster.",
  sinWebmastersApoyo: "Attivalo con la sua email di Sophon.",
  sinIngresos: "Il tuo team non ha ancora portato iscrizioni.",
  sinIngresosApoyo: "Compariranno qui appena qualcuno si iscrive dai suoi link.",
  sinMovimientos: "Non hai ancora richiesto nessun prelievo.",

  bienvenida: "Ti diamo il benvenuto in Sophon Promoters",
  bienvenidaApoyo:
    "Il tuo team, le tue iscrizioni e il tuo saldo in un unico posto. Entra con la tua email per vederli.",

  entrarEnTuCuenta: "Entra",
  introduceTuCorreo: "Scrivi la tua email. Se hai già un account, ti mandiamo il codice di verifica.",
  codigoDeActivacion: "Codice di attivazione",
  teLoDaElOperador: "Te lo dà l'Operatore.",
  tuCorreo: "La tua email",
  seraTuIdentificador: "È il tuo identificativo su Sophon.",
  correoSinCuenta: "Quell'email non ha ancora un account.",
  correoSinCuentaApoyo: "Aggiungi il codice di attivazione per registrarti.",
  enviarmeElCodigo: "Invia codice",
  confirmaQueEresTu: "Verifica email",
  otpEnviado: (email: string) =>
    `Codice inviato a ${email}. Scade tra 10 minuti.`,
  codigoDeVerificacion: "Codice di verifica",
  cambiarElCorreo: "Cambia email",
  reenviarEn: (segundos: number) => `Rinvia tra ${segundos} s`,
  reenviarElCodigo: "Rinvia codice",
  pegarCodigo: "Incolla",
  codigoProgreso: (puestos: number, total: number) => `${puestos} di ${total}`,
  codigoCompleto: "Codice completo",

  devengadoTreintaDias: "Guadagnato · 30 giorni",
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
  bonoMaximoAlcanzado: "Hai raggiunto il livello più alto del mese.",
  bonoGanado: (importe: string) => `Hai guadagnato ${importe}`,
  escaleraDelBono: "Livelli del bonus",
  bonoExtraSi: (umbral: number) =>
    `in più se arrivi a ${umbral.toLocaleString("it-IT")} ${
      umbral === 1 ? "iscrizione" : "iscrizioni"
    } questo mese`,
  bonoMasSiLlegas: (importe: string, umbral: number) =>
    `${importe} in più se arrivi a ${umbral.toLocaleString("it-IT")} ${
      umbral === 1 ? "iscrizione" : "iscrizioni"
    }`,
  bonoYaEsTuyo: "è già tuo",
  bonoEsteMesLlevas: (registros: number, faltan: number) =>
    `${registros.toLocaleString("it-IT")} questo mese · ti ${
      faltan === 1 ? "manca" : "mancano"
    } ${faltan.toLocaleString("it-IT")}`,
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
  yaEstaEnTuRed: (email: string) => `${email} è già nel tuo team.`,
  cobrarasDesdeHoy: "Guadagnerai sulle iscrizioni successive all'attivazione. Le precedenti non contano.",

  conIncidencia: (n: number) => `${n} con ${n === 1 ? "un problema" : "problemi"}`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} senza attività negli ultimi ${dias} ${dias === 1 ? "giorno" : "giorni"}, su ${total}`,
  todosProduciendo: (n: number) => `Tutti e ${n} sono attivi`,
  escalaComun: (dias: number) =>
    `Ogni colonna, ${dias} ${dias === 1 ? "giorno" : "giorni"}. Tutte le barre sono sulla stessa scala, così puoi confrontarle.`,

  bloqueado: "Bloccato",
  seVaABorrar: "Sta per essere cancellato",
  desaparecido: "Non c'è più",
  proCaducado: "Gli è scaduto il PRO",
  sinActividad: "Nessuna attività",
  diasParado: (dias: number) => `${dias} ${dias === 1 ? "giorno" : "giorni"} senza attività`,
  activoEnSophon: "Attivo su Sophon",
  bloqueadoEnSophon: "Bloccato su Sophon",
  pendienteDeBorrado: "Sta per essere cancellato",
  yaNoApareceEnSophon: "Non c'è più su Sophon",
  estadoSinComprobar: "Stato non verificato",
  pendienteDeConfirmar: "In conferma",
  pendienteDeConfirmarApoyo: "Sophon non lo ha ancora pubblicato. Di solito si risolve da solo.",

  enTuRedDesde: (fecha: string) => `nel tuo team dal ${fecha}`,
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
  conQueCapta: "Con questi link ottiene iscrizioni. Dati in tempo reale da Sophon.",
  sinEnlaces: "Non ha ancora pubblicato nessun link.",
  enlacesNoDisponibles: "Ora non riusciamo a leggere i suoi link. Riprova più tardi.",
  enlaceCopiado: "Link copiato",
  dolares: (importe: string) => `${importe} dollari`,
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
  proNoConcedido: "Hai già il webmaster nel tuo team, ma non siamo riusciti a dargli il PRO.",
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
  dePago: (n: number) => `${n} ${n === 1 ? "ha pagato" : "hanno pagato"}`,
  diaAbierto: "Giorno in corso: i dati possono variare.",

  soloConsolidado:
    "Puoi prelevare solo quello che è già confermato. Gli ultimi giorni li stiamo ancora controllando.",
  revisionManual: "Le revisioni sono manuali. Ci mettiamo da 1 a 3 giorni.",
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
  pedirImporte: (importe: string) => `Preleva ${importe}`,
  solicitudesAnteriores: "Prelievi precedenti",

  sesionCaducada: "La tua sessione è scaduta.",
  sesionCaducadaApoyo: "Rientra con la tua email. Non perdi nulla di tuo.",
  algoHaFallado: "Non siamo riusciti a completare l'azione.",
  algoHaFalladoApoyo: "Non abbiamo cambiato nulla. Riprova.",
  comoCobras: "Guadagni 0,03 $ per ogni utente che registra, qualunque sia il suo paese.",

  errSinTelegram: "Telegram non ha verificato il tuo accesso.",
  errSinTelegramApoyo: "Apri l'applicazione dal bot.",
  errSuspendido: "Hai l'account sospeso.",
  errSuspendidoApoyo: "Scrivi all'Operatore per recuperare l'accesso.",

  errFormatoCodigoCorreo: "Il codice o l'email non hanno il formato corretto.",
  errFormatoCodigoCorreoApoyo: "Controllali e riprova.",
  errCodigoNoVale: "Quel codice di attivazione non è valido o è scaduto.",
  errCodigoUsado: "Quel codice di attivazione è già stato usato.",
  errCodigoUsadoApoyo: "Chiedine un altro all'Operatore.",
  errCodigoOtroCorreo: "Quel codice è stato emesso per un'altra email.",
  errCodigoOtroCorreoApoyo: "Vale solo con l'email per cui è stato emesso.",
  errTelegramYaVinculado: (correo: string) =>
    `Questo account Telegram è già collegato a ${correo}.`,
  errTelegramYaVinculadoApoyo: "Scrivi quell'email qui ed entri senza codice.",
  errDemasiadosEnvios: "Hai chiesto troppi codici di seguito.",
  errDemasiadosEnviosApoyo: "Aspetta qualche minuto e riprova.",
  errEsperaParaOtroCodigo: (segundos: number) =>
    `Potrai chiedere un altro codice tra ${segundos} secondi.`,
  errCorreoNoEnviado: "Non siamo riusciti a inviarti l'email.",
  errCorreoNoEnviadoApoyo: "Controlla l'indirizzo e riprova tra un minuto.",
  errDatosNoValidos: "I dati non sono validi.",
  errDatosNoValidosApoyo: "Il codice di verifica ha 6 cifre.",
  errOtpCaducado: "Ti è scaduto il codice di verifica.",
  errOtpCaducadoApoyo: "I codici scadono dopo 10 minuti. Chiedine un altro.",
  errOtpSinIntentos: "Hai esaurito i tentativi.",
  errOtpSinIntentosApoyo: "Quel codice è annullato. Chiedine un altro.",
  errOtpIncorrecto: (restantes: number) =>
    `Il codice di verifica non è corretto. Ti ${
      restantes === 1 ? "resta" : "restano"
    } ${restantes} ${restantes === 1 ? "tentativo" : "tentativi"}.`,
  errOtpOtraCuenta: "Quel codice è stato richiesto da un altro account Telegram.",
  errOtpOtraCuentaApoyo: "Vale solo sull'account che l'ha richiesto.",
  errCorreoYaVinculado: "Quell'email è già collegata a un altro account Telegram.",
  errCorreoYaVinculadoApoyo: "Scrivi all'Operatore se devi cambiarla.",
  errNoVinculado: "Non siamo riusciti a collegare il tuo account.",
  errNoVinculadoApoyo: "Il tuo codice di attivazione resta non usato. Riprova.",
  errFormatoCorreo: "Quell'email non ha il formato corretto.",
  errFormatoCorreoApoyo: "Scrivi l'email con cui si è registrato su Sophon.",

  errYaEnTuEquipo: "Hai già quel webmaster nel tuo team.",
  errYaEnTuEquipoApoyo: "Aprilo da «Il mio team».",
  errDeOtroAgente: "Quel webmaster è già di un altro agente.",
  errDeOtroAgenteApoyo:
    "Ogni webmaster ha un solo agente. Se pensi che sia un errore, scrivi all'Operatore.",
  errYaEnSophon: "Quell'account era già su Sophon.",
  errYaEnSophonApoyo:
    "Puoi registrare solo account nuovi che registri tu. Quelli che esistevano già sono dell'Operatore.",
  errNoExisteEnSophon: "Quell'email non esiste su Sophon.",
  errNoExisteEnSophonApoyo: "Deve registrarsi su Sophon prima che tu possa attivarlo.",
  errSinWhitelist: "L'account non è autorizzato su Sophon.",
  errSinWhitelistApoyo:
    "L'autorizzazione si richiede a mano all'assistenza. Non abbiamo attivato nulla.",
  errSophonNoResponde: "Sophon non risponde.",
  errSophonNoRespondeApoyo: "Non abbiamo attivato nulla. Riprova tra un minuto.",
  errSophonRechaza: "Sophon ha rifiutato l'attivazione.",
  errSophonRechazaApoyo: "Non abbiamo attivato nulla. L'Operatore è già avvisato.",
  errAltaNoRegistrada: "Non siamo riusciti a registrare l'attivazione.",
  errAltaNoRegistradaApoyo: "Non abbiamo cambiato nulla. Riprova.",
  errSinClasificar: "Non siamo riusciti a completare l'attivazione.",
  errSinClasificarApoyo: "Non abbiamo attivato nulla. Siamo già avvisati.",

  errNoEsTuyo: "Quel webmaster non è nel tuo team.",
  errNoEsTuyoApoyo: "Puoi rinnovare il PRO solo di quelli che hai attivato tu.",
  errNoEsTuyoAbrirApoyo:
    "Controlla l'email. Se non l'hai ancora attivato, fallo da «Attiva webmaster».",
  errProSigueActivo: "Gli resta ancora PRO.",
  errProSigueActivoApoyo: "Potrai rinnovarlo quando gli scadrà.",
  errProNoRegistrado: "Non siamo riusciti a registrare il PRO.",
  errProNoRegistradoApoyo: "Non abbiamo cambiato nulla. Riprova dalla sua scheda.",
  errProSinWhitelist: "L'account non è autorizzato su Sophon.",
  errProSinWhitelistApoyo: "L'autorizzazione si richiede a mano all'assistenza.",
  errProRechazado: "Sophon non gli ha dato il PRO.",
  errProRechazadoApoyo: "Riprova dalla sua scheda tra un minuto.",

  errRetiroFormato: "L'importo o il portafoglio non hanno il formato corretto.",
  errRetiroFormatoApoyo: "Controllali e riprova.",
  errRetiroMinimo: (minimo: string) => `L'importo è sotto il minimo di ${minimo}.`,
  errRetiroMinimoApoyo: (importe: string) => `Hai chiesto ${importe}.`,
  errRetiroSaldo: (disponible: string) =>
    `L'importo supera il tuo saldo disponibile di ${disponible}.`,
  errRetiroSaldoApoyo:
    "Quello che hai guadagnato negli ultimi giorni non lo puoi prelevare finché non viene confermato.",
  errRetiroYaHayUna: (importe: string) => `Hai già una richiesta in sospeso di ${importe}.`,
  errRetiroYaHayUnaApoyo:
    "Puoi averne una sola alla volta. Le revisioni sono manuali; puoi annullare quella che hai.",
  errRetiroNoRegistrado: "Non siamo riusciti a registrare la tua richiesta.",
  errRetiroNoRegistradoApoyo: "Non ti abbiamo scalato nulla. Riprova.",

  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "Per entrare ti serve un codice di attivazione. Te lo dà l'Operatore.",
  botCuandoLoTengas: "Quando ce l'hai, collega il tuo account qui.",
  botHola: (nombre: string) => `Ciao, ${nombre}. Scegli da dove inizi.`,
  botVincularCuenta: "Collega il mio account",
  botSuspendido: "Hai l'account sospeso. Scrivi all'Operatore per riattivarlo.",
  botSinPublicar:
    "L'applicazione non è ancora pubblicata. Il problema si segnala all'Operatore.",
  botCadaComando: "Ogni comando apre una schermata:",
  botOStart: "Oppure /start per il menu completo.",
  botComandoDesconocido: "Non conosco questo comando. Prova /ayuda.",
  botUsaStart: "Usa /start per aprire l'applicazione.",
  botActivarAtajo: "/activar email@esempio.com — registrare senza aprire l'applicazione",
  botActivarComoSeUsa: "Scrivi l'email dopo il comando: /activar email@esempio.com",
  botSinCuenta: "Non hai ancora un account da agente. Scrivi /start per registrarti.",
  botActivado: (email: string) => `${email} è ora nel tuo team, con un anno di PRO.`,
  botActivadoSinPro: (email: string) => `${email} è ora nel tuo team.`,
  botActivadoSinProApoyo: "L'anno di PRO non è entrato. Riprova dal suo profilo.",

  botRetiroPagado: (importe: string) => `Hai incassato ${importe}.`,
  botRedTitulo: "Il tuo team ha bisogno di una chiamata",
  botRedParados: (n: number, total: number) =>
    `${n} dei tuoi ${total} webmaster non portano un'iscrizione da tempo:`,
  botRedDiasParado: (dias: number) => `${dias} ${dias === 1 ? "giorno" : "giorni"} senza attività`,
  // «webmaster» es invariable en italiano —como «computer» o «manager»—, igual
  // que en `botRedParados` dos líneas más arriba. El plural va en el verbo.
  botRedIncidencias: (n: number) =>
    `${n} webmaster con problemi su Sophon; non ${
      n === 1 ? "può" : "possono"
    } generare iscrizioni:`,
  botRedYOtros: (n: number) => `…e altri ${n}.`,
  botRedComoVerlo: "Aprili da «Il mio team» per vedere con quali link ottengono iscrizioni.",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `Riferimento: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `Abbiamo approvato il tuo prelievo di ${importe}. Il pagamento parte a breve.`,
  botRetiroRechazado: (importe: string) =>
    `Abbiamo rifiutato il tuo prelievo di ${importe}. Hai di nuovo il saldo disponibile.`,
  botMotivo: (motivo: string) => `Motivo: ${motivo}`,

  // ── Il messaggio con il codice di accesso ─────────────────────────────────
  correoOtpAsunto: (codigo: string) => `${codigo} è il tuo codice di accesso`,
  correoOtpTuCodigo: "Il tuo codice di verifica:",
  correoOtpCaduca: (minutos: number) =>
    `Scade tra ${minutos} minuti e vale una sola volta.`,
  correoOtpNoPedido:
    "Se non hai chiesto tu di entrare in Sophon Promoters, ignora questa email: senza il codice nessuno può entrare nel tuo account.",
  correoOtpTocaParaCopiar: "Tieni premuto il codice per copiarlo.",
};

const pt: Cadenas = {
  inicio: "Início",
  red: "A minha equipa",
  historico: "Histórico",
  cartera: "Saldo",
  webmaster: "Webmaster",
  devengado: "Ganho",
  disponible: "Disponível",
  solicitado: "Solicitado",
  pagado: "Pago",
  volver: "Voltar",
  cargando: "A carregar",
  sondeando: "A carregar dados",

  activarWebmaster: "Ativar webmaster",
  solicitarRetiro: "Levantar",
  // «Aceder» es el verbo, pero el rótulo que usan de verdad las aplicaciones
  // portuguesas para esto es «Iniciar sessão». Se prefiere lo que el agente ya
  // ha visto cien veces a la traducción literal del español.
  acceder: "Iniciar sessão",
  reintentar: "Tentar de novo",
  activar: "Ativar",
  entrar: "Entrar",
  activarOtro: "Ativar outro",
  verMiRed: "Ver a minha equipa",
  verSuFicha: "Ver o perfil dele",
  volverAlInicio: "Voltar ao início",
  precios: "Preços",
  preciosDelPrograma: "Preços do programa",
  preciosParaEnsenar: "Mostra-o aos teus webmasters: é o que eles vão receber.",
  loQueCobraTuWebmaster: "O que recebe o teu webmaster",
  porCadaCienUsuarios: "Por cada 100 utilizadores registados",
  paisesDelTier: (n: number) => `${n} ${n === 1 ? "país" : "países"}`,
  nivelDeLaCuenta: "Nível da conta",
  losNiveles: "Os níveis",
  nivelHaceFalta: (importe: string) => `a partir de ${importe}`,
  nivel: "Nível",
  acumuladoEsteMes: "Pago pelos utilizadores este mês",
  teFaltanParaElNivel: (importe: string, nivel: number) => `Faltam-te ${importe} para LV${nivel}.`,
  nivelMasAlto: "Estás no nível mais alto.",
  nivelGanadoEntraElDiaUno: (nivel: number) => `Já tens LV${nivel}: entra no dia 1.`,
  comoSubeElNivel:
    "O nível sobe com o que pagam os utilizadores angariados pelo PRO deles, não com a recompensa que se ganha. Quando o mês chega ao mínimo do nível seguinte, o preço novo entra no dia 1 do mês a seguir.",
  tuComisionNoDependeDelNivel: "A tua comissão não muda com o nível: recebes o mesmo em todos.",
  sinPrecios: "Ainda não há preços para mostrar.",
  sinPreciosApoyo: "A Sophon não devolveu a tabela. Tenta outra vez daqui a pouco.",
  activarElPrimero: "Ativar o primeiro",

  sinWebmasters: "Ainda não ativaste nenhum webmaster.",
  sinWebmastersApoyo: "Ativa-o com o email dele na Sophon.",
  sinIngresos: "A tua equipa ainda não trouxe registos.",
  sinIngresosApoyo: "Vão aparecer aqui assim que alguém se registar pelos links dele.",
  sinMovimientos: "Ainda não pediste nenhum levantamento.",

  bienvenida: "Damos-te as boas-vindas à Sophon Promoters",
  bienvenidaApoyo:
    "A tua equipa, os teus registos e o teu saldo num só sítio. Entra com o teu email para veres.",

  entrarEnTuCuenta: "Entrar",
  introduceTuCorreo: "Escreve o teu email. Se já tens conta, mandamos-te o código de verificação.",
  codigoDeActivacion: "Código de ativação",
  teLoDaElOperador: "É o Operador que to dá.",
  tuCorreo: "O teu email",
  seraTuIdentificador: "É o teu identificador na Sophon.",
  correoSinCuenta: "Esse email ainda não tem conta.",
  correoSinCuentaApoyo: "Junta o código de ativação para te registares.",
  enviarmeElCodigo: "Enviar código",
  confirmaQueEresTu: "Verificar email",
  otpEnviado: (email: string) =>
    `Código enviado para ${email}. Expira dentro de 10 minutos.`,
  codigoDeVerificacion: "Código de verificação",
  cambiarElCorreo: "Alterar email",
  reenviarEn: (segundos: number) => `Reenviar em ${segundos} s`,
  reenviarElCodigo: "Reenviar código",
  pegarCodigo: "Colar",
  codigoProgreso: (puestos: number, total: number) => `${puestos} de ${total}`,
  codigoCompleto: "Código completo",

  devengadoTreintaDias: "Ganho · 30 dias",
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
  bonoMaximoAlcanzado: "Chegaste ao nível mais alto do mês.",
  bonoGanado: (importe: string) => `Ganhaste ${importe}`,
  escaleraDelBono: "Níveis do bónus",
  bonoExtraSi: (umbral: number) =>
    `extra se chegares a ${umbral.toLocaleString("pt-PT")} ${
      umbral === 1 ? "registo" : "registos"
    } este mês`,
  bonoMasSiLlegas: (importe: string, umbral: number) =>
    `${importe} mais se chegares a ${umbral.toLocaleString("pt-PT")} ${
      umbral === 1 ? "registo" : "registos"
    }`,
  bonoYaEsTuyo: "já é teu",
  bonoEsteMesLlevas: (registros: number, faltan: number) =>
    `${registros.toLocaleString("pt-PT")} este mês · ${
      faltan === 1 ? "falta-te" : "faltam-te"
    } ${faltan.toLocaleString("pt-PT")}`,
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
  yaEstaEnTuRed: (email: string) => `${email} já está na tua equipa.`,
  cobrarasDesdeHoy: "Vais ganhar pelos registos posteriores à ativação. Os anteriores não contam.",

  conIncidencia: (n: number) => `${n} com ${n === 1 ? "problema" : "problemas"}`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} sem atividade nos últimos ${dias} ${dias === 1 ? "dia" : "dias"}, de ${total}`,
  todosProduciendo: (n: number) => `Os ${n} estão ativos`,
  escalaComun: (dias: number) =>
    `Cada coluna, ${dias} ${dias === 1 ? "dia" : "dias"}. Todas as barras estão à mesma escala, por isso podes compará-las.`,

  bloqueado: "Bloqueado",
  seVaABorrar: "Vai ser eliminado",
  desaparecido: "Já não está",
  proCaducado: "Expirou-lhe o PRO",
  sinActividad: "Sem atividade",
  diasParado: (dias: number) => `${dias} ${dias === 1 ? "dia" : "dias"} sem atividade`,
  activoEnSophon: "Ativo na Sophon",
  bloqueadoEnSophon: "Bloqueado na Sophon",
  pendienteDeBorrado: "Vai ser eliminado",
  yaNoApareceEnSophon: "Já não está na Sophon",
  estadoSinComprobar: "Estado por verificar",
  pendienteDeConfirmar: "A confirmar",
  pendienteDeConfirmarApoyo: "A Sophon ainda não o publicou. Costuma resolver-se sozinho.",

  enTuRedDesde: (fecha: string) => `na tua equipa desde ${fecha}`,
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
  conQueCapta: "É com estes links que consegue registos. Dados em direto da Sophon.",
  sinEnlaces: "Ainda não publicou nenhum link.",
  enlacesNoDisponibles: "Agora não conseguimos ler os links dele. Tenta mais tarde.",
  enlaceCopiado: "Link copiado",
  dolares: (importe: string) => `${importe} dólares`,
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
  proNoConcedido: "Já tens o webmaster na tua equipa, mas não conseguimos dar-lhe o PRO.",
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
  dePago: (n: number) => `${n} ${n === 1 ? "pagou" : "pagaram"}`,
  diaAbierto: "Dia em curso: os dados podem variar.",

  soloConsolidado:
    "Só podes levantar o que já está confirmado. Os últimos dias ainda os estamos a rever.",
  revisionManual: "As revisões são manuais. Demoramos 1 a 3 dias.",
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
  pedirImporte: (importe: string) => `Levantar ${importe}`,
  solicitudesAnteriores: "Levantamentos anteriores",

  sesionCaducada: "A tua sessão expirou.",
  sesionCaducadaApoyo: "Volta a entrar com o teu email. Não perdes nada do que é teu.",
  algoHaFallado: "Não conseguimos concluir a ação.",
  algoHaFalladoApoyo: "Não alterámos nada. Tenta outra vez.",
  comoCobras: "Ganhas 0,03 $ por cada utilizador que registe, seja qual for o país.",

  errSinTelegram: "O Telegram não verificou o teu acesso.",
  errSinTelegramApoyo: "Abre a aplicação a partir do bot.",
  errSuspendido: "Tens a conta suspensa.",
  errSuspendidoApoyo: "Escreve ao Operador para recuperares o acesso.",

  errFormatoCodigoCorreo: "O código ou o email não têm o formato correto.",
  errFormatoCodigoCorreoApoyo: "Revê-os e tenta outra vez.",
  errCodigoNoVale: "Esse código de ativação não é válido ou expirou.",
  errCodigoUsado: "Esse código de ativação já foi usado.",
  errCodigoUsadoApoyo: "Pede outro ao Operador.",
  errCodigoOtroCorreo: "Esse código foi emitido para outro email.",
  errCodigoOtroCorreoApoyo: "Só é válido com o email para o qual foi emitido.",
  errTelegramYaVinculado: (correo: string) =>
    `Esta conta de Telegram já está associada a ${correo}.`,
  errTelegramYaVinculadoApoyo: "Escreve esse email aqui e entras sem código.",
  errDemasiadosEnvios: "Pediste demasiados códigos seguidos.",
  errDemasiadosEnviosApoyo: "Espera uns minutos e tenta outra vez.",
  errEsperaParaOtroCodigo: (segundos: number) =>
    `Vais poder pedir outro código dentro de ${segundos} segundos.`,
  errCorreoNoEnviado: "Não conseguimos enviar-te o email.",
  errCorreoNoEnviadoApoyo: "Verifica o endereço e tenta outra vez dentro de um minuto.",
  errDatosNoValidos: "Os dados não são válidos.",
  errDatosNoValidosApoyo: "O código de verificação tem 6 dígitos.",
  errOtpCaducado: "Expirou-te o código de verificação.",
  errOtpCaducadoApoyo: "Os códigos expiram ao fim de 10 minutos. Pede outro.",
  errOtpSinIntentos: "Esgotaste as tentativas.",
  errOtpSinIntentosApoyo: "Esse código fica anulado. Pede outro.",
  errOtpIncorrecto: (restantes: number) =>
    `O código de verificação não está correto. ${
      restantes === 1 ? "Resta-te" : "Restam-te"
    } ${restantes} ${restantes === 1 ? "tentativa" : "tentativas"}.`,
  errOtpOtraCuenta: "Esse código foi pedido a partir de outra conta de Telegram.",
  errOtpOtraCuentaApoyo: "Só é válido na conta que o pediu.",
  errCorreoYaVinculado: "Esse email já está associado a outra conta de Telegram.",
  errCorreoYaVinculadoApoyo: "Escreve ao Operador se precisares de a mudar.",
  errNoVinculado: "Não conseguimos associar a tua conta.",
  errNoVinculadoApoyo: "O teu código de ativação continua por usar. Tenta outra vez.",
  errFormatoCorreo: "Esse email não tem o formato correto.",
  errFormatoCorreoApoyo: "Escreve o email com que se registou na Sophon.",

  errYaEnTuEquipo: "Já tens esse webmaster na tua equipa.",
  errYaEnTuEquipoApoyo: "Abre-o em «A minha equipa».",
  errDeOtroAgente: "Esse webmaster já é de outro agente.",
  errDeOtroAgenteApoyo:
    "Cada webmaster tem um só agente. Se achas que é um erro, escreve ao Operador.",
  errYaEnSophon: "Essa conta já estava na Sophon.",
  errYaEnSophonApoyo:
    "Só podes dar de alta contas novas que registes tu. As que já existiam são do Operador.",
  errNoExisteEnSophon: "Esse email não existe na Sophon.",
  errNoExisteEnSophonApoyo: "Tem de se registar na Sophon antes de o poderes ativar.",
  errSinWhitelist: "A conta não está autorizada na Sophon.",
  errSinWhitelistApoyo: "A autorização trata-se à mão com o suporte. Não ativámos nada.",
  errSophonNoResponde: "A Sophon não responde.",
  errSophonNoRespondeApoyo: "Não ativámos nada. Tenta outra vez dentro de um minuto.",
  errSophonRechaza: "A Sophon recusou a ativação.",
  errSophonRechazaApoyo: "Não ativámos nada. O Operador já foi avisado.",
  errAltaNoRegistrada: "Não conseguimos registar a ativação.",
  errAltaNoRegistradaApoyo: "Não alterámos nada. Tenta outra vez.",
  errSinClasificar: "Não conseguimos concluir a ativação.",
  errSinClasificarApoyo: "Não ativámos nada. Já estamos avisados.",

  errNoEsTuyo: "Esse webmaster não está na tua equipa.",
  errNoEsTuyoApoyo: "Só podes renovar o PRO dos que ativaste tu.",
  errNoEsTuyoAbrirApoyo:
    "Verifica o email. Se ainda não o ativaste, fá-lo em «Ativar webmaster».",
  errProSigueActivo: "Ainda lhe resta PRO.",
  errProSigueActivoApoyo: "Vais poder renová-lo quando lhe expirar.",
  errProNoRegistrado: "Não conseguimos registar o PRO.",
  errProNoRegistradoApoyo: "Não alterámos nada. Tenta outra vez a partir da ficha dele.",
  errProSinWhitelist: "A conta não está autorizada na Sophon.",
  errProSinWhitelistApoyo: "A autorização trata-se à mão com o suporte.",
  errProRechazado: "A Sophon não lhe deu o PRO.",
  errProRechazadoApoyo: "Tenta outra vez a partir da ficha dele dentro de um minuto.",

  errRetiroFormato: "O montante ou a carteira não têm o formato correto.",
  errRetiroFormatoApoyo: "Revê-os e tenta outra vez.",
  errRetiroMinimo: (minimo: string) => `O montante fica abaixo do mínimo de ${minimo}.`,
  errRetiroMinimoApoyo: (importe: string) => `Pediste ${importe}.`,
  errRetiroSaldo: (disponible: string) =>
    `O montante ultrapassa o teu saldo disponível de ${disponible}.`,
  errRetiroSaldoApoyo:
    "O que ganhaste nos últimos dias não o podes levantar até ser confirmado.",
  errRetiroYaHayUna: (importe: string) => `Já tens um pedido pendente de ${importe}.`,
  errRetiroYaHayUnaApoyo:
    "Só podes ter um de cada vez. As revisões são manuais; podes cancelar o que tens.",
  errRetiroNoRegistrado: "Não conseguimos registar o teu pedido.",
  errRetiroNoRegistradoApoyo: "Não te descontámos nada. Tenta outra vez.",

  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "Para entrares precisas de um código de ativação. É o Operador que to dá.",
  botCuandoLoTengas: "Quando o tiveres, associa aqui a tua conta.",
  botHola: (nombre: string) => `Olá, ${nombre}. Escolhe por onde começas.`,
  botVincularCuenta: "Associar a minha conta",
  botSuspendido: "Tens a conta suspensa. Escreve ao Operador para a reativar.",
  botSinPublicar:
    "A aplicação ainda não está publicada. A incidência é comunicada ao Operador.",
  botCadaComando: "Cada comando abre um ecrã:",
  botOStart: "Ou /start para o menu completo.",
  botComandoDesconocido: "Não conheço esse comando. Experimenta /ayuda.",
  botUsaStart: "Usa /start para abrir a aplicação.",
  botActivarAtajo: "/activar email@exemplo.com — registar sem abrir a aplicação",
  botActivarComoSeUsa: "Escreve o email a seguir ao comando: /activar email@exemplo.com",
  botSinCuenta: "Ainda não tens conta de agente. Escreve /start para te registares.",
  botActivado: (email: string) => `${email} já está na tua equipa, com um ano de PRO.`,
  botActivadoSinPro: (email: string) => `${email} já está na tua equipa.`,
  botActivadoSinProApoyo: "O ano de PRO não entrou. Tenta outra vez a partir do perfil dele.",

  botRetiroPagado: (importe: string) => `Recebeste ${importe}.`,
  botRedTitulo: "A tua equipa precisa de uma chamada",
  botRedParados: (n: number, total: number) =>
    `${n} dos teus ${total} webmasters já não trazem um registo há algum tempo:`,
  botRedDiasParado: (dias: number) => `${dias} ${dias === 1 ? "dia" : "dias"} sem atividade`,
  botRedIncidencias: (n: number) =>
    `${n} ${n === 1 ? "webmaster" : "webmasters"} com problemas na Sophon; não ${
      n === 1 ? "pode" : "podem"
    } gerar registos:`,
  botRedYOtros: (n: number) => `…e mais ${n}.`,
  botRedComoVerlo: "Abre-os em «A minha equipa» para veres com que links conseguem registos.",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `Referência: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `Aprovámos o teu levantamento de ${importe}. O pagamento sai em breve.`,
  botRetiroRechazado: (importe: string) =>
    `Recusámos o teu levantamento de ${importe}. Voltas a ter o saldo disponível.`,
  botMotivo: (motivo: string) => `Motivo: ${motivo}`,

  // ── O email com o código de acesso ────────────────────────────────────────
  correoOtpAsunto: (codigo: string) => `${codigo} é o teu código de acesso`,
  correoOtpTuCodigo: "O teu código de verificação:",
  correoOtpCaduca: (minutos: number) =>
    `Expira dentro de ${minutos} minutos e só serve uma vez.`,
  correoOtpNoPedido:
    "Se não pediste para entrar no Sophon Promoters, ignora este email: sem o código ninguém consegue aceder à tua conta.",
  correoOtpTocaParaCopiar: "Mantém o código premido para o copiares.",
};

/**
 * Árabe.
 *
 * El layout se invierte entero (`dir="rtl"`), pero los importes y los recuentos
 * siguen escribiéndose con cifras occidentales: es lo que usan las carteras de
 * criptomonedas y los exploradores de bloques que el agente va a mirar al lado,
 * y mezclar dos juegos de dígitos en una pantalla de dinero invita a error.
 *
 * Por eso el locale de este catálogo es `ar` a secas y no `ar-EG`: `ar-EG`
 * numera con cifras índigo-arábigas (٢٠٬٠٠٠) y estaba contradiciendo el párrafo
 * de arriba en las mismas cadenas de dinero que decía proteger.
 *
 * El árabe no tiene caja —no hay versalitas ni mayúsculas que jugar— y sí tiene
 * DUAL: donde un recuento cambia de forma, hay tres ramas (1, 2, resto).
 */
const ar: Cadenas = {
  inicio: "الرئيسية",
  red: "فريقي",
  historico: "السجل",
  cartera: "الرصيد",
  webmaster: "مشرف الموقع",
  devengado: "المكتسب",
  disponible: "المتاح",
  solicitado: "المطلوب",
  pagado: "المدفوع",
  volver: "رجوع",
  cargando: "جارٍ التحميل",
  sondeando: "جارٍ تحميل البيانات",

  activarWebmaster: "تفعيل مشرف موقع",
  solicitarRetiro: "سحب",
  acceder: "تسجيل الدخول",
  reintentar: "أعد المحاولة",
  activar: "تفعيل",
  entrar: "دخول",
  activarOtro: "تفعيل آخر",
  verMiRed: "عرض فريقي",
  verSuFicha: "عرض ملفه",
  volverAlInicio: "العودة إلى الرئيسية",
  precios: "الأسعار",
  preciosDelPrograma: "أسعار البرنامج",
  preciosParaEnsenar: "اعرضها على الـ webmasters: هذا ما سيتقاضونه.",
  loQueCobraTuWebmaster: "ما يتقاضاه الـ webmaster",
  porCadaCienUsuarios: "لكل 100 مستخدم مسجَّل",
  paisesDelTier: (n: number) => `${n} ${n === 1 ? "بلد" : "بلدًا"}`,
  nivelDeLaCuenta: "مستوى الحساب",
  losNiveles: "المستويات",
  nivelHaceFalta: (importe: string) => `ابتداءً من ${importe}`,
  nivel: "المستوى",
  acumuladoEsteMes: "ما دفعه المستخدمون هذا الشهر",
  teFaltanParaElNivel: (importe: string, nivel: number) => `يتبقى ${importe} للوصول إلى LV${nivel}.`,
  nivelMasAlto: "أنت في أعلى مستوى.",
  nivelGanadoEntraElDiaUno: (nivel: number) => `لديك LV${nivel} بالفعل: يبدأ في اليوم الأول.`,
  comoSubeElNivel:
    "يرتفع المستوى بما يدفعه المستخدمون الذين تجلبهم مقابل اشتراك PRO، لا بالمكافأة التي تُحصَّل. وعندما يبلغ الشهر الحد الأدنى للمستوى التالي، يبدأ السعر الجديد في اليوم الأول من الشهر الذي يليه.",
  tuComisionNoDependeDelNivel: "عمولتك لا تتغير بالمستوى: تتقاضى المبلغ نفسه في كل المستويات.",
  sinPrecios: "لا توجد أسعار لعرضها بعد.",
  sinPreciosApoyo: "لم تُرجع Sophon الجدول. أعد المحاولة بعد قليل.",
  activarElPrimero: "فعّل أول واحد",

  sinWebmasters: "لم تفعّل أي webmaster بعد.",
  sinWebmastersApoyo: "فعّله ببريده في Sophon.",
  sinIngresos: "فريقك لم يجلب تسجيلات بعد.",
  sinIngresosApoyo: "ستظهر هنا فور أن يسجّل أحدهم عبر روابطه.",
  sinMovimientos: "لم تطلب أي سحب بعد.",

  bienvenida: "مرحبًا بك في Sophon Promoters",
  bienvenidaApoyo: "فريقك وتسجيلاتك ورصيدك في مكان واحد. ادخل ببريدك الإلكتروني لتراها.",

  entrarEnTuCuenta: "الدخول",
  introduceTuCorreo: "اكتب بريدك الإلكتروني. إن كان لديك حساب بالفعل، نرسل لك رمز التحقق.",
  codigoDeActivacion: "رمز التفعيل",
  teLoDaElOperador: "يعطيك إياه المشغّل.",
  tuCorreo: "بريدك الإلكتروني",
  seraTuIdentificador: "هو معرّفك في Sophon.",
  correoSinCuenta: "لا يوجد حساب بهذا البريد بعد.",
  correoSinCuentaApoyo: "أضف رمز التفعيل للتسجيل.",
  enviarmeElCodigo: "إرسال الرمز",
  confirmaQueEresTu: "تأكيد البريد",
  otpEnviado: (email: string) => `أُرسل الرمز إلى ${email}. تنتهي صلاحيته بعد 10 دقائق.`,
  codigoDeVerificacion: "رمز التحقق",
  cambiarElCorreo: "تغيير البريد",
  reenviarEn: (segundos: number) => `إعادة الإرسال بعد ${segundos} ث`,
  reenviarElCodigo: "إعادة إرسال الرمز",
  pegarCodigo: "لصق",
  codigoProgreso: (puestos: number, total: number) => `${puestos} من ${total}`,
  codigoCompleto: "الرمز مكتمل",

  devengadoTreintaDias: "المكتسب · 30 يومًا",
  registrosYWebmasters: (registros: number, webmasters: number) =>
    `${registros.toLocaleString("ar")} تسجيل · ${webmasters} webmaster`,
  repartoPorTier: "التسجيلات حسب المستوى",
  acciones: "الإجراءات",
  estadoDeTuDinero: "أين أموالك",
  bonoDelMes: "مكافأة الشهر",
  registrosEsteMes: (n: number) => `${n.toLocaleString("ar")} تسجيل هذا الشهر`,
  faltanParaElBono: (faltan: number, premio: string) =>
    `يتبقّى لك ${faltan.toLocaleString("ar")} تسجيل للوصول إلى ${premio}.`,
  bonoMaximoAlcanzado: "لقد بلغت أعلى مستوى لهذا الشهر.",
  bonoGanado: (importe: string) => `لقد ربحت ${importe}`,
  escaleraDelBono: "مستويات المكافأة",
  // Dual: تسجيل واحد / تسجيلان / تسجيلات. Es la misma concordancia triple que
  // `botRedIncidencias` hace con el verbo, aplicada aquí al sustantivo contado.
  bonoExtraSi: (umbral: number) =>
    `إضافية إذا بلغت ${
      umbral === 1
        ? "تسجيلًا واحدًا"
        : umbral === 2
          ? "تسجيلين"
          : `${umbral.toLocaleString("ar")} تسجيل`
    } هذا الشهر`,
  bonoMasSiLlegas: (importe: string, umbral: number) =>
    `${importe} أكثر إذا بلغت ${
      umbral === 1
        ? "تسجيلًا واحدًا"
        : umbral === 2
          ? "تسجيلين"
          : `${umbral.toLocaleString("ar")} تسجيل`
    }`,
  bonoYaEsTuyo: "صار لك",
  bonoEsteMesLlevas: (registros: number, faltan: number) =>
    `${registros.toLocaleString("ar")} هذا الشهر · يتبقّى لك ${faltan.toLocaleString("ar")}`,
  ritmoYRecta: (ritmo: number, dias: number) =>
    `معدّلك ${ritmo.toLocaleString("ar")} تسجيل يوميًا، ويتبقّى ${dias} ${
      dias === 1 ? "يوم" : "أيام"
    } من الشهر.`,
  loAlcanzarasEl: (dia: number) => `بهذا المعدّل ستبلغه في اليوم ${dia}.`,
  cerrarasElMesEn: (registros: number) =>
    `بهذا المعدّل ستنهي الشهر عند ${registros.toLocaleString("ar")}.`,
  frenteAlMesPasado: (porcentaje: number) =>
    `${porcentaje >= 0 ? "+" : "−"}${Math.abs(porcentaje)} % عن الشهر الماضي`,
  quienTeAcerca: "من يقرّبك من الهدف",

  correoDelWebmaster: "بريد مشرف الموقع",
  tieneQueExistirYa: "يجب أن يكون الحساب مسجَّلًا في Sophon مسبقًا.",
  yaEstaEnTuRed: (email: string) => `${email} موجود في فريقك بالفعل.`,
  cobrarasDesdeHoy: "ستربح من التسجيلات اللاحقة للتفعيل. السابقة لا تُحتسب.",

  // Dual otra vez: el pronombre cambia con 1, con 2 y con el resto.
  conIncidencia: (n: number) =>
    `${n} ${n === 1 ? "به مشكلة" : n === 2 ? "بهما مشكلات" : "بها مشكلات"}`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} بلا نشاط خلال آخر ${dias} يومًا، من أصل ${total}`,
  todosProduciendo: (n: number) => `الـ ${n} جميعهم نشطون`,
  escalaComun: (dias: number) =>
    `كل عمود ${dias} أيام. كل الأعمدة على المقياس نفسه، فيمكنك المقارنة بينها.`,

  bloqueado: "محظور",
  seVaABorrar: "على وشك الحذف",
  desaparecido: "لم يعد موجودًا",
  proCaducado: "انتهت صلاحية PRO الخاص به",
  sinActividad: "بلا نشاط",
  diasParado: (dias: number) => `${dias} أيام بلا نشاط`,
  activoEnSophon: "نشط في Sophon",
  bloqueadoEnSophon: "محظور في Sophon",
  pendienteDeBorrado: "على وشك الحذف",
  yaNoApareceEnSophon: "لم يعد موجودًا في Sophon",
  estadoSinComprobar: "الحالة غير مُتحقق منها",
  pendienteDeConfirmar: "قيد التأكيد",
  pendienteDeConfirmarApoyo: "لم ينشره Sophon بعد. عادةً ما يُحل من تلقاء نفسه.",

  enTuRedDesde: (fecha: string) => `في فريقك منذ ${fecha}`,
  teHaDado: "جلب لك",
  registrosEnDias: (registros: number, dias: number) => `${registros} تسجيل خلال ${dias} يومًا`,
  compraronPro: (n: number) => `${n} اشترى PRO`,
  cobrasDesde: (fecha: string) => `تربح من التسجيلات منذ ${fecha}. السابقة لا تُحتسب.`,
  ultimosDias: (dias: number) => `آخر ${dias} يومًا`,
  todaviaSinRegistros: "لم يجلب لك أي تسجيل بعد.",
  registroDeSondeo: "النشاط",

  susEnlaces: "روابطه",
  conQueCapta: "بهذه الروابط يحصل على تسجيلات. بيانات مباشرة من Sophon.",
  sinEnlaces: "لم ينشر أي رابط بعد.",
  enlacesNoDisponibles: "لا نستطيع قراءة روابطه الآن. حاول لاحقًا.",
  enlaceCopiado: "نُسخ الرابط",
  dolares: (importe: string) => `${importe} دولار`,
  numero: (n: number) => n.toLocaleString("ar"),
  registrosCortos: (n: number) => `${n.toLocaleString("ar")} تسجيل`,

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
  proNoConcedido: "أصبح webmaster في فريقك، لكننا لم نتمكن من منحه PRO.",
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
  // Dual: 1 دفع · 2 دفعا · 3+ دفعوا.
  dePago: (n: number) => `${n} ${n === 1 ? "دفع" : n === 2 ? "دفعا" : "دفعوا"}`,
  diaAbierto: "اليوم الجاري: البيانات قابلة للتغيّر.",

  soloConsolidado: "لا يمكنك سحب سوى ما تم تأكيده. الأيام الأخيرة ما زلنا نراجعها.",
  revisionManual: "المراجعات يدوية. نستغرق من 1 إلى 3 أيام.",
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
  pedirImporte: (importe: string) => `سحب ${importe}`,
  solicitudesAnteriores: "السحوبات السابقة",

  sesionCaducada: "انتهت صلاحية جلستك.",
  sesionCaducadaApoyo: "ادخل من جديد ببريدك. لن تفقد شيئًا مما لك.",
  algoHaFallado: "لم نتمكن من إتمام الإجراء.",
  algoHaFalladoApoyo: "لم نغيّر شيئًا. أعد المحاولة.",
  comoCobras: "تربح 0,03 $ عن كل مستخدم يسجّله، أيًا كان بلده.",

  errSinTelegram: "لم يتحقق Telegram من دخولك.",
  errSinTelegramApoyo: "افتح التطبيق من البوت.",
  errSuspendido: "حسابك موقوف.",
  errSuspendidoApoyo: "راسل المشغّل لاستعادة الدخول.",

  errFormatoCodigoCorreo: "الرمز أو البريد ليس بالصيغة الصحيحة.",
  errFormatoCodigoCorreoApoyo: "راجعهما وأعد المحاولة.",
  errCodigoNoVale: "رمز التفعيل هذا غير صالح أو انتهت صلاحيته.",
  errCodigoUsado: "رمز التفعيل هذا استُخدم من قبل.",
  errCodigoUsadoApoyo: "اطلب رمزًا آخر من المشغّل.",
  errCodigoOtroCorreo: "هذا الرمز صدر لبريد آخر.",
  errCodigoOtroCorreoApoyo: "لا يصلح إلا مع البريد الذي صدر له.",
  errTelegramYaVinculado: (correo: string) => `حساب Telegram هذا مرتبط بالفعل بـ ${correo}.`,
  errTelegramYaVinculadoApoyo: "اكتب ذلك البريد هنا وتدخل بدون رمز.",
  errDemasiadosEnvios: "طلبت رموزاً كثيرة متتالية.",
  errDemasiadosEnviosApoyo: "انتظر بضع دقائق ثم أعد المحاولة.",
  errEsperaParaOtroCodigo: (segundos: number) =>
    `ستتمكن من طلب رمز آخر بعد ${segundos} ثانية.`,
  errCorreoNoEnviado: "لم نتمكن من إرسال البريد إليك.",
  errCorreoNoEnviadoApoyo: "تحقق من العنوان وأعد المحاولة بعد دقيقة.",
  errDatosNoValidos: "البيانات غير صالحة.",
  errDatosNoValidosApoyo: "رمز التحقق مكوَّن من 6 أرقام.",
  errOtpCaducado: "انتهت صلاحية رمز التحقق.",
  errOtpCaducadoApoyo: "تنتهي صلاحية الرموز بعد 10 دقائق. اطلب رمزًا آخر.",
  errOtpSinIntentos: "استنفدت المحاولات.",
  errOtpSinIntentosApoyo: "هذا الرمز أصبح ملغى. اطلب رمزًا آخر.",
  // Dual: محاولة واحدة / محاولتان / محاولات.
  errOtpIncorrecto: (restantes: number) =>
    `رمز التحقق غير صحيح. ${
      restantes === 1
        ? "تبقّت لك محاولة واحدة"
        : restantes === 2
          ? "تبقّت لك محاولتان"
          : `تبقّت لك ${restantes} محاولات`
    }.`,
  errOtpOtraCuenta: "طُلب هذا الرمز من حساب Telegram آخر.",
  errOtpOtraCuentaApoyo: "لا يصلح إلا في الحساب الذي طلبه.",
  errCorreoYaVinculado: "هذا البريد مرتبط بالفعل بحساب Telegram آخر.",
  errCorreoYaVinculadoApoyo: "راسل المشغّل إن احتجت إلى تغييره.",
  errNoVinculado: "لم نتمكن من ربط حسابك.",
  errNoVinculadoApoyo: "رمز التفعيل الخاص بك ما زال غير مستخدَم. أعد المحاولة.",
  errFormatoCorreo: "هذا البريد ليس بالصيغة الصحيحة.",
  errFormatoCorreoApoyo: "اكتب البريد الذي سُجّل به في Sophon.",

  errYaEnTuEquipo: "هذا webmaster في فريقك بالفعل.",
  errYaEnTuEquipoApoyo: "افتحه من «فريقي».",
  errDeOtroAgente: "هذا webmaster تابع لوكيل آخر بالفعل.",
  errDeOtroAgenteApoyo: "لكل webmaster وكيل واحد فقط. إن كنت ترى أن هذا خطأ، راسل المشغّل.",
  errYaEnSophon: "هذا الحساب كان موجودًا في Sophon من قبل.",
  errYaEnSophonApoyo:
    "لا يمكنك تسجيل سوى الحسابات الجديدة التي تسجّلها أنت. أما التي كانت موجودة فهي للمشغّل.",
  errNoExisteEnSophon: "هذا البريد غير موجود في Sophon.",
  errNoExisteEnSophonApoyo: "عليه التسجيل في Sophon قبل أن تتمكن من تفعيله.",
  errSinWhitelist: "الحساب غير مصرَّح له في Sophon.",
  errSinWhitelistApoyo: "التصريح يُعالَج يدويًا مع الدعم. لم نفعّل شيئًا.",
  errSophonNoResponde: "Sophon لا يستجيب.",
  errSophonNoRespondeApoyo: "لم نفعّل شيئًا. أعد المحاولة بعد دقيقة.",
  errSophonRechaza: "رفض Sophon التفعيل.",
  errSophonRechazaApoyo: "لم نفعّل شيئًا. تم إبلاغ المشغّل.",
  errAltaNoRegistrada: "لم نتمكن من تسجيل التفعيل.",
  errAltaNoRegistradaApoyo: "لم نغيّر شيئًا. أعد المحاولة.",
  errSinClasificar: "لم نتمكن من إتمام التفعيل.",
  errSinClasificarApoyo: "لم نفعّل شيئًا. نحن على علم بالأمر.",

  errNoEsTuyo: "هذا webmaster ليس في فريقك.",
  errNoEsTuyoApoyo: "لا يمكنك تجديد PRO إلا لمن فعّلتهم أنت.",
  errNoEsTuyoAbrirApoyo:
    "تحقّق من البريد. إن لم تكن قد فعّلته بعد، فافعل ذلك من «تفعيل مشرف موقع».",
  errProSigueActivo: "ما زال لديه PRO.",
  errProSigueActivoApoyo: "ستتمكن من تجديده عند انتهاء صلاحيته.",
  errProNoRegistrado: "لم نتمكن من تسجيل PRO.",
  errProNoRegistradoApoyo: "لم نغيّر شيئًا. أعد المحاولة من ملفه.",
  errProSinWhitelist: "الحساب غير مصرَّح له في Sophon.",
  errProSinWhitelistApoyo: "التصريح يُعالَج يدويًا مع الدعم.",
  errProRechazado: "لم يمنحه Sophon اشتراك PRO.",
  errProRechazadoApoyo: "أعد المحاولة من ملفه بعد دقيقة.",

  errRetiroFormato: "المبلغ أو المحفظة ليسا بالصيغة الصحيحة.",
  errRetiroFormatoApoyo: "راجعهما وأعد المحاولة.",
  errRetiroMinimo: (minimo: string) => `المبلغ أقل من الحد الأدنى البالغ ${minimo}.`,
  errRetiroMinimoApoyo: (importe: string) => `طلبت ${importe}.`,
  errRetiroSaldo: (disponible: string) => `المبلغ يتجاوز رصيدك المتاح البالغ ${disponible}.`,
  errRetiroSaldoApoyo: "ما ربحته في الأيام الأخيرة لا يمكنك سحبه حتى يتم تأكيده.",
  errRetiroYaHayUna: (importe: string) => `لديك بالفعل طلب معلّق بمبلغ ${importe}.`,
  errRetiroYaHayUnaApoyo:
    "لا يمكنك أن يكون لديك سوى طلب واحد في كل مرة. المراجعات يدوية؛ يمكنك إلغاء الطلب الحالي.",
  errRetiroNoRegistrado: "لم نتمكن من تسجيل طلبك.",
  errRetiroNoRegistradoApoyo: "لم نخصم منك شيئًا. أعد المحاولة.",

  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "تحتاج رمز تفعيل للدخول. يعطيك إياه المشغّل.",
  botCuandoLoTengas: "عندما تحصل عليه، اربط حسابك هنا.",
  botHola: (nombre: string) => `مرحبًا، ${nombre}. اختر من أين تبدأ.`,
  botVincularCuenta: "اربط حسابي",
  botSuspendido: "حسابك موقوف. راسل المشغّل لإعادة تفعيله.",
  botSinPublicar: "التطبيق غير منشور بعد. أبلغ المشغّل.",
  botCadaComando: "كل أمر يفتح شاشة:",
  botOStart: "أو /start للقائمة الكاملة.",
  botComandoDesconocido: "لا أعرف هذا الأمر. جرّب /ayuda.",
  botUsaStart: "استخدم /start لفتح التطبيق.",
  botActivarAtajo: "/activar email@example.com — التسجيل من دون فتح التطبيق",
  botActivarComoSeUsa: "اكتب البريد بعد الأمر: /activar email@example.com",
  botSinCuenta: "ليس لديك حساب وكيل بعد. اكتب /start للتسجيل.",
  botActivado: (email: string) => `${email} صار الآن في فريقك، مع سنة PRO.`,
  botActivadoSinPro: (email: string) => `${email} صار الآن في فريقك.`,
  botActivadoSinProApoyo: "سنة PRO لم تُسجَّل. أعد المحاولة من ملفه.",

  botRetiroPagado: (importe: string) => `لقد استلمت ${importe}.`,
  botRedTitulo: "فريقك يحتاج مكالمة",
  botRedParados: (n: number, total: number) =>
    `${n} من webmasters الـ ${total} لديك لم يجلبوا تسجيلًا منذ فترة:`,
  botRedDiasParado: (dias: number) => `${dias} أيام بلا نشاط`,
  botRedIncidencias: (n: number) =>
    `${n} ${n === 1 ? "webmaster" : "webmasters"} بمشكلات في Sophon؛ لا ${
      n === 1 ? "يستطيع" : "يستطيعون"
    } توليد تسجيلات:`,
  botRedYOtros: (n: number) => `…و${n} آخرون.`,
  botRedComoVerlo: "افتحهم من «فريقي» لترى بأي روابط يحصلون على تسجيلات.",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `المرجع: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `وافقنا على سحبك بمبلغ ${importe}. سيصدر الدفع قريبًا.`,
  botRetiroRechazado: (importe: string) =>
    `رفضنا سحبك بمبلغ ${importe}. عاد الرصيد متاحًا لك.`,
  botMotivo: (motivo: string) => `السبب: ${motivo}`,

  // ── رسالة رمز الدخول ──────────────────────────────────────────────────────
  correoOtpAsunto: (codigo: string) => `${codigo} هو رمز دخولك`,
  correoOtpTuCodigo: "رمز التحقق الخاص بك:",
  // Dual y plural: دقيقة واحدة / دقيقتان / دقائق.
  correoOtpCaduca: (minutos: number) =>
    `تنتهي صلاحيته بعد ${
      minutos === 1
        ? "دقيقة واحدة"
        : minutos === 2
          ? "دقيقتين"
          : minutos <= 10
            ? `${minutos} دقائق`
            : `${minutos} دقيقة`
    }، ويصلح مرة واحدة فقط.`,
  correoOtpNoPedido:
    "إذا لم تطلب الدخول إلى Sophon Promoters فتجاهل هذه الرسالة: من دون الرمز لا يمكن لأحد الدخول إلى حسابك.",
  correoOtpTocaParaCopiar: "اضغط مطولاً على الرمز لنسخه.",
};

const catalogos: Record<Idioma, Cadenas> = { es, en, ar, it, pt };

export function cadenas(idioma: Idioma = IDIOMA_DE_RESPALDO): Cadenas {
  return catalogos[idioma];
}
