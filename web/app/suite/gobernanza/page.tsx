"use client";

// =============================================================================
// TrueKeate — Suite: Gobernanza / Socios (RF-14.8, D21, CU-19)
// Padrón de Socios y propuestas del SociosRegistry (on-chain, consultadas vía
// backend) + votación D21 (quórum ≥ 2/3 de Socios, 1 voto por Socio).
// Cualquier usuario inscrito autenticado puede VER; solo un Socio (tipo SOCIO
// en sesión) puede VOTAR — el backend valida además esSocio on-chain.
// =============================================================================
import { useCallback, useEffect, useState } from "react";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { useSesionAutenticada } from "@/lib/useSesionAutenticada";
import {
  gobernanzaSocios,
  propuestasGobernanza,
  votarPropuesta,
  type PropuestaGobernanza,
} from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StatusBadge, type BadgeTono } from "@/components/StatusBadge";

/** Etiquetas legibles de los tipos de propuesta (backend: EMISION_BRLT|SUBIR_TOPE|OTRA). */
const ETIQUETA_TIPO: Record<string, string> = {
  EMISION_BRLT: "Emisión BRLT",
  SUBIR_TOPE: "Subir tope",
  OTRA: "Otra",
};

const TONO_TIPO: Record<string, BadgeTono> = {
  EMISION_BRLT: "gold",
  SUBIR_TOPE: "teal",
  OTRA: "smoke",
};

/** Dirección/hex corto para mostrar (0x1234…abcd). */
function acortar(hex: string | null | undefined): string {
  if (!hex) return "—";
  return hex.length > 10 ? `${hex.slice(0, 6)}…${hex.slice(-4)}` : hex;
}

