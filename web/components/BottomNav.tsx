"use client";

// =============================================================================
// TrueKeate — BottomNav (RNF-08.4/08.5) — versión móvil (<1024px)
// Barra de navegación inferior flotante: blanca, blur 12px, radio 24px, con
// botón central hexagonal dorado. Las ranuras se rellenan según el Tipo de
// Usuario (RF-14) desde la matriz única lib/navegacion.ts; las secciones que
// no caben se agrupan en "Más".
// =============================================================================
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { seccionesParaMovil, type Seccion } from "@/lib/navegacion";

export function BottomNav() {
  const pathname = usePathname() ?? "";
  const { conectado } = useEthereum();
  const { acceso } = useSesion();
  const [masAbierto, setMasAbierto] = useState(false);

  const inscrito = acceso.fase === "inscrito" ? acceso.usuario : null;
  const noInscrito = conectado && acceso.fase === "conectadoNoInscrito";

  // Si no hay wallet o está sin inscribir, solo se muestra Mercado (y nada más
  // que pueda inducir a error); el guard ya bloquea el contenido.
  const ctx = inscrito
    ? { tipo: inscrito.tipo, nivel: inscrito.nivel, estado: inscrito.estado }
    : undefined;

  const { visibles, mas } = seccionesParaMovil(ctx ?? {});
  const itemsFinales =
    noInscrito || !conectado
      ? [{ href: "/suite/mercado", icono: "🛒", label: "Mercado" }]
      : visibles;

  const central = itemsFinales.find((s) => s.central);

  const esActivo = (s: Seccion) =>
    s.href === "/suite/dashboard" ? pathname === s.href : pathname.startsWith(s.href);

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-around rounded-modal border border-navy-800/10 bg-white/80 px-2 py-2 shadow-lg backdrop-blur-[12px] lg:hidden"
    >
      {itemsFinales.map((it) => {
        if (it.central) {
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-label={it.label}
              className="flex h-14 w-14 -translate-y-4 flex-col items-center justify-center rounded-full bg-[linear-gradient(135deg,#d4af37_0%,#f3e5ab_50%,#c5a065_100%)] text-navy-800 shadow-[0_6px_18px_rgba(212,175,55,0.5)]"
            >
              <span className="text-xl leading-none">{it.icono}</span>
              <span className="text-[9px] font-bold">{it.label}</span>
            </Link>
          );
        }
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-col items-center gap-0.5 rounded-pill px-3 py-1 text-[10px] font-medium transition-colors ${
              esActivo(it) ? "text-teal-500" : "text-navy-800/70"
            }`}
          >
            <span className="text-lg leading-none">{it.icono}</span>
            {it.label}
          </Link>
        );
      })}

      {/* Ranura "Más" con el excedente de secciones por rol */}
      {mas.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setMasAbierto((v) => !v)}
            aria-label="Más secciones"
            className={`flex flex-col items-center gap-0.5 rounded-pill px-3 py-1 text-[10px] font-medium transition-colors ${
              masAbierto ? "text-teal-500" : "text-navy-800/70"
            }`}
          >
            <span className="text-lg leading-none">⋯</span>
            Más
          </button>
          {masAbierto && (
            <div className="absolute bottom-14 right-0 z-50 w-48 overflow-hidden rounded-modal border border-navy-800/10 bg-white py-1 shadow-xl">
              {mas.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  onClick={() => setMasAbierto(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-navy-800 hover:bg-smoke"
                >
                  <span aria-hidden>{s.icono}</span>
                  {s.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
