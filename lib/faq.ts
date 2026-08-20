/**
 * Las preguntas frecuentes, en las cinco lenguas.
 *
 * ── POR QUÉ NO VIVEN EN `lib/i18n.ts` ──
 *
 * Porque no son cadenas de interfaz, son TEXTO. El catálogo es una tabla plana
 * de rótulos —«Continuar», «Tu equipo»— y su tipo (`Ensanchar<typeof es>`) está
 * hecho para eso: aplana cualquier valor a `string`, así que una lista anidada
 * de secciones y preguntas no sobrevive. Meter aquí sesenta claves sueltas
 * (`faqSeccion1Pregunta3`) habría convertido el orden de lectura en algo que
 * solo existe en el JSX, y bastaría con reordenar dos líneas allí para que el
 * árabe leyera las respuestas en otro orden que el español.
 *
 * Con la estructura en el dato, la pantalla no decide nada: pinta lo que le
 * llega, y las cinco lenguas comparten forma por construcción.
 *
 * ── EL REGISTRO ES EL DE `lib/i18n.ts` ──
 *
 * Las mismas seis reglas, y aquí cuestan más de sostener: el texto largo tira
 * hacia la conversación. Las respuestas enuncian —«El importe disponible está
 * listo para retirar»—, dan cifras y plazos en vez de adverbios, y no animan a
 * nadie. Una pregunta frecuente contesta; no acompaña.
 *
 * ── LAS CIFRAS NO SE ESCRIBEN AQUÍ ──
 *
 * «Cobras 0,03 $ por registro» estuvo escrito a mano en cinco catálogos, y los
 * 0,03 son `TarifaVersion.cpaPorRegistroMicros`: un valor versionado que el
 * Operador cambia desde su panel justo para no reescribir el histórico. Una
 * respuesta que promete una cifra que ya no rige es peor que no tener respuesta.
 *
 * Así que entran por `DatosFaq`, ya formateadas en el idioma de la sesión, y
 * cada respuesta que las usa tiene su redacción SIN cifra para cuando todavía
 * no hay tarifa configurada. Un «0,00 $» ahí se leería como «no cobras nada».
 *
 * ── LA REGLA DURA SIGUE EN PIE ──
 *
 * Ni una respuesta dice lo que cobra el webmaster, ni el precio global, ni el
 * reparto de arriba. Esto contesta a «¿cuánto cobro yo?»; lo del webmaster se
 * enseña en `/precios`, que es la pantalla que existe para eso.
 */

import type { Idioma } from "./idiomas.ts";
import { IDIOMA_DE_RESPALDO } from "./idiomas.ts";

/** Lo que la pantalla sabe y el texto necesita. `null` = todavía sin configurar. */
export interface DatosFaq {
  /** Lo que cobra el agente por cada usuario registrado, ya formateado. */
  cpa: string | null;
  /** Su parte de las compras de PRO, ya en porcentaje. */
  cps: string | null;
  /** Mínimo para pedir un cobro, ya formateado. */
  minimo: string | null;
  /** El primer peldaño de la escalera del bono, para poder dar un ejemplo real. */
  primerNivel: { usuarios: string; premio: string } | null;
}

export interface Pregunta {
  pregunta: string;
  /** Párrafos. Dos como mucho: esto se lee en un móvil y de pie. */
  respuesta: string[];
  /**
   * Una pieza de interfaz que se pinta DEBAJO de la respuesta.
   *
   * Es un marcador, no un componente: este módulo es texto y datos, y meterle
   * JSX lo convertiría en cliente y en la práctica en otra pantalla. La página
   * decide qué dibuja cada marcador; aquí solo se dice cuál corresponde.
   *
   * Tiene un único valor y es a propósito. Una respuesta que explica el bono
   * mensual y no enseña dónde va el agente es la definición de una ayuda que se
   * lee una vez: con el medidor delante, la misma pregunta contesta «qué es» y
   * «cuánto llevas» a la vez, y esa segunda mitad cambia todos los días.
   */
  pieza?: "objetivosBono";
}

export interface SeccionFaq {
  titulo: string;
  preguntas: Pregunta[];
}

type Constructor = (d: DatosFaq) => SeccionFaq[];

