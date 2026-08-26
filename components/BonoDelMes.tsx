"use client";

/**
 * EL BONO DEL MES: cuánto vale el premio, a cuánto estás y a qué ritmo vas.
 *
 * Vivía dentro de `app/(miniapp)/page.tsx`, o sea que el avance del bono solo
 * existía en la portada. La cartera —la pantalla a la que se entra a COBRAR—
 * enseñaba «Bonos 0,00 $» y «No hay bonos registrados» y ni un objetivo ni una
 * medida al lado: el agente que abría el retiro no tenía forma de ver el juego
 * del mes, que es justo lo que se le había dicho que vería ahí.
 *
 * Se saca a `components/` por el mismo motivo que `Escalera`: la usan dos
 * pantallas, y escrita dos veces se habría quedado vieja en una de las dos.
 *
 * ── LO QUE ESTA PIEZA NO HACE ──
 *
 * Ni medallas, ni insignias, ni confeti, ni rachas como trofeo. La regla de voz
 * de `lib/i18n.ts` es explícita: el agente es un profesional que cobra, no
 * alguien a quien haya que animar. Lo que engancha aquí es ver el juego entero
 * y verse dentro de él, con dinero de verdad escrito en cada nivel.
 *
 * Y sin amarillo: el amarillo de este sistema es la ACCIÓN, y un progreso no se
 * pulsa. El estado va por CONTRASTE y por PESO.
 *
 * ── POR QUÉ SIGUE DICIENDO ALGO CON EL MES A CERO ──
 *
 * Con los umbrales sembrados —10.000 registros para el primer nivel— la barra
 * va a marcar poco durante mucho tiempo, y eso NO se arregla tocando la barra:
 * distorsionar la escala de un eje de valor para que un 7 % parezca más es
 * mentir sobre la distancia que queda, y a la tercera vez que el agente hace la
 * división a mano deja de creerse todo lo demás.
 *
 * Lo que se hace es acompañarla de medidas cuyo punto de referencia es el
 * propio agente y no la meta lejana: el ritmo, la proyección de cierre, los
 * días que quedan de mes y la comparación con el mes pasado. Todas se mueven
 * con el trabajo de esta mañana aunque el objetivo esté lejos. La barra sigue
 * diciendo la verdad; lo que cambia es que ya no está sola diciéndola.
 */

import { CifraProtagonista } from "./Animacion";
import { Icono } from "./Icono";
import { MedidorObjetivos } from "./MedidorObjetivos";
import { useCadenas } from "./TelegramProvider";

/** Un nivel de la escalera, tal y como lo sirve `lib/api/hito.ts`. */
export interface EscalonDelBono {
  usuarios: number;
  premio: { micros: string; texto: string };
  alcanzado: boolean;
}

/**
 * El progreso del mes, tal y como lo sirven `/api/agente/resumen` y
 * `/api/retiro`. Las dos rutas lo calculan con la misma función, así que las
 * dos pantallas cuentan los mismos registros del mismo mes.
 */
export interface Hito {
  registros: number;
  ganado: { micros: string; texto: string };
  siguiente: {
    usuarios: number;
    faltan: number;
    premio: { micros: string; texto: string };
    /**
     * Lo que se gana DE MÁS al llegar al siguiente escalón.
     *
     * No es lo mismo que `premio`: el bono no es acumulable, así que quien ya
     * ha alcanzado un escalón solo cobra la diferencia. Es la cifra que se
     * anuncia cuando hay algo ganado, para que no se cuente dos veces.
     */
    incremento: { micros: string; texto: string };
  } | null;
  escalones: EscalonDelBono[];
  /** Registros al día en el mes en curso, con un decimal. */
  ritmo: number;
  /** Registros a los que se cerraría el mes a ese ritmo. */
  proyeccion: number;
  diasRestantes: number;
  /** `AAAA-MM-DD` en que se alcanzaría el siguiente escalón, o `null` si no da tiempo. */
  llegaEl: string | null;
  /** Registros del mes cerrado anterior, o `null` si es el primer mes. */
  mesAnterior: number | null;
  porWebmaster: { webmasterId: string; email: string; registros: number }[];
}

