"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Aviso, Cargando, Pantalla, Vacio } from "@/components/Pantalla";
import { BotonPrincipalAccion, useTelegram } from "@/components/TelegramProvider";
import { api, ErrorApi, nuevaIdempotencia } from "@/lib/api/cliente";
import { es } from "@/lib/i18n";

/**
 * Conceder PRO.
 *
 * Es la única acción de la app que gasta algo escaso, así que la pantalla se
 * organiza alrededor de eso: **el cupo se ve antes de elegir nada** y el coste
 * va escrito en el botón. Nadie debería descubrir que ha gastado su último PRO
 * del mes después de pulsar.
 *
 * El cupo se dibuja con marcas discretas, como La Mecha: la pregunta es «¿cuántos
 * me quedan?» y tres marcas se cuentan de un vistazo; «66 %» no se cuenta.
 */

interface WebmasterPro {
  email: string;
  id: string;
  bloqueado: boolean;
  proVigenteHasta: string | null;
  proPlan: string | null;
  diasRestantes: number | null;
}

interface EstadoPro {
  puedeConceder: boolean;
  planes: string[];
  cupo: { total: number; usadas: number; periodo: string };
  webmasters: WebmasterPro[];
}

const NOMBRE_PLAN: Record<string, string> = {
  "vip.day": "1 día",
  "vip.week": "1 semana",
  "vip.month": "1 mes",
  "vip.year": "1 año",
};

export default function ConcederProPagina() {
  return (
    <Suspense
      fallback={
        <Pantalla titulo={es.concederPro} volverA="/">
          <Cargando />
        </Pantalla>
      }
    >
      <ConcederPro />
    </Suspense>
  );
}

