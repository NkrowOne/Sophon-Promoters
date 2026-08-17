import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ClienteSophon, ErrorSophon, formaDeRegistros } from "../lib/sophon/cliente.ts";
import { NivelAfiliado } from "../lib/sophon/tipos.ts";

/**
 * El cliente de Sophon, que es por donde entra todo el dinero.
 *
 * Estos casos salen de la auditoría con flota. Los tres primeros son de los que
 * cuestan dinero de verdad: el bucle de reintentos trataba una ESCRITURA igual
 * que una lectura, y un `AbortSignal.timeout` no deshace nada en el servidor.
 */

/** Un `fetch` de mentira que cuenta lo que se le pide y contesta lo que se le diga. */
function fetchFalso(guion: (n: number) => Promise<Response> | Response) {
  const llamadas: { url: string; metodo: string; cuerpo: unknown }[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    llamadas.push({
      url: String(url),
      metodo: init?.method ?? "GET",
      cuerpo: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return guion(llamadas.length);
  }) as unknown as typeof fetch;
  return { impl, llamadas };
}

const sobre = (cuerpo: unknown, code = 0, msg = "ok") =>
  new Response(JSON.stringify({ code, msg, data: cuerpo }), {
    status: 200,
    headers: { "content-type": "application/json", traceid: "t-1" },
  });

const TOKEN = { token: "tk-1", expiresIn: 604_800 };

function cliente(impl: typeof fetch) {
  return new ClienteSophon({ email: "x@y.com", password: "s3cr3t", fetchImpl: impl });
}

describe("las escrituras no se reintentan solas", () => {
  it("un timeout en `concederMembresia` NO manda un segundo POST", async () => {
    /*
     * Es el defecto que podía regalar dos años de PRO. El cliente abortaba a los
     * 45 s y volvía a mandar el mismo `setmembership`: si Sophon ya lo había
     * procesado y solo se perdió la respuesta, se aplicaba otra vez — y
     * `conceder.ts` reconoce por escrito que no se sabe si Sophon SUMA o
     * SUSTITUYE el plazo, así que ni se podía acotar el daño.
     */
    const { impl, llamadas } = fetchFalso((n) => {
      if (n === 1) return sobre(TOKEN); // el token sí se pide
      throw new DOMException("The operation was aborted.", "TimeoutError");
    });

    await assert.rejects(() => cliente(impl).concederMembresia("a@b.com", "vip.year", 31_536_000));

    const posts = llamadas.filter((l) => l.url.includes("setmembership"));
    assert.equal(posts.length, 1, `se enviaron ${posts.length} setmembership; debe ser exactamente 1`);
  });

  it("un timeout en `vincularSubAfiliado` tampoco se repite", async () => {
    // Aquí el daño era distinto y peor de explicar: la vinculación buena la hacía
    // el primer intento y el segundo se encontraba su propio trabajo hecho, así
    // que el agente recibía «esa cuenta ya era de otro» por un alta que sí entró.
    const { impl, llamadas } = fetchFalso((n) => {
      if (n === 1) return sobre(TOKEN);
      throw new DOMException("The operation was aborted.", "TimeoutError");
    });

    await assert.rejects(() => cliente(impl).vincularSubAfiliado("a@b.com"));

    const posts = llamadas.filter((l) => l.url.includes("bind"));
    assert.equal(posts.length, 1, `se enviaron ${posts.length} vinculaciones; debe ser exactamente 1`);
  });

  it("una LECTURA sí se reintenta: el arreglo no puede haber roto eso", async () => {
    let fallos = 0;
    const { impl } = fetchFalso((n) => {
      if (n === 1) return sobre(TOKEN);
      if (fallos++ < 2) throw new Error("ECONNRESET");
      return sobre({ registers: [], pagePagination: { total: "0" } });
    });

    const p = await cliente(impl).detalleRegistros({
      desde: "2026-08-01",
      hasta: "2026-08-02",
      nivel: NivelAfiliado.Total,
    });
    assert.deepEqual(p.registers, []);
  });
});

describe("la sesión caducada se detecta en el envoltorio", () => {
  it("un `code != 0` de token tira la caché y repite una vez", async () => {
    /*
     * Sophon devuelve sus errores con HTTP 200 y `code != 0`, así que la única
     * invalidación que había —`status === 401`— no saltaba nunca: el token
     * muerto se quedaba en la caché hasta caducar por su cuenta, siete días
     * después, y todas las llamadas de por medio fallaban sin que nadie renovara.
     */
    const pedidosDeToken: number[] = [];
    const { impl } = fetchFalso((n) => {
      if (n === 1) return sobre(TOKEN);
      if (n === 2) return sobre(null, 40_100, "token expired");
      if (n === 3) {
        pedidosDeToken.push(n);
        return sobre({ token: "tk-2", expiresIn: 604_800 });
      }
      return sobre({ registers: [], pagePagination: { total: "0" } });
    });

    const p = await cliente(impl).detalleRegistros({
      desde: "2026-08-01",
      hasta: "2026-08-02",
      nivel: NivelAfiliado.Total,
    });
    assert.deepEqual(p.registers, []);
    assert.equal(pedidosDeToken.length, 1, "tenía que pedir un token nuevo tras el rechazo");
  });
});

describe("la forma de la respuesta se comprueba antes de devolverla", () => {
  it("una fila sin los campos del dinero se rechaza en vez de valer cero", () => {
    // Sin esta comprobación, el objetivo del devengo caía a cero para todas las
    // filas y el motor emitía reversos por todo lo asentado: el saldo de todos
    // los agentes a la vez, y sin un error en el log.
    const buena = {
      registers: [
        { countRegister: 9, countPayingUsers: 1, paymentAmount: "9.99", myEarning: "0.5" },
      ],
      pagePagination: { total: "1" },
    };
    assert.equal(formaDeRegistros(buena), null);

    const renombrada = {
      registers: [{ count_register: 9, countPayingUsers: 1, paymentAmount: "9.99" }],
      pagePagination: { total: "1" },
    };
    const motivo = formaDeRegistros(renombrada);
    assert.ok(motivo, "una fila sin `countRegister` ni `myEarning` tiene que rechazarse");
    assert.match(motivo, /countRegister/);
    assert.match(motivo, /myEarning/);
  });

  it("un día sin registros es válido, y `data` corrupta no", () => {
    assert.equal(formaDeRegistros({ registers: [], pagePagination: { total: "0" } }), null);
    assert.ok(formaDeRegistros(null));
    assert.ok(formaDeRegistros({ pagePagination: { total: "3" } }));
    assert.ok(formaDeRegistros({ registers: "no soy una lista" }));
  });

  it("la petición lanza ErrorSophon cuando la forma no cuadra", async () => {
    const { impl } = fetchFalso((n) =>
      n === 1 ? sobre(TOKEN) : sobre({ registers: [{ nada: 1 }], pagePagination: { total: "1" } }),
    );
    await assert.rejects(
      () =>
        cliente(impl).detalleRegistros({
          desde: "2026-08-01",
          hasta: "2026-08-02",
          nivel: NivelAfiliado.Total,
        }),
      (e: unknown) => e instanceof ErrorSophon && /forma inesperada/.test((e as Error).message),
    );
  });
});

describe("la paginación no se fía de `total`", () => {
  it("sigue paginando aunque `total` no llegue, y para en la página corta", async () => {
    /*
     * Estaba al revés: `while (vistos < total)` con
     * `total = Number(p.pagePagination?.total ?? 0)`. Un campo renombrado daba 0
     * y el bucle se paraba TRAS LA PRIMERA PÁGINA. Con 200 filas por página, eso
     * son días enteros que el barrido no ve — y lo que no ve lo lee como «ese día
     * no hubo nada», que dispara reversos.
     */
    const fila = (i: number) => ({
      countRegister: i,
      countPayingUsers: 0,
      paymentAmount: "0",
      myEarning: "0",
    });
    const { impl } = fetchFalso((n) => {
      if (n === 1) return sobre(TOKEN);
      // Sin `pagePagination`: exactamente el caso que cortaba el bucle.
      if (n === 2) return sobre({ registers: [fila(1), fila(2)] });
      return sobre({ registers: [fila(3)] });
    });

    const vistas = [];
    for await (const f of cliente(impl).todosLosRegistros({
      desde: "2026-08-01",
      hasta: "2026-08-02",
      nivel: NivelAfiliado.Total,
      tamano: 2,
    })) {
      vistas.push(f);
    }

    assert.equal(vistas.length, 3, "tenía que leer las dos páginas, no pararse en la primera");
  });
});
