import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DIAS_SESION, opcionesCookie } from "../lib/auth/cookie.ts";
import { decidirEntrada, type AgenteConocido } from "../lib/auth/entrada.ts";

/**
 * Quién entra y por qué puerta.
 *
 * Es la única parte del trámite de entrada que se puede probar sin base de
 * datos, y da la casualidad de que es también donde está todo lo que se puede
 * equivocar. Las dos rutas —`/api/auth/codigo`, que manda el OTP, y
 * `/api/auth/otp`, que crea la cuenta— llaman a esta misma función, así que lo
 * que se fija aquí es que no puedan opinar distinto sobre el mismo correo.
 */

const YO = 111n;
const OTRO = 222n;

const agente = (p: Partial<AgenteConocido> = {}): AgenteConocido => ({
  telegramId: YO,
  estado: "ACTIVO",
  ...p,
});

describe("el que ya está dado de alta entra solo con su correo", () => {
  it("sin código de activación: es el requisito entero, en una línea", () => {
    /*
     * Este es el caso que estaba roto y que costaba una conversación con el
     * Operador cada vez: el agente que pierde la sesión —móvil nuevo, Telegram
     * reinstalado, la app cerrada más tiempo del que duraba la cookie— chocaba
     * con un 409 «esta cuenta de Telegram ya está vinculada» y su única salida
     * era pedir un código de activación nuevo. Por volver a abrir la app.
     */
    const r = decidirEntrada({ existente: agente(), telegramId: YO, codigo: null });
    assert.deepEqual(r, { via: "vuelta" });
  });

  it("y tampoco lo gasta si resulta que todavía lo tiene guardado", () => {
    // Los códigos llevan usos contados y pueden estar emitidos para repartir.
    // Consumir uno por entrar sería cobrarle al agente un papel que no
    // necesitaba enseñar.
    const r = decidirEntrada({ existente: agente(), telegramId: YO, codigo: "MR7MDAPD6R" });
    assert.deepEqual(r, { via: "vuelta" });
  });

  it("una cuenta que el Operador creó y nadie ha reclamado se deja reclamar", () => {
    // `telegramId: null` es la cuenta dada de alta a mano desde el panel. El
    // primero que verifique ese correo se la lleva, que es justo el trámite.
    const r = decidirEntrada({
      existente: agente({ telegramId: null }),
      telegramId: YO,
      codigo: null,
    });
    assert.deepEqual(r, { via: "vuelta" });
  });

  it("PENDIENTE no es una cuenta parada: es la que está a punto de activarse", () => {
    /*
     * Confundir PENDIENTE con SUSPENDIDO cerraría la puerta justo al agente que
     * viene a hacer lo que le falta. El estado dice «creado, sin verificar el
     * correo», y verificar el correo es literalmente el paso siguiente.
     */
    const r = decidirEntrada({
      existente: agente({ estado: "PENDIENTE" }),
      telegramId: YO,
      codigo: null,
    });
    assert.deepEqual(r, { via: "vuelta" });
  });
});

describe("el correo de otro no abre ninguna puerta ni mueve ningún buzón", () => {
  it("se corta ANTES de mandar nada, aunque traiga un código bueno", () => {
    /*
     * Es el hallazgo #36 de la auditoría. Sin este corte, cualquiera con un
     * Telegram y un código de activación válido podía hacer que le llegara un
     * OTP al buzón de otro agente una vez por minuto, indefinidamente. Que ese
     * OTP no le sirviera para entrar —el segundo paso compara el Telegram— no
     * arregla ni el correo basura ni el susto de quien lo recibe.
     */
    const r = decidirEntrada({
      existente: agente({ telegramId: OTRO }),
      telegramId: YO,
      codigo: "MR7MDAPD6R",
    });
    assert.deepEqual(r, { via: "correo_ajeno" });
  });

  it("y el dueño ajeno pesa más que el estado: no se filtra si está suspendido", () => {
    // El orden importa. Contestar «esa cuenta está suspendida» a quien pregunta
    // por un correo que no es suyo le confirma dos cosas que no tenía por qué
    // saber: que existe y en qué estado está.
    const r = decidirEntrada({
      existente: agente({ telegramId: OTRO, estado: "SUSPENDIDO" }),
      telegramId: YO,
      codigo: null,
    });
    assert.deepEqual(r, { via: "correo_ajeno" });
  });
});

describe("una cuenta parada no se levanta el castigo ella sola", () => {
  for (const estado of ["SUSPENDIDO", "BAJA"] as const) {
    it(`${estado}: se dice antes de gastar el trámite, no después`, () => {
      /*
       * Dos cosas a la vez. Una, que el agente lo lea ANTES de recorrer el
       * correo, el teclado y la espera para chocar al final. Y dos, la de
       * verdad: la revinculación ponía `estado: "ACTIVO"` sin condición, así
       * que un suspendido se reactivaba solo repitiendo el alta y en el panel
       * del Operador aparecía activo sin que nadie lo hubiera reactivado.
       */
      const r = decidirEntrada({ existente: agente({ estado }), telegramId: YO, codigo: null });
      assert.deepEqual(r, { via: "cuenta_parada" });
    });
  }
});

describe("el correo desconocido es una pregunta, no un fallo", () => {
  it("sin código: se pide, y eso es lo que despliega la casilla en la pantalla", () => {
    const r = decidirEntrada({ existente: null, telegramId: YO, codigo: null });
    assert.deepEqual(r, { via: "pide_codigo" });
  });

  it("con código: es un alta, y el código viaja dentro de la decisión", () => {
    // Devolver el código en la rama —en vez de dejar que quien llama lo lea de
    // su variable— es lo que impide leerlo en un camino donde no lo hay.
    const r = decidirEntrada({ existente: null, telegramId: YO, codigo: "MR7MDAPD6R" });
    assert.deepEqual(r, { via: "alta", codigo: "MR7MDAPD6R" });
  });
});

describe("la cookie dura lo máximo que un navegador acepta", () => {
  it("400 días, que es el tope de rfc6265bis y no una cifra a ojo", () => {
    /*
     * Chrome, Edge y Firefox recortan a 400 días todo `Max-Age` mayor. Pedir
     * diez años no da diez años: da 400 días y la falsa tranquilidad de creer
     * que da más, que es peor que pedir 400 a sabiendas.
     *
     * Y esta prueba tiene un segundo trabajo: si alguien sube la constante
     * «para que dure más», falla aquí y lee por qué en vez de desplegar una
     * mejora que el navegador va a ignorar.
     */
    assert.equal(DIAS_SESION, 400);
    assert.equal(opcionesCookie().maxAge, 400 * 86_400);
  });

  it("y sigue siendo httpOnly y SameSite=None, que es lo que la hace viajar", () => {
    // `none` no es un descuido: la Mini App vive dentro de un iframe de
    // Telegram y con `lax` la cookie no se manda, así que el agente parecería
    // desconectado en cada carga por muy larga que fuera su caducidad.
    const o = opcionesCookie();
    assert.equal(o.httpOnly, true);
    assert.equal(o.sameSite, "none");
    assert.equal(o.path, "/");
  });
});
