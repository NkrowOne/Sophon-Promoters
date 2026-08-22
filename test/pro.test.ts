import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  concederAnio,
  type DependenciasConcesion,
  type MotivoConcesion,
} from "../lib/pro/conceder.ts";
import {
  DIAS_AVISO_PRO,
  diasRestantesPro,
  finEfectivoDelPro,
  proActivo,
  renovablePro,
} from "../lib/pro/vigencia.ts";
import { SEGUNDOS_UN_ANIO, type ResultadoMembresia } from "../lib/sophon/tipos.ts";

/**
 * La regla del PRO, que hasta ahora no tenía una sola prueba.
 *
 * Es la única de esta aplicación que puede **quitarle** algo a un webmaster.
 * `setmembership` no documenta si al conceder sobre una suscripción viva el
 * plazo se suma o se sustituye, y la whitelist del Tool API no está activa en la
 * cuenta de producción, así que no se puede provocar el caso para comprobarlo.
 * Si sustituye, renovar a mitad de año le borra los meses que le quedaban y el
 * agente cree estar regalándole tiempo mientras se lo quita.
 *
 * De ahí que lo que se comprueba aquí no sea «devuelve un error bonito» sino
 * **que la llamada a Sophon no llega a salir**. Todo lo demás es cosmético al
 * lado de eso.
 */

const DIA = 86_400_000;
const AHORA = new Date("2026-07-26T12:00:00Z");
const enDias = (n: number) => new Date(AHORA.getTime() + n * DIA);
const isoDe = (d: Date) => d.toISOString().slice(0, 10);

describe("vigencia del PRO", () => {
  it("activo es tener fecha y que no haya pasado", () => {
    assert.equal(proActivo(null, AHORA), false, "nunca tuvo");
    assert.equal(proActivo(enDias(300), AHORA), true);
    assert.equal(proActivo(enDias(1), AHORA), true);
    assert.equal(proActivo(enDias(-1), AHORA), false, "caducado ayer");
  });

  it("el instante exacto de caducidad ya NO está activo", () => {
    // El borde importa: con `>=` en vez de `>`, el último milisegundo dejaría
    // una ventana en la que la pantalla ofrece renovar y el guardián rechaza.
    assert.equal(proActivo(AHORA, AHORA), false);
    assert.equal(renovablePro(AHORA, AHORA), true);
  });

  it("renovable es exactamente lo contrario de activo, y nada más", () => {
    for (const v of [null, enDias(-400), enDias(-1), AHORA, enDias(1), enDias(400)]) {
      assert.equal(renovablePro(v, AHORA), !proActivo(v, AHORA));
    }
  });

  it("los días restantes redondean HACIA ARRIBA: el día en curso cuenta", () => {
    // A las 23:00 del último día el PRO todavía sirve. Redondear hacia abajo
    // adelantaría la caducidad unas horas, y justo en el plazo donde importa.
    assert.equal(diasRestantesPro(null, AHORA), null);
    assert.equal(diasRestantesPro(new Date(AHORA.getTime() + 0.1 * DIA), AHORA), 1);
    assert.equal(diasRestantesPro(enDias(30), AHORA), 30);
    assert.equal(diasRestantesPro(enDias(-2), AHORA), -2);
  });

  it("el umbral de aviso es uno solo y no marca nada accionable", () => {
    // Vivía por triplicado con tres copias sin relación. Y ahora que un PRO
    // vigente no se renueva, estar por debajo del umbral NO habilita nada:
    // si esto dejara de cumplirse, la pantalla volvería a ofrecer botones que
    // el guardián rechaza.
    assert.equal(DIAS_AVISO_PRO, 30);
    assert.equal(renovablePro(enDias(DIAS_AVISO_PRO - 1), AHORA), false);
  });
});

/**
 * Doble de la base de datos y de Sophon.
 *
 * Registra las llamadas en vez de comprobarlas al vuelo: lo que hay que poder
 * afirmar es «Sophon no se ha llamado NI UNA vez», y eso es un recuento.
 */
