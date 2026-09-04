"use client";

// =============================================================================
// TrueKeate — Barra de navegación superior para PC (≥1024px)
// Muestra las secciones permitidas según el Tipo de Usuario (RF-14), alimentada
// por la matriz única lib/navegacion.ts. Fila 2 bajo la marca y el usuario.
// =============================================================================
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { seccionesPara } from "@/lib/navegacion";
import { Button } from "@/components/Button";
import { BotonConectarLogin } from "@/components/BotonConectarLogin";

export function TopNavPc() {
  const pathname = usePathname() ?? "";
  const { conectado, account } = useEthereum();
  const { acceso } = useSesion();

  const inscrito = acceso.fase === "inscrito" ? acceso.usuario : null;
  const noInscrito = conectado && acceso.fase === "conectadoNoInscrito";
  const secciones = seccionesPara({
    tipo: inscrito?.tipo,
    nivel: inscrito?.nivel,
    estado: inscrito?.estado,
  });

  const activo = (href: string) =>
    href === "/suite/dashboard"
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <div className="hidden border-b border-navy-800/10 bg-white/70 backdrop-blur lg:block">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 gap-y-1 px-6 py-2">
        {!conectado ? (
          <>
            <p className="mr-auto text-sm text-navy-800/60">
              Conecta tu billetera e inicia sesión (una firma) para acceder a tus secciones.
            </p>
            <BotonConectarLogin className="!px-3 !py-1.5 !text-xs" />
          </>
        ) : noInscrito ? (
          <>
            <Link
              href="/suite/mercado"
              className={`whitespace-nowrap rounded-pill px-3 py-1.5 text-sm font-semibold ${
                activo("/suite/mercado") ? "bg-navy-800 text-white" : "text-navy-800 hover:bg-smoke"
              }`}
            >
              🛒 Mercado
            </Link>
            <p className="ml-auto text-xs text-navy-800/50">
              Wallet conectada sin inscribir — solo catálogo.
            </p>
            <Link href="/suite/inscripcion">
              <Button className="!px-3 !py-1.5 !text-xs">📝 Inscribirme</Button>
            </Link>
          </>
        ) : (
          <nav aria-label="Secciones de la suite" className="flex items-center gap-1">
            {secciones.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                title={s.descripcion}
                className={`whitespace-nowrap rounded-pill px-3 py-1.5 text-sm font-semibold transition-colors ${
                  activo(s.href)
                    ? "bg-[linear-gradient(135deg,#1a2b4c,#2a9d8f)] text-white"
                    : "text-navy-800 hover:bg-smoke"
                }`}
              >
                <span aria-hidden className="mr-1">{s.icono}</span>
                {s.label}
              </Link>
            ))}
            <span className="ml-auto pl-4 text-xs text-navy-800/50">
              {account ? `${account.slice(0, 6)}…${account.slice(-4)}` : ""}
            </span>
          </nav>
        )}
      </div>
    </div>
  );
}
