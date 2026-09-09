"use client";

// =============================================================================
// TrueKeate — Suite: Disputas (/suite/disputas) — flujo afinado del director
// =============================================================================
// La disputa nace SOLO desde el cierre ✗ No Conforme (formulario con motivo +
// fotos). Estados: REPORTADA → ESPERA_JUSTIFICATIVO → EN_VOTACION → RESUELTA.
//   · Parte reclamante: ve su reclamo con fotos y el avance.
//   · Parte contraparte: si está conforme → carga JUSTIFICATIVO con fotos;
//     si también está No Conforme → declara su reclamo (motivo + fotos).
//   · Socio (no parte): vota ANULAR (devolución) o VALIDO viendo las pruebas
//     de ambas partes (mismo acceso al trueke en disputa — punto 4 del director).
// =============================================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { useEthereum } from "@/lib/ethereum";
import { useSesionAutenticada } from "@/lib/useSesionAutenticada";
import {
  misDisputas,
  misTruekes,
  detalleDisputa,
  cargarJustificativo,
  declararNoConforme,
  votarDisputa,
  votacionesDisputas,
  padronDisputas,
  urlEvidenciaDisputa,
  type Disputa,
  type DetalleDisputa,
  type Trueke,
  type VotacionSocio,
} from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StatusBadge, type BadgeTono } from "@/components/StatusBadge";
import { SubirFotos, type FotoSubida } from "@/components/SubirFotos";
import { ImagenProtegida } from "@/components/ImagenProtegida";

const inputCls =
  "w-full rounded-xl border border-navy-800/15 bg-white px-3 py-2 text-sm text-navy-800 outline-none transition-colors focus:border-teal-500";

function resumirWallet(w?: string | null): string {
  if (!w) return "—";
  return w.length > 12 ? `${w.slice(0, 6)}…${w.slice(-4)}` : w;
}

