/**
 * Lo que la aplicación necesita para funcionar, comprobado AL ARRANCAR.
 *
 * Hasta ahora cada variable se leía donde hacía falta y su ausencia aparecía en
 * el peor momento posible: `PIMIENTA_OTP` en mitad de un alta, `CLAVE_CIFRADO`
 * al pulsar «solicitar retiro», `TELEGRAM_OPERADOR_ID` cuando el Operador
 * intentaba entrar al panel. Un despliegue al que le falta una variable
 * arrancaba verde y fallaba días después, sobre un usuario real.
 *
 * Aquí se comprueban todas de una vez, y en dos niveles que no son lo mismo:
 *
 *  - **Esenciales.** Sin ellas no hay aplicación: o no hay base de datos, o no
 *    se puede probar quién llama, o el dinero se guardaría sin cifrar. El
 *    proceso NO arranca. Es deliberado que sea así de duro: un contenedor que
 *    se niega a arrancar se ve en el panel de despliegue en treinta segundos,
 *    mientras que uno que arranca a medias se descubre en producción.
 *  - **De función.** Sin ellas la aplicación sirve, pero una pieza concreta
 *    queda apagada —no se pueden mandar OTP, el bot no recibe, el planificador
 *    no dispara—. Se avisa con el nombre de lo que se ha quedado sin funcionar,
 *    no con un «falta X» que no dice qué se ha perdido.
 *
 * El formato se comprueba, no solo la presencia: `CLAVE_CIFRADO` con 31 bytes
 * pasa cualquier `if (!clave)` y revienta en el primer cifrado.
 */

import { pegaDelToken } from "./bot/token.ts";
import { usaNombreAntiguo } from "./operador.ts";

interface Requisito {
  nombre: string;
  /** Qué deja de funcionar sin ella. Es lo que se lee en el log, no el nombre. */
  para: string;
  /** Comprobación adicional de formato; devuelve el motivo del rechazo. */
  formato?: (valor: string) => string | null;
  /** Nombre antiguo que sigue valiendo. Con cualquiera de los dos basta. */
  alternativa?: string;
}

/*
 * TRES VARIABLES QUE YA NO SE PIDEN.
 *
 * `PIMIENTA_OTP`, `TELEGRAM_WEBHOOK_SECRET` y `CRON_SECRET` no eran hechos del
 * mundo —no son la contraseña de nadie ni el nombre de un dominio—: eran cadenas
 * aleatorias cuyo único requisito es ser imposibles de adivinar y ser la misma a
 * los dos lados. Eso se deriva (`lib/secretos.ts`), y derivar es mejor que
 * pedir: no hay nada que copiar, nada que pegar mal y nada que se quede sin
 * poner. Si alguna está declarada, manda ella.
 *
 * Las dos últimas eran además fallos SILENCIOSOS cuando faltaban: el bot
 * respondía 503 a Telegram y los barridos respondían 503 al planificador, y en
 * ninguno de los dos casos hay nadie mirando.
 */

/** 32 bytes en base64, que es lo que exige AES-256. */
function claveDe32Bytes(valor: string): string | null {
  const b = Buffer.from(valor, "base64");
  return b.length === 32
    ? null
    : `son ${b.length} bytes y hacen falta 32 (openssl rand -base64 32)`;
}

const ESENCIALES: readonly Requisito[] = [
  { nombre: "DATABASE_URL", para: "la base de datos entera" },
  {
    nombre: "TELEGRAM_BOT_TOKEN",
    para: "verificar la firma de Telegram; sin ella NINGUNA petición de la Mini App se autentica",
  },
  {
    nombre: "CLAVE_CIFRADO",
    para: "cifrar las wallets de los retiros",
    formato: claveDe32Bytes,
  },
];

const DE_FUNCION: readonly Requisito[] = [
  {
    nombre: "APP_URL",
    para: "los enlaces del bot y el registro del webhook; sin ella el bot no se configura",
  },
  {
    nombre: "TELEGRAM_OPERADOR_ID",
    para: "el panel del Operador, sus comandos del bot y los avisos de retiro",
    // Vale también el nombre antiguo mientras dure la transición: el valor está
    // en el panel de despliegue, no aquí. Ver `lib/operador.ts`.
    alternativa: "TELEGRAM_SUPERADMIN_ID",
  },
  {
    /*
     * No es esencial —sin ella el panel sigue teniendo su puerta por Telegram—
     * pero SÍ tiene que salir en el registro de arranque y en `/api/salud`.
     *
     * El motivo es un fallo real: sin esta línea, una clave sin declarar se
     * comporta exactamente igual que una clave mal escrita —el campo contesta
     * «formato de correo no válido» y ya— así que no hay forma de distinguir «me
     * he equivocado al teclear» de «la variable no está puesta en el panel de
     * despliegue». Con esto, `/api/salud` lo dice desde fuera y sin sesión.
     *
     * Se comprueba también la longitud: por debajo de 12 la clave se ignora
     * entera, y una variable declarada y demasiado corta se lee como puesta.
     */
    nombre: "CLAVE_OPERADOR",
    para: "entrar al panel escribiendo la clave en un campo de correo (la otra puerta es Telegram)",
    formato: (valor) =>
      valor.trim().length >= 12
        ? null
        : `son ${valor.trim().length} caracteres y hacen falta 12; por debajo se ignora entera`,
  },
  { nombre: "SMTP_HOST", para: "el envío de los códigos de acceso; sin él nadie puede darse de alta" },
  { nombre: "SOPHON_EMAIL", para: "leer registros e ingresos de Sophon" },
  { nombre: "SOPHON_PASSWORD", para: "leer registros e ingresos de Sophon" },
];

