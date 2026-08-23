import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ordenarAgentes,
  problemasDeRed,
  serieDeVentana,
  DIAS_VENTANA,
  type FilaAgente,
  type RecuentoWebmasters,
} from "../lib/admin/control.ts";

/**
 * Lo que decide el control de mando, sin base de datos.
 *
 * Las consultas no se prueban aquí —para eso está la prueba de extremo a
 * extremo— pero sí las tres decisiones que el Operador lee como si fueran
 * hechos: en qué orden aparecen los agentes, qué cuenta como incidencia en una
 * red, y qué forma tiene la serie de actividad. Las tres se pueden equivocar en
 * silencio: una tabla mal ordenada sigue pareciendo una tabla correcta.
 */

const RED_LIMPIA: RecuentoWebmasters = {
  total: 4,
  activos: 4,
  bloqueados: 0,
  pendientesBorrado: 0,
  sinConfirmar: 0,
  desaparecidos: 0,
  desconocidos: 0,
  conPro: 4,
  proCaducado: 0,
  nuncaTuvoPro: 0,
  parados: 0,
};

function agente(parcial: Partial<FilaAgente> & { id: string }): FilaAgente {
  return {
    nombre: parcial.id,
    email: `${parcial.id}@ejemplo.com`,
    estado: "ACTIVO",
    telegramUsuario: null,
    telegramId: null,
    idioma: "es",
    creadoEn: new Date("2026-01-01T00:00:00Z"),
    cpaPropiaMicros: null,
    cpsPropiaBps: null,
    sesionesVivas: 0,
    webmasters: RED_LIMPIA,
    altasTotales: 0,
    altasDelMes: 0,
    altasFallidas: 0,
    registrosVentana: 0,
    usuariosPagoVentana: 0,
    saldos: {
      devengadoMicros: 0n,
      disponibleMicros: 0n,
      solicitadoMicros: 0n,
      pagadoMicros: 0n,
    },
    retiroPendienteMicros: 0n,
    retirosPendientes: 0,
    ...parcial,
  };
}

const conDevengo = (id: string, micros: bigint, estado = "ACTIVO") =>
  agente({
    id,
    estado,
    saldos: {
      devengadoMicros: micros,
      disponibleMicros: micros,
      solicitadoMicros: 0n,
      pagadoMicros: 0n,
    },
  });

describe("el orden de la plantilla", () => {
  it("los activos van delante, aunque devenguen menos", () => {
    /*
     * Un suspendido con mil dólares devengados no es lo primero que hay que
     * mirar: no está produciendo. Si el orden fuera solo por dinero, la primera
     * fila de la página sería la de alguien que ya no trabaja.
     */
    const orden = ordenarAgentes([
      conDevengo("suspendido-rico", 1_000_000_000n, "SUSPENDIDO"),
      conDevengo("activo-pobre", 1_000n),
    ]);
    assert.deepEqual(orden.map((a) => a.id), ["activo-pobre", "suspendido-rico"]);
  });

  it("y dentro de los activos, por lo devengado", () => {
    const orden = ordenarAgentes([
      conDevengo("medio", 500n),
      conDevengo("mucho", 900n),
      conDevengo("poco", 100n),
    ]);
    assert.deepEqual(orden.map((a) => a.id), ["mucho", "medio", "poco"]);
  });

  it("con el mismo devengo, por nombre, para que el orden no baile", () => {
    // Dos agentes a cero —lo normal recién creados— salían en el orden que
    // devolviera la base de datos, que puede cambiar entre dos recargas. Una
    // tabla que se reordena sola al refrescar hace dudar de lo que dice.
    const orden = ordenarAgentes([
      agente({ id: "b", nombre: "Bruno" }),
      agente({ id: "a", nombre: "Ana" }),
    ]);
    assert.deepEqual(orden.map((a) => a.nombre), ["Ana", "Bruno"]);
  });

  it("no toca el array que recibe", () => {
    // Se llama sobre el resultado de la consulta, que otras partes releen.
    const entrada = [conDevengo("uno", 1n), conDevengo("dos", 9n)];
    ordenarAgentes(entrada);
    assert.deepEqual(entrada.map((a) => a.id), ["uno", "dos"]);
  });
});

