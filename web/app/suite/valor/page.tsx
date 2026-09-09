"use client";

// =============================================================================
// TrueKeate — VALOR (/suite/valor) — ex "Finanzas" (rediseño del director 2026-09-09)
// =============================================================================
// Sección VALOR con 3 subsecciones:
//   4.1 Criptos del socio (Recargar / Retirar / Convertir): los movimientos son
//       SIEMPRE entre el usuario y la PLATAFORMA como contraparte; no hay P2P
//       directo — entre socios la cripto solo se mueve a través de un Trueke.
//   4.2 Reputación: puntaje D12/D30 + trueques COMPLETADOS sin valorar (se
//       valora 1–5 aquí mismo) + últimos 10 trueques con su valoración.
//   4.3 BRLT (Recargar con Stripe Checkout / Retirar / Convertir): compra con
//       fiat usando Stripe (NO pasarela propia) — solo Empresa/SOCIO/Owner.
// VALOR es visible para todos los inscritos; el contenido de gestión (criptos y
// BRLT) se restringe por rol dentro de la página.
// =============================================================================
import { useCallback, useEffect, useState } from "react";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { useSesionAutenticada } from "@/lib/useSesionAutenticada";
import {
  valorMi,
  recargarCripto,
  retirarCripto,
  convertirCripto,
  checkoutBrlt,
  retirarBrlt,
  valorarTrueke,
  type ValorMi,
} from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";

const inputCls =
  "w-full rounded-xl border border-navy-800/15 bg-white px-3 py-2 text-sm text-navy-800 outline-none transition-colors focus:border-teal-500";

const DIMENSIONES_VALOR = [
  { clave: "aceptacion", label: "Aceptación" },
  { clave: "honestidad", label: "Honestidad" },
  { clave: "seguridad", label: "Seguridad" },
  { clave: "confiabilidad", label: "Confiabilidad" },
  { clave: "compromiso", label: "Compromiso" },
] as const;

function resumirWallet(w?: string | null): string {
  if (!w) return "—";
  return w.length > 12 ? `${w.slice(0, 6)}…${w.slice(-4)}` : w;
}

