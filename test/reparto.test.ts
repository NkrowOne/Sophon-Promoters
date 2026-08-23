import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  abonoPorRegistro,
  CPS_AL_OPERADOR_BPS,
  CPS_WEBMASTER_BPS,
  repartir,
  sumarPartes,
  totalParte,
  PARTE_CERO,
  type Volumen,
} from "../lib/devengo/reparto.ts";

/**
 * El reparto entre webmaster, agente y Operador.
 *
 * Se prueba porque el panel lo enseñaba MAL dos veces seguidas —primero como
 * una resta, después dejando al webmaster a cero cuando sus usuarios no
 * compraban— y porque es la aritmética con la que se le contesta a quien
 * reclama. Un error aquí no se ve: sale un número con dos decimales y aspecto
 * de estar bien.
 */

/** La tarifa de verdad de producción: 0,03 $ por registro y 5 % del PRO. */
const TARIFA = { cpaPorRegistroMicros: 30_000n, cpsBps: 500 };

/** Un tramo de tráfico con lo que Sophon reporta para cada parte. */
function volumen(v: Partial<Volumen>): Volumen {
  return {
    registros: 0,
    pagadoPorUsuariosMicros: 0n,
    gananciaWebmasterMicros: 0n,
    gananciaOperadorMicros: 0n,
    ...v,
  };
}

describe("el webmaster cobra por registro, no solo por compras", () => {
  it("con registros y NINGUNA compra, su parte no es cero", () => {
    /*
     * El caso que llegó de producción: doce registros, 0,00 $ en compras, y el
     * panel enseñaba «sin comisión» en la línea del webmaster. Sophon le está
     * pagando: su ingreso viene en la fila diaria y hay que leerlo de ahí, no
     * deducirlo del 35 % de unas compras que no existen.
     */
    const r = repartir(
      volumen({
        registros: 12,
        gananciaWebmasterMicros: 480_000n, // 0,48 $ que Sophon le abona
        gananciaOperadorMicros: 1_200_000n, // 1,20 $ que entran al Operador
      }),
      TARIFA,
    );

    assert.equal(r.webmaster.registrosMicros, 480_000n);
    assert.equal(r.webmaster.proMicros, 0n);
    assert.equal(totalParte(r.webmaster), 480_000n);
  });

  it("su total es SIEMPRE lo que Sophon reporta, con compras o sin ellas", () => {
    const reportado = 40_000_000n;
    const r = repartir(
      volumen({
        registros: 30,
        pagadoPorUsuariosMicros: 100_000_000n,
        gananciaWebmasterMicros: reportado,
        gananciaOperadorMicros: 20_000_000n,
      }),
      TARIFA,
    );
    // 35 % de 100,00 $ es de compras; los 5,00 $ restantes, de registros.
    assert.equal(r.webmaster.proMicros, 35_000_000n);
    assert.equal(r.webmaster.registrosMicros, 5_000_000n);
    assert.equal(totalParte(r.webmaster), reportado);
  });
});

describe("lo que se paga al agente sí es cálculo", () => {
  it("fijo por registro más porcentaje de lo pagado, según su tarifa", () => {
    const r = repartir(
      volumen({
        registros: 12,
        pagadoPorUsuariosMicros: 100_000_000n,
        gananciaWebmasterMicros: 40_000_000n,
        gananciaOperadorMicros: 20_000_000n,
      }),
      TARIFA,
    );
    assert.equal(r.agente.registrosMicros, 360_000n); // 12 × 0,03 $
    assert.equal(r.agente.proMicros, 5_000_000n); // 5 % de 100,00 $
  });
});