describe("qué cuenta como incidencia", () => {
  it("una red sana no genera ni una", () => {
    assert.deepEqual(problemasDeRed(RED_LIMPIA), []);
  });

  it("el PRO caducado y el que nunca existió se cuentan APARTE", () => {
    /*
     * No son el mismo problema y no se arreglan igual: «caducado» es una
     * concesión que se agotó, y «sin PRO concedido» es un alta que se quedó a
     * medias —el caso que dejó a un webmaster con sus 6 TB apareciendo como sin
     * PRO—. Sumarlos en un solo «4 sin PRO» escondería el segundo dentro del
     * primero.
     */
    const avisos = problemasDeRed({ ...RED_LIMPIA, proCaducado: 2, nuncaTuvoPro: 1 });
    assert.deepEqual(avisos, ["1 sin PRO concedido", "2 con el PRO caducado"]);
  });

  it("lo urgente va primero: una cuenta bloqueada antes que una inactiva", () => {
    // El orden de la lista ES el orden de atención, y se pinta tal cual en la
    // celda. Con «3 inactivos» delante de «1 bloqueado», lo que se lee primero
    // es lo que menos corre.
    const avisos = problemasDeRed({ ...RED_LIMPIA, parados: 3, bloqueados: 1 });
    assert.deepEqual(avisos, ["1 bloqueado", "3 inactivos"]);
  });

  it("singular y plural, que es lo que separa un panel de un volcado", () => {
    assert.deepEqual(problemasDeRed({ ...RED_LIMPIA, parados: 1 }), ["1 inactivo"]);
    assert.deepEqual(problemasDeRed({ ...RED_LIMPIA, parados: 2 }), ["2 inactivos"]);
  });

  it("«no figura en Sophon» concuerda: el verbo lleva número", () => {
    // Un aviso con la concordancia mal —«1 no figuran»— es lo que hace que una
    // herramienta parezca una plantilla a medio rellenar.
    assert.deepEqual(problemasDeRed({ ...RED_LIMPIA, desaparecidos: 1 }), [
      "1 no figura en Sophon",
    ]);
    assert.deepEqual(problemasDeRed({ ...RED_LIMPIA, desaparecidos: 2 }), [
      "2 no figuran en Sophon",
    ]);
  });
});

describe("la serie de actividad", () => {
  const HOY = "2026-08-22";
  const fecha = (iso: string) => new Date(`${iso}T00:00:00Z`);

  it("tiene un valor por día de la ventana, del más antiguo al más reciente", () => {
    const serie = serieDeVentana([{ fecha: fecha(HOY), countRegister: 5 }], HOY);
    assert.equal(serie.length, DIAS_VENTANA);
    assert.equal(serie[DIAS_VENTANA - 1], 5, "el último hueco no es hoy");
  });

  it("rellena los huecos con cero en vez de encogerse", () => {
    /*
     * Sophon no manda fila para un día sin tráfico. Dibujando solo las filas que
     * existen, tres días sueltos salían pegados y el webmaster parecía
     * constante: la forma del hueco es justo lo que hay que ver.
     */
    const serie = serieDeVentana(
      [
        { fecha: fecha("2026-08-22"), countRegister: 4 },
        { fecha: fecha("2026-08-20"), countRegister: 7 },
      ],
      HOY,
    );
    assert.equal(serie.length, DIAS_VENTANA);
    assert.equal(serie[DIAS_VENTANA - 1], 4);
    assert.equal(serie[DIAS_VENTANA - 2], 0, "el día sin fila no quedó a cero");
    assert.equal(serie[DIAS_VENTANA - 3], 7);
    assert.equal(
      serie.reduce((s, v) => s + v, 0),
      11,
      "se coló tráfico que no existe",
    );
  });

  it("ignora lo que cae fuera de la ventana", () => {
    // La consulta ya filtra por fecha, pero la función se usa también sobre
    // listas traídas para otra cosa: si colara un día viejo, el total de la
    // celda dejaría de cuadrar con la columna de al lado.
    const serie = serieDeVentana([{ fecha: fecha("2026-01-01"), countRegister: 99 }], HOY);
    assert.deepEqual(serie, Array.from({ length: DIAS_VENTANA }, () => 0));
  });

  it("sin datos son catorce ceros, no un array vacío", () => {
    // Una serie vacía dibujaría una celda en blanco, que se lee como «no hay
    // datos» y no como «no hay tráfico», que es lo contrario.
    assert.deepEqual(serieDeVentana([], HOY), Array.from({ length: DIAS_VENTANA }, () => 0));
  });
});
