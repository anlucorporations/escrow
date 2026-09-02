"use client";

// =============================================================================
// TrueKeate — BottomNav (RNF-08.4/08.5)
// Barra de navegación inferior flotante (móvil): blanca, blur 12px, radio 24px,
// con botón central hexagonal dorado elevado "Trueke Central".
// =============================================================================
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/suite/dashboard", icono: "🏠", label: "Mercado" },
  { href: "/suite/inventario", icono: "💼", label: "Inventario" },
  { href: "/suite/intercambio", icono: "⇄", label: "Trueke", central: true },
  { href: "/suite/gobernanza", icono: "🏛️", label: "Socios" },
  { href: "/suite/perfil", icono: "👤", label: "Perfil" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-around rounded-modal border border-navy-800/10 bg-white/80 px-2 py-2 shadow-lg backdrop-blur-[12px]"
    >
      {items.map((it) => {
        const activo = pathname?.startsWith(it.href) ?? false;
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
              activo ? "text-teal-500" : "text-navy-800/70"
            }`}
          >
            <span className="text-lg leading-none">{it.icono}</span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
