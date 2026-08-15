/**
 * Primitivas criptográficas del sistema.
 *
 * Tres secretos distintos con vidas distintas: el token de Sophon (cifrado
 * reversible, porque hay que volver a usarlo), los OTP (hash con pimienta, nunca
 * se recuperan) y los tokens de sesión (hash, se comparan pero no se leen).
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

import { pimientaOtp } from "./secretos.ts";

const ALGORITMO = "aes-256-gcm";
const LONGITUD_IV = 12;
const LONGITUD_ETIQUETA = 16;

function clave(nombreVariable: string): Buffer {
  const bruto = process.env[nombreVariable];
  if (!bruto) throw new Error(`falta la variable de entorno ${nombreVariable}`);
  const b = Buffer.from(bruto, "base64");
  if (b.length !== 32) {
    throw new Error(`${nombreVariable} debe ser de 32 bytes en base64 (openssl rand -base64 32)`);
  }
  return b;
}

/**
 * Cifra un secreto que habrá que volver a leer, como el token de Sophon.
 * AES-256-GCM incluye autenticación: un texto cifrado manipulado falla al
 * descifrar en vez de devolver basura silenciosamente.
 */
export function cifrar(textoPlano: string): string {
  const iv = randomBytes(LONGITUD_IV);
  const cipher = createCipheriv(ALGORITMO, clave("CLAVE_CIFRADO"), iv);
  const cifrado = Buffer.concat([cipher.update(textoPlano, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), cifrado]).toString("base64");
}

export function descifrar(paquete: string): string {
  const bruto = Buffer.from(paquete, "base64");
  const iv = bruto.subarray(0, LONGITUD_IV);
  const etiqueta = bruto.subarray(LONGITUD_IV, LONGITUD_IV + LONGITUD_ETIQUETA);
  const cifrado = bruto.subarray(LONGITUD_IV + LONGITUD_ETIQUETA);
  const decipher = createDecipheriv(ALGORITMO, clave("CLAVE_CIFRADO"), iv);
  decipher.setAuthTag(etiqueta);
  return Buffer.concat([decipher.update(cifrado), decipher.final()]).toString("utf8");
}

/**
 * ── LAS WALLETS, CIFRADAS EN REPOSO ──
 *
 * Esto existía a medias y esa mitad era el defecto: `.env.example` prometía que
 * `CLAVE_CIFRADO` «cifra el token de Sophon y las wallets», `cifrar` y
 * `descifrar` estaban escritas y probadas… y **no las llamaba nadie**. El token
 * de Sophon nunca llega a persistirse —vive en memoria, en la caché del
 * cliente— así que la única cosa que había que cifrar era la wallet, y se
 * guardaba en claro. Una variable de entorno obligatoria que no protege nada es
 * peor que no tenerla: da por resuelto un riesgo que sigue abierto.
 *
 * Una wallet no es un secreto de acceso —no abre ninguna puerta— pero sí es el
 * dato con el que se paga a alguien: quien lea la tabla `SolicitudRetiro` sabe a
 * qué dirección va cada transferencia y de cuánto es. Cifrarla en reposo hace
 * que un volcado de la base no sea una lista de destinos de pago.
 *
 * **El prefijo lo decide todo.** La alternativa —intentar descifrar y ver si
 * falla— funcionaría (GCM autentica, así que una dirección TON interpretada
 * como base64 no pasaría la etiqueta), pero deja el criterio en manos de una
 * excepción. Con la marca delante, lo cifrado se reconoce mirándolo, y las
 * filas anteriores al cambio se leen tal cual sin migrar nada ni adivinar.
 */
const MARCA_CIFRADO = "enc.v1.";

/** Prepara una wallet para guardarla. Nunca se persiste el texto en claro. */
export function guardarWallet(direccion: string): string {
  return MARCA_CIFRADO + cifrar(direccion);
}

/**
 * Recupera una wallet guardada.
 *
 * Las filas escritas antes de que esto existiera están en claro y se devuelven
 * tal cual: no hay migración que las convierta —SQL no puede llamar a AES— y
 * romper el historial de pagos para estrenar el cifrado sería cambiar un riesgo
 * por una avería.
 */
export function leerWallet(guardado: string): string {
  if (!guardado.startsWith(MARCA_CIFRADO)) return guardado;
  return descifrar(guardado.slice(MARCA_CIFRADO.length));
}

