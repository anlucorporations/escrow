"use client";

// =============================================================================
// TrueKeate — OperationsList: lista de operaciones (truekes) con auto-refresh
// El enunciado lo pedía como components/OperationsList.tsx: listar las
// operaciones mostrando identificador, contraparte, qué se ofrece y qué se pide,
// y su estado; refrescarse sola cada pocos segundos y manejar el caso vacío.
//
// El refresco automático es real: hasta ahora la única actualización periódica
// de la app era la campana de notificaciones (cada 30 s).
// =============================================================================
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Trueke } from "@/lib/api";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";

/** Abrevia una dirección de wallet para mostrarla. */
function corta(wallet: string | null | undefined): string {
  if (!wallet) return "—";
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

export interface OperationsListProps {
  truekes: Trueke[];
  /** Se invoca para volver a pedir los datos (manual y en cada intervalo). */
  onRefrescar?: () => void | Promise<void>;
  /** Intervalo del refresco automático en ms (0 lo desactiva). Por defecto 5000. */
  intervaloMs?: number;
  /** Máximo de operaciones a mostrar. */
  limite?: number;
  /** A dónde lleva «Abrir» en cada operación. */
  detalleHref?: string;
  /** Mensaje cuando no hay operaciones. */
  vacio?: string;
  cargando?: boolean;
  className?: string;
}

export function OperationsList({
  truekes,
  onRefrescar,
  intervaloMs = 5000,
  limite,
  detalleHref = "/suite/intercambio",
  vacio = "Todavía no hay operaciones que mostrar.",
  cargando = false,
  className,
}: OperationsListProps) {
  const [actualizado, setActualizado] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  // El callback puede cambiar de identidad en cada render de la pantalla; se
  // guarda en una ref para que el intervalo no se reinicie constantemente.
  // La ref se actualiza en un efecto, no durante el render (escribir refs en el
  // render rompe la pureza del componente).
  const refrescarRef = useRef(onRefrescar);
  useEffect(() => {
    refrescarRef.current = onRefrescar;
  }, [onRefrescar]);

  useEffect(() => {
    if (!intervaloMs || intervaloMs <= 0 || !refrescarRef.current) return;
    const id = setInterval(async () => {
      try {
        await refrescarRef.current?.();
        setActualizado(new Date().toLocaleTimeString("es"));
      } catch {
        /* el refresco automático nunca debe romper la pantalla */
      }
    }, intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);

  async function refrescarAhora() {
    if (!refrescarRef.current) return;
    setRefrescando(true);
    try {
      await refrescarRef.current();
      setActualizado(new Date().toLocaleTimeString("es"));
    } finally {
      setRefrescando(false);
    }
  }

  const visibles = typeof limite === "number" ? truekes.slice(0, limite) : truekes;

  return (
    <div className={className}>
      {onRefrescar && (
        <div className="mb-2 flex items-center justify-end gap-2">
          {actualizado && (
            <span className="text-[10px] text-navy-800/40">
              Actualizado a las {actualizado} · cada {Math.round(intervaloMs / 1000)} s
            </span>
          )}
          <Button
            variante="outline-navy"
            className="!px-2.5 !py-1 !text-[11px]"
            onClick={() => void refrescarAhora()}
            disabled={refrescando}
          >
            {refrescando ? "…" : "↻"}
          </Button>
        </div>
      )}

      {cargando && truekes.length === 0 ? (
        <p className="py-4 text-center text-xs text-navy-800/50">Cargando operaciones…</p>
      ) : visibles.length === 0 ? (
        <p className="rounded-xl bg-navy-800/5 px-3 py-3 text-center text-xs text-navy-800/60">{vacio}</p>
      ) : (
        <ul className="divide-y divide-navy-800/5">
          {visibles.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-navy-800">
                  <span className="text-navy-800/50">#{t.id}</span> {t.tituloA || `Ítem #${t.articuloAId}`}
                </p>
                <p className="truncate text-[11px] text-navy-800/60">
                  Ofrece a {corta(t.usuarioB ?? t.usuarioA)} ·{" "}
                  {t.descripcionRequerida ? `pide: ${t.descripcionRequerida}` : "sin descripción de lo que pide"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge estado={t.estado} />
                <Link href={detalleHref} className="text-[11px] font-semibold text-teal-600 underline">
                  Abrir
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {typeof limite === "number" && truekes.length > limite && (
        <p className="mt-2 text-[11px] text-navy-800/50">
          y {truekes.length - limite} más…
        </p>
      )}
    </div>
  );
}
