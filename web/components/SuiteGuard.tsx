"use client";

// =============================================================================
// TrueKeate — Guard de acceso de la suite (/suite/**)
// Decisión del director:
//   1) Sin billetera conectada → el público NO accede a la suite: pantalla de
//      conexión (solo la landing es pública).
//   2) Wallet conectada pero NO inscrita → SOLO puede ver el catálogo
//      (/suite/mercado); el resto de la suite muestra el aviso de inscripción.
//   3) Inscrita → contenido normal según escalera D28.
// =============================================================================
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { Button } from "@/components/Button";

const RUTA_CATALOGO = "/suite/mercado";
const RUTA_INSCRIPCION = "/suite/inscripcion";

/** Rutas accesibles con la wallet conectada aunque NO esté inscrita. */
const RUTAS_SIN_INSCRIPCION = [RUTA_CATALOGO, RUTA_INSCRIPCION];

function PantallaConectar() {
  const { conectar, conectando } = useEthereum();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="rounded-card border border-navy-800/10 bg-white p-8 shadow-md">
        <p className="text-4xl">🔐</p>
        <h1 className="mt-3 font-display text-2xl font-bold text-navy-800">
          Conecta tu billetera para continuar
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-navy-800/60">
          El área de la suite es privada. Conecta tu billetera (MetaMask) para
          verificar tu inscripción. El público en general solo tiene acceso a la
          página de inicio.
        </p>
        <div className="mt-6 flex justify-center">
          <Button onClick={() => void conectar()} disabled={conectando}>
            {conectando ? "Conectando…" : "Conectar MetaMask"}
          </Button>
        </div>
        <p className="mt-4 text-xs text-navy-800/40">
          <Link href="/" className="underline hover:text-teal-500">
            ← Volver a la página de inicio
          </Link>
        </p>
      </div>
    </div>
  );
}

function PantallaRequiereInscripcion() {
  const { inscribir, refrescar } = useSesion();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-full rounded-card border border-navy-800/10 bg-white p-8 text-left shadow-md">
        <p className="text-4xl">📝</p>
        <h1 className="mt-3 font-display text-2xl font-bold text-navy-800">
          Completa tu inscripción para usar la suite
        </h1>
        <p className="mt-2 text-sm text-navy-800/60">
          Tu billetera está conectada pero todavía no está inscrita. Mientras
          tanto puedes <strong>observar el catálogo</strong> de trueques
          ofrecidos. Para operar (crear trueques, inventario, perfil…) completa
          la inscripción formal: correo, teléfono, dirección y consentimiento
          GDPR.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href={RUTA_CATALOGO}>
            <Button variante="outline-navy">👀 Ver catálogo de trueques</Button>
          </Link>
          <a href="/suite/inscripcion">
            <Button>📝 Inscribirme ahora</Button>
          </a>
        </div>
        <button
          onClick={() => void refrescar()}
          className="mt-4 text-xs text-navy-800/40 underline hover:text-teal-500"
        >
          Ya me inscribí — refrescar estado
        </button>
      </div>
    </div>
  );
}

export function SuiteGuard({ children }: { children: ReactNode }) {
  const { conectado } = useEthereum();
  const { acceso } = useSesion();
  const pathname = usePathname() ?? "";

  // 1) Sin wallet conectada → no se accede al contenido de la suite.
  if (!conectado) return <PantallaConectar />;

  // 2) Verificando estado contra el backend.
  if (acceso.fase === "verificando") {
    return (
      <div className="flex flex-1 items-center justify-center py-20 text-navy-800/50">
        <span className="animate-pulse">Verificando inscripción…</span>
      </div>
    );
  }

  // 3) Conectada pero NO inscrita → solo catálogo e inscripción; el resto bloqueado.
  if (acceso.fase === "conectadoNoInscrito") {
    if (RUTAS_SIN_INSCRIPCION.some((r) => pathname.startsWith(r))) return <>{children}</>;
    return <PantallaRequiereInscripcion />;
  }

  // 4) Inscrita (INSCRITO/VERIFICADO/CERTIFICADO) → acceso completo.
  return <>{children}</>;
}
