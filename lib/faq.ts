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
}

export interface SeccionFaq {
  titulo: string;
  preguntas: Pregunta[];
}

type Constructor = (d: DatosFaq) => SeccionFaq[];

const es: Constructor = (d) => [
  {
    titulo: "Cómo se gana",
    preguntas: [
      {
        pregunta: "¿Cómo gano dinero con esto?",
        respuesta: [
          "Por tres vías, y las tres caen en el mismo saldo: cada usuario que registra uno de tus webmasters, cada compra de PRO que hacen esos usuarios, y un bono al mes si toda tu red llega a un nivel de registros.",
          "No tienes que elegir entre ellas. Van sumando solas.",
        ],
      },
      {
        pregunta: "¿Cuánto cobro por cada usuario registrado?",
        respuesta: [
          d.cpa
            ? `${d.cpa} por usuario, sea cual sea su país.`
            : "Una cantidad fija por usuario, sea cual sea su país.",
          "El país sí cambia lo que cobra tu webmaster, y por eso la pantalla de precios lo separa por niveles. Lo tuyo es igual en los tres.",
        ],
      },
      {
        pregunta: "¿Y por las compras de PRO?",
        respuesta: [
          d.cps
            ? `Te llevas el ${d.cps} de lo que esos usuarios paguen por su PRO.`
            : "Te llevas un porcentaje de lo que esos usuarios paguen por su PRO.",
          "Se cobra cada vez que uno de ellos paga, no solo la primera vez.",
        ],
      },
      {
        pregunta: "¿Qué es el bono del mes?",
        respuesta: [
          d.primerNivel
            ? `Un premio por el total de registros de toda tu red dentro del mes. El primer nivel son ${d.primerNivel.usuarios} registros y paga ${d.primerNivel.premio}.`
            : "Un premio por el total de registros de toda tu red dentro del mes.",
          "Cuenta la red entera, no un webmaster suelto: por eso interesa tener varios en marcha a la vez.",
        ],
      },
      {
        pregunta: "¿Los niveles del bono se suman entre sí?",
        respuesta: [
          "No. Se paga el nivel más alto al que llegues, no la suma de todos los que hayas pasado.",
          "Si cruzas el primero y luego el segundo, cobras la diferencia hasta el segundo. El total del mes es siempre lo que paga un solo nivel.",
        ],
      },
      {
        pregunta: "¿El bono se guarda de un mes para otro?",
        respuesta: [
          "No. El contador vuelve a cero el día 1, así que el bono se puede ganar todos los meses y no se hereda del anterior.",
          "Lo que ya has cobrado no se toca.",
        ],
      },
      {
        pregunta: "Si mi webmaster sube de nivel, ¿cobro yo más?",
        respuesta: [
          "Tu comisión no cambia con el nivel: cobras lo mismo en todos.",
          "Lo que sube es lo que cobra él, y eso es lo que le enseñas en la pantalla de precios para que le compense traer más usuarios.",
        ],
      },
    ],
  },
  {
    titulo: "Tu equipo",
    preguntas: [
      {
        pregunta: "¿Qué es un webmaster?",
        respuesta: [
          "La persona que trae usuarios a Sophon. Tú no registras usuarios: los registran ellos, y tú cobras por lo que ellos consiguen.",
        ],
      },
      {
        pregunta: "¿Cómo doy de alta a uno?",
        respuesta: [
          "Desde «Activar webmaster». Escribes su correo, lo revisas en el paso de confirmación y activas.",
          "Su cuenta tiene que existir ya en Sophon: primero que se registre él, después lo activas tú.",
        ],
      },
      {
        pregunta: "Me dice que el correo no existe. ¿Qué hago?",
        respuesta: [
          "Comprueba que está bien escrito y que es el mismo con el que se registró en Sophon.",
          "Si todavía no tiene cuenta, que la cree y vuelve a intentarlo. El alta no funciona antes de eso.",
        ],
      },
      {
        pregunta: "¿Puedo deshacer una activación?",
        respuesta: [
          "No. Al activarlo queda vinculado a ti en Sophon para siempre y se gasta el año de PRO del alta.",
          "Por eso hay un paso de confirmación antes: es tu última oportunidad de corregir el correo.",
        ],
      },
      {
        pregunta: "¿Qué es el PRO y cuánto dura?",
        respuesta: [
          "Un año, desde el día que lo activas. Se lo das tú con el alta, no tiene que pagarlo.",
          "Cuando se acerca el final puedes renovarle otro año desde su ficha.",
        ],
      },
      {
        pregunta: "¿Cuentan los usuarios que registró antes de que yo lo diera de alta?",
        respuesta: [
          "No. Cuentan desde la fecha del alta en adelante.",
          "Es lo que aparece en su ficha como fecha desde la que cobras.",
        ],
      },
    ],
  },
  {
    titulo: "Tu dinero",
    preguntas: [
      {
        pregunta: "¿Por qué «Disponible» es menos que «Ganado»?",
        respuesta: [
          "Porque los últimos días todavía los estamos revisando. Sophon puede corregir un día a la baja después de darlo, así que ese tramo no se puede sacar aún.",
          "Cuando el día sale de revisión, su dinero pasa solo a disponible. No tienes que hacer nada.",
        ],
      },
      {
        pregunta: "¿Cada cuánto se actualiza?",
        respuesta: [
          "Todos los días. Leemos los datos de Sophon, apuntamos lo nuevo y dejamos lo anterior como estaba.",
        ],
      },
      {
        pregunta: "¿Puede bajar algo que ya tenía ganado?",
        respuesta: [
          "Sí, si Sophon corrige un día a la baja. Aparece como un ajuste, con su fecha, y nunca reescribimos lo de antes: se apunta la corrección aparte para que puedas verla.",
          "Los bonos que ya has cobrado no se quitan.",
        ],
      },
      {
        pregunta: "¿Dónde veo de dónde sale mi saldo?",
        respuesta: [
          "En «Tu saldo». Debajo de la escalera está el reparto por origen: registros, compras de PRO, bonos y ajustes.",
        ],
      },
    ],
  },
  {
    titulo: "Cobrar",
    preguntas: [
      {
        pregunta: "¿Cuánto es el mínimo para pedir un cobro?",
        respuesta: [
          d.minimo
            ? `${d.minimo}. Por debajo de eso el botón no deja pedir.`
            : "Lo tienes escrito en «Tu saldo», debajo del campo del importe. Por debajo de esa cifra el botón no deja pedir.",
        ],
      },
      {
        pregunta: "¿En qué redes se paga?",
        respuesta: [
          "En USDT, por TRC20 (TRON), BSC (BNB Smart Chain) o TON. Eliges la red al pedirlo.",
        ],
      },
      {
        pregunta: "¿Y si me equivoco de red?",
        respuesta: [
          "Un pago a la red equivocada no se recupera. Comprueba la dirección y la red antes de pedir.",
          "La aplicación revisa la forma de la dirección y te avisa si no encaja con la red elegida, pero no puede saber si el monedero es tuyo.",
        ],
      },
      {
        pregunta: "¿Cuánto tarda?",
        respuesta: [
          "De 1 a 3 días. Las revisiones son manuales: alguien mira cada solicitud antes de pagarla.",
        ],
      },
      {
        pregunta: "¿Puedo pedir dos cobros a la vez?",
        respuesta: [
          "No. Solo puede haber uno en curso. Cuando se resuelve, puedes pedir el siguiente.",
        ],
      },
      {
        pregunta: "Me han rechazado un cobro. ¿Y ahora?",
        respuesta: [
          "El saldo vuelve a estar disponible enseguida, no se pierde nada.",
          "El motivo sale junto a la solicitud en «Cobros anteriores». Corriges lo que diga y vuelves a pedirlo.",
        ],
      },
    ],
  },
  {
    titulo: "Tu cuenta",
    preguntas: [
      {
        pregunta: "¿Cómo entro?",
        respuesta: [
          "Con tu correo. Te mandamos un código de seis cifras que caduca a los pocos minutos y solo sirve una vez.",
        ],
      },
      {
        pregunta: "No me llega el código.",
        respuesta: [
          "Mira la carpeta de correo no deseado y comprueba que es el correo con el que te diste de alta.",
          "Si sigue sin llegar, pide otro: el anterior deja de valer en cuanto se manda el nuevo.",
        ],
      },
      {
        pregunta: "¿En qué idiomas está?",
        respuesta: [
          "En español, inglés, italiano, portugués y árabe. Sale del idioma que tengas puesto en Telegram; no hay que elegirlo aquí.",
        ],
      },
      {
        pregunta: "Tengo un problema que no está aquí.",
        respuesta: ["Escríbelo por el bot. Te contestamos por el mismo sitio."],
      },
    ],
  },
];

