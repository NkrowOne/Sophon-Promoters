/**
 * Cadenas de la interfaz.
 *
 * Se externaliza todo desde el principio aunque solo el español esté escrito a
 * mano: añadir un idioma debe ser traducir un objeto, no rastrear literales por
 * los componentes.
 *
 * Voz: tuteo, verbo delante, sin jerga de afiliación y sin felicitaciones. El
 * agente es un profesional que cobra, no alguien a quien hay que animar. Los
 * errores dicen siempre qué pasó, por qué y qué hacer ahora.
 *
 * REGLA DURA: ninguna cadena puede revelar el reparto del superadmin ni el
 * importe que cobra el webmaster. El agente solo ve lo suyo.
 */

import { IDIOMA_POR_DEFECTO, type Idioma } from "./idiomas";

export const es = {
  // Navegación y rótulos
  inicio: "Inicio",
  red: "Tu red",
  historico: "Histórico",
  cartera: "Cartera",
  devengado: "DEVENGADO",
  disponible: "DISPONIBLE",
  solicitado: "SOLICITADO",
  pagado: "PAGADO",
  cupoPro: "CUPO PRO",
  tusWebmasters: "TUS WEBMASTERS",
  aportacionAcumulada: "APORTACIÓN ACUMULADA",
  vencenPro: "VENCEN PRO",

  // Acciones
  activarWebmaster: "Activar webmaster",
  concederPro: "Conceder PRO",
  renovarPro: "Renovar PRO",
  solicitarRetiro: "Solicitar retiro",
  exportarCsv: "Exportar CSV",
  copiarError: "Copiar detalle del error",
  vincularCuenta: "Vincular mi cuenta",
  reintentar: "Reintentar",

  // Estados vacíos: una pantalla vacía es una invitación a actuar.
  sinWebmasters: "Aún no has activado ningún webmaster.",
  sinWebmastersApoyo:
    "Activa el primero con su correo de Sophon y el testigo empezará a formarse.",
  sinIngresos: "Tus webmasters aún no han traído registros.",
  sinIngresosApoyo:
    "En cuanto alguien se registre desde su enlace, verás la primera capa aquí. Suele tardar unas horas.",
  sinMovimientos: "Todavía no has pedido ningún retiro.",
  sinVencimientos: "Ninguna membresía PRO vence en los próximos 30 días.",

  // Alta del agente
  pideCodigo: "Escribe el código de activación que te ha dado el superadmin.",
  pideEmail: "Escribe tu correo. Será tu identificador para entrar.",
  otpEnviado: (email: string) =>
    `Te hemos enviado un código de 6 dígitos a ${email}. Caduca en 10 minutos.`,
  otpIncorrecto: (restantes: number) =>
    `El código no coincide. Te ${restantes === 1 ? "queda 1 intento" : `quedan ${restantes} intentos`}.`,
  vinculado: (email: string) => `Listo. Tu Telegram queda vinculado a ${email}.`,
  vinculadoApoyo: "No tendrás que volver a entrar.",

  // Errores: qué pasó · por qué · qué hago ahora
  errorEmailYaVinculado: "Sophon rechazó el correo: ya está vinculado a otro afiliado.",
  errorEmailYaVinculadoApoyo:
    "Pide al webmaster que se registre con otro correo, o escribe al superadmin para reclamarlo.",
  errorUsuarioNoExiste: "Ese correo no existe en Sophon.",
  errorUsuarioNoExisteApoyo:
    "El webmaster tiene que crear su cuenta antes de que puedas activarlo. Envíale tu enlace de registro.",
  errorCupoAgotado: (mes: string, usadas: number) =>
    `Has agotado tu cupo de PRO de ${mes} (${usadas} de ${usadas}).`,
  errorCupoAgotadoApoyo:
    "Se reinicia el día 1. Si lo necesitas antes, pídele ampliación al superadmin.",
  errorPlanNoAutorizado: (plan: string) => `El plan ${plan} no está entre tus planes autorizados.`,
  errorWebmasterAjeno: "Solo puedes conceder PRO a webmasters de tu red.",
  errorWebmasterAjenoApoyo: "Este webmaster está a cargo de otro agente.",
  errorSophonCaido: "Sophon no responde ahora mismo.",
  errorSophonCaidoApoyo:
    "No se ha activado nada; tu cupo sigue intacto. Vuelve a intentarlo en un minuto.",
  errorSinWhitelist: "Tu cuenta aún no está autorizada en Sophon.",
  errorSinWhitelistApoyo:
    "El superadmin tiene que tramitarlo con soporte de Sophon. Mientras tanto no se pueden activar webmasters.",
  errorMinimoRetiro: (pedido: string, minimo: string) =>
    `Pides ${pedido} y el mínimo son ${minimo}.`,
  errorRetiroPendiente: (importe: string) =>
    `Ya tienes una solicitud de retiro pendiente de ${importe}.`,
  errorRetiroPendienteApoyo: "Espera a que el superadmin la resuelva o cancélala.",

  // Contexto que sí se puede contar sin filtrar nada
  comoCobras: "Cobras 0,03 $ por cada usuario que registre, sea cual sea su país.",
  revisionManual: "El superadmin revisa cada solicitud a mano. Suele tardar de 1 a 3 días.",
  quedaRegistrado: "Quedará registrado con tu nombre y hora.",
} as const;

export type Cadenas = typeof es;

/**
 * Los demás idiomas caen al español mientras no estén traducidos: es preferible
 * una cadena legible en otro idioma que una clave cruda en pantalla.
 */
const catalogos: Record<Idioma, Partial<Cadenas>> = {
  es,
  en: {},
  ar: {},
  it: {},
  pt: {},
};

export function cadenas(idioma: Idioma = IDIOMA_POR_DEFECTO): Cadenas {
  return { ...es, ...catalogos[idioma] };
}