const es: Constructor = (d) => [
  {
    titulo: "Comisiones",
    preguntas: [
      {
        pregunta: "¿Cómo se generan ingresos en el programa?",
        respuesta: [
          "Por tres conceptos, que se acumulan en el mismo saldo: cada usuario registrado por un webmaster del equipo, cada compra de PRO de esos usuarios, y un bono mensual cuando el conjunto del equipo alcanza un nivel de registros.",
        ],
      },
      {
        pregunta: "¿Cuál es la comisión por usuario registrado?",
        respuesta: [
          d.cpa
            ? `${d.cpa} por usuario, con independencia del país.`
            : "Un importe fijo por usuario, con independencia del país.",
          "El país determina la tarifa del webmaster, no la del agente: la comisión del agente es la misma en los tres niveles de país.",
        ],
      },
      {
        pregunta: "¿Cuál es la comisión sobre las compras de PRO?",
        respuesta: [
          d.cps
            ? `${d.cps} del importe que esos usuarios paguen por el PRO.`
            : "Un porcentaje del importe que esos usuarios paguen por el PRO.",
          "Se aplica a cada compra, no solo a la primera.",
        ],
      },
      {
        pregunta: "¿Qué es el bono mensual?",
        respuesta: [
          d.primerNivel
            ? `Un importe adicional por el total de registros del equipo dentro del mes natural. El primer nivel son ${d.primerNivel.usuarios} registros y corresponde a ${d.primerNivel.premio}.`
            : "Un importe adicional por el total de registros del equipo dentro del mes natural.",
          "El cómputo es agregado: suma los registros de todos los webmasters, no los de uno solo.",
        ],
        pieza: "objetivosBono",
      },
      {
        pregunta: "¿Los niveles del bono son acumulables?",
        respuesta: [
          "No. Se abona el nivel más alto alcanzado, no la suma de los inferiores.",
          "Al superar un segundo nivel se abona la diferencia hasta ese nivel. El total del mes equivale siempre al importe de un único nivel.",
        ],
      },
      {
        pregunta: "¿El bono se arrastra al mes siguiente?",
        respuesta: [
          "No. El cómputo se reinicia el día 1 de cada mes, de modo que el bono puede obtenerse todos los meses y no hereda nada del anterior.",
          "Los bonos ya abonados no se revierten.",
        ],
      },
      {
        pregunta: "Si el webmaster sube de nivel, ¿aumenta la comisión del agente?",
        respuesta: [
          "No. La comisión del agente es la misma en todos los niveles.",
          "Lo que aumenta es la tarifa del webmaster, que es el dato que se le muestra en la pantalla de precios.",
        ],
      },
    ],
  },
  {
    titulo: "Equipo",
    preguntas: [
      {
        pregunta: "¿Qué es un webmaster?",
        respuesta: [
          "El colaborador que aporta usuarios a Sophon. El agente no registra usuarios directamente: percibe comisión por los que aportan los webmasters de su equipo.",
        ],
      },
      {
        pregunta: "¿Cómo se activa un webmaster?",
        respuesta: [
          "Desde «Activar webmaster»: se introduce su correo, se revisa en el paso de confirmación y se activa.",
          "Su cuenta debe existir previamente en Sophon. El registro lo hace él; la activación, el agente.",
        ],
      },
      {
        pregunta: "El correo no existe en Sophon. ¿Qué procede?",
        respuesta: [
          "Comprobar que está bien escrito y que coincide con el que utilizó al registrarse en Sophon.",
          "Si aún no tiene cuenta, debe crearla antes. La activación no es posible hasta entonces.",
        ],
      },
      {
        pregunta: "¿La activación es reversible?",
        respuesta: [
          "No. El webmaster queda vinculado a la cuenta del agente en Sophon de forma permanente y se consume el año de PRO asociado.",
          "El paso de confirmación previo es la última oportunidad de corregir el correo.",
        ],
      },
      {
        pregunta: "¿Qué incluye el PRO y cuánto dura?",
        respuesta: [
          "Un año desde la fecha de activación, sin coste para el webmaster.",
          "Al aproximarse el vencimiento puede renovarse otro año desde su perfil.",
        ],
      },
      {
        pregunta: "¿Computan los usuarios registrados antes de la activación?",
        respuesta: [
          "No. Solo computan los registros posteriores a la fecha de activación.",
          "Esa fecha figura en el perfil del webmaster.",
        ],
      },
    ],
  },
  {
    titulo: "Saldo",
    preguntas: [
      {
        pregunta: "¿Por qué el importe disponible es inferior al ganado?",
        respuesta: [
          "Los últimos días permanecen en revisión. Sophon puede corregir a la baja una jornada ya comunicada, de modo que ese tramo no es retirable todavía.",
          "Al superar la revisión, el importe pasa automáticamente a disponible. No requiere ninguna acción.",
        ],
      },
      {
        pregunta: "¿Con qué frecuencia se actualizan los datos?",
        respuesta: [
          "A diario. Se leen los datos de Sophon, se registran los nuevos y los anteriores permanecen sin modificar.",
        ],
      },
      {
        pregunta: "¿Puede disminuir un importe ya ganado?",
        respuesta: [
          "Sí, si Sophon corrige una jornada a la baja. La corrección se registra como un ajuste con su propia fecha; el histórico no se reescribe.",
          "Los bonos ya abonados no se revierten.",
        ],
      },
      {
        pregunta: "¿Dónde se consulta el desglose del saldo?",
        respuesta: [
          "En «Saldo», bajo el estado del saldo: registros, compras de PRO, bonos y ajustes.",
        ],
      },
    ],
  },
  {
    titulo: "Cobros",
    preguntas: [
      {
        pregunta: "¿Cuál es el importe mínimo por solicitud?",
        respuesta: [
          d.minimo
            ? `${d.minimo}. Por debajo de esa cifra la solicitud no se admite.`
            : "Figura en «Saldo», bajo el campo del importe. Por debajo de esa cifra la solicitud no se admite.",
        ],
      },
      {
        pregunta: "¿En qué redes se realiza el pago?",
        respuesta: [
          "En USDT, sobre TRC20 (TRON), BSC (BNB Smart Chain) o TON. La red se elige al crear la solicitud.",
        ],
      },
      {
        pregunta: "¿Qué ocurre si la red es incorrecta?",
        respuesta: [
          "Un pago enviado a una red distinta de la del monedero no se recupera. Conviene verificar dirección y red antes de solicitar.",
          "La aplicación valida el formato de la dirección y avisa si no corresponde a la red elegida, pero no puede verificar la titularidad del monedero.",
        ],
      },
      {
        pregunta: "¿Cuál es el plazo de pago?",
        respuesta: [
          "Entre 1 y 3 días. La revisión es manual: cada solicitud se comprueba antes de emitir el pago.",
        ],
      },
      {
        pregunta: "¿Se admiten varias solicitudes simultáneas?",
        respuesta: [
          "No. Solo puede haber una solicitud en curso. La siguiente puede crearse una vez resuelta la anterior.",
        ],
      },
      {
        pregunta: "¿Qué procede si se rechaza una solicitud?",
        respuesta: [
          "El importe vuelve a estar disponible de inmediato.",
          "El motivo del rechazo figura junto a la solicitud en «Cobros anteriores». Una vez corregido, puede volver a solicitarse.",
        ],
      },
    ],
  },
  {
    titulo: "Cuenta",
    preguntas: [
      {
        pregunta: "¿Cómo se accede a la aplicación?",
        respuesta: [
          "Con el correo de la cuenta. Se envía un código de seis dígitos, válido durante 10 minutos y de un solo uso.",
        ],
      },
      {
        pregunta: "El código de verificación no llega.",
        respuesta: [
          "Revisar la carpeta de correo no deseado y comprobar que la dirección es la de la cuenta de agente.",
          "Si no llega, solicitar uno nuevo: el anterior queda anulado al emitirse el siguiente.",
        ],
      },
      {
        pregunta: "¿En qué idiomas está disponible?",
        respuesta: [
          "Español, inglés, italiano, portugués y árabe. El idioma se toma del configurado en Telegram; no se selecciona en la aplicación.",
        ],
      },
      {
        pregunta: "El caso no aparece en esta página.",
        respuesta: ["Escribir por el bot. La respuesta llega por el mismo canal."],
      },
    ],
  },
];