const en: Constructor = (d) => [
  {
    titulo: "How you earn",
    preguntas: [
      {
        pregunta: "How do I make money with this?",
        respuesta: [
          "Three ways, and all three land in the same balance: every user one of your webmasters signs up, every PRO purchase those users make, and a monthly bonus if your whole team hits a sign-up level.",
          "You do not pick between them. They add up on their own.",
        ],
      },
      {
        pregunta: "How much do I earn per registered user?",
        respuesta: [
          d.cpa ? `${d.cpa} per user, whatever their country.` : "A fixed amount per user, whatever their country.",
          "The country does change what your webmaster earns, which is why the prices screen splits it by level. Your side is the same across all three.",
        ],
      },
      {
        pregunta: "And on PRO purchases?",
        respuesta: [
          d.cps
            ? `You take ${d.cps} of whatever those users pay for their PRO.`
            : "You take a percentage of whatever those users pay for their PRO.",
          "It pays out every time one of them pays, not just the first time.",
        ],
      },
      {
        pregunta: "What is the monthly bonus?",
        respuesta: [
          d.primerNivel
            ? `A reward for the total sign-ups across your whole team within the month. The first level is ${d.primerNivel.usuarios} sign-ups and pays ${d.primerNivel.premio}.`
            : "A reward for the total sign-ups across your whole team within the month.",
          "It counts the whole team, not one webmaster on their own — which is why it pays to keep several running at once.",
        ],
      },
      {
        pregunta: "Do bonus levels stack?",
        respuesta: [
          "No. You get the highest level you reach, not the sum of the ones below it.",
          "Cross the first and then the second, and you are paid the difference up to the second. The month's total is always what a single level pays.",
        ],
      },
      {
        pregunta: "Does the bonus carry over to the next month?",
        respuesta: [
          "No. The counter goes back to zero on the 1st, so the bonus can be won every month and nothing is inherited from the last one.",
          "What you have already been paid stays yours.",
        ],
      },
      {
        pregunta: "If my webmaster moves up a level, do I earn more?",
        respuesta: [
          "Your commission does not change with the level: you earn the same at every one.",
          "What goes up is what they earn, and that is what you show them on the prices screen so bringing in more users pays off for them.",
        ],
      },
    ],
  },
  {
    titulo: "Your team",
    preguntas: [
      {
        pregunta: "What is a webmaster?",
        respuesta: [
          "The person who brings users to Sophon. You do not sign up users yourself: they do, and you earn on what they bring in.",
        ],
      },
      {
        pregunta: "How do I activate one?",
        respuesta: [
          "From «Activate webmaster». You type their email, check it on the confirmation step and activate.",
          "Their account has to exist on Sophon already: they register first, you activate after.",
        ],
      },
      {
        pregunta: "It says the email does not exist. What now?",
        respuesta: [
          "Check the spelling and that it is the same address they registered with on Sophon.",
          "If they have no account yet, have them create one and try again. Activation will not work before that.",
        ],
      },
      {
        pregunta: "Can I undo an activation?",
        respuesta: [
          "No. Activating links them to you on Sophon for good and spends the year of PRO that comes with it.",
          "That is what the confirmation step is for: it is your last chance to fix the address.",
        ],
      },
      {
        pregunta: "What is PRO and how long does it last?",
        respuesta: [
          "A year, from the day you activate them. You give it to them with the activation; they pay nothing for it.",
          "As it runs out you can renew another year from their profile.",
        ],
      },
      {
        pregunta: "Do the users they signed up before I activated them count?",
        respuesta: [
          "No. They count from the activation date onwards.",
          "That is the date shown on their profile as the day your earnings start.",
        ],
      },
    ],
  },
  {
    titulo: "Your money",
    preguntas: [
      {
        pregunta: "Why is «Available» less than «Earned»?",
        respuesta: [
          "Because we are still reviewing the last few days. Sophon can correct a day downwards after reporting it, so that stretch cannot be withdrawn yet.",
          "Once a day clears review, its money moves to available on its own. You do not have to do anything.",
        ],
      },
      {
        pregunta: "How often does it update?",
        respuesta: [
          "Every day. We read the data from Sophon, record what is new and leave what was already there untouched.",
        ],
      },
      {
        pregunta: "Can something I had already earned go down?",
        respuesta: [
          "Yes, if Sophon corrects a day downwards. It shows up as an adjustment, with its date, and we never rewrite the past: the correction is recorded separately so you can see it.",
          "Bonuses you have already been paid are not taken back.",
        ],
      },
      {
        pregunta: "Where do I see what my balance is made of?",
        respuesta: [
          "On «Your balance». Under the ladder there is the split by source: sign-ups, PRO purchases, bonuses and adjustments.",
        ],
      },
    ],
  },
  {
    titulo: "Getting paid",
    preguntas: [
      {
        pregunta: "What is the minimum to request a payout?",
        respuesta: [
          d.minimo
            ? `${d.minimo}. Below that the button will not let you request one.`
            : "It is written on «Your balance», under the amount field. Below that figure the button will not let you request one.",
        ],
      },
      {
        pregunta: "Which networks do you pay on?",
        respuesta: [
          "USDT, over TRC20 (TRON), BSC (BNB Smart Chain) or TON. You pick the network when you request it.",
        ],
      },
      {
        pregunta: "What if I pick the wrong network?",
        respuesta: [
          "A payment sent to the wrong network cannot be recovered. Check the address and the network before you request.",
          "The app checks the shape of the address and warns you if it does not match the network you picked, but it cannot know whether the wallet is yours.",
        ],
      },
      {
        pregunta: "How long does it take?",
        respuesta: [
          "1 to 3 days. Reviews are manual: someone looks at each request before paying it.",
        ],
      },
      {
        pregunta: "Can I have two payouts running at once?",
        respuesta: [
          "No. Only one can be open at a time. Once it is resolved you can request the next.",
        ],
      },
      {
        pregunta: "My payout was rejected. Now what?",
        respuesta: [
          "The balance goes straight back to available; nothing is lost.",
          "The reason shows next to the request under «Past payouts». Fix what it says and request again.",
        ],
      },
    ],
  },
  {
    titulo: "Your account",
    preguntas: [
      {
        pregunta: "How do I sign in?",
        respuesta: [
          "With your email. We send you a six-digit code that expires within minutes and works only once.",
        ],
      },
      {
        pregunta: "The code is not arriving.",
        respuesta: [
          "Check your spam folder and make sure it is the address you signed up with.",
          "If it still does not arrive, ask for another: the previous one stops working the moment the new one goes out.",
        ],
      },
      {
        pregunta: "What languages is it in?",
        respuesta: [
          "Spanish, English, Italian, Portuguese and Arabic. It follows the language set in Telegram; there is nothing to pick here.",
        ],
      },
      {
        pregunta: "I have a problem that is not listed here.",
        respuesta: ["Write it on the bot. We answer through the same place."],
      },
    ],
  },
];

