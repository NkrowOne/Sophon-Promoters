/**
 * Lo que la aplicación necesita para funcionar, comprobado AL ARRANCAR.
 *
 * Hasta ahora cada variable se leía donde hacía falta y su ausencia aparecía en
 * el peor momento posible: `PIMIENTA_OTP` en mitad de un alta, `CLAVE_CIFRADO`
 * al pulsar «solicitar retiro», `TELEGRAM_SUPERADMIN_ID` cuando el superadmin
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

interface Requisito {
  nombre: string;
  /** Qué deja de funcionar sin ella. Es lo que se lee en el log, no el nombre. */
  para: string;
  /** Comprobación adicional de formato; devuelve el motivo del rechazo. */
  formato?: (valor: string) => string | null;
}

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
  { nombre: "PIMIENTA_OTP", para: "el hash de los códigos de acceso por correo" },
];

const DE_FUNCION: readonly Requisito[] = [
  { nombre: "APP_URL", para: "los enlaces que manda el bot (entrada al panel, alta de agentes)" },
  { nombre: "TELEGRAM_WEBHOOK_SECRET", para: "el bot: /api/bot responde 503 sin esto" },
  { nombre: "TELEGRAM_SUPERADMIN_ID", para: "el panel de superadmin y los avisos de retiro" },
  { nombre: "CRON_SECRET", para: "los barridos: /api/cron responde 503 sin esto" },
  { nombre: "SMTP_HOST", para: "el envío de los códigos de acceso; sin él nadie puede darse de alta" },
  { nombre: "SOPHON_EMAIL", para: "leer registros e ingresos de Sophon" },
  { nombre: "SOPHON_PASSWORD", para: "leer registros e ingresos de Sophon" },
];

export interface RevisionEntorno {
  faltanEsenciales: string[];
  faltanDeFuncion: string[];
}

function revisar(lista: readonly Requisito[]): string[] {
  const fallos: string[] = [];
  for (const r of lista) {
    const valor = process.env[r.nombre]?.trim();
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
  const { faltanEsenciales, faltanDeFuncion } = revisarEntorno();

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
