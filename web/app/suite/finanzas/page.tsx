import { redirect } from "next/navigation";

// =============================================================================
// TrueKeate — /suite/finanzas → /suite/valor
// La sección "Finanzas" se renombró a VALOR (decisión del director 2026-09-09).
// Esta ruta se conserva para no romper enlaces viejos (URLs guardadas, mocks).
// =============================================================================
export default function PaginaFinanzasRedirect() {
  redirect("/suite/valor");
}