const it: Constructor = (d) => [
  {
    titulo: "Come si guadagna",
    preguntas: [
      {
        pregunta: "Come guadagno con questa app?",
        respuesta: [
          "In tre modi, e tutti e tre finiscono nello stesso saldo: ogni utente che registra uno dei tuoi webmaster, ogni acquisto di PRO che fanno quegli utenti, e un bonus mensile se tutta la tua squadra arriva a un livello di registrazioni.",
          "Non devi sceglierne uno. Si sommano da soli.",
        ],
      },
      {
        pregunta: "Quanto guadagno per ogni utente registrato?",
        respuesta: [
          d.cpa ? `${d.cpa} per utente, qualunque sia il suo paese.` : "Una cifra fissa per utente, qualunque sia il suo paese.",
          "Il paese cambia quello che guadagna il tuo webmaster, ed è per questo che la schermata dei prezzi lo divide per livelli. La tua parte è uguale in tutti e tre.",
        ],
      },
      {
        pregunta: "E sugli acquisti di PRO?",
        respuesta: [
          d.cps
            ? `Prendi il ${d.cps} di quello che quegli utenti pagano per il loro PRO.`
            : "Prendi una percentuale di quello che quegli utenti pagano per il loro PRO.",
          "Si guadagna ogni volta che uno di loro paga, non solo la prima.",
        ],
      },
      {
        pregunta: "Cos'è il bonus del mese?",
        respuesta: [
          d.primerNivel
            ? `Un premio sul totale delle registrazioni di tutta la tua squadra nel mese. Il primo livello è ${d.primerNivel.usuarios} registrazioni e paga ${d.primerNivel.premio}.`
            : "Un premio sul totale delle registrazioni di tutta la tua squadra nel mese.",
          "Conta la squadra intera, non un webmaster da solo: per questo conviene averne più di uno attivo.",
        ],
      },
      {
        pregunta: "I livelli del bonus si sommano tra loro?",
        respuesta: [
          "No. Si paga il livello più alto che raggiungi, non la somma di quelli sotto.",
          "Se superi il primo e poi il secondo, ti viene pagata la differenza fino al secondo. Il totale del mese è sempre quello che paga un solo livello.",
        ],
      },
      {
        pregunta: "Il bonus si porta al mese dopo?",
        respuesta: [
          "No. Il contatore torna a zero il giorno 1, quindi il bonus si può vincere tutti i mesi e non si eredita nulla dal precedente.",
          "Quello che hai già incassato resta tuo.",
        ],
      },
      {
        pregunta: "Se il mio webmaster sale di livello, guadagno di più?",
        respuesta: [
          "La tua commissione non cambia con il livello: guadagni lo stesso in tutti.",
          "Quello che sale è quanto guadagna lui, ed è quello che gli mostri nella schermata dei prezzi perché gli convenga portare più utenti.",
        ],
      },
    ],
  },
  {
    titulo: "La tua squadra",
    preguntas: [
      {
        pregunta: "Cos'è un webmaster?",
        respuesta: [
          "La persona che porta utenti su Sophon. Tu non registri utenti: li registrano loro, e tu guadagni su quello che portano.",
        ],
      },
      {
        pregunta: "Come ne attivo uno?",
        respuesta: [
          "Da «Attiva webmaster». Scrivi la sua email, la rileggi nel passo di conferma e attivi.",
          "Il suo account deve esistere già su Sophon: prima si registra lui, poi lo attivi tu.",
        ],
      },
      {
        pregunta: "Dice che l'email non esiste. E adesso?",
        respuesta: [
          "Controlla che sia scritta bene e che sia la stessa con cui si è registrato su Sophon.",
          "Se non ha ancora un account, fagliene creare uno e riprova. Prima di quello l'attivazione non funziona.",
        ],
      },
      {
        pregunta: "Posso annullare un'attivazione?",
        respuesta: [
          "No. Attivandolo resta collegato a te su Sophon per sempre e si consuma l'anno di PRO dell'attivazione.",
          "Per questo c'è un passo di conferma: è l'ultima occasione per correggere l'indirizzo.",
        ],
      },
      {
        pregunta: "Cos'è il PRO e quanto dura?",
        respuesta: [
          "Un anno, dal giorno in cui lo attivi. Glielo dai tu con l'attivazione, non lo paga lui.",
          "Quando si avvicina la scadenza puoi rinnovargli un altro anno dalla sua scheda.",
        ],
      },
      {
        pregunta: "Contano gli utenti che ha registrato prima che lo attivassi?",
        respuesta: [
          "No. Contano dalla data di attivazione in poi.",
          "È la data che vedi sulla sua scheda come inizio dei tuoi guadagni.",
        ],
      },
    ],
  },
  {
    titulo: "I tuoi soldi",
    preguntas: [
      {
        pregunta: "Perché «Disponibile» è meno di «Guadagnato»?",
        respuesta: [
          "Perché gli ultimi giorni li stiamo ancora verificando. Sophon può correggere un giorno al ribasso dopo averlo comunicato, quindi quel pezzo non si può ancora ritirare.",
          "Quando un giorno esce dalla verifica, i suoi soldi passano da soli a disponibile. Non devi fare nulla.",
        ],
      },
      {
        pregunta: "Ogni quanto si aggiorna?",
        respuesta: [
          "Tutti i giorni. Leggiamo i dati di Sophon, registriamo quello che è nuovo e lasciamo com'era quello di prima.",
        ],
      },
      {
        pregunta: "Può scendere qualcosa che avevo già guadagnato?",
        respuesta: [
          "Sì, se Sophon corregge un giorno al ribasso. Compare come una rettifica, con la sua data, e non riscriviamo mai il passato: la correzione si registra a parte perché tu possa vederla.",
          "I bonus che hai già incassato non vengono tolti.",
        ],
      },
      {
        pregunta: "Dove vedo da dove viene il mio saldo?",
        respuesta: [
          "In «Il tuo saldo». Sotto la scala c'è la ripartizione per origine: registrazioni, acquisti di PRO, bonus e rettifiche.",
        ],
      },
    ],
  },
  {
    titulo: "Incassare",
    preguntas: [
      {
        pregunta: "Qual è il minimo per chiedere un pagamento?",
        respuesta: [
          d.minimo
            ? `${d.minimo}. Sotto quella cifra il pulsante non lo permette.`
            : "Lo trovi scritto in «Il tuo saldo», sotto il campo dell'importo. Sotto quella cifra il pulsante non lo permette.",
        ],
      },
      {
        pregunta: "Su quali reti si paga?",
        respuesta: [
          "In USDT, su TRC20 (TRON), BSC (BNB Smart Chain) o TON. La rete la scegli quando lo chiedi.",
        ],
      },
      {
        pregunta: "E se sbaglio rete?",
        respuesta: [
          "Un pagamento sulla rete sbagliata non si recupera. Controlla indirizzo e rete prima di chiedere.",
          "L'app controlla la forma dell'indirizzo e ti avvisa se non corrisponde alla rete scelta, ma non può sapere se il portafoglio è tuo.",
        ],
      },
      {
        pregunta: "Quanto ci vuole?",
        respuesta: [
          "Da 1 a 3 giorni. Le verifiche sono manuali: qualcuno guarda ogni richiesta prima di pagarla.",
        ],
      },
      {
        pregunta: "Posso avere due richieste aperte insieme?",
        respuesta: [
          "No. Ne può essere aperta una sola. Quando si risolve, puoi chiedere la successiva.",
        ],
      },
      {
        pregunta: "Mi hanno rifiutato un pagamento. E adesso?",
        respuesta: [
          "Il saldo torna subito disponibile, non si perde niente.",
          "Il motivo compare accanto alla richiesta in «Pagamenti precedenti». Correggi quello che dice e richiedilo.",
        ],
      },
    ],
  },
  {
    titulo: "Il tuo account",
    preguntas: [
      {
        pregunta: "Come entro?",
        respuesta: [
          "Con la tua email. Ti mandiamo un codice di sei cifre che scade in pochi minuti e vale una volta sola.",
        ],
      },
      {
        pregunta: "Il codice non arriva.",
        respuesta: [
          "Guarda nella posta indesiderata e controlla che sia l'indirizzo con cui ti sei registrato.",
          "Se ancora non arriva, chiedine un altro: il precedente smette di valere appena parte il nuovo.",
        ],
      },
      {
        pregunta: "In che lingue è?",
        respuesta: [
          "In spagnolo, inglese, italiano, portoghese e arabo. Segue la lingua che hai impostato su Telegram; qui non c'è niente da scegliere.",
        ],
      },
      {
        pregunta: "Ho un problema che qui non c'è.",
        respuesta: ["Scrivilo sul bot. Ti rispondiamo dallo stesso posto."],
      },
    ],
  },
];

