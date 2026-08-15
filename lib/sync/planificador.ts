/**
 * Los barridos, disparados desde dentro del proceso.
 *
 * Antes los disparaba un planificador externo contra `/api/cron` con un secreto
 * compartido. Eso costaba dos cosas: una variable de entorno más y, sobre todo,
 * **una clase entera de fallo silencioso**. Si las líneas de cron no llegaban a
 * ponerse —o se ponían mal, o se perdían al recrear el servicio—, la aplicación
 * arrancaba perfecta y no devengaba nada. El panel tenía que llevar un aviso
 * dedicado precisamente para que ese fallo no fuera invisible.
 *
 * Todo lo difícil ya estaba resuelto: cada barrido toma un **cerrojo**
 * (`conCerrojo`) y se salta la vuelta si otro lo tiene. Eso es lo que hace
 * seguro esto con varias réplicas: todas ponen su reloj, y la primera que llega
 * hace el trabajo mientras las demás se retiran sin esperar.
 *
 * ── EL RELOJ ──
 *
 * Un tic por minuto y una tabla de reglas en UTC, en vez de un `setInterval` por
 * tarea. Dos motivos:
 *
 *  · **El cierre de Sophon es una HORA CONCRETA**, no un intervalo: cierran su
 *    día a las 00:00 UTC+8 —16:00 UTC— y publican entonces los contadores del
 *    día que acaba. Con intervalos, esa cita se cumple por casualidad.
 *  · Los intervalos DERIVAN: un `setInterval` de 30 minutos que arranca a las
 *    14:07 dispara a y 37, y 07… Con el tic por minuto, «cada media hora»
 *    significa en punto y a y media, igual que decía la línea de cron.
 *
 * La ruta `/api/cron` sigue existiendo para forzar una vuelta a mano.
 */

import { barrerAvisos } from "./avisos.ts";
import { barrerRegistros } from "./registros.ts";
import { barrerTesoreria } from "./tesoreria.ts";
import { barrerWebmasters } from "./webmasters.ts";
import { clienteSophon } from "../sophon/instancia.ts";

/**
 * Las mismas citas que documentaban las líneas de cron, en UTC.
 *
 * La de las **16:05 es la que no puede faltar**: es la que recoge el cierre
 * contable del día. Las demás mantienen la pantalla fresca durante la jornada.
 */
const CITAS: readonly { cuando: (h: number, m: number) => boolean; tarea: string }[] = [
  { cuando: (_h, m) => m % 30 === 0, tarea: "registros" },
  { cuando: (_h, m) => m % 30 === 0, tarea: "webmasters" },
  { cuando: (_h, m) => m === 0, tarea: "tesoreria" },
  { cuando: (h, m) => h === 16 && m === 5, tarea: "cierre" },
  { cuando: (h, m) => h === 7 && m === 30, tarea: "avisos" },
];

let reloj: NodeJS.Timeout | null = null;

async function correr(tarea: string): Promise<void> {
  const cliente = clienteSophon();
  const inicio = Date.now();
  try {
    /*
     * Un barrido devuelve `null` cuando el cerrojo lo tiene otro, y eso HAY QUE
     * DECIRLO. Callarlo es lo que habría dejado invisible el cerrojo que no se
     * soltaba: los barridos se saltaban en silencio y el devengado se quedaba
     * clavado sin un solo error en el log.
     */
    let omitidos = 0;

    if (tarea === "registros" || tarea === "cierre") {
      const r = await barrerRegistros(cliente);
      if (r === null) omitidos++;
      // Un barrido que lee decenas de miles de filas y emite cero asientos no
      // puede salir en los logs con el mismo aspecto que uno bueno: sin tarifa
      // en vigor nadie está devengando nada.
      if (r?.sinTarifa) {
        console.error(
          "[planificador] SIN TARIFA EN VIGOR: se han guardado las filas y no se ha devengado nada. Ponla en /admin/tarifas.",
        );
      }
    }
    if (tarea === "webmasters" || tarea === "cierre") {
      if ((await barrerWebmasters(cliente)) === null) omitidos++;
    }
    if (tarea === "tesoreria" || tarea === "cierre") {
      if ((await barrerTesoreria(cliente)) === null) omitidos++;
    }
    /*
     * Los avisos van los ÚLTIMOS del cierre y sin cliente de Sophon: miran lo
     * que los otros tres acaban de escribir, y solo leen nuestra base. Si Sophon
     * está caído, este es el único barrido que sigue funcionando, y es
     * justamente el que le habla al agente.
     */
    if (tarea === "avisos" || tarea === "cierre") {
      // Aquí `null` significa además «hoy ya se avisó», que es el caso normal:
      // el reloj tica cada minuto y este barrido es diario.
      await barrerAvisos();
    }

    const cola = omitidos > 0 ? ` · ${omitidos} omitido(s): el cerrojo lo tiene otro` : "";
    console.info(`[planificador] ${tarea} en ${Date.now() - inicio} ms${cola}`);
  } catch (e) {
    // Un barrido que falla no puede llevarse el reloj por delante: el siguiente
    // tic tiene que seguir llegando.
    console.error(`[planificador] ${tarea} ha fallado`, e);
  }
}

function tic(): void {
  const ahora = new Date();
  const h = ahora.getUTCHours();
  const m = ahora.getUTCMinutes();
  // `cierre` incluye los otros tres, así que cuando toca no se lanzan aparte:
  // no romperían nada —el cerrojo los frena— pero llenarían el log de vueltas
  // omitidas justo en el minuto que interesa leer.
  const citas = CITAS.filter((c) => c.cuando(h, m));
  const tareas = citas.some((c) => c.tarea === "cierre")
    ? ["cierre"]
    : [...new Set(citas.map((c) => c.tarea))];
  for (const t of tareas) void correr(t);
}

/**
 * Pone el reloj en marcha.
 *
 * Solo en producción: en desarrollo, un barrido automático hablaría con Sophon
 * de verdad y escribiría en el ledger sin que nadie lo haya pedido. Ahí está
 * `/api/cron` para dispararlo a mano.
 *
 * Sin barrido inmediato al arrancar, y es deliberado: un despliegue con varias
 * réplicas los pondría a competir por el cerrojo en el mismo segundo, y un
 * reinicio en bucle convertiría cada reinicio en una llamada a Sophon. El primer
 * tic llega como mucho un minuto después.
 */
export function arrancarPlanificador(): void {
  if (reloj) return;
  if (process.env.NODE_ENV !== "production") {
    console.info("[planificador] parado: solo corre en producción. Usa /api/cron para forzarlo.");
    return;
  }

  // Se alinea con el minuto del reloj para que «en punto» sea en punto.
  const alSiguienteMinuto = 60_000 - (Date.now() % 60_000);
  setTimeout(() => {
    tic();
    reloj = setInterval(tic, 60_000);
    // `unref`: el reloj no debe impedir que el proceso termine cuando se le
    // pide que pare.
    reloj.unref();
  }, alSiguienteMinuto).unref();

  console.info("[planificador] en marcha: registros y webmasters cada 30 min, tesorería cada hora, cierre a las 16:05 UTC, avisos a las 07:30 UTC");
}