function montar(estado: {
  proVigenteHasta: Date | null;
  /** Concesión ya existente con la misma clave, si la hay. */
  previa?: { id: string; estado: string; vigenteHasta: Date | null };
  /**
   * La última concesión CONFIRMADA de este webmaster, mire lo que mire la
   * anotación del webmaster. Es lo que ve el SEGUNDO guardián.
   */
  ultimaConcesion?: { creadoEn: Date; duracionSegundos: number; vigenteHasta: Date | null };
  /**
   * Lo que contesta `setmembership`, cuando la prueba necesita otra forma.
   *
   * Estaba fijo, y por eso el fallo de producción no tenía prueba que lo
   * cazara: el doble devolvía SIEMPRE un `membership_end_at` perfecto, así que
   * el único camino que se ejercitaba era el bueno. Sophon contestó con un
   * cuerpo sin fecha y la aplicación guardó la caducidad a nulo sin que nada
   * fallara.
   */
  respuesta?: Record<string, unknown>;
}) {
  const registro = {
    llamadasSophon: [] as { email: string; duracion: number }[],
    concesionesCreadas: 0,
    concesionesBorradas: 0,
    auditorias: [] as string[],
    vigenteHastaEscrito: null as Date | null,
    vigenteDesdeEscrito: null as Date | null,
    proEscritoEnWebmaster: undefined as Date | null | undefined,
    mensajeEscrito: null as string | null,
    auditoriaDetalle: [] as Record<string, unknown>[],
  };

  const tx = {
    concesionPro: {
      findUnique: async () => estado.previa ?? null,
      findFirst: async () => estado.ultimaConcesion ?? null,
      delete: async () => {
        registro.concesionesBorradas += 1;
        return {};
      },
      create: async () => {
        registro.concesionesCreadas += 1;
        return { id: "concesion-1" };
      },
    },
    webmaster: {
      findUnique: async () => ({ proVigenteHasta: estado.proVigenteHasta }),
    },
  };

  const deps: DependenciasConcesion = {
    db: {
      $transaction: ((arg: unknown) =>
        typeof arg === "function"
          ? (arg as (t: typeof tx) => Promise<unknown>)(tx)
          : Promise.resolve([])) as DependenciasConcesion["db"]["$transaction"],
      concesionPro: {
        update: (a: unknown) => {
          const datos = (a as {
            data: { vigenteHasta?: Date; vigenteDesde?: Date; mensaje?: string };
          }).data;
          if (datos.vigenteHasta) registro.vigenteHastaEscrito = datos.vigenteHasta;
          if (datos.vigenteDesde) registro.vigenteDesdeEscrito = datos.vigenteDesde;
          if (datos.mensaje) registro.mensajeEscrito = datos.mensaje;
          return a;
        },
      },
      // Se registra lo que se escribe en el WEBMASTER, que es el campo del que
      // vive la chapa «Sin PRO» y el guardián de vigencia. Antes no se miraba, y
      // por ahí se coló el nulo.
      webmaster: {
        update: (a: unknown) => {
          registro.proEscritoEnWebmaster = (
            a as { data: { proVigenteHasta?: Date | null } }
          ).data.proVigenteHasta;
          return a;
        },
      },
      auditoria: {
        create: (a: unknown) => {
          const datos = (a as { data: { accion: string; detalle?: Record<string, unknown> } })
            .data;
          registro.auditorias.push(datos.accion);
          if (datos.detalle) registro.auditoriaDetalle.push(datos.detalle);
          return a;
        },
      },
    },
    sophon: () => ({
      concederMembresia: async (email, _codigo, duracionSegundos) => {
        registro.llamadasSophon.push({ email, duracion: duracionSegundos });
        return (estado.respuesta ?? {
          uid: "uid-1",
          membership_code: "vip.year",
          membership_start_at: { seconds: Math.floor(AHORA.getTime() / 1000) },
          membership_end_at: { seconds: Math.floor(enDias(365).getTime() / 1000) },
        }) as unknown as ResultadoMembresia;
      },
    }),
    /*
     * El reloj se INYECTA, y esa es la corrección que trajo esta pasada.
     *
     * Antes no se pasaba: el doble construía las vigencias relativas a `AHORA`
     * —una fecha fija— y `concederAnio` las comparaba contra el reloj real. La
     * prueba de «un solo día por delante» pasó mientras esa fecha estuvo en el
     * futuro y empezó a fallar sola al quedarse atrás, porque el PRO de un día
     * había caducado de verdad. Es decir: la única prueba que protege al
     * webmaster de que le borren meses de suscripción tenía fecha de caducidad.
     */
    ahora: () => AHORA,
  };

  return { deps, registro };
}

