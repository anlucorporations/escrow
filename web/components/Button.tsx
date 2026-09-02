"use client";

// =============================================================================
// TrueKeate — Button (RNF-08.4)
// Variantes: pill-primary (gradiente navy→teal, cápsula), outline-navy,
//            gold-accent (certificación/arbitraje). Interacción scale(0.96).
// =============================================================================
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variante = "pill-primary" | "outline-navy" | "gold-accent";

const estilos: Record<Variante, string> = {
  "pill-primary":
    "rounded-pill bg-[linear-gradient(135deg,#1a2b4c_0%,#2a9d8f_100%)] text-white " +
    "shadow-[0_4px_15px_rgba(42,157,143,0.35)] hover:shadow-[0_6px_20px_rgba(42,157,143,0.45)]",
  "outline-navy":
    "rounded-xl border-2 border-navy-800 text-navy-800 bg-transparent " +
    "hover:bg-[#f0fdf4]",
  "gold-accent":
    "rounded-pill bg-[linear-gradient(135deg,#d4af37_0%,#c5a065_100%)] text-navy-800 " +
    "shadow-[0_4px_15px_rgba(212,175,55,0.35)]",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  children: ReactNode;
}

export function Button({ variante = "pill-primary", className = "", children, ...rest }: Props) {
  return (
    <button
      className={
        "px-5 py-2.5 font-semibold transition-transform active:scale-95 duration-150 " +
        estilos[variante] +
        " " +
        className
      }
      {...rest}
    >
      {children}
    </button>
  );
}