function ConcederPro() {
  const router = useRouter();
  const parametros = useSearchParams();
  const { haptica } = useTelegram();

  const [datos, setDatos] = useState<EstadoPro | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [hecho, setHecho] = useState<{ email: string; vigenteHasta: string | null } | null>(null);

  // La clave se genera UNA VEZ por intención, no por envío: si el agente pulsa
  // dos veces o la red reintenta, el servidor reconoce el duplicado en vez de
  // gastarle otra concesión.
  const idempotencia = useRef(nuevaIdempotencia());

  const cargar = useCallback(() => {
    setError(null);
    api
      .get<EstadoPro>("/api/pro")
      .then((d) => {
        setDatos(d);
        setPlan((p) => p ?? d.planes[0] ?? null);
      })
      .catch((e) =>
        setError(e instanceof ErrorApi ? e : new ErrorApi("Algo ha fallado.", 0, null)),
      );
  }, []);

  useEffect(cargar, [cargar]);

  // Llegar desde la ficha de un webmaster preselecciona ese webmaster: el agente
  // ya dijo a quién, no tiene que volver a decirlo.
  const preseleccion = parametros.get("email");
  useEffect(() => {
    if (preseleccion && datos) {
      const w = datos.webmasters.find(
        (x) => x.email.toLowerCase() === preseleccion.toLowerCase(),
      );
      if (w) setElegido(w.id);
    }
  }, [preseleccion, datos]);

  const restantes = datos ? Math.max(0, datos.cupo.total - datos.cupo.usadas) : 0;
  const webmaster = useMemo(
    () => datos?.webmasters.find((w) => w.id === elegido) ?? null,
    [datos, elegido],
  );

  const conceder = useCallback(async () => {
    if (!webmaster || !plan || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await api.post<{ email: string; vigenteHasta: string | null }>(
        "/api/pro/conceder",
        { email: webmaster.email, plan, idempotencia: idempotencia.current },
      );
      haptica("exito");
      setHecho({ email: r.email ?? webmaster.email, vigenteHasta: r.vigenteHasta ?? null });
    } catch (e) {
      haptica("error");
      setError(e instanceof ErrorApi ? e : new ErrorApi("Algo ha fallado.", 0, null));
    } finally {
      setEnviando(false);
    }
  }, [webmaster, plan, enviando, haptica]);

  if (error && !datos) {
    return (
      <Pantalla titulo={es.concederPro} volverA="/">
        <Aviso error={error.message} apoyo={error.apoyo} onReintentar={cargar} />
      </Pantalla>
    );
  }
  if (!datos) {
    return (
      <Pantalla titulo={es.concederPro} volverA="/">
        <Cargando />
      </Pantalla>
    );
  }

  if (hecho) {
    return (
      <Pantalla titulo={es.concederPro} volverA="/" tarea>
        <p className="text-cuerpo font-medium">{hecho.email} ya tiene PRO.</p>
        {hecho.vigenteHasta && (
          <p className="mt-1.5 text-apoyo text-texto-apoyo">
            Le vence el {formatoDia(hecho.vigenteHasta)}. Te avisaremos antes.
          </p>
        )}
        <p className="mt-4 text-apoyo text-texto-apoyo">
          Te {restantes - 1 === 1 ? "queda 1" : `quedan ${Math.max(0, restantes - 1)}`} de{" "}
          {datos.cupo.total} este mes.
        </p>
        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={() => router.push(`/red/${encodeURIComponent(elegido ?? "")}`)}
            className="flex-1 rounded-pieza border border-borde px-4 py-3 text-cuerpo font-medium"
          >
            Ver su ficha
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex-1 rounded-pieza bg-tinta px-4 py-3 text-cuerpo font-semibold text-fondo"
          >
            Volver al inicio
          </button>
        </div>
      </Pantalla>
    );
  }

  if (!datos.puedeConceder) {
    return (
      <Pantalla titulo={es.concederPro} volverA="/">
        <Vacio
          titulo="No tienes permiso para conceder PRO."
          apoyo="Pídeselo al superadmin: es un permiso que se activa por agente."
          accion={{ texto: "Volver al inicio", href: "/" }}
        />
      </Pantalla>
    );
  }
  if (datos.webmasters.length === 0) {
    return (
      <Pantalla titulo={es.concederPro} volverA="/">
        <Vacio
          titulo={es.sinWebmasters}
          apoyo="Solo puedes conceder PRO a webmasters de tu red."
          accion={{ texto: es.activarWebmaster, href: "/activar" }}
        />
      </Pantalla>
    );
  }

  return (
    <Pantalla titulo={es.concederPro} volverA="/">
      {/* El recurso escaso, antes de elegir nada. */}
      <Cupo total={datos.cupo.total} usadas={datos.cupo.usadas} />

      <section className="mt-7">
        <p className="text-rotulo mb-2.5 text-texto-apoyo">A QUIÉN</p>
        <ul className="divide-y divide-borde border-y border-borde" role="list">
          {datos.webmasters.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => {
                  haptica("seleccion");
                  setElegido(w.id);
                }}
                disabled={w.bloqueado}
                className="flex w-full items-center gap-3 py-3 text-left disabled:opacity-40"
              >
                {/* La selección es una marca de tinta a la izquierda, del ancho
                    de un filete. Un check circular sería vocabulario ajeno al
                    resto de la app, donde el estado siempre va en un canto. */}
                <span
                  className={`h-8 w-[3px] shrink-0 ${elegido === w.id ? "bg-tinta" : "bg-transparent"}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-cuerpo">{w.email}</span>
                  <span className="block text-apoyo text-texto-apoyo">
                    {w.bloqueado
                      ? "Bloqueado en Sophon"
                      : w.diasRestantes === null
                        ? "Sin PRO"
                        : w.diasRestantes <= 0
                          ? "PRO caducado"
                          : `PRO ${w.diasRestantes} ${w.diasRestantes === 1 ? "día" : "días"}`}
                  </span>
                </span>
                {elegido === w.id && (
                  <span className="text-rotulo shrink-0 text-texto-apoyo">ELEGIDO</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-7">
        <p className="text-rotulo mb-2.5 text-texto-apoyo">CUÁNTO TIEMPO</p>
        {/* Retícula par, no `flex-wrap`. Con cuatro planes, envolver dejaba una
            fila de tres y otra de uno; el bloque descuadrado leía como un
            sobrante justo donde hay que elegir con calma. */}
        <div className="grid grid-cols-2 gap-2">
          {datos.planes.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                haptica("seleccion");
                setPlan(p);
              }}
              className={[
                "rounded-pieza px-4 py-2.5 text-apoyo font-medium",
                "transition-transform duration-150 ease-sonda active:scale-[0.98]",
                plan === p ? "bg-tinta text-fondo" : "border border-borde",
              ].join(" ")}
            >
              {NOMBRE_PLAN[p] ?? p}
            </button>
          ))}
        </div>
        {datos.planes.length === 0 && (
          <p className="text-apoyo text-texto-apoyo">
            No tienes ningún plan autorizado todavía. Pídeselo al superadmin.
          </p>
        )}
      </section>

      {webmaster && plan && (
        <p className="mt-7 border-l-2 border-borde pl-3 text-apoyo">
          Vas a dar <span className="font-medium">{NOMBRE_PLAN[plan] ?? plan}</span> de PRO a{" "}
          <span className="break-all font-medium">{webmaster.email}</span>. {es.quedaRegistrado}
        </p>
      )}

      {error && (
        <div className="mt-5">
          <Aviso error={error.message} apoyo={error.apoyo} />
        </div>
      )}

      {/* El coste va EN el botón: el cupo es lo escaso y no puede quedarse en
          una nota que se lee después de pulsar. */}
      <BotonPrincipalAccion
        texto={
          restantes === 0
            ? "SIN CUPO ESTE MES"
            : `CONCEDER · GASTA 1 DE ${restantes}`
        }
        onClick={conceder}
        activo={Boolean(webmaster && plan) && restantes > 0}
        cargando={enviando}
      />
    </Pantalla>
  );
}

/**
 * El cupo del mes en marcas.
 *
 * Mismo vocabulario que La Mecha, y con la misma regla: **la tinta es lo que
 * todavía tienes**. Las marcas gastadas quedan huecas, a la vista, para que se
 * vea el ritmo del mes sin que compitan con lo que queda.
 *
 * El rótulo dice lo mismo que el dibujo —«quedan 3 de 8»— y no «5 usados», que
 * era lo contrario de lo que se estaba pintando.
 */
function Cupo({ total, usadas }: { total: number; usadas: number }) {
  const restantes = Math.max(0, total - usadas);
  const agotado = restantes === 0;

  return (
    <section aria-label="Cupo de PRO de este mes">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-rotulo text-texto-apoyo">{es.cupoPro} · ESTE MES</span>
        <span className={`text-apoyo ${agotado ? "text-vivo" : "text-texto-apoyo"}`}>
          quedan <span className="cifra">{restantes}</span> de{" "}
          <span className="cifra">{total}</span>
        </span>
      </div>
      <div className="flex h-6 items-stretch gap-1" aria-hidden>
        {Array.from({ length: Math.min(total, 40) }, (_, i) => (
          <span
            key={i}
            className={`min-w-[3px] flex-1 ${
              i < usadas ? "border border-borde bg-transparent" : "bg-tinta"
            }`}
          />
        ))}
      </div>
      <p className={`mt-2 text-apoyo ${agotado ? "text-vivo" : "text-texto-apoyo"}`}>
        {agotado
          ? "Sin cupo hasta el día 1. Si lo necesitas antes, pídele ampliación al superadmin."
          : "Se reinicia el día 1."}
      </p>
    </section>
  );
}

function formatoDia(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a?.slice(2)}`;
}