describe("la parte del Operador cuadra con lo que le ingresan", () => {
  it("su total es el ingreso reportado menos lo del agente", () => {
    const ingresado = 20_000_000n;
    const r = repartir(
      volumen({
        registros: 12,
        pagadoPorUsuariosMicros: 100_000_000n,
        gananciaWebmasterMicros: 40_000_000n,
        gananciaOperadorMicros: ingresado,
      }),
      TARIFA,
    );
    assert.equal(totalParte(r.operador), ingresado - totalParte(r.agente));
  });

  it("de las compras se lleva sus puntos menos los del agente", () => {
    const r = repartir(
      volumen({
        pagadoPorUsuariosMicros: 100_000_000n,
        gananciaOperadorMicros: 15_000_000n,
      }),
      TARIFA,
    );
    const alOperador = (100_000_000n * BigInt(CPS_AL_OPERADOR_BPS)) / 10_000n;
    assert.equal(r.agente.proMicros + r.operador.proMicros, alOperador);
    assert.equal(r.operador.proMicros, 10_000_000n); // 15 % − 5 %
  });

  it("sin agente cobra íntegro lo que le ingresan", () => {
    const r = repartir(
      volumen({
        registros: 10,
        pagadoPorUsuariosMicros: 100_000_000n,
        gananciaOperadorMicros: 15_600_000n,
      }),
      { cpaPorRegistroMicros: 0n, cpsBps: 0 },
    );
    assert.equal(totalParte(r.operador), 15_600_000n);
    assert.equal(totalParte(r.agente), 0n);
  });

  it("una tarifa por encima del ingreso sale NEGATIVA y no maquillada a cero", () => {
    /*
     * El formulario de tarifas lo impide, pero si entrara por otra puerta esta
     * pantalla es donde se tiene que ver. Un `max(0, …)` lo escondería justo
     * donde hay que mirarlo.
     */
    const r = repartir(
      volumen({ registros: 10, gananciaOperadorMicros: 200_000n }),
      { cpaPorRegistroMicros: 100_000n, cpsBps: 2_000 },
    );
    assert.ok(r.operador.registrosMicros < 0n);
  });
});

describe("la parte del webmaster en las compras", () => {
  it("son sus puntos pactados del importe pagado", () => {
    const r = repartir(
      volumen({ pagadoPorUsuariosMicros: 100_000_000n, gananciaWebmasterMicros: 35_000_000n }),
      TARIFA,
    );
    assert.equal(r.webmaster.proMicros, (100_000_000n * BigInt(CPS_WEBMASTER_BPS)) / 10_000n);
    // Y no pasa por la cuenta del Operador: la abona Sophon aparte.
    assert.equal(r.webmaster.proMicros, 35_000_000n);
  });
});

describe("el abono por registro, despejado", () => {
  it("descuenta la parte de compras y divide entre los registros", () => {
    // 12 registros: 0,48 $ al webmaster y 1,20 $ al Operador, sin compras.
    const v = volumen({
      registros: 12,
      gananciaWebmasterMicros: 480_000n,
      gananciaOperadorMicros: 1_200_000n,
    });
    assert.equal(abonoPorRegistro(v), 140_000n); // 1,68 $ / 12 = 0,14 $
  });

  it("sin registros no hay abono por registro, y no es cero", () => {
    // Dividir entre cero no es «cero por registro»: es que no se puede saber.
    assert.equal(abonoPorRegistro(volumen({ pagadoPorUsuariosMicros: 100n })), null);
  });
});

describe("sumar partes", () => {
  it("acumula por concepto y el total es la suma de los dos", () => {
    const a = repartir(
      volumen({ registros: 10, pagadoPorUsuariosMicros: 10_000_000n }),
      TARIFA,
    );
    const b = repartir(
      volumen({ registros: 5, pagadoPorUsuariosMicros: 20_000_000n }),
      TARIFA,
    );
    const suma = sumarPartes(a.agente, b.agente);

    assert.equal(suma.registrosMicros, 450_000n); // 15 × 0,03 $
    assert.equal(suma.proMicros, 1_500_000n); // 5 % de 30,00 $
    assert.equal(totalParte(suma), 1_950_000n);
    assert.equal(totalParte(sumarPartes(PARTE_CERO, suma)), totalParte(suma));
  });
});
