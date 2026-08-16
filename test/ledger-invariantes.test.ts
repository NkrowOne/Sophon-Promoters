import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { componerSaldos } from "../lib/devengo/saldos.ts";
import { aplicarBps, repartir, sumar, type Micros } from "../lib/devengo/dinero.ts";

/**
 * Los invariantes del libro, comprobados sobre secuencias aleatorias.
 *
 * Los tests de `saldos.test.ts` fijan los cuatro estados de una solicitud uno a
 * uno, que es lo que hacía falta para cerrar el descuadre que había. Esto es lo
 * otro: en vez de comprobar los casos que se nos ocurren, se simula el libro
 * entero —miles de barajas de operaciones— y se comprueba que ciertas cosas no
 * pueden dejar de ser verdad.
 *
 * Sirve para lo que una lista de casos no sirve: la combinación que nadie pensó.
 * El defecto que se arregló era exactamente eso —devengar, pedir, cobrar, volver
 * a devengar— y ninguna lista lo tenía.
 *
 * Es determinista a propósito: la semilla está escrita. Un test que falla una de
 * cada cien ejecuciones no se arregla, se ignora.
 */

/** Generador con semilla (xorshift32). Sin `Math.random`: un fallo tiene que repetirse. */
function azar(semilla: number): () => number {
  let x = semilla | 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 1_000_000) / 1_000_000;
  };
}

const D = 1_000_000n;

/**
 * El libro, modelado como lo que es: una lista de asientos y una de solicitudes.
 *
 * Reproduce las transiciones reales del producto, que están documentadas en
 * `lib/devengo/saldos.ts` y en la acción de retiros del panel:
 *
 *   devengar        → asiento de trabajo, PROVISIONAL
 *   consolidar      → ese asiento pasa a CONSOLIDADO
 *   pedir retiro    → asiento RETIRO negativo CONSOLIDADO + solicitud SOLICITADO
 *   pagar           → la solicitud pasa a PAGADO. NO nace ningún asiento.
 *   rechazar        → AJUSTE_MANUAL positivo que compensa + solicitud RECHAZADA
 *   reverso         → asiento de trabajo negativo (Sophon revisó a la baja)
 */
class Libro {
  /** Asientos de trabajo: los que NO cuelgan de una solicitud. */
  trabajo: { micros: Micros; consolidado: boolean }[] = [];
  /** Asientos que cuelgan de una solicitud: el retiro y su compensación. */
  deRetiro: Micros[] = [];
  solicitudes: { micros: Micros; estado: "SOLICITADO" | "PAGADO" | "RECHAZADO" }[] = [];

  devengar(micros: Micros): void {
    this.trabajo.push({ micros, consolidado: false });
  }

  consolidarTodo(): void {
    for (const a of this.trabajo) a.consolidado = true;
  }

  /** Devuelve false si no hay saldo o ya hay una solicitud viva (la regla del producto). */
  pedirRetiro(micros: Micros): boolean {
    if (micros <= 0n) return false;
    if (this.solicitudes.some((s) => s.estado === "SOLICITADO")) return false;
    if (micros > this.saldos().disponibleMicros) return false;
    this.deRetiro.push(-micros);
    this.solicitudes.push({ micros, estado: "SOLICITADO" });
    return true;
  }

  resolver(pagar: boolean): void {
    const viva = this.solicitudes.find((s) => s.estado === "SOLICITADO");
    if (!viva) return;
    if (pagar) {
      viva.estado = "PAGADO";
      // No nace asiento: el negativo se creó al pedirlo.
    } else {
      viva.estado = "RECHAZADO";
      this.deRetiro.push(viva.micros); // la compensación
    }
  }

  reverso(micros: Micros): void {
    this.trabajo.push({ micros: -micros, consolidado: true });
  }

  saldos() {
    const consolidadoTrabajo = sumar(this.trabajo.filter((a) => a.consolidado).map((a) => a.micros));
    return componerSaldos({
      devengoProvisionalMicros: sumar(
        this.trabajo.filter((a) => !a.consolidado).map((a) => a.micros),
      ),
      devengoConsolidadoMicros: consolidadoTrabajo,
      consolidadoConRetirosMicros: consolidadoTrabajo + sumar(this.deRetiro),
      solicitadoMicros: sumar(
        this.solicitudes.filter((s) => s.estado === "SOLICITADO").map((s) => s.micros),
      ),
      pagadoMicros: sumar(this.solicitudes.filter((s) => s.estado === "PAGADO").map((s) => s.micros)),
    });
  }
}

