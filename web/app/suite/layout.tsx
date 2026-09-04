// =============================================================================
// TrueKeate — Suite (RF-14.2): layout con doble presentación (PC/móvil)
// Propuesta aprobada por el director (PROPUESTA_NAVEGACION_PC_MOVIL.md):
//   - PC (≥lg 1024px): barra superior con secciones por Tipo de Usuario
//     (TopBar marca/usuario + TopNavPc secciones) — BottomNav oculta.
//   - Móvil (<lg): TopBar compacta + BottomNav inferior flotante con central
//     hexagonal (RNF-08.4) — filtrada por rol.
//   - Un solo SuiteGuard (acceso: sinWallet / conectadoNoInscrito / inscrito).
// =============================================================================
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { TopNavPc } from "@/components/TopNavPc";
import { SuiteGuard } from "@/components/SuiteGuard";

export default function SuiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-smoke pb-24 lg:pb-6">
      {/* Zona superior fija: marca + usuario (TopBar) y secciones PC (TopNavPc) */}
      <div className="sticky top-0 z-30">
        <TopBar />
        <TopNavPc />
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 lg:px-8">
        <SuiteGuard>{children}</SuiteGuard>
      </main>

      {/* Barra inferior: solo móvil/tablet (<lg) */}
      <BottomNav />
    </div>
  );
}
