import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { analizarRemitente, plantillaOtp } from "../lib/correo.ts";
import { IDIOMAS } from "../lib/idiomas.ts";

/**
 * El correo del código, comprobado sin servidor de correo delante.
 *
 * Existe porque este es el CAMINO CRÍTICO DE ACCESO: si el correo sale mal, el
 * agente no entra, y hasta ahora la única forma de mirarlo era mandarlo. Un
 * correo que solo se ve enviándolo es un correo que no se revisa nunca.
 *
 * Lo que se fija aquí no es el aspecto —eso se mira— sino las tres cosas que el
 * medio impone y que es fácil romper sin enterarse: que el código se pueda
 * copiar de un gesto, que el mensaje sea reconocible como nuestro, y que
 * sobreviva a un cliente que descarte todo el CSS.
 */

const CODIGO = "384102";

describe("el correo del código", () => {
  it("el código va SOLO en su celda, que es lo que hace que el pulsado largo lo seleccione entero", () => {
    /*
     * Es la única forma de copiar que existe en un correo: no hay JavaScript, y
     * por tanto no hay portapapeles. La selección por defecto de un pulsado
     * largo es POR PALABRA, así que un código sin una palabra pegada se
     * selecciona entero al primer intento incluso en los clientes que tiran
     * todo el CSS a la basura.
     *
     * Este test falla si alguien mete texto dentro de la caja del código —una
     * etiqueta, un «tu código es», lo que sea—: eso convierte el gesto en una
     * selección de dos palabras y hay que arrastrar los tiradores.
     */
    const { html } = plantillaOtp({
      codigo: CODIGO,
      minutosValidez: 10,
      marcaIncrustada: true,
    });

    // Se busca por `user-select:all` y no por `dir="ltr"`: en los idiomas
    // latinos el <div> raíz también es LTR, así que aquello cazaba el documento
    // entero y el test pasaba por el motivo equivocado.
    const caja = html.match(/<div[^>]*user-select:all[^>]*>([\s\S]*?)<\/div>/);
    assert.ok(caja, "no se encuentra la caja del código");
    assert.equal(caja[1]!.trim(), CODIGO, "la caja del código lleva algo más que el código");
  });

  it("`user-select: all` va con los prefijos, porque es el atajo del gesto", () => {
    // Donde se respeta (Apple Mail, Gmail web), UN toque selecciona el bloque
    // entero en vez de una palabra. Donde no, se cae al pulsado largo de arriba.
    const { html } = plantillaOtp({ codigo: CODIGO, minutosValidez: 10, marcaIncrustada: true });
    for (const prefijo of ["-webkit-user-select:all", "user-select:all"]) {
      assert.ok(html.includes(prefijo), `falta ${prefijo}`);
    }
  });

  it("el código va en LTR también en árabe, y el asunto lo lleva", () => {
    /*
     * Una secuencia de seis dígitos que se teclea de izquierda a derecha no se
     * reordena. El algoritmo bidi la dejaría igual, pero la CAJA no: sin el
     * `dir="ltr"` explícito, el bloque se alinea al revés.
     *
     * Y el asunto lleva el código porque es lo más rápido de todo: se lee desde
     * la notificación sin abrir nada.
     */
    const { html, asunto } = plantillaOtp({
      codigo: CODIGO,
      minutosValidez: 10,
      idioma: "ar",
      marcaIncrustada: true,
    });
    assert.ok(html.includes('<div dir="rtl"'), "la raíz tiene que ir en RTL en árabe");
    assert.ok(html.includes('<div dir="ltr"'), "el código tiene que ir en LTR aun en árabe");
    assert.ok(asunto.includes(CODIGO), "el código tiene que ir en el asunto");
  });

  it("sin logotipo el correo NO se queda sin identificar", () => {
    /*
     * El PNG puede faltar —`marca()` devuelve `null` en vez de lanzar, porque
     * quedarse fuera de la aplicación por un adorno sería un intercambio
     * absurdo— pero un código suelto sin nada que lo identifique es
     * indistinguible de un intento de suplantación, que es justo la forma que
     * tiene el fraude por correo.
     *
     * Así que cuando no hay imagen, va el nombre en texto.
     */
    const conMarca = plantillaOtp({ codigo: CODIGO, minutosValidez: 10, marcaIncrustada: true });
    assert.ok(conMarca.html.includes("cid:marca@sophon-promoters"));

    const sinMarca = plantillaOtp({ codigo: CODIGO, minutosValidez: 10, marcaIncrustada: false });
    assert.ok(!sinMarca.html.includes("cid:"), "no debe referenciar una imagen que no viaja");
    assert.ok(sinMarca.html.includes("Sophon Promoters"), "sin logotipo, la marca va en texto");
  });

  it("se maqueta como un correo: tablas y estilos EN LÍNEA, ninguna hoja de estilos", () => {
    /*
     * Gmail descarta las hojas de estilo y Outlook de escritorio renderiza con
     * el motor de Word. Un `<style>` o una `class` aquí es una regla que no se
     * aplica justo en el mensaje del que depende poder entrar.
     */
    const { html } = plantillaOtp({ codigo: CODIGO, minutosValidez: 10, marcaIncrustada: true });
    assert.ok(!/<style/i.test(html), "un <style> no sobrevive a Gmail");
    assert.ok(!/class=/i.test(html), "una clase no sobrevive a Gmail");
    assert.ok(!/var\(--/.test(html), "las custom properties no llegan a un correo");
    assert.ok(html.includes("<table"), "la maquetación va en tablas");
  });

  it("la versión en texto plano lleva el código, para el cliente que no pinta HTML", () => {
    for (const idioma of IDIOMAS) {
      const { texto } = plantillaOtp({
        codigo: CODIGO,
        minutosValidez: 10,
        idioma,
        marcaIncrustada: true,
      });
      assert.ok(texto.includes(CODIGO), `${idioma}: el texto plano se ha quedado sin código`);
    }
  });

  it("los colores son literales de la paleta viva, no los del espresso de antes", () => {
    /*
     * Es la única duplicación deliberada del sistema visual, y por eso conviene
     * atarla: el día que la paleta se mueva otra vez, este test es lo que dice
     * que el correo se quedó atrás. Ya pasó — estos cinco eran `#1f1710` y
     * `#6e5b4a` sobre papel crema.
     */
    const { html } = plantillaOtp({ codigo: CODIGO, minutosValidez: 10, marcaIncrustada: true });
    for (const color of ["#f9d027", "#17171a", "#5f5f67", "#e1e1e4"]) {
      assert.ok(html.includes(color), `falta el literal ${color}`);
    }
    for (const viejo of ["#1f1710", "#6e5b4a", "#eadfc6", "#482304"]) {
      assert.ok(!html.includes(viejo), `sigue el color de la paleta anterior: ${viejo}`);
    }
  });

  /**
   * El código, legible TAMBIÉN con el tema oscuro de Gmail.
   *
   * La caja llevaba un degradado y el código salía blanco sobre amarillo:
   * ilegible, y en el único punto del que depende poder entrar. El tema oscuro
   * de Gmail invierte fondo y texto EN PAREJA cuando los dos están declarados
   * en el mismo elemento, y un `background-image` no lo sabe invertir: dejaba
   * el amarillo puesto y aclaraba el texto de encima.
   *
   * Este test no comprueba un gusto, comprueba esa mecánica: fondo plano y
   * tinta declarada al lado.
   */
  it("la caja del código lleva fondo PLANO, que es lo que salva al tema oscuro de Gmail", () => {
    const { html } = plantillaOtp({ codigo: CODIGO, minutosValidez: 10, marcaIncrustada: true });
    assert.ok(!html.includes("linear-gradient"), "el degradado deja el código blanco sobre amarillo");
    assert.ok(
      html.includes(`background-color:#f9d027;color:#17171a`),
      "fondo y tinta tienen que ir juntos en el mismo elemento para que se inviertan juntos",
    );
  });

  describe("el pie legal", () => {
    const PIE = ["New Sophon Technology Limited", "San Po Kong", "www.newsophon.com"];

    it("va en las cinco lenguas, en el HTML y en el texto plano", () => {
      for (const idioma of IDIOMAS) {
        const { html, texto } = plantillaOtp({
          codigo: CODIGO,
          minutosValidez: 10,
          idioma,
          marcaIncrustada: true,
        });
        for (const dato of PIE) {
          assert.ok(html.includes(dato), `${idioma}: falta «${dato}» en el HTML`);
          assert.ok(texto.includes(dato), `${idioma}: falta «${dato}» en el texto plano`);
        }
      }
    });

    it("el enlace lleva su color puesto, o los clientes lo pintan de azul", () => {
      // Sin `color` propio, Gmail y Apple Mail le ponen el azul del sistema y
      // el pie legal pasa a ser lo más llamativo del correo.
      const { html } = plantillaOtp({ codigo: CODIGO, minutosValidez: 10, marcaIncrustada: true });
      assert.match(html, /<a dir="ltr" href="https:\/\/www\.newsophon\.com" style="color:#5f5f67/);
    });

    it("es más pequeño que el aviso de caducidad, que es lo que sí hay que leer", () => {
      const { html } = plantillaOtp({ codigo: CODIGO, minutosValidez: 10, marcaIncrustada: true });
      assert.ok(html.includes("font-size:11px"), "el pie tiene que ir a 11 px");
      assert.ok(html.includes("font-size:14px"), "la caducidad se queda a 14 px");
    });
  });
});

/**
 * El REMITENTE, que es la mitad del correo que no se ve hasta que rebota.
 *
 * Este bloque existe por un fallo real y de los caros: el valor llevaba las
 * comillas del `.env.example` pegadas, el analizador las leyó como nombre, la
 * dirección se quedó vacía y el sobre salió con el remitente nulo. El servidor
 * contestó `530 ... not authorized to send mail as the null sender (<>)`, que
 * se lee como un permiso del buzón y no lo es. Los agentes veían llegar correos
 * de «Sophon Promoters < >» hasta que dejaron de llegar.
 */
describe("el remitente del correo", () => {
  const USUARIO = "sophonpromoters@nkrow.com";

  it("acepta la forma buena", () => {
    const r = analizarRemitente("Sophon Promoters <no-reply@nkrow.com>", USUARIO);
    assert.deepEqual(r, { nombre: "Sophon Promoters", direccion: "no-reply@nkrow.com" });
  });

  it("sobrevive a las comillas del panel de despliegue, que es EL fallo", () => {
    // Copiado tal cual de `.env.example`, comillas incluidas. Sin esto el nombre
    // sale como «Sophon Promoters < >» y la dirección, vacía.
    const r = analizarRemitente('"Sophon Promoters <no-reply@nkrow.com>"', USUARIO);
    assert.deepEqual(r, { nombre: "Sophon Promoters", direccion: "no-reply@nkrow.com" });
  });

  it("NUNCA devuelve una dirección vacía: eso es el remitente nulo del 530", () => {
    // Las cuatro formas que dejaban la dirección en blanco.
    for (const malo of ["Sophon Promoters", "Sophon Promoters <>", '"Sophon Promoters"', "  "]) {
      const r = analizarRemitente(malo, USUARIO);
      assert.ok(!("motivo" in r), `${malo}: debería caer a SMTP_USER`);
      assert.equal(r.direccion, USUARIO);
    }
  });

  it("avisa cuando cae a SMTP_USER, para que el fallo no se quede callado", () => {
    const r = analizarRemitente("Sophon Promoters <>", USUARIO);
    assert.ok(!("motivo" in r) && r.aviso, "un respaldo silencioso es un fallo que nadie arregla");
  });

  it("da el motivo cuando no hay NADA utilizable, en vez de mandar un sobre nulo", () => {
    const r = analizarRemitente("Sophon Promoters", undefined);
    assert.ok("motivo" in r && r.motivo.includes("SMTP_REMITENTE"));
  });

  it("vale también una dirección suelta, sin nombre ni ángulos", () => {
    const r = analizarRemitente("no-reply@nkrow.com", USUARIO);
    assert.deepEqual(r, { nombre: "Sophon Promoters", direccion: "no-reply@nkrow.com" });
  });
});