const peticion = (motivo: MotivoConcesion, clave = "clave-1") => ({
  agenteId: "agente-1",
  webmasterId: "wm-1",
  emailWebmaster: "webmaster@example.com",
  motivo,
  claveIdempotencia: clave,
  // `concederAnio` traduce sus rechazos, así que necesita el idioma del agente.
  // Las pruebas no miran el texto: solo a quién se llama y qué se escribe.
  idioma: "es" as const,
});

describe("conceder PRO", () => {
  it("con el PRO ACTIVO no se llama a Sophon", async () => {
    /*
     * Esta es LA prueba de todo el cambio.
     *
     * No importa qué devuelva ni con qué código: importa que
     * `setmembership` no salga. Mientras no sepamos si Sophon suma o
     * sustituye el plazo, una sola llamada de estas puede costarle al
     * webmaster los meses que le quedaban.
     */
    const { deps, registro } = montar({ proVigenteHasta: enDias(300) });
    const r = await concederAnio(peticion("RENOVACION"), deps);

    assert.equal(registro.llamadasSophon.length, 0, "se llamó a Sophon sobre un PRO vivo");
    assert.equal(registro.concesionesCreadas, 0, "se reservó una concesión que no procede");
    assert.equal(r.yaActivo, true);
  });

  it("y tampoco con un solo día por delante", async () => {
    // El umbral no es «queda poco», es «queda algo». Un PRO de un día sigue
    // siendo un PRO, y sustituirlo seguiría siendo perder un día de alguien.
    const { deps, registro } = montar({ proVigenteHasta: enDias(1) });
    await concederAnio(peticion("RENOVACION"), deps);
    assert.equal(registro.llamadasSophon.length, 0);
  });

  it("el rechazo lleva la FECHA en que se podrá, no solo un no", async () => {
    // Sin la fecha, la única respuesta que el agente puede dar al webmaster es
    // «no sé», y volverá a intentarlo mañana y pasado.
    const { deps } = montar({ proVigenteHasta: new Date("2027-05-04T09:00:00Z") });
    const r = await concederAnio(peticion("RENOVACION"), deps);
    assert.equal(r.vigenteHasta, "2027-05-04");
  });

  it("caducado SÍ se concede, y con el año explícito", async () => {
    const { deps, registro } = montar({ proVigenteHasta: enDias(-1) });
    const r = await concederAnio(peticion("RENOVACION"), deps);

    assert.equal(r.ok, true);
    assert.equal(registro.llamadasSophon.length, 1);
    // `duration: 0` da 30 días con cualquier código de membresía: si este
    // número deja de viajar, el agente regala un mes creyendo regalar un año.
    assert.equal(registro.llamadasSophon[0]?.duracion, SEGUNDOS_UN_ANIO);
  });

  it("quien nunca tuvo PRO se concede", async () => {
    const { deps, registro } = montar({ proVigenteHasta: null });
    const r = await concederAnio(peticion("ALTA"), deps);

    assert.equal(r.ok, true);
    assert.equal(r.yaActivo, undefined);
    assert.equal(registro.llamadasSophon.length, 1);
  });

  it("un ALTA sobre alguien que YA venía con PRO es éxito, no error", async () => {
    /*
     * Red de seguridad, ya no caso de negocio.
     *
     * Lo justificaba adoptar a un huérfano que traía membresía, y eso dejó de
     * poder ocurrir cuando el alta pasó a aceptar solo cuentas nuevas. Se
     * conserva porque la postura correcta no cambia: si Sophon dijera que la
     * membresía está viva, hay que dejarla en paz y dar el alta por buena.
     * Decirle al agente que ha fallado le empujaría a reintentar contra justo lo
     * que no hay que tocar.
     */
    const { deps, registro } = montar({ proVigenteHasta: enDias(120) });
    const r = await concederAnio(peticion("ALTA"), deps);

    assert.equal(r.ok, true, "el alta no puede leerse como fallo");
    assert.equal(r.yaActivo, true, "pero tiene que distinguirse de una concesión real");
    assert.equal(registro.llamadasSophon.length, 0);
  });

  it("dos toques con la MISMA clave conceden una sola vez", async () => {
    // La segunda llamada encuentra la concesión previa y devuelve su fecha sin
    // volver a llamar a Sophon.
    const { deps, registro } = montar({
      proVigenteHasta: null,
      previa: { id: "concesion-1", estado: "CONFIRMADA", vigenteHasta: enDias(365) },
    });
    const r = await concederAnio(peticion("RENOVACION"), deps);

    assert.equal(r.ok, true);
    assert.equal(registro.llamadasSophon.length, 0, "el reintento volvió a conceder");
    assert.equal(registro.concesionesCreadas, 0);
  });

  it("la idempotencia manda SOBRE la vigencia, no al revés", async () => {
    /*
     * El orden de las dos comprobaciones es lo único que hace que el reintento
     * de red funcione, y es fácil de invertir sin darse cuenta.
     *
     * Escenario: el agente renueva un PRO caducado y sale bien —el webmaster ya
     * tiene PRO vigente—, pero la respuesta se pierde y el cliente reintenta con
     * la misma clave. Con el guardián por delante, la aplicación respondería «no
     * se puede renovar, sigue activo» a una operación que acaba de prosperar, y
     * el agente no sabría si llegó a contar.
     *
     * Con este orden, la clave contesta primero: éxito, con su fecha.
     */
    const { deps, registro } = montar({
      proVigenteHasta: enDias(365),
      previa: { id: "concesion-1", estado: "CONFIRMADA", vigenteHasta: enDias(365) },
    });
    const r = await concederAnio(peticion("RENOVACION"), deps);

    assert.equal(r.ok, true);
    assert.notEqual(r.yaActivo, true, "el reintento se leyó como rechazo por vigencia");
    assert.equal(registro.llamadasSophon.length, 0);
  });

  it("un intento FALLIDO no bloquea la clave para siempre", async () => {
    // No entregó nada, así que reintentar con el mismo botón tiene que
    // funcionar. Si no, el agente se queda sin forma de recuperarse de un fallo
    // de red salvo esperando a que el PRO se apague del todo.
    const { deps, registro } = montar({
      proVigenteHasta: null,
      previa: { id: "concesion-0", estado: "FALLIDA", vigenteHasta: null },
    });
    const r = await concederAnio(peticion("ALTA"), deps);

    assert.equal(r.ok, true);
    assert.equal(registro.concesionesBorradas, 1);
    assert.equal(registro.llamadasSophon.length, 1);
  });

  it("se persiste el INICIO además del fin, que es el detector que faltaba", async () => {
    /*
     * `membership_start_at` es la evidencia de si Sophon suma o sustituye: si al
     * conceder sobre algo vigente el inicio se mueve a hoy, sustituye.
     *
     * La aplicación leía solo `membership_end_at` y sobrescribía la caducidad sin
     * compararla con la anterior, así que adoptaba la respuesta como verdad sin
     * enterarse de si acababa de perder tiempo.
     */
    const { deps, registro } = montar({ proVigenteHasta: null });
    await concederAnio(peticion("ALTA"), deps);

    assert.ok(registro.vigenteDesdeEscrito, "no se guardó membership_start_at");
    assert.ok(registro.vigenteHastaEscrito, "no se guardó membership_end_at");
  });

  it("cada concesión deja UN asiento de auditoría, no dos", async () => {
    // La ruta de renovación escribía `pro.renovado` además del que ya escribe
    // este módulo, así que cada renovación dejaba dos asientos idénticos en la
    // única tabla donde duplicar estorba de verdad.
    const { deps, registro } = montar({ proVigenteHasta: enDias(-5) });
    await concederAnio(peticion("RENOVACION"), deps);

    assert.deepEqual(registro.auditorias, ["pro.renovado"]);
  });

  it("si Sophon acepta y NO manda fecha, la caducidad se deduce del plazo pedido", async () => {
    /*
     * EL FALLO DE PRODUCCIÓN, en una prueba.
     *
     * `setmembership` devolvió `code: 0` con un cuerpo del que no se podía leer
     * `membership_end_at`. La aplicación guardó la concesión como CONFIRMADA con
     * `vigenteHasta = null` y le puso `proVigenteHasta = null` al webmaster. Dos
     * daños, y el segundo peor que el primero:
     *
     *  1. La Malla dijo «Sin PRO» de un webmaster que tenía su año y sus 6 TB.
     *  2. El guardián de vigencia lee ese mismo campo, así que la pantalla de
     *     renovaciones siguió ofreciendo el botón y cada toque volvió a llamar a
     *     `setmembership` sobre una membresía viva. Seis veces en un minuto.
     *
     * Un nulo aquí no es «no lo sabemos»: es «vuelve a concederlo».
     */
    const { deps, registro } = montar({ proVigenteHasta: null, respuesta: {} });
    const r = await concederAnio(peticion("ALTA"), deps);

    assert.equal(r.ok, true, "Sophon aceptó: esto no es un fallo");
    assert.equal(r.vigenteHasta, isoDe(enDias(365)), "la fecha no se dedujo del año pedido");
    assert.deepEqual(registro.vigenteHastaEscrito, enDias(365));
    assert.deepEqual(
      registro.proEscritoEnWebmaster,
      enDias(365),
      "el webmaster se quedó sin caducidad, que es lo que reabre la puerta a repetir",
    );
  });

  it("y la deducción queda ESCRITA, no disimulada", async () => {
    // Una fecha deducida y una que dio Sophon no valen lo mismo, y dentro de un
    // año habrá que saber cuál es cuál. La respuesta cruda va en `mensaje`
    // porque no hay endpoint que permita consultar una membresía después.
    const { deps, registro } = montar({
      proVigenteHasta: null,
      respuesta: { uid: "uid-9", membership_code: "vip.year" },
    });
    await concederAnio(peticion("ALTA"), deps);

    assert.match(registro.mensajeEscrito ?? "", /^SIN_FECHA_EN_RESPUESTA /);
    assert.match(registro.mensajeEscrito ?? "", /uid-9/, "no se guardó la respuesta de Sophon");
    assert.equal(registro.auditoriaDetalle[0]?.["fechaDeducida"], true);
  });

  it("y cuando Sophon SÍ manda la fecha, no se deduce nada", async () => {
    // La red de seguridad no puede tapar el camino bueno: si se dedujera
    // siempre, dejaríamos de enterarnos de lo que Sophon concede de verdad.
    const { deps, registro } = montar({ proVigenteHasta: null });
    await concederAnio(peticion("ALTA"), deps);

    assert.equal(registro.mensajeEscrito, null);
    assert.equal(registro.auditoriaDetalle[0]?.["fechaDeducida"], false);
  });

  it("la fecha se lee venga como venga: ISO, camelCase o segundos en texto", async () => {
    /*
     * El tipo dice `membership_end_at` con `{seconds: number}`, pero el tipo
     * describe lo que esperamos. Esta API mezcla estilos —el cuerpo va en
     * `snake_case` y las lecturas vuelven en `camelCase`— y devuelve sus números
     * como texto (`expiresIn: "604800"`). Cada una de estas formas es una
     * caducidad que antes se habría perdido.
     */
    const formas: Record<string, unknown>[] = [
      { membership_end_at: enDias(365).toISOString() },
      { membershipEndAt: { seconds: Math.floor(enDias(365).getTime() / 1000) } },
      { membership_end_at: { seconds: String(Math.floor(enDias(365).getTime() / 1000)) } },
      { end_at: Math.floor(enDias(365).getTime() / 1000) },
      { membership_end_at: enDias(365).getTime() },
    ];

    for (const respuesta of formas) {
      const { deps, registro } = montar({ proVigenteHasta: null, respuesta });
      await concederAnio(peticion("ALTA"), deps);

      assert.deepEqual(
        registro.vigenteHastaEscrito,
        enDias(365),
        `no se leyó la fecha de ${JSON.stringify(respuesta)}`,
      );
      assert.equal(registro.mensajeEscrito, null, `se dedujo pudiendo leerla`);
    }
  });

  it("una fecha ilegible se deduce, nunca se guarda inválida", async () => {
    // Un `Invalid Date` no falla aquí: falla en Prisma, más tarde y más lejos.
    const { deps, registro } = montar({
      proVigenteHasta: null,
      respuesta: { membership_end_at: "el martes que viene" },
    });
    const r = await concederAnio(peticion("ALTA"), deps);

    assert.equal(r.ok, true);
    assert.deepEqual(registro.vigenteHastaEscrito, enDias(365));
  });

  it("una concesión viva BLOQUEA aunque la anotación del webmaster esté vacía", async () => {
    /*
     * ESTE ES EL CASO QUE COSTÓ SEIS CONCESIONES.
     *
     * `Webmaster.proVigenteHasta` es NUESTRA anotación, y se quedó a nulo con la
     * membresía viva: Sophon aceptó y devolvió un cuerpo sin fecha. El guardián
     * leyó «no tiene nada» y dejó conceder otra vez. Y otra. Seis en un minuto.
     *
     * El PRO no acumula: cada una de esas llamadas TIRÓ lo que quedaba de la
     * anterior. Por eso el guardián ya no se apoya en un solo dato — mira también
     * lo que de verdad se pidió.
     */
    const { deps, registro } = montar({
      proVigenteHasta: null, // la anotación, vacía
      ultimaConcesion: {
        creadoEn: enDias(-10),
        duracionSegundos: SEGUNDOS_UN_ANIO,
        vigenteHasta: null, // la concesión, TAMBIÉN sin fecha
      },
    });
    const r = await concederAnio(peticion("RENOVACION"), deps);

    assert.equal(registro.llamadasSophon.length, 0, "se volvió a conceder sobre un PRO vivo");
    assert.equal(r.yaActivo, true);
    assert.equal(registro.concesionesCreadas, 0);
  });

  it("y la fecha del rechazo se deduce del plazo cuando la concesión no la trae", async () => {
    // Sin esto el rechazo diría «no se puede, vuelve el …» con la fecha en
    // blanco, que es peor que no decir nada: parece un fallo.
    const { deps } = montar({
      proVigenteHasta: null,
      ultimaConcesion: {
        creadoEn: enDias(-10),
        duracionSegundos: SEGUNDOS_UN_ANIO,
        vigenteHasta: null,
      },
    });
    const r = await concederAnio(peticion("RENOVACION"), deps);
    assert.equal(r.vigenteHasta, isoDe(enDias(355)), "no dedujo la caducidad de la concesión");
  });

  it("una concesión ya CADUCADA no bloquea nada", async () => {
    // El guardián nuevo no puede convertirse en un candado permanente: el PRO se
    // vuelve a conceder cuando caduca, y esa es la mitad de la regla.
    const { deps, registro } = montar({
      proVigenteHasta: null,
      ultimaConcesion: {
        creadoEn: enDias(-400),
        duracionSegundos: SEGUNDOS_UN_ANIO,
        vigenteHasta: enDias(-35),
      },
    });
    const r = await concederAnio(peticion("RENOVACION"), deps);

    assert.equal(r.ok, true);
    assert.equal(registro.llamadasSophon.length, 1, "un PRO caducado tiene que poder renovarse");
  });

  it("sin ninguna concesión previa se concede, que es el alta normal", async () => {
    const { deps, registro } = montar({ proVigenteHasta: null });
    const r = await concederAnio(peticion("ALTA"), deps);
    assert.equal(r.ok, true);
    assert.equal(registro.llamadasSophon.length, 1);
  });

  it("el alta y la renovación se auditan como hechos distintos", async () => {
    const { deps, registro } = montar({ proVigenteHasta: null });
    await concederAnio(peticion("ALTA"), deps);
    assert.deepEqual(registro.auditorias, ["pro.concedido_en_alta"]);
  });
});