function misma(a?: string | null, b?: string | null): boolean {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

function formatear(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function PaginaValor() {
  const { account } = useEthereum();
  const { firmarAccion } = useSesion();
  const { token } = useSesionAutenticada();

  const [datos, setDatos] = useState<ValorMi | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // operaciones (monto + ocupado)
  const [monto, setMonto] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);

  // valoración inline de un pendiente
  const [valorandoId, setValorandoId] = useState<number | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [enviandoVal, setEnviandoVal] = useState(false);
  const [errorVal, setErrorVal] = useState<string | null>(null);

  const rol = datos?.rol ?? "";
  const gestiona = datos?.criptosHabilitado ?? false; // Empresa/SOCIO/Owner

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const v = await valorMi(token);
      setDatos(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : "no se pudo cargar VALOR");
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    setDatos(null);
    setError(null);
    setAviso(null);
  }, [account]);

  async function operar(accion: "recargar" | "retirar" | "convertir", desde?: "ETH" | "BRLT") {
    if (!token || !datos) return;
    const cantidad = Number(monto);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    setOcupado(accion);
    setError(null);
    setAviso(null);
    try {
      let mensaje = "";
      if (accion === "recargar") {
        await recargarCripto(token, cantidad);
        mensaje = `✅ ${cantidad} ETH recargados (contraparte: la plataforma).`;
      } else if (accion === "retirar") {
        const r = await retirarCripto(token, cantidad);
        mensaje = `✅ ${cantidad} ETH retirados a tu billetera (la plataforma los envía).${r.contraparte ? "" : ""}`;
      } else {
        const r = await convertirCripto(token, desde ?? "ETH", cantidad);
        mensaje = `✅ Conversión: ${r.monto} ${r.desde} → ${Object.entries(r.resultado).map(([k, v]) => `${v} ${k}`).join(", ")} (tasa ${r.tasa}).`;
      }
      setAviso(mensaje);
      setMonto("");
      await cargar();
    } catch (e) {
      const err = e as Error & { status?: number };
      setError(err.status === 409 ? "Saldo insuficiente." : (e instanceof Error ? e.message : "error en la operación"));
    } finally {
      setOcupado(null);
    }
  }

  async function comprarBrlt() {
    if (!token) return;
    const cantidad = Number(monto);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setError("Ingresá cuántos BRLT querés comprar.");
      return;
    }
    setOcupado("comprar");
    setError(null);
    setAviso(null);
    try {
      const r = await checkoutBrlt(token, cantidad);
      if ("error" in r && r.error) {
        // sin clave Stripe (demo): se informa del movimiento registrado
        setAviso(`ℹ️ ${r.detalle}`);
        await cargar();
      } else if ("url" in r && r.url) {
        setAviso("✅ Abriendo Stripe Checkout (pago con tarjeta, alojado por Stripe)…");
        window.open(r.url, "_blank", "noopener");
      }
      setMonto("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "no se pudo iniciar el pago");
    } finally {
      setOcupado(null);
    }
  }

  async function retirarBrltAccion() {
    if (!token) return;
    const cantidad = Number(monto);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    setOcupado("retirar-brlt");
    setError(null);
    setAviso(null);
    try {
      const r = await retirarBrlt(token, cantidad);
      setAviso(`✅ ${cantidad} BRLT retirados. ${r.aviso ?? ""}`);
      setMonto("");
      await cargar();
    } catch (e) {
      const err = e as Error & { status?: number };
      setError(err.status === 409 ? "Saldo insuficiente." : (e instanceof Error ? e.message : "error al retirar"));
    } finally {
      setOcupado(null);
    }
  }

  function abrirValoracion(truekeId: number) {
    setValores({});
    setErrorVal(null);
    setValorandoId((prev) => (prev === truekeId ? null : truekeId));
  }

  async function enviarValoracion(p: ValorMi["pendientesValoracion"][number]) {
    if (!token) return;
    const completos = DIMENSIONES_VALOR.every((d) => valores[d.clave] !== undefined && valores[d.clave] !== "");
    if (!completos) {
      setErrorVal("Completá las 5 valoraciones (1–5).");
      return;
    }
    setEnviandoVal(true);
    setErrorVal(null);
    try {
      const firma = await firmarAccion("valorar trueque");
      if (!firma) throw new Error("Firma requerida: desbloquea tu billetera.");
      await valorarTrueke(token, p.truekeId, {
        valorado: p.contraparte,
        aceptacion: Number(valores.aceptacion),
        honestidad: Number(valores.honestidad),
        seguridad: Number(valores.seguridad),
        confiabilidad: Number(valores.confiabilidad),
        compromiso: Number(valores.compromiso),
      }, firma);
      setAviso("✅ Valoración enviada (D18).");
      setValorandoId(null);
      await cargar();
    } catch (e) {
      setErrorVal(e instanceof Error ? e.message : "no se pudo valorar");
    } finally {
      setEnviandoVal(false);
    }
  }

  const saldos = datos?.saldos;
  const criptos = saldos?.criptos ?? {};
  const brlt = saldos?.brlt ?? 0;
  const rep = datos?.reputacion;

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-800">💎 VALOR</h1>
          <p className="text-sm text-navy-800/60">
            Tus criptos, tu reputación y BRLT. Los movimientos de cripto son{" "}
            <strong>siempre con la plataforma</strong>: entre socios, la cripto solo
            se mueve a través de un Trueke.
          </p>
        </div>
        <Button variante="outline-navy" onClick={() => void cargar()} disabled={cargando} className="!px-3 !py-1.5 !text-xs">
          {cargando ? "Cargando…" : "↻ Refrescar"}
        </Button>
      </div>

      {!token && (
        <Card className="p-8 text-center">
          <p className="text-3xl">🔏</p>
          <p className="mt-2 text-sm text-navy-800/70">
            Inicia sesión desde el menú superior para ver tu VALOR.
          </p>
        </Card>
      )}

      {token && cargando && !datos && (
        <p className="py-10 text-center text-sm text-navy-800/50">Cargando VALOR…</p>
      )}

      {token && !cargando && error && (
        <Card className="p-6 text-center">
          <p className="text-sm text-crimson">⚠️ {error}</p>
          <div className="mt-4">
            <Button variante="outline-navy" onClick={() => void cargar()}>↻ Reintentar</Button>
          </div>
        </Card>
      )}

      {aviso && <p className="rounded-xl border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-xs text-navy-800/80">{aviso}</p>}

      {token && datos && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4 text-center">
              <p className="text-2xl">🪙</p>
              <p className="mt-1 font-display text-xl font-bold text-navy-800">
                {gestiona ? (criptos.ETH ?? 0) : "—"}
              </p>
              <p className="text-xs text-navy-800/60">ETH (cripto)</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl">🏅</p>
              <p className="mt-1 font-display text-xl font-bold text-navy-800">{rep?.puntaje ?? "—"}</p>
              <p className="text-xs text-navy-800/60">
                Reputación · {rep?.nivel ?? ""} ({rep?.medalla ?? ""})
              </p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl">💎</p>
              <p className="mt-1 font-display text-xl font-bold text-navy-800">
                {datos.brltHabilitado ? brlt : "—"}
              </p>
              <p className="text-xs text-navy-800/60">BRLT{datos.brltHabilitado ? "" : " (solo Empresa/Socio/Owner)"}</p>
            </Card>
          </div>

          {/* ------------------------------------------------------------------
              4.1 CRIPTOS — Recargar / Retirar / Convertir (contraparte plataforma)
              ------------------------------------------------------------------ */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-navy-800">4.1 · Criptos</h2>
              <StatusBadge estado={gestiona ? "Gestionás cripto" : "Solo lectura"} tono={gestiona ? "teal" : "smoke"} />
            </div>
            <p className="mt-1 text-xs text-navy-800/60">
              Recargá, retirá o convertí ETH contra la plataforma. No hay transferencia
              directa entre socios: la cripto entre usuarios solo se mueve vía Trueke.
            </p>

            {!gestiona && (
              <p className="mt-3 rounded-xl bg-smoke px-4 py-3 text-xs text-navy-800/60">
                La gestión de criptos es de <strong>Empresas, Socios y el Owner</strong>.
                Tu reputación y valoraciones siguen disponibles abajo.
              </p>
            )}

            {gestiona && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-40 flex-1">
                    <label htmlFor="monto" className="mb-1 block text-xs font-semibold text-navy-800/60">
                      Monto (ETH para recargar/retirar · unidad para convertir)
                    </label>
                    <input
                      id="monto"
                      type="number"
                      min="0"
                      step="any"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      placeholder="0.0"
                      className={inputCls}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={ocupado !== null} onClick={() => void operar("recargar")} className="!px-3 !py-2 !text-xs">
                      {ocupado === "recargar" ? "…" : "⬆️ Recargar ETH"}
                    </Button>
                    <Button disabled={ocupado !== null} onClick={() => void operar("retirar")} variante="outline-navy" className="!px-3 !py-2 !text-xs">
                      {ocupado === "retirar" ? "…" : "⬇️ Retirar ETH"}
                    </Button>
                    <Button disabled={ocupado !== null} onClick={() => void operar("convertir", "ETH")} className="!px-3 !py-2 !text-xs !bg-[linear-gradient(135deg,#2a9d8f,#2a9d8f)]">
                      {ocupado === "convertir" ? "…" : "⇄ ETH → BRLT"}
                    </Button>
                    <Button disabled={ocupado !== null} onClick={() => void operar("convertir", "BRLT")} className="!px-3 !py-2 !text-xs !bg-[linear-gradient(135deg,#b8860b,#e6b800)]">
                      {ocupado === "convertir" ? "…" : "⇄ BRLT → ETH"}
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-navy-800/50">
                  Tasa de la plataforma: 1 ETH ≈ {datos.tasaEthBrlt} BRLT. Saldo:{" "}
                  <strong>{criptos.ETH ?? 0} ETH</strong> · <strong>{brlt} BRLT</strong>.
                </p>
              </div>
            )}
          </Card>

          {/* ------------------------------------------------------------------
              4.2 REPUTACIÓN — pendientes de valoración + últimos 10 trueques
              ------------------------------------------------------------------ */}
          <Card className="p-5">
            <h2 className="font-display text-lg font-bold text-navy-800">4.2 · Reputación</h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-smoke p-3 text-center">
                <p className="text-2xl font-bold text-navy-800">{rep?.puntaje}</p>
                <p className="text-[10px] uppercase tracking-wide text-navy-800/50">Puntaje (D12/D30)</p>
              </div>
              <div className="rounded-xl bg-smoke p-3 text-center">
                <p className="text-2xl font-bold text-navy-800">{rep?.reputacionMedia ?? "0.0"}</p>
                <p className="text-[10px] uppercase tracking-wide text-navy-800/50">Media de valoraciones</p>
              </div>
              <div className="rounded-xl bg-smoke p-3 text-center">
                <p className="text-2xl font-bold text-navy-800">{rep?.truequesCompletados}</p>
                <p className="text-[10px] uppercase tracking-wide text-navy-800/50">Trueques completados</p>
              </div>
            </div>

            {/* Pendientes de valoración */}
            <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-navy-800/60">
              Trueques sin valorar ({datos.pendientesValoracion.length})
            </h3>
            {datos.pendientesValoracion.length === 0 ? (
              <p className="mt-2 text-xs text-navy-800/50">No tenés trueques completados sin valorar. 🎉</p>
            ) : (
              <div className="mt-2 space-y-2">
                {datos.pendientesValoracion.map((p) => (
                  <div key={p.truekeId} className="rounded-xl border border-navy-800/10 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-navy-800">
                        {p.tituloA && p.tituloB ? `${p.tituloA} ⇄ ${p.tituloB}` : `Trueque #${p.truekeId}`}
                        <span className="ml-2 text-[11px] font-normal text-navy-800/50">
                          con {resumirWallet(p.contraparte)} · {formatear(p.completadoEn)}
                        </span>
                      </p>
                      {!valorandoId || valorandoId !== p.truekeId ? (
                        <Button variante="outline-navy" className="!px-3 !py-1.5 !text-xs" onClick={() => abrirValoracion(p.truekeId)}>
                          ⭐ Valorar 1–5
                        </Button>
                      ) : null}
                    </div>
                    {valorandoId === p.truekeId && (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {DIMENSIONES_VALOR.map((d) => (
                          <label key={d.clave} className="block text-[11px] font-semibold text-navy-800/70">
                            {d.label}
                            <select
                              className="mt-0.5 w-full rounded-lg border border-navy-800/10 bg-white px-2 py-1.5 text-xs outline-none focus:border-teal-500"
                              value={valores[d.clave] ?? ""}
                              onChange={(e) => setValores((prev) => ({ ...prev, [d.clave]: e.target.value }))}
                            >
                              <option value="">–</option>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </label>
                        ))}
                      </div>
                    )}
                    {valorandoId === p.truekeId && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button className="!px-3 !py-1.5 !text-xs" disabled={enviandoVal} onClick={() => void enviarValoracion(p)}>
                          {enviandoVal ? "Enviando…" : "Enviar valoración"}
                        </Button>
                        <Button variante="outline-navy" className="!px-3 !py-1.5 !text-xs" onClick={() => setValorandoId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    )}
                    {errorVal && valorandoId === p.truekeId && (
                      <p className="mt-2 text-[11px] text-crimson">⚠️ {errorVal}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Últimos 10 trueques valorados */}
            <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-navy-800/60">
              Tus últimos 10 trueques valorados
            </h3>
            {datos.ultimasValoraciones.length === 0 ? (
              <p className="mt-2 text-xs text-navy-800/50">Todavía no valoraste ningún trueque.</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-navy-800/10 text-navy-800/50">
                      <th className="py-1.5 pr-2 font-semibold">Trueque</th>
                      <th className="py-1.5 pr-2 font-semibold">Valoraste a</th>
                      <th className="py-1.5 pr-2 font-semibold">Fecha</th>
                      <th className="py-1.5 font-semibold">Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.ultimasValoraciones.map((v) => (
                      <tr key={`${v.truekeId}-${v.valorado}`} className="border-b border-navy-800/5">
                        <td className="py-1.5 pr-2 text-navy-800">
                          {v.tituloA && v.tituloB ? `${v.tituloA} ⇄ ${v.tituloB}` : `#${v.truekeId}`}
                        </td>
                        <td className="py-1.5 pr-2 font-mono text-navy-800/70">{resumirWallet(v.valorado)}</td>
                        <td className="py-1.5 pr-2 text-navy-800/50">{formatear(v.createdAt)}</td>
                        <td className="py-1.5">
                          <span className="rounded-pill bg-gold-500/15 px-2 py-0.5 font-bold text-gold-700">
                            ★ {v.promedio.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* ------------------------------------------------------------------
              4.3 BRLT — Recargar (Stripe Checkout) / Retirar / Convertir
              ------------------------------------------------------------------ */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-navy-800">4.3 · BRLT</h2>
              <StatusBadge estado={datos.brltHabilitado ? "Disponible" : "Restringido"} tono={datos.brltHabilitado ? "teal" : "smoke"} />
            </div>
            {!datos.brltHabilitado ? (
              <p className="mt-3 rounded-xl bg-smoke px-4 py-3 text-xs text-navy-800/60">
                La gestión de <strong>BRLT</strong> (compra con fiat vía Stripe) es de{" "}
                <strong>Empresas, Socios y el Owner</strong>. No es visible para el resto de los usuarios.
              </p>
            ) : (
              <>
                <p className="mt-1 text-xs text-navy-800/60">
                  Comprá BRLT con tu tarjeta mediante <strong>Stripe Checkout</strong> (pago
                  alojado por Stripe, sin pasarela propia). Saldo:{" "}
                  <strong>{brlt} BRLT</strong>.
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <div className="min-w-40 flex-1">
                    <label htmlFor="monto-brlt" className="mb-1 block text-xs font-semibold text-navy-800/60">
                      Monto (BRLT)
                    </label>
                    <input
                      id="monto-brlt"
                      type="number"
                      min="0"
                      step="any"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      placeholder="0.00"
                      className={inputCls}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={ocupado !== null} onClick={() => void comprarBrlt()} className="!px-3 !py-2 !text-xs">
                      {ocupado === "comprar" ? "…" : "💳 Comprar con Stripe"}
                    </Button>
                    <Button disabled={ocupado !== null} onClick={() => void retirarBrltAccion()} variante="outline-navy" className="!px-3 !py-2 !text-xs">
                      {ocupado === "retirar-brlt" ? "…" : "⬇️ Retirar BRLT"}
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-navy-800/50">
                  El retiro a fiat real se desembolsa por <strong>Stripe Payouts</strong> cuando
                  la cuenta esté vinculada; en este entorno se registra la salida.
                </p>
              </>
            )}
          </Card>

          {/* Movimientos recientes */}
          {datos.movimientos.length > 0 && (
            <Card className="p-5">
              <h2 className="font-display text-lg font-bold text-navy-800">Movimientos recientes</h2>
              <div className="mt-2 space-y-1.5">
                {datos.movimientos.slice(0, 10).map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-smoke/70 px-3 py-2 text-xs">
                    <span className="font-mono text-navy-800/70">
                      {m.tipo} · {m.moneda} · {m.monto}
                    </span>
                    <span className="text-navy-800/50">{formatear(m.createdAt)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
