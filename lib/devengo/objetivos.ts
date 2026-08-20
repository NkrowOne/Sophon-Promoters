/**
 * El reparto de la escalera del bono en TRAMOS, para el medidor de objetivos.
 *
 * Vive aparte del componente por lo mismo que `componerSaldos` vive aparte de
 * `saldos`: es la única aritmética de la pieza, y es justo donde un error no se
 * vería. Una barra ligeramente mal llena sigue pareciendo una barra bien llena,
 * así que si esto no se prueba no se comprueba nunca.
 *
 * En `.ts` y no dentro del `.tsx`: el corredor de pruebas de este proyecto es
 * Node pelado con `--experimental-strip-types`, que no sabe leer JSX.
 *
 * ── POR QUÉ TRAMOS Y NO UN PORCENTAJE ──
 *
 * El medidor pinta un segmento por nivel, todos del mismo ancho, y el relleno de
 * cada uno mide el avance DENTRO de su tramo: el primero va de 0 al primer
 * umbral, el segundo del primero al segundo, y así.
 *
 * El ancho igual no distorsiona ninguna escala porque el eje no es «registros»
 * sino «niveles», que es ordinal, y cada segmento lleva su umbral escrito
 * debajo. Lo que sí sería mentir es estirar un eje de VALOR para que un avance
 * pequeño parezca grande; aquí el valor vive dentro de cada segmento.
 *
 * Y resuelve el problema que tenía la barra anterior: 720 registros sobre un
 * primer umbral de 10.000 son un 7,2 % del primer segmento —una marca visible,
 * que crece todos los días— en vez de un 2,4 % de la escalera entera, que no se
 * ve nunca.
 */

export interface EscalonObjetivo {
  usuarios: number;
  premio: { micros: string; texto: string };
}

export interface TramoObjetivo {
  escalon: EscalonObjetivo;
  /** 0–100, el avance dentro de ESTE tramo. */
  relleno: number;
  alcanzado: boolean;
  /** El primero sin alcanzar, y solo ese: el bono paga una carrera, no tres. */
  enCurso: boolean;
}

export function tramosDelMedidor(
  registros: number,
  escalones: readonly EscalonObjetivo[],
): TramoObjetivo[] {
  // Se ordena aquí y no se confía en que lleguen ordenados: vienen de la base
  // de datos, y un `orderBy` olvidado en el sitio de llamada pintaría la
  // escalera del revés sin que nada avisara.
  const orden = [...escalones].sort((a, b) => a.usuarios - b.usuarios);
  let base = 0;
  let yaHayUnoEnCurso = false;

  return orden.map((escalon) => {
    const ancho = escalon.usuarios - base;
    const dentro = registros - base;
    // `ancho <= 0` es una escalera mal configurada —dos umbrales iguales—. Se
    // pinta vacío en vez de dividir por cero.
    const bruto = ancho > 0 ? (dentro / ancho) * 100 : 0;
    const relleno = Math.max(0, Math.min(100, bruto));
    const alcanzado = registros >= escalon.usuarios;
    const enCurso = !alcanzado && !yaHayUnoEnCurso;
    if (enCurso) yaHayUnoEnCurso = true;
    base = escalon.usuarios;
    return { escalon, relleno, alcanzado, enCurso };
  });
}