export interface RevisionEntorno {
  faltanEsenciales: string[];
  faltanDeFuncion: string[];
  /** Variables declaradas con espacios o saltos de línea alrededor. */
  conEspacios: string[];
}

/**
 * Variables pegadas con un espacio o un salto de línea de más.
 *
 * Es EL error del panel de despliegue —se copia el valor y se lleva el retorno
 * de carro—, y hasta ahora no lo veía nadie porque todo el mundo recortaba…
 * menos quien no lo hacía. El caso real: el token del bot con un salto de línea
 * al final dejaba el bot funcionando (el analizador de URL borra los saltos de
 * línea antes de llamar a Telegram) y la Mini App sin autenticar ni una sola
 * petición, porque ahí el token es la clave de un HMAC y un byte de más cambia
 * el resumen entero.
 *
 * Ya no rompe nada —se recorta en todas partes—, y aun así se avisa: una
 * contraseña con un espacio al final es un inicio de sesión de Sophon que falla
 * sin motivo aparente, y un `DATABASE_URL` con un salto es una conexión que se
 * cae por «host desconocido». Vale más leerlo una vez al arrancar.
 */
function conEspaciosAlrededor(): string[] {
  // `Set`: las de abajo se solapan con los requisitos, y una variable repetida
  // saldría dos veces en el aviso.
  const nombres = new Set([
    ...ESENCIALES.flatMap((r) => [r.nombre, ...(r.alternativa ? [r.alternativa] : [])]),
    ...DE_FUNCION.flatMap((r) => [r.nombre, ...(r.alternativa ? [r.alternativa] : [])]),
    // No son requisito de nadie porque se derivan, pero si están declaradas
    // tienen que coincidir byte a byte con el otro extremo.
    "PIMIENTA_OTP",
    "TELEGRAM_WEBHOOK_SECRET",
    "CRON_SECRET",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_PORT",
    "SMTP_REMITENTE",
  ]);
  return [...nombres].filter((n) => {
    const v = process.env[n];
    return typeof v === "string" && v.length > 0 && v !== v.trim();
  });
}

function revisar(lista: readonly Requisito[]): string[] {
  const fallos: string[] = [];
  for (const r of lista) {
    const valor =
      process.env[r.nombre]?.trim() ||
      (r.alternativa ? process.env[r.alternativa]?.trim() : undefined);
    if (!valor) {
      fallos.push(`${r.nombre} — sin ella no funciona: ${r.para}`);
      continue;
    }
    const motivo = r.formato?.(valor);
    if (motivo) fallos.push(`${r.nombre} — ${motivo}`);
  }
  return fallos;
}

/**
 * Comprueba el entorno y lo cuenta por consola.
 *
 * Devuelve el resultado en vez de decidir qué hacer con él: quien la llama sabe
 * si está arrancando el servidor —y entonces un esencial que falta es motivo
 * para no arrancar— o si solo está informando, como hace `/api/salud`.
 */
export function revisarEntorno(): RevisionEntorno {
  return {
    faltanEsenciales: revisar(ESENCIALES),
    faltanDeFuncion: revisar(DE_FUNCION),
    conEspacios: conEspaciosAlrededor(),
  };
}

/**
 * Comprobación de arranque. Lanza si falta algo esencial.
 *
 * En desarrollo NO lanza: quien acaba de clonar el repositorio para mirar una
 * pantalla no tiene por qué tener credenciales de Sophon ni una clave de
 * cifrado, y obligarle a inventárselas para que arranque `next dev` convertiría
 * la comprobación en algo que se desactiva. Avisa igual de fuerte.
 */
export function exigirEntorno(): void {
  const { faltanEsenciales, faltanDeFuncion, conEspacios } = revisarEntorno();

  if (conEspacios.length > 0) {
    console.warn(
      `[entorno] con espacios o saltos de línea alrededor: ${conEspacios.join(", ")}. ` +
        "Se recortan al leerlas, pero repásalas en el panel de despliegue.",
    );
  }

  // El token del bot aparte, porque su forma se puede comprobar y porque es el
  // único valor cuyo defecto no se manifiesta donde se usa.
  const pega = pegaDelToken();
  if (pega) console.warn(`[entorno] TELEGRAM_BOT_TOKEN ${pega}`);

  // El respaldo funciona, pero callarlo lo convertiría en permanente.
  if (usaNombreAntiguo()) {
    console.warn(
      "[entorno] TELEGRAM_SUPERADMIN_ID sigue en uso. Funciona, pero renómbrala a " +
        "TELEGRAM_OPERADOR_ID en el panel de despliegue: el respaldo es de transición.",
    );
  }

  for (const f of faltanDeFuncion) {
    console.warn(`[entorno] queda apagado: ${f}`);
  }

  if (faltanEsenciales.length === 0) {
    console.info("[entorno] revisado: no falta nada esencial.");
    return;
  }

  const detalle = faltanEsenciales.map((f) => `  · ${f}`).join("\n");
  const mensaje = `[entorno] faltan variables ESENCIALES:\n${detalle}`;

  if (process.env.NODE_ENV === "production") {
    // Se registra además de lanzar: la traza de una excepción al arrancar suele
    // quedar cortada en los paneles de despliegue, y esto es lo que hay que leer.
    console.error(mensaje);
    throw new Error(
      `Faltan ${faltanEsenciales.length} variables de entorno esenciales. Están todas en .env.example.`,
    );
  }

  console.warn(`${mensaje}\n[entorno] en desarrollo se sigue adelante; en producción esto no arrancaría.`);
}