// -----------------------------------------------------------------------------
// Tarjeta de una propuesta: tipo, descripción, proponente, votación con barra
// visual y acciones (votar / ya votó / ejecutada).
// -----------------------------------------------------------------------------
function TarjetaPropuesta({
  propuesta,
  puedeVotar,
  votando,
  onVotar,
}: {
  propuesta: PropuestaGobernanza;
  puedeVotar: boolean;
  votando: boolean;
  onVotar: (aFavor: boolean) => void;
}) {
  const { id, tipo, descripcion, proponente, votosAFavor, votosEnContra, ejecutada, yaVoto } =
    propuesta;
  const total = votosAFavor + votosEnContra;
  const pctFavor = total > 0 ? Math.round((votosAFavor / total) * 100) : 0;
  const tipoConocido = tipo in ETIQUETA_TIPO ? tipo : "OTRA";

  return (
    <Card className="p-4">
      {/* Cabecera: #id · tipo · estado ejecutada | proponente */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-smoke px-1.5 py-0.5 font-mono text-[10px] font-bold text-navy-800/60">
            #{id}
          </span>
          <StatusBadge estado={ETIQUETA_TIPO[tipoConocido]} tono={TONO_TIPO[tipoConocido]} />
          {ejecutada && <StatusBadge estado="Ejecutada" tono="gold" />}
        </div>
        <span className="font-mono text-[10px] text-navy-800/40">
          por {acortar(proponente)}
        </span>
      </div>

      {/* Descripción de la propuesta */}
      <p className="mt-2 text-sm text-navy-800/90">{descripcion}</p>

      {/* Votación: conteo + barra a favor/en contra con porcentaje */}
      <div className="mt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-navy-800/60">
          <span>Votación de Socios (D21)</span>
          <span className="font-semibold text-navy-800">
            👍 {votosAFavor} a favor · 👎 {votosEnContra} en contra
          </span>
        </div>
        {total === 0 ? (
          <p className="mt-1 text-[11px] text-navy-800/40">Aún no hay votos.</p>
        ) : (
          <>
            <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-smoke">
              <div
                className="h-full bg-teal-500 transition-all"
                style={{ width: `${pctFavor}%` }}
              />
              <div
                className="h-full bg-crimson/80 transition-all"
                style={{ width: `${100 - pctFavor}%` }}
              />
            </div>
            <p className="mt-1 text-right text-[10px] font-semibold text-navy-800/50">
              {pctFavor}% a favor · {100 - pctFavor}% en contra
            </p>
          </>
        )}
      </div>

      {/* Acciones: ejecutada / ya votó / botones de voto (solo Socios) */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-navy-800/5 pt-3">
        {ejecutada ? (
          <p className="text-[11px] text-navy-800/50">
            Propuesta ejecutada: cerrada para votación.
          </p>
        ) : yaVoto ? (
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge estado="Ya votaste" tono="cyan" />
            <span className="text-[11px] text-navy-800/60">
              Tu voto quedó registrado (1 voto por Socio).
            </span>
          </div>
        ) : puedeVotar ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => onVotar(true)}
              disabled={votando}
              className="!px-3 !py-1.5 !text-xs"
            >
              👍 A favor
            </Button>
            <Button
              variante="outline-navy"
              onClick={() => onVotar(false)}
              disabled={votando}
              className="!px-3 !py-1.5 !text-xs"
            >
              👎 En contra
            </Button>
            {votando && <span className="text-[11px] text-navy-800/50">Enviando voto…</span>}
          </div>
        ) : (
          <p className="text-[11px] text-navy-800/50">
            Solo los Socios pueden votar (D21).
          </p>
        )}
      </div>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Página: Gobernanza / Socios
// -----------------------------------------------------------------------------
export default function PaginaGobernanza() {
  const { account } = useEthereum();
  const { acceso } = useSesion();
  const { token, autenticar, cargando: autenticando, error: errorAuth } = useSesionAutenticada();

  const [padron, setPadron] = useState<{ totalSocios: number; esSocio: boolean } | null>(null);
  const [propuestas, setPropuestas] = useState<PropuestaGobernanza[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [votandoId, setVotandoId] = useState<number | null>(null);

  // ¿El usuario de la sesión es Socio (rol RF-14)? Los botones de voto solo
  // aparecen para él; el backend exige además esSocio on-chain (D21).
  const soySocio = acceso.fase === "inscrito" && acceso.usuario.tipo === "SOCIO";

  /** Consulta padrón + propuestas on-chain (vía backend) con el token de sesión. */
  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    setMensaje(null);
    try {
      const [socios, props] = await Promise.all([
        gobernanzaSocios(token),
        propuestasGobernanza(token),
      ]);
      setPadron(socios);
      setPropuestas(props.propuestas ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron consultar los datos de gobernanza.");
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void cargar();
  }, [token, cargar]);

  /** Registra el voto (a favor/en contra) y refresca padrón + propuestas. */
  const votar = useCallback(
    async (propuestaId: number, aFavor: boolean) => {
      if (!token) return;
      setVotandoId(propuestaId);
      setError(null);
      setMensaje(null);
      try {
        const r = await votarPropuesta(token, propuestaId, aFavor);
        await cargar(); // refresca tras el voto
        setMensaje(
          r.simulado
            ? "Voto registrado en el espejo local (simulado — sin tx on-chain)."
            : `Voto registrado on-chain ✓${r.txHash ? ` (${acortar(r.txHash)})` : ""}`
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo registrar el voto.");
      } finally {
        setVotandoId(null);
      }
    },
    [token, cargar]
  );

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-800">🏛️ Gobernanza / Socios</h1>
          <p className="text-sm text-navy-800/60">
            Padrón de Socios y propuestas del registry on-chain (RF-14.8, D21): quórum ≥ 2/3 de
            Socios y 1 voto por Socio.
          </p>
        </div>
        {account && (
          <p className="font-mono text-[10px] text-navy-800/40">
            {account.slice(0, 6)}…{account.slice(-4)}
          </p>
        )}
      </div>

      {/* 1) Sin token → autenticar (firma EIP-191) */}
      {!token ? (
        <Card className="p-8 text-center">
          <p className="text-3xl">🗳️</p>
          <h2 className="mt-2 font-display text-lg font-semibold text-navy-800">
            Autentícate para ver la gobernanza de Socios
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-navy-800/60">
            El padrón y las propuestas viven on-chain en el SociosRegistry y se consultan a través
            del backend con tu sesión firmada (EIP-191). Cualquier usuario inscrito puede
            consultarlos; solo un Socio puede votar (D21).
          </p>
          <div className="mt-5 flex justify-center">
            <Button onClick={() => void autenticar()} disabled={autenticando}>
              {autenticando ? "Firmando…" : "🔏 Autenticar con mi wallet"}
            </Button>
          </div>
          {errorAuth && <p className="mt-3 text-xs text-crimson">⚠️ {errorAuth}</p>}
        </Card>
      ) : (
        <>
          {/* Avisos de error / confirmación */}
          {error && (
            <div className="rounded-xl bg-crimson/10 px-4 py-3 text-sm text-crimson">
              <p>⚠️ {error}</p>
              {padron === null && (
                <button
                  onClick={() => void cargar()}
                  className="mt-2 text-xs font-semibold underline"
                >
                  ↻ Reintentar consulta
                </button>
              )}
            </div>
          )}
          {!error && mensaje && (
            <p className="rounded-xl bg-teal-500/10 px-4 py-2 text-sm font-semibold text-teal-500">
              ✓ {mensaje}
            </p>
          )}

          {/* Carga inicial */}
          {cargando && padron === null && (
            <p className="py-10 text-center text-sm text-navy-800/50">
              Consultando padrón y propuestas on-chain…
            </p>
          )}

          {/* 2) Padrón de Socios */}
          {padron !== null && (
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-navy-800">Padrón de Socios</h2>
                  <p className="text-xs text-navy-800/50">
                    Estado on-chain del SociosRegistry ·{" "}
                    {cargando ? (
                      <span className="animate-pulse">refrescando…</span>
                    ) : (
                      "1 voto por Socio (D21)"
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <p className="font-display text-3xl font-bold leading-none text-navy-800">
                    {padron.totalSocios}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-navy-800/40">
                    socios
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-navy-800/5 pt-3">
                <p className="text-xs text-navy-800/70">
                  Mi wallet{" "}
                  <span className="font-mono">{account ? acortar(account) : ""}</span>{" "}
                  {padron.esSocio ? "figura como " : "no figura como "}
                  <span className={padron.esSocio ? "font-semibold text-teal-500" : ""}>
                    Socio
                  </span>{" "}
                  en el registry on-chain.
                </p>
                <StatusBadge
                  estado={padron.esSocio ? "Socio ✓" : "No socio"}
                  tono={padron.esSocio ? "teal" : "smoke"}
                />
              </div>

              {soySocio && !padron.esSocio && (
                <p className="mt-2 rounded-lg bg-coral/10 px-3 py-1.5 text-[11px] text-navy-800/70">
                  Tu sesión es de tipo Socio, pero el registry on-chain no reconoce esta wallet: el
                  backend rechazará el voto hasta que la wallet esté dada de alta como Socio.
                </p>
              )}
            </Card>
          )}

          {/* 3) Propuestas */}
          {padron !== null && (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-navy-800">Propuestas</h2>
                <Button
                  variante="outline-navy"
                  onClick={() => void cargar()}
                  disabled={cargando}
                  className="!px-3 !py-1.5 !text-xs"
                >
                  {cargando ? "Cargando…" : "↻ Refrescar"}
                </Button>
              </div>

              {!cargando && propuestas.length === 0 ? (
                <Card className="mt-3 p-8 text-center">
                  <p className="text-3xl">🗳️</p>
                  <h3 className="mt-2 font-display text-lg font-semibold text-navy-800">
                    Aún no hay propuestas de Socios
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-navy-800/60">
                    Cuando un Socio cree una propuesta (emisión de BRLT, subida de tope u otra),
                    aparecerá aquí para que la Sociedad la vote (RF-14.8).
                  </p>
                </Card>
              ) : (
                <div className="mt-3 space-y-3">
                  {propuestas.map((p) => (
                    <TarjetaPropuesta
                      key={p.id}
                      propuesta={p}
                      puedeVotar={soySocio}
                      votando={votandoId === p.id}
                      onVotar={(aFavor) => void votar(p.id, aFavor)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
