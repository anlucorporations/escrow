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
  /** Correo registrado (visible solo en consultas propias). */
  correo?: string | null;
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

/** Petición autenticada con token Bearer (GET o POST). */
async function pedirAuth<T>(ruta: string, token: string, opciones?: { metodo?: "GET" | "POST"; body?: unknown }): Promise<T> {
  const res = await fetch(`${API_URL}${ruta}`, {
    method: opciones?.metodo ?? "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: opciones?.body !== undefined ? JSON.stringify(opciones.body) : undefined,
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

// =============================================================================
// Módulos de la suite (integración C8): truekes, finanzas, disputas, gobernanza
// =============================================================================

export interface Trueke {
  id: number;
  escrowId: number | null;
  articuloAId: number | null;
  articuloBId: number | null;
  tituloA?: string | null;
  tituloB?: string | null;
  usuarioA: string;
  usuarioB: string;
  estado: string;
  horaPautada?: string | null;
  updatedAt?: string | null;
}

export interface FinanzasMi {
  nftsStock: Record<string, unknown>;
  criptos: Record<string, unknown>;
  brlt?: number;
  fondoValor?: number;
  porcentajesConfig?: { trueque: number; suscripciones: number; brlt: number };
  rol: string;
}

export interface Disputa {
  id: number;
  truekeId: number;
  solicitante: string;
  motivo?: string;
  estado: string;
  resolucion?: string;
  sancion?: string;
  registroVotos?: unknown;
  usuarioA: string;
  usuarioB: string;
  estadoTrueke: string;
  createdAt: string;
}

export interface PropuestaGobernanza {
  id: number;
  tipo: string;
  descripcion: string;
  proponente: string;
  parametro: string;
  votosAFavor: number;
  votosEnContra: number;
  ejecutada: boolean;
  yaVoto: boolean;
}

/** Nivel D12 (clasificación del puntaje 0–100). */
export type NivelD12 = "INICIADO" | "COMUN" | "FRECUENTE" | "SOCIO";

/** Medalla D12 asociada a cada nivel (BRONCE/PLATA/ORO). */
export type MedallaD12 = "BRONCE" | "PLATA" | "ORO";

/**
 * Respuesta de GET /reputacion/mi (CU-20, D12/D30).
 * El backend devuelve: { puntaje, nivel, medalla?, oroHistorico,
 * metricas: { efectivos, apelaciones, reputacionMedia }, formula }.
 * `medalla` puede faltar según versión del backend — se declara opcional.
 */
export interface ReputacionMi {
  puntaje: number;
  nivel: NivelD12;
  medalla?: MedallaD12;
  oroHistorico: boolean;
  metricas: {
    efectivos: number;
    apelaciones: number;
    reputacionMedia: number;
  };
  formula: string;
}

/** GET /reputacion/mi — puntaje, nivel, medalla, Oro histórico y métricas (requiere sesión). */
export function miReputacion(token: string): Promise<ReputacionMi> {
  return pedirAuth<ReputacionMi>("/reputacion/mi", token);
}

/** GET /truekes — mis trueques (requiere sesión). */
export function misTruekes(token: string): Promise<{ truekes: Trueke[] }> {
  return pedirAuth<{ truekes: Trueke[] }>("/truekes", token);
}

/** POST /truekes — crear trueque. */
export function crearTrueke(token: string, datos: { articuloAId: number; articuloBId: number; parteB: string; horaPautada?: string }): Promise<{ trueke: Trueke }> {
  return pedirAuth<{ trueke: Trueke }>("/truekes", token, { metodo: "POST", body: datos });
}

/** POST /truekes/:id/custodiar — custodiar lado A/B. */
export function custodiarTrueke(token: string, id: number, lado: "A" | "B"): Promise<{ trueke: Trueke }> {
  return pedirAuth<{ trueke: Trueke }>(`/truekes/${id}/custodiar`, token, { metodo: "POST", body: { lado } });
}

/** POST /truekes/:id/firma-recepcion — firmar recepción lado A/B. */
export function firmarRecepcion(token: string, id: number, lado: "A" | "B"): Promise<{ trueke: Trueke }> {
  return pedirAuth<{ trueke: Trueke }>(`/truekes/${id}/firma-recepcion`, token, { metodo: "POST", body: { lado } });
}

/** POST /truekes/:id/valoracion — valoración 1–5. */
export function valorarTrueke(token: string, id: number, datos: { valorado: string; aceptacion: number; honestidad: number; seguridad: number; confiabilidad: number; compromiso: number }): Promise<{ ok: boolean; trueke: Trueke }> {
  return pedirAuth<{ ok: boolean; trueke: Trueke }>(`/truekes/${id}/valoracion`, token, { metodo: "POST", body: datos });
}

/** GET /finanzas/mi — saldos propios. */
export function finanzasMi(token: string): Promise<FinanzasMi> {
  return pedirAuth<FinanzasMi>("/finanzas/mi", token);
}

/** GET /disputas — disputas donde soy parte. */
export function misDisputas(token: string): Promise<{ disputas: Disputa[] }> {
  return pedirAuth<{ disputas: Disputa[] }>("/disputas", token);
}

/** POST /disputas — solicitar anulación. */
export function solicitarDisputa(token: string, datos: { truekeId: number; motivo?: string }): Promise<{ disputa: Disputa }> {
  return pedirAuth<{ disputa: Disputa }>("/disputas", token, { metodo: "POST", body: datos });
}

/** GET /gobernanza/propuestas — propuestas del registry on-chain. */
export function propuestasGobernanza(token: string): Promise<{ propuestas: PropuestaGobernanza[] }> {
  return pedirAuth<{ propuestas: PropuestaGobernanza[] }>("/gobernanza/propuestas", token);
}

/** GET /gobernanza/socios — padrón (total + esSocio de la wallet). */
export function gobernanzaSocios(token: string): Promise<{ totalSocios: number; esSocio: boolean }> {
  return pedirAuth<{ totalSocios: number; esSocio: boolean }>("/gobernanza/socios", token);
}

/** POST /gobernanza/votar — voto de Socio (D21). */
export function votarPropuesta(token: string, propuestaId: number, aFavor: boolean): Promise<{ ok: boolean; txHash?: string; simulado?: boolean }> {
  return pedirAuth<{ ok: boolean; txHash?: string; simulado?: boolean }>("/gobernanza/votar", token, { metodo: "POST", body: { propuestaId, aFavor } });
}

// =============================================================================
// Inventario (catálogo autenticado)
// =============================================================================

/** POST /catalog/articulos — publicar artículo (Verificado/Certificado, RF-14.4). */
export function publicarArticulo(
  token: string,
  datos: { titulo: string; rubro: string; descripcion?: string }
): Promise<{ articulo: ArticuloCatalogo }> {
  return pedirAuth<{ articulo: ArticuloCatalogo }>("/catalog/articulos", token, {
    metodo: "POST",
    body: datos,
  });
}

/** POST /catalog/:id/despublicar — marca un artículo propio como no disponible. */
export function despublicarArticulo(token: string, id: number): Promise<{ ok: boolean; articulo?: ArticuloCatalogo }> {
  return pedirAuth<{ ok: boolean }>(`/catalog/${id}/despublicar`, token, { metodo: "POST", body: {} });
}

// =============================================================================
// KYC / escalera D28 (verificación con código de correo y certificación)
// =============================================================================

export interface KycInitResult {
  kyc: { wallet?: string; estado?: string; etapa?: number } | null;
  aviso: string;
  codigoDemo?: string; // solo sin SMTP configurado (modo demo/desarrollo)
}

export interface KycStatusResult {
  estado: "INSCRITO" | "VERIFICADO" | "CERTIFICADO" | null;
  kyc: { wallet?: string; estado?: string; etapa?: number; revisadoPor?: string } | null;
}

/** POST /kyc/init — inicia la verificación: genera y envía el código al correo. */
export function iniciarVerificacion(token: string): Promise<KycInitResult> {
  return pedirAuth<KycInitResult>("/kyc/init", token, { metodo: "POST", body: {} });
}

/** POST /kyc/verify-codes — valida el código del correo → VERIFICADO. */
export function verificarCodigo(token: string, codigoCorreo: string): Promise<{ usuario: UsuarioPublico; kyc: unknown }> {
  return pedirAuth<{ usuario: UsuarioPublico; kyc: unknown }>("/kyc/verify-codes", token, {
    metodo: "POST",
    body: { codigoCorreo },
  });
}

/** GET /kyc/status — estado de la escalera D28. */
export function estadoKyc(token: string): Promise<KycStatusResult> {
  return pedirAuth<KycStatusResult>("/kyc/status", token);
}

/** POST /kyc/submit — envía documento + selfie → PENDIENTE (revisión Owner). */
export function enviarKyc(token: string, datos: { documentoRef: string; selfieRef: string }): Promise<{ kyc: unknown; aviso: string }> {
  return pedirAuth<{ kyc: unknown; aviso: string }>("/kyc/submit", token, { metodo: "POST", body: datos });
}
