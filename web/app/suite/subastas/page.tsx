"use client";

// =============================================================================
// TrueKeate — Suite: Subastas (/suite/subastas) — RF-17 · CU-25/26 · D27
// =============================================================================
// · La EMPRESA crea subastas con sus artículos publicados (RF-17.1).
// · El usuario CERTIFICADO puja (RF-17.2) con prioridad por nivel en el empate.
// · Gana el mayor valor; empate → mayor nivel (D27). El cierre es automático al
//   vencer el plazo (lazy en el backend): se muestra el ganador al actualizar.
// =============================================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { useSesionAutenticada } from "@/lib/useSesionAutenticada";
import {
  listarSubastas,
  misSubastas,
  crearSubasta,
  pujarSubasta,
  cerrarSubasta,
  obtenerCatalogo,
  type ArticuloCatalogo,
  type Subasta,
} from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";

const inputCls =
  "w-full rounded-xl border border-navy-800/15 bg-white px-3 py-2 text-sm text-navy-800 outline-none transition-colors focus:border-teal-500";

function resumirWallet(w?: string | null): string {
  if (!w) return "—";
  return w.length > 12 ? `${w.slice(0, 6)}…${w.slice(-4)}` : w;
}

function misma(a?: string | null, b?: string | null): boolean {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

function formatearFecha(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function tonoEstado(estado: string): "teal" | "gold" | "smoke" {
  if (estado === "ABIERTA") return "teal";
  if (estado === "CERRADA") return "gold";
  return "smoke"; // ANULADA
}

export default function PaginaSubastas() {
  const { account } = useEthereum();
  const { acceso } = useSesion();
  const { token } = useSesionAutenticada();

  const inscrito = acceso.fase === "inscrito" ? acceso.usuario : null;
  const esEmpresa = inscrito?.tipo === "EMPRESA";
  const esCertificado = inscrito?.estado === "CERTIFICADO" || inscrito?.tipo === "SOCIO";

  const [abiertas, setAbiertas] = useState<Subasta[]>([]);
  const [cerradas, setCerradas] = useState<Subasta[]>([]);
  const [creadas, setCreadas] = useState<Subasta[]>([]);
  const [pujadas, setPujadas] = useState<Subasta[]>([]);
  const [misArticulos, setMisArticulos] = useState<ArticuloCatalogo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // pestania
  const [pestana, setPestana] = useState<"abiertas" | "cerradas" | "mias">("abiertas");

  // formulario alta (Empresa)
  const [altaAbierto, setAltaAbierto] = useState(false);
  const [artSel, setArtSel] = useState("");
  const [pujaInicial, setPujaInicial] = useState("100");
  const [incremento, setIncremento] = useState("10");
  const [duracion, setDuracion] = useState("24");
  const [enviandoAlta, setEnviandoAlta] = useState(false);
  const [errorAlta, setErrorAlta] = useState<string | null>(null);

  // puja inline
  const [pujaDe, setPujaDe] = useState<number | null>(null);
  const [valorPuja, setValorPuja] = useState("");
  const [enviandoPuja, setEnviandoPuja] = useState(false);
  const [errorPuja, setErrorPuja] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [ab, cer, cat] = await Promise.all([
        listarSubastas(token, "ABIERTA"),
        listarSubastas(token, "TODAS"),
        obtenerCatalogo(),
      ]);
      setAbiertas(ab.subastas ?? []);
      const cerradasRecientes = (cer.subastas ?? []).filter((s) => s.estado !== "ABIERTA");
      setCerradas(cerradasRecientes);
      setMisArticulos(cat.filter((a) => misma(a.usuarioWallet, account) && a.disponible !== false));
      if (token) {
        const m = await misSubastas(token);
        setCreadas(m.creadas ?? []);
        setPujadas(m.pujadas ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "no se pudieron cargar las subastas");
    } finally {
      setCargando(false);
    }
  }, [token, account]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // ultima puja de una subasta
  const ultimaPuja = (s: Subasta) => s.pujas?.[s.pujas.length - 1] ?? null;
  const miPujaMax = (s: Subasta) =>
    s.pujas?.filter((p) => misma(p.wallet, account)).reduce((m, p) => Math.max(m, p.valor), 0) ?? 0;
  const estoyPujando = (s: Subasta) =>
    Boolean(account) && s.pujas?.some((p) => misma(p.wallet, account));
  const pujaMinima = (s: Subasta) => {
    const ult = ultimaPuja(s);
    return ult ? ult.valor + s.incrementoMinimo : s.pujaInicial;
  };

  async function enviarAlta(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setEnviandoAlta(true);
    setErrorAlta(null);
    try {
      await crearSubasta(token, {
        articuloId: Number(artSel),
        pujaInicial: Number(pujaInicial),
        incrementoMinimo: Number(incremento) || 0,
        duracionHoras: Number(duracion) || 24,
      });
      setAviso("✅ Subasta creada. Se cierra automáticamente al vencer el plazo (D27).");
      setAltaAbierto(false);
      await cargar();
    } catch (e) {
      setErrorAlta(e instanceof Error ? e.message : "no se pudo crear la subasta");
    } finally {
      setEnviandoAlta(false);
    }
  }

  async function enviarPuja(s: Subasta) {
    if (!token) return;
    const v = Number(valorPuja);
    if (!Number.isFinite(v) || v <= 0) {
      setErrorPuja("Ingresá un valor válido.");
      return;
    }
    setEnviandoPuja(true);
    setErrorPuja(null);
    try {
      await pujarSubasta(token, s.id, v);
      setAviso("🗳️ Puja registrada.");
      setPujaDe(null);
      setValorPuja("");
      await cargar();
    } catch (e) {
      setErrorPuja(e instanceof Error ? e.message : "no se pudo pujar");
    } finally {
      setEnviandoPuja(false);
    }
  }

  async function cerrarManual(s: Subasta) {
    if (!token) return;
    setError(null);
    try {
      const r = await cerrarSubasta(token, s.id);
      setAviso(r.ganador ? `🏆 Adjudicada a ${resumirWallet(r.ganador.wallet)} por ${r.ganador.valor}.` : "Subasta anulada (sin pujas).");
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "no se pudo cerrar");
    }
  }

  // tarjeta de una subasta
  const Tarjeta = ({ s, enMias = false }: { s: Subasta; enMias?: boolean }) => {
    const ult = ultimaPuja(s);
    const vencida = s.estado === "ABIERTA" && s.cierraEn && new Date(s.cierraEn).getTime() < Date.now();
    const soyEmpresa = misma(s.empresa, account);
    const puedePujar = esCertificado && !soyEmpresa && s.estado === "ABIERTA" && !vencida;
    return (
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-bold text-navy-800">
              {s.articuloTitulo ?? `Artículo #${s.articuloId ?? "—"}`}
            </p>
            <p className="mt-0.5 text-xs text-navy-800/50">
              Subasta #{s.id} · por {s.empresaUsername ?? resumirWallet(s.empresa)}
              {s.articuloRubro ? ` · ${s.articuloRubro}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge estado={s.estado} tono={tonoEstado(s.estado)} />
            {s.estado === "ABIERTA" && s.cierraEn && (
              <span className={`text-[10px] font-semibold ${vencida ? "text-crimson" : "text-navy-800/50"}`}>
                {vencida ? "Vencida — por adjudicar" : `Cierra: ${formatearFecha(s.cierraEn)}`}
              </span>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-navy-800/60">
          <span>💶 Puja inicial: <strong>{s.pujaInicial}</strong></span>
          <span>📈 Incremento: <strong>{s.incrementoMinimo}</strong></span>
          <span>🕓 {s.duracionHoras} h</span>
          <span>🗳️ {s.pujas?.length ?? 0} puja{s?.pujas?.length === 1 ? "" : "s"}</span>
        </div>

        {/* estado de mi puja / puja actual */}
        {s.pujas && s.pujas.length > 0 && (
          <p className="mt-2 rounded-lg bg-smoke px-3 py-1.5 text-[11px] text-navy-800/70">
            Mejor puja: <strong>{ult.valor}</strong> ({resumirWallet(ult.wallet)})
            {estoyPujando(s) ? ` · tu puja: ${miPujaMax(s)}` : ""}
          </p>
        )}

        {s.estado === "CERRADA" && s.ganador && (
          <p className="mt-2 rounded-lg bg-gold-500/10 px-3 py-1.5 text-[11px] font-semibold text-navy-800/80">
            🏆 Ganador: {resumirWallet(s.ganador.wallet)} por {s.ganador.valor}
            {s.ganador.nivel ? ` (nivel ${s.ganador.nivel})` : ""}
          </p>
        )}
        {s.estado === "ANULADA" && (
          <p className="mt-2 rounded-lg bg-smoke px-3 py-1.5 text-[11px] text-navy-800/50">Sin pujas: subasta anulada.</p>
        )}

        {/* acciones */}
        <div className="mt-3 flex flex-wrap gap-2 border-t border-navy-800/5 pt-2">
          {vencida && soyEmpresa && (
            <Button className="!px-3 !py-1.5 !text-xs" onClick={() => void cerrarManual(s)}>
              🏁 Cerrar y adjudicar
            </Button>
          )}
          {puedePujar && (
            pujaDe === s.id ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={pujaMinima(s)}
                  step="any"
                  value={valorPuja}
                  onChange={(e) => setValorPuja(e.target.value)}
                  placeholder={`mín ${pujaMinima(s)}`}
                  className={`${inputCls} !w-28`}
                  autoFocus
                />
                <Button className="!px-3 !py-1.5 !text-xs" disabled={enviandoPuja} onClick={() => void enviarPuja(s)}>
                  {enviandoPuja ? "…" : "Confirmar puja"}
                </Button>
                <Button variante="outline-navy" className="!px-3 !py-1.5 !text-xs" onClick={() => { setPujaDe(null); setErrorPuja(null); }}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button className="!px-3 !py-1.5 !text-xs" onClick={() => { setPujaDe(s.id); setValorPuja(String(pujaMinima(s))); setErrorPuja(null); }}>
                🗳️ Pujar ({pujaMinima(s)})
              </Button>
            )
          )}
          {pujaDe === s.id && errorPuja && <span className="self-center text-[11px] text-crimson">⚠️ {errorPuja}</span>}
        </div>
      </Card>
    );
  };

  const listadoAbiertas = abiertas;
  const listadoMias = useMemo(() => {
    const ids = new Set([...creadas, ...pujadas].map((s) => s.id));
    return [...creadas, ...abiertas.filter((s) => ids.has(s.id) && !creadas.some((c) => c.id === s.id)), ...pujadas];
  }, [creadas, pujadas, abiertas]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-800">🔨 Subastas</h1>
          <p className="text-sm text-navy-800/60">
            La <strong>Empresa</strong> subasta sus lotes (RF-17.1); el usuario{" "}
            <strong>Certificado</strong> puja (RF-17.2). Gana el mayor valor; empate
            → mayor nivel (D27).
          </p>
        </div>
        {esEmpresa && (
          <Button onClick={() => { setAltaAbierto(true); setErrorAlta(null); }} className="!px-4 !py-2 !text-sm">
            ＋ Crear subasta
          </Button>
        )}
      </div>

      {!token && (
        <Card className="p-8 text-center">
          <p className="text-3xl">🔏</p>
          <p className="mt-2 text-sm text-navy-800/70">
            Inicia sesión desde el menú superior para pujar o crear subastas. El
            catálogo de subastas abiertas es observable por todos.
          </p>
        </Card>
      )}

      {aviso && <p className="rounded-xl border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-xs text-navy-800/80">{aviso}</p>}
      {error && <p className="rounded-xl bg-crimson/10 px-4 py-2 text-xs text-crimson">⚠️ {error}</p>}

      {/* Pestañas */}
      <div className="flex gap-1 rounded-pill bg-smoke p-1" role="tablist" aria-label="Filtro de subastas">
        {([
          ["abiertas", `Abiertas (${abiertas.length})`],
          ["cerradas", `Cerradas (${cerradas.length})`],
          ["mias", `Las mías (${listadoMias.length})`],
        ] as const).map(([clave, etiqueta]) => (
          <button
            key={clave}
            role="tab"
            aria-selected={pestana === clave}
            onClick={() => setPestana(clave)}
            className={`flex-1 rounded-pill px-3 py-1.5 text-xs font-semibold transition-colors ${
              pestana === clave ? "bg-navy-800 text-white shadow" : "text-navy-800/60 hover:bg-white/60"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {cargando && <p className="py-8 text-center text-sm text-navy-800/50">Cargando subastas…</p>}

      {!cargando && pestana === "abiertas" && (
        listadoAbiertas.length === 0 ? (
          <Card className="p-8 text-center text-sm text-navy-800/50">No hay subastas abiertas en este momento.</Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {listadoAbiertas.map((s) => <Tarjeta key={s.id} s={s} />)}
          </div>
        )
      )}

      {!cargando && pestana === "cerradas" && (
        cerradas.length === 0 ? (
          <Card className="p-8 text-center text-sm text-navy-800/50">Todavía no hay subastas cerradas.</Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {cerradas.map((s) => <Tarjeta key={s.id} s={s} />)}
          </div>
        )
      )}

      {!cargando && pestana === "mias" && (
        !token ? (
          <Card className="p-8 text-center text-sm text-navy-800/50">Iniciá sesión para ver tus subastas.</Card>
        ) : listadoMias.length === 0 ? (
          <Card className="p-8 text-center text-sm text-navy-800/50">
            {esEmpresa ? "Todavía no creaste subastas." : "Todavía no pujaste en ninguna subasta."}
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {listadoMias.map((s) => <Tarjeta key={s.id} s={s} enMias />)}
          </div>
        )
      )}

      {/* Modal: crear subasta (Empresa) */}
      {altaAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-4 backdrop-blur-sm" onClick={() => setAltaAbierto(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Crear subasta">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-navy-800">＋ Crear subasta</h2>
                <p className="mt-0.5 text-xs text-navy-800/55">
                  Elegí un artículo tuyo publicado y definí las reglas (RF-17.1). Al
                  vencer el plazo se adjudica al mayor valor (D27).
                </p>
              </div>
              <button onClick={() => setAltaAbierto(false)} aria-label="Cerrar" className="flex h-8 w-8 items-center justify-center rounded-full text-navy-800/60 hover:bg-navy-800/10">✕</button>
            </div>

            {misArticulos.length === 0 && (
              <p className="mt-3 rounded-xl bg-gold-500/10 px-3 py-2 text-xs text-navy-800/70">
                No tenés artículos publicados para subastar. Publicá uno desde{" "}
                <strong>Mi Inventario</strong>.
              </p>
            )}

            {misArticulos.length > 0 && (
              <form onSubmit={enviarAlta} className="mt-4 space-y-3">
                <div>
                  <label htmlFor="art-sel" className="mb-1 block text-xs font-semibold text-navy-800/60">Artículo a subastar *</label>
                  <select id="art-sel" required value={artSel} onChange={(e) => setArtSel(e.target.value)} className={inputCls}>
                    <option value="">Elegí un artículo…</option>
                    {misArticulos.map((a) => (
                      <option key={a.id} value={a.id}>{a.titulo} (#{a.id})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label htmlFor="puja-ini" className="mb-1 block text-xs font-semibold text-navy-800/60">Puja inicial *</label>
                    <input id="puja-ini" type="number" min="0" step="any" required value={pujaInicial} onChange={(e) => setPujaInicial(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="inc-min" className="mb-1 block text-xs font-semibold text-navy-800/60">Incremento mín.</label>
                    <input id="inc-min" type="number" min="0" step="any" value={incremento} onChange={(e) => setIncremento(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="dur-hs" className="mb-1 block text-xs font-semibold text-navy-800/60">Duración (h)</label>
                    <input id="dur-hs" type="number" min="1" value={duracion} onChange={(e) => setDuracion(e.target.value)} className={inputCls} />
                  </div>
                </div>
                {errorAlta && <p className="rounded-xl bg-crimson/10 px-3 py-2 text-xs text-crimson">⚠️ {errorAlta}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={enviandoAlta || !artSel}>
                    {enviandoAlta ? "Creando…" : "🔨 Crear subasta"}
                  </Button>
                  <Button type="button" variante="outline-navy" className="!px-3 !py-1.5 !text-xs" onClick={() => setAltaAbierto(false)}>Cancelar</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
