"use client";

// =============================================================================
// TrueKeate — Suite: Disputas (/suite/disputas) — RF-14.8 · D13 · D21
// El usuario ve los trueques donde es parte (A o B) que están en disputa y puede
// solicitar la anulación de un trueque propio en custodia:
//   · Sección 1 — "Mis disputas activas": GET /disputas (misDisputas). El backend
//     ya filtra a las disputas donde la wallet es parte; el estado de la disputa
//     se muestra aparte del estado del escrow (StatusBadge).
//   · Sección 2 — "Solicitar anulación": selector de mis trueques (GET /truekes,
//     misTruekes) en CUSTODIADO/APERTURA + motivo opcional → POST /disputas
//     (solicitarDisputa); el backend pasa el trueque a EN_DISPUTA (D13).
// Nota: misDisputas NO incluye tituloA/tituloB, así que el título del trueque se
// enriquece en el cliente con los truekes ya cargados (sin llamada extra); si no
// se encuentra, se muestra "Trueque #id" + la wallet de la contraparte.
// El Socio además participa en la resolución (votación on-chain D21): aquí solo
// se muestra el aviso; la votación vive on-chain/gobernanza.
// =============================================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { useSesionAutenticada } from "@/lib/useSesionAutenticada";
import {
  misDisputas,
  misTruekes,
  solicitarDisputa,
  type Disputa,
  type Trueke,
} from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StatusBadge, type BadgeTono } from "@/components/StatusBadge";

/** Estados del escrow en los que se puede pedir anulación (D13; el backend valida). */
const ESTADOS_DISPUTABLES = ["CUSTODIADO", "APERTURA"];

const inputCls =
  "w-full rounded-xl border border-navy-800/15 bg-white px-3 py-2 text-sm text-navy-800 outline-none transition-colors focus:border-teal-500";

function resumirWallet(w?: string | null): string {
  if (!w) return "—";
  return w.length > 12 ? `${w.slice(0, 6)}…${w.slice(-4)}` : w;
}