export function BonoDelMes({
  hito,
  /**
   * La malla de marca por detrás de la tarjeta.
   *
   * Se apaga cuando la pantalla ya la gasta en otro objeto. Ver la nota junto
   * a la tarjeta.
   */
  malla = true,
}: {
  hito: Hito;
  malla?: boolean;
}) {
  const t = useCadenas();

  const variacion =
    hito.mesAnterior && hito.mesAnterior > 0
      ? Math.round(((hito.registros - hito.mesAnterior) / hito.mesAnterior) * 100)
      : null;

  /*
   * Qué cifra preside y qué dice la línea de debajo.
   *
   * Tres estados, y en los tres el protagonista es dinero:
   *
   *  · sin ningún escalón alcanzado → preside lo que se llevaría, y la línea de
   *    apoyo dice a cuántos registros está.
   *  · con escalón alcanzado y otro por delante → preside lo ya ganado, con la
   *    marca de que es suyo, y el apoyo dice lo que se gana DE MÁS. No el premio
   *    entero del escalón siguiente: como el bono no es acumulable, enseñarlo
   *    hacía que el agente sumara dos veces el dinero que ya tiene.
   *  · sin escalón siguiente → preside lo ganado y el apoyo dice que no hay más
   *    nivel este mes.
   */
  const yaHaGanado = hito.ganado.micros !== "0";
  const preside = yaHaGanado || !hito.siguiente ? hito.ganado : hito.siguiente.premio;
  const apoyo = !hito.siguiente
    ? t.bonoMaximoAlcanzado
    : yaHaGanado
      ? t.bonoMasSiLlegas(hito.siguiente.incremento.texto, hito.siguiente.usuarios)
      : t.bonoExtraSi(hito.siguiente.usuarios);

  return (
    <>
      {/*
        LA TARJETA DEL BONO: el objeto con color de la pantalla que la coloca.

        Es la pieza que responde «cuánto vale el premio y a cuánto estoy», y
        antes eran seis renglones sueltos sobre el papel de la banda, del mismo
        peso que la nota de las revisiones que hay dos estratos más abajo. Con
        relieve se lee como UNA respuesta: la cifra, su estado, la medida y lo
        que la medida significa, todo dentro del mismo canto.

        `campo-malla` mete la malla de marca por detrás —amarillo muy diluido,
        arriba a la izquierda—. Es LA respuesta a «hazlo más vibrante» que el
        sistema autoriza: el color se extiende en los motivos, no en los bloques.
        Y va en un solo sitio de cada pantalla, porque un motivo repetido cinco
        veces deja de ser un motivo y pasa a ser un fondo.

        Nada de `motivo-arcos` encima: la placa ya trae su arco a 300 px de aquí,
        y dos veces la misma geometría en la primera pantalla de scroll es
        firmar dos veces el mismo papel.
      */}
      {/*
        La malla la decide QUIEN COLOCA la pieza, y por eso es una prop.

        El motivo de marca vale como firma mientras aparezca una vez por
        pantalla: repetido deja de ser motivo y pasa a ser fondo. En la portada
        esta tarjeta es la única que lo lleva, pero en la cartera compite con la
        tarjeta de la solicitud viva, que ya se lo queda cuando hay un retiro en
        curso. La pieza no puede saberlo desde dentro, así que no lo decide.
      */}
      <div className={`tarjeta ${malla ? "campo-malla" : ""}`}>
        <p className="text-rotulo text-texto-apoyo">{t.bonoDelMes}</p>

        {/* El premio, del tamaño que le corresponde. El estado va al lado y no
            debajo: «ya es tuyo» es un predicado de esa cifra, no otro dato. */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <CifraProtagonista micros={BigInt(preside.micros)} />
          {yaHaGanado && (
            /*
              Píldora NEUTRA, y las dos alternativas se descartaron por medida:

               · `pildora-marca` es campo amarillo macizo. Aunque la forma la
                 separe de la chapa —para eso se rehízo el sistema de formas—,
                 esto NO se pulsa, y la regla de la casa es que el amarillo es la
                 acción. Con la chapa del menú abajo serían dos amarillos en la
                 misma pantalla diciendo cosas distintas: el defecto histórico.
               · `pildora-exito` empareja `--success` sobre `--success-tint`, y
                 eso mide 4,29:1 en un rótulo de 13 px. Por debajo de 4,5:1, así
                 que no entra.

              En neutro da 5,89:1 en claro y 6,21:1 en oscuro, y de paso la
              portada se queda en blanco, grises y amarillo sin un cuarto tono.
            */
            <span className="pildora">
              <Icono nombre="activo" tam={14} />
              {t.bonoYaEsTuyo}
            </span>
          )}
        </div>

        <p className="mt-2 text-apoyo text-texto-apoyo tabular-nums">{apoyo}</p>

        {/*
          EL MEDIDOR DE OBJETIVOS, dentro de la tarjeta y en un solo objeto.

          Aquí había un raíl escalado al escalón siguiente y, colgando de la
          banda, una rejilla de cuatro tarjetas de filete con los umbrales. Dos
          piezas para una pregunta: la del progreso no enseñaba los objetivos y
          la de los objetivos no enseñaba el progreso, así que emparejarlas era
          trabajo del agente.

          Ahora es uno: un segmento por nivel, cada uno con su umbral y su
          premio debajo, y el relleno de cada segmento midiendo el avance dentro
          de SU tramo. El porqué de que un eje ordinal no distorsione nada está
          escrito en `components/MedidorObjetivos.tsx`.

          Y entra en la tarjeta, que es donde tenía que estar desde el principio:
          la tarjeta responde «dónde estoy y cuánto vale», y los objetivos son la
          segunda mitad de esa frase, no otra pregunta.
        */}
        <div className="mt-4">
          <MedidorObjetivos registros={hito.registros} escalones={hito.escalones} />
        </div>

        {/* La comparación con el mes cerrado anterior, que el medidor no puede
            llevar dentro: no mide niveles, mide contra otro mes. Es además la
            única cifra de la banda que puede ser negativa, y se dice igual —un
            mes flojo que la aplicación esconde es un mes flojo que el agente
            descubre al no cobrar—. */}
        {variacion !== null && (
          <p className="mt-1 text-apoyo text-texto-apoyo tabular-nums">
            {t.frenteAlMesPasado(variacion)}
          </p>
        )}
      </div>

      {/* El ritmo y la recta final.

          Va detrás de la escalera y no delante: primero cuál es el juego,
          después a qué velocidad vas. Al revés se lee como una cifra suelta.

          SIN RITMO NO HAY PROYECCIÓN. Con el mes a cero —el día 1, o un agente
          que todavía no ha registrado a nadie— la línea decía «Media de 0
          registros al día. Quedan 6 días de mes. Proyección de cierre de mes: 0
          registros»: la misma cifra tres veces, y la tercera vestida de
          pronóstico. Proyectar cero no es una previsión, es aritmética vacía. */}
      <p className="mt-4 text-apoyo text-texto-apoyo">
        {t.ritmoYRecta(hito.ritmo, hito.diasRestantes)}{" "}
        {hito.siguiente && hito.ritmo > 0
          ? hito.llegaEl
            ? t.loAlcanzarasEl(Number(hito.llegaEl.slice(8, 10)))
            : t.cerrarasElMesEn(hito.proyeccion)
          : null}
      </p>
    </>
  );
}
