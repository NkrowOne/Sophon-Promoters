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
 * Todo lo que puede quedar DEBAJO de un token.
 *
 * Los cuatro primeros de cada polaridad son fondos reales de clientes de
 * Telegram; los tres últimos son nuestras superficies —las tres bandas y el
 * suelo del raíl—, con los valores de respaldo de `globals.css`.
 */
const FONDOS = {
  blanco: "#FFFFFF",
  claroSecundario: "#F2F3F5",
  claroBanda1: "#F4F0F3",
  claroCarril: "#ECE6EA",
  claroBanda2: "#E8E1E6",

  oscuroTelegram: "#17212B",
  oscuroNoche: "#18222D",
  oscuroAmoled: "#1C1C1D",
  negro: "#000000",
  oscuroBanda1: "#232834",
  oscuroCarril: "#2A2D3A",
  oscuroBanda2: "#2E2F3D",
} as const;

const CLAROS = ["blanco", "claroSecundario", "claroBanda1", "claroCarril", "claroBanda2"] as const;
const OSCUROS = [
  "oscuroTelegram",
  "oscuroNoche",
  "oscuroAmoled",
  "negro",
  "oscuroBanda1",
  "oscuroCarril",
  "oscuroBanda2",
] as const;

/** Los mismos valores que declara `app/(miniapp)/globals.css`. */
const TOKENS = {
  claro: {
    texto: "#10151A",
    tintaT1: "#4A1F42",
    tintaT2: "#7C3A6D",
    tintaT3: "#A45F91",
    vivo: "#845E09",
    peligro: "#B3261E",
  },
  oscuro: {
    texto: "#F5F7F9",
    tintaT1: "#F0CDE6",
    tintaT2: "#C994B8",
    tintaT3: "#9A6B8E",
    vivo: "#D7A94A",
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
    for (const f of CLAROS) {
      const r = contraste(TOKENS.claro.texto, FONDOS[f]);
      assert.ok(r >= 4.5, `texto claro sobre ${f}: ${r.toFixed(2)}:1`);
    }
    for (const f of OSCUROS) {
      const r = contraste(TOKENS.oscuro.texto, FONDOS[f]);
      assert.ok(r >= 4.5, `texto oscuro sobre ${f}: ${r.toFixed(2)}:1`);
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

  it("el acento de estado pasa 4,5:1: se usa en etiquetas, no solo en filetes", () => {
    for (const f of CLAROS) {
      const r = contraste(TOKENS.claro.vivo, FONDOS[f]);
      assert.ok(r >= 4.5, `vivo claro sobre ${f}: ${r.toFixed(2)}:1`);
    }
    for (const f of OSCUROS) {
      const r = contraste(TOKENS.oscuro.vivo, FONDOS[f]);
      assert.ok(r >= 4.5, `vivo oscuro sobre ${f}: ${r.toFixed(2)}:1`);
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

  it("el par del botón principal pasa 4,5:1", () => {
    // `bg-tinta` con `text-fondo`: es la acción de cada pantalla y hasta ahora
    // no se medía ninguna de las dos caras.
    for (const f of CLAROS) {
      const r = contraste(FONDOS[f], TOKENS.claro.tintaT1);
      assert.ok(r >= 4.5, `fondo ${f} sobre botón claro: ${r.toFixed(2)}:1`);
    }
    for (const f of OSCUROS) {
      const r = contraste(FONDOS[f], TOKENS.oscuro.tintaT1);
      assert.ok(r >= 4.5, `fondo ${f} sobre botón oscuro: ${r.toFixed(2)}:1`);
    }
  });

  it("el acento de estado NO comparte tono con los datos", () => {
    // Ciruela y ámbar tienen casi el mismo valor: si además se acercaran en
    // tono, «esto caduca» y «esto es un T2» serían la misma marca.
    for (const tema of ["claro", "oscuro"] as const) {
      for (const tier of ["tintaT1", "tintaT2", "tintaT3"] as const) {
        const d = separacionHue(TOKENS[tema].vivo, TOKENS[tema][tier]);
        assert.ok(d >= 60, `${tema}: vivo y ${tier} a solo ${d.toFixed(0)}° de tono`);
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
    assert.ok(contraste("#A8762F", FONDOS.blanco) < 4.5);
    // Y el estrato T3, el que más superficie ocupa, con 2,19:1. Llevaba así
    // desde el primer commit y no lo vio nadie mirándolo.
    assert.ok(contraste("#A9B0B7", FONDOS.blanco) < 3);
    assert.ok(contraste("#59636D", FONDOS.oscuroTelegram) < 3);
    // Y los dos que encontró el día que se añadieron las bandas al barrido: el
    // T3 oscuro y el acento claro pasaban contra el fondo de Telegram y fallaban
    // contra la superficie que la propia app pinta encima.
    assert.ok(contraste("#96688A", FONDOS.oscuroBanda2) < 3);
    assert.ok(contraste("#8A6414", FONDOS.claroBanda2) < 4.5);
  });
});
