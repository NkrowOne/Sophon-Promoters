import { test } from "node:test";
import assert from "node:assert/strict";

import { ErrorSophon } from "../lib/sophon/cliente.ts";
import { clasificarAlta, hayQueAvisarAlSuperadmin } from "../lib/sophon/errores.ts";

/**
 * La clasificación del rechazo de Sophon.
 *
 * Es lo que decide si un agente puede quedarse una cuenta, así que es la pieza
 * del circuito del dinero con menos margen: el alta ES el registro en el
 * programa de socios, y quien dice sí o no es Sophon. Distinguir «esa cuenta ya
 * estaba» de «esa cuenta no existe» es la diferencia entre un rechazo definitivo
 * y un «que se registre y vuelve».
 *
 * Y se apoya en el texto del mensaje porque no hay otra cosa: Sophon documenta
 * dos códigos y ninguno de los dos casos importantes tiene uno propio. De ahí
 * que el caso que más se prueba aquí sea el de un error que nadie ha visto.
 */

const err = (mensaje: string, codigo = 1) =>
  new ErrorSophon(mensaje, codigo, "/api/uc/tool/user/bind_sub_aff", "traza-123");

test("una cuenta que ya estaba en el programa se reconoce como antigua", () => {
  assert.equal(clasificarAlta(err("email already an affiliate")).motivo, "YA_AFILIADO");
  // El texto real de Sophon no está fijado: se comprueba que el reconocimiento
  // no dependa de mayúsculas ni de lo que venga alrededor de la frase.
  assert.equal(clasificarAlta(err("This user is Already An Affiliate.")).motivo, "YA_AFILIADO");
});

test("una cuenta sin registrar en Sophon se distingue de una ya afiliada", () => {
  const r = clasificarAlta(err("user not found"));
  assert.equal(r.motivo, "NO_REGISTRADO");
  // Los dos son rechazos, pero uno tiene salida —registrarse— y el otro no.
  assert.notEqual(r.motivo, clasificarAlta(err("already an affiliate")).motivo);
});

test("la falta de whitelist gana a cualquier otra lectura", () => {
  assert.equal(clasificarAlta(err("caller not in allowed list")).motivo, "SIN_WHITELIST");
});

test("un parámetro que falta es culpa nuestra y se distingue por código", () => {
  // 999999 es el único código que Sophon documenta aparte del cero, y significa
  // que la petición iba mal montada: reintentarla daría exactamente lo mismo.
  assert.equal(clasificarAlta(err("SYSTEM_ERROR", 999_999)).motivo, "PETICION_MAL_FORMADA");
});

test("sin respuesta no es lo mismo que respuesta que no entendemos", () => {
  // Un fallo de red o un tiempo agotado no llegan como `ErrorSophon`: no ha
  // habido respuesta que clasificar. Ese se reintenta; el otro hay que mirarlo.
  const caido = clasificarAlta(new Error("fetch failed"));
  assert.equal(caido.motivo, "SIN_RESPUESTA");
  assert.equal(caido.codigo, null);

  assert.equal(clasificarAlta("algo raro").motivo, "SIN_RESPUESTA");
});

/**
 * El test que existe para el día que Sophon cambie una frase.
 *
 * Antes de separar esto en un módulo, los dos rechazos que deciden todo se leían
 * con sendas expresiones regulares dentro de la ruta de alta. Con una redacción
 * distinta al otro lado del cable, ambas dejaban de casar y el agente recibía
 * «Sophon no responde» —o sea, «reintenta»— para un rechazo firme que no iba a
 * cambiar por mucho que reintentara.
 */
test("un rechazo que no reconocemos NUNCA se lee como éxito", () => {
  const r = clasificarAlta(err("sub-affiliate quota exceeded for this partner", 40_318));
  assert.equal(r.motivo, "DESCONOCIDO");
  // Y llega entero, porque es lo que hay que copiar a la tabla de errores.
  assert.equal(r.codigo, 40_318);
  assert.equal(r.mensaje, "sub-affiliate quota exceeded for this partner");
  assert.equal(r.traceId, "traza-123");
});

test("solo lo desconocido molesta al superadmin", () => {
  assert.equal(hayQueAvisarAlSuperadmin("DESCONOCIDO"), true);
  // Los reconocidos ya tienen su respuesta y su mensaje para el agente. Avisar
  // de ellos convertiría el canal en ruido y acabaría con el bot silenciado, y
  // con él el aviso de que a alguien le han pagado.
  for (const motivo of ["YA_AFILIADO", "NO_REGISTRADO", "SIN_WHITELIST", "SIN_RESPUESTA"] as const) {
    assert.equal(hayQueAvisarAlSuperadmin(motivo), false, motivo);
  }
});

test("el código manda sobre el texto cuando se conoce", () => {
  /*
   * Hoy la tabla de códigos está vacía a propósito —no se inventan valores que
   * nadie ha observado— así que este caso comprueba el orden de precedencia por
   * el camino que sí se puede provocar: `esParametrosIncompletos` va por código
   * y gana aunque el mensaje diga otra cosa reconocible.
   */
  assert.equal(
    clasificarAlta(err("user not found", 999_999)).motivo,
    "PETICION_MAL_FORMADA",
    "un código conocido no se deja pisar por el texto",
  );
});
