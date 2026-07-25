import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Puerta de entrada del color.
 *
 * Ningún token entra por criterio visual sobre un fondo blanco en un portátil.
 * Este test recorre los fondos REALES que pone Telegram —incluidos los temas
 * personalizados que más se usan— y falla si algo baja del umbral.
 *
 * Existe porque ya pasó lo contrario: la aplicación llevaba `#A8762F` como
 * único acento, usado justo en las etiquetas accionables, y da 3,97:1 sobre
 * blanco. Nadie lo notó mirándolo.
 *
 * Umbrales: 4,5:1 para texto, 3:1 para marcas de datos y bordes.
 */

/** Fondos reales de clientes de Telegram, claros y oscuros. */
const FONDOS = {
  blanco: "#FFFFFF",
  claroSecundario: "#F2F3F5",
  oscuroTelegram: "#17212B",
  oscuroNoche: "#18222D",
  oscuroAmoled: "#1C1C1D",
  negro: "#000000",
} as const;

const CLAROS = ["blanco", "claroSecundario"] as const;
const OSCUROS = ["oscuroTelegram", "oscuroNoche", "oscuroAmoled", "negro"] as const;

/** Los mismos valores que declara `app/(miniapp)/globals.css`. */
const TOKENS = {
  claro: {
    texto: "#10151A",
    tintaT1: "#10151A",
    tintaT2: "#4A525A",
    tintaT3: "#7E858C",
    vivo: "#8A6414",
    peligro: "#B3261E",
  },
  oscuro: {
    texto: "#F5F7F9",
    tintaT1: "#F5F7F9",
    tintaT2: "#A8B2BC",
    tintaT3: "#727C86",
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

  it("los valores anteriores NO habrían pasado, que es por lo que existe", () => {
    // El acento se usaba en etiquetas accionables con 3,97:1 sobre blanco.
    assert.ok(contraste("#A8762F", FONDOS.blanco) < 4.5);
    // Y el estrato T3, el que más superficie ocupa, con 2,19:1. Llevaba así
    // desde el primer commit y no lo vio nadie mirándolo.
    assert.ok(contraste("#A9B0B7", FONDOS.blanco) < 3);
    assert.ok(contraste("#59636D", FONDOS.oscuroTelegram) < 3);
  });
});
