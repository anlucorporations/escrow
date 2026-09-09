"use client";

// =============================================================================
// TrueKeate — Campana de notificaciones (decisión del director: centro de avisos
// in-app). Consulta GET /notificaciones cada 30 s y al abrir; muestra el badge de
// no leídas y un desplegable con los avisos (disputas, votaciones, veredictos).
// =============================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { misNotificaciones, marcarNotificacionLeida, marcarNotificacionesLeidas, type Notificacion } from "@/lib/api";

const ICONO_TIPO: Record<string, string> = {
  DISPUTA_REPORTADA: "⚖️",
  PEDIDO_JUSTIFICATIVO: "📷",
  VOTACION_ABIERTA: "🗳️",
  VEREDICTO: "⚖️",
  SISTEMA: "🔔",
};

function formatearHace(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const seg = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (seg < 60) return "ahora";
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`;
  return `hace ${Math.floor(seg / 86400)} d`;
}

/** A dónde lleva cada aviso según su referencia. */
function rutaDe(n: Notificacion): string {
  if (n.refTipo === "disputa" || n.tipo === "VOTACION_ABIERTA") return "/suite/disputas";
  if (n.refTipo === "trueke") return "/suite/intercambio";
  return "/suite/dashboard";
}

export function CampanaNotificaciones({ token }: { token: string | null }) {
  const [abierta, setAbierta] = useState(false);
  const [lista, setLista] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    try {
      const r = await misNotificaciones(token);
      setLista(r.notificaciones ?? []);
      setNoLeidas(r.noLeidas ?? 0);
    } catch {
      /* sin sesión o red: la campana queda muda */
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    void cargar();
    const id = setInterval(() => void cargar(), 30_000);
    return () => clearInterval(id);
  }, [cargar]);

  // Cierra al hacer clic fuera
  useEffect(() => {
    function alClicFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierta(false);
    }
    document.addEventListener("mousedown", alClicFuera);
    return () => document.removeEventListener("mousedown", alClicFuera);
  }, []);

  async function abrir() {
    const siguiente = !abierta;
    setAbierta(siguiente);
    if (siguiente) await cargar();
  }

  async function leerTodo() {
    if (!token) return;
    try {
      await marcarNotificacionesLeidas(token);
      setNoLeidas(0);
      setLista((prev) => prev.map((n) => ({ ...n, leida: true })));
    } catch {
      /* sin red */
    }
  }

  async function marcarUna(n: Notificacion) {
    if (!token || n.leida) return;
    try {
      await marcarNotificacionLeida(token, n.id);
      setNoLeidas((v) => Math.max(0, v - 1));
      setLista((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
    } catch {
      /* sin red */
    }
  }

  if (!token) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => void abrir()}
        aria-label={`Notificaciones${noLeidas > 0 ? ` (${noLeidas} sin leer)` : ""}`}
        title="Notificaciones"
        className="relative flex h-9 w-9 items-center justify-center rounded-pill text-lg leading-none text-white/75 transition-colors hover:bg-white/10 hover:text-white"
      >
        <span aria-hidden>🔔</span>
        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-crimson px-1 text-[9px] font-bold text-white">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierta && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-modal border border-navy-800/10 bg-white text-navy-800 shadow-xl">
          <div className="flex items-center justify-between border-b border-navy-800/10 bg-smoke px-4 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-navy-800/60">
              Notificaciones
            </p>
            {noLeidas > 0 && (
              <button
                onClick={() => void leerTodo()}
                className="text-[11px] font-semibold text-teal-600 hover:underline"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {cargando && lista.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-navy-800/40">Cargando…</p>
            ) : lista.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-navy-800/40">
                No tenés notificaciones.
              </p>
            ) : (
              lista.slice(0, 12).map((n) => (
                <Link
                  key={n.id}
                  href={rutaDe(n)}
                  onClick={() => {
                    void marcarUna(n);
                    setAbierta(false);
                  }}
                  className={`block border-b border-navy-800/5 px-4 py-2.5 transition-colors hover:bg-smoke ${
                    n.leida ? "opacity-60" : ""
                  }`}
                >
                  <p className="text-xs font-semibold text-navy-800">
                    {ICONO_TIPO[n.tipo] ?? "🔔"} {n.titulo}
                  </p>
                  {n.cuerpo && <p className="mt-0.5 text-[11px] leading-snug text-navy-800/60">{n.cuerpo}</p>}
                  <p className="mt-0.5 text-right text-[9px] uppercase tracking-wide text-navy-800/30">
                    {formatearHace(n.createdAt)}
                  </p>
                </Link>
              ))
            )}
          </div>

          <Link
            href="/suite/disputas"
            onClick={() => setAbierta(false)}
            className="block border-t border-navy-800/10 px-4 py-2 text-center text-[11px] font-semibold text-teal-600 hover:bg-smoke"
          >
            Ir a Disputas →
          </Link>
        </div>
      )}
    </div>
  );
}