/**
 * Forma recortada para enseñarla: se reconoce sin exponerla entera.
 *
 * El agente la comprueba de un vistazo en su historial, y una captura de esa
 * pantalla —que se comparte por chat sin pensarlo— no lleva la dirección
 * completa.
 */
export function mascaraWallet(direccion: string): string {
  if (direccion.length <= 12) return direccion;
  return `${direccion.slice(0, 6)}…${direccion.slice(-4)}`;
}

/**
 * Hash de un OTP con pimienta.
 *
 * La pimienta vive en el entorno, no en la base de datos: quien consiga un
 * volcado de la tabla no puede probar códigos contra ella. Los OTP son de seis
 * dígitos, así que sin pimienta un atacante con la tabla los rompería al instante.
 */
export function hashOtp(codigo: string, emailNormalizado: string): string {
  // Declarada manda; si no, se deriva de la clave maestra. Ver `lib/secretos.ts`.
  const pimienta = pimientaOtp();
  return createHmac("sha256", pimienta).update(`${emailNormalizado}:${codigo}`).digest("hex");
}

export function verificarOtp(codigo: string, emailNormalizado: string, hash: string): boolean {
  const calculado = Buffer.from(hashOtp(codigo, emailNormalizado), "hex");
  const esperado = Buffer.from(hash, "hex");
  if (calculado.length !== esperado.length) return false;
  return timingSafeEqual(calculado, esperado);
}

/** Código numérico de seis dígitos, con aleatoriedad criptográfica. */
export function generarOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Token de sesión opaco. Se entrega una sola vez y solo se guarda su hash:
 * un volcado de la base de datos no permite suplantar ninguna sesión.
 */
export function generarTokenSesion(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Código de activación legible en voz alta.
 * Alfabeto sin caracteres ambiguos (0/O, 1/I/L): estos códigos se dictan por
 * chat y se teclean a mano, y una confusión cuesta un intento fallido.
 */
const ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Genera el código en su forma CANÓNICA: sin guiones.
 *
 * Antes devolvía «MR7MD-APD6R» y ese guion se guardaba tal cual, pero las rutas
 * de alta buscan por `normalizarCodigo`, que lo quita. Resultado: ningún código
 * generado por el bot podía canjearse jamás. Lo destapó la prueba de extremo a
 * extremo; ni el typecheck ni los tests unitarios podían verlo, porque cada
 * mitad era correcta por separado.
 *
 * La regla que lo cierra: **se guarda y se compara siempre lo normalizado**, y
 * los guiones son cosa de la presentación (`formatearCodigo`).
 */
export function generarCodigoActivacion(longitud = 10): string {
  let salida = "";
  for (let i = 0; i < longitud; i++) {
    salida += ALFABETO_CODIGO[randomInt(0, ALFABETO_CODIGO.length)];
  }
  return salida;
}

export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Forma legible de un código: grupos de cinco separados por guion.
 *
 * Solo para enseñarlo y dictarlo. Nunca se guarda ni se compara así.
 */
export function formatearCodigo(codigo: string): string {
  return (normalizarCodigo(codigo).match(/.{1,5}/g) ?? []).join("-");
}

/** Normaliza un email para usarlo como identificador único. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Clave de idempotencia estable a partir de sus componentes. */
export function claveIdempotencia(...partes: readonly (string | number)[]): string {
  /*
   * El separador es un NUL, escrito como ESCAPE y no como el byte crudo.
   *
   * Aquí había un 0x00 literal dentro del fichero fuente, y eso tenía dos
   * consecuencias. La visible: git clasificaba `lib/cripto.ts` como BINARIO,
   * así que el módulo que guarda los OTP, los tokens de sesión y las wallets
   * era el único del repositorio cuyos cambios no se podían leer en un diff ni
   * fusionar en condiciones. La peligrosa: cualquier herramienta que normalice
   * el fichero —un editor, un formateador, un copiar y pegar— se lleva ese byte
   * por delante sin avisar, y entonces `join` deja de separar nada. Con las
   * partes pegadas, («ab», «c») y («a», «bc») pasan a dar la MISMA clave, y una
   * clave de idempotencia que colisiona es una concesión de PRO o un retiro que
   * no se registra porque parece repetido.
   *
   * `\u0000` es exactamente el mismo carácter en ejecución —las claves ya
   * emitidas siguen valiendo, comprobado— y además se ve al leer el código.
   */
  return createHash("sha256").update(partes.join("\u0000")).digest("hex").slice(0, 32);
}