const en: Constructor = (d) => [
  {
    titulo: "Commissions",
    preguntas: [
      {
        pregunta: "How is revenue generated in the program?",
        respuesta: [
          "Through three concepts, all credited to the same balance: each user registered by a webmaster on the team, each PRO purchase made by those users, and a monthly bonus when the team as a whole reaches a sign-up level.",
        ],
      },
      {
        pregunta: "What is the commission per registered user?",
        respuesta: [
          d.cpa ? `${d.cpa} per user, regardless of country.` : "A fixed amount per user, regardless of country.",
          "Country determines the webmaster's rate, not the agent's: the agent commission is the same across all three country tiers.",
        ],
      },
      {
        pregunta: "What is the commission on PRO purchases?",
        respuesta: [
          d.cps
            ? `${d.cps} of the amount those users pay for PRO.`
            : "A percentage of the amount those users pay for PRO.",
          "It applies to every purchase, not only the first.",
        ],
      },
      {
        pregunta: "What is the monthly bonus?",
        respuesta: [
          d.primerNivel
            ? `An additional amount for the team's total sign-ups within the calendar month. The first level is ${d.primerNivel.usuarios} sign-ups and corresponds to ${d.primerNivel.premio}.`
            : "An additional amount for the team's total sign-ups within the calendar month.",
          "The count is aggregate: it adds up sign-ups across all webmasters, not those of a single one.",
        ],
        pieza: "objetivosBono",
      },
      {
        pregunta: "Do bonus levels stack?",
        respuesta: [
          "No. The highest level reached is paid, not the sum of the levels below it.",
          "On passing a second level, the difference up to that level is paid. The month's total always equals the amount of a single level.",
        ],
      },
      {
        pregunta: "Does the bonus carry over to the following month?",
        respuesta: [
          "No. The count resets on the 1st of each month, so the bonus can be obtained every month and inherits nothing from the previous one.",
          "Bonuses already paid are not reversed.",
        ],
      },
      {
        pregunta: "If the webmaster moves up a level, does the agent commission increase?",
        respuesta: [
          "No. The agent commission is the same at every level.",
          "What increases is the webmaster's rate, which is the figure shown to them on the prices screen.",
        ],
      },
    ],
  },
  {
    titulo: "Team",
    preguntas: [
      {
        pregunta: "What is a webmaster?",
        respuesta: [
          "The partner who brings users to Sophon. The agent does not register users directly: they earn commission on the users brought in by the webmasters on their team.",
        ],
      },
      {
        pregunta: "How is a webmaster activated?",
        respuesta: [
          "From «Activate webmaster»: enter their email, review it on the confirmation step and activate.",
          "Their account must already exist on Sophon. They handle registration; the agent handles activation.",
        ],
      },
      {
        pregunta: "The email does not exist on Sophon. What is the procedure?",
        respuesta: [
          "Check the spelling and that it matches the address used to register on Sophon.",
          "If they have no account yet, it must be created first. Activation is not possible until then.",
        ],
      },
      {
        pregunta: "Is activation reversible?",
        respuesta: [
          "No. The webmaster is permanently linked to the agent's account on Sophon and the associated year of PRO is consumed.",
          "The preceding confirmation step is the last opportunity to correct the address.",
        ],
      },
      {
        pregunta: "What does PRO include and how long does it last?",
        respuesta: [
          "One year from the activation date, at no cost to the webmaster.",
          "As expiry approaches, another year can be renewed from their profile.",
        ],
      },
      {
        pregunta: "Do users registered before activation count?",
        respuesta: [
          "No. Only sign-ups after the activation date are counted.",
          "That date is shown on the webmaster's profile.",
        ],
      },
    ],
  },
  {
    titulo: "Balance",
    preguntas: [
      {
        pregunta: "Why is the available amount lower than the amount earned?",
        respuesta: [
          "The most recent days remain under review. Sophon may revise a reported day downwards, so that portion is not yet withdrawable.",
          "Once review is cleared, the amount moves to available automatically. No action is required.",
        ],
      },
      {
        pregunta: "How often is the data updated?",
        respuesta: [
          "Daily. Data is read from Sophon, new entries are recorded and earlier ones remain unchanged.",
        ],
      },
      {
        pregunta: "Can an amount already earned decrease?",
        respuesta: [
          "Yes, if Sophon revises a day downwards. The correction is recorded as an adjustment with its own date; history is never rewritten.",
          "Bonuses already paid are not reversed.",
        ],
      },
      {
        pregunta: "Where is the balance breakdown shown?",
        respuesta: [
          "Under «Balance», below the balance status: sign-ups, PRO purchases, bonuses and adjustments.",
        ],
      },
    ],
  },
  {
    titulo: "Payouts",
    preguntas: [
      {
        pregunta: "What is the minimum amount per request?",
        respuesta: [
          d.minimo
            ? `${d.minimo}. Below that figure the request is not accepted.`
            : "It is shown under «Balance», below the amount field. Below that figure the request is not accepted.",
        ],
      },
      {
        pregunta: "Which networks are payments made on?",
        respuesta: [
          "In USDT, over TRC20 (TRON), BSC (BNB Smart Chain) or TON. The network is chosen when creating the request.",
        ],
      },
      {
        pregunta: "What happens if the network is wrong?",
        respuesta: [
          "A payment sent to a network other than the wallet's cannot be recovered. Address and network should be verified before requesting.",
          "The application validates the address format and warns if it does not match the chosen network, but it cannot verify wallet ownership.",
        ],
      },
      {
        pregunta: "What is the payment turnaround?",
        respuesta: [
          "1 to 3 days. Review is manual: every request is checked before the payment is issued.",
        ],
      },
      {
        pregunta: "Are simultaneous requests allowed?",
        respuesta: [
          "No. Only one request can be open at a time. The next can be created once the previous one is resolved.",
        ],
      },
      {
        pregunta: "What happens if a request is rejected?",
        respuesta: [
          "The amount becomes available again immediately.",
          "The reason for rejection is shown next to the request under «Past payouts». Once corrected, it can be requested again.",
        ],
      },
    ],
  },
  {
    titulo: "Account",
    preguntas: [
      {
        pregunta: "How is the application accessed?",
        respuesta: [
          "With the account email. A six-digit code is sent, valid for 10 minutes and single use only.",
        ],
      },
      {
        pregunta: "The verification code does not arrive.",
        respuesta: [
          "Check the spam folder and confirm the address is the one on the agent account.",
          "If it still does not arrive, request a new one: the previous code is voided when the next is issued.",
        ],
      },
      {
        pregunta: "Which languages are available?",
        respuesta: [
          "Spanish, English, Italian, Portuguese and Arabic. The language follows the one set in Telegram; it is not selected in the application.",
        ],
      },
      {
        pregunta: "The case is not listed on this page.",
        respuesta: ["Write on the bot. The reply arrives through the same channel."],
      },
    ],
  },
];

