import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { COOKIE_ADMIN, opcionesCookieAdmin } from "../lib/auth/cookie-admin.ts";

/**
 * La cookie del panel, que ahora tiene DOS modos.
 *
 * Se prueba porque es la clase de cosa que falla sin ruido: una cookie con el
 * `SameSite` equivocado no da error en ninguna parte —ni en el servidor, que la
 * emite tan contento, ni en el cliente, que simplemente la descarta—. El síntoma
 * aparece dos pantallas después, como un «Sesión requerida» que no se explica.
 *
 * El caso real: la Mini App corre dentro de un iframe de `web.telegram.org` en el
 * escritorio, o sea en contexto de terceros. Ahí una cookie `SameSite=Lax` no
 * viaja. Si el modo de Telegram perdiera su `none`, el Operador entraría al panel
 * y volvería a la puerta al pulsar el primer enlace.
 */

describe("la cookie de la sesión de Operador", () => {
  it("desde el chat va SameSite=Lax: es un navegador normal, sin iframe", () => {
    const o = opcionesCookieAdmin();
    assert.equal(o.sameSite, "lax");
    assert.equal(o.httpOnly, true);
  });

  it("desde la Mini App va SameSite=None, que es lo único que cruza el iframe", () => {
    // Sin esto la sesión se abre, el servidor la emite, y el navegador la tira
    // sin decir nada. Es EL fallo que esta prueba existe para impedir.
    const o = opcionesCookieAdmin(true);
    assert.equal(o.sameSite, "none");
  });

  it("y entonces es Secure aunque no sea producción, porque None lo exige", () => {
    /*
     * `SameSite=None` sin `Secure` lo descarta el navegador. Atar el `secure` a
     * `NODE_ENV === "production"` —que es lo que hacía la versión anterior—
     * dejaría la cookie muerta en cualquier entorno que no fuera producción, y
     * el fallo se leería como «la sesión no se guarda», no como «falta Secure».
     */
    assert.equal(opcionesCookieAdmin(true).secure, true);
  });

  it("sigue siendo HttpOnly en los dos modos: es una credencial", () => {
    // `none` afloja el reparto, no el acceso desde JavaScript. Lo que compensa
    // ese aflojamiento es que `exigirAdmin` revalida el Telegram del Operador
    // contra el entorno en CADA petición.
    assert.equal(opcionesCookieAdmin(false).httpOnly, true);
    assert.equal(opcionesCookieAdmin(true).httpOnly, true);
  });
});
