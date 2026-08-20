/**
 * Cadenas de la interfaz.
 *
 * ── EL REGISTRO, EN SEIS REGLAS ──
 *
 * Esto es una herramienta de trabajo: la abre un comercial para consultar su
 * equipo, sus registros y su dinero. El texto informa; no acompaña, no anima y
 * no conversa.
 *
 * 1. **Se enuncia el estado, no se le habla al usuario de lo que puede hacer.**
 *    «El importe disponible está listo para retirar», no «Solo puedes retirar lo
 *    que ya está confirmado». La segunda versión gasta la frase en una
 *    restricción y deja el dato —que hay dinero listo— para el final.
 * 2. **Las etiquetas son sintagmas nominales.** «Importe a retirar», «Origen del
 *    saldo», «Comisión del webmaster». El imperativo se reserva a los controles,
 *    donde nombra la acción que dispara el toque: «Retirar», «Activar»,
 *    «Reintentar».
 * 3. **Lo que hace el sistema se dice en impersonal.** «No se ha podido registrar
 *    la solicitud», «No se ha aplicado ningún cambio». La primera persona del
 *    plural —«no hemos podido», «te hemos descontado»— convertía cada error en
 *    una disculpa y cada operación en un favor.
 * 4. **Cifras y plazos en lugar de adverbios.** «Entre 1 y 3 días», no «en
 *    breve». «Media de 12 registros al día», no «vas a buen ritmo». Un adverbio
 *    de cantidad en una pantalla de dinero es una estimación sin responsable.
 * 5. **Sin felicitaciones, sin exclamaciones y sin emoji.** La recompensa es el
 *    importe; enseñarlo bien basta.
 * 6. **Los errores dicen tres cosas y en este orden**: qué ha ocurrido, qué ha
 *    quedado tocado —«no se ha activado nada», «no se ha descontado ningún
 *    importe»— y qué hacer ahora.
 *
 * La segunda persona no desaparece: se reserva a lo que de verdad es del agente
 * —«tu comisión», «tu equipo», «tu saldo»— y desaparece de todo lo demás. Es la
 * diferencia entre nombrar a alguien y dirigirse a él sin parar.
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
  verMiRed: "Ver equipo",
  verSuFicha: "Ver perfil",
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
  preciosParaEnsenar: "Precio por usuario registrado para tus webmasters.",
  loQueCobraTuWebmaster: "Comisión del webmaster",
  porCadaCienUsuarios: "Por cada 100 usuarios registrados",
  paisesDelTier: (n: number) => `${n} ${n === 1 ? "país" : "países"}`,
  nivelDeLaCuenta: "Nivel de la cuenta",
  losNiveles: "Sistema de niveles",
  // Un control que no anuncia que se puede tocar no existe. Va bajo el rótulo
  // de la tabla —donde está el control— y nombra dónde aparece el resultado,
  // que queda fuera de la vista al pie de una tabla de siete filas.
  tocaUnNivel: "Selecciona un nivel para ver sus tarifas.",
  nivelInicial: "Nivel inicial",
  // El cierre del cómputo y su entrada en vigor, que es lo que el agente tiene
  // que saber decir: no basta con alcanzar el hito, hay que esperar al día 1.
  cuandoSeAplicaElNivel: "El cómputo se cierra el último día de cada mes. El nivel resultante se aplica desde el día 1 del mes siguiente.",
  nivelHaceFalta: (importe: string) => `desde ${importe}`,
  // Encabeza la COLUMNA que lista todos los niveles, no el del agente: «Tu
  // nivel» decía que esa columna era suya cuando lo que enseña es la escalera
  // entera. El suyo se marca en su fila, que es donde se puede marcar.
  nivel: "Nivel",
  // Qué mueve el nivel del webmaster, que es la pregunta que le hace a su
  // agente en cuanto ve la tabla. No son los registros: es el importe que sus
  // usuarios pagan por el PRO.
  comoSubeElNivel: "El nivel depende del importe total que los usuarios del webmaster paguen por el PRO. A mayor volumen acumulado, antes sube de nivel.",
  /* El OTRO ingreso, y va aparte del precio por registro a propósito: la tabla
     de arriba paga por cada usuario que se da de alta, valga lo que valga
     después; esto paga un porcentaje de lo que esos usuarios gastan. Contarlos
     juntos hace pensar que uno sustituye al otro, y se cobran los dos. */
  repartoDeLasCompras: (webmaster: string) =>
    `El webmaster recibe además el ${webmaster} de lo que sus usuarios paguen por el PRO.`,
  repartoDelAgente: (agente: string) => `Tu comisión sobre esas compras es el ${agente}.`,
  tuComisionNoDependeDelNivel: "Tu comisión es la misma en todos los niveles.",
  sinPrecios: "No hay tarifas disponibles.",
  sinPreciosApoyo: "Sophon no ha devuelto la tabla de precios. Vuelve a intentarlo en unos minutos.",
  activarElPrimero: "Activar el primero",

  // ── Estados vacíos: dicen qué falta y cómo se llena ───────────────────────
  sinWebmasters: "No hay webmasters activados.",
  sinWebmastersApoyo: "Actívalos con su correo registrado en Sophon.",
  sinIngresos: "Sin registros todavía.",
  sinIngresosApoyo: "Los registros aparecerán aquí en cuanto se produzcan desde los enlaces del equipo.",
  sinMovimientos: "No hay retiros solicitados.",
  /* ── La bienvenida ──────────────────────────────────────────────────────────
   *
   * Es lo PRIMERO que ve alguien que abre la Mini App sin sesión, así que es la
   * pantalla que presenta el producto. Decía «Aquí no hay sesión abierta»:
   * describía el estado del servidor —un 401— en vez de presentar nada, y un
   * mensaje de sistema como primera frase de un producto lo hace parecer roto
   * antes de haberlo usado.
   *
   * El título nombra la puerta —es una pantalla de acceso— y la línea de apoyo
   * dice qué hay dentro: equipo, registros y saldo. Ni bienvenida ni eslogan;
   * las dos cosas que alguien necesita saber para decidir si está en el sitio
   * correcto.
   */
  bienvenida: "Acceso de agentes",
  bienvenidaApoyo: "Equipo, registros y saldo en un mismo panel. Accede con tu correo.",

  // ── Alta del agente ───────────────────────────────────────────────────────
  entrarEnTuCuenta: "Entrar",
  introduceTuCorreo: "Introduce tu correo. Si la cuenta existe, se enviará un código de verificación.",
  codigoDeActivacion: "Código de activación",
  teLoDaElOperador: "Lo proporciona el Operador.",
  tuCorreo: "Tu correo",
  seraTuIdentificador: "Es tu identificador en Sophon.",
  correoSinCuenta: "El correo no tiene cuenta asociada.",
  correoSinCuentaApoyo: "Introduce el código de activación para crear la cuenta.",
  enviarmeElCodigo: "Enviar código",
  confirmaQueEresTu: "Verificar correo",
  otpEnviado: (email: string) => `Código enviado a ${email}. Válido durante 10 minutos.`,
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
  estadoDeTuDinero: "Estado del saldo",
  // ── Bono por niveles ──────────────────────────────────────────────────────
  bonoDelMes: "Bono del mes",
  registrosEsteMes: (n: number) =>
    `${n.toLocaleString("es-ES")} ${n === 1 ? "registro" : "registros"} este mes`,
  // Pendiente de retirar: la sustituyen `bonoMasSiLlegas` y `bonoEsteMesLlevas`.
  // Sigue aquí porque `page.tsx` y `lib/bot/avisos.ts` todavía la llaman y el
  // catálogo no tiene respaldo en ejecución: borrarla antes rompe el build.
  faltanParaElBono: (faltan: number, premio: string) =>
    `${faltan === 1 ? "Falta" : "Faltan"} ${faltan.toLocaleString("es-ES")} ${
      faltan === 1 ? "registro" : "registros"
    } para ${premio}.`,
  bonoMaximoAlcanzado: "Nivel máximo del mes alcanzado.",
  bonoGanado: (importe: string) => `Acumulado ${importe}`,
  /*
   * El bono no es acumulable: pasar de 20.000 a 30.000 no paga los 150 $ del
   * escalón alto, paga los 50 de diferencia. Enseñar el total hacía que el
   * agente contara dos veces el mismo dinero, así que lo que preside la banda
   * es el premio y lo que se anuncia arriba es lo que se gana DE MÁS.
   */
  bonoExtraSi: (umbral: number) =>
    `adicional al alcanzar ${umbral.toLocaleString("es-ES")} ${
      umbral === 1 ? "registro" : "registros"
    } este mes`,
  bonoMasSiLlegas: (importe: string, umbral: number) =>
    `${importe} adicionales al alcanzar ${umbral.toLocaleString("es-ES")} ${
      umbral === 1 ? "registro" : "registros"
    }`,
  bonoYaEsTuyo: "confirmado",
  bonoEsteMesLlevas: (registros: number, faltan: number) =>
    `${registros.toLocaleString("es-ES")} registros este mes · ${
      faltan === 1 ? "falta" : "faltan"
    } ${faltan.toLocaleString("es-ES")}`,
  /*
   * El ritmo y la proyección: las dos cifras que SÍ se mueven todos los días.
   *
   * Con los umbrales de hoy la barra del nivel marca poco y va a seguir
   * marcando poco. Falsear su escala para que parezca más sería mentir sobre
   * lo que falta, así que lo que se añade es otra medida —la del propio
   * agente— que responde al trabajo de esta mañana aunque la meta esté lejos.
   *
   * Se dicen como medidas y no como ánimo: «Media de 12 registros al día», no
   * «vas a buen ritmo». Un promedio es comprobable; un adverbio de cantidad en
   * una pantalla de dinero es una estimación sin responsable.
   */
  ritmoYRecta: (ritmo: number, dias: number) =>
    `Media de ${ritmo.toLocaleString("es-ES")} ${
      ritmo === 1 ? "registro" : "registros"
    } al día. ${dias === 1 ? "Queda" : "Quedan"} ${dias} ${dias === 1 ? "día" : "días"} de mes.`,
  loAlcanzarasEl: (dia: number) => `A este ritmo se alcanzará el día ${dia}.`,
  cerrarasElMesEn: (registros: number) =>
    `Proyección de cierre de mes: ${registros.toLocaleString("es-ES")} registros.`,
  frenteAlMesPasado: (porcentaje: number) =>
    `${porcentaje >= 0 ? "+" : "−"}${Math.abs(porcentaje)} % sobre el mes pasado`,
  quienTeAcerca: "Aportación por webmaster",

  // ── Activar webmaster ─────────────────────────────────────────────────────
  correoDelWebmaster: "Correo del webmaster",
  tieneQueExistirYa: "Debe ser una cuenta ya registrada en Sophon.",
  yaEstaEnTuRed: (email: string) => `${email} ya está en tu equipo.`,
  cobrarasDesdeHoy: "Solo computan los registros posteriores a la activación.",

  // ── Mi equipo ─────────────────────────────────────────────────────────────
  conIncidencia: (n: number) => `${n} con ${n === 1 ? "problema" : "problemas"}`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} sin actividad en los últimos ${dias} ${dias === 1 ? "día" : "días"}, de ${total}`,
  todosProduciendo: (n: number) => `${n} activos`,
  escalaComun: (dias: number) =>
    `Cada columna equivale a ${dias} ${dias === 1 ? "día" : "días"}. Todas las barras usan la misma escala.`,

  // ── Estado de un webmaster ────────────────────────────────────────────────
  bloqueado: "Bloqueado",
  seVaABorrar: "Baja programada",
  desaparecido: "Baja en Sophon",
  proCaducado: "PRO caducado",
  sinActividad: "Sin actividad",
  diasParado: (dias: number) => `${dias} ${dias === 1 ? "día" : "días"} sin actividad`,
  activoEnSophon: "Activo en Sophon",
  bloqueadoEnSophon: "Bloqueado en Sophon",
  pendienteDeBorrado: "Baja programada",
  yaNoApareceEnSophon: "Ya no figura en Sophon",
  estadoSinComprobar: "Estado sin comprobar",
  /* Vinculado en Sophon pero todavía sin aparecer en el programa de socios.
     No es un fallo: Sophon tarda en propagarlo y el barrido lo resuelve. */
  pendienteDeConfirmar: "Confirmando",
  pendienteDeConfirmarApoyo: "Sophon aún no ha publicado la vinculación. Se resuelve automáticamente.",

  // ── Ficha de webmaster ────────────────────────────────────────────────────
  enTuRedDesde: (fecha: string) => `en el equipo desde el ${fecha}`,
  teHaDado: "Aportación",
  registrosEnDias: (registros: number, dias: number) =>
    `${registros.toLocaleString("es-ES")} ${registros === 1 ? "registro" : "registros"} en ${dias} ${
      dias === 1 ? "día" : "días"
    }`,
  compraronPro: (n: number) => `${n} ${n === 1 ? "ha comprado" : "han comprado"} PRO`,
  cobrasDesde: (fecha: string) => `Computan los registros desde el ${fecha}.`,
  ultimosDias: (dias: number) => (dias === 1 ? "Último día" : `Últimos ${dias} días`),
  todaviaSinRegistros: "Sin registros aportados.",
  registroDeSondeo: "Actividad",

  // ── Enlaces de reparto ────────────────────────────────────────────────────
  susEnlaces: "Sus enlaces",
  conQueCapta: "Enlaces de captación. Datos en tiempo real de Sophon.",
  sinEnlaces: "Sin enlaces publicados.",
  enlacesNoDisponibles: "No se han podido consultar los enlaces. Vuelve a intentarlo más tarde.",
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
  incluyeUnAnio: "La activación incluye un año de PRO.",
  continuar: "Continuar",
  vasAActivar: "Cuenta a activar",
  corregirElCorreo: "Corregir correo",
  altaNoSeDeshace: "La activación es irreversible: el webmaster queda vinculado a tu cuenta en Sophon.",
  proConcedido: (fecha: string) => `PRO activo hasta el ${fecha}.`,
  proNoConcedido: "Webmaster activado. No se ha podido conceder el PRO.",
  proNoConcedidoApoyo: "Reintenta la concesión desde su perfil. No es necesario repetir la activación.",
  renovarUnAnio: "Renovar un año",
  darUnAnio: "Conceder un año de PRO",
  renovado: (email: string, fecha: string) => `${email} tiene PRO hasta el ${fecha}.`,
  colaRenovaciones: "Renovaciones",
  puedesRenovar: (n: number) => `${n} pendientes de renovación`,
  ningunoRenovable: "No hay renovaciones pendientes.",
  nuncaTuvoPro: "Sin PRO previo",
  puedesRenovarAhora: "Renovación disponible",
  proActivo: "PRO activo",
  podrasRenovarloCuandoSeApague: "La renovación estará disponible al caducar el PRO.",

  // ── Historial ─────────────────────────────────────────────────────────────
  enDias: (dias: number) => `en ${dias} ${dias === 1 ? "día" : "días"}`,
  tocaUnDia: "Selecciona un día para ver el desglose.",
  columnaDia: "Día",
  columnaDolares: "Dólares",
  perforando: "Cargando el desglose",
  aquiEmpieza: "Inicio del historial. No hay datos anteriores.",
  desglose: (registros: number, t1: number, t2: number, t3: number) =>
    `${registros.toLocaleString("es-ES")} ${
      registros === 1 ? "registro" : "registros"
    } · T1 ${t1} · T2 ${t2} · T3 ${t3}`,
  dePago: (n: number) => `${n} ${n === 1 ? "ha pagado" : "han pagado"}`,
  diaAbierto: "Día en curso: los datos pueden variar.",

  // ── Saldo ─────────────────────────────────────────────────────────────────
  soloConsolidado: "El importe disponible está listo para retirar. La confirmación del importe pendiente tarda entre 1 y 3 días.",
  revisionManual: "Revisión manual. Plazo estimado: entre 1 y 3 días.",
  solicitudEnCurso: "Solicitud en curso",
  pendienteDeRevision: "Pendiente de revisión",
  aprobadoPendientePago: "Aprobado · pendiente de pago",
  estadoPagado: "Pagado",
  estadoRechazado: "Rechazado",
  estadoCancelado: "Cancelado",
  pedidaEl: (fecha: string) => `Solicitado el ${fecha}.`,
  soloUnaALaVez: "Solo se admite una solicitud simultánea. La siguiente podrá pedirse al resolverse esta.",
  cuanto: "Importe a retirar",
  todo: "Todo",
  disponibleYMinimo: "Disponible",
  minimo: "mínimo",
  tePasasEn: (importe: string) => `El importe supera el disponible en ${importe}.`,
  teFaltanParaElMinimo: (importe: string) => `El importe queda ${importe} por debajo del mínimo.`,
  enQueRed: "En qué red",
  walletUsdt: "Monedero USDT",
  usdtEn: (red: string, pista: string) =>
    `USDT en ${red}. ${pista} Una dirección de otra red implica la pérdida del pago.`,
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
  sesionCaducada: "La sesión ha caducado.",
  sesionCaducadaApoyo: "Vuelve a acceder con tu correo. No se pierde ningún dato.",
  algoHaFallado: "No se ha podido completar la operación.",
  algoHaFalladoApoyo: "No se ha aplicado ningún cambio. Vuelve a intentarlo.",
  /*
   * Errores de la API, uno por caso.
   *
   * Antes las rutas devolvían un puñado de mensajes genéricos y el agente se
   * quedaba sin saber si le habíamos cobrado, activado o no hecho nada. Cada
   * clave lleva su `Apoyo`, y el apoyo dice siempre qué ha quedado tocado:
   * «No se ha activado nada», «No se ha descontado ningún importe». Es la
   * regla 6.
   */
  errSinTelegram: "Telegram no ha verificado tu acceso.",
  errSinTelegramApoyo: "Abre la aplicación desde el bot.",
  errSuspendido: "La cuenta está suspendida.",
  errSuspendidoApoyo: "Contacta con el Operador para restablecer el acceso.",

  errFormatoCodigoCorreo: "El código o el correo no tienen un formato válido.",
  errFormatoCodigoCorreoApoyo: "Revísalos y vuelve a intentarlo.",
  errCodigoNoVale: "El código de activación no es válido o ha caducado.",
  errCodigoUsado: "El código de activación ya se ha utilizado.",
  errCodigoUsadoApoyo: "Solicita uno nuevo al Operador.",
  errCodigoOtroCorreo: "El código se emitió para otro correo.",
  errCodigoOtroCorreoApoyo: "Solo es válido con el correo para el que se emitió.",
  errTelegramYaVinculado: (correo: string) =>
    `Esta cuenta de Telegram ya está vinculada a ${correo}.`,
  errTelegramYaVinculadoApoyo: "Introduce ese correo para acceder sin código.",
  errDemasiadosEnvios: "Se han solicitado demasiados códigos seguidos.",
  errDemasiadosEnviosApoyo: "Espera unos minutos y vuelve a intentarlo.",
  errEsperaParaOtroCodigo: (segundos: number) =>
    `Podrás solicitar otro código en ${segundos} segundos.`,
  errCorreoNoEnviado: "No se ha podido enviar el correo.",
  errCorreoNoEnviadoApoyo: "Comprueba la dirección y vuelve a intentarlo en un minuto.",
  errDatosNoValidos: "Los datos no son válidos.",
  errDatosNoValidosApoyo: "El código de verificación tiene 6 dígitos.",
  errOtpCaducado: "El código de verificación ha caducado.",
  errOtpCaducadoApoyo: "Los códigos caducan a los 10 minutos. Solicita uno nuevo.",
  errOtpSinIntentos: "Intentos agotados.",
  errOtpSinIntentosApoyo: "El código queda anulado. Solicita uno nuevo.",
  errOtpIncorrecto: (restantes: number) =>
    `Código de verificación incorrecto. ${restantes === 1 ? "Queda" : "Quedan"} ${restantes} ${
      restantes === 1 ? "intento" : "intentos"
    }.`,
  errOtpOtraCuenta: "El código se solicitó desde otra cuenta de Telegram.",
  errOtpOtraCuentaApoyo: "Solo es válido en la cuenta que lo solicitó.",
  errCorreoYaVinculado: "El correo ya está vinculado a otra cuenta de Telegram.",
  errCorreoYaVinculadoApoyo: "Contacta con el Operador para modificar la vinculación.",
  errNoVinculado: "No se ha podido vincular la cuenta.",
  errNoVinculadoApoyo: "El código de activación sigue sin utilizar. Vuelve a intentarlo.",
  errFormatoCorreo: "El correo no tiene un formato válido.",
  errFormatoCorreoApoyo: "Introduce el correo con el que se registró en Sophon.",

  errYaEnTuEquipo: "El webmaster ya está en tu equipo.",
  errYaEnTuEquipoApoyo: "Consúltalo en «Mi equipo».",
  errDeOtroAgente: "El webmaster está asignado a otro agente.",
  errDeOtroAgenteApoyo: "Cada webmaster tiene un único agente asignado. Contacta con el Operador si se trata de un error.",
  errYaEnSophon: "La cuenta ya existía en Sophon.",
  errYaEnSophonApoyo: "Solo pueden activarse cuentas registradas a través de tu equipo. Las preexistentes corresponden al Operador.",
  errNoExisteEnSophon: "El correo no existe en Sophon.",
  errNoExisteEnSophonApoyo: "La cuenta debe registrarse en Sophon antes de activarla.",
  errSinWhitelist: "La cuenta no está autorizada en Sophon.",
  errSinWhitelistApoyo: "La autorización se tramita manualmente con soporte. No se ha activado nada.",
  errSophonNoResponde: "Sophon no responde.",
  errSophonNoRespondeApoyo: "No se ha activado nada. Vuelve a intentarlo en unos minutos.",
  errSophonRechaza: "Sophon ha rechazado la activación.",
  errSophonRechazaApoyo: "No se ha activado nada. El Operador ha sido notificado.",
  errAltaNoRegistrada: "No se ha podido registrar la activación.",
  errAltaNoRegistradaApoyo: "No se ha aplicado ningún cambio. Vuelve a intentarlo.",
  errSinClasificar: "No se ha podido completar la activación.",
  errSinClasificarApoyo: "No se ha activado nada. El error ha quedado registrado.",

  errNoEsTuyo: "El webmaster no está en tu equipo.",
  errNoEsTuyoApoyo: "Solo puede renovarse el PRO de los webmasters activados por ti.",
  /** El 404 de abrir una ficha ajena: ahí el agente no ha pedido renovar nada. */
  errNoEsTuyoAbrirApoyo: "Comprueba el correo. Si aún no está activado, hazlo desde «Activar webmaster».",
  errProSigueActivo: "El PRO sigue vigente.",
  errProSigueActivoApoyo: "La renovación estará disponible al caducar.",
  errProNoRegistrado: "No se ha podido registrar el PRO.",
  errProNoRegistradoApoyo: "No se ha aplicado ningún cambio. Vuelve a intentarlo desde su perfil.",
  errProSinWhitelist: "La cuenta no está autorizada en Sophon.",
  errProSinWhitelistApoyo: "La autorización se tramita manualmente con soporte.",
  errProRechazado: "Sophon ha rechazado la concesión del PRO.",
  errProRechazadoApoyo: "Vuelve a intentarlo desde su perfil en unos minutos.",

  errRetiroFormato: "El importe o la dirección no tienen un formato válido.",
  errRetiroFormatoApoyo: "Revísalos y vuelve a intentarlo.",
  errRetiroMinimo: (minimo: string) => `El importe queda por debajo del mínimo de ${minimo}.`,
  errRetiroMinimoApoyo: (importe: string) => `Importe solicitado: ${importe}.`,
  errRetiroSaldo: (disponible: string) =>
    `El importe supera el saldo disponible de ${disponible}.`,
  errRetiroSaldoApoyo: "El importe pendiente de confirmación no puede retirarse.",
  errRetiroYaHayUna: (importe: string) => `Existe una solicitud pendiente de ${importe}.`,
  errRetiroYaHayUnaApoyo: "Solo se admite una solicitud simultánea. La solicitud actual puede cancelarse para crear otra.",
  errRetiroNoRegistrado: "No se ha podido registrar la solicitud.",
  errRetiroNoRegistradoApoyo: "No se ha descontado ningún importe. Vuelve a intentarlo.",

  // ── El bot ────────────────────────────────────────────────────────────────
  //
  // El bot habla el idioma del agente igual que la Mini App. Los dos son la
  // misma aplicación vista desde sitios distintos, y un menú en español delante
  // de una pantalla en árabe delata que la traducción se hizo por encima.
  //
  // Los comandos de gestión —/codigo, /agentes, /retiros, /panel— NO están
  // aquí: los usa una sola persona y traducirlos sería trabajo sin destino.
  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "El acceso requiere un código de activación, que proporciona el Operador.",
  botCuandoLoTengas: "Con el código, vincula tu cuenta desde aquí.",
  botHola: (nombre: string) => `Hola, ${nombre}. Selecciona una opción.`,
  botVincularCuenta: "Vincular mi cuenta",
  botSuspendido: "La cuenta está suspendida. Contacta con el Operador para reactivarla.",
  botSinPublicar: "La aplicación aún no está publicada. Notifícalo al Operador.",
  botCadaComando: "Cada comando abre una pantalla:",
  botOStart: "O /start para el menú completo.",
  botComandoDesconocido: "Comando no reconocido. Usa /ayuda.",
  botUsaStart: "Usa /start para abrir la aplicación.",
  /* ── El atajo del alta ──────────────────────────────────────────────────
   *
   * `/activar` es el nombre del comando y NO se traduce: es la ruta de la Mini
   * App, y un `/attiva` italiano obligaría al bot a conocer cinco alfabetos
   * para hacer lo mismo. Lo que sí se traduce es la explicación, que es lo que
   * el agente necesita leer en el suyo.
   */
  botActivarAtajo: "/activar correo@ejemplo.com — activar sin abrir la aplicación",
  botActivarComoSeUsa: "Indica el correo tras el comando: /activar correo@ejemplo.com",
  botSinCuenta: "No hay cuenta de agente asociada. Usa /start para crearla.",
  botActivado: (email: string) => `${email} activado en tu equipo, con un año de PRO.`,
  // El alta está hecha aunque el año no haya entrado, y se dicen las dos cosas:
  // fingir que todo fue bien deja al agente sin saber que tiene algo que hacer.
  botActivadoSinPro: (email: string) => `${email} activado en tu equipo.`,
  botActivadoSinProApoyo: "El año de PRO no se ha aplicado. Reintenta la concesión desde su perfil.",

  // Avisos que salen del panel hacia el agente.
  botRetiroPagado: (importe: string) => `Pago emitido: ${importe}.`,
  // ── Aviso diario: el equipo se está apagando ──────────────────────────────
  botRedTitulo: "Webmasters sin actividad",
  botRedParados: (n: number, total: number) =>
    `${n} de ${total} webmasters sin registros recientes:`,
  botRedDiasParado: (dias: number) => `${dias} ${dias === 1 ? "día" : "días"} sin actividad`,
  // La consecuencia va en la cadena, no en la cabeza de quien lea. «Con
  // problemas» a secas se puede leer como una molestia menor; lo que hace que
  // el agente coja el teléfono es saber que ese webmaster no produce.
  botRedIncidencias: (n: number) =>
    `${n} ${n === 1 ? "webmaster" : "webmasters"} con problemas en Sophon; no ${
      n === 1 ? "puede" : "pueden"
    } generar registros:`,
  botRedYOtros: (n: number) => `…y ${n} más.`,
  botRedComoVerlo: "Consulta «Mi equipo» para revisar sus enlaces de captación.",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `Referencia: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `Retiro de ${importe} aprobado. El pago se emitirá en los próximos días.`,
  botRetiroRechazado: (importe: string) =>
    `Retiro de ${importe} rechazado. El importe vuelve a estar disponible.`,
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
    `Válido durante ${minutos} minutos y de un solo uso.`,
  correoOtpNoPedido: "Si no has solicitado el acceso a Sophon Promoters, ignora este mensaje. Sin el código no es posible acceder a la cuenta.",
  /* El correo no puede llevar un boton que copie: no ejecuta JavaScript.
     Lo mas rapido que si existe es mantener pulsado el bloque del codigo, que
     va con `user-select: all` para que la seleccion salga entera al primer
     intento en vez de por caracteres. Esto lo dice. */
  correoOtpTocaParaCopiar: "Mantén pulsado el código para copiarlo.",
  /* La única línea legal del correo, y va traducida porque es una frase, no un
     dato: la razón social, la dirección y el dominio se escriben igual en las
     cinco lenguas y por eso viven en `lib/correo.ts` y no aquí. */
  correoPieMarca: "Sophon es una marca registrada de New Sophon Technology Limited.",

  // ── Lo que cobra el AGENTE, dicho entero ──────────────────────────────────
  //
  // Sustituye a `comoCobras`, que prometía «0,03 $» escrito a mano en los cinco
  // catálogos. Los 0,03 son la tarifa vigente, un valor que el Operador cambia
  // desde su panel: la cifra entra ahora por parámetro desde
  // `/api/agente/comisiones` y estas cadenas solo ponen la frase.
  loQueCobrasTu: "Tu comisión",
  cobrasPorRegistro: (importe: string) =>
    `${importe} por cada usuario registrado, con independencia del país.`,
  cobrasPorPro: (porcentaje: string) =>
    `${porcentaje} sobre las compras de PRO de esos usuarios.`,
  cobrasBonoMensual: "Bono mensual al alcanzar un nivel de registros con el conjunto del equipo.",

  // ── De dónde sale el saldo ────────────────────────────────────────────────
  //
  // La Escalera dice DÓNDE está el dinero; esto dice DE DÓNDE viene. Sin ello
  // el bono desaparecía en cuanto se cobraba: entraba en el total y no había
  // forma de volver a verlo.
  deDondeSale: "Origen del saldo",
  porRegistros: "Registros",
  porComprasPro: "Compras de PRO",
  porBonos: "Bonos",
  porAjustes: "Ajustes",
  deDondeSaleApoyo: "Total acumulado desglosado por concepto.",
  bonosCobrados: "Bonos registrados",
  bonoNivelDe: (usuarios: number) =>
    `Nivel de ${usuarios.toLocaleString("es-ES")} registros`,
  bonoSinNivel: "Bono del mes",
  todaviaEnRevision: "pendiente de confirmación",
  sinBonos: "No hay bonos registrados.",
  sinBonosApoyo: "El bono se asigna al alcanzar un nivel de registros dentro del mes natural. El cómputo se reinicia el día 1.",

  // ── Ayuda ─────────────────────────────────────────────────────────────────
  ayuda: "Ayuda",
  ayudaApoyo: "Comisiones, activaciones, saldo y cobros.",
  ayudaNoResuelta: "¿No encuentras tu caso?",
  ayudaNoResueltaApoyo: "Escríbenos por el bot. La respuesta llegará por el mismo canal.",
  // ── El buscador de la ayuda ───────────────────────────────────────────────
  buscarEnLaAyuda: "Buscar en la ayuda",
  limpiarBusqueda: "Borrar la búsqueda",
  preguntasEncontradas: (encontradas: number, total: number) =>
    `${encontradas} de ${total} ${total === 1 ? "pregunta" : "preguntas"}`,
  sinResultados: (termino: string) => `Sin resultados para «${termino}».`,
  // ── La pantalla que no existe ─────────────────────────────────────────────
  //
  // Era la ÚNICA pantalla del agente escrita a mano y sin traducir: un agente
  // árabe que abriera un enlace viejo se encontraba con dos frases en español.
  // Estaba en un componente de servidor para no cruzar el catálogo a cliente, y
  // el argumento ya no vale: las demás pantallas de la Mini App son de cliente
  // y el catálogo va en el fragmento común, así que traerlo aquí no añade un
  // solo kilobyte.
  paginaNoExiste: "La página no existe.",
  paginaNoExisteApoyo: "El enlace puede pertenecer a una versión anterior de la aplicación.",
  // ── El medidor de objetivos del bono ──────────────────────────────────────
  objetivosDelBono: "Objetivos del bono",
  nivelesAlcanzados: (alcanzados: number, total: number) =>
    `${alcanzados} de ${total} ${total === 1 ? "nivel" : "niveles"}`,
  faltanRegistros: (n: number) =>
    `${n.toLocaleString("es-ES")} ${n === 1 ? "registro" : "registros"} para el siguiente`,
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
  verMiRed: "View team",
  verSuFicha: "View profile",
  volverAlInicio: "Back to home",
  precios: "Prices",
  preciosDelPrograma: "Program prices",
  preciosParaEnsenar: "Price per registered user for your webmasters.",
  loQueCobraTuWebmaster: "Webmaster commission",
  porCadaCienUsuarios: "Per 100 registered users",
  paisesDelTier: (n: number) => `${n} ${n === 1 ? "country" : "countries"}`,
  nivelDeLaCuenta: "Account level",
  losNiveles: "Level system",
  tocaUnNivel: "Select a level to see its rates.",
  nivelInicial: "Starting level",
  cuandoSeAplicaElNivel: "The count closes on the last day of each month. The resulting level applies from the 1st of the following month.",
  nivelHaceFalta: (importe: string) => `from ${importe}`,
  nivel: "Level",
  comoSubeElNivel: "The level depends on the total amount the webmaster's users pay for PRO. The higher the accumulated volume, the sooner the level goes up.",
  repartoDeLasCompras: (webmaster: string) =>
    `The webmaster also receives ${webmaster} of whatever their users pay for PRO.`,
  repartoDelAgente: (agente: string) => `Your commission on those purchases is ${agente}.`,
  tuComisionNoDependeDelNivel: "Your commission is the same at every level.",
  sinPrecios: "No rates available.",
  sinPreciosApoyo: "Sophon did not return the price table. Try again in a few minutes.",
  activarElPrimero: "Activate the first one",

  sinWebmasters: "No webmasters activated.",
  sinWebmastersApoyo: "Activate them with their Sophon-registered email.",
  sinIngresos: "No sign-ups yet.",
  sinIngresosApoyo: "Sign-ups will appear here as soon as they come through the team's links.",
  sinMovimientos: "No payouts requested.",

  bienvenida: "Agent sign-in",
  bienvenidaApoyo: "Team, sign-ups and balance in a single panel. Sign in with your email.",

  entrarEnTuCuenta: "Sign in",
  introduceTuCorreo: "Enter your email. If the account exists, a verification code will be sent.",
  codigoDeActivacion: "Activation code",
  teLoDaElOperador: "Provided by the Operator.",
  tuCorreo: "Your email",
  seraTuIdentificador: "It is your identifier on Sophon.",
  correoSinCuenta: "No account is associated with this email.",
  correoSinCuentaApoyo: "Enter the activation code to create the account.",
  enviarmeElCodigo: "Send code",
  confirmaQueEresTu: "Verify email",
  otpEnviado: (email: string) => `Code sent to ${email}. Valid for 10 minutes.`,
  codigoDeVerificacion: "Verification code",
  cambiarElCorreo: "Change email",
  reenviarEn: (segundos: number) => `Resend in ${segundos}s`,
  reenviarElCodigo: "Resend code",
  pegarCodigo: "Paste",
  codigoProgreso: (puestos: number, total: number) => `${puestos} of ${total}`,
  codigoCompleto: "Code complete",

  devengadoTreintaDias: "Earned · 30 days",
  registrosYWebmasters: (registros: number, webmasters: number) =>
    `${registros.toLocaleString("en-US")} ${
      registros === 1 ? "sign-up" : "sign-ups"
    } · ${webmasters} ${webmasters === 1 ? "webmaster" : "webmasters"}`,
  repartoPorTier: "Sign-ups by level",
  acciones: "Actions",
  estadoDeTuDinero: "Balance status",
  bonoDelMes: "Monthly bonus",
  registrosEsteMes: (n: number) =>
    `${n.toLocaleString("en-US")} ${n === 1 ? "sign-up" : "sign-ups"} this month`,
  faltanParaElBono: (faltan: number, premio: string) =>
    `${faltan.toLocaleString("en-US")} ${
      faltan === 1 ? "sign-up" : "sign-ups"
    } remaining for ${premio}.`,
  bonoMaximoAlcanzado: "Top level of the month reached.",
  bonoGanado: (importe: string) => `${importe} accrued`,
  bonoExtraSi: (umbral: number) =>
    `extra on reaching ${umbral.toLocaleString("en-US")} ${
      umbral === 1 ? "sign-up" : "sign-ups"
    } this month`,
  bonoMasSiLlegas: (importe: string, umbral: number) =>
    `${importe} extra on reaching ${umbral.toLocaleString("en-US")} ${
      umbral === 1 ? "sign-up" : "sign-ups"
    }`,
  bonoYaEsTuyo: "confirmed",
  bonoEsteMesLlevas: (registros: number, faltan: number) =>
    `${registros.toLocaleString("en-US")} sign-ups this month · ${faltan.toLocaleString(
      "en-US",
    )} remaining`,
  ritmoYRecta: (ritmo: number, dias: number) =>
    `Averaging ${ritmo.toLocaleString("en-US")} ${
      ritmo === 1 ? "sign-up" : "sign-ups"
    } per day. ${dias} ${dias === 1 ? "day" : "days"} left in the month.`,
  loAlcanzarasEl: (dia: number) => `At this rate it will be reached on day ${dia}.`,
  cerrarasElMesEn: (registros: number) =>
    `Projected month-end total: ${registros.toLocaleString("en-US")} sign-ups.`,
  frenteAlMesPasado: (porcentaje: number) =>
    `${porcentaje >= 0 ? "+" : "−"}${Math.abs(porcentaje)} % vs last month`,
  quienTeAcerca: "Contribution by webmaster",

  correoDelWebmaster: "Webmaster's email",
  tieneQueExistirYa: "Must be an account already registered on Sophon.",
  yaEstaEnTuRed: (email: string) => `${email} is already on your team.`,
  cobrarasDesdeHoy: "Only sign-ups after activation are counted.",

  conIncidencia: (n: number) => `${n} with ${n === 1 ? "a problem" : "problems"}`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} with no activity in the last ${dias} ${dias === 1 ? "day" : "days"}, out of ${total}`,
  todosProduciendo: (n: number) => `${n} active`,
  escalaComun: (dias: number) =>
    `Each column covers ${dias} ${dias === 1 ? "day" : "days"}. All bars share the same scale.`,

  bloqueado: "Blocked",
  seVaABorrar: "Removal scheduled",
  desaparecido: "Removed from Sophon",
  proCaducado: "PRO expired",
  sinActividad: "No activity",
  diasParado: (dias: number) => `${dias} ${dias === 1 ? "day" : "days"} inactive`,
  activoEnSophon: "Active on Sophon",
  bloqueadoEnSophon: "Blocked on Sophon",
  pendienteDeBorrado: "Removal scheduled",
  yaNoApareceEnSophon: "No longer listed on Sophon",
  estadoSinComprobar: "Status not checked",
  pendienteDeConfirmar: "Confirming",
  pendienteDeConfirmarApoyo: "Sophon has not published the link yet. It resolves automatically.",

  enTuRedDesde: (fecha: string) => `on the team since ${fecha}`,
  teHaDado: "Contribution",
  registrosEnDias: (registros: number, dias: number) =>
    `${registros.toLocaleString("en-US")} ${
      registros === 1 ? "sign-up" : "sign-ups"
    } in ${dias} ${dias === 1 ? "day" : "days"}`,
  compraronPro: (n: number) => `${n} ${n === 1 ? "has" : "have"} bought PRO`,
  cobrasDesde: (fecha: string) => `Sign-ups count from ${fecha}.`,
  ultimosDias: (dias: number) => (dias === 1 ? "Last day" : `Last ${dias} days`),
  todaviaSinRegistros: "No sign-ups contributed.",
  registroDeSondeo: "Activity",

  susEnlaces: "Their links",
  conQueCapta: "Acquisition links. Real-time data from Sophon.",
  sinEnlaces: "No links published.",
  enlacesNoDisponibles: "The links could not be retrieved. Try again later.",
  enlaceCopiado: "Link copied",
  dolares: (importe: string) => `${importe} dollars`,
  numero: (n: number) => n.toLocaleString("en-US"),
  registrosCortos: (n: number) =>
    `${n.toLocaleString("en-US")} ${n === 1 ? "sign-up" : "sign-ups"}`,

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
  vasAActivar: "Account to activate",
  corregirElCorreo: "Edit email",
  altaNoSeDeshace: "Activation is irreversible: the webmaster stays linked to your account on Sophon.",
  proConcedido: (fecha: string) => `PRO active until ${fecha}.`,
  proNoConcedido: "Webmaster activated. PRO could not be granted.",
  proNoConcedidoApoyo: "Retry the grant from their profile. There is no need to repeat the activation.",
  renovarUnAnio: "Renew for a year",
  darUnAnio: "Grant one year of PRO",
  renovado: (email: string, fecha: string) => `${email} has PRO until ${fecha}.`,
  colaRenovaciones: "Renewals",
  puedesRenovar: (n: number) => `${n} pending renewal`,
  ningunoRenovable: "No renewals pending.",
  nuncaTuvoPro: "No previous PRO",
  puedesRenovarAhora: "Renewal available",
  proActivo: "PRO active",
  podrasRenovarloCuandoSeApague: "Renewal becomes available once PRO expires.",

  enDias: (dias: number) => `over ${dias} ${dias === 1 ? "day" : "days"}`,
  tocaUnDia: "Select a day to see the breakdown.",
  columnaDia: "Day",
  columnaDolares: "Dollars",
  perforando: "Loading breakdown",
  aquiEmpieza: "Start of the history. There is no earlier data.",
  desglose: (registros: number, t1: number, t2: number, t3: number) =>
    `${registros.toLocaleString("en-US")} ${
      registros === 1 ? "sign-up" : "sign-ups"
    } · T1 ${t1} · T2 ${t2} · T3 ${t3}`,
  dePago: (n: number) => `${n} ${n === 1 ? "has paid" : "have paid"}`,
  diaAbierto: "Day in progress: figures may change.",

  soloConsolidado: "The available amount is ready to withdraw. Confirming the pending amount takes 1 to 3 days.",
  revisionManual: "Manual review. Estimated turnaround: 1 to 3 days.",
  solicitudEnCurso: "Request in progress",
  pendienteDeRevision: "Awaiting review",
  aprobadoPendientePago: "Approved · payment pending",
  estadoPagado: "Paid",
  estadoRechazado: "Rejected",
  estadoCancelado: "Canceled",
  pedidaEl: (fecha: string) => `Requested on ${fecha}.`,
  soloUnaALaVez: "Only one request at a time is allowed. The next one can be made once this is resolved.",
  cuanto: "Amount to withdraw",
  todo: "All",
  disponibleYMinimo: "Available",
  minimo: "minimum",
  tePasasEn: (importe: string) => `You are ${importe} over what you have available.`,
  teFaltanParaElMinimo: (importe: string) => `You need ${importe} more to reach the minimum.`,
  enQueRed: "Which network",
  walletUsdt: "USDT wallet",
  usdtEn: (red: string, pista: string) =>
    `USDT on ${red}. ${pista} An address from another network means the payment is lost.`,
  direccionMalFormada: (red: string, pista: string) =>
    `Invalid address for ${red}. ${pista}`,
  pistaTrc20: "Starts with T and is 34 characters long.",
  pistaBsc: "Starts with 0x and is 42 characters long.",
  pistaTon: "Starts with EQ or UQ and is 48 characters long.",
  pedirImporte: (importe: string) => `Withdraw ${importe}`,
  solicitudesAnteriores: "Earlier payouts",

  sesionCaducada: "The session has expired.",
  sesionCaducadaApoyo: "Sign in again with your email. No data is lost.",
  algoHaFallado: "The operation could not be completed.",
  algoHaFalladoApoyo: "No changes were applied. Try again.",

  errSinTelegram: "Telegram has not verified your access.",
  errSinTelegramApoyo: "Open the app from the bot.",
  errSuspendido: "The account is suspended.",
  errSuspendidoApoyo: "Contact the Operator to restore access.",

  errFormatoCodigoCorreo: "The code or the email has an invalid format.",
  errFormatoCodigoCorreoApoyo: "Check them and try again.",
  errCodigoNoVale: "The activation code is invalid or has expired.",
  errCodigoUsado: "The activation code has already been used.",
  errCodigoUsadoApoyo: "Request a new one from the Operator.",
  errCodigoOtroCorreo: "The code was issued for a different email.",
  errCodigoOtroCorreoApoyo: "It is only valid with the email it was issued for.",
  errTelegramYaVinculado: (correo: string) =>
    `This Telegram account is already linked to ${correo}.`,
  errTelegramYaVinculadoApoyo: "Enter that email to sign in without a code.",
  errDemasiadosEnvios: "Too many codes have been requested in a row.",
  errDemasiadosEnviosApoyo: "Wait a few minutes and try again.",
  errEsperaParaOtroCodigo: (segundos: number) =>
    `Another code can be requested in ${segundos} seconds.`,
  errCorreoNoEnviado: "The email could not be sent.",
  errCorreoNoEnviadoApoyo: "Check the address and try again in a minute.",
  errDatosNoValidos: "The details are not valid.",
  errDatosNoValidosApoyo: "The verification code is 6 digits long.",
  errOtpCaducado: "The verification code has expired.",
  errOtpCaducadoApoyo: "Codes expire after 10 minutes. Request a new one.",
  errOtpSinIntentos: "No attempts left.",
  errOtpSinIntentosApoyo: "The code is void. Request a new one.",
  errOtpIncorrecto: (restantes: number) =>
    `Incorrect verification code. ${restantes} ${
      restantes === 1 ? "attempt" : "attempts"
    } left.`,
  errOtpOtraCuenta: "The code was requested from a different Telegram account.",
  errOtpOtraCuentaApoyo: "It is only valid on the account that requested it.",
  errCorreoYaVinculado: "The email is already linked to another Telegram account.",
  errCorreoYaVinculadoApoyo: "Contact the Operator to change the link.",
  errNoVinculado: "The account could not be linked.",
  errNoVinculadoApoyo: "The activation code remains unused. Try again.",
  errFormatoCorreo: "The email has an invalid format.",
  errFormatoCorreoApoyo: "Enter the email they registered with on Sophon.",

  errYaEnTuEquipo: "The webmaster is already on your team.",
  errYaEnTuEquipoApoyo: "See it under «My team».",
  errDeOtroAgente: "The webmaster is assigned to another agent.",
  errDeOtroAgenteApoyo: "Each webmaster has a single assigned agent. Contact the Operator if this is a mistake.",
  errYaEnSophon: "The account already existed on Sophon.",
  errYaEnSophonApoyo: "Only accounts registered through your team can be activated. Pre-existing ones belong to the Operator.",
  errNoExisteEnSophon: "The email does not exist on Sophon.",
  errNoExisteEnSophonApoyo: "The account must be registered on Sophon before it can be activated.",
  errSinWhitelist: "The account is not authorized on Sophon.",
  errSinWhitelistApoyo: "Authorization is handled manually with support. Nothing has been activated.",
  errSophonNoResponde: "Sophon is not responding.",
  errSophonNoRespondeApoyo: "Nothing has been activated. Try again in a few minutes.",
  errSophonRechaza: "Sophon has rejected the activation.",
  errSophonRechazaApoyo: "Nothing has been activated. The Operator has been notified.",
  errAltaNoRegistrada: "The activation could not be recorded.",
  errAltaNoRegistradaApoyo: "No changes were applied. Try again.",
  errSinClasificar: "The activation could not be completed.",
  errSinClasificarApoyo: "Nothing has been activated. The error has been logged.",

  errNoEsTuyo: "The webmaster is not on your team.",
  errNoEsTuyoApoyo: "Only PRO for webmasters you activated can be renewed.",
  errNoEsTuyoAbrirApoyo: "Check the email. If it is not activated yet, do it from «Activate webmaster».",
  errProSigueActivo: "PRO is still active.",
  errProSigueActivoApoyo: "Renewal becomes available once it expires.",
  errProNoRegistrado: "PRO could not be recorded.",
  errProNoRegistradoApoyo: "No changes were applied. Try again from their profile.",
  errProSinWhitelist: "The account is not authorized on Sophon.",
  errProSinWhitelistApoyo: "Authorization is handled manually with support.",
  errProRechazado: "Sophon rejected the PRO grant.",
  errProRechazadoApoyo: "Try again from their profile in a few minutes.",

  errRetiroFormato: "The amount or the address has an invalid format.",
  errRetiroFormatoApoyo: "Check them and try again.",
  errRetiroMinimo: (minimo: string) => `The amount is below the ${minimo} minimum.`,
  errRetiroMinimoApoyo: (importe: string) => `Requested amount: ${importe}.`,
  errRetiroSaldo: (disponible: string) =>
    `The amount exceeds the available balance of ${disponible}.`,
  errRetiroSaldoApoyo: "The amount pending confirmation cannot be withdrawn.",
  errRetiroYaHayUna: (importe: string) => `There is a pending request for ${importe}.`,
  errRetiroYaHayUnaApoyo:
    "Only one request at a time is allowed. The current request can be canceled to create another.",
  errRetiroNoRegistrado: "The request could not be recorded.",
  errRetiroNoRegistradoApoyo: "No amount was deducted. Try again.",

  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "Access requires an activation code, provided by the Operator.",
  botCuandoLoTengas: "With the code, link your account here.",
  botHola: (nombre: string) => `Hello, ${nombre}. Select an option.`,
  botVincularCuenta: "Link my account",
  botSuspendido: "The account is suspended. Contact the Operator to reactivate it.",
  botSinPublicar: "The application is not published yet. Notify the Operator.",
  botCadaComando: "Each command opens a screen:",
  botOStart: "Or /start for the full menu.",
  botComandoDesconocido: "Command not recognized. Use /ayuda.",
  botUsaStart: "Use /start to open the app.",
  botActivarAtajo: "/activar email@example.com — activate without opening the app",
  botActivarComoSeUsa: "Provide the email after the command: /activar email@example.com",
  botSinCuenta: "No agent account is associated. Use /start to create one.",
  botActivado: (email: string) => `${email} activated on your team, with one year of PRO.`,
  botActivadoSinPro: (email: string) => `${email} activated on your team.`,
  botActivadoSinProApoyo: "The year of PRO was not applied. Retry the grant from their profile.",

  botRetiroPagado: (importe: string) => `Payment issued: ${importe}.`,
  botRedTitulo: "Inactive webmasters",
  botRedParados: (n: number, total: number) =>
    `${n} of ${total} webmasters with no recent sign-ups:`,
  botRedDiasParado: (dias: number) => `${dias} ${dias === 1 ? "day" : "days"} inactive`,
  botRedIncidencias: (n: number) =>
    `${n} ${n === 1 ? "webmaster" : "webmasters"} with problems on Sophon; ${
      n === 1 ? "it" : "they"
    } cannot generate sign-ups:`,
  botRedYOtros: (n: number) => `…and ${n} more.`,
  botRedComoVerlo: "Check «My team» to review their acquisition links.",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `Reference: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `Payout of ${importe} approved. The payment will be issued in the coming days.`,
  botRetiroRechazado: (importe: string) =>
    `Payout of ${importe} rejected. The amount is available again.`,
  botMotivo: (motivo: string) => `Reason: ${motivo}`,

  // ── El correo del código de acceso ────────────────────────────────────────
  correoOtpAsunto: (codigo: string) => `${codigo} is your access code`,
  correoOtpTuCodigo: "Your verification code:",
  correoOtpCaduca: (minutos: number) =>
    `Valid for ${minutos} minutes and single use only.`,
  correoOtpNoPedido: "If you did not request access to Sophon Promoters, ignore this message. Without the code the account cannot be accessed.",
  correoOtpTocaParaCopiar: "Press and hold the code to copy it.",
  correoPieMarca: "Sophon is a registered trademark of New Sophon Technology Limited.",

  loQueCobrasTu: "Your commission",
  cobrasPorRegistro: (importe: string) =>
    `${importe} per registered user, regardless of country.`,
  cobrasPorPro: (porcentaje: string) =>
    `${porcentaje} on those users' PRO purchases.`,
  cobrasBonoMensual: "Monthly bonus on reaching a sign-up level across the whole team.",

  deDondeSale: "Balance breakdown",
  porRegistros: "Sign-ups",
  porComprasPro: "PRO purchases",
  porBonos: "Bonuses",
  porAjustes: "Adjustments",
  deDondeSaleApoyo: "Accumulated total broken down by source.",
  bonosCobrados: "Recorded bonuses",
  bonoNivelDe: (usuarios: number) =>
    `${usuarios.toLocaleString("en-US")} sign-up level`,
  bonoSinNivel: "Monthly bonus",
  todaviaEnRevision: "pending confirmation",
  sinBonos: "No bonuses recorded.",
  sinBonosApoyo: "The bonus is granted on reaching a sign-up level within the calendar month. The count resets on the 1st.",

  ayuda: "Help",
  ayudaApoyo: "Commissions, activations, balance and payouts.",
  ayudaNoResuelta: "Not covered here?",
  ayudaNoResueltaApoyo: "Write to us on the bot. The reply arrives through the same channel.",
  buscarEnLaAyuda: "Search the help",
  limpiarBusqueda: "Clear the search",
  preguntasEncontradas: (encontradas: number, total: number) =>
    `${encontradas} of ${total} ${total === 1 ? "question" : "questions"}`,
  sinResultados: (termino: string) => `No results for «${termino}».`,
  paginaNoExiste: "The page does not exist.",
  paginaNoExisteApoyo: "The link may belong to an earlier version of the application.",
  objetivosDelBono: "Bonus targets",
  nivelesAlcanzados: (alcanzados: number, total: number) =>
    `${alcanzados} of ${total} ${total === 1 ? "level" : "levels"}`,
  faltanRegistros: (n: number) =>
    `${n.toLocaleString("en-US")} ${n === 1 ? "sign-up" : "sign-ups"} to the next one`,
};

