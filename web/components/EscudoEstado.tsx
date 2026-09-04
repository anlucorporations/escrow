"use client";

// =============================================================================
// TrueKeate — Escudo de estado D28 (acceso rápido a Verificar/Certificar)
// Icono en la barra de navegación que representa el estado del usuario y lleva
// al proceso correspondiente (decisión del director):
//   - INSCRITO   → escudo AMARILLO        → /suite/verificacion (verificar correo)
//   - VERIFICADO → escudo VERDE           → /suite/certificacion (KYC)
//   - CERTIFICADO→ escudo verde con brillo dorado → /suite/perfil (estado completo)
// =============================================================================
import Link from "next/link";
import { useSesion } from "@/lib/sesion";

export function EscudoEstado({ className = "" }: { className?: string }) {
  const { acceso } = useSesion();
  const inscrito = acceso.fase === "inscrito" ? acceso.usuario : null;
  if (!inscrito) return null;

  const estado = inscrito.estado; // INSCRITO | VERIFICADO | CERTIFICADO

  // Rutas de destino según estado
  const destino =
    estado === "INSCRITO"
      ? "/suite/verificacion"
      : estado === "VERIFICADO"
        ? "/suite/certificacion"
        : "/suite/perfil";

  const etiqueta =
    estado === "INSCRITO"
      ? "Verificar mi identidad (código de correo)"
      : estado === "VERIFICADO"
        ? "Completar certificación (KYC)"
        : "Certificado — ver mi perfil";

  // Colores del escudo según estado
  const color =
    estado === "INSCRITO"
      ? "bg-gold-500 text-navy-800 shadow-[0_0_0_3px_rgba(212,175,55,0.35)]"
      : estado === "VERIFICADO"
        ? "bg-teal-500 text-white shadow-[0_0_0_3px_rgba(42,157,143,0.35)]"
        : "bg-[linear-gradient(135deg,#2a9d8f,#1a7a6e)] text-white shadow-[0_0_0_3px_rgba(212,175,55,0.55)]";

  const icono =
    estado === "INSCRITO" ? "🛡️" : estado === "VERIFICADO" ? "🛡️" : "🛡️✨";

  return (
    <Link
      href={destino}
      title={etiqueta}
      aria-label={`Escudo de estado: ${estado} — ${etiqueta}`}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-base transition-transform hover:scale-110 ${color} ${className}`}
    >
      <span aria-hidden>{icono}</span>
    </Link>
  );
}