const pt: Constructor = (d) => [
  {
    titulo: "Como se ganha",
    preguntas: [
      {
        pregunta: "Como ganho dinheiro com isto?",
        respuesta: [
          "Por três vias, e as três caem no mesmo saldo: cada utilizador que um dos teus webmasters regista, cada compra de PRO que esses utilizadores fazem, e um bónus por mês se toda a tua equipa chegar a um nível de registos.",
          "Não tens de escolher entre elas. Vão somando sozinhas.",
        ],
      },
      {
        pregunta: "Quanto ganho por cada utilizador registado?",
        respuesta: [
          d.cpa ? `${d.cpa} por utilizador, seja qual for o país.` : "Um valor fixo por utilizador, seja qual for o país.",
          "O país muda o que o teu webmaster ganha, e por isso o ecrã de preços separa isso por níveis. A tua parte é igual nos três.",
        ],
      },
      {
        pregunta: "E nas compras de PRO?",
        respuesta: [
          d.cps
            ? `Levas ${d.cps} do que esses utilizadores pagarem pelo PRO.`
            : "Levas uma percentagem do que esses utilizadores pagarem pelo PRO.",
          "Ganha-se sempre que um deles paga, não só da primeira vez.",
        ],
      },
      {
        pregunta: "O que é o bónus do mês?",
        respuesta: [
          d.primerNivel
            ? `Um prémio pelo total de registos de toda a tua equipa dentro do mês. O primeiro nível são ${d.primerNivel.usuarios} registos e paga ${d.primerNivel.premio}.`
            : "Um prémio pelo total de registos de toda a tua equipa dentro do mês.",
          "Conta a equipa inteira, não um webmaster sozinho: por isso compensa ter vários a andar ao mesmo tempo.",
        ],
      },
      {
        pregunta: "Os níveis do bónus somam-se entre si?",
        respuesta: [
          "Não. Paga-se o nível mais alto a que chegares, não a soma dos que ficaram por baixo.",
          "Se passares o primeiro e depois o segundo, recebes a diferença até ao segundo. O total do mês é sempre o que paga um só nível.",
        ],
      },
      {
        pregunta: "O bónus passa de um mês para o outro?",
        respuesta: [
          "Não. O contador volta a zero no dia 1, por isso o bónus pode ganhar-se todos os meses e não se herda nada do anterior.",
          "O que já recebeste não se toca.",
        ],
      },
      {
        pregunta: "Se o meu webmaster subir de nível, ganho mais?",
        respuesta: [
          "A tua comissão não muda com o nível: ganhas o mesmo em todos.",
          "O que sobe é o que ele ganha, e é isso que lhe mostras no ecrã de preços para lhe compensar trazer mais utilizadores.",
        ],
      },
    ],
  },
  {
    titulo: "A tua equipa",
    preguntas: [
      {
        pregunta: "O que é um webmaster?",
        respuesta: [
          "A pessoa que traz utilizadores para a Sophon. Tu não registas utilizadores: registam eles, e tu ganhas com o que eles trazem.",
        ],
      },
      {
        pregunta: "Como ativo um?",
        respuesta: [
          "Em «Ativar webmaster». Escreves o email dele, confirmas no passo seguinte e ativas.",
          "A conta dele já tem de existir na Sophon: primeiro regista-se ele, depois ativas tu.",
        ],
      },
      {
        pregunta: "Diz que o email não existe. E agora?",
        respuesta: [
          "Confirma que está bem escrito e que é o mesmo com que ele se registou na Sophon.",
          "Se ainda não tem conta, pede-lhe que a crie e tenta outra vez. Antes disso a ativação não funciona.",
        ],
      },
      {
        pregunta: "Posso desfazer uma ativação?",
        respuesta: [
          "Não. Ao ativá-lo fica ligado a ti na Sophon para sempre e gasta-se o ano de PRO da ativação.",
          "É para isso que serve o passo de confirmação: é a última oportunidade de corrigir o endereço.",
        ],
      },
      {
        pregunta: "O que é o PRO e quanto dura?",
        respuesta: [
          "Um ano, a partir do dia em que o ativas. És tu que lho dás com a ativação; ele não paga nada.",
          "Quando estiver a acabar podes renovar-lhe outro ano a partir da ficha dele.",
        ],
      },
      {
        pregunta: "Contam os utilizadores que ele registou antes de eu o ativar?",
        respuesta: [
          "Não. Contam a partir da data da ativação.",
          "É a data que aparece na ficha dele como início dos teus ganhos.",
        ],
      },
    ],
  },
  {
    titulo: "O teu dinheiro",
    preguntas: [
      {
        pregunta: "Porque é que «Disponível» é menos do que «Ganho»?",
        respuesta: [
          "Porque os últimos dias ainda estão a ser revistos. A Sophon pode corrigir um dia em baixa depois de o comunicar, por isso esse troço ainda não se pode levantar.",
          "Quando um dia sai da revisão, o dinheiro passa sozinho a disponível. Não tens de fazer nada.",
        ],
      },
      {
        pregunta: "De quanto em quanto tempo se atualiza?",
        respuesta: [
          "Todos os dias. Lemos os dados da Sophon, apontamos o que é novo e deixamos o anterior como estava.",
        ],
      },
      {
        pregunta: "Pode descer alguma coisa que eu já tinha ganho?",
        respuesta: [
          "Pode, se a Sophon corrigir um dia em baixa. Aparece como um acerto, com a sua data, e nunca reescrevemos o passado: a correção fica registada à parte para a poderes ver.",
          "Os bónus que já recebeste não são retirados.",
        ],
      },
      {
        pregunta: "Onde vejo de onde vem o meu saldo?",
        respuesta: [
          "Em «O teu saldo». Por baixo da escada está a repartição por origem: registos, compras de PRO, bónus e acertos.",
        ],
      },
    ],
  },
  {
    titulo: "Receber",
    preguntas: [
      {
        pregunta: "Qual é o mínimo para pedir um pagamento?",
        respuesta: [
          d.minimo
            ? `${d.minimo}. Abaixo disso o botão não deixa pedir.`
            : "Está escrito em «O teu saldo», por baixo do campo do valor. Abaixo dessa cifra o botão não deixa pedir.",
        ],
      },
      {
        pregunta: "Em que redes se paga?",
        respuesta: [
          "Em USDT, por TRC20 (TRON), BSC (BNB Smart Chain) ou TON. Escolhes a rede ao pedir.",
        ],
      },
      {
        pregunta: "E se enganar-me na rede?",
        respuesta: [
          "Um pagamento na rede errada não se recupera. Confirma o endereço e a rede antes de pedir.",
          "A aplicação verifica a forma do endereço e avisa-te se não encaixar na rede escolhida, mas não pode saber se a carteira é tua.",
        ],
      },
      {
        pregunta: "Quanto tempo demora?",
        respuesta: [
          "De 1 a 3 dias. As revisões são manuais: alguém olha para cada pedido antes de o pagar.",
        ],
      },
      {
        pregunta: "Posso ter dois pedidos ao mesmo tempo?",
        respuesta: [
          "Não. Só pode haver um a decorrer. Quando ficar resolvido, podes pedir o seguinte.",
        ],
      },
      {
        pregunta: "Recusaram-me um pagamento. E agora?",
        respuesta: [
          "O saldo volta logo a disponível, não se perde nada.",
          "O motivo aparece junto ao pedido em «Pagamentos anteriores». Corriges o que ele disser e pedes outra vez.",
        ],
      },
    ],
  },
  {
    titulo: "A tua conta",
    preguntas: [
      {
        pregunta: "Como entro?",
        respuesta: [
          "Com o teu email. Mandamos-te um código de seis dígitos que expira em poucos minutos e só serve uma vez.",
        ],
      },
      {
        pregunta: "O código não chega.",
        respuesta: [
          "Vê a pasta de correio não desejado e confirma que é o email com que te inscreveste.",
          "Se mesmo assim não chegar, pede outro: o anterior deixa de valer assim que o novo é enviado.",
        ],
      },
      {
        pregunta: "Em que idiomas está?",
        respuesta: [
          "Em espanhol, inglês, italiano, português e árabe. Segue o idioma que tens no Telegram; aqui não há nada a escolher.",
        ],
      },
      {
        pregunta: "Tenho um problema que não está aqui.",
        respuesta: ["Escreve pelo bot. Respondemos pelo mesmo sítio."],
      },
    ],
  },
];

