"use client";

// =============================================================================
// TrueKeate — StatusBadge (RNF-08.4)
// Badges semánticos de estado (escalera D28, estados del escrow, niveles).
// =============================================================================
import type { ReactNode } from "react";

export type BadgeTono =
  | "navy" | "teal" | "cyan" | "gold" | "crimson" | "coral" | "smoke";

const tonos: Record<BadgeTono, string> = {
  navy: "bg-navy-800 text-white",
  teal: "bg-teal-500 text-white",
  cyan: "bg-cyan-400 text-navy-900",
  gold: "bg-gold-500 text-navy-900",
  crimson: "bg-crimson text-white",
  coral: "bg-coral text-navy-900",
  smoke: "bg-smoke text-navy-800 border border-navy-800/20",
};

/** Mapea estados de la escalera D28 y del escrow a tonos. */
export function tonoDeEstado(estado: string): BadgeTono {
  switch (estado) {
    case "VERIFICADO": return "teal";
    case "CERTIFICADO": case "CERTIFICAD": case "COMPLETADO": return "gold";
    case "RECHAZADO": case "BLOQUEADO": case "ANULADO": return "crimson";
    case "APERTURA": case "PENDIENTE": return "coral";
    case "EN_DISPUTA": case "RESOLUCION_SOCIOS": return "coral";
    case "INSCRITO": case "CREADO": case "ACTIVO": case "CUSTODIADO": return "navy";
    default: return "smoke";
  }
}

interface Props {
  estado: string;
  tono?: BadgeTono;
  children?: ReactNode;
}

export function StatusBadge({ estado, tono, children }: Props) {
  const t = tono ?? tonoDeEstado(estado);
  return (
    <span className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] ${tonos[t]}`}>
      {children ?? estado}
    </span>
  );
}