function mismaWallet(a?: string | null, b?: string | null): boolean {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

function formatearFecha(iso?: string | null): string {
  if (!iso) return "—";
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

/** Tono del estado de la disputa (flujo afinado). */
function tonoDeDisputa(estado: string): BadgeTono {
  const e = estado.toUpperCase();
  if (e === "REPORTADA" || e === "ESPERA_JUSTIFICATIVO") return "coral";
  if (e === "EN_VOTACION") return "gold";
  if (e === "RESUELTA") return "teal";
  return "gold";
}

/** Etiqueta corta del estado para la UI. */
function rotuloEstado(estado: string): string {
  const map: Record<string, string> = {
    REPORTADA: "Reportada — esperando postura de la contraparte",
    ESPERA_JUSTIFICATIVO: "Esperando justificativo del conforme",
    EN_VOTACION: "Votación de Socios abierta",
    RESUELTA: "Resuelta",
  };
  return map[estado] ?? estado;
}

/** Determina mi rol en la disputa (reclamante | contraparte | socio). */
function miRol(d: Disputa, account?: string | null, esSocio = false): "reclamante" | "contraparte" | "socio" | "observador" {
  if (!account) return "observador";
  if (mismaWallet(d.solicitante, account)) return "reclamante";
  if (mismaWallet(d.usuarioA, account) || mismaWallet(d.usuarioB, account)) return "contraparte";
  if (esSocio) return "socio";
  return "observador";
}

export default function PaginaDisputas() {
  const { account } = useEthereum();
  const { token } = useSesionAutenticada();

  const [disputas, setDisputas] = useState<Disputa[]>([]);
  const [truekes, setTruekes] = useState<Trueke[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // votación de Socios
  const [esSocio, setEsSocio] = useState(false);
  const [votaciones, setVotaciones] = useState<VotacionSocio[]>([]);

  // caso abierto en FLOTANTE para votar (decisión del director): el Socio abre el
  // caso, observa las evidencias de ambas partes y vota desde el modal.
  const [casoAbierto, setCasoAbierto] = useState<VotacionSocio | null>(null);
  const [evidenciaZoom, setEvidenciaZoom] = useState<{ ruta: string; alt: string } | null>(null);

  // detalle expandido (pruebas de ambas partes)
  const [detalle, setDetalle] = useState<Record<number, DetalleDisputa>>({});
  const [cargandoDetalle, setCargandoDetalle] = useState<number | null>(null);

  // formularios
  const [accionDe, setAccionDe] = useState<{ id: number; accion: "justificativo" | "no-conforme" } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [fotos, setFotos] = useState<FotoSubida[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const esSocioPadron = esSocio;

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const [d, t, p] = await Promise.all([
        misDisputas(token),
        misTruekes(token),
        padronDisputas(token).catch(() => ({ esSocio: false, totalSocios: 0, padron: [] })),
      ]);
      setDisputas(d.disputas ?? []);
      setTruekes(t.truekes ?? []);
      setEsSocio(Boolean(p.esSocio));
      if (p.esSocio) {
        const v = await votacionesDisputas(token).catch(() => ({ votaciones: [] }));
        setVotaciones(v.votaciones ?? []);
      } else {
        setVotaciones([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "no se pudieron cargar las disputas");
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    setDisputas([]);
    setTruekes([]);
    setVotaciones([]);
    setDetalle({});
    setError(null);
    setErrorAccion(null);
    setAviso(null);
    setAccionDe(null);
  }, [account]);

  /** Índice truekeId → trueque (títulos). */
  const truekesPorId = useMemo(() => new Map(truekes.map((t) => [t.id, t])), [truekes]);

  const tituloDe = (truekeId: number): string => {
    const t = truekesPorId.get(truekeId);
    if (t?.tituloA && t?.tituloB) return `${t.tituloA} ⇄ ${t.tituloB}`;
    return `Trueque #${truekeId}`;
  };

  /** Mi postura según mis cierres en el trueke (para saber si puedo justificar o declararme). */
  function miCierreEn(d: Disputa, account?: string | null): string | null {
    if (!account) return null;
    if (mismaWallet(d.usuarioA, account)) return d.cierreA ?? null;
    if (mismaWallet(d.usuarioB, account)) return d.cierreB ?? null;
    return null;
  }

  async function abrirDetalle(id: number) {
    if (!token) return;
    if (detalle[id]) {
      setDetalle((prev) => {
        const copia = { ...prev };
        delete copia[id];
        return copia;
      });
      return;
    }
    setCargandoDetalle(id);
    try {
      const dd = await detalleDisputa(token, id);
      setDetalle((prev) => ({ ...prev, [id]: dd }));
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : "no se pudo cargar el detalle");
    } finally {
      setCargandoDetalle(null);
    }
  }

  function abrirFormulario(d: Disputa, accion: "justificativo" | "no-conforme") {
    setAccionDe({ id: d.id, accion });
    setMotivo("");
    setFotos([]);
    setAviso(null);
    setErrorAccion(null);
  }

  async function enviarFormulario(d: Disputa) {
    if (!token || !accionDe || accionDe.id !== d.id) return;
    setOcupado(true);
    setErrorAccion(null);
    try {
      if (fotos.length === 0) throw new Error("Subí al menos una foto.");
      if (accionDe.accion === "justificativo") {
        await cargarJustificativo(token, d.id, fotos);
        setAviso("✅ Justificativo cargado: la disputa pasa a votación de Socios.");
      } else {
        if (!motivo.trim()) throw new Error("Describí el motivo de tu No Conforme.");
        await declararNoConforme(token, d.id, { motivo: motivo.trim(), fotos });
        setAviso("✅ Reclamo registrado: ambas partes aportaron evidencia → votación de Socios.");
      }
      setAccionDe(null);
      setMotivo("");
      setFotos([]);
      await cargar();
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : "no se pudo enviar");
    } finally {
      setOcupado(false);
    }
  }

  /** Vota desde la tarjeta o el flotante; refresca el caso abierto con el resultado. */
  async function votar(d: VotacionSocio, voto: "ANULAR" | "VALIDO") {
    if (!token) return;
    setOcupado(true);
    setErrorAccion(null);
    try {
      const r = await votarDisputa(token, d.id, voto);
      setAviso(voto === "ANULAR" ? "🗳️ Votaste ANULAR (devolución)." : "🗳️ Votaste VALIDO (el trueke se completa).");
      // si la votación se cerró con este voto (mayoría simple), el flotante refleja la RESUELTA
      if (casoAbierto?.id === d.id) {
        setCasoAbierto((prev) =>
          prev ? { ...prev, miVoto: voto, estado: r.disputa.estado, veredicto: r.disputa.veredicto ?? prev.veredicto, resolucion: r.disputa.resolucion ?? prev.resolucion } : prev
        );
      }
      await cargar();
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : "no se pudo votar");
    } finally {
      setOcupado(false);
    }
  }

  function noDisputasActivas() {
    return disputas.length === 0 && !cargando && !error;
  }

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-800">⚖️ Disputas</h1>
          <p className="text-sm text-navy-800/60">
            Flujo del director: ✗ No Conforme (con motivo + fotos) → justificativo del
            conforme → votación de Socios → veredicto (ANULAR o VALIDO).
          </p>
        </div>
        {account && (
          <p className="font-mono text-[10px] text-navy-800/40">{resumirWallet(account)}</p>
        )}
      </div>

      {/* Sin token: respaldo del guard de la suite */}
      {!token && (
        <Card className="p-8 text-center">
          <p className="text-3xl">🔏</p>
          <h2 className="mt-2 font-display text-lg font-semibold text-navy-800">
            Inicia sesión para ver tus disputas
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-navy-800/60">
            Inicia sesión desde el menú superior con tu billetera (una sola firma).
          </p>
        </Card>
      )}

      {token && (
        <>
          {aviso && (
            <p className="rounded-xl border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-xs text-navy-800/80">
              ✅ {aviso}
            </p>
          )}
          {errorAccion && (
            <p className="rounded-xl bg-crimson/10 px-4 py-2 text-xs text-crimson">⚠️ {errorAccion}</p>
          )}

          {/* Aviso para Socios */}
          {esSocioPadron && (
            <div className="rounded-xl border border-gold-500/40 bg-gold-500/10 px-4 py-3 text-sm text-navy-800/80">
              🏛️ <strong>Como Socio</strong> resolvés las disputas votando{" "}
              <strong>ANULAR</strong> (devolución total de los NFTs en custodia) o{" "}
              <strong>VALIDO</strong> (el trueke se completa). Un voto por Socio; si sos
              parte del trueke en disputa <strong>no podés votar</strong> (punto 4).
            </div>
          )}

          {/* Sección 1 — Mis disputas activas */}
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-navy-800">Mis disputas</h2>
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
              <Card className="p-8 text-center text-sm text-navy-800/50">Cargando disputas…</Card>
            )}

            {!cargando && error && (
              <Card className="p-6 text-center">
                <p className="text-sm text-crimson">No se pudieron cargar las disputas.</p>
                <p className="mt-1 text-xs text-navy-800/50">{error}</p>
                <div className="mt-4">
                  <Button variante="outline-navy" onClick={() => void cargar()}>↻ Reintentar</Button>
                </div>
              </Card>
            )}

            {noDisputasActivas() && (
              <Card className="p-8 text-center">
                <p className="text-3xl">🕊️</p>
                <h3 className="mt-2 font-display text-lg font-semibold text-navy-800">
                  No tenés disputas activas
                </h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-navy-800/60">
                  Cuando una parte declare <strong>✗ No Conforme</strong> en el cierre del
                  trueque (formulario con motivo + fotos), la disputa aparecerá acá y
                  seguirá el flujo: justificativo → votación de Socios → veredicto.
                </p>
              </Card>
            )}

            {!cargando && !error && disputas.length > 0 && (
              <div className="space-y-3">
                {disputas.map((d) => {
                  const rol = miRol(d, account, esSocioPadron);
                  const miCierre = miCierreEn(d, account);
                  const contraparte = mismaWallet(d.solicitante, account) ? (mismaWallet(d.usuarioA, account) ? d.usuarioB : d.usuarioA) : d.solicitante;
                  const elDetalle = detalle[d.id];
                  return (
                    <Card key={d.id} className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display text-base font-bold text-navy-800">
                            {tituloDe(d.truekeId)}
                          </p>
                          <p className="mt-0.5 text-xs text-navy-800/50">
                            {rol === "reclamante" ? (
                              <>Reclamante: <strong className="text-navy-800">vos</strong> · Contraparte: <span className="font-mono">{resumirWallet(contraparte)}</span></>
                            ) : rol === "contraparte" ? (
                              <>Contraparte: <strong className="text-navy-800">vos</strong> · Reclamante: <span className="font-mono">{resumirWallet(d.solicitante)}</span></>
                            ) : (
                              <>Partes: <span className="font-mono">{resumirWallet(d.usuarioA)}</span> ⇄ <span className="font-mono">{resumirWallet(d.usuarioB)}</span></>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge estado={d.estado} tono={tonoDeDisputa(d.estado)} />
                          <StatusBadge estado={d.estadoTrueke} />
                        </div>
                      </div>

                      <p className="mt-2 rounded-xl bg-smoke px-3 py-2 text-xs italic text-navy-800/70">
                        “{d.motivo ?? "Sin motivo"}”
                      </p>

                      {/* Mi acción pendiente */}
                      {rol === "contraparte" && ["REPORTADA", "ESPERA_JUSTIFICATIVO"].includes(d.estado) && miCierre !== "NO_CONFORME" && (
                        <div className="mt-3 rounded-xl border border-coral/30 bg-coral/5 px-3 py-2">
                          <p className="text-xs font-semibold text-navy-800/80">
                            {miCierre === "CONFORME" || d.estado === "ESPERA_JUSTIFICATIVO" ? (
                              <>📷 La contraparte declaró No Conforme y vos estás conforme: cargá tu <strong>justificativo con fotos</strong> (plazo 3 días).</>
                            ) : (
                              <>Declará tu postura: si estás conforme cargá tu justificativo, o declará tu propio No Conforme con fotos.</>
                            )}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              className="!px-3 !py-1.5 !text-xs"
                              disabled={ocupado || !token}
                              onClick={() => abrirFormulario(d, "justificativo")}
                            >
                              ✓ Estoy conforme — cargar justificativo
                            </Button>
                            {!miCierre && (
                              <Button
                                variante="outline-navy"
                                className="!px-3 !py-1.5 !text-xs !border-crimson !text-crimson hover:!bg-crimson/5"
                                disabled={ocupado || !token}
                                onClick={() => abrirFormulario(d, "no-conforme")}
                              >
                                ✗ También No Conforme
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Formulario activo */}
                      {accionDe?.id === d.id && rol === "contraparte" && (
                        <div className="mt-3 space-y-3 rounded-xl border border-navy-800/10 bg-white p-3">
                          <SubirFotos fotos={fotos} onChange={setFotos} max={5} etiqueta="Tus fotos de evidencia" />
                          {accionDe.accion === "no-conforme" && (
                            <div>
                              <label htmlFor={`motivo-${d.id}`} className="mb-1 block text-xs font-semibold text-navy-800/70">
                                Motivo de tu No Conforme <span className="font-normal text-navy-800/40">(obligatorio)</span>
                              </label>
                              <textarea
                                id={`motivo-${d.id}`}
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                rows={2}
                                maxLength={500}
                                placeholder="Ej.: lo que recibí no coincide con lo acordado…"
                                className={inputCls}
                              />
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              className="!px-3 !py-1.5 !text-xs"
                              disabled={
                                ocupado ||
                                fotos.length === 0 ||
                                (accionDe.accion === "no-conforme" && !motivo.trim())
                              }
                              onClick={() => void enviarFormulario(d)}
                            >
                              {ocupado
                                ? "Enviando…"
                                : accionDe.accion === "justificativo"
                                  ? "📷 Enviar justificativo"
                                  : "✗ Declarar mi No Conforme"}
                            </Button>
                            <Button variante="outline-navy" className="!px-3 !py-1.5 !text-xs" onClick={() => setAccionDe(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Plazos y veredicto */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-navy-800/50">
                        <span>🗓 {formatearFecha(d.createdAt)}</span>
                        {d.estado === "ESPERA_JUSTIFICATIVO" && d.justificativoVenceAt && (
                          <span className="text-coral">⏳ Justificativo vence: {formatearFecha(d.justificativoVenceAt)}</span>
                        )}
                        {d.estado === "EN_VOTACION" && d.votacionVenceAt && (
                          <span>🗳️ Votación vence: {formatearFecha(d.votacionVenceAt)}</span>
                        )}
                        {d.estado === "RESUELTA" && (
                          <span>
                            {d.veredicto === "ANULAR" ? (
                              <strong className="text-crimson">Veredicto: ANULAR — devolución total</strong>
                            ) : d.veredicto === "VALIDO" ? (
                              <strong className="text-teal-600">Veredicto: VALIDO — trueke completado</strong>
                            ) : null}
                            {d.resolucion ? <> · {d.resolucion}</> : null}
                          </span>
                        )}
                      </div>

                      {/* Ver pruebas (detalle con evidencias de ambas partes) */}
                      <div className="mt-3">
                        <Button
                          variante="outline-navy"
                          className="!px-3 !py-1.5 !text-xs"
                          onClick={() => void abrirDetalle(d.id)}
                          disabled={cargandoDetalle === d.id}
                        >
                          {elDetalle ? "▾ Ocultar pruebas" : "🔍 Ver pruebas de ambas partes"}
                        </Button>
                        {cargandoDetalle === d.id && (
                          <p className="mt-2 text-xs text-navy-800/50">Cargando pruebas…</p>
                        )}
                        {elDetalle && (
                          <div className="mt-3 grid gap-3 rounded-xl bg-smoke p-3 md:grid-cols-2">
                            <div>
                              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-navy-800/60">
                                🗣️ Reclamo ({resumirWallet(d.solicitante)})
                              </p>
                              {elDetalle.evidencias.filter((e) => e.tipo === "RECLAMO").length === 0 ? (
                                <p className="text-xs text-navy-800/40">Sin fotos del reclamo.</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {elDetalle.evidencias.filter((e) => e.tipo === "RECLAMO").map((e) => (
                                    <ImagenProtegida key={e.id} token={token!} ruta={urlEvidenciaDisputa(d.id, e.id)} alt="reclamo" className="h-20 w-20" />
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-navy-800/60">
                                📷 Justificativo del conforme
                              </p>
                              {elDetalle.evidencias.filter((e) => e.tipo === "JUSTIFICATIVO").length === 0 ? (
                                <p className="text-xs text-navy-800/40">Aún no cargó justificativo.</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {elDetalle.evidencias.filter((e) => e.tipo === "JUSTIFICATIVO").map((e) => (
                                    <ImagenProtegida key={e.id} token={token!} ruta={urlEvidenciaDisputa(d.id, e.id)} alt="justificativo" className="h-20 w-20" />
                                  ))}
                                </div>
                              )}
                            </div>
                            {elDetalle.votos.length > 0 && (
                              <p className="text-[11px] text-navy-800/50 md:col-span-2">
                                🗳️ Votos: {elDetalle.votos.filter((v) => v.voto === "ANULAR").length} ANULAR · {elDetalle.votos.filter((v) => v.voto === "VALIDO").length} VALIDO
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* Sección 2 — Votación de Socios */}
          {esSocioPadron && (
            <section>
              <h2 className="mb-3 font-display text-lg font-bold text-navy-800">
                🏛️ Votación de Socios
              </h2>
              <p className="mb-3 text-xs text-navy-800/60">
                Abrí el caso en el flotante para observar las evidencias de ambas partes
                y votar (ANULAR = devolución total · VALIDO = trueke completado).
              </p>
              {votaciones.length === 0 ? (
                <Card className="p-6 text-center text-sm text-navy-800/50">
                  No hay votaciones abiertas ni resueltas recientes.
                </Card>
              ) : (
                <div className="space-y-3">
                  {votaciones.map((v) => {
                    const t = truekesPorId.get(v.truekeId);
                    const reclamos = v.evidencias.filter((e) => e.tipo === "RECLAMO");
                    const justif = v.evidencias.filter((e) => e.tipo === "JUSTIFICATIVO");
                    return (
                      <Card key={v.id} className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-display text-base font-bold text-navy-800">
                              {t?.tituloA && t?.tituloB ? `${t.tituloA} ⇄ ${t.tituloB}` : `Trueque #${v.truekeId}`}
                            </p>
                            <p className="mt-0.5 text-xs text-navy-800/50">
                              {resumirWallet(v.usuarioA)} ⇄ {resumirWallet(v.usuarioB)} · “{v.motivo ?? ""}”
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <StatusBadge estado={v.estado} tono={tonoDeDisputa(v.estado)} />
                            <span className="text-[11px] text-navy-800/45">
                              📸 {reclamos.length} reclamo · {justif.length} justificativo
                            </span>
                          </div>
                        </div>

                        {/* resumen de votos */}
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[11px] text-navy-800/50">
                            🗳️ {v.votos.filter((x) => x.voto === "ANULAR").length} ANULAR ·{" "}
                            {v.votos.filter((x) => x.voto === "VALIDO").length} VALIDO
                            {v.votacionVenceAt ? ` · vence ${formatearFecha(v.votacionVenceAt)}` : ""}
                          </p>
                          {v.estado === "RESUELTA" ? (
                            <span className="text-xs font-semibold text-navy-800/70">
                              {v.veredicto === "ANULAR" ? "❌ ANULAR — devolución total" : "✅ VALIDO — trueke completado"}
                            </span>
                          ) : v.soyParte ? (
                            <span className="text-xs font-semibold text-crimson">Sos parte del trueke: no podés votar</span>
                          ) : v.miVoto ? (
                            <span className="text-xs font-semibold text-teal-600">✓ Ya votaste: {v.miVoto}</span>
                          ) : null}
                        </div>

                        {/* apertura del caso en flotante */}
                        <div className="mt-3">
                          <Button
                            className="!px-3 !py-1.5 !text-xs"
                            disabled={!token}
                            onClick={() => setCasoAbierto(v)}
                          >
                            📂 Ver caso y votar
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Nota de origen del flujo */}
          <Card className="p-4 text-xs text-navy-800/60">
            💡 <strong>Origen de la disputa:</strong> la disputa nace en el cierre del
            trueque cuando una parte declara <strong>✗ No Conforme</strong> (botón en{" "}
            <em>Trueke Central</em>) y completa el formulario con motivo y fotos. Acá
            seguís el flujo: justificativo del conforme (3 días) → votación de Socios
            (5 días, mayoría simple) → veredicto.
          </Card>
        </>
      )}

      {/* ====================================================================
          FLOTANTE del caso en votación (decisión del director): el Socio abre el
          caso, observa las evidencias de AMBAS partes y vota (ANULAR/VALIDO).
          ==================================================================== */}
      {casoAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/70 p-4 backdrop-blur-sm"
          onClick={() => setCasoAbierto(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Caso de votación ${casoAbierto.id}`}
          >
            {/* Cabecera del caso */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-navy-800/10 bg-smoke px-5 py-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-navy-800/50">
                  Disputa #{casoAbierto.id} · Trueke #{casoAbierto.truekeId}
                </p>
                <h3 className="font-display text-lg font-bold leading-snug text-navy-800">
                  {(() => {
                    const t = truekesPorId.get(casoAbierto.truekeId);
                    return t?.tituloA && t?.tituloB ? `${t.tituloA} ⇄ ${t.tituloB}` : `Trueque #${casoAbierto.truekeId}`;
                  })()}
                </h3>
                <p className="mt-0.5 text-xs text-navy-800/55">
                  {resumirWallet(casoAbierto.usuarioA)} ⇄ {resumirWallet(casoAbierto.usuarioB)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <StatusBadge estado={casoAbierto.estado} tono={tonoDeDisputa(casoAbierto.estado)} />
                <button
                  onClick={() => setCasoAbierto(null)}
                  aria-label="Cerrar caso"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-navy-800/60 transition-colors hover:bg-navy-800/10 hover:text-navy-800"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-4 px-5 py-4">
              {/* Motivo del reclamo */}
              <div className="rounded-xl bg-coral/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-coral">
                  🗣️ Motivo del reclamo ({resumirWallet(casoAbierto.solicitante)})
                </p>
                <p className="mt-1 text-sm italic text-navy-800/80">“{casoAbierto.motivo ?? "Sin motivo"}”</p>
              </div>

              {/* Evidencias de ambas partes (clic para ampliar) */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-navy-800/10 p-3">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-navy-800/60">
                    🗣️ Reclamo — evidencia del reclamante
                  </p>
                  {casoAbierto.evidencias.filter((e) => e.tipo === "RECLAMO").length === 0 ? (
                    <p className="text-xs text-navy-800/40">Sin fotos del reclamo.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {casoAbierto.evidencias.filter((e) => e.tipo === "RECLAMO").map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setEvidenciaZoom({ ruta: urlEvidenciaDisputa(casoAbierto.id, e.id), alt: "Evidencia del reclamo" })}
                          className="group relative overflow-hidden rounded-lg border border-navy-800/10"
                          title="Ampliar evidencia"
                        >
                          <ImagenProtegida token={token!} ruta={urlEvidenciaDisputa(casoAbierto.id, e.id)} alt="reclamo" className="h-24 w-full" />
                          <span className="absolute inset-0 flex items-center justify-center bg-navy-900/0 text-white/0 transition-colors group-hover:bg-navy-900/40 group-hover:text-white">
                            🔍
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-navy-800/10 p-3">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-navy-800/60">
                    📷 Justificativo — evidencia del conforme
                  </p>
                  {casoAbierto.evidencias.filter((e) => e.tipo === "JUSTIFICATIVO").length === 0 ? (
                    <p className="text-xs text-navy-800/40">Sin fotos del justificativo.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {casoAbierto.evidencias.filter((e) => e.tipo === "JUSTIFICATIVO").map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setEvidenciaZoom({ ruta: urlEvidenciaDisputa(casoAbierto.id, e.id), alt: "Justificativo del conforme" })}
                          className="group relative overflow-hidden rounded-lg border border-navy-800/10"
                          title="Ampliar evidencia"
                        >
                          <ImagenProtegida token={token!} ruta={urlEvidenciaDisputa(casoAbierto.id, e.id)} alt="justificativo" className="h-24 w-full" />
                          <span className="absolute inset-0 flex items-center justify-center bg-navy-900/0 text-white/0 transition-colors group-hover:bg-navy-900/40 group-hover:text-white">
                            🔍
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Estado de la votación */}
              <div className="rounded-xl bg-smoke px-4 py-3 text-xs text-navy-800/70">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    🗳️ Votos:{" "}
                    <strong className="text-crimson">{casoAbierto.votos.filter((x) => x.voto === "ANULAR").length} ANULAR</strong>{" "}
                    ·{" "}
                    <strong className="text-teal-600">{casoAbierto.votos.filter((x) => x.voto === "VALIDO").length} VALIDO</strong>
                  </span>
                  {casoAbierto.votacionVenceAt && casoAbierto.estado === "EN_VOTACION" && (
                    <span>⏳ Vence: {formatearFecha(casoAbierto.votacionVenceAt)}</span>
                  )}
                </div>
                {casoAbierto.resolucion && (
                  <p className="mt-2 border-t border-navy-800/10 pt-2 italic text-navy-800/60">
                    {casoAbierto.resolucion}
                  </p>
                )}
              </div>

              {/* Acción de voto dentro del flotante */}
              <div className="sticky bottom-0 rounded-xl border border-gold-500/30 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
                {casoAbierto.estado === "RESUELTA" ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-navy-800/80">
                      {casoAbierto.veredicto === "ANULAR" ? (
                        <>❌ Veredicto: <span className="text-crimson">ANULAR</span> — devolución total de los NFTs en custodia</>
                      ) : (
                        <>✅ Veredicto: <span className="text-teal-600">VALIDO</span> — el trueke se completó</>
                      )}
                    </p>
                    <Button variante="outline-navy" className="!px-3 !py-1.5 !text-xs" onClick={() => setCasoAbierto(null)}>
                      Cerrar
                    </Button>
                  </div>
                ) : casoAbierto.soyParte ? (
                  <p className="text-center text-sm font-semibold text-crimson">
                    Sos parte del trueke en disputa: los Socios involucrados no pueden votar (punto 4).
                  </p>
                ) : casoAbierto.miVoto ? (
                  <p className="text-center text-sm font-semibold text-teal-600">
                    ✓ Ya votaste: <strong>{casoAbierto.miVoto}</strong> — 1 voto por Socio (D21).
                  </p>
                ) : (
                  <>
                    <p className="mb-2 text-center text-xs font-semibold text-navy-800/70">
                      Observaste las evidencias de ambas partes — ahora votá:
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button
                        className="!px-4 !py-2 !text-sm !bg-crimson hover:!bg-crimson/90"
                        disabled={ocupado || !token}
                        onClick={() => void votar(casoAbierto, "ANULAR")}
                      >
                        🗳️ ANULAR — devolución total
                      </Button>
                      <Button
                        className="!px-4 !py-2 !text-sm !bg-[linear-gradient(135deg,#2a9d8f,#2a9d8f)]"
                        disabled={ocupado || !token}
                        onClick={() => void votar(casoAbierto, "VALIDO")}
                      >
                        🗳️ VALIDO — completar trueke
                      </Button>
                      {ocupado && <span className="text-xs text-navy-800/50">Enviando voto…</span>}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zoom de evidencia dentro del flotante */}
      {evidenciaZoom && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-900/85 p-6"
          onClick={() => setEvidenciaZoom(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Evidencia ampliada"
        >
          <div className="relative max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <ImagenProtegida
              token={token!}
              ruta={evidenciaZoom.ruta}
              alt={evidenciaZoom.alt}
              className="max-h-[85vh] w-auto rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setEvidenciaZoom(null)}
              aria-label="Cerrar evidencia"
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-navy-800 shadow-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