const ar: Constructor = (d) => [
  {
    titulo: "كيف تربح",
    preguntas: [
      {
        pregunta: "كيف أربح المال من هذا؟",
        respuesta: [
          "بثلاث طرق، وكلها تصبّ في الرصيد نفسه: كل مستخدم يسجّله أحد webmasters لديك، وكل عملية شراء PRO يقوم بها هؤلاء المستخدمون، ومكافأة شهرية إذا بلغ فريقك كله مستوى معيّنًا من التسجيلات.",
          "لا تختار بينها. تتراكم وحدها.",
        ],
      },
      {
        pregunta: "كم أربح عن كل مستخدم مسجَّل؟",
        respuesta: [
          d.cpa ? `${d.cpa} عن كل مستخدم، أيًا كان بلده.` : "مبلغ ثابت عن كل مستخدم، أيًا كان بلده.",
          "البلد يغيّر ما يربحه webmaster لديك، ولهذا تفصل شاشة الأسعار ذلك حسب المستوى. أما نصيبك فهو نفسه في المستويات الثلاثة.",
        ],
      },
      {
        pregunta: "وماذا عن مشتريات PRO؟",
        respuesta: [
          d.cps
            ? `تأخذ ${d.cps} مما يدفعه هؤلاء المستخدمون مقابل PRO.`
            : "تأخذ نسبة مما يدفعه هؤلاء المستخدمون مقابل PRO.",
          "يُحتسب في كل مرة يدفع فيها أحدهم، وليس في المرة الأولى فقط.",
        ],
      },
      {
        pregunta: "ما هي مكافأة الشهر؟",
        respuesta: [
          d.primerNivel
            ? `جائزة على مجموع تسجيلات فريقك كله خلال الشهر. المستوى الأول هو ${d.primerNivel.usuarios} تسجيلًا ويدفع ${d.primerNivel.premio}.`
            : "جائزة على مجموع تسجيلات فريقك كله خلال الشهر.",
          "تُحتسب على الفريق كله لا على webmaster واحد: لذلك يفيدك أن يكون لديك أكثر من واحد نشط.",
        ],
      },
      {
        pregunta: "هل تتجمع مستويات المكافأة؟",
        respuesta: [
          "لا. يُدفع أعلى مستوى تبلغه، لا مجموع المستويات التي تحتها.",
          "إذا تجاوزت الأول ثم الثاني، يُدفع لك الفرق حتى الثاني. مجموع الشهر هو دائمًا ما يدفعه مستوى واحد.",
        ],
      },
      {
        pregunta: "هل تنتقل المكافأة إلى الشهر التالي؟",
        respuesta: [
          "لا. يعود العدّاد إلى الصفر في اليوم الأول، فتُكسب المكافأة كل شهر ولا يُورَّث شيء من الشهر السابق.",
          "وما قبضته يبقى لك.",
        ],
      },
      {
        pregunta: "إذا ارتقى webmaster لديّ مستوى، هل أربح أكثر؟",
        respuesta: [
          "عمولتك لا تتغير بالمستوى: تربح المبلغ نفسه في كل المستويات.",
          "الذي يرتفع هو ما يربحه هو، وهذا ما تعرضه له في شاشة الأسعار كي يجد فائدة في جلب مستخدمين أكثر.",
        ],
      },
    ],
  },
  {
    titulo: "فريقك",
    preguntas: [
      {
        pregunta: "ما هو webmaster؟",
        respuesta: [
          "الشخص الذي يجلب المستخدمين إلى Sophon. أنت لا تسجّل مستخدمين: هم يسجّلونهم، وأنت تربح مما يجلبونه.",
        ],
      },
      {
        pregunta: "كيف أفعّل واحدًا؟",
        respuesta: [
          "من «تفعيل webmaster». تكتب بريده، وتراجعه في خطوة التأكيد، ثم تفعّل.",
          "يجب أن يكون حسابه موجودًا في Sophon مسبقًا: يسجّل هو أولًا، ثم تفعّله أنت.",
        ],
      },
      {
        pregunta: "تقول إن البريد غير موجود. ماذا أفعل؟",
        respuesta: [
          "تأكد من كتابته بشكل صحيح وأنه البريد نفسه الذي سجّل به في Sophon.",
          "إن لم يكن لديه حساب بعد، فليُنشئ واحدًا ثم أعد المحاولة. قبل ذلك لن يعمل التفعيل.",
        ],
      },
      {
        pregunta: "هل يمكنني التراجع عن تفعيل؟",
        respuesta: [
          "لا. بتفعيله يرتبط بك في Sophon نهائيًا وتُستهلك سنة PRO المرافقة للتفعيل.",
          "لهذا توجد خطوة التأكيد: هي فرصتك الأخيرة لتصحيح البريد.",
        ],
      },
      {
        pregunta: "ما هو PRO وكم يدوم؟",
        respuesta: [
          "سنة، من يوم تفعيله. أنت من يمنحه إياها مع التفعيل، ولا يدفع هو شيئًا.",
          "وعند اقتراب انتهائها يمكنك تجديد سنة أخرى من صفحته.",
        ],
      },
      {
        pregunta: "هل يُحتسب المستخدمون الذين سجّلهم قبل أن أفعّله؟",
        respuesta: [
          "لا. يُحتسبون من تاريخ التفعيل فصاعدًا.",
          "وهو التاريخ الظاهر في صفحته بوصفه بداية أرباحك.",
        ],
      },
    ],
  },
  {
    titulo: "أموالك",
    preguntas: [
      {
        pregunta: "لماذا «المتاح» أقل من «المكتسب»؟",
        respuesta: [
          "لأن الأيام الأخيرة ما زالت قيد المراجعة. قد تصحّح Sophon يومًا بالخفض بعد الإبلاغ عنه، فلا يمكن سحب ذلك الجزء بعد.",
          "وحين يخرج اليوم من المراجعة ينتقل ماله إلى المتاح وحده. لا يلزمك فعل شيء.",
        ],
      },
      {
        pregunta: "كل كم يتحدّث؟",
        respuesta: [
          "كل يوم. نقرأ بيانات Sophon، ونسجّل الجديد، ونترك ما سبق كما هو.",
        ],
      },
      {
        pregunta: "هل يمكن أن ينقص شيء كسبته من قبل؟",
        respuesta: [
          "نعم، إذا صحّحت Sophon يومًا بالخفض. يظهر ذلك تسوية بتاريخها، ولا نعيد كتابة الماضي أبدًا: تُسجَّل التسوية على حدة كي تراها.",
          "أما المكافآت التي قبضتها فلا تُسترَد.",
        ],
      },
      {
        pregunta: "أين أرى مصدر رصيدي؟",
        respuesta: [
          "في «رصيدك». تحت السلّم يوجد التوزيع حسب المصدر: التسجيلات، ومشتريات PRO، والمكافآت، والتسويات.",
        ],
      },
    ],
  },
  {
    titulo: "القبض",
    preguntas: [
      {
        pregunta: "ما الحد الأدنى لطلب السحب؟",
        respuesta: [
          d.minimo
            ? `${d.minimo}. وتحت ذلك لا يسمح الزر بالطلب.`
            : "تجده مكتوبًا في «رصيدك»، تحت حقل المبلغ. وتحت ذلك المبلغ لا يسمح الزر بالطلب.",
        ],
      },
      {
        pregunta: "على أي شبكات يتم الدفع؟",
        respuesta: [
          "بـ USDT، عبر TRC20 (TRON) أو BSC (BNB Smart Chain) أو TON. تختار الشبكة عند الطلب.",
        ],
      },
      {
        pregunta: "وماذا لو أخطأت الشبكة؟",
        respuesta: [
          "الدفع إلى الشبكة الخطأ لا يُسترَد. تحقّق من العنوان والشبكة قبل الطلب.",
          "يتحقق التطبيق من شكل العنوان وينبّهك إن لم يطابق الشبكة المختارة، لكنه لا يعرف إن كانت المحفظة لك.",
        ],
      },
      {
        pregunta: "كم يستغرق؟",
        respuesta: [
          "من يوم إلى ثلاثة أيام. المراجعات يدوية: يطّلع شخص على كل طلب قبل دفعه.",
        ],
      },
      {
        pregunta: "هل يمكن أن يكون لديّ طلبان في الوقت نفسه؟",
        respuesta: [
          "لا. لا يكون مفتوحًا إلا طلب واحد. وحين يُحسَم يمكنك طلب التالي.",
        ],
      },
      {
        pregunta: "رُفض طلب السحب. ماذا الآن؟",
        respuesta: [
          "يعود الرصيد إلى المتاح فورًا، ولا يضيع شيء.",
          "ويظهر السبب بجانب الطلب في «المدفوعات السابقة». صحّح ما يقوله ثم اطلب من جديد.",
        ],
      },
    ],
  },
  {
    titulo: "حسابك",
    preguntas: [
      {
        pregunta: "كيف أدخل؟",
        respuesta: [
          "ببريدك. نرسل لك رمزًا من ستة أرقام ينتهي خلال دقائق ويصلح مرة واحدة.",
        ],
      },
      {
        pregunta: "الرمز لا يصل.",
        respuesta: [
          "راجع مجلد البريد غير المرغوب فيه، وتأكد أنه البريد الذي سجّلت به.",
          "وإن لم يصل بعد، اطلب رمزًا آخر: يبطل السابق فور إرسال الجديد.",
        ],
      },
      {
        pregunta: "بأي لغات يتوفر؟",
        respuesta: [
          "بالإسبانية والإنجليزية والإيطالية والبرتغالية والعربية. يتبع اللغة المضبوطة في Telegram؛ ولا شيء تختاره هنا.",
        ],
      },
      {
        pregunta: "لديّ مشكلة غير مذكورة هنا.",
        respuesta: ["اكتبها في البوت. نردّ عليك من المكان نفسه."],
      },
    ],
  },
];

const CATALOGOS: Record<Idioma, Constructor> = { es, en, it, pt, ar };

export function faq(idioma: Idioma, datos: DatosFaq): SeccionFaq[] {
  return (CATALOGOS[idioma] ?? CATALOGOS[IDIOMA_DE_RESPALDO])(datos);
}