describe("la caducidad efectiva, que leen las tres pantallas", () => {
  const fecha = (iso: string) => new Date(`${iso}T00:00:00Z`);
  const AYER = new Date(AHORA.getTime() - DIA);

  it("sin nada, no hay PRO", () => {
    assert.equal(finEfectivoDelPro(null, null), null);
    assert.equal(finEfectivoDelPro(null, undefined), null);
  });

  it("con la anotación sola, manda la anotación", () => {
    const d = fecha("2027-01-01");
    assert.deepEqual(finEfectivoDelPro(d, null), d);
  });

  it("con la ANOTACIÓN VACÍA y una concesión viva, manda la concesión", () => {
    /*
     * El caso de producción, y el motivo de que esta función exista: Sophon
     * aceptó, devolvió un cuerpo sin fecha, `proVigenteHasta` se guardó vacío y
     * la Malla dijo «Sin PRO» de una cuenta con su año y sus 6 TB.
     */
    const fin = finEfectivoDelPro(null, {
      creadoEn: AYER,
      duracionSegundos: SEGUNDOS_UN_ANIO,
      vigenteHasta: null,
    });
    assert.ok(fin, "una concesión de ayer por un año no puede leerse como «sin PRO»");
    assert.equal(proActivo(fin, AHORA), true);
  });

  it("cuando las dos hablan, gana la que va MÁS LEJOS", () => {
    // Nunca la más cercana: acortar por nuestra cuenta el PRO de alguien es
    // exactamente el daño que toda esta regla existe para no hacer.
    const lejos = fecha("2028-01-01");
    const cerca = fecha("2027-01-01");
    assert.deepEqual(
      finEfectivoDelPro(cerca, { creadoEn: AYER, duracionSegundos: 0, vigenteHasta: lejos }),
      lejos,
    );
    assert.deepEqual(
      finEfectivoDelPro(lejos, { creadoEn: AYER, duracionSegundos: 0, vigenteHasta: cerca }),
      lejos,
    );
  });

  it("una concesión con fecha propia no se recalcula", () => {
    // `creadoEn + duracionSegundos` es el respaldo, no la primera opción: si
    // Sophon dijo hasta cuándo, esa es la verdad.
    const dicha = fecha("2027-03-15");
    assert.deepEqual(
      finEfectivoDelPro(null, {
        creadoEn: AYER,
        duracionSegundos: SEGUNDOS_UN_ANIO,
        vigenteHasta: dicha,
      }),
      dicha,
    );
  });

  it("una concesión caducada no resucita nada", () => {
    const fin = finEfectivoDelPro(null, {
      creadoEn: new Date(AHORA.getTime() - 400 * DIA),
      duracionSegundos: SEGUNDOS_UN_ANIO,
      vigenteHasta: null,
    });
    assert.equal(renovablePro(fin, AHORA), true, "un PRO de hace 400 días tiene que ser renovable");
  });
});
