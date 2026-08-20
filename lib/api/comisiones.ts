/**
 * La forma de `/api/agente/comisiones`, compartida por sus dos pantallas.
 *
 * `/activar` la usa para decir lo que se cobra ANTES de dar de alta a alguien, y
 * `/ayuda` para que las respuestas del FAQ lleven cifras de verdad. Escrita dos
 * veces se habría quedado vieja en una de las dos, que es como se llega a que la
 * misma tarifa se lea distinta en dos sitios de la misma aplicación.
 *
 * Solo tipos: no importa nada de `next/server`, así que vale igual en cliente.
 */

export interface Importe {
  micros: string;
  texto: string;
}

export interface Comisiones {
  /** Lo que cobra el agente por cada usuario registrado. `null` sin tarifa vigente. */
  cpa: Importe | null;
  /** Su parte de las compras de PRO, ya en porcentaje. `null` sin tarifa vigente. */
  cps: string | null;
  /** Lo mínimo que se puede pedir de una vez. */
  minimoRetiro: Importe;
  /** La escalera del bono, de menor a mayor. Vacía si no hay ninguna configurada. */
  bonos: { usuarios: number; premio: Importe }[];
}
