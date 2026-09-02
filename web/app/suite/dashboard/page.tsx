"use client";

// =============================================================================
// TrueKeate — Suite: Dashboard (RF-14.2)
// Muestra el estado del usuario según la escalera D28 y los módulos a los que
// tiene acceso según tipo/nivel (RF-14.3–14.8). Conecta la wallet (RF-16).
// =============================================================================
import { useEthereum } from "@/lib/ethereum";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";

type EstadoD28 = "INSCRITO" | "VERIFICADO" | "CERTIFICADO";

const pasosD28: EstadoD28[] = ["INSCRITO", "VERIFICADO", "CERTIFICADO"];

export default function Dashboard() {
  const { account, conectado, conectar, conectando } = useEthereum();

  // En una integración real el estado proviene del backend (/auth/session + /kyc/status).
  // Aquí se simula para demostrar el render por estado de la escalera (D28).
  const estado: EstadoD28 = "INSCRITO";

  const idx = pasosD28.indexOf(estado);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-800">Mi Trueke Central</h1>
          <p className="text-sm text-navy-800/60">
            {conectado && account ? `Wallet: ${account.slice(0, 6)}…${account.slice(-4)}` : "Wallet no conectada"}
          </p>
        </div>
        {!conectado && (
          <Button onClick={() => void conectar()} disabled={conectando}>
            {conectando ? "Conectando…" : "Conectar MetaMask"}
          </Button>
        )}
      </section>

      {/* Escalera de verificación D28 (CU-01/02) */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-navy-800">Escalera de verificación</h2>
        <ol className="mt-4 flex items-center gap-2">
          {pasosD28.map((p, i) => (
            <li key={p} className="flex flex-1 flex-col items-center gap-1 text-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-pill text-xs font-bold ${
                  i <= idx
                    ? "bg-[linear-gradient(135deg,#1a2b4c,#2a9d8f)] text-white"
                    : "bg-navy-800/10 text-navy-800/40"
                }`}
              >
                {i < idx ? "✓" : i + 1}
              </span>
              <span className={`text-[10px] font-semibold ${i <= idx ? "text-navy-800" : "text-navy-800/40"}`}>
                {p}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex items-center gap-2">
          <StatusBadge estado={estado} />
          {idx === 0 && (
            <p className="text-xs text-navy-800/60">
              Verifica tu correo y teléfono para comenzar a truequear (RF-01.5, D28).
            </p>
          )}
        </div>
      </Card>

      {/* Módulos por estado (RF-14.3–14.5) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold text-navy-800">Explorar ofertas</h3>
          <p className="mt-1 text-sm text-navy-800/70">Catálogo de artículos AtoA disponibles para intercambio.</p>
          <StatusBadge estado="Activo" tono="teal" />
        </Card>
        <Card className={`p-5 ${idx >= 1 ? "" : "opacity-50"}`}>
          <h3 className="font-semibold text-navy-800">Mis truekes</h3>
          <p className="mt-1 text-sm text-navy-800/70">
            {idx >= 1 ? "Crea y completa trueques (máx. 3 activos — RF-14.4)." : "Requiere estado Verificado."}
          </p>
        </Card>
        <Card className={`p-5 ${idx >= 2 ? "" : "opacity-50"}`}>
          <h3 className="font-semibold text-navy-800">Reputación</h3>
          <p className="mt-1 text-sm text-navy-800/70">
            {idx >= 2 ? "Tus 5 dimensiones de valoración y tu nivel/medalla." : "Disponible al certificar tu identidad (KYC)."}
          </p>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-navy-800">Punto de encuentro</h3>
          <p className="mt-1 text-sm text-navy-800/70">Acuerda el sitio de entrega (≤ 10 km) con mapa y ruta móvil.</p>
        </Card>
      </div>
    </div>
  );
}
