"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";

import { Aparece, BarraCreciente, CifraProtagonista } from "@/components/Animacion";
import { Mecha, MechaApagada } from "@/components/Mecha";
import { Aviso, Cargando, Pantalla } from "@/components/Pantalla";
import { TestigoAncho, type DiaAncho } from "@/components/testigo/TestigoAncho";
import { useTelegram } from "@/components/TelegramProvider";
import { api, ErrorApi } from "@/lib/api/cliente";

/**
 * Ficha de un webmaster.
 *
 * Dos preguntas, en este orden: **cuánto me da** y **cuándo le caduca el PRO**.
 * Lo segundo va arriba aunque sea el dato menor, porque es el único que tiene
 * fecha límite: la cifra de ganancia seguirá ahí mañana, la mecha no.
 *
 * El resto de la pantalla es el Testigo de este webmaster a ancho completo. Es
 * el mismo instrumento que el raíl, no un gráfico distinto para una pantalla
 * distinta.
 */

interface DiaFicha {
  fecha: string;
  importeMicros: string;
  importe: string;
  registros: number;
  registrosT1: number;
  registrosT2: number;
  registrosT3: number;
  usuariosPago: number;
  provisional: boolean;
}

interface Ficha {
  email: string;
  id: string;
  estado: string;
  origen: string;
  activadoEn: string | null;
  devengaDesde: string | null;
  pro: {
    plan: string | null;
    vigenteHasta: string;
    concedidoEn: string | null;
    diasRestantes: number;
    diasConcedidos: number | null;
  } | null;
  dias: number;
  serie: DiaFicha[];
  totales: {
    ganado: { micros: string; texto: string };
    registros: number;
    registrosT1: number;
    registrosT2: number;
    registrosT3: number;
    usuariosPago: number;
  };
}

const ETIQUETA_ESTADO: Record<string, string> = {
  ACTIVO: "Activo en Sophon",
  BLOQUEADO: "Bloqueado en Sophon",
  PENDIENTE_BORRADO: "Pendiente de borrado",
  DESAPARECIDO: "Ya no aparece en Sophon",
  DESCONOCIDO: "Estado sin comprobar",
};

