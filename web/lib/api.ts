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

// =============================================================================
// Sesión autenticada (firma EIP-191) + endpoints del panel Owner (RF-13.1)
// =============================================================================

const MENSAJE_SESION = "TrueKeate: iniciar sesión";

/** POST /auth/session — firma EIP-191 → token Bearer + usuario. */
export async function iniciarSesion(firma: string, mensaje = MENSAJE_SESION): Promise<{ token: string; usuario: UsuarioPublico }> {
  return await pedir<{ token: string; usuario: UsuarioPublico }>("/auth/session", {
    method: "POST",
    body: JSON.stringify({ mensaje, firma }),
  });
}

/** Petición autenticada con token Bearer. */
async function pedirAuth<T>(ruta: string, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${ruta}`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => ({}));
    const err = new Error(cuerpo.error || `HTTP ${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

export interface AdminDb {
  usuarios: number;
  articulos: number;
  truekes: number;
}

export interface AdminKpis {
  totalTruekes: number;
  disputasAbiertas: number;
}

export interface AdminContratos {
  contratos: Record<string, { direccion: string; abi?: unknown[] }>;
}

export interface AdminInfra {
  relayer?: { ok: boolean; wallet: string; saldo?: string; saldoBajo?: boolean; chainId?: number };
  relayerMetricas?: Record<string, unknown>;
  indexador?: { cabeza?: number; lag?: Record<string, number>; procesados?: number; fallidos?: number };
}

/** GET /admin/contratos — direcciones de los contratos (Owner). */
export function adminContratos(token: string): Promise<AdminContratos> {
  return pedirAuth<AdminContratos>("/admin/contratos", token);
}

/** GET /admin/db — estado de la BD off-chain (Owner). */
export function adminDb(token: string): Promise<AdminDb> {
  return pedirAuth<AdminDb>("/admin/db", token);
}

/** GET /admin/kpis-disputas — KPIs de disputas (Owner). */
export function adminKpis(token: string): Promise<AdminKpis> {
  return pedirAuth<AdminKpis>("/admin/kpis-disputas", token);
}

/** GET /admin/infra/health — salud del relayer e indexador (Owner). */
export function adminInfra(token: string): Promise<AdminInfra> {
  return pedirAuth<AdminInfra>("/admin/infra/health", token);
}

/** GET /admin/usuarios — usuarios inscritos (Owner). */
export async function adminUsuarios(token: string): Promise<{ total: number; usuarios: UsuarioPublico[] }> {
  return await pedirAuth<{ total: number; usuarios: UsuarioPublico[] }>("/admin/usuarios", token);
}