const it: Constructor = (d) => [
  {
    titulo: "Commissioni",
    preguntas: [
      {
        pregunta: "Come si generano guadagni nel programma?",
        respuesta: [
          "Attraverso tre voci, che confluiscono nello stesso saldo: ogni utente registrato da un webmaster della squadra, ogni acquisto di PRO di quegli utenti e un bonus mensile quando l'insieme della squadra raggiunge un livello di registrazioni.",
        ],
      },
      {
        pregunta: "Qual è la commissione per utente registrato?",
        respuesta: [
          d.cpa ? `${d.cpa} per utente, indipendentemente dal paese.` : "Un importo fisso per utente, indipendentemente dal paese.",
          "Il paese determina la tariffa del webmaster, non quella dell'agente: la commissione dell'agente è la stessa nei tre livelli di paese.",
        ],
      },
      {
        pregunta: "Qual è la commissione sugli acquisti di PRO?",
        respuesta: [
          d.cps
            ? `${d.cps} dell'importo che quegli utenti pagano per il PRO.`
            : "Una percentuale dell'importo che quegli utenti pagano per il PRO.",
          "Si applica a ogni acquisto, non solo al primo.",
        ],
      },
      {
        pregunta: "Che cos'è il bonus mensile?",
        respuesta: [
          d.primerNivel
            ? `Un importo aggiuntivo sul totale delle registrazioni della squadra entro il mese solare. Il primo livello è di ${d.primerNivel.usuarios} registrazioni e corrisponde a ${d.primerNivel.premio}.`
            : "Un importo aggiuntivo sul totale delle registrazioni della squadra entro il mese solare.",
          "Il conteggio è aggregato: somma le registrazioni di tutti i webmaster, non quelle di uno solo.",
        ],
        pieza: "objetivosBono",
      },
      {
        pregunta: "I livelli del bonus sono cumulabili?",
        respuesta: [
          "No. Viene corrisposto il livello più alto raggiunto, non la somma di quelli inferiori.",
          "Superando un secondo livello viene corrisposta la differenza fino a quel livello. Il totale del mese equivale sempre all'importo di un solo livello.",
        ],
      },
      {
        pregunta: "Il bonus si riporta al mese successivo?",
        respuesta: [
          "No. Il conteggio riparte il giorno 1 di ogni mese, quindi il bonus può essere ottenuto tutti i mesi e non eredita nulla dal precedente.",
          "I bonus già corrisposti non vengono revocati.",
        ],
      },
      {
        pregunta: "Se il webmaster sale di livello, aumenta la commissione dell'agente?",
        respuesta: [
          "No. La commissione dell'agente è la stessa in tutti i livelli.",
          "Ad aumentare è la tariffa del webmaster, che è il dato mostrato a lui nella schermata dei prezzi.",
        ],
      },
    ],
  },
  {
    titulo: "Squadra",
    preguntas: [
      {
        pregunta: "Che cos'è un webmaster?",
        respuesta: [
          "Il collaboratore che porta utenti su Sophon. L'agente non registra utenti direttamente: percepisce una commissione su quelli portati dai webmaster della sua squadra.",
        ],
      },
      {
        pregunta: "Come si attiva un webmaster?",
        respuesta: [
          "Da «Attiva webmaster»: si inserisce la sua email, la si rilegge nel passo di conferma e si attiva.",
          "Il suo account deve esistere già su Sophon. La registrazione la fa lui; l'attivazione, l'agente.",
        ],
      },
      {
        pregunta: "L'email non esiste su Sophon. Come si procede?",
        respuesta: [
          "Verificare che sia scritta correttamente e che coincida con quella usata per registrarsi su Sophon.",
          "Se non ha ancora un account, deve crearlo prima. Fino ad allora l'attivazione non è possibile.",
        ],
      },
      {
        pregunta: "L'attivazione è reversibile?",
        respuesta: [
          "No. Il webmaster resta collegato in modo permanente all'account dell'agente su Sophon e si consuma l'anno di PRO associato.",
          "Il passo di conferma precedente è l'ultima occasione per correggere l'indirizzo.",
        ],
      },
      {
        pregunta: "Che cosa include il PRO e quanto dura?",
        respuesta: [
          "Un anno dalla data di attivazione, senza costi per il webmaster.",
          "All'avvicinarsi della scadenza è possibile rinnovare un altro anno dal suo profilo.",
        ],
      },
      {
        pregunta: "Contano gli utenti registrati prima dell'attivazione?",
        respuesta: [
          "No. Contano solo le registrazioni successive alla data di attivazione.",
          "Tale data è indicata nel profilo del webmaster.",
        ],
      },
    ],
  },
  {
    titulo: "Saldo",
    preguntas: [
      {
        pregunta: "Perché l'importo disponibile è inferiore a quello maturato?",
        respuesta: [
          "Gli ultimi giorni restano in verifica. Sophon può correggere al ribasso una giornata già comunicata, quindi quella parte non è ancora prelevabile.",
          "Superata la verifica, l'importo passa automaticamente a disponibile. Non richiede alcuna azione.",
        ],
      },
      {
        pregunta: "Con quale frequenza si aggiornano i dati?",
        respuesta: [
          "Ogni giorno. Si leggono i dati di Sophon, si registrano quelli nuovi e i precedenti restano invariati.",
        ],
      },
      {
        pregunta: "Un importo già maturato può diminuire?",
        respuesta: [
          "Sì, se Sophon corregge una giornata al ribasso. La correzione viene registrata come rettifica con una propria data; lo storico non viene riscritto.",
          "I bonus già corrisposti non vengono revocati.",
        ],
      },
      {
        pregunta: "Dove si consulta la ripartizione del saldo?",
        respuesta: [
          "In «Saldo», sotto lo stato del saldo: registrazioni, acquisti di PRO, bonus e rettifiche.",
        ],
      },
    ],
  },
  {
    titulo: "Pagamenti",
    preguntas: [
      {
        pregunta: "Qual è l'importo minimo per richiesta?",
        respuesta: [
          d.minimo
            ? `${d.minimo}. Al di sotto di tale cifra la richiesta non viene accettata.`
            : "È indicato in «Saldo», sotto il campo dell'importo. Al di sotto di tale cifra la richiesta non viene accettata.",
        ],
      },
      {
        pregunta: "Su quali reti viene effettuato il pagamento?",
        respuesta: [
          "In USDT, su TRC20 (TRON), BSC (BNB Smart Chain) o TON. La rete si sceglie al momento della richiesta.",
        ],
      },
      {
        pregunta: "Che cosa succede se la rete è errata?",
        respuesta: [
          "Un pagamento inviato a una rete diversa da quella del portafoglio non si recupera. Conviene verificare indirizzo e rete prima di richiedere.",
          "L'applicazione convalida il formato dell'indirizzo e avvisa se non corrisponde alla rete scelta, ma non può verificare la titolarità del portafoglio.",
        ],
      },
      {
        pregunta: "Qual è il tempo di pagamento?",
        respuesta: [
          "Da 1 a 3 giorni. La verifica è manuale: ogni richiesta viene controllata prima di emettere il pagamento.",
        ],
      },
      {
        pregunta: "Sono ammesse richieste simultanee?",
        respuesta: [
          "No. Può essere aperta una sola richiesta alla volta. La successiva si può creare una volta risolta la precedente.",
        ],
      },
      {
        pregunta: "Che cosa succede se una richiesta viene rifiutata?",
        respuesta: [
          "L'importo torna immediatamente disponibile.",
          "Il motivo del rifiuto è indicato accanto alla richiesta in «Pagamenti precedenti». Una volta corretto, si può richiedere di nuovo.",
        ],
      },
    ],
  },
  {
    titulo: "Account",
    preguntas: [
      {
        pregunta: "Come si accede all'applicazione?",
        respuesta: [
          "Con l'email dell'account. Viene inviato un codice di sei cifre, valido 10 minuti e monouso.",
        ],
      },
      {
        pregunta: "Il codice di verifica non arriva.",
        respuesta: [
          "Controllare la posta indesiderata e verificare che l'indirizzo sia quello dell'account agente.",
          "Se non arriva, richiederne uno nuovo: il precedente viene annullato all'emissione del successivo.",
        ],
      },
      {
        pregunta: "In quali lingue è disponibile?",
        respuesta: [
          "Spagnolo, inglese, italiano, portoghese e arabo. La lingua segue quella impostata su Telegram; non si seleziona nell'applicazione.",
        ],
      },
      {
        pregunta: "Il caso non compare in questa pagina.",
        respuesta: ["Scrivere sul bot. La risposta arriva dallo stesso canale."],
      },
    ],
  },
];

