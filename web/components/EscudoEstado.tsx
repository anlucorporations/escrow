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
      ? "Paso 1 · Verificar mi identidad (código de correo)"
      : estado === "VERIFICADO"
        ? "Paso 2 · Completar certificación (KYC)"
        : "Paso 3 · Certificado — ver mi perfil";

  // Símbolo minimalista (emoji) que acompaña al username según el estado D28
  // (ajuste del director): INSCRITO 🟡 · VERIFICADO 🟢 · CERTIFICADO 🥇
  const icono =
    estado === "INSCRITO" ? "🟡" : estado === "VERIFICADO" ? "🟢" : "🥇";

  return (
    <Link
      href={destino}
      title={etiqueta}
      aria-label={`Estado: ${estado} — ${etiqueta}`}
      className={`inline-flex items-center justify-center text-lg leading-none transition-opacity hover:opacity-75 ${className}`}
    >
      <span aria-hidden>{icono}</span>
    </Link>
  );
}
