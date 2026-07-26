import { test } from "node:test";
import assert from "node:assert/strict";

import { bpsDesdePorcentaje, microsDesdeCadena, sumar } from "../lib/devengo/dinero.ts";
import {
  type AsentadoPrevio,
  type ContextoDevengo,
  type FilaDiaria,
  type Tarifa,
  TipoAsiento,
  conciliar,
  estaCerrado,
  inicioVentana,
  margenSuperadmin,
  objetivoDevengo,
  planificarAsientos,
} from "../lib/devengo/motor.ts";

/** Tarifa del negocio: 0,03 $ por registro y 5 % de las compras. */
const TARIFA: Tarifa = {
  id: "tarifa-1",
  cpaPorRegistroMicros: microsDesdeCadena("0.03"),
  cpsBps: bpsDesdePorcentaje(5),
};

const CERO: AsentadoPrevio = { cpaMicros: 0n, cpsMicros: 0n, secuencia: 0 };

/** Día real de esgabrielcabrera observado en la API. */
function filaReal(sobre: Partial<FilaDiaria> = {}): FilaDiaria {
  return {
    webmasterId: "wm-1",
    fecha: "2026-07-24",
    countRegister: 9,
    countT1Register: 2,
    countT2Register: 2,
    countT3Register: 4,
    countPayingUsers: 1,
    paymentAmountMicros: microsDesdeCadena("9.99"),
    gananciaTotalMicros: microsDesdeCadena("7.65"),
    gananciaWebmasterMicros: microsDesdeCadena("5.65"),
    ...sobre,
  };
}

function ctx(sobre: Partial<ContextoDevengo> = {}): ContextoDevengo {
  return {
    fila: filaReal(),
    tarifa: TARIFA,
    previo: CERO,
    devengaDesde: null,
    fechaAjuste: "2026-07-25",
    ...sobre,
  };
}

test("el margen del superadmin es la diferencia entre los dos niveles", () => {
  // Dato real: L1 7,65 − L2 5,65 = 2,00 $.
  assert.equal(margenSuperadmin(filaReal()), microsDesdeCadena("2.00"));
});

test("la comisión objetivo del agente sale de sus registros y sus pagos", () => {
  const o = objetivoDevengo(filaReal(), TARIFA);
  assert.equal(o.cpaMicros, microsDesdeCadena("0.27")); // 9 registros × 0,03
  assert.equal(o.cpsMicros, microsDesdeCadena("0.4995")); // 5 % de 9,99
});

test("la primera sincronización escribe CPA y CPS", () => {
  const asientos = planificarAsientos(ctx());
  assert.equal(asientos.length, 2);
  assert.equal(asientos[0]?.tipo, TipoAsiento.CPA);
  assert.equal(asientos[1]?.tipo, TipoAsiento.CPS);
  assert.equal(asientos[0]?.fechaDevengo, "2026-07-24");
});

test("REGRESIÓN: re-sincronizar la misma fila no devenga nada", () => {
  // Es el fallo que más dinero cuesta: el barrido corre cada 30 minutos sobre
  // una ventana de días, así que cada fila se relee decenas de veces.
  const primera = planificarAsientos(ctx());
  const previo: AsentadoPrevio = {
    cpaMicros: primera[0]!.importeMicros,
    cpsMicros: primera[1]!.importeMicros,
    secuencia: 2,
  };
  const segunda = planificarAsientos(ctx({ previo }));
  assert.deepEqual(segunda, [], "una segunda pasada sin cambios no debe escribir nada");
});

test("una revisión al alza devenga solo la diferencia", () => {
  const previo: AsentadoPrevio = {
    cpaMicros: microsDesdeCadena("0.27"),
    cpsMicros: microsDesdeCadena("0.4995"),
    secuencia: 2,
  };
  // Sophon corrige el día: de 9 a 12 registros.
  const asientos = planificarAsientos(ctx({ fila: filaReal({ countRegister: 12 }), previo }));
  assert.equal(asientos.length, 1);
  assert.equal(asientos[0]?.tipo, TipoAsiento.CPA);
  assert.equal(asientos[0]?.importeMicros, microsDesdeCadena("0.09")); // 3 × 0,03
});

test("REGRESIÓN: una revisión a la baja genera reverso con la fecha del ajuste", () => {
  const previo: AsentadoPrevio = {
    cpaMicros: microsDesdeCadena("0.27"),
    cpsMicros: microsDesdeCadena("0.4995"),
    secuencia: 2,
  };
  // Sophon anula registros fraudulentos: de 9 a 4.
  const asientos = planificarAsientos(ctx({ fila: filaReal({ countRegister: 4 }), previo }));
  assert.equal(asientos.length, 1);
  assert.equal(asientos[0]?.tipo, TipoAsiento.AJUSTE_REVERSO);
  assert.equal(asientos[0]?.importeMicros, -microsDesdeCadena("0.15")); // −5 × 0,03
  assert.equal(
    asientos[0]?.fechaDevengo,
    "2026-07-25",
    "el reverso se fecha el día del ajuste, nunca el del hecho original",
  );
});

