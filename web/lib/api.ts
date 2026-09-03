// =============================================================================
// TrueKeate — Cliente API (frontend → backend)
// URL base: NEXT_PUBLIC_API_URL (en GCP apunta al Cloud Run truekeate-api).
// Funciones para el control de acceso: estado de inscripción, inscripción
// formal y catálogo público.
// =============================================================================

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";

export interface UsuarioPublico {
  wallet: string;
  tipo: "PARTICULAR" | "EMPRESA" | "SOCIO";
  nivel: "INICIADO" | "COMUN" | "FRECUENTE" | "SOCIO";
  estado: "INSCRITO" | "VERIFICADO" | "CERTIFICADO";
}

export interface EstadoInscripcion {
  inscrito: boolean;
  usuario: UsuarioPublico | null;
}

export interface ArticuloCatalogo {
  id: number;
  titulo: string;
  descripcion?: string;
  rubro?: string;
  disponible?: boolean;
  usuarioWallet?: string;
  usuarioNivel?: string;
}

async function pedir<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${ruta}`, {
    headers: { "Content-Type": "application/json" },
    ...opciones,
  });
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => ({}));
    const err = new Error(cuerpo.error || `HTTP ${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

/** GET /auth/estado?wallet=0x… — ¿la wallet está inscrita? (guarda de acceso) */
export async function consultarEstado(wallet: string): Promise<EstadoInscripcion> {
  try {
    return await pedir<EstadoInscripcion>(`/auth/estado?wallet=${encodeURIComponent(wallet)}`);
  } catch {
    return { inscrito: false, usuario: null };
  }
}

/** POST /auth/register — inscripción formal (correo+teléfono+dirección+GDPR) */
export async function inscribirse(datos: {
  wallet: string;
  correo: string;
  telefono: string;
  direccionInscripcion?: string;
  consentimientoGdpr: boolean;
}): Promise<EstadoInscripcion> {
  return await pedir<EstadoInscripcion>("/auth/register", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

/** GET /catalog — ofertas observables (wallet conectada, inscrita o no) */
export async function obtenerCatalogo(): Promise<ArticuloCatalogo[]> {
  const r = await pedir<{ articulos: ArticuloCatalogo[] }>("/catalog");
  return r.articulos ?? [];
}
