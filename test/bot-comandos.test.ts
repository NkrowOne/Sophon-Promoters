import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * La frontera entre el Operador y los agentes, comprobada sobre el código.
 *
 * Los comandos de gestión —generar códigos de activación, listar agentes, ver
 * los retiros con su wallet, abrir el panel— mueven dinero y datos de terceros.
 * Cada uno comprueba `esOperador` en su primera línea, y esa es la única
 * defensa que hay: no existe un middleware global, y el propio `bot.ts` explica
 * por qué —«un middleware que se olvidara de cubrir un comando nuevo sería un
 * agujero silencioso»—.
 *
 * El problema de esa decisión es que depende de que quien añada el comando
 * siguiente se acuerde. Esta prueba es lo que lo hace no depender de nadie:
 * recorre TODOS los `b.command(...)` del fichero y exige que los que no están
 * en la lista pública lleven su guardián.
 *
 * Se lee el fuente y no se ejercita el bot a propósito. Construir la instancia
 * pide un token y una llamada a `getMe` contra la API de Telegram, así que una
 * prueba de comportamiento aquí sería una prueba de red. Lo que hay que impedir
 * es exactamente lo que se ve en el texto: un `b.command` sin `esOperador`.
 */

const FUENTE = readFileSync(new URL("../lib/bot/bot.ts", import.meta.url), "utf8");

/**
 * Lo que un agente puede usar.
 *
 * Es la lista de `SECCIONES` más `ATAJOS` más las dos de servicio. Va escrita a
 * mano y no derivada del fuente: si se dedujera del mismo sitio que se
 * comprueba, un comando nuevo entraría en las dos listas a la vez y la prueba
 * pasaría sin mirar nada.
 */
const PUBLICOS = new Set(["start", "activar", "red", "cartera", "historico", "pro", "ayuda"]);

/** Los de gestión que tienen que existir Y estar cerrados. */
const DE_GESTION = ["codigo", "agentes", "retiros", "panel", "diagnostico", "correo"];

/**
 * Cada `b.command("x", ...)` con el texto que le sigue hasta el siguiente.
 *
 * Trocear por el propio `b.command(` es suficiente y no necesita contar llaves:
 * el cuerpo de un comando termina donde empieza el siguiente, así que el trozo
 * contiene su guardián si lo tiene. Un `esOperador` del comando ANTERIOR no
 * puede colarse, porque queda en el trozo anterior.
 */
function comandos(): Map<string, string> {
  const trozos = FUENTE.split(/b\.command\(\s*"/).slice(1);
  const salida = new Map<string, string>();
  for (const trozo of trozos) {
    const nombre = trozo.slice(0, trozo.indexOf('"'));
    salida.set(nombre, trozo);
  }
  return salida;
}

test("todo comando que no es público comprueba que quien escribe es el Operador", () => {
  const encontrados = comandos();

  /*
   * Se fija el JUEGO ENTERO de comandos escritos con nombre literal, no un
   * mínimo.
   *
   * Un `>= n` solo protege contra que el troceo deje de encontrar nada; no dice
   * si lo que encontró es lo que hay. Con la lista exacta, añadir un comando
   * rompe esta prueba y obliga a decidir a cuál de los dos lados pertenece, que
   * es justo la decisión que no puede quedarse sin tomar.
   *
   * `/red`, `/cartera`, `/historico` y `/pro` NO salen aquí: los registra el
   * bucle que recorre `CON_COMANDO`, con el nombre calculado. Están cubiertos
   * por la prueba de abajo, que comprueba que ese bucle solo abre pantallas.
   */
  assert.deepEqual(
    [...encontrados.keys()].sort(),
    ["activar", "agentes", "ayuda", "codigo", "correo", "diagnostico", "panel", "retiros", "start"],
    "ha cambiado el juego de comandos: decide si el nuevo es público o de gestión",
  );

  for (const [nombre, cuerpo] of encontrados) {
    if (PUBLICOS.has(nombre)) continue;
    assert.match(
      cuerpo,
      /esOperador\(/,
      `/${nombre} no comprueba esOperador: cualquier agente podría usarlo. ` +
        "Si de verdad es público, añádelo a PUBLICOS y explica por qué.",
    );
  }
});

test("los seis comandos de gestión siguen existiendo y siguen cerrados", () => {
  const encontrados = comandos();
  for (const nombre of DE_GESTION) {
    const cuerpo = encontrados.get(nombre);
    assert.ok(cuerpo, `falta /${nombre}`);
    // `return` inmediato y sin responder: quien no es el Operador no debe
    // enterarse siquiera de que el comando existe. Un «no puedes usar esto»
    // confirma que existe algo que no puede usar.
    assert.match(
      cuerpo,
      /if \(!esOperador\(ctx\.from\?\.id\)\) return;/,
      `/${nombre} no se cierra en su primera línea`,
    );
  }
});

test("el menú de gestión se registra solo en el chat del Operador", () => {
  const configurar = readFileSync(new URL("../lib/bot/configurar.ts", import.meta.url), "utf8");

  // Telegram enseña el menú de comandos según el `scope`. Registrar
  // `COMANDOS_OPERADOR` con `all_private_chats` se los pondría en el menú a
  // todos los agentes: no podrían usarlos —los guardianes de arriba siguen ahí—
  // pero verían la lista entera de lo que hace el Operador.
  const bloque = configurar.slice(configurar.indexOf("COMANDOS_OPERADOR,"));
  const hastaElCierre = bloque.slice(0, bloque.indexOf("}"));
  assert.match(hastaElCierre, /scope: \{ type: "chat"/);
  assert.doesNotMatch(hastaElCierre, /all_private_chats/);
});

test("el bucle de secciones solo abre pantallas: no puede colar nada de gestión", () => {
  /*
   * Los cuatro comandos con nombre calculado salen de `CON_COMANDO`, y lo único
   * que hacen es `abrirSeccion`. Mientras eso siga así no hace falta guardián:
   * abrir una pantalla de la Mini App no autoriza nada —la API exige sesión de
   * agente en cada petición—.
   *
   * Lo que se comprueba es precisamente que siga siendo así. Si alguien mete
   * lógica dentro de ese bucle, esta prueba cae y el comando pasa a necesitar la
   * misma revisión que los demás.
   */
  const bucle = FUENTE.slice(FUENTE.indexOf("for (const seccion of CON_COMANDO)"));
  const cuerpo = bucle.slice(0, bucle.indexOf("\n  }"));
  assert.match(cuerpo, /await abrirSeccion\(ctx, seccion, idiomaDe\(ctx\)\);/);
  assert.doesNotMatch(cuerpo, /db\.|clienteSophon|altaDeWebmaster/);
});

test("el atajo del alta es de agentes, no del Operador", () => {
  // `/activar correo@x` da de alta un webmaster en el equipo de QUIEN escribe,
  // así que tiene que seguir siendo público. Si alguien lo cerrara por error,
  // el atajo dejaría de existir para todo el mundo salvo el Operador, que es
  // justo quien no tiene equipo.
  const cuerpo = comandos().get("activar");
  assert.ok(cuerpo, "falta /activar");
  assert.doesNotMatch(
    cuerpo.slice(0, cuerpo.indexOf("await ctx.reply")),
    /if \(!esOperador\(ctx\.from\?\.id\)\) return;/,
  );
  assert.match(cuerpo, /altaDeWebmaster\(/, "el atajo ya no usa el mismo cuerpo que la Mini App");
});