const it: Cadenas = {
  inicio: "Inizio",
  red: "La mia squadra",
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
  verMiRed: "Vedi squadra",
  verSuFicha: "Vedi profilo",
  volverAlInicio: "Torna all'inizio",
  precios: "Prezzi",
  preciosDelPrograma: "Prezzi del programma",
  preciosParaEnsenar: "Prezzo per utente registrato per i tuoi webmaster.",
  loQueCobraTuWebmaster: "Commissione del webmaster",
  porCadaCienUsuarios: "Ogni 100 utenti registrati",
  paisesDelTier: (n: number) => `${n} ${n === 1 ? "paese" : "paesi"}`,
  nivelDeLaCuenta: "Livello dell\'account",
  losNiveles: "Sistema di livelli",
  tocaUnNivel: "Seleziona un livello per vedere le sue tariffe.",
  nivelInicial: "Livello iniziale",
  cuandoSeAplicaElNivel: "Il conteggio si chiude l'ultimo giorno di ogni mese. Il livello risultante si applica dal giorno 1 del mese successivo.",
  nivelHaceFalta: (importe: string) => `da ${importe}`,
  nivel: "Livello",
  comoSubeElNivel: "Il livello dipende dall'importo totale che gli utenti del webmaster pagano per il PRO. Maggiore è il volume accumulato, prima sale di livello.",
  repartoDeLasCompras: (webmaster: string) =>
    `Il webmaster riceve inoltre il ${webmaster} di quanto i suoi utenti pagano per il PRO.`,
  repartoDelAgente: (agente: string) => `La tua commissione su quegli acquisti è il ${agente}.`,
  tuComisionNoDependeDelNivel: "La tua commissione è la stessa in tutti i livelli.",
  sinPrecios: "Nessuna tariffa disponibile.",
  sinPreciosApoyo: "Sophon non ha restituito la tabella prezzi. Riprova tra qualche minuto.",
  activarElPrimero: "Attiva il primo",

  sinWebmasters: "Nessun webmaster attivato.",
  sinWebmastersApoyo: "Attivali con la loro email registrata su Sophon.",
  sinIngresos: "Nessuna registrazione finora.",
  sinIngresosApoyo: "Le registrazioni appariranno qui non appena arriveranno dai link della squadra.",
  sinMovimientos: "Nessun prelievo richiesto.",

  bienvenida: "Accesso agenti",
  bienvenidaApoyo: "Squadra, registrazioni e saldo in un unico pannello. Accedi con la tua email.",

  entrarEnTuCuenta: "Entra",
  introduceTuCorreo: "Inserisci la tua email. Se l'account esiste, verrà inviato un codice di verifica.",
  codigoDeActivacion: "Codice di attivazione",
  teLoDaElOperador: "Fornito dall'Operatore.",
  tuCorreo: "La tua email",
  seraTuIdentificador: "È il tuo identificativo su Sophon.",
  correoSinCuenta: "L'email non ha un account associato.",
  correoSinCuentaApoyo: "Inserisci il codice di attivazione per creare l'account.",
  enviarmeElCodigo: "Invia codice",
  confirmaQueEresTu: "Verifica email",
  otpEnviado: (email: string) => `Codice inviato a ${email}. Valido per 10 minuti.`,
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
  estadoDeTuDinero: "Stato del saldo",
  bonoDelMes: "Bonus del mese",
  registrosEsteMes: (n: number) =>
    `${n.toLocaleString("it-IT")} ${n === 1 ? "iscrizione" : "iscrizioni"} questo mese`,
  faltanParaElBono: (faltan: number, premio: string) =>
    `${faltan === 1 ? "Manca" : "Mancano"} ${faltan.toLocaleString("it-IT")} ${
      faltan === 1 ? "registrazione" : "registrazioni"
    } per ${premio}.`,
  bonoMaximoAlcanzado: "Livello massimo del mese raggiunto.",
  bonoGanado: (importe: string) => `Maturato ${importe}`,
  bonoExtraSi: (umbral: number) =>
    `aggiuntivo al raggiungimento di ${umbral.toLocaleString("it-IT")} ${
      umbral === 1 ? "registrazione" : "registrazioni"
    } questo mese`,
  bonoMasSiLlegas: (importe: string, umbral: number) =>
    `${importe} in più al raggiungimento di ${umbral.toLocaleString("it-IT")} ${
      umbral === 1 ? "registrazione" : "registrazioni"
    }`,
  bonoYaEsTuyo: "confermato",
  bonoEsteMesLlevas: (registros: number, faltan: number) =>
    `${registros.toLocaleString("it-IT")} registrazioni questo mese · ${
      faltan === 1 ? "manca" : "mancano"
    } ${faltan.toLocaleString("it-IT")}`,
  ritmoYRecta: (ritmo: number, dias: number) =>
    `Media di ${ritmo.toLocaleString("it-IT")} ${
      ritmo === 1 ? "registrazione" : "registrazioni"
    } al giorno. ${dias === 1 ? "Manca" : "Mancano"} ${dias} ${dias === 1 ? "giorno" : "giorni"} alla fine del mese.`,
  loAlcanzarasEl: (dia: number) => `A questo ritmo sarà raggiunto il giorno ${dia}.`,
  cerrarasElMesEn: (registros: number) =>
    `Proiezione di chiusura del mese: ${registros.toLocaleString("it-IT")} registrazioni.`,
  frenteAlMesPasado: (porcentaje: number) =>
    `${porcentaje >= 0 ? "+" : "−"}${Math.abs(porcentaje)} % rispetto al mese scorso`,
  quienTeAcerca: "Contributo per webmaster",

  correoDelWebmaster: "Email del webmaster",
  tieneQueExistirYa: "Deve essere un account già registrato su Sophon.",
  yaEstaEnTuRed: (email: string) => `${email} è già nella tua squadra.`,
  cobrarasDesdeHoy: "Contano solo le registrazioni successive all'attivazione.",

  conIncidencia: (n: number) => `${n} con ${n === 1 ? "un problema" : "problemi"}`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} senza attività negli ultimi ${dias} ${dias === 1 ? "giorno" : "giorni"}, su ${total}`,
  todosProduciendo: (n: number) => `${n} attivi`,
  escalaComun: (dias: number) =>
    `Ogni colonna equivale a ${dias} ${dias === 1 ? "giorno" : "giorni"}. Tutte le barre usano la stessa scala.`,

  bloqueado: "Bloccato",
  seVaABorrar: "Rimozione programmata",
  desaparecido: "Rimosso da Sophon",
  proCaducado: "PRO scaduto",
  sinActividad: "Nessuna attività",
  diasParado: (dias: number) => `${dias} ${dias === 1 ? "giorno" : "giorni"} senza attività`,
  activoEnSophon: "Attivo su Sophon",
  bloqueadoEnSophon: "Bloccato su Sophon",
  pendienteDeBorrado: "Rimozione programmata",
  yaNoApareceEnSophon: "Non figura più su Sophon",
  estadoSinComprobar: "Stato non verificato",
  pendienteDeConfirmar: "In conferma",
  pendienteDeConfirmarApoyo: "Sophon non ha ancora pubblicato il collegamento. Si risolve automaticamente.",

  enTuRedDesde: (fecha: string) => `nella squadra dal ${fecha}`,
  teHaDado: "Contributo",
  registrosEnDias: (registros: number, dias: number) =>
    `${registros.toLocaleString("it-IT")} ${registros === 1 ? "iscrizione" : "iscrizioni"} in ${dias} ${
      dias === 1 ? "giorno" : "giorni"
    }`,
  compraronPro: (n: number) => `${n} ${n === 1 ? "ha" : "hanno"} comprato PRO`,
  cobrasDesde: (fecha: string) => `Contano le registrazioni dal ${fecha}.`,
  ultimosDias: (dias: number) => (dias === 1 ? "Ultimo giorno" : `Ultimi ${dias} giorni`),
  todaviaSinRegistros: "Nessuna registrazione apportata.",
  registroDeSondeo: "Attività",

  susEnlaces: "I suoi link",
  conQueCapta: "Link di acquisizione. Dati in tempo reale da Sophon.",
  sinEnlaces: "Nessun link pubblicato.",
  enlacesNoDisponibles: "Non è stato possibile consultare i link. Riprova più tardi.",
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

  incluyeUnAnio: "L'attivazione include un anno di PRO.",
  continuar: "Continua",
  vasAActivar: "Account da attivare",
  corregirElCorreo: "Correggi email",
  altaNoSeDeshace: "L'attivazione è irreversibile: il webmaster resta collegato al tuo account su Sophon.",
  proConcedido: (fecha: string) => `PRO attivo fino al ${fecha}.`,
  proNoConcedido: "Webmaster attivato. Non è stato possibile concedere il PRO.",
  proNoConcedidoApoyo: "Riprova la concessione dal suo profilo. Non serve ripetere l'attivazione.",
  renovarUnAnio: "Rinnova un anno",
  darUnAnio: "Concedi un anno di PRO",
  renovado: (email: string, fecha: string) => `${email} ha il PRO fino al ${fecha}.`,
  colaRenovaciones: "Rinnovi",
  puedesRenovar: (n: number) => `${n} in attesa di rinnovo`,
  ningunoRenovable: "Nessun rinnovo in sospeso.",
  nuncaTuvoPro: "Nessun PRO precedente",
  puedesRenovarAhora: "Rinnovo disponibile",
  proActivo: "PRO attivo",
  podrasRenovarloCuandoSeApague: "Il rinnovo sarà disponibile alla scadenza del PRO.",

  enDias: (dias: number) => `in ${dias} ${dias === 1 ? "giorno" : "giorni"}`,
  tocaUnDia: "Seleziona un giorno per vedere il dettaglio.",
  columnaDia: "Giorno",
  columnaDolares: "Dollari",
  perforando: "Caricamento del dettaglio",
  aquiEmpieza: "Inizio dello storico. Non ci sono dati precedenti.",
  desglose: (registros: number, t1: number, t2: number, t3: number) =>
    `${registros.toLocaleString("it-IT")} ${
      registros === 1 ? "iscrizione" : "iscrizioni"
    } · T1 ${t1} · T2 ${t2} · T3 ${t3}`,
  dePago: (n: number) => `${n} ${n === 1 ? "ha pagato" : "hanno pagato"}`,
  diaAbierto: "Giorno in corso: i dati possono variare.",

  soloConsolidado: "L'importo disponibile è pronto per il prelievo. La conferma dell'importo in sospeso richiede da 1 a 3 giorni.",
  revisionManual: "Verifica manuale. Tempo stimato: da 1 a 3 giorni.",
  solicitudEnCurso: "Richiesta in corso",
  pendienteDeRevision: "In attesa di revisione",
  aprobadoPendientePago: "Approvato · pagamento in sospeso",
  estadoPagado: "Pagata",
  estadoRechazado: "Respinta",
  estadoCancelado: "Annullata",
  pedidaEl: (fecha: string) => `Richiesto il ${fecha}.`,
  soloUnaALaVez: "È ammessa una sola richiesta alla volta. La successiva potrà essere fatta alla risoluzione di questa.",
  cuanto: "Importo da prelevare",
  todo: "Tutto",
  disponibleYMinimo: "Disponibile",
  minimo: "minimo",
  tePasasEn: (importe: string) => `Superi di ${importe} quello che hai disponibile.`,
  teFaltanParaElMinimo: (importe: string) => `Ti mancano ${importe} per arrivare al minimo.`,
  enQueRed: "Su quale rete",
  walletUsdt: "Portafoglio USDT",
  usdtEn: (red: string, pista: string) =>
    `USDT su ${red}. ${pista} Un indirizzo di un'altra rete comporta la perdita del pagamento.`,
  direccionMalFormada: (red: string, pista: string) =>
    `Indirizzo non valido per ${red}. ${pista}`,
  pistaTrc20: "Inizia con T ed è lungo 34 caratteri.",
  pistaBsc: "Inizia con 0x ed è lungo 42 caratteri.",
  pistaTon: "Inizia con EQ o UQ ed è lungo 48 caratteri.",
  pedirImporte: (importe: string) => `Preleva ${importe}`,
  solicitudesAnteriores: "Prelievi precedenti",

  sesionCaducada: "La sessione è scaduta.",
  sesionCaducadaApoyo: "Accedi di nuovo con la tua email. Non si perde alcun dato.",
  algoHaFallado: "Non è stato possibile completare l'operazione.",
  algoHaFalladoApoyo: "Nessuna modifica è stata applicata. Riprova.",

  errSinTelegram: "Telegram non ha verificato il tuo accesso.",
  errSinTelegramApoyo: "Apri l'applicazione dal bot.",
  errSuspendido: "L'account è sospeso.",
  errSuspendidoApoyo: "Contatta l'Operatore per ripristinare l'accesso.",

  errFormatoCodigoCorreo: "Il codice o l'email non hanno un formato valido.",
  errFormatoCodigoCorreoApoyo: "Controllali e riprova.",
  errCodigoNoVale: "Il codice di attivazione non è valido o è scaduto.",
  errCodigoUsado: "Il codice di attivazione è già stato utilizzato.",
  errCodigoUsadoApoyo: "Richiedine uno nuovo all'Operatore.",
  errCodigoOtroCorreo: "Il codice è stato emesso per un'altra email.",
  errCodigoOtroCorreoApoyo: "È valido solo con l'email per cui è stato emesso.",
  errTelegramYaVinculado: (correo: string) =>
    `Questo account Telegram è già collegato a ${correo}.`,
  errTelegramYaVinculadoApoyo: "Inserisci quell'email per accedere senza codice.",
  errDemasiadosEnvios: "Sono stati richiesti troppi codici di seguito.",
  errDemasiadosEnviosApoyo: "Aspetta qualche minuto e riprova.",
  errEsperaParaOtroCodigo: (segundos: number) =>
    `Potrai richiedere un altro codice tra ${segundos} secondi.`,
  errCorreoNoEnviado: "Non è stato possibile inviare l'email.",
  errCorreoNoEnviadoApoyo: "Controlla l'indirizzo e riprova tra un minuto.",
  errDatosNoValidos: "I dati non sono validi.",
  errDatosNoValidosApoyo: "Il codice di verifica ha 6 cifre.",
  errOtpCaducado: "Il codice di verifica è scaduto.",
  errOtpCaducadoApoyo: "I codici scadono dopo 10 minuti. Richiedine uno nuovo.",
  errOtpSinIntentos: "Tentativi esauriti.",
  errOtpSinIntentosApoyo: "Il codice è annullato. Richiedine uno nuovo.",
  errOtpIncorrecto: (restantes: number) =>
    `Codice di verifica errato. ${restantes === 1 ? "Resta" : "Restano"} ${restantes} ${
      restantes === 1 ? "tentativo" : "tentativi"
    }.`,
  errOtpOtraCuenta: "Il codice è stato richiesto da un altro account Telegram.",
  errOtpOtraCuentaApoyo: "È valido solo sull'account che lo ha richiesto.",
  errCorreoYaVinculado: "L'email è già collegata a un altro account Telegram.",
  errCorreoYaVinculadoApoyo: "Contatta l'Operatore per modificare il collegamento.",
  errNoVinculado: "Non è stato possibile collegare l'account.",
  errNoVinculadoApoyo: "Il codice di attivazione resta inutilizzato. Riprova.",
  errFormatoCorreo: "L'email non ha un formato valido.",
  errFormatoCorreoApoyo: "Inserisci l'email con cui si è registrato su Sophon.",

  errYaEnTuEquipo: "Il webmaster è già nella tua squadra.",
  errYaEnTuEquipoApoyo: "Consultalo in «La mia squadra».",
  errDeOtroAgente: "Il webmaster è assegnato a un altro agente.",
  errDeOtroAgenteApoyo: "Ogni webmaster ha un solo agente assegnato. Contatta l'Operatore se si tratta di un errore.",
  errYaEnSophon: "L'account esisteva già su Sophon.",
  errYaEnSophonApoyo: "Possono essere attivati solo gli account registrati tramite la tua squadra. Quelli preesistenti spettano all'Operatore.",
  errNoExisteEnSophon: "L'email non esiste su Sophon.",
  errNoExisteEnSophonApoyo: "L'account deve essere registrato su Sophon prima di attivarlo.",
  errSinWhitelist: "L'account non è autorizzato su Sophon.",
  errSinWhitelistApoyo: "L'autorizzazione si gestisce manualmente con il supporto. Non è stato attivato nulla.",
  errSophonNoResponde: "Sophon non risponde.",
  errSophonNoRespondeApoyo: "Non è stato attivato nulla. Riprova tra qualche minuto.",
  errSophonRechaza: "Sophon ha rifiutato l'attivazione.",
  errSophonRechazaApoyo: "Non è stato attivato nulla. L'Operatore è stato avvisato.",
  errAltaNoRegistrada: "Non è stato possibile registrare l'attivazione.",
  errAltaNoRegistradaApoyo: "Nessuna modifica è stata applicata. Riprova.",
  errSinClasificar: "Non è stato possibile completare l'attivazione.",
  errSinClasificarApoyo: "Non è stato attivato nulla. L'errore è stato registrato.",

  errNoEsTuyo: "Il webmaster non è nella tua squadra.",
  errNoEsTuyoApoyo: "Si può rinnovare il PRO solo dei webmaster attivati da te.",
  errNoEsTuyoAbrirApoyo: "Controlla l'email. Se non è ancora attivato, fallo da «Attiva webmaster».",
  errProSigueActivo: "Il PRO è ancora attivo.",
  errProSigueActivoApoyo: "Il rinnovo sarà disponibile alla scadenza.",
  errProNoRegistrado: "Non è stato possibile registrare il PRO.",
  errProNoRegistradoApoyo: "Nessuna modifica è stata applicata. Riprova dal suo profilo.",
  errProSinWhitelist: "L'account non è autorizzato su Sophon.",
  errProSinWhitelistApoyo: "L'autorizzazione si gestisce manualmente con il supporto.",
  errProRechazado: "Sophon ha rifiutato la concessione del PRO.",
  errProRechazadoApoyo: "Riprova dal suo profilo tra qualche minuto.",

  errRetiroFormato: "L'importo o l'indirizzo non hanno un formato valido.",
  errRetiroFormatoApoyo: "Controllali e riprova.",
  errRetiroMinimo: (minimo: string) => `L'importo è sotto il minimo di ${minimo}.`,
  errRetiroMinimoApoyo: (importe: string) => `Importo richiesto: ${importe}.`,
  errRetiroSaldo: (disponible: string) =>
    `L'importo supera il saldo disponibile di ${disponible}.`,
  errRetiroSaldoApoyo: "L'importo in attesa di conferma non può essere prelevato.",
  errRetiroYaHayUna: (importe: string) => `Esiste una richiesta in sospeso di ${importe}.`,
  errRetiroYaHayUnaApoyo: "È ammessa una sola richiesta alla volta. La richiesta attuale può essere annullata per crearne un'altra.",
  errRetiroNoRegistrado: "Non è stato possibile registrare la richiesta.",
  errRetiroNoRegistradoApoyo: "Non è stato addebitato alcun importo. Riprova.",

  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "L'accesso richiede un codice di attivazione, fornito dall'Operatore.",
  botCuandoLoTengas: "Con il codice, collega il tuo account da qui.",
  botHola: (nombre: string) => `Ciao, ${nombre}. Seleziona un'opzione.`,
  botVincularCuenta: "Collega il mio account",
  botSuspendido: "L'account è sospeso. Contatta l'Operatore per riattivarlo.",
  botSinPublicar: "L'applicazione non è ancora pubblicata. Segnalalo all'Operatore.",
  botCadaComando: "Ogni comando apre una schermata:",
  botOStart: "Oppure /start per il menu completo.",
  botComandoDesconocido: "Comando non riconosciuto. Usa /ayuda.",
  botUsaStart: "Usa /start per aprire l'applicazione.",
  botActivarAtajo: "/activar email@esempio.com — attivare senza aprire l'applicazione",
  botActivarComoSeUsa: "Indica l'email dopo il comando: /activar email@esempio.com",
  botSinCuenta: "Nessun account agente associato. Usa /start per crearlo.",
  botActivado: (email: string) => `${email} attivato nella tua squadra, con un anno di PRO.`,
  botActivadoSinPro: (email: string) => `${email} attivato nella tua squadra.`,
  botActivadoSinProApoyo: "L'anno di PRO non è stato applicato. Riprova la concessione dal suo profilo.",

  botRetiroPagado: (importe: string) => `Pagamento emesso: ${importe}.`,
  botRedTitulo: "Webmaster senza attività",
  botRedParados: (n: number, total: number) =>
    `${n} di ${total} webmaster senza registrazioni recenti:`,
  botRedDiasParado: (dias: number) => `${dias} ${dias === 1 ? "giorno" : "giorni"} senza attività`,
  // «webmaster» es invariable en italiano —como «computer» o «manager»—, igual
  // que en `botRedParados` dos líneas más arriba. El plural va en el verbo.
  botRedIncidencias: (n: number) =>
    `${n} webmaster con problemi su Sophon; non ${
      n === 1 ? "può" : "possono"
    } generare iscrizioni:`,
  botRedYOtros: (n: number) => `…e altri ${n}.`,
  botRedComoVerlo: "Consulta «La mia squadra» per rivedere i loro link di acquisizione.",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `Riferimento: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `Prelievo di ${importe} approvato. Il pagamento sarà emesso nei prossimi giorni.`,
  botRetiroRechazado: (importe: string) =>
    `Prelievo di ${importe} rifiutato. L'importo torna disponibile.`,
  botMotivo: (motivo: string) => `Motivo: ${motivo}`,

  // ── Il messaggio con il codice di accesso ─────────────────────────────────
  correoOtpAsunto: (codigo: string) => `${codigo} è il tuo codice di accesso`,
  correoOtpTuCodigo: "Il tuo codice di verifica:",
  correoOtpCaduca: (minutos: number) =>
    `Valido per ${minutos} minuti e monouso.`,
  correoOtpNoPedido: "Se non hai richiesto l'accesso a Sophon Promoters, ignora questo messaggio. Senza il codice non è possibile accedere all'account.",
  correoOtpTocaParaCopiar: "Tieni premuto il codice per copiarlo.",
  correoPieMarca: "Sophon è un marchio registrato di New Sophon Technology Limited.",

  loQueCobrasTu: "La tua commissione",
  cobrasPorRegistro: (importe: string) =>
    `${importe} per ogni utente registrato, indipendentemente dal paese.`,
  cobrasPorPro: (porcentaje: string) =>
    `${porcentaje} sugli acquisti di PRO di quegli utenti.`,
  cobrasBonoMensual: "Bonus mensile al raggiungimento di un livello di registrazioni con l'intera squadra.",

  deDondeSale: "Origine del saldo",
  porRegistros: "Registrazioni",
  porComprasPro: "Acquisti di PRO",
  porBonos: "Bonus",
  porAjustes: "Rettifiche",
  deDondeSaleApoyo: "Totale accumulato suddiviso per voce.",
  bonosCobrados: "Bonus registrati",
  bonoNivelDe: (usuarios: number) =>
    `Livello di ${usuarios.toLocaleString("it-IT")} registrazioni`,
  bonoSinNivel: "Bonus del mese",
  todaviaEnRevision: "in attesa di conferma",
  sinBonos: "Nessun bonus registrato.",
  sinBonosApoyo: "Il bonus viene assegnato al raggiungimento di un livello di registrazioni entro il mese solare. Il conteggio riparte il giorno 1.",

  ayuda: "Aiuto",
  ayudaApoyo: "Commissioni, attivazioni, saldo e pagamenti.",
  ayudaNoResuelta: "Non trovi il tuo caso?",
  ayudaNoResueltaApoyo: "Scrivici sul bot. La risposta arriva dallo stesso canale.",
  buscarEnLaAyuda: "Cerca nell'aiuto",
  limpiarBusqueda: "Cancella la ricerca",
  preguntasEncontradas: (encontradas: number, total: number) =>
    `${encontradas} di ${total} ${total === 1 ? "domanda" : "domande"}`,
  sinResultados: (termino: string) => `Nessun risultato per «${termino}».`,
  paginaNoExiste: "La pagina non esiste.",
  paginaNoExisteApoyo: "Il link può appartenere a una versione precedente dell'applicazione.",
  objetivosDelBono: "Obiettivi del bonus",
  nivelesAlcanzados: (alcanzados: number, total: number) =>
    `${alcanzados} di ${total} ${total === 1 ? "livello" : "livelli"}`,
  faltanRegistros: (n: number) =>
    `${n.toLocaleString("it-IT")} ${n === 1 ? "registrazione" : "registrazioni"} al successivo`,
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
  verMiRed: "Ver equipa",
  verSuFicha: "Ver perfil",
  volverAlInicio: "Voltar ao início",
  precios: "Preços",
  preciosDelPrograma: "Preços do programa",
  preciosParaEnsenar: "Preço por utilizador registado para os teus webmasters.",
  loQueCobraTuWebmaster: "Comissão do webmaster",
  porCadaCienUsuarios: "Por cada 100 utilizadores registados",
  paisesDelTier: (n: number) => `${n} ${n === 1 ? "país" : "países"}`,
  nivelDeLaCuenta: "Nível da conta",
  losNiveles: "Sistema de níveis",
  tocaUnNivel: "Seleciona um nível para ver as suas tarifas.",
  nivelInicial: "Nível inicial",
  cuandoSeAplicaElNivel: "A contagem fecha no último dia de cada mês. O nível resultante aplica-se a partir do dia 1 do mês seguinte.",
  nivelHaceFalta: (importe: string) => `a partir de ${importe}`,
  nivel: "Nível",
  comoSubeElNivel: "O nível depende do valor total que os utilizadores do webmaster pagam pelo PRO. Quanto maior o volume acumulado, mais cedo sobe de nível.",
  repartoDeLasCompras: (webmaster: string) =>
    `O webmaster recebe ainda ${webmaster} do que os seus utilizadores pagarem pelo PRO.`,
  repartoDelAgente: (agente: string) => `A tua comissão sobre essas compras é ${agente}.`,
  tuComisionNoDependeDelNivel: "A tua comissão é a mesma em todos os níveis.",
  sinPrecios: "Não há tarifas disponíveis.",
  sinPreciosApoyo: "A Sophon não devolveu a tabela de preços. Tenta novamente dentro de alguns minutos.",
  activarElPrimero: "Ativar o primeiro",

  sinWebmasters: "Não há webmasters ativados.",
  sinWebmastersApoyo: "Ativa-os com o email registado na Sophon.",
  sinIngresos: "Sem registos até agora.",
  sinIngresosApoyo: "Os registos aparecerão aqui assim que ocorram através dos links da equipa.",
  sinMovimientos: "Não há levantamentos solicitados.",

  bienvenida: "Acesso de agentes",
  bienvenidaApoyo: "Equipa, registos e saldo num único painel. Acede com o teu email.",

  entrarEnTuCuenta: "Entrar",
  introduceTuCorreo: "Introduz o teu email. Se a conta existir, será enviado um código de verificação.",
  codigoDeActivacion: "Código de ativação",
  teLoDaElOperador: "Fornecido pelo Operador.",
  tuCorreo: "O teu email",
  seraTuIdentificador: "É o teu identificador na Sophon.",
  correoSinCuenta: "O email não tem conta associada.",
  correoSinCuentaApoyo: "Introduz o código de ativação para criar a conta.",
  enviarmeElCodigo: "Enviar código",
  confirmaQueEresTu: "Verificar email",
  otpEnviado: (email: string) => `Código enviado para ${email}. Válido durante 10 minutos.`,
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
  estadoDeTuDinero: "Estado do saldo",
  bonoDelMes: "Bónus do mês",
  registrosEsteMes: (n: number) =>
    `${n.toLocaleString("pt-PT")} ${n === 1 ? "registo" : "registos"} este mês`,
  faltanParaElBono: (faltan: number, premio: string) =>
    `${faltan === 1 ? "Falta" : "Faltam"} ${faltan.toLocaleString("pt-PT")} ${
      faltan === 1 ? "registo" : "registos"
    } para ${premio}.`,
  bonoMaximoAlcanzado: "Nível máximo do mês atingido.",
  bonoGanado: (importe: string) => `Acumulado ${importe}`,
  bonoExtraSi: (umbral: number) =>
    `adicional ao atingir ${umbral.toLocaleString("pt-PT")} ${
      umbral === 1 ? "registo" : "registos"
    } este mês`,
  bonoMasSiLlegas: (importe: string, umbral: number) =>
    `${importe} adicionais ao atingir ${umbral.toLocaleString("pt-PT")} ${
      umbral === 1 ? "registo" : "registos"
    }`,
  bonoYaEsTuyo: "confirmado",
  bonoEsteMesLlevas: (registros: number, faltan: number) =>
    `${registros.toLocaleString("pt-PT")} registos este mês · ${
      faltan === 1 ? "falta" : "faltam"
    } ${faltan.toLocaleString("pt-PT")}`,
  ritmoYRecta: (ritmo: number, dias: number) =>
    `Média de ${ritmo.toLocaleString("pt-PT")} ${
      ritmo === 1 ? "registo" : "registos"
    } por dia. ${dias === 1 ? "Falta" : "Faltam"} ${dias} ${dias === 1 ? "dia" : "dias"} de mês.`,
  loAlcanzarasEl: (dia: number) => `A este ritmo será atingido no dia ${dia}.`,
  cerrarasElMesEn: (registros: number) =>
    `Projeção de fecho do mês: ${registros.toLocaleString("pt-PT")} registos.`,
  frenteAlMesPasado: (porcentaje: number) =>
    `${porcentaje >= 0 ? "+" : "−"}${Math.abs(porcentaje)} % sobre o mês passado`,
  quienTeAcerca: "Contributo por webmaster",

  correoDelWebmaster: "Email do webmaster",
  tieneQueExistirYa: "Deve ser uma conta já registada na Sophon.",
  yaEstaEnTuRed: (email: string) => `${email} já está na tua equipa.`,
  cobrarasDesdeHoy: "Apenas contam os registos posteriores à ativação.",

  conIncidencia: (n: number) => `${n} com ${n === 1 ? "problema" : "problemas"}`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} sem atividade nos últimos ${dias} ${dias === 1 ? "dia" : "dias"}, de ${total}`,
  todosProduciendo: (n: number) => `${n} ativos`,
  escalaComun: (dias: number) =>
    `Cada coluna corresponde a ${dias} ${dias === 1 ? "dia" : "dias"}. Todas as barras usam a mesma escala.`,

  bloqueado: "Bloqueado",
  seVaABorrar: "Baixa programada",
  desaparecido: "Baixa na Sophon",
  proCaducado: "PRO expirado",
  sinActividad: "Sem atividade",
  diasParado: (dias: number) => `${dias} ${dias === 1 ? "dia" : "dias"} sem atividade`,
  activoEnSophon: "Ativo na Sophon",
  bloqueadoEnSophon: "Bloqueado na Sophon",
  pendienteDeBorrado: "Baixa programada",
  yaNoApareceEnSophon: "Já não consta na Sophon",
  estadoSinComprobar: "Estado por verificar",
  pendienteDeConfirmar: "A confirmar",
  pendienteDeConfirmarApoyo: "A Sophon ainda não publicou a associação. Resolve-se automaticamente.",

  enTuRedDesde: (fecha: string) => `na equipa desde ${fecha}`,
  teHaDado: "Contributo",
  registrosEnDias: (registros: number, dias: number) => `${registros.toLocaleString("pt-PT")} ${registros === 1 ? "registo" : "registos"} em ${dias} ${
      dias === 1 ? "dia" : "dias"
    }`,
  compraronPro: (n: number) => `${n} ${n === 1 ? "comprou" : "compraram"} PRO`,
  cobrasDesde: (fecha: string) => `Contam os registos desde ${fecha}.`,
  ultimosDias: (dias: number) => (dias === 1 ? "Último dia" : `Últimos ${dias} dias`),
  todaviaSinRegistros: "Sem registos contribuídos.",
  registroDeSondeo: "Atividade",

  susEnlaces: "Os links dele",
  conQueCapta: "Links de captação. Dados em tempo real da Sophon.",
  sinEnlaces: "Sem links publicados.",
  enlacesNoDisponibles: "Não foi possível consultar os links. Tenta novamente mais tarde.",
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

  incluyeUnAnio: "A ativação inclui um ano de PRO.",
  continuar: "Continuar",
  vasAActivar: "Conta a ativar",
  corregirElCorreo: "Corrigir email",
  altaNoSeDeshace: "A ativação é irreversível: o webmaster fica associado à tua conta na Sophon.",
  proConcedido: (fecha: string) => `PRO ativo até ${fecha}.`,
  proNoConcedido: "Webmaster ativado. Não foi possível conceder o PRO.",
  proNoConcedidoApoyo: "Repete a concessão a partir do perfil. Não é necessário repetir a ativação.",
  renovarUnAnio: "Renovar um ano",
  darUnAnio: "Conceder um ano de PRO",
  renovado: (email: string, fecha: string) => `${email} tem PRO até ${fecha}.`,
  colaRenovaciones: "Renovações",
  puedesRenovar: (n: number) => `${n} pendentes de renovação`,
  ningunoRenovable: "Não há renovações pendentes.",
  nuncaTuvoPro: "Sem PRO anterior",
  puedesRenovarAhora: "Renovação disponível",
  proActivo: "PRO ativo",
  podrasRenovarloCuandoSeApague: "A renovação fica disponível quando o PRO expirar.",

  enDias: (dias: number) => `em ${dias} ${dias === 1 ? "dia" : "dias"}`,
  tocaUnDia: "Seleciona um dia para ver o detalhe.",
  columnaDia: "Dia",
  columnaDolares: "Dólares",
  perforando: "A carregar o detalhe",
  aquiEmpieza: "Início do histórico. Não há dados anteriores.",
  desglose: (registros: number, t1: number, t2: number, t3: number) =>
    `${registros.toLocaleString("pt-PT")} ${
      registros === 1 ? "registo" : "registos"
    } · T1 ${t1} · T2 ${t2} · T3 ${t3}`,
  dePago: (n: number) => `${n} ${n === 1 ? "pagou" : "pagaram"}`,
  diaAbierto: "Dia em curso: os dados podem variar.",

  soloConsolidado: "O valor disponível está pronto para levantamento. A confirmação do valor pendente demora entre 1 e 3 dias.",
  revisionManual: "Revisão manual. Prazo estimado: entre 1 e 3 dias.",
  solicitudEnCurso: "Pedido em curso",
  pendienteDeRevision: "A aguardar revisão",
  aprobadoPendientePago: "Aprovado · pagamento pendente",
  estadoPagado: "Pago",
  estadoRechazado: "Recusado",
  estadoCancelado: "Cancelado",
  pedidaEl: (fecha: string) => `Solicitado a ${fecha}.`,
  soloUnaALaVez: "Só é permitido um pedido em simultâneo. O seguinte poderá ser feito quando este for resolvido.",
  cuanto: "Valor a levantar",
  todo: "Tudo",
  disponibleYMinimo: "Disponível",
  minimo: "mínimo",
  tePasasEn: (importe: string) => `Passas-te em ${importe} do que tens disponível.`,
  teFaltanParaElMinimo: (importe: string) => `Faltam-te ${importe} para chegares ao mínimo.`,
  enQueRed: "Em que rede",
  walletUsdt: "Carteira USDT",
  usdtEn: (red: string, pista: string) =>
    `USDT em ${red}. ${pista} Um endereço de outra rede implica a perda do pagamento.`,
  direccionMalFormada: (red: string, pista: string) =>
    `Endereço inválido para ${red}. ${pista}`,
  pistaTrc20: "Começa por T e tem 34 caracteres.",
  pistaBsc: "Começa por 0x e tem 42 caracteres.",
  pistaTon: "Começa por EQ ou UQ e tem 48 caracteres.",
  pedirImporte: (importe: string) => `Levantar ${importe}`,
  solicitudesAnteriores: "Levantamentos anteriores",

  sesionCaducada: "A sessão expirou.",
  sesionCaducadaApoyo: "Volta a aceder com o teu email. Não se perde nenhum dado.",
  algoHaFallado: "Não foi possível concluir a operação.",
  algoHaFalladoApoyo: "Não foi aplicada nenhuma alteração. Tenta novamente.",

  errSinTelegram: "O Telegram não verificou o teu acesso.",
  errSinTelegramApoyo: "Abre a aplicação a partir do bot.",
  errSuspendido: "A conta está suspensa.",
  errSuspendidoApoyo: "Contacta o Operador para restabelecer o acesso.",

  errFormatoCodigoCorreo: "O código ou o email não têm um formato válido.",
  errFormatoCodigoCorreoApoyo: "Revê-os e tenta outra vez.",
  errCodigoNoVale: "O código de ativação não é válido ou expirou.",
  errCodigoUsado: "O código de ativação já foi utilizado.",
  errCodigoUsadoApoyo: "Solicita um novo ao Operador.",
  errCodigoOtroCorreo: "O código foi emitido para outro email.",
  errCodigoOtroCorreoApoyo: "Só é válido com o email para o qual foi emitido.",
  errTelegramYaVinculado: (correo: string) =>
    `Esta conta de Telegram já está associada a ${correo}.`,
  errTelegramYaVinculadoApoyo: "Introduz esse email para aceder sem código.",
  errDemasiadosEnvios: "Foram solicitados demasiados códigos seguidos.",
  errDemasiadosEnviosApoyo: "Espera uns minutos e tenta outra vez.",
  errEsperaParaOtroCodigo: (segundos: number) =>
    `Poderás solicitar outro código dentro de ${segundos} segundos.`,
  errCorreoNoEnviado: "Não foi possível enviar o email.",
  errCorreoNoEnviadoApoyo: "Verifica o endereço e tenta outra vez dentro de um minuto.",
  errDatosNoValidos: "Os dados não são válidos.",
  errDatosNoValidosApoyo: "O código de verificação tem 6 dígitos.",
  errOtpCaducado: "O código de verificação expirou.",
  errOtpCaducadoApoyo: "Os códigos expiram ao fim de 10 minutos. Solicita um novo.",
  errOtpSinIntentos: "Tentativas esgotadas.",
  errOtpSinIntentosApoyo: "O código fica anulado. Solicita um novo.",
  errOtpIncorrecto: (restantes: number) =>
    `Código de verificação incorreto. ${restantes === 1 ? "Resta" : "Restam"} ${restantes} ${
      restantes === 1 ? "tentativa" : "tentativas"
    }.`,
  errOtpOtraCuenta: "O código foi solicitado a partir de outra conta de Telegram.",
  errOtpOtraCuentaApoyo: "Só é válido na conta que o solicitou.",
  errCorreoYaVinculado: "O email já está associado a outra conta de Telegram.",
  errCorreoYaVinculadoApoyo: "Contacta o Operador para alterar a associação.",
  errNoVinculado: "Não foi possível associar a conta.",
  errNoVinculadoApoyo: "O código de ativação continua por utilizar. Tenta novamente.",
  errFormatoCorreo: "O email não tem um formato válido.",
  errFormatoCorreoApoyo: "Introduz o email com que se registou na Sophon.",

  errYaEnTuEquipo: "O webmaster já está na tua equipa.",
  errYaEnTuEquipoApoyo: "Consulta-o em «A minha equipa».",
  errDeOtroAgente: "O webmaster está atribuído a outro agente.",
  errDeOtroAgenteApoyo: "Cada webmaster tem um único agente atribuído. Contacta o Operador se se tratar de um erro.",
  errYaEnSophon: "A conta já existia na Sophon.",
  errYaEnSophonApoyo: "Só podem ser ativadas contas registadas através da tua equipa. As preexistentes pertencem ao Operador.",
  errNoExisteEnSophon: "O email não existe na Sophon.",
  errNoExisteEnSophonApoyo: "A conta deve ser registada na Sophon antes de ser ativada.",
  errSinWhitelist: "A conta não está autorizada na Sophon.",
  errSinWhitelistApoyo: "A autorização é tratada manualmente com o suporte. Não foi ativado nada.",
  errSophonNoResponde: "A Sophon não responde.",
  errSophonNoRespondeApoyo: "Não foi ativado nada. Tenta novamente dentro de alguns minutos.",
  errSophonRechaza: "A Sophon recusou a ativação.",
  errSophonRechazaApoyo: "Não foi ativado nada. O Operador foi notificado.",
  errAltaNoRegistrada: "Não foi possível registar a ativação.",
  errAltaNoRegistradaApoyo: "Não foi aplicada nenhuma alteração. Tenta novamente.",
  errSinClasificar: "Não foi possível concluir a ativação.",
  errSinClasificarApoyo: "Não foi ativado nada. O erro ficou registado.",

  errNoEsTuyo: "O webmaster não está na tua equipa.",
  errNoEsTuyoApoyo: "Só pode renovar-se o PRO dos webmasters ativados por ti.",
  errNoEsTuyoAbrirApoyo: "Verifica o email. Se ainda não está ativado, fá-lo em «Ativar webmaster».",
  errProSigueActivo: "O PRO continua em vigor.",
  errProSigueActivoApoyo: "A renovação fica disponível quando expirar.",
  errProNoRegistrado: "Não foi possível registar o PRO.",
  errProNoRegistradoApoyo: "Não foi aplicada nenhuma alteração. Tenta novamente a partir do perfil.",
  errProSinWhitelist: "A conta não está autorizada na Sophon.",
  errProSinWhitelistApoyo: "A autorização é tratada manualmente com o suporte.",
  errProRechazado: "A Sophon rejeitou a concessão do PRO.",
  errProRechazadoApoyo: "Tenta novamente a partir do perfil dentro de alguns minutos.",

  errRetiroFormato: "O valor ou o endereço não têm um formato válido.",
  errRetiroFormatoApoyo: "Revê-os e tenta outra vez.",
  errRetiroMinimo: (minimo: string) => `O montante fica abaixo do mínimo de ${minimo}.`,
  errRetiroMinimoApoyo: (importe: string) => `Valor solicitado: ${importe}.`,
  errRetiroSaldo: (disponible: string) =>
    `O valor excede o saldo disponível de ${disponible}.`,
  errRetiroSaldoApoyo: "O valor pendente de confirmação não pode ser levantado.",
  errRetiroYaHayUna: (importe: string) => `Existe um pedido pendente de ${importe}.`,
  errRetiroYaHayUnaApoyo: "Só é permitido um pedido em simultâneo. O pedido atual pode ser cancelado para criar outro.",
  errRetiroNoRegistrado: "Não foi possível registar o pedido.",
  errRetiroNoRegistradoApoyo: "Não foi descontado nenhum valor. Tenta novamente.",

  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "O acesso exige um código de ativação, fornecido pelo Operador.",
  botCuandoLoTengas: "Com o código, associa a tua conta aqui.",
  botHola: (nombre: string) => `Olá, ${nombre}. Seleciona uma opção.`,
  botVincularCuenta: "Associar a minha conta",
  botSuspendido: "A conta está suspensa. Contacta o Operador para a reativar.",
  botSinPublicar: "A aplicação ainda não está publicada. Notifica o Operador.",
  botCadaComando: "Cada comando abre um ecrã:",
  botOStart: "Ou /start para o menu completo.",
  botComandoDesconocido: "Comando não reconhecido. Usa /ayuda.",
  botUsaStart: "Usa /start para abrir a aplicação.",
  botActivarAtajo: "/activar email@exemplo.com — ativar sem abrir a aplicação",
  botActivarComoSeUsa: "Indica o email a seguir ao comando: /activar email@exemplo.com",
  botSinCuenta: "Não há conta de agente associada. Usa /start para a criar.",
  botActivado: (email: string) => `${email} ativado na tua equipa, com um ano de PRO.`,
  botActivadoSinPro: (email: string) => `${email} ativado na tua equipa.`,
  botActivadoSinProApoyo: "O ano de PRO não foi aplicado. Repete a concessão a partir do perfil.",

  botRetiroPagado: (importe: string) => `Pagamento emitido: ${importe}.`,
  botRedTitulo: "Webmasters sem atividade",
  botRedParados: (n: number, total: number) =>
    `${n} de ${total} webmasters sem registos recentes:`,
  botRedDiasParado: (dias: number) => `${dias} ${dias === 1 ? "dia" : "dias"} sem atividade`,
  botRedIncidencias: (n: number) =>
    `${n} ${n === 1 ? "webmaster" : "webmasters"} com problemas na Sophon; não ${
      n === 1 ? "pode" : "podem"
    } gerar registos:`,
  botRedYOtros: (n: number) => `…e mais ${n}.`,
  botRedComoVerlo: "Consulta «A minha equipa» para rever os seus links de captação.",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `Referência: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `Levantamento de ${importe} aprovado. O pagamento será emitido nos próximos dias.`,
  botRetiroRechazado: (importe: string) =>
    `Levantamento de ${importe} rejeitado. O valor volta a estar disponível.`,
  botMotivo: (motivo: string) => `Motivo: ${motivo}`,

  // ── O email com o código de acesso ────────────────────────────────────────
  correoOtpAsunto: (codigo: string) => `${codigo} é o teu código de acesso`,
  correoOtpTuCodigo: "O teu código de verificação:",
  correoOtpCaduca: (minutos: number) =>
    `Válido durante ${minutos} minutos e de utilização única.`,
  correoOtpNoPedido: "Se não solicitaste o acesso a Sophon Promoters, ignora esta mensagem. Sem o código não é possível aceder à conta.",
  correoOtpTocaParaCopiar: "Mantém o código premido para o copiares.",
  correoPieMarca: "Sophon é uma marca registada da New Sophon Technology Limited.",

  loQueCobrasTu: "A tua comissão",
  cobrasPorRegistro: (importe: string) =>
    `${importe} por cada utilizador registado, independentemente do país.`,
  cobrasPorPro: (porcentaje: string) =>
    `${porcentaje} sobre as compras de PRO desses utilizadores.`,
  cobrasBonoMensual: "Bónus mensal ao atingir um nível de registos com o conjunto da equipa.",

  deDondeSale: "Origem do saldo",
  porRegistros: "Registos",
  porComprasPro: "Compras de PRO",
  porBonos: "Bónus",
  porAjustes: "Acertos",
  deDondeSaleApoyo: "Total acumulado discriminado por rubrica.",
  bonosCobrados: "Bónus registados",
  bonoNivelDe: (usuarios: number) =>
    `Nível de ${usuarios.toLocaleString("pt-PT")} registos`,
  bonoSinNivel: "Bónus do mês",
  todaviaEnRevision: "pendente de confirmação",
  sinBonos: "Não há bónus registados.",
  sinBonosApoyo: "O bónus é atribuído ao atingir um nível de registos dentro do mês de calendário. A contagem reinicia no dia 1.",

  ayuda: "Ajuda",
  ayudaApoyo: "Comissões, ativações, saldo e pagamentos.",
  ayudaNoResuelta: "Não encontras o teu caso?",
  ayudaNoResueltaApoyo: "Escreve-nos pelo bot. A resposta chega pelo mesmo canal.",
  buscarEnLaAyuda: "Procurar na ajuda",
  limpiarBusqueda: "Limpar a pesquisa",
  preguntasEncontradas: (encontradas: number, total: number) =>
    `${encontradas} de ${total} ${total === 1 ? "pergunta" : "perguntas"}`,
  sinResultados: (termino: string) => `Sem resultados para «${termino}».`,
  paginaNoExiste: "A página não existe.",
  paginaNoExisteApoyo: "O link pode pertencer a uma versão anterior da aplicação.",
  objetivosDelBono: "Objetivos do bónus",
  nivelesAlcanzados: (alcanzados: number, total: number) =>
    `${alcanzados} de ${total} ${total === 1 ? "nível" : "níveis"}`,
  faltanRegistros: (n: number) =>
    `${n.toLocaleString("pt-PT")} ${n === 1 ? "registo" : "registos"} para o seguinte`,
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
  webmaster: "webmaster",
  devengado: "المكتسب",
  disponible: "المتاح",
  solicitado: "المطلوب",
  pagado: "المدفوع",
  volver: "رجوع",
  cargando: "جارٍ التحميل",
  sondeando: "جارٍ تحميل البيانات",

  activarWebmaster: "تفعيل webmaster",
  solicitarRetiro: "سحب",
  acceder: "تسجيل الدخول",
  reintentar: "أعد المحاولة",
  activar: "تفعيل",
  entrar: "دخول",
  activarOtro: "تفعيل آخر",
  verMiRed: "عرض الفريق",
  verSuFicha: "عرض الملف",
  volverAlInicio: "العودة إلى الرئيسية",
  precios: "الأسعار",
  preciosDelPrograma: "أسعار البرنامج",
  preciosParaEnsenar: "السعر لكل مستخدم مسجَّل لدى webmasters لديك.",
  loQueCobraTuWebmaster: "عمولة webmaster",
  porCadaCienUsuarios: "لكل 100 مستخدم مسجَّل",
  paisesDelTier: (n: number) => `${n} ${n === 1 ? "بلد" : "بلدًا"}`,
  nivelDeLaCuenta: "مستوى الحساب",
  losNiveles: "نظام المستويات",
  tocaUnNivel: "اختر مستوى لعرض تعريفاته.",
  nivelInicial: "المستوى المبدئي",
  cuandoSeAplicaElNivel: "يُغلق الاحتساب في آخر يوم من كل شهر. ويُطبَّق المستوى الناتج اعتبارًا من اليوم الأول من الشهر التالي.",
  nivelHaceFalta: (importe: string) => `ابتداءً من ${importe}`,
  nivel: "المستوى",
  comoSubeElNivel: "يعتمد المستوى على إجمالي ما يدفعه مستخدمو webmaster مقابل PRO. وكلما زاد الحجم المتراكم، ارتفع المستوى أسرع.",
  repartoDeLasCompras: (webmaster: string) =>
    `يتلقى webmaster كذلك ${webmaster} مما يدفعه مستخدموه مقابل PRO.`,
  repartoDelAgente: (agente: string) => `عمولتك على تلك المشتريات هي ${agente}.`,
  tuComisionNoDependeDelNivel: "عمولتك واحدة في جميع المستويات.",
  sinPrecios: "لا توجد تعريفات متاحة.",
  sinPreciosApoyo: "لم تُرجِع Sophon جدول الأسعار. أعد المحاولة بعد دقائق.",
  activarElPrimero: "تفعيل الأول",

  sinWebmasters: "لا يوجد webmasters مفعَّلون.",
  sinWebmastersApoyo: "فعّلهم ببريدهم المسجَّل في Sophon.",
  sinIngresos: "لا توجد تسجيلات بعد.",
  sinIngresosApoyo: "ستظهر التسجيلات هنا فور حدوثها عبر روابط الفريق.",
  sinMovimientos: "لا توجد طلبات سحب.",

  bienvenida: "دخول الوكلاء",
  bienvenidaApoyo: "الفريق والتسجيلات والرصيد في لوحة واحدة. ادخل ببريدك.",

  entrarEnTuCuenta: "الدخول",
  introduceTuCorreo: "أدخل بريدك. إذا كان الحساب موجودًا، سيُرسَل رمز تحقق.",
  codigoDeActivacion: "رمز التفعيل",
  teLoDaElOperador: "يوفّره المشغّل.",
  tuCorreo: "بريدك الإلكتروني",
  seraTuIdentificador: "هو معرّفك في Sophon.",
  correoSinCuenta: "لا يوجد حساب مرتبط بهذا البريد.",
  correoSinCuentaApoyo: "أدخل رمز التفعيل لإنشاء الحساب.",
  enviarmeElCodigo: "إرسال الرمز",
  confirmaQueEresTu: "تأكيد البريد",
  otpEnviado: (email: string) => `أُرسل الرمز إلى ${email}. صالح لمدة 10 دقائق.`,
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
  estadoDeTuDinero: "حالة الرصيد",
  bonoDelMes: "مكافأة الشهر",
  registrosEsteMes: (n: number) => `${n.toLocaleString("ar")} تسجيل هذا الشهر`,
  faltanParaElBono: (faltan: number, premio: string) =>
    `${faltan.toLocaleString("ar")} تسجيل متبقٍ للوصول إلى ${premio}.`,
  bonoMaximoAlcanzado: "تم بلوغ أعلى مستوى في الشهر.",
  bonoGanado: (importe: string) => `المتراكم ${importe}`,
  // Dual: تسجيل واحد / تسجيلان / تسجيلات. Es la misma concordancia triple que
  // `botRedIncidencias` hace con el verbo, aplicada aquí al sustantivo contado.
  bonoExtraSi: (umbral: number) =>
    `إضافية عند بلوغ ${umbral.toLocaleString("ar")} تسجيل هذا الشهر`,
  bonoMasSiLlegas: (importe: string, umbral: number) =>
    `${importe} إضافية عند بلوغ ${umbral.toLocaleString("ar")} تسجيل`,
  bonoYaEsTuyo: "مؤكَّدة",
  bonoEsteMesLlevas: (registros: number, faltan: number) =>
    `${registros.toLocaleString("ar")} تسجيلًا هذا الشهر · المتبقي ${faltan.toLocaleString("ar")}`,
  ritmoYRecta: (ritmo: number, dias: number) =>
    `بمعدل ${ritmo.toLocaleString("ar")} تسجيل يوميًا. المتبقي ${dias} يومًا من الشهر.`,
  loAlcanzarasEl: (dia: number) => `بهذا المعدل سيتحقق في اليوم ${dia}.`,
  cerrarasElMesEn: (registros: number) =>
    `الإسقاط عند إغلاق الشهر: ${registros.toLocaleString("ar")} تسجيل.`,
  frenteAlMesPasado: (porcentaje: number) =>
    `${porcentaje >= 0 ? "+" : "−"}${Math.abs(porcentaje)} % عن الشهر الماضي`,
  quienTeAcerca: "المساهمة حسب webmaster",

  correoDelWebmaster: "بريد webmaster",
  tieneQueExistirYa: "يجب أن يكون حسابًا مسجَّلًا في Sophon مسبقًا.",
  yaEstaEnTuRed: (email: string) => `${email} موجود في فريقك بالفعل.`,
  cobrarasDesdeHoy: "تُحتسب التسجيلات اللاحقة للتفعيل فقط.",

  // Dual otra vez: el pronombre cambia con 1, con 2 y con el resto.
  conIncidencia: (n: number) =>
    `${n} ${n === 1 ? "به مشكلة" : n === 2 ? "بهما مشكلات" : "بها مشكلات"}`,
  sinActividadDe: (parados: number, dias: number, total: number) =>
    `${parados} بلا نشاط خلال آخر ${dias} يومًا، من أصل ${total}`,
  todosProduciendo: (n: number) => `${n} نشطون`,
  escalaComun: (dias: number) =>
    `كل عمود يعادل ${dias} يومًا. وجميع الأشرطة بالمقياس نفسه.`,

  bloqueado: "محظور",
  seVaABorrar: "إزالة مجدولة",
  desaparecido: "مُزال من Sophon",
  proCaducado: "انتهى PRO",
  sinActividad: "بلا نشاط",
  diasParado: (dias: number) => `${dias} أيام بلا نشاط`,
  activoEnSophon: "نشط في Sophon",
  bloqueadoEnSophon: "محظور في Sophon",
  pendienteDeBorrado: "إزالة مجدولة",
  yaNoApareceEnSophon: "لم يعد مدرجًا في Sophon",
  estadoSinComprobar: "الحالة غير مُتحقق منها",
  pendienteDeConfirmar: "قيد التأكيد",
  pendienteDeConfirmarApoyo: "لم تنشر Sophon الارتباط بعد. تتم المعالجة تلقائيًا.",

  enTuRedDesde: (fecha: string) => `في الفريق منذ ${fecha}`,
  teHaDado: "المساهمة",
  registrosEnDias: (registros: number, dias: number) => `${registros} تسجيل خلال ${dias} يومًا`,
  compraronPro: (n: number) => `${n} اشترى PRO`,
  cobrasDesde: (fecha: string) => `تُحتسب التسجيلات اعتبارًا من ${fecha}.`,
  ultimosDias: (dias: number) => `آخر ${dias} يومًا`,
  todaviaSinRegistros: "لا توجد تسجيلات مُسهَم بها.",
  registroDeSondeo: "النشاط",

  susEnlaces: "روابطه",
  conQueCapta: "روابط الاستقطاب. بيانات آنية من Sophon.",
  sinEnlaces: "لا توجد روابط منشورة.",
  enlacesNoDisponibles: "تعذّر جلب الروابط. أعد المحاولة لاحقًا.",
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

  incluyeUnAnio: "يشمل التفعيل سنة من PRO.",
  continuar: "متابعة",
  vasAActivar: "الحساب المراد تفعيله",
  corregirElCorreo: "تصحيح البريد",
  altaNoSeDeshace: "التفعيل غير قابل للتراجع: يبقى webmaster مرتبطًا بحسابك في Sophon.",
  proConcedido: (fecha: string) => `PRO فعّال حتى ${fecha}.`,
  proNoConcedido: "فُعِّل webmaster. تعذّر منح PRO.",
  proNoConcedidoApoyo: "أعد محاولة المنح من ملفه. لا حاجة لتكرار التفعيل.",
  renovarUnAnio: "تجديد · سنة",
  darUnAnio: "منح سنة من PRO",
  renovado: (email: string, fecha: string) => `${email} لديه PRO حتى ${fecha}.`,
  colaRenovaciones: "التجديدات",
  puedesRenovar: (n: number) => `${n} بانتظار التجديد`,
  ningunoRenovable: "لا توجد تجديدات معلّقة.",
  nuncaTuvoPro: "لا يوجد PRO سابق",
  puedesRenovarAhora: "التجديد متاح",
  proActivo: "PRO نشط",
  podrasRenovarloCuandoSeApague: "يصبح التجديد متاحًا عند انتهاء PRO.",

  enDias: (dias: number) => `خلال ${dias} يومًا`,
  tocaUnDia: "اختر يومًا لعرض التفصيل.",
  columnaDia: "اليوم",
  columnaDolares: "دولار",
  perforando: "جارٍ تحميل التفصيل",
  aquiEmpieza: "بداية السجل. لا توجد بيانات أسبق.",
  desglose: (registros: number, t1: number, t2: number, t3: number) =>
    `${registros} تسجيل · T1 ${t1} · T2 ${t2} · T3 ${t3}`,
  // Dual: 1 دفع · 2 دفعا · 3+ دفعوا.
  dePago: (n: number) => `${n} ${n === 1 ? "دفع" : n === 2 ? "دفعا" : "دفعوا"}`,
  diaAbierto: "اليوم جارٍ: قد تتغير البيانات.",

  soloConsolidado: "المبلغ المتاح جاهز للسحب. ويستغرق تأكيد المبلغ المعلّق من يوم إلى ثلاثة أيام.",
  revisionManual: "مراجعة يدوية. المدة التقديرية: من يوم إلى ثلاثة أيام.",
  solicitudEnCurso: "طلب قيد المعالجة",
  pendienteDeRevision: "بانتظار المراجعة",
  aprobadoPendientePago: "مقبول · بانتظار الدفع",
  estadoPagado: "مدفوع",
  estadoRechazado: "مرفوض",
  estadoCancelado: "ملغى",
  pedidaEl: (fecha: string) => `طُلب في ${fecha}.`,
  soloUnaALaVez: "يُسمح بطلب واحد في كل مرة. ويمكن تقديم التالي عند حسم هذا الطلب.",
  cuanto: "المبلغ المراد سحبه",
  todo: "الكل",
  disponibleYMinimo: "المتاح",
  minimo: "الحد الأدنى",
  tePasasEn: (importe: string) => `تجاوزت المتاح لديك بمقدار ${importe}.`,
  teFaltanParaElMinimo: (importe: string) => `يتبقى لك ${importe} للوصول إلى الحد الأدنى.`,
  enQueRed: "على أي شبكة",
  walletUsdt: "محفظة USDT",
  usdtEn: (red: string, pista: string) =>
    `USDT على ${red}. ${pista} عنوان من شبكة أخرى يعني ضياع الدفعة.`,
  direccionMalFormada: (red: string, pista: string) =>
    `عنوان غير صالح لـ ${red}. ${pista}`,
  pistaTrc20: "يبدأ بحرف T وطوله 34 خانة.",
  pistaBsc: "يبدأ بـ 0x وطوله 42 خانة.",
  pistaTon: "يبدأ بـ EQ أو UQ وطوله 48 خانة.",
  pedirImporte: (importe: string) => `سحب ${importe}`,
  solicitudesAnteriores: "السحوبات السابقة",

  sesionCaducada: "انتهت صلاحية الجلسة.",
  sesionCaducadaApoyo: "ادخل مجددًا ببريدك. لا تُفقد أي بيانات.",
  algoHaFallado: "تعذّر إتمام العملية.",
  algoHaFalladoApoyo: "لم يُطبَّق أي تغيير. أعد المحاولة.",

  errSinTelegram: "لم يتحقق Telegram من دخولك.",
  errSinTelegramApoyo: "افتح التطبيق من البوت.",
  errSuspendido: "الحساب موقوف.",
  errSuspendidoApoyo: "تواصل مع المشغّل لاستعادة الوصول.",

  errFormatoCodigoCorreo: "الرمز أو البريد بصيغة غير صالحة.",
  errFormatoCodigoCorreoApoyo: "راجعهما وأعد المحاولة.",
  errCodigoNoVale: "رمز التفعيل غير صالح أو منتهي الصلاحية.",
  errCodigoUsado: "رمز التفعيل استُخدم بالفعل.",
  errCodigoUsadoApoyo: "اطلب رمزًا جديدًا من المشغّل.",
  errCodigoOtroCorreo: "صدر الرمز لبريد آخر.",
  errCodigoOtroCorreoApoyo: "لا يصلح إلا مع البريد الذي صدر له.",
  errTelegramYaVinculado: (correo: string) => `حساب Telegram هذا مرتبط بالفعل بـ ${correo}.`,
  errTelegramYaVinculadoApoyo: "أدخل ذلك البريد للدخول بلا رمز.",
  errDemasiadosEnvios: "طُلبت رموز كثيرة متتالية.",
  errDemasiadosEnviosApoyo: "انتظر بضع دقائق ثم أعد المحاولة.",
  errEsperaParaOtroCodigo: (segundos: number) =>
    `يمكن طلب رمز آخر خلال ${segundos} ثانية.`,
  errCorreoNoEnviado: "تعذّر إرسال البريد.",
  errCorreoNoEnviadoApoyo: "تحقق من العنوان وأعد المحاولة بعد دقيقة.",
  errDatosNoValidos: "البيانات غير صالحة.",
  errDatosNoValidosApoyo: "رمز التحقق مكوَّن من 6 أرقام.",
  errOtpCaducado: "انتهت صلاحية رمز التحقق.",
  errOtpCaducadoApoyo: "تنتهي صلاحية الرموز بعد 10 دقائق. اطلب رمزًا جديدًا.",
  errOtpSinIntentos: "نفدت المحاولات.",
  errOtpSinIntentosApoyo: "أُلغي الرمز. اطلب رمزًا جديدًا.",
  // Dual: محاولة واحدة / محاولتان / محاولات.
  errOtpIncorrecto: (restantes: number) =>
    `رمز التحقق غير صحيح. المتبقي ${restantes} محاولة.`,
  errOtpOtraCuenta: "طُلب الرمز من حساب Telegram آخر.",
  errOtpOtraCuentaApoyo: "لا يصلح إلا في الحساب الذي طلبه.",
  errCorreoYaVinculado: "البريد مرتبط بحساب Telegram آخر.",
  errCorreoYaVinculadoApoyo: "تواصل مع المشغّل لتعديل الارتباط.",
  errNoVinculado: "تعذّر ربط الحساب.",
  errNoVinculadoApoyo: "لا يزال رمز التفعيل غير مستخدَم. أعد المحاولة.",
  errFormatoCorreo: "البريد بصيغة غير صالحة.",
  errFormatoCorreoApoyo: "أدخل البريد الذي سُجِّل به في Sophon.",

  errYaEnTuEquipo: "هذا الـ webmaster موجود في فريقك بالفعل.",
  errYaEnTuEquipoApoyo: "راجعه في «فريقي».",
  errDeOtroAgente: "هذا الـ webmaster مُسنَد إلى وكيل آخر.",
  errDeOtroAgenteApoyo: "لكل webmaster وكيل واحد مُسنَد. تواصل مع المشغّل إن كان ذلك خطأً.",
  errYaEnSophon: "كان الحساب موجودًا في Sophon.",
  errYaEnSophonApoyo: "لا يمكن تفعيل إلا الحسابات المسجَّلة عبر فريقك. أما السابقة فتعود إلى المشغّل.",
  errNoExisteEnSophon: "البريد غير موجود في Sophon.",
  errNoExisteEnSophonApoyo: "يجب تسجيل الحساب في Sophon قبل تفعيله.",
  errSinWhitelist: "الحساب غير مصرَّح له في Sophon.",
  errSinWhitelistApoyo: "تُعالَج الإجازة يدويًا مع الدعم. لم يُفعَّل شيء.",
  errSophonNoResponde: "Sophon لا يستجيب.",
  errSophonNoRespondeApoyo: "لم يُفعَّل شيء. أعد المحاولة بعد دقائق.",
  errSophonRechaza: "رفض Sophon التفعيل.",
  errSophonRechazaApoyo: "لم يُفعَّل شيء. وقد أُبلغ المشغّل.",
  errAltaNoRegistrada: "تعذّر تسجيل التفعيل.",
  errAltaNoRegistradaApoyo: "لم يُطبَّق أي تغيير. أعد المحاولة.",
  errSinClasificar: "تعذّر إتمام التفعيل.",
  errSinClasificarApoyo: "لم يُفعَّل شيء. وقد سُجِّل الخطأ.",

  errNoEsTuyo: "هذا الـ webmaster ليس في فريقك.",
  errNoEsTuyoApoyo: "لا يمكن تجديد PRO إلا لمن فعّلتهم أنت.",
  errNoEsTuyoAbrirApoyo: "تحقّق من البريد. وإن لم يُفعَّل بعد، فعّله من «تفعيل webmaster».",
  errProSigueActivo: "ما زال PRO ساريًا.",
  errProSigueActivoApoyo: "يصبح التجديد متاحًا عند انتهائه.",
  errProNoRegistrado: "تعذّر تسجيل PRO.",
  errProNoRegistradoApoyo: "لم يُطبَّق أي تغيير. أعد المحاولة من ملفه.",
  errProSinWhitelist: "الحساب غير مصرَّح له في Sophon.",
  errProSinWhitelistApoyo: "تُعالَج الإجازة يدويًا مع الدعم.",
  errProRechazado: "رفضت Sophon منح PRO.",
  errProRechazadoApoyo: "أعد المحاولة من ملفه بعد دقائق.",

  errRetiroFormato: "المبلغ أو العنوان بصيغة غير صالحة.",
  errRetiroFormatoApoyo: "راجعهما وأعد المحاولة.",
  errRetiroMinimo: (minimo: string) => `المبلغ أقل من الحد الأدنى البالغ ${minimo}.`,
  errRetiroMinimoApoyo: (importe: string) => `المبلغ المطلوب: ${importe}.`,
  errRetiroSaldo: (disponible: string) =>
    `يتجاوز المبلغ الرصيد المتاح البالغ ${disponible}.`,
  errRetiroSaldoApoyo: "لا يمكن سحب المبلغ المعلّق بانتظار التأكيد.",
  errRetiroYaHayUna: (importe: string) => `يوجد طلب معلّق بقيمة ${importe}.`,
  errRetiroYaHayUnaApoyo: "يُسمح بطلب واحد في كل مرة. ويمكن إلغاء الطلب الحالي لإنشاء آخر.",
  errRetiroNoRegistrado: "تعذّر تسجيل الطلب.",
  errRetiroNoRegistradoApoyo: "لم يُخصم أي مبلغ. أعد المحاولة.",

  botTitulo: "Sophon Promoters",
  botNecesitasCodigo: "يتطلب الدخول رمز تفعيل يوفّره المشغّل.",
  botCuandoLoTengas: "بالرمز، اربط حسابك من هنا.",
  botHola: (nombre: string) => `مرحبًا، ${nombre}. اختر خيارًا.`,
  botVincularCuenta: "اربط حسابي",
  botSuspendido: "الحساب موقوف. تواصل مع المشغّل لإعادة تفعيله.",
  botSinPublicar: "لم يُنشر التطبيق بعد. أبلغ المشغّل.",
  botCadaComando: "كل أمر يفتح شاشة:",
  botOStart: "أو /start للقائمة الكاملة.",
  botComandoDesconocido: "أمر غير معروف. استخدم /ayuda.",
  botUsaStart: "استخدم /start لفتح التطبيق.",
  botActivarAtajo: "/activar email@example.com — التفعيل دون فتح التطبيق",
  botActivarComoSeUsa: "اكتب البريد بعد الأمر: /activar email@example.com",
  botSinCuenta: "لا يوجد حساب وكيل مرتبط. استخدم /start لإنشائه.",
  botActivado: (email: string) => `فُعِّل ${email} في فريقك، مع سنة من PRO.`,
  botActivadoSinPro: (email: string) => `فُعِّل ${email} في فريقك.`,
  botActivadoSinProApoyo: "لم تُطبَّق سنة PRO. أعد محاولة المنح من ملفه.",

  botRetiroPagado: (importe: string) => `صُرفت الدفعة: ${importe}.`,
  botRedTitulo: "webmasters بلا نشاط",
  botRedParados: (n: number, total: number) =>
    `${n} من ${total} webmasters بلا تسجيلات حديثة:`,
  botRedDiasParado: (dias: number) => `${dias} أيام بلا نشاط`,
  botRedIncidencias: (n: number) =>
    `${n} ${n === 1 ? "webmaster" : "webmasters"} بمشكلات في Sophon؛ لا ${
      n === 1 ? "يستطيع" : "يستطيعون"
    } توليد تسجيلات:`,
  botRedYOtros: (n: number) => `…و${n} آخرون.`,
  botRedComoVerlo: "راجع «فريقي» للاطلاع على روابط الاستقطاب.",

  botRetiroPagadoRed: (red: string, wallet: string) => `${red} · USDT · ${wallet}`,
  botRetiroReferencia: (referencia: string) => `المرجع: ${referencia}`,
  botRetiroAprobado: (importe: string) =>
    `اعتُمد سحب ${importe}. ستُصرف الدفعة خلال الأيام القادمة.`,
  botRetiroRechazado: (importe: string) =>
    `رُفض سحب ${importe}. عاد المبلغ متاحًا.`,
  botMotivo: (motivo: string) => `السبب: ${motivo}`,

  // ── رسالة رمز الدخول ──────────────────────────────────────────────────────
  correoOtpAsunto: (codigo: string) => `${codigo} هو رمز دخولك`,
  correoOtpTuCodigo: "رمز التحقق الخاص بك:",
  // Dual y plural: دقيقة واحدة / دقيقتان / دقائق.
  correoOtpCaduca: (minutos: number) =>
    `صالح لمدة ${minutos} دقيقة ولاستعمال واحد.`,
  correoOtpNoPedido: "إن لم تطلب الدخول إلى Sophon Promoters، فتجاهل هذه الرسالة. فبدون الرمز لا يمكن الوصول إلى الحساب.",
  correoOtpTocaParaCopiar: "اضغط مطولاً على الرمز لنسخه.",
  correoPieMarca: "Sophon علامة تجارية مسجَّلة لشركة New Sophon Technology Limited.",

  loQueCobrasTu: "عمولتك",
  cobrasPorRegistro: (importe: string) =>
    `${importe} عن كل مستخدم مسجَّل، بصرف النظر عن البلد.`,
  cobrasPorPro: (porcentaje: string) =>
    `${porcentaje} على مشتريات PRO لهؤلاء المستخدمين.`,
  cobrasBonoMensual: "مكافأة شهرية عند بلوغ مستوى من التسجيلات بمجموع الفريق.",

  deDondeSale: "مصدر الرصيد",
  porRegistros: "التسجيلات",
  porComprasPro: "مشتريات PRO",
  porBonos: "المكافآت",
  porAjustes: "التسويات",
  deDondeSaleApoyo: "الإجمالي المتراكم موزَّعًا حسب البند.",
  bonosCobrados: "المكافآت المسجَّلة",
  bonoNivelDe: (usuarios: number) =>
    `مستوى ${usuarios.toLocaleString("ar")} تسجيل`,
  bonoSinNivel: "مكافأة الشهر",
  todaviaEnRevision: "بانتظار التأكيد",
  sinBonos: "لا توجد مكافآت مسجَّلة.",
  sinBonosApoyo: "تُمنح المكافأة عند بلوغ مستوى من التسجيلات خلال الشهر الميلادي. ويُعاد ضبط الاحتساب في اليوم الأول.",

  ayuda: "المساعدة",
  ayudaApoyo: "العمولات والتفعيلات والرصيد والمدفوعات.",
  ayudaNoResuelta: "لم تجد حالتك؟",
  ayudaNoResueltaApoyo: "راسلنا عبر البوت. وسيصلك الرد من القناة نفسها.",
  buscarEnLaAyuda: "ابحث في المساعدة",
  limpiarBusqueda: "مسح البحث",
  preguntasEncontradas: (encontradas: number, total: number) =>
    `${encontradas} من ${total} سؤالًا`,
  sinResultados: (termino: string) => `لا نتائج لـ «${termino}».`,
  paginaNoExiste: "الصفحة غير موجودة.",
  paginaNoExisteApoyo: "قد يعود الرابط إلى إصدار سابق من التطبيق.",
  objetivosDelBono: "أهداف المكافأة",
  nivelesAlcanzados: (alcanzados: number, total: number) =>
    `${alcanzados} من ${total} مستوى`,
  faltanRegistros: (n: number) =>
    `${n.toLocaleString("ar")} تسجيل حتى المستوى التالي`,
};

const catalogos: Record<Idioma, Cadenas> = { es, en, ar, it, pt };

export function cadenas(idioma: Idioma = IDIOMA_DE_RESPALDO): Cadenas {
  return catalogos[idioma];
}