test("un reembolso revierte la parte de CPS", () => {
  const previo: AsentadoPrevio = {
    cpaMicros: microsDesdeCadena("0.27"),
    cpsMicros: microsDesdeCadena("0.4995"),
    secuencia: 2,
  };
  const asientos = planificarAsientos(
    ctx({ fila: filaReal({ paymentAmountMicros: 0n, countPayingUsers: 0 }), previo }),
  );
  assert.equal(asientos.length, 1);
  assert.equal(asientos[0]?.tipo, TipoAsiento.AJUSTE_REVERSO);
  assert.equal(asientos[0]?.importeMicros, -microsDesdeCadena("0.4995"));
});

test("REGRESIÓN: un webmaster asignado a posteriori no cobra historia ajena", () => {
  // Se asigna el 2026-07-20; el tráfico del 24 sí cuenta, el del 10 no.
  const dentro = planificarAsientos(ctx({ devengaDesde: "2026-07-20" }));
  assert.equal(dentro.length, 2, "lo posterior a la asignación sí devenga");

  const fuera = planificarAsientos(
    ctx({ fila: filaReal({ fecha: "2026-07-10" }), devengaDesde: "2026-07-20" }),
  );
  assert.deepEqual(fuera, [], "lo anterior a la asignación no puede devengar");
});

test("si se corrige la frontera de atribución, lo cobrado de más se revierte", () => {
  const previo: AsentadoPrevio = {
    cpaMicros: microsDesdeCadena("0.27"),
    cpsMicros: microsDesdeCadena("0.4995"),
    secuencia: 2,
  };
  const asientos = planificarAsientos(
    ctx({ fila: filaReal({ fecha: "2026-07-10" }), devengaDesde: "2026-07-20", previo }),
  );
  assert.equal(asientos.length, 2);
  assert.ok(asientos.every((a) => a.tipo === TipoAsiento.AJUSTE_REVERSO));
  assert.equal(sumar(asientos.map((a) => a.importeMicros)), -microsDesdeCadena("0.7695"));
});

test("REGRESIÓN: cambiar la tarifa no reescribe el histórico", () => {
  // Lo ya asentado con la tarifa vieja permanece; solo se ajusta la diferencia
  // hacia el nuevo objetivo, y el asiento nuevo apunta a la tarifa nueva.
  const previo: AsentadoPrevio = {
    cpaMicros: microsDesdeCadena("0.27"),
    cpsMicros: microsDesdeCadena("0.4995"),
    secuencia: 2,
  };
  const tarifaNueva: Tarifa = {
    id: "tarifa-2",
    cpaPorRegistroMicros: microsDesdeCadena("0.04"),
    cpsBps: bpsDesdePorcentaje(5),
  };
  const asientos = planificarAsientos(ctx({ tarifa: tarifaNueva, previo }));
  assert.equal(asientos.length, 1);
  assert.equal(asientos[0]?.importeMicros, microsDesdeCadena("0.09")); // 9 × (0,04 − 0,03)
  assert.equal(asientos[0]?.tarifaId, "tarifa-2", "el asiento congela la tarifa que lo generó");
});

test("las claves de idempotencia no colisionan dentro de una misma fila", () => {
  const asientos = planificarAsientos(ctx());
  const claves = new Set(asientos.map((a) => a.claveIdempotencia));
  assert.equal(claves.size, asientos.length);
});

test("la clave avanza con la secuencia, así que un ida y vuelta no colisiona", () => {
  // Un contador que sube, baja y vuelve a subir produce tres asientos distintos:
  // si la clave dependiera solo del valor, el tercero chocaría con el primero.
  const a1 = planificarAsientos(ctx());
  const previo1: AsentadoPrevio = {
    cpaMicros: a1[0]!.importeMicros,
    cpsMicros: a1[1]!.importeMicros,
    secuencia: 2,
  };
  const a2 = planificarAsientos(ctx({ fila: filaReal({ countRegister: 4 }), previo: previo1 }));
  const previo2: AsentadoPrevio = {
    cpaMicros: microsDesdeCadena("0.12"),
    cpsMicros: previo1.cpsMicros,
    secuencia: 3,
  };
  const a3 = planificarAsientos(ctx({ previo: previo2 }));

  const todas = [...a1, ...a2, ...a3].map((a) => a.claveIdempotencia);
  assert.equal(new Set(todas).size, todas.length, "ninguna clave puede repetirse");
});

