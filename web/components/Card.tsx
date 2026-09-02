"use client";

// =============================================================================
// TrueKeate — Card (RNF-08.4)
// Tarjeta con glassmorphism suave, borde gradiente superior opcional y
// variante premium (borde dorado superior — RWA certificado, §4.4).
// =============================================================================
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  premium?: boolean; // activos RWA certificados → borde superior dorado
  destacada?: boolean; // tarjeta destacada → borde superior gradiente navy→teal→gold
  className?: string;
}

export function Card({ children, premium = false, destacada = false, className = "" }: Props) {
  let borde = "border border-navy-800/10";
  if (premium) borde = "card-premium border border-navy-800/10"; // D4AF37 sólido 4px
  if (destacada) borde = "gradient-card-border border-0 pt-1 bg-clip-padding";

  return (
    <div
      className={
        "rounded-card bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)] " +
        "transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.10)] " +
        borde +
        " " +
        className
      }
    >
      {children}
    </div>
  );
}