function mismaWallet(a?: string | null, b?: string | null): boolean {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

function formatearFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Tono del estado de la disputa: ABIERTA → coral; otras → gold/crimson según desenlace. */
function tonoDeDisputa(estado: string): BadgeTono {
  const e = estado.toUpperCase();
  if (e === "ABIERTA") return "coral";
  if (/ANUL|RECHAZ|DENEG|BLOQ/.test(e)) return "crimson";
  return "gold"; // resuelta/cerrada
}

/** Etiqueta de una opción del selector de anulación. */
function rotuloTrueke(t: Trueke): string {
  const titulos =
    t.tituloA && t.tituloB ? `${t.tituloA} ⇄ ${t.tituloB}` : "";
  return titulos
    ? `#${t.id} · ${titulos} — ${t.estado}`
    : `Trueque #${t.id} — ${t.estado}`;
}

export default function PaginaDisputas() {
  const { account, conectado, signer, conectar, conectando } = useEthereum();
  const { acceso } = useSesion();
  const {
    token,
    autenticar,
    cargando: autenticando,
    error: errorAutenticacion,
  } = useSesionAutenticada();

  const [disputas, setDisputas] = useState<Disputa[]>([]);
  const [truekes, setTruekes] = useState<Trueke[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [truekeSeleccionado, setTruekeSeleccionado] = useState("");
  const [motivo, setMotivo] = useState("");
  const [solicitando, setSolicitando] = useState(false);
  const [exito, setExito] = useState<string | null>(null);
  const [errorSolicitud, setErrorSolicitud] = useState<string | null>(null);

  const esSocio = acceso.fase === "inscrito" && acceso.usuario.tipo === "SOCIO";

  /** Carga ambas listas (mis disputas + mis trueques) con el token de sesión. */
  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const [d, t] = await Promise.all([misDisputas(token), misTruekes(token)]);
      setDisputas(d.disputas ?? []);
      setTruekes(t.truekes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "no se pudieron cargar las disputas");
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Al cambiar de cuenta se descartan los datos del usuario anterior.
  useEffect(() => {
    setDisputas([]);
    setTruekes([]);
    setExito(null);
    setError(null);
    setErrorSolicitud(null);
    setTruekeSeleccionado("");
    setMotivo("");
  }, [account]);

  /** Mis trueques disputables: solo los propios en CUSTODIADO/APERTURA (D13). */
  const disputables = useMemo(
    () =>
      truekes.filter(
        (t) =>
          ESTADOS_DISPUTABLES.includes(t.estado) &&
          (mismaWallet(t.usuarioA, account) || mismaWallet(t.usuarioB, account))
      ),
    [truekes, account]
  );

  /** Índice truekeId → trueque (enriquece títulos de las disputas, sin llamada extra). */
  const truekesPorId = useMemo(() => new Map(truekes.map((t) => [t.id, t])), [truekes]);

  const tituloDeDisputa = (d: Disputa): string => {
    const t = truekesPorId.get(d.truekeId);
    if (t?.tituloA && t?.tituloB) return `${t.tituloA} ⇄ ${t.tituloB}`;
    return `Trueque #${d.truekeId}`;
  };

  const contraparteDe = (d: Disputa): string =>
    mismaWallet(d.usuarioA, account) ? d.usuarioB : d.usuarioA;

  const enviarSolicitud = useCallback(async () => {
    if (!token || !truekeSeleccionado) return;
    setSolicitando(true);
    setExito(null);
    setErrorSolicitud(null);
    try {
      const r = await solicitarDisputa(token, {
        truekeId: Number(truekeSeleccionado),
        motivo: motivo.trim() || undefined,
      });
      setExito(
        `Disputa #${r.disputa.id} solicitada: el trueque pasó a EN_DISPUTA y se someterá a la resolución de Socios (D13/D21).`
      );
      setTruekeSeleccionado("");
      setMotivo("");
      await cargar(); // refresca ambas listas
    } catch (e) {
      setErrorSolicitud(
        e instanceof Error ? e.message : "no se pudo solicitar la anulación"
      );
    } finally {
      setSolicitando(false);
    }
  }, [token, truekeSeleccionado, motivo, cargar]);

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-800">⚖️ Disputas</h1>
          <p className="text-sm text-navy-800/60">
            Trueques donde participas que están en disputa y solicitud de anulación de
            custodia (RF-14.8, D13). Certificado ve · Socio resuelve (D21).
          </p>
        </div>
        {account && (
          <p className="font-mono text-[10px] text-navy-800/40">
            {resumirWallet(account)}
          </p>
        )}
      </div>

      {/* Sin token de sesión → autenticar (firma EIP-191). */}
      {!token && (
        <Card className="p-8 text-center">
          <p className="text-3xl">🔏</p>
          <h2 className="mt-2 font-display text-lg font-semibold text-navy-800">
            Autentícate para ver tus disputas
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-navy-800/60">
            Para consultar tus disputas y solicitar anulaciones debes firmar el mensaje
            <em> “TrueKeate: iniciar sesión”</em> (EIP-191) con la wallet conectada.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {!conectado ? (
              <Button onClick={() => void conectar()} disabled={conectando}>
                {conectando ? "Conectando…" : "Conectar MetaMask"}
              </Button>
            ) : (
              <Button
                onClick={() => void autenticar()}
                disabled={autenticando || !signer}
              >
                {autenticando
                  ? "Firmando…"
                  : !signer
                    ? "Desbloquea tu wallet para firmar"
                    : "🔏 Autenticar sesión"}
              </Button>
            )}
          </div>
          {errorAutenticacion && (
            <p className="mt-3 text-xs text-crimson">⚠️ {errorAutenticacion}</p>
          )}
        </Card>
      )}

      {token && (
        <>
          {/* Aviso para Socios: la resolución es votación on-chain (D21). */}
          {esSocio && (
            <div className="rounded-xl border border-gold-500/40 bg-gold-500/10 px-4 py-3 text-sm text-navy-800/80">
              🏛️ <strong>Como Socio</strong> puedes participar en la resolución de estas
              disputas: votación on-chain de anulación, un voto por Socio y quórum ≥2/3
              (D21). La votación se realiza en la cadena; aquí verás el estado resultante.
            </div>
          )}

          {/* Sección 1 — Mis disputas activas */}
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-navy-800">
                Mis disputas activas
              </h2>
              <Button
                variante="outline-navy"
                className="!px-3 !py-1.5 !text-xs"
                onClick={() => void cargar()}
                disabled={cargando}
              >
                {cargando ? "Cargando…" : "↻ Refrescar"}
              </Button>
            </div>

            {cargando && (
              <Card className="p-8 text-center text-sm text-navy-800/50">
                Cargando disputas…
              </Card>
            )}

            {!cargando && error && (
              <Card className="p-6 text-center">
                <p className="text-sm text-crimson">No se pudieron cargar las disputas.</p>
                <p className="mt-1 text-xs text-navy-800/50">{error}</p>
                <div className="mt-4">
                  <Button variante="outline-navy" onClick={() => void cargar()}>
                    ↻ Reintentar
                  </Button>
                </div>
              </Card>
            )}

            {!cargando && !error && disputas.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-3xl">🕊️</p>
                <h3 className="mt-2 font-display text-lg font-semibold text-navy-800">
                  No tienes disputas activas
                </h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-navy-800/60">
                  Cuando tú o la otra parte solicite la anulación de un trueque en custodia
                  (D13), la disputa aparecerá aquí y el trueque pasará a EN_DISPUTA.
                </p>
              </Card>
            )}

            {!cargando && !error && disputas.length > 0 && (
              <div className="space-y-3">
                {disputas.map((d) => {
                  const contraparte = contraparteDe(d);
                  return (
                    <Card key={d.id} className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display text-base font-bold text-navy-800">
                            {tituloDeDisputa(d)}
                          </p>
                          <p className="mt-0.5 text-xs text-navy-800/50">
                            Contraparte:{" "}
                            <span className="font-mono">{resumirWallet(contraparte)}</span>
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge estado={d.estado} tono={tonoDeDisputa(d.estado)} />
                          <StatusBadge estado={d.estadoTrueke} />
                        </div>
                      </div>

                      {d.motivo && (
                        <p className="mt-2 rounded-xl bg-smoke px-3 py-2 text-xs italic text-navy-800/70">
                          “{d.motivo}”
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-navy-800/50">
                        <span>
                          Solicitante:{" "}
                          {mismaWallet(d.solicitante, account) ? (
                            <strong className="text-navy-800">tú</strong>
                          ) : (
                            <span className="font-mono">{resumirWallet(d.solicitante)}</span>
                          )}
                        </span>
                        <span>🗓 {formatearFecha(d.createdAt)}</span>
                        {d.resolucion && <span>Resolución: {d.resolucion}</span>}
                        {d.sancion && <span>Sanción: {d.sancion}</span>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* Sección 2 — Solicitar anulación */}
          <Card className="p-5">
            <h2 className="font-display text-lg font-bold text-navy-800">
              Solicitar anulación
            </h2>
            <p className="mt-1 text-sm text-navy-800/60">
              Puedes pedir la anulación de un trueque <strong>propio</strong> en{" "}
              <StatusBadge estado="CUSTODIADO" /> o <StatusBadge estado="APERTURA" /> (D13):
              la solicitud lo pasa a <StatusBadge estado="EN_DISPUTA" /> y los Socios la
              resuelven por votación on-chain.
            </p>

            {errorSolicitud && (
              <p className="mt-3 rounded-xl bg-crimson/10 px-4 py-2 text-xs text-crimson">
                ⚠️ {errorSolicitud}
              </p>
            )}
            {exito && (
              <p className="mt-3 rounded-xl border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-xs text-navy-800/80">
                ✅ {exito}
              </p>
            )}

            {disputables.length === 0 ? (
              <p className="mt-4 rounded-xl bg-smoke px-4 py-3 text-sm text-navy-800/60">
                No tienes trueques propios en custodia/apretura que puedan disputarse. Los
                trueques en <strong>CUSTODIADO</strong> o <strong>APERTURA</strong> aparecerán
                aquí para solicitar su anulación (D13).
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <label
                    htmlFor="trueke-disputa"
                    className="mb-1 block text-xs font-semibold text-navy-800/70"
                  >
                    Trueque a disputar
                  </label>
                  <select
                    id="trueke-disputa"
                    value={truekeSeleccionado}
                    onChange={(e) => setTruekeSeleccionado(e.target.value)}
                    className={inputCls}
                    disabled={solicitando}
                  >
                    <option value="">Selecciona un trueque…</option>
                    {disputables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {rotuloTrueke(t)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="motivo-disputa"
                    className="mb-1 block text-xs font-semibold text-navy-800/70"
                  >
                    Motivo <span className="font-normal text-navy-800/40">(opcional)</span>
                  </label>
                  <textarea
                    id="motivo-disputa"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Ej.: la contraparte no entregó el artículo acordado…"
                    className={inputCls}
                    disabled={solicitando}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={() => void enviarSolicitud()}
                    disabled={solicitando || !truekeSeleccionado}
                  >
                    {solicitando ? "Solicitando…" : "Solicitar anulación (D13)"}
                  </Button>
                  <p className="text-[11px] text-navy-800/40">
                    {truekeSeleccionado
                      ? "El backend validará el estado antes de abrir la disputa."
                      : "Elige primero un trueque en custodia/apretura."}
                  </p>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
