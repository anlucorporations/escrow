// =============================================================================
// TrueKeate — Suite (RF-14.2): layout con barra superior @username + BottomNav
// =============================================================================
import { BottomNav } from "@/components/BottomNav";

export default function SuiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-smoke pb-24">
      {/* Barra superior móvil (RNF-08.4): @username + check on-chain */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-navy-900 px-4 py-2 text-white shadow">
        <div className="flex items-center gap-2">
          <span className="text-xl">⇄</span>
          <span className="font-display font-bold">TrueKeat☑</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-pill border border-gold-500/60 px-2 py-0.5 text-[11px] font-semibold text-gold-300">
            @usuario <span className="text-gold-500">✓</span>
          </span>
          <span aria-label="Notificaciones" className="relative">
            🔔
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-pill bg-crimson text-[9px] font-bold">
              2
            </span>
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>

      <BottomNav />
    </div>
  );
}
