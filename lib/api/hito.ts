/**
 * EL PROGRESO DEL BONO DEL MES, en un solo sitio.
 *
 * Vivía dentro de `app/api/agente/resumen/route.ts`, o sea que solo existía
 * para la portada, y eso se convirtió en un defecto de producto en cuanto la
 * cartera empezó a enseñar «Bonos 0,00 $» sin nada al lado que dijera por qué:
 * la pantalla del dinero contaba lo COBRADO y no lo que está en juego este mes,
 * así que el agente que entra a cobrar no veía ni un objetivo ni un avance.
 *
 * Se saca aquí por el mismo motivo por el que `Escalera` vive en
 * `components/`: lo usan dos pantallas, y duplicado se habría quedado viejo en
 * una de las dos. La regla del bono —mes natural, contador a cero el día 1, no
 * acumulable— se calcula una vez y las dos rutas cuentan lo mismo.
 *
 * En `lib/api/` y no en `lib/devengo/`: consulta la base de datos y formatea
 * importes con el idioma del agente, o sea que es capa de API. `lib/devengo/`
 * es aritmética pura y se prueba sin Postgres; meter esto ahí se llevaría por
 * delante esa propiedad.
 */

import { escalonAlcanzado, siguienteEscalon } from "../devengo/bonos.ts";
import {
  diaDelMes,
  diasDelMes,
  diasQueQuedanDelMes,
  mesAnterior,
  mesContable,
} from "../fechas.ts";
import type { Idioma } from "../idiomas.ts";
import {
  escaleraVigente,
  hoyContable,
  registrosDelMes,
  registrosDelMesPorWebmaster,
} from "../sync/registros.ts";

import { dinero, isoFecha } from "./agente.ts";

/**
 * Dónde va el agente en la escalera del bono este mes.
 *
 * Los registros son los del **mes natural**, no los de la ventana móvil de 30
 * días que usa la portada para el Testigo: el bono se resetea el día 1, así que
 * mezclar las dos ventanas enseñaría una barra que no cuadra con lo que se cobra.
 *
 * Devuelve `null` si no hay escalera configurada, y entonces la pantalla no
 * pinta nada: una barra de progreso hacia un objetivo que no existe es peor que
 * el hueco que deja.
 */
export async function progresoDelHito(agenteId: string, idioma: Idioma) {
  const escalones = await escaleraVigente();
  if (escalones.length === 0) return null;

  const hoy = hoyContable();
  const mes = mesContable();
  const anterior = mesAnterior(mes);

  const [actual, registrosMesAnterior] = await Promise.all([
    registrosDelMesPorWebmaster(agenteId, mes),
    registrosDelMes(agenteId, anterior),
  ]);
  const registros = actual.total;

  const alcanzado = escalonAlcanzado(registros, escalones);
  const siguiente = siguienteEscalon(registros, escalones);

  /*
   * El ritmo y la proyección.
   *
   * Son la respuesta a «que siempre se vea progreso sin mover las metas». La
   * barra del hito es honesta y con los umbrales de hoy va a marcar poco, pero
   * el ritmo se mueve TODOS los días y la proyección con él, así que hay una
   * cifra que responde al trabajo de esta mañana aunque el objetivo esté lejos.
   *
   * Y no se falsea la escala de la barra para conseguirlo: distorsionar un eje
   * de valor para que un 7 % parezca más es mentir sobre la distancia que
   * queda. Lo que cambia es qué se mide, no cómo se dibuja.
   *
   * El decimal del ritmo depende del tamaño del ritmo, y no es una floritura:
   * a tres registros al día un entero se queda clavado en «3» durante una
   * semana y no cuenta nada, mientras que a cuatrocientos el decimal es ruido
   * —«461,5 registros al día» finge una precisión que la cifra no tiene—. Bajo
   * diez, un decimal; a partir de ahí, entero.
   */
  const transcurridos = diaDelMes(hoy);
  const delMes = diasDelMes(mes);
  const restantes = diasQueQuedanDelMes(hoy);
  const porDia = registros / transcurridos;
  const ritmo = porDia < 10 ? Math.round(porDia * 10) / 10 : Math.round(porDia);
  const proyeccion = Math.round(porDia * delMes);

  /*
   * ¿Llega el hito a este ritmo, y cuándo?
   *
   * `null` cuando no llega dentro del mes. Prometer una fecha de febrero para un
   * hito que se resetea el 31 de enero sería enseñar una meta que no existe.
   */
  const faltan = siguiente ? siguiente.usuarios - registros : 0;
  const diasParaElHito = siguiente && porDia > 0 ? Math.ceil(faltan / porDia) : null;
  const llegaEsteMes = diasParaElHito !== null && diasParaElHito <= restantes;

  return {
    registros,
    // Lo ya ganado este mes es la recompensa del escalón más alto alcanzado, no
    // la suma: el bono no es acumulable.
    ganado: dinero(alcanzado?.recompensaMicros ?? 0n, idioma),
    siguiente: siguiente
      ? {
          usuarios: siguiente.usuarios,
          faltan,
          premio: dinero(siguiente.recompensaMicros, idioma),
          /*
           * Lo que se gana DE MÁS, que no es lo que paga el escalón siguiente.
           *
           * Como el mes paga la recompensa del escalón más alto y no la suma,
           * subir de 20.000 a 30.000 no aporta los 150 del escalón alto: aporta
           * los 50 de diferencia. La banda enseñaba el premio entero junto a lo
           * ya ganado, así que el agente sumaba dos veces el mismo dinero.
           */
          incremento: dinero(siguiente.recompensaMicros - (alcanzado?.recompensaMicros ?? 0n), idioma),
        }
      : null,
    escalones: escalones.map((e) => ({
      usuarios: e.usuarios,
      premio: dinero(e.recompensaMicros, idioma),
      alcanzado: registros >= e.usuarios,
    })),
    ritmo,
    proyeccion,
    diasRestantes: restantes,
    /** Día del mes en que se alcanzaría el siguiente escalón, o `null`. */
    llegaEl: llegaEsteMes ? isoFecha(sumarDias(hoy, diasParaElHito)) : null,
    /**
     * Registros del mes cerrado anterior, para comparar.
     *
     * `null` el primer mes del agente: sin nada con que comparar, «has bajado
     * un 100 %» sería falso y desmoralizante a la vez.
     */
    mesAnterior: registrosMesAnterior > 0 ? registrosMesAnterior : null,
    /**
     * Quién está llevando el hito. Tres como mucho: es una lista de llamadas,
     * no un informe, y una lista de veinte correos en un móvil no se lee.
     */
    porWebmaster: actual.porWebmaster.slice(0, 3),
  };
}

/** `AAAA-MM-DD` más N días, en el mismo calendario UTC que usa todo el ledger. */
function sumarDias(fecha: string, dias: number): Date {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) + dias * 86_400_000);
}