test("INVARIANTE: el concepto se distingue por baseMicros, no por la nota", () => {
  // El sincronizador reconstruye lo ya asentado separando CPA de CPS con este
  // criterio estructural. Si un día se invirtiera, los reversos se aplicarían
  // contra el concepto equivocado y el saldo del agente quedaría mal en silencio.
  const alta = planificarAsientos(ctx());
  const cpa = alta.find((a) => a.tipo === TipoAsiento.CPA);
  const cps = alta.find((a) => a.tipo === TipoAsiento.CPS);
  assert.equal(cpa?.baseMicros, null, "un asiento de registros no lleva base en micros");
  assert.notEqual(cps?.baseMicros, null, "uno de pagos sí lleva la base sobre la que se calculó");

  // Y los reversos conservan la forma de aquello que revierten.
  const previo: AsentadoPrevio = {
    cpaMicros: microsDesdeCadena("0.27"),
    cpsMicros: microsDesdeCadena("0.4995"),
    secuencia: 2,
  };
  const revCpa = planificarAsientos(
    ctx({ fila: filaReal({ countRegister: 4 }), previo }),
  )[0];
  assert.equal(revCpa?.tipo, TipoAsiento.AJUSTE_REVERSO);
  assert.equal(revCpa?.baseMicros, null, "el reverso de registros mantiene base nula");

  const revCps = planificarAsientos(
    ctx({ fila: filaReal({ paymentAmountMicros: 0n, countPayingUsers: 0 }), previo }),
  )[0];
  assert.equal(revCps?.tipo, TipoAsiento.AJUSTE_REVERSO);
  assert.notEqual(revCps?.baseMicros, null, "el reverso de pagos mantiene base no nula");
});

test("la conciliación detecta un descuadre real y tolera el redondeo", () => {
  const sophon = microsDesdeCadena("55842.05");
  const ok = conciliar(sophon, [microsDesdeCadena("55842.0505")]);
  assert.equal(ok.cuadra, true, "medio micro de redondeo no es un descuadre");

  const mal = conciliar(sophon, [microsDesdeCadena("55000.00")]);
  assert.equal(mal.cuadra, false);
  assert.equal(mal.descuadreMicros, microsDesdeCadena("-842.05"));
});

test("la ventana de revisión distingue días abiertos de cerrados", () => {
  assert.equal(estaCerrado("2026-07-24", "2026-07-25"), false, "ayer sigue abierto");
  assert.equal(estaCerrado("2026-07-19", "2026-07-25"), false, "a 6 días sigue abierto");
  assert.equal(estaCerrado("2026-07-17", "2026-07-25"), true, "más allá de 7 días, cerrado");
  assert.equal(inicioVentana("2026-07-25"), "2026-07-18");
});

/*
 * REGRESIÓN: el borde exacto de la ventana, que tenía parado todo el dinero.
 *
 * Esta prueba decía antes que el día de 7 días «no cierra todavía», y con ella
 * en verde el sistema llevaba desde el principio sin consolidar un solo asiento:
 *
 *   - el barrido lee desde `inicioVentana(hoy, 7)`, que es exactamente hoy − 7;
 *   - `estaCerrado` comparaba con `>` estricto, así que 7 > 7 daba falso;
 *   - luego la fila MÁS ANTIGUA que el barrido llega a ver nunca se cerraba,
 *     ningún asiento pasaba a CONSOLIDADO, y como el disponible solo suma lo
 *     consolidado, todos los agentes tenían 0,00 $ retirables.
 *
 * El borde y la ventana tienen que encajar: lo que el barrido ya no vuelve a
 * leer tiene que estar cerrado, o queda en tierra de nadie para siempre.
 */
test("REGRESIÓN: el día que sale de la ventana queda cerrado, no en tierra de nadie", () => {
  const hoy = "2026-07-25";
  const masAntiguoQueSeLee = inicioVentana(hoy); // 2026-07-18, siete días justos

  assert.equal(
    estaCerrado(masAntiguoQueSeLee, hoy),
    true,
    "el día más antiguo de la ventana tiene que cerrar: es el último barrido que lo ve",
  );

  // Y la propiedad general que lo sostiene, sea cual sea la ventana.
  for (const dias of [1, 3, 7, 14, 30]) {
    const borde = inicioVentana(hoy, dias);
    assert.equal(
      estaCerrado(borde, hoy, dias),
      true,
      `con ventana de ${dias} días, el borde tiene que quedar cerrado`,
    );
  }
});
