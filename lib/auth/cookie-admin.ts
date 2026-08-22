/**
 * La cookie del panel de Operador, sola y sin dependencias.
 *
 * Vive aparte de `lib/auth/admin.ts` por la MISMA razón que `lib/auth/cookie.ts`
 * vive aparte de `sesion.ts`: aquel importa `next/headers` y `../db.ts`, y `next`
 * no publica mapa de `exports`, así que el resolvedor de módulos de Node no lo
 * encuentra fuera del empaquetador. Cualquier prueba que quisiera comprobar el
 * `SameSite` de esta cookie —que es justo lo que hay que comprobar— se caía al
 * importar, sin llegar a ejecutar una sola aserción.
 *
 * Es la tercera vez que este proyecto se topa con lo mismo (`saldos.ts`,
 * `cookie.ts` y ahora esto): lo que se puede probar con Node pelado se saca a su
 * propio módulo, y el de arriba lo reexporta para que nadie tenga que cambiar de
 * sitio de llamada.
 */

export const COOKIE_ADMIN = "sp_admin";

/** Vida de la sesión ya abierta. */
export const HORAS_SESION_ADMIN = 12;

/** Ventana para canjear el enlace que manda el bot. */
export const MINUTOS_CANJE = 15;

/**
 * Marca, legible desde el servidor, de que la sesión se abrió DENTRO de Telegram.
 *
 * No es una credencial —no protege nada y se puede falsear— y por eso no es
 * `httpOnly`: lo único que decide es si el panel pinta la salida «volver a la
 * Mini App». Sin ella, el Operador que entra desde Telegram se queda en el panel
 * sin ninguna puerta de vuelta a su aplicación, que es un callejón sin salida
 * dentro de una pantalla que ocupa todo el móvil.
 */
export const COOKIE_DESDE_TELEGRAM = "sp_admin_tg";

/**
 * La cookie de la sesión, con el `SameSite` que exige CADA sitio.
 *
 * Había uno solo —`lax`— con este comentario: «el panel se abre en un navegador
 * normal, NO dentro del iframe de Telegram». Eso dejó de ser verdad en cuanto el
 * panel se pudo abrir desde la Mini App, y `lax` ahí no es más estricto: es que
 * **no llega**. En el escritorio la Mini App corre dentro de un iframe de
 * `web.telegram.org`, o sea en un contexto de terceros, y un navegador descarta
 * una cookie `lax` en ese caso sin decir nada. El síntoma habría sido el peor
 * posible: el Operador entra, ve el panel, y a la siguiente pantalla vuelve a
 * «Sesión requerida» sin ningún error que mirar.
 *
 * Así que el modo lo decide quien abre la sesión, no una constante:
 *
 *  - **Desde el chat** (el enlace de un solo uso) → `lax`. Es un navegador de
 *    verdad y no hay iframe; `lax` protege de CSRF y no cuesta nada.
 *  - **Desde la Mini App** → `none`, que es lo único que cruza un iframe de
 *    terceros. `none` OBLIGA a `Secure`, así que se fuerza aunque el entorno no
 *    sea producción: sin él la cookie se descarta igual, y una sesión que no se
 *    guarda es más difícil de diagnosticar que una que no se emite.
 *
 * Lo que `none` afloja lo cubre `exigirAdmin`, que revalida el Telegram del
 * Operador contra el entorno en cada petición.
 */
export function opcionesCookieAdmin(desdeTelegram = false) {
  return {
    httpOnly: true,
    secure: desdeTelegram || process.env.NODE_ENV === "production",
    sameSite: desdeTelegram ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: HORAS_SESION_ADMIN * 3600,
  };
}

export function opcionesMarcaTelegram() {
  return {
    httpOnly: false,
    secure: true,
    sameSite: "none" as const,
    path: "/",
    maxAge: HORAS_SESION_ADMIN * 3600,
  };
}
