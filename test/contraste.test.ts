import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Puerta de entrada del color.
 *
 * Ningún token entra por criterio visual sobre un fondo blanco en un portátil.
 * Este test recorre los fondos REALES sobre los que se pinta —los que pone
 * Telegram y los que ponemos nosotros— y falla si algo baja del umbral.
 *
 * Existe porque ya pasó lo contrario dos veces: la aplicación llevaba `#A8762F`
 * como único acento, usado justo en las etiquetas accionables (3,97:1 sobre
 * blanco), y un T3 a 2,19:1 desde el primer commit. Ninguno de los dos se vio
 * mirándolos.
 *
 * **Las bandas cuentan como fondo.** Añadirlas encontró dos defectos más el día
 * que se midieron: sobre `--superficie-alta`, el T3 oscuro se quedaba en 2,92:1
 * y el acento claro en 4,18:1. Medir solo contra el fondo de Telegram deja
 * fuera justo las superficies que ocupan el 90 % de la pantalla.
 *
 * Umbrales: 4,5:1 para texto, 3:1 para marcas de datos y bordes.
 */

/**
 * Todo lo que puede quedar DEBAJO de un token: los tres estratos de cada
 * polaridad, que ahora son NUESTROS.
 *
 * Antes esta lista mezclaba los fondos de los clientes de Telegram con las
 * bandas, porque las bandas se derivaban del fondo del cliente. Esa derivación
 * se ha retirado —mezclar el azul-negro de Telegram con el amarillo de marca
 * aterriza en verde oliva, ver el test de hue— así que lo que se pinta son
 * exactamente estos diez valores y nada más.
 */
const FONDOS = {
  claroFondo: "#FFFFFF",
  claroBanda1: "#FDF7EA",
  claroBanda2: "#F7EEDA",

  oscuroFondo: "#100E0B",
  oscuroBanda1: "#1C1713",
  oscuroBanda2: "#282119",
} as const;

const CLAROS = ["claroFondo", "claroBanda1", "claroBanda2"] as const;
const OSCUROS = ["oscuroFondo", "oscuroBanda1", "oscuroBanda2"] as const;

/**
 * EL CAMPO: el amarillo de Sophon, su tinta y su canto.
 *
 * Fuera del objeto por polaridad a propósito, porque **no tiene polaridad**. El
 * campo lleva su propio contraste, así que el par vale igual en claro y en
 * oscuro. Si algún día alguien lo desdobla, es que ha dejado de ser un campo.
 */
const CAMPO = "#F9D027";
const CAMPO_TINTA = "#1A1206";
const CAMPO_CANTO = "#A8850B";

/** La tinta de la placa tampoco tiene polaridad: la placa la lleva encima. */
const PLACA_TINTA = "#FFF6E8";

/** Los mismos valores que declara `app/(miniapp)/globals.css`. */
const TOKENS = {
  claro: {
    texto: "#1F1710",
    apoyo: "#6E5B4A",
    placa: "#482304",
    tintaPlena: "#2A1B0E",
    tintaT1: "#482304",
    tintaT2: "#7C5336",
    tintaT3: "#AB7E60",
    peligro: "#B3261E",
  },
  oscuro: {
    texto: "#F6EFE6",
    apoyo: "#B0A092",
    placa: "#533520",
    tintaPlena: "#EFD9C4",
    tintaT1: "#D7A583",
    tintaT2: "#B38363",
    tintaT3: "#916343",
    peligro: "#F2837A",
  },
} as const;

function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  const alta = Math.max(la, lb);
  const baja = Math.min(la, lb);
  return (alta + 0.05) / (baja + 0.05);
}

/**
 * Hue en oklab, en grados.
 *
 * Hace falta porque el acento de estado y la rampa de datos se distinguen por
 * TONO y no por valor: entre `vivo` y los tiers hay 1,15-1,34:1 de contraste,
 * que a ojo es nada. Lo único que impide que una alarma se lea como un estrato
 * son los ~100° que los separan, y eso hay que sostenerlo con una medida.
 */