export default function FichaWebmaster({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { haptica } = useTelegram();
  const [datos, setDatos] = useState<Ficha | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);

  const cargar = useCallback(() => {
    setError(null);
    api
      .get<Ficha>(`/api/agente/webmaster/${encodeURIComponent(id)}`)
      .then(setDatos)
      .catch((e) =>
        setError(e instanceof ErrorApi ? e : new ErrorApi("Algo ha fallado.", 0, null)),
      );
  }, [id]);

  useEffect(cargar, [cargar]);

  const serie: DiaAncho[] = useMemo(
    () =>
      (datos?.serie ?? []).map((d, i, todos) => ({
        ...d,
        importeMicros: BigInt(d.importeMicros),
        abreMes: i > 0 && todos[i - 1]!.fecha.slice(0, 7) !== d.fecha.slice(0, 7),
      })),
    [datos],
  );

  if (error) {
    return (
      <Pantalla titulo="Webmaster" volverA="/red">
        <Aviso
          error={error.message}
          apoyo={error.apoyo}
          onReintentar={error.estado === 404 ? undefined : cargar}
        />
      </Pantalla>
    );
  }
  if (!datos) {
    return (
      <Pantalla titulo="Webmaster" volverA="/red">
        <Cargando que="Sondeando" />
      </Pantalla>
    );
  }

  const problema = datos.estado !== "ACTIVO";
  const t = datos.totales;
  const conTier = t.registrosT1 + t.registrosT2 + t.registrosT3;

  return (
    <Pantalla volverA="/red">
      <Aparece orden={0}>
        <header className="mb-6">
          {/* El correo entero, sin recortar: es el identificador con el que el
              agente habla con esta persona. Pero rompe por la ARROBA, no por
              caracteres: `break-all` partía «…@gmail.c / om», que es más difícil
              de leer que la línea larga que evitaba. */}
          <h1 className="text-titulo">
            <Correo email={datos.email} />
          </h1>
          <p className={`mt-1 text-apoyo ${problema ? "text-vivo" : "text-texto-apoyo"}`}>
            {ETIQUETA_ESTADO[datos.estado] ?? datos.estado}
            {datos.activadoEn && ` · en tu red desde el ${formatoDia(datos.activadoEn)}`}
          </p>
        </header>
      </Aparece>

      {/* La mecha primero: es lo único con fecha límite. */}
      <Aparece orden={1}>
        <div className="mb-7">
          {datos.pro ? (
            <Mecha
              diasRestantes={datos.pro.diasRestantes}
              diasConcedidos={datos.pro.diasConcedidos}
              vigenteHasta={datos.pro.vigenteHasta}
              plan={datos.pro.plan}
            />
          ) : (
            <MechaApagada />
          )}
          <button
            type="button"
            onClick={() => {
              haptica("seleccion");
              router.push(`/pro?email=${encodeURIComponent(datos.email)}`);
            }}
            className="mt-3 w-full rounded-pieza border border-borde py-3 text-cuerpo font-medium transition-transform duration-150 ease-sonda active:scale-[0.99]"
          >
            {datos.pro && datos.pro.diasRestantes > 0 ? "Renovar PRO" : "Conceder PRO"}
          </button>
        </div>
      </Aparece>

      <Aparece orden={2}>
        <section className="mb-7 border-t border-borde pt-5">
          <p className="text-rotulo text-texto-apoyo">TE HA DADO</p>
          <div className="mt-1.5">
            <CifraProtagonista micros={BigInt(t.ganado.micros)} />
          </div>
          <p className="mt-2 text-apoyo text-texto-apoyo">
            <span className="cifra">{t.registros}</span> registros en {datos.dias} días
            {t.usuariosPago > 0 && (
              <>
                {" "}
                · <span className="cifra">{t.usuariosPago}</span> compraron PRO
              </>
            )}
          </p>

          {/* La mezcla de tiers, como en inicio: una cinta de 8 px y los
              recuentos debajo. La versión anterior ponía el porcentaje entre
              paréntesis junto a cada tier y los tres no cabían en 390 px: «(18
              %)» caía a una segunda línea y la fila se veía rota. La cinta da la
              proporción sin escribirla. */}
          {conTier > 0 && (
            <div className="mt-4">
              <div className="flex h-2 overflow-hidden bg-superficie-alta">
                <BarraCreciente
                  porcentaje={(t.registrosT1 / conTier) * 100}
                  className="bg-t1"
                />
                <BarraCreciente
                  porcentaje={(t.registrosT2 / conTier) * 100}
                  className="bg-t2"
                  retardoMs={60}
                />
                <BarraCreciente
                  porcentaje={(t.registrosT3 / conTier) * 100}
                  className="bg-t3"
                  retardoMs={120}
                />
              </div>
              <div className="mt-2.5 flex gap-4 text-apoyo text-texto-apoyo">
                <Tier color="bg-t1" etiqueta="T1" valor={t.registrosT1} />
                <Tier color="bg-t2" etiqueta="T2" valor={t.registrosT2} />
                <Tier color="bg-t3" etiqueta="T3" valor={t.registrosT3} />
              </div>
            </div>
          )}

          {/* Atribución prospectiva: si no se dice, el agente ve registros
              antiguos sin importe y cree que falta dinero. */}
          {datos.devengaDesde && (
            <p className="mt-4 border-l-2 border-borde pl-3 text-apoyo text-texto-apoyo">
              Cobras por lo que registre a partir del {formatoDia(datos.devengaDesde)}. Lo
              anterior no cuenta.
            </p>
          )}
        </section>
      </Aparece>

      <Aparece orden={3}>
        <section aria-label="Registro de sondeo">
          <p className="text-rotulo mb-3 text-texto-apoyo">ÚLTIMOS {datos.dias} DÍAS</p>
          {serie.length > 0 ? (
            <TestigoAncho dias={serie} denso />
          ) : (
            <p className="text-apoyo text-texto-apoyo">
              Todavía no ha traído ningún registro.
            </p>
          )}
        </section>
      </Aparece>
    </Pantalla>
  );
}

function Tier({ color, etiqueta, valor }: { color: string; etiqueta: string; valor: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-sm ${color}`} aria-hidden />
      {etiqueta} <span className="cifra">{valor}</span>
    </span>
  );
}

/**
 * Correo que rompe por la arroba.
 *
 * Un correo largo no cabe en 390 px y hay que partirlo por algún sitio.
 * `break-all` parte por donde toque —«…@gmail.c / om»— y `break-words` no parte
 * nada, porque un correo es una sola palabra. La arroba es la única costura
 * natural que tiene.
 */
function Correo({ email }: { email: string }) {
  const corte = email.lastIndexOf("@");
  if (corte < 0) return <span className="break-all">{email}</span>;
  return (
    <span className="break-words">
      {email.slice(0, corte)}
      <wbr />
      {email.slice(corte)}
    </span>
  );
}

function formatoDia(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a?.slice(2)}`;
}
