"use client";

/**
 * Un recurso de la API que **sobrevive a salir de la pantalla y volver**.
 *
 * ── EL DEFECTO QUE ARREGLA ──
 *
 * Cada pantalla pedía sus datos en un `useEffect` al montar y los guardaba en su
 * propio estado. Al pulsar «atrás», React desmonta la pantalla y ese estado se
 * va con ella, así que volver a una pantalla que acabas de dejar la reconstruía
 * desde cero: durante los ~700 ms que tarda la petición se veía el armazón
 * desnudo —el menú de la portada, sin cabecera y con «Cargando datos…»— y
 * después la pantalla daba un salto al aparecer la cifra.
 *
 * Medido con el navegador: a los 80, 200 y 400 ms después de volver atrás la
 * portada enseñaba solo su menú; la cabecera no aparecía hasta pasados 800.
 * Y no es un caso raro: ir a la red y volver es EL gesto de esta aplicación.
 *
 * ── CÓMO ──
 *
 * La respuesta se guarda en un mapa a nivel de módulo, o sea fuera del árbol de
 * React: no lo borra un desmontaje. Al volver, la pantalla se pinta **con lo
 * último que se supo** en el primer fotograma y la petición sigue por detrás
 * para refrescar. Es «stale-while-revalidate», y para estos datos es lo
 * correcto: un devengado de hace treinta segundos es infinitamente mejor que un
 * hueco, y en cuanto llega el nuevo se sustituye sin que la pantalla salte.
 *
 * NO es una caché de red: no tiene caducidad ni se comparte entre pestañas, y
 * muere al recargar. Solo cubre el hueco entre desmontar y volver a montar, que
 * es exactamente donde estaba el problema.
 *
 * El error NO se cachea, a propósito: si la última vez falló, al volver hay que
 * reintentar de verdad, no repintar el aviso viejo.
 */

import { useCallback, useEffect, useState } from "react";

import { aErrorApi, api, type ErrorApi } from "./cliente.ts";

/**
 * Lo último que respondió cada ruta.
 *
 * A nivel de módulo y sin tope de tamaño: las rutas son media docena y sus
 * respuestas, unos kilobytes. Un mapa con política de expulsión aquí sería
 * maquinaria para un problema que no existe.
 */
const memoria = new Map<string, unknown>();

/** Se llama al cerrar sesión: los datos del agente anterior no pueden quedarse. */
export function olvidarTodo(): void {
  memoria.clear();
}

export interface Recurso<T> {
  /** Lo último que se sabe. `null` solo la primerísima vez. */
  datos: T | null;
  /** Solo si la petición EN CURSO ha fallado. No se hereda de la vez anterior. */
  error: ErrorApi | null;
  /** Hay una petición en vuelo. Con `datos` ya puestos, es un refresco. */
  cargando: boolean;
  /** Vuelve a pedirlo. Es lo que cuelga del botón «Reintentar». */
  recargar: () => void;
}

export function useRecurso<T>(ruta: string): Recurso<T> {
  const [datos, setDatos] = useState<T | null>(() => (memoria.get(ruta) as T | undefined) ?? null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(() => {
    setError(null);
    setCargando(true);
    api
      .get<T>(ruta)
      .then((d) => {
        memoria.set(ruta, d);
        setDatos(d);
      })
      .catch((e) => {
        const err = aErrorApi(e);
        setError(err);
        /*
         * Una sesión caducada invalida lo guardado.
         *
         * Sin esto, un 401 dejaría en pantalla los datos del agente de antes
         * mientras se le pide que vuelva a entrar. Enseñar cifras de dinero de
         * una sesión que ya no vale es peor que no enseñar nada.
         */
        if (err.estado === 401) {
          memoria.delete(ruta);
          setDatos(null);
        }
      })
      .finally(() => setCargando(false));
  }, [ruta]);

  useEffect(recargar, [recargar]);

  return { datos, error, cargando, recargar };
}