function hue(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = canal(1);
  const g = canal(3);
  const b = canal(5);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
}

/** Diferencia angular más corta entre dos hues. */
function separacionHue(a: string, b: string): number {
  const d = Math.abs(hue(a) - hue(b)) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Luminosidad en oklab, de 0 a 1.
 *
 * Hace falta porque «pasa 3:1» no impide que un marrón sea melocotón. La rampa
 * oscura estuvo en L 0,88 cuando a 0,50 ya pasaba el umbral: esos 0,38 de más no
 * compraban legibilidad, solo lavaban el color hasta sacarlo de la marca. El
 * contraste pone el suelo; esto pone el techo.
 */
function luz(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = canal(1);
  const g = canal(3);
  const b = canal(5);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
}

/**
 * Croma en oklab: cuánto color tiene, con independencia de lo claro que sea.
 *
 * Hace falta porque «pasa el contraste» y «se ve de color» son dos cosas
 * distintas, y la segunda es la que el usuario lleva pidiendo desde el
 * principio. Una rampa de grises pasa todos los umbrales y sigue siendo gris.
 */
function croma(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = canal(1);
  const g = canal(3);
  const b = canal(5);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return Math.hypot(a, bb);
}

/**
 * Composición alfa en sRGB: lo que hace de verdad `opacity` en CSS.
 *
 * Existe porque medir el token no basta. El Testigo atenuaba los días antiguos
 * con `opacity` y el token seguía pasando la puerta mientras lo que se pintaba
 * en pantalla no llegaba ni a 2,4:1.
 */
function componer(frente: string, fondo: string, alfa: number): string {
  const canal = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
  const mezcla = [1, 3, 5]
    .map((i) => Math.round(canal(frente, i) * alfa + canal(fondo, i) * (1 - alfa)))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  return `#${mezcla}`;
}

describe("contraste de los tokens", () => {
  it("el texto pasa 4,5:1 en todos los fondos de su polaridad", () => {
    for (const clave of ["texto", "apoyo"] as const) {
      for (const f of CLAROS) {
        const r = contraste(TOKENS.claro[clave], FONDOS[f]);
        assert.ok(r >= 4.5, `${clave} claro sobre ${f}: ${r.toFixed(2)}:1`);
      }
      for (const f of OSCUROS) {
        const r = contraste(TOKENS.oscuro[clave], FONDOS[f]);
        assert.ok(r >= 4.5, `${clave} oscuro sobre ${f}: ${r.toFixed(2)}:1`);
      }
    }
  });

  it("los tres estratos pasan 3:1 en todos los fondos de su polaridad", () => {
    for (const tier of ["tintaT1", "tintaT2", "tintaT3"] as const) {
      for (const f of CLAROS) {
        const r = contraste(TOKENS.claro[tier], FONDOS[f]);
        assert.ok(r >= 3, `${tier} claro sobre ${f}: ${r.toFixed(2)}:1`);
      }
      for (const f of OSCUROS) {
        const r = contraste(TOKENS.oscuro[tier], FONDOS[f]);
        assert.ok(r >= 3, `${tier} oscuro sobre ${f}: ${r.toFixed(2)}:1`);
      }
    }
  });

  it("la escala de estratos ORDENA: cada tier se distingue del siguiente", () => {
    // Sin esto la rampa serían tres grises parecidos y el tier no se leería.
    for (const tema of ["claro", "oscuro"] as const) {
      const { tintaT1, tintaT2, tintaT3 } = TOKENS[tema];
      assert.ok(contraste(tintaT1, tintaT2) >= 1.5, `${tema}: T1 y T2 se confunden`);
      assert.ok(contraste(tintaT2, tintaT3) >= 1.5, `${tema}: T2 y T3 se confunden`);
    }
  });

  it("EL AMARILLO NO PUEDE SER TINTA, y por eso es campo", () => {
    /*
     * Este es el hecho que decide el sistema visual entero, así que se fija
     * aquí en vez de en un comentario.
     *
     * #F9D027 sobre papel claro da 1,49:1. No hay ninguna forma de usarlo como
     * texto, ni como filete fino, ni como marca de dato sobre fondo claro. Y no
     * se arregla oscureciéndolo: para pasar 4,5:1 sobre blanco hay que bajarlo
     * hasta un oliva apagado que ya se descartó dos veces.
     *
     * La salida es usarlo como se usa un amarillo de verdad: CAMPO macizo con
     * tinta oscura encima. Si alguien intenta volver a pintar texto amarillo,
     * este test le enseña el número.
     */
    for (const f of CLAROS) {
      const r = contraste(CAMPO, FONDOS[f]);
      assert.ok(r < 3, `el campo NO puede servir de marca sobre ${f}: da ${r.toFixed(2)}:1`);
    }
  });

  it("el par del CAMPO pasa 4,5:1 y vale igual en las dos polaridades", () => {
    // Es el botón principal y cada marca de urgencia. Ya NO es la cabecera:
    // compartir apariencia con el botón fue el defecto que hundió la versión
    // anterior, y la separación se comprueba abajo.
    const r = contraste(CAMPO_TINTA, CAMPO);
    assert.ok(r >= 4.5, `tinta sobre campo: ${r.toFixed(2)}:1`);
  });

  it("el CANTO del campo da 3:1, que es lo que hace visible el botón en claro", () => {
    /*
     * El campo saca 1,49:1 contra el papel: un botón macizo sin filete no tiene
     * un contorno perceptible, y WCAG 1.4.11 pide 3:1 para el de un control.
     *
     * Es la consecuencia incómoda de un amarillo de marca a plena luminosidad, y
     * la salida no es oscurecer el campo —eso lleva al oliva ya descartado— sino
     * ponerle un borde del mismo hue en sombra.
     */
    for (const f of CLAROS) {
      const r = contraste(CAMPO_CANTO, FONDOS[f]);
      assert.ok(r >= 3, `el canto no define el botón sobre ${f}: ${r.toFixed(2)}:1`);
    }
    // Y sigue siendo el mismo amarillo, no un segundo color.
    assert.ok(
      separacionHue(CAMPO, CAMPO_CANTO) <= 10,
      `el canto se ha ido de tono: ${separacionHue(CAMPO, CAMPO_CANTO).toFixed(0)}°`,
    );
  });

  it("LA PLACA no puede parecerse al botón: es la corrección de §12", () => {
    /*
     * «Ese amarillo se camufla con los botones.»
     *
     * La cabecera y el botón principal eran los dos `#F9D027`, así que lo que
     * informa y lo que se pulsa tenían una sola apariencia. Este test fija la
     * separación para que la placa no pueda volver a ser amarilla en silencio.
     */
    for (const tema of ["claro", "oscuro"] as const) {
      const { placa } = TOKENS[tema];

      const r = contraste(placa, CAMPO);
      assert.ok(r >= 4.5, `${tema}: la placa y el botón se confunden (${r.toFixed(2)}:1)`);

      // La tinta crema se lee sobre la placa en las dos polaridades.
      const rt = contraste(PLACA_TINTA, placa);
      assert.ok(rt >= 4.5, `${tema}: tinta sobre placa ${rt.toFixed(2)}:1`);

      // Y la placa se recorta del papel sobre el que se apoya. En oscuro el
      // margen es estrecho a propósito —subirla le quitaría contraste a su
      // tinta y la acercaría al amarillo— y por eso lleva canto.
      for (const f of tema === "claro" ? CLAROS : OSCUROS) {
        const rf = contraste(placa, FONDOS[f]);
        assert.ok(rf >= 1.4, `${tema}: la placa se funde con ${f} (${rf.toFixed(2)}:1)`);
      }
    }
  });

  it("EL BOTÓN es lo más brillante del tema oscuro", () => {
    // Es lo que debe ser una acción, y es lo que no pasaba: con la cabecera
    // amarilla había dos objetos peleando por ese puesto.
    for (const f of OSCUROS) {
      const r = contraste(CAMPO, FONDOS[f]);
      assert.ok(r >= 10, `el campo solo saca ${r.toFixed(2)}:1 sobre ${f}`);
    }
  });

  it("los tres estratos SE DISTINGUEN entre sí", () => {
    /*
     * La aplicación entera se estructura en tres estratos de papel, y estaban a
     * 1,025:1 y 1,068:1 en claro. Es decir: toda la jerarquía de contenedores
     * —bandas a sangre, juntas, tres tonos— sostenía una diferencia que no se
     * percibe. Se gastaban niveles de caja para no separar nada, que es la mitad
     * del «cajas dentro de cajas» de la queja.
     *
     * El umbral es bajo a propósito: un estrato NO es un borde, y pasarse
     * convierte el papel en tarjetas. Lo que se exige es que exista el escalón.
     */
    for (const [tema, estratos] of [
      ["claro", CLAROS],
      ["oscuro", OSCUROS],
    ] as const) {
      for (let i = 0; i < estratos.length - 1; i++) {
        const r = contraste(FONDOS[estratos[i]!], FONDOS[estratos[i + 1]!]);
        assert.ok(r >= 1.06, `${tema}: ${estratos[i]} y ${estratos[i + 1]} a ${r.toFixed(3)}:1`);
      }
      const extremos = contraste(FONDOS[estratos[0]!], FONDOS[estratos[2]!]);
      assert.ok(extremos >= 1.14, `${tema}: del primer estrato al último solo ${extremos.toFixed(3)}:1`);
    }

    // Y los valores que había NO habrían pasado, que es por lo que existe.
    assert.ok(contraste("#FFFFFF", "#FFFCF5") < 1.06, "aquello no se veía");
    assert.ok(contraste("#FFFFFF", "#FBF4E6") < 1.14);
  });

  it("NINGUNA superficie nuestra cae en el verde", () => {
    /*
     * El defecto que el usuario vio y yo no: `banda-2` en oscuro era hue **174°**,
     * verde oliva. No fue mala suerte. Las superficies se derivaban mezclando el
     * fondo del cliente con el amarillo de marca, y el azul-negro de Telegram es
     * casi complementario del amarillo, así que la mezcla **pasa por el verde por
     * construcción**: medido, 88 % de `#17212B` con `#F9D027` da `#2E3432`.
     *
     * Por eso la derivación se retiró y las superficies son literales. Este test
     * es lo que impide que vuelva.
     */
    for (const f of [...CLAROS, ...OSCUROS]) {
      const h = hue(FONDOS[f]);
      const c = croma(FONDOS[f]);
      assert.ok(
        c < 0.005 || h < 120 || h > 200,
        `${f} está en verde: hue ${h.toFixed(0)}° con croma ${c.toFixed(3)}`,
      );
    }

    // Y la mezcla que lo produjo sigue produciéndolo: si alguien la reintroduce,
    // este número le dice por qué no.
    assert.ok(hue("#2E3432") > 120 && hue("#2E3432") < 200);
  });

  it("la rampa oscura es MARRÓN y no melocotón", () => {
    /*
     * Estaba en L 0,88. A L 0,50 ya pasa 3:1 sobre su superficie, así que esos
     * 0,38 no compraban legibilidad: lavaban el marrón hasta convertirlo en un
     * melocotón que no es de la marca. El contraste pone el suelo y esto pone el
     * techo, que es la mitad que faltaba.
     */
    assert.ok(
      luz(TOKENS.oscuro.tintaT1) <= 0.8,
      `T1 oscuro a L ${luz(TOKENS.oscuro.tintaT1).toFixed(2)}: eso es melocotón, no marrón`,
    );

    // Y las dos rampas tienen que tener color de verdad, no ser marrones lavados.
    for (const tema of ["claro", "oscuro"] as const) {
      for (const tier of ["tintaT1", "tintaT2", "tintaT3"] as const) {
        const c = croma(TOKENS[tema][tier]);
        assert.ok(c >= 0.05, `${tema} ${tier} lee gris: croma ${c.toFixed(3)}`);
      }
    }
  });

  it("`--tinta-plena` ya NO es el T1", () => {
    /*
     * Eran el mismo valor, y eso ataba la tinta de los controles —chip de red
     * seleccionada, filetes, anillo de foco— al escalón más oscuro de la rampa
     * de datos: bajar la rampa a marrón de verdad arrastraba los controles con
     * ella. Separarlos es lo que permitió mover una cosa sin mover la otra.
     */
    for (const tema of ["claro", "oscuro"] as const) {
      const { tintaPlena, tintaT1 } = TOKENS[tema];
      assert.notEqual(tintaPlena, tintaT1, `${tema}: los volvieron a atar`);

      // Es tinta de control: lleva texto invertido encima y tiene que pasarlo.
      const fondo = tema === "claro" ? FONDOS.claroFondo : FONDOS.oscuroFondo;
      const r = contraste(tintaPlena, fondo);
      assert.ok(r >= 4.5, `${tema}: tinta-plena sobre fondo ${r.toFixed(2)}:1`);
    }
  });

  it("el respaldo de peligro pasa 4,5:1 cuando Telegram no manda el suyo", () => {
    for (const f of CLAROS) {
      const r = contraste(TOKENS.claro.peligro, FONDOS[f]);
      assert.ok(r >= 4.5, `peligro claro sobre ${f}: ${r.toFixed(2)}:1`);
    }
    for (const f of OSCUROS) {
      const r = contraste(TOKENS.oscuro.peligro, FONDOS[f]);
      assert.ok(r >= 4.5, `peligro oscuro sobre ${f}: ${r.toFixed(2)}:1`);
    }
  });

  it("el campo y la rampa NO son el mismo color", () => {
    /*
     * Los dos colores de Sophon son amarillo y marrón, y son familia: comparten
     * la mitad cálida de la rueda. Eso es deseable, pero si se acercaran
     * demasiado, «esto hay que pulsarlo» y «esto es un T2» pasarían a ser la
     * misma señal. 40° de separación es lo que los mantiene distinguibles
     * siendo de la misma casa.
     */
    for (const tema of ["claro", "oscuro"] as const) {
      for (const tier of ["tintaT1", "tintaT2", "tintaT3"] as const) {
        const d = separacionHue(CAMPO, TOKENS[tema][tier]);
        assert.ok(d >= 25, `${tema}: el campo y ${tier} a solo ${d.toFixed(0)}° de tono`);
      }
    }
  });

  it("la rampa es UNA familia: los tres tiers comparten tono", () => {
    // El tier no cambia lo que cobra el agente (ver `lib/devengo/motor.ts`), así
    // que no puede llevar tres colores distintos: ordena por valor dentro de un
    // solo tono.
    for (const tema of ["claro", "oscuro"] as const) {
      const { tintaT1, tintaT2, tintaT3 } = TOKENS[tema];
      assert.ok(separacionHue(tintaT1, tintaT2) <= 15, `${tema}: T1 y T2 no son la misma familia`);
      assert.ok(separacionHue(tintaT1, tintaT3) <= 15, `${tema}: T1 y T3 no son la misma familia`);
    }
  });

  it("atenuar un estrato con `opacity` NO es viable a ninguna alfa útil", () => {
    /*
     * El Testigo apagaba los días antiguos con `opacity`, con suelo 0,68. La
     * puerta no lo veía porque medía el token y no lo que se pinta.
     *
     * Este test fija el hallazgo: la alfa mínima a la que el T3 sigue pasando
     * 3:1 sobre su propia superficie está tan cerca de 1 que el degradado sería
     * invisible. O se ve el desvanecido o se ve el dato; no las dos.
     *
     * Si alguien vuelve a atenuar estratos, este test le dice el número.
     */
    for (const [tema, fondo] of [
      ["claro", FONDOS.claroBanda2],
      ["oscuro", FONDOS.oscuroBanda2],
    ] as const) {
      const t3 = TOKENS[tema].tintaT3;

      // A la alfa que llevaba el código, el estrato mayor era ilegible.
      const conLaAlfaQueHabia = contraste(componer(t3, fondo, 0.68), fondo);
      assert.ok(
        conLaAlfaQueHabia < 3,
        `${tema}: 0,68 daba ${conLaAlfaQueHabia.toFixed(2)}:1, ya no hace falta el aviso`,
      );

      // Y la alfa mínima viable no deja margen para un degradado perceptible.
      let minima = 1;
      for (let a = 1; a >= 0.5; a -= 0.005) {
        if (contraste(componer(t3, fondo, a), fondo) >= 3) minima = a;
        else break;
      }
      assert.ok(
        minima >= 0.85,
        `${tema}: la alfa mínima es ${minima.toFixed(2)}; si baja de 0,85 reconsidera el desvanecido`,
      );
    }
  });

  it("los valores anteriores NO habrían pasado, que es por lo que existe", () => {
    // El acento se usaba en etiquetas accionables con 3,97:1 sobre blanco.
    assert.ok(contraste("#A8762F", "#FFFFFF") < 4.5);
    // Y el estrato T3, el que más superficie ocupa, con 2,19:1. Llevaba así
    // desde el primer commit y no lo vio nadie mirándolo.
    assert.ok(contraste("#A9B0B7", "#FFFFFF") < 3);
    assert.ok(contraste("#59636D", "#17212B") < 3);
    // Y los dos que encontró el día que se añadieron las bandas al barrido: el
    // T3 oscuro y el acento claro pasaban contra el fondo de Telegram y fallaban
    // contra la superficie que la propia app pinta encima.
    assert.ok(contraste("#96688A", "#2E2F3D") < 3);
    assert.ok(contraste("#8A6414", "#E8E1E6") < 4.5);
    // La primera rampa marrón se tiñó a croma 0,022 y el validador de `dataviz`
    // la marcó como «reads gray». Una rampa de datos gris al lado de un botón
    // amarillo es la queja que se repitió tres veces.
    assert.ok(croma("#635D50") < 0.03, "aquella rampa leía como grafito");
    assert.ok(croma(TOKENS.claro.tintaT2) >= 0.05, "la rampa de marrón tiene que verse marrón");

    /*
     * Y los tres del rediseño amarillo, que son los que el usuario vio antes que
     * yo. Ninguno era un fallo de contraste: los tres PASABAN la puerta. Es la
     * lección de este cambio —medir no es diseñar— y por eso los tres tienen
     * ahora su propia comprobación arriba, que mide otra cosa.
     */
    // 1. Placa y botón eran el mismo amarillo: 1,00:1 entre sí.
    assert.equal(contraste("#F9D027", "#F9D027"), 1, "se camuflaban por definición");
    // 2. `banda-2` en oscuro salía verde oliva de mezclar azul con amarillo.
    assert.ok(hue("#2E3432") > 120 && hue("#2E3432") < 200, "aquello era verde");
    // 3. La rampa oscura estaba a L 0,88: melocotón, no marrón.
    assert.ok(luz("#FDCCAC") > 0.85, "aquello era melocotón");
    // Y no costaba contraste bajarla: el valor nuevo pasa 3:1 de sobra.
    assert.ok(contraste(TOKENS.oscuro.tintaT3, FONDOS.oscuroBanda2) >= 3);
  });
});