const pt: Constructor = (d) => [
  {
    titulo: "Comissões",
    preguntas: [
      {
        pregunta: "Como se geram receitas no programa?",
        respuesta: [
          "Através de três rubricas, que se acumulam no mesmo saldo: cada utilizador registado por um webmaster da equipa, cada compra de PRO desses utilizadores e um bónus mensal quando o conjunto da equipa atinge um nível de registos.",
        ],
      },
      {
        pregunta: "Qual é a comissão por utilizador registado?",
        respuesta: [
          d.cpa ? `${d.cpa} por utilizador, independentemente do país.` : "Um valor fixo por utilizador, independentemente do país.",
          "O país determina a tarifa do webmaster, não a do agente: a comissão do agente é a mesma nos três níveis de país.",
        ],
      },
      {
        pregunta: "Qual é a comissão sobre as compras de PRO?",
        respuesta: [
          d.cps
            ? `${d.cps} do valor que esses utilizadores pagarem pelo PRO.`
            : "Uma percentagem do valor que esses utilizadores pagarem pelo PRO.",
          "Aplica-se a cada compra, não apenas à primeira.",
        ],
      },
      {
        pregunta: "O que é o bónus mensal?",
        respuesta: [
          d.primerNivel
            ? `Um valor adicional pelo total de registos da equipa dentro do mês de calendário. O primeiro nível são ${d.primerNivel.usuarios} registos e corresponde a ${d.primerNivel.premio}.`
            : "Um valor adicional pelo total de registos da equipa dentro do mês de calendário.",
          "A contagem é agregada: soma os registos de todos os webmasters, não os de um só.",
        ],
        pieza: "objetivosBono",
      },
      {
        pregunta: "Os níveis do bónus são acumuláveis?",
        respuesta: [
          "Não. Paga-se o nível mais alto atingido, não a soma dos inferiores.",
          "Ao ultrapassar um segundo nível paga-se a diferença até esse nível. O total do mês equivale sempre ao valor de um único nível.",
        ],
      },
      {
        pregunta: "O bónus transita para o mês seguinte?",
        respuesta: [
          "Não. A contagem reinicia no dia 1 de cada mês, pelo que o bónus pode obter-se todos os meses e não herda nada do anterior.",
          "Os bónus já pagos não são revertidos.",
        ],
      },
      {
        pregunta: "Se o webmaster subir de nível, aumenta a comissão do agente?",
        respuesta: [
          "Não. A comissão do agente é a mesma em todos os níveis.",
          "O que aumenta é a tarifa do webmaster, que é o dado que lhe é mostrado no ecrã de preços.",
        ],
      },
    ],
  },
  {
    titulo: "Equipa",
    preguntas: [
      {
        pregunta: "O que é um webmaster?",
        respuesta: [
          "O colaborador que traz utilizadores para a Sophon. O agente não regista utilizadores diretamente: recebe comissão pelos que são trazidos pelos webmasters da sua equipa.",
        ],
      },
      {
        pregunta: "Como se ativa um webmaster?",
        respuesta: [
          "Em «Ativar webmaster»: introduz-se o email, revê-se no passo de confirmação e ativa-se.",
          "A conta dele tem de existir previamente na Sophon. O registo é feito por ele; a ativação, pelo agente.",
        ],
      },
      {
        pregunta: "O email não existe na Sophon. Como se procede?",
        respuesta: [
          "Verificar que está bem escrito e que coincide com o utilizado no registo na Sophon.",
          "Se ainda não tiver conta, deve criá-la primeiro. Até lá a ativação não é possível.",
        ],
      },
      {
        pregunta: "A ativação é reversível?",
        respuesta: [
          "Não. O webmaster fica associado de forma permanente à conta do agente na Sophon e consome-se o ano de PRO associado.",
          "O passo de confirmação anterior é a última oportunidade de corrigir o endereço.",
        ],
      },
      {
        pregunta: "O que inclui o PRO e quanto dura?",
        respuesta: [
          "Um ano a partir da data de ativação, sem custo para o webmaster.",
          "Ao aproximar-se o vencimento pode renovar-se outro ano a partir do seu perfil.",
        ],
      },
      {
        pregunta: "Contam os utilizadores registados antes da ativação?",
        respuesta: [
          "Não. Apenas contam os registos posteriores à data de ativação.",
          "Essa data consta do perfil do webmaster.",
        ],
      },
    ],
  },
  {
    titulo: "Saldo",
    preguntas: [
      {
        pregunta: "Porque é que o valor disponível é inferior ao ganho?",
        respuesta: [
          "Os últimos dias permanecem em revisão. A Sophon pode corrigir em baixa um dia já comunicado, pelo que essa parcela ainda não é levantável.",
          "Concluída a revisão, o valor passa automaticamente a disponível. Não requer qualquer ação.",
        ],
      },
      {
        pregunta: "Com que frequência são atualizados os dados?",
        respuesta: [
          "Diariamente. Leem-se os dados da Sophon, registam-se os novos e os anteriores permanecem inalterados.",
        ],
      },
      {
        pregunta: "Um valor já ganho pode diminuir?",
        respuesta: [
          "Sim, se a Sophon corrigir um dia em baixa. A correção é registada como um acerto com data própria; o histórico não é reescrito.",
          "Os bónus já pagos não são revertidos.",
        ],
      },
      {
        pregunta: "Onde se consulta a discriminação do saldo?",
        respuesta: [
          "Em «Saldo», por baixo do estado do saldo: registos, compras de PRO, bónus e acertos.",
        ],
      },
    ],
  },
  {
    titulo: "Pagamentos",
    preguntas: [
      {
        pregunta: "Qual é o valor mínimo por pedido?",
        respuesta: [
          d.minimo
            ? `${d.minimo}. Abaixo dessa cifra o pedido não é aceite.`
            : "Consta em «Saldo», por baixo do campo do valor. Abaixo dessa cifra o pedido não é aceite.",
        ],
      },
      {
        pregunta: "Em que redes é feito o pagamento?",
        respuesta: [
          "Em USDT, sobre TRC20 (TRON), BSC (BNB Smart Chain) ou TON. A rede é escolhida ao criar o pedido.",
        ],
      },
      {
        pregunta: "O que acontece se a rede estiver errada?",
        respuesta: [
          "Um pagamento enviado para uma rede diferente da da carteira não se recupera. Convém verificar endereço e rede antes de solicitar.",
          "A aplicação valida o formato do endereço e avisa se não corresponder à rede escolhida, mas não pode verificar a titularidade da carteira.",
        ],
      },
      {
        pregunta: "Qual é o prazo de pagamento?",
        respuesta: [
          "Entre 1 e 3 dias. A revisão é manual: cada pedido é verificado antes de o pagamento ser emitido.",
        ],
      },
      {
        pregunta: "São admitidos pedidos simultâneos?",
        respuesta: [
          "Não. Só pode haver um pedido em curso. O seguinte pode ser criado depois de resolvido o anterior.",
        ],
      },
      {
        pregunta: "O que acontece se um pedido for recusado?",
        respuesta: [
          "O valor volta a estar disponível de imediato.",
          "O motivo da recusa consta junto ao pedido em «Pagamentos anteriores». Depois de corrigido, pode voltar a solicitar-se.",
        ],
      },
    ],
  },
  {
    titulo: "Conta",
    preguntas: [
      {
        pregunta: "Como se acede à aplicação?",
        respuesta: [
          "Com o email da conta. É enviado um código de seis dígitos, válido durante 10 minutos e de utilização única.",
        ],
      },
      {
        pregunta: "O código de verificação não chega.",
        respuesta: [
          "Verificar a pasta de correio não desejado e confirmar que o endereço é o da conta de agente.",
          "Se não chegar, solicitar um novo: o anterior fica anulado assim que o seguinte é emitido.",
        ],
      },
      {
        pregunta: "Em que idiomas está disponível?",
        respuesta: [
          "Espanhol, inglês, italiano, português e árabe. O idioma segue o configurado no Telegram; não se seleciona na aplicação.",
        ],
      },
      {
        pregunta: "O caso não aparece nesta página.",
        respuesta: ["Escrever pelo bot. A resposta chega pelo mesmo canal."],
      },
    ],
  },
];