describe("invariantes del libro sobre secuencias aleatorias", () => {
  it("mil barajas de operaciones y ningún invariante se rompe", () => {
    const rnd = azar(20260816);

    for (let ronda = 0; ronda < 1000; ronda++) {
      const libro = new Libro();
      let devengadoDeVerdad = 0n;
      let cobradoDeVerdad = 0n;

      for (let paso = 0; paso < 40; paso++) {
        const dado = rnd();
        if (dado < 0.4) {
          const m = BigInt(Math.floor(rnd() * 50) + 1) * D;
          libro.devengar(m);
          devengadoDeVerdad += m;
        } else if (dado < 0.6) {
          libro.consolidarTodo();
        } else if (dado < 0.8) {
          const m = BigInt(Math.floor(rnd() * 60) + 1) * D;
          libro.pedirRetiro(m);
        } else if (dado < 0.92) {
          const pagar = rnd() < 0.7;
          const viva = libro.solicitudes.find((s) => s.estado === "SOLICITADO");
          if (viva && pagar) cobradoDeVerdad += viva.micros;
          libro.resolver(pagar);
        } else {
          // Un reverso, pero solo por lo que hay: Sophon revisa a la baja, no inventa deuda.
          const m = BigInt(Math.floor(rnd() * 10)) * D;
          libro.reverso(m);
          devengadoDeVerdad -= m;
        }

        const s = libro.saldos();
        const donde = `ronda ${ronda}, paso ${paso}`;

        // 1. El disponible NUNCA se enseña en negativo.
        assert.ok(s.disponibleMicros >= 0n, `${donde}: disponible negativo ${s.disponibleMicros}`);

        // 2. Lo devengado es EXACTAMENTE lo que se ganó, cobrado o no. Es el
        //    invariante que el defecto anterior rompía: cobrar bajaba lo ganado.
        assert.equal(s.devengadoMicros, devengadoDeVerdad, `${donde}: devengado descuadrado`);

        // 3. Lo pagado es exactamente lo que salió por la puerta.
        assert.equal(s.pagadoMicros, cobradoDeVerdad, `${donde}: pagado descuadrado`);

        // 4. Nunca se puede tener pedido y pagado a la vez sobre la misma
        //    solicitud, ni más de una viva: es la regla del producto.
        assert.ok(
          libro.solicitudes.filter((x) => x.estado === "SOLICITADO").length <= 1,
          `${donde}: dos solicitudes vivas`,
        );

        /*
         * 5. EL INVARIANTE CENTRAL, y el que el defecto rompía:
         *
         *      disponible = max(0, consolidado − pedido − cobrado)
         *
         *    Con el doble descuento, el lado izquierdo se quedaba corto justo en
         *    el importe de cada retiro, y con la solicitud ya pagada no se
         *    recuperaba nunca.
         *
         *    El `max(0, …)` no es un adorno del test: un reverso de Sophon sobre
         *    un día ya cobrado deja la cuenta en rojo de verdad, y el producto
         *    enseña cero en vez de una deuda que el agente no puede pagar. La
         *    primera versión de este test se olvidó de eso y falló ella sola,
         *    que es exactamente para lo que sirve escribir el invariante entero.
         */
        const consolidado = sumar(
          libro.trabajo.filter((a) => a.consolidado).map((a) => a.micros),
        );
        const sinSuelo = consolidado - s.solicitadoMicros - s.pagadoMicros;
        assert.equal(
          s.disponibleMicros,
          sinSuelo > 0n ? sinSuelo : 0n,
          `${donde}: el disponible no cuadra con lo consolidado`,
        );
      }
    }
  });

  it("`repartir` no pierde ni gana un micro, con pesos y signos cualesquiera", () => {
    /*
     * Es la garantía sobre la que se apoya el reparto de comisiones. Si perdiera
     * micros, el descuadre contra Sophon crecería con el volumen y solo se vería
     * meses después, en la conciliación.
     */
    const rnd = azar(999);
    for (let i = 0; i < 2000; i++) {
      const n = 1 + Math.floor(rnd() * 6);
      const pesos: bigint[] = Array.from({ length: n }, () => BigInt(Math.floor(rnd() * 100)));
      // Se mide la suma en vez de usar `every(p => p === 0n)`: aquello es un
      // predicado que estrecha el array a `0n[]`, y entonces asignarle un `1n`
      // no compila. `repartir` exige que los pesos sumen algo positivo.
      if (sumar(pesos) === 0n) pesos[0] = 1n;

      const signo = rnd() < 0.25 ? -1n : 1n;
      const total = signo * BigInt(Math.floor(rnd() * 1_000_000_000));

      const partes = repartir(total, pesos);
      assert.equal(sumar(partes), total, `las partes no suman el total con pesos ${pesos}`);
      assert.equal(partes.length, pesos.length);
      // Un peso de cero no se lleva nada, ni siquiera el residuo.
      pesos.forEach((p, j) => {
        if (p === 0n) assert.equal(partes[j], 0n, "un peso cero se llevó residuo");
      });
    }
  });

  it("`aplicarBps` arrastrando el residuo no pierde nada sobre muchos eventos", () => {
    /*
     * El propio módulo avisa: quien acumula comisiones sobre muchos eventos debe
     * arrastrar el residuo o perderá hasta un micro por operación. Esto lo mide.
     */
    const rnd = azar(4242);
    const bps = 1_500n; // 15 %
    let residuo = 0n;
    let acumulado = 0n;
    let baseTotal = 0n;

    for (let i = 0; i < 10_000; i++) {
      const base = BigInt(Math.floor(rnd() * 999) + 1);
      baseTotal += base;
      const r = aplicarBps(base, bps, residuo);
      acumulado += r.importe;
      residuo = r.residuo;
    }

    // Con el residuo arrastrado, el acumulado es el exacto truncado del total.
    assert.equal(acumulado, (baseTotal * bps) / 10_000n);

    // Y sin arrastrarlo se pierde de verdad: esto es lo que justifica el parámetro.
    const rnd2 = azar(4242);
    let suelto = 0n;
    for (let i = 0; i < 10_000; i++) {
      const base = BigInt(Math.floor(rnd2() * 999) + 1);
      suelto += aplicarBps(base, bps).importe;
    }
    assert.ok(suelto < acumulado, "sin arrastrar el residuo debería perderse algo");
  });
});
