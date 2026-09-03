// =============================================================================
// TrueKeate — Suite (RF-14.2): layout con barra superior + guard de acceso
// Control de acceso (decisión del director):
//   - sin wallet → solo landing; la suite exige billetera conectada
//   - conectada pero no inscrita → solo catálogo (/suite/mercado)
//   - inscrita → acceso completo según escalera D28
// =============================================================================
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { SuiteGuard } from "@/components/SuiteGuard";

export default function SuiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-smoke pb-24">
      <TopBar />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        <SuiteGuard>{children}</SuiteGuard>
      </main>

      <BottomNav />
    </div>
  );
}