const ar: Constructor = (d) => [
  {
    titulo: "العمولات",
    preguntas: [
      {
        pregunta: "كيف تتحقق الأرباح في البرنامج؟",
        respuesta: [
          "من ثلاثة بنود تتجمع في الرصيد نفسه: كل مستخدم يسجّله webmaster في الفريق، وكل عملية شراء PRO لهؤلاء المستخدمين، ومكافأة شهرية عند بلوغ الفريق مجتمعًا مستوى من التسجيلات.",
        ],
      },
      {
        pregunta: "ما مقدار العمولة عن كل مستخدم مسجَّل؟",
        respuesta: [
          d.cpa ? `${d.cpa} عن كل مستخدم، بصرف النظر عن البلد.` : "مبلغ ثابت عن كل مستخدم، بصرف النظر عن البلد.",
          "يحدّد البلد تعرفة webmaster لا تعرفة الوكيل: عمولة الوكيل واحدة في مستويات البلدان الثلاثة.",
        ],
      },
      {
        pregunta: "ما مقدار العمولة على مشتريات PRO؟",
        respuesta: [
          d.cps
            ? `${d.cps} من المبلغ الذي يدفعه هؤلاء المستخدمون مقابل PRO.`
            : "نسبة مئوية من المبلغ الذي يدفعه هؤلاء المستخدمون مقابل PRO.",
          "تُطبَّق على كل عملية شراء، لا على الأولى فحسب.",
        ],
      },
      {
        pregunta: "ما هي المكافأة الشهرية؟",
        respuesta: [
          d.primerNivel
            ? `مبلغ إضافي على إجمالي تسجيلات الفريق خلال الشهر الميلادي. المستوى الأول هو ${d.primerNivel.usuarios} تسجيلًا ويقابله ${d.primerNivel.premio}.`
            : "مبلغ إضافي على إجمالي تسجيلات الفريق خلال الشهر الميلادي.",
          "الاحتساب تجميعي: يجمع تسجيلات جميع webmasters لا تسجيلات واحد منهم.",
        ],
        pieza: "objetivosBono",
      },
      {
        pregunta: "هل مستويات المكافأة تراكمية؟",
        respuesta: [
          "لا. يُصرف أعلى مستوى تم بلوغه، لا مجموع المستويات الأدنى.",
          "وعند تجاوز مستوى ثانٍ يُصرف الفرق حتى ذلك المستوى. ويعادل إجمالي الشهر دائمًا مبلغ مستوى واحد.",
        ],
      },
      {
        pregunta: "هل تُرحَّل المكافأة إلى الشهر التالي؟",
        respuesta: [
          "لا. يُعاد ضبط الاحتساب في اليوم الأول من كل شهر، فتُكتسب المكافأة كل شهر ولا ترث شيئًا من الشهر السابق.",
          "والمكافآت المصروفة لا تُسترَد.",
        ],
      },
      {
        pregunta: "إذا ارتقى webmaster مستوى، هل ترتفع عمولة الوكيل؟",
        respuesta: [
          "لا. عمولة الوكيل واحدة في جميع المستويات.",
          "الذي يرتفع هو تعرفة webmaster، وهي البيان المعروض له في شاشة الأسعار.",
        ],
      },
    ],
  },
  {
    titulo: "الفريق",
    preguntas: [
      {
        pregunta: "ما هو webmaster؟",
        respuesta: [
          "الشريك الذي يجلب المستخدمين إلى Sophon. لا يسجّل الوكيل المستخدمين مباشرة، بل يتقاضى عمولة عمّن يجلبهم webmasters في فريقه.",
        ],
      },
      {
        pregunta: "كيف يُفعَّل webmaster؟",
        respuesta: [
          "من «تفعيل webmaster»: يُدخَل بريده، ويُراجَع في خطوة التأكيد، ثم يُفعَّل.",
          "ويجب أن يكون حسابه موجودًا في Sophon مسبقًا. التسجيل يقوم به هو، والتفعيل يقوم به الوكيل.",
        ],
      },
      {
        pregunta: "البريد غير موجود في Sophon. ما الإجراء؟",
        respuesta: [
          "التحقق من صحة كتابته ومن مطابقته للبريد المستخدَم عند التسجيل في Sophon.",
          "وإن لم يكن لديه حساب بعد، فعليه إنشاؤه أولًا. ولا يمكن التفعيل قبل ذلك.",
        ],
      },
      {
        pregunta: "هل التفعيل قابل للتراجع؟",
        respuesta: [
          "لا. يرتبط webmaster بحساب الوكيل في Sophon ارتباطًا دائمًا، وتُستهلك سنة PRO المرافقة.",
          "وخطوة التأكيد السابقة هي آخر فرصة لتصحيح العنوان.",
        ],
      },
      {
        pregunta: "ماذا يشمل PRO وكم يدوم؟",
        respuesta: [
          "سنة واحدة من تاريخ التفعيل، دون تكلفة على webmaster.",
          "وعند اقتراب انتهائها يمكن تجديد سنة أخرى من ملفه.",
        ],
      },
      {
        pregunta: "هل تُحتسب التسجيلات السابقة للتفعيل؟",
        respuesta: [
          "لا. تُحتسب التسجيلات اللاحقة لتاريخ التفعيل فقط.",
          "وهذا التاريخ مبيَّن في ملف webmaster.",
        ],
      },
    ],
  },
  {
    titulo: "الرصيد",
    preguntas: [
      {
        pregunta: "لماذا المبلغ المتاح أقل من المبلغ المكتسب؟",
        respuesta: [
          "تبقى الأيام الأخيرة قيد المراجعة. فقد تصحّح Sophon يومًا مُبلَّغًا عنه بالخفض، ولذلك لا يمكن سحب ذلك الجزء بعد.",
          "وعند اجتياز المراجعة ينتقل المبلغ تلقائيًا إلى المتاح، دون حاجة إلى أي إجراء.",
        ],
      },
      {
        pregunta: "ما وتيرة تحديث البيانات؟",
        respuesta: [
          "يوميًا. تُقرأ بيانات Sophon، ويُسجَّل الجديد، ويبقى السابق دون تعديل.",
        ],
      },
      {
        pregunta: "هل يمكن أن ينقص مبلغ مكتسب سلفًا؟",
        respuesta: [
          "نعم، إذا صحّحت Sophon يومًا بالخفض. تُسجَّل التسوية بتاريخها الخاص، ولا يُعاد كتابة السجل.",
          "والمكافآت المصروفة لا تُسترَد.",
        ],
      },
      {
        pregunta: "أين يُطالَع تفصيل الرصيد؟",
        respuesta: [
          "في «الرصيد»، أسفل حالة الرصيد: التسجيلات، ومشتريات PRO، والمكافآت، والتسويات.",
        ],
      },
    ],
  },
  {
    titulo: "المدفوعات",
    preguntas: [
      {
        pregunta: "ما الحد الأدنى للطلب الواحد؟",
        respuesta: [
          d.minimo
            ? `${d.minimo}. ودون ذلك المبلغ لا يُقبل الطلب.`
            : "مبيَّن في «الرصيد» أسفل حقل المبلغ. ودون ذلك المبلغ لا يُقبل الطلب.",
        ],
      },
      {
        pregunta: "على أي شبكات يتم الدفع؟",
        respuesta: [
          "بـ USDT، على TRC20 (TRON) أو BSC (BNB Smart Chain) أو TON. وتُختار الشبكة عند إنشاء الطلب.",
        ],
      },
      {
        pregunta: "ماذا يحدث إذا كانت الشبكة خاطئة؟",
        respuesta: [
          "الدفع إلى شبكة غير شبكة المحفظة لا يُسترَد. ويُستحسن التحقق من العنوان والشبكة قبل الطلب.",
          "يتحقق التطبيق من صيغة العنوان وينبّه إن لم تطابق الشبكة المختارة، لكنه لا يستطيع التحقق من ملكية المحفظة.",
        ],
      },
      {
        pregunta: "ما مدة الدفع؟",
        respuesta: [
          "من يوم إلى ثلاثة أيام. المراجعة يدوية: يُفحص كل طلب قبل صرف الدفعة.",
        ],
      },
      {
        pregunta: "هل تُقبل طلبات متزامنة؟",
        respuesta: [
          "لا. لا يكون قيد التنفيذ سوى طلب واحد. ويمكن إنشاء التالي بعد حسم السابق.",
        ],
      },
      {
        pregunta: "ماذا يحدث عند رفض طلب؟",
        respuesta: [
          "يعود المبلغ إلى المتاح فورًا.",
          "ويظهر سبب الرفض بجانب الطلب في «المدفوعات السابقة». وبعد التصحيح يمكن تقديمه من جديد.",
        ],
      },
    ],
  },
  {
    titulo: "الحساب",
    preguntas: [
      {
        pregunta: "كيف يتم الدخول إلى التطبيق؟",
        respuesta: [
          "ببريد الحساب. يُرسَل رمز من ستة أرقام، صالح 10 دقائق ولاستعمال واحد.",
        ],
      },
      {
        pregunta: "رمز التحقق لا يصل.",
        respuesta: [
          "مراجعة مجلد البريد غير المرغوب فيه، والتأكد من أن العنوان هو عنوان حساب الوكيل.",
          "وإن لم يصل، طلب رمز جديد: يُلغى السابق فور إصدار التالي.",
        ],
      },
      {
        pregunta: "بأي لغات يتوفر؟",
        respuesta: [
          "الإسبانية والإنجليزية والإيطالية والبرتغالية والعربية. تتبع اللغة ما هو مضبوط في Telegram، ولا تُختار داخل التطبيق.",
        ],
      },
      {
        pregunta: "الحالة غير مذكورة في هذه الصفحة.",
        respuesta: ["الكتابة عبر البوت. ويصل الرد من القناة نفسها."],
      },
    ],
  },
];

const CATALOGOS: Record<Idioma, Constructor> = { es, en, it, pt, ar };

export function faq(idioma: Idioma, datos: DatosFaq): SeccionFaq[] {
  return (CATALOGOS[idioma] ?? CATALOGOS[IDIOMA_DE_RESPALDO])(datos);
}
