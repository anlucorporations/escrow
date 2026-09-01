/**
 * Gestión centralizada de secretos e información sensible (GCP).
 *
 * Política de seguridad (condiciones GCP):
 *  - NINGUNA clave privada o secreto se hardcodea en el código fuente.
 *  - En producción los secretos se inyectan desde GCP Secret Manager
 *    (Cloud Run `--set-secrets` los entrega como variables de entorno, o se
 *    consultan bajo demanda vía la API de Secret Manager usando la metadata
 *    server del entorno).
 *  - Si un secreto REQUERIDO falta en producción, el proceso falla al
 *    arrancar (fail-fast) en lugar de operar con un valor inseguro.
 *  - Los únicos valores de respaldo son para desarrollo local (NODE_ENV !=
 *    production) y están marcados explícitamente como tales.
 */

// Secretos críticos que el indexador / jobs deben precargar al arrancar.
export const DEFAULT_SECRETS = [
  'DATABASE_URL',
  'RPC_URL',
  'KYC_SECRET',
  'RELAYER_PRIVATE_KEY',
]

export function isProduction() {
  return process.env.NODE_ENV === 'production'
}

/** Detecta si el proceso corre dentro de Google Cloud. */
export function isGcp() {
  return Boolean(
    process.env.GCP_PROJECT_ID ||
      process.env.GCP_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.K_SERVICE || // Cloud Run
      process.env.CLOUD_RUN ||
      process.env.GAE_SERVICE // App Engine
  )
}

export function gcpProject() {
  return (
    process.env.GCP_PROJECT_ID ||
    process.env.GCP_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    ''
  )
}

const smCache = new Map()

/** Token OAuth2 de la metadata server (ADC implícita en Cloud Run/Compute). */
async function metadataAccessToken() {
  const res = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(5000) }
  )
  if (!res.ok) throw new Error(`Metadata server: HTTP ${res.status}`)
  const data = await res.json()
  return data.access_token
}

/** Consulta la versión `latest` de un secreto en Secret Manager (REST). */
async function accessSecretManager(name) {
  if (!isGcp()) {
    throw new Error(`No se puede consultar Secret Manager: entorno GCP no detectado (secreto "${name}")`)
  }
  const project = gcpProject()
  if (!project) throw new Error('No se pudo determinar GCP_PROJECT_ID para Secret Manager')
  const token = await metadataAccessToken()
  const url = `https://secretmanager.googleapis.com/v1/projects/${project}/secrets/${name}/versions/latest:access`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Secret Manager "${name}": HTTP ${res.status} ${detail.slice(0, 200)}`)
  }
  const data = await res.json()
  return Buffer.from(data.payload.data, 'base64').toString('utf8')
}

/** Alternativa local: leer el secreto con la CLI de gcloud (ADC del usuario). */
async function accessSecretGcloud(name) {
  const { execFileSync } = await import('node:child_process')
  const args = ['secrets', 'versions', 'access', 'latest', '--secret', name]
  const project = gcpProject()
  if (project) args.push('--project', project)
  const out = execFileSync('gcloud', args, { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 })
  return out.trim()
}

/**
 * Devuelve el valor de un secreto siguiendo este orden:
 *  1. Variable de entorno ya inyectada (Cloud Run --set-secrets, .env, shell).
 *  2. GCP Secret Manager (metadata server) si el entorno es GCP.
 *  3. gcloud CLI si USE_GCLOUD_SECRETS=true (desarrollo/ops fuera de Cloud Run).
 *  Devuelve `fallback` (solo desarrollo) o `null` si no se encuentra.
 */
export async function getSecret(name, { fallback } = {}) {
  const fromEnv = process.env[name]
  if (fromEnv !== undefined && fromEnv !== '') return fromEnv.trim()

  if (smCache.has(name)) return smCache.get(name)

  let value = null
  if (isGcp()) {
    try {
      value = await accessSecretManager(name)
    } catch (err) {
      if (process.env.LOG_SECRET_ERRORS === 'true') {
        console.warn(`[secrets] ${err.message}`)
      }
    }
  }
  if (value == null && process.env.USE_GCLOUD_SECRETS === 'true') {
    try {
      value = await accessSecretGcloud(name)
    } catch {
      // gcloud no disponible o secreto inexistente — se maneja en el llamador
    }
  }

  if (value != null) {
    // Los secretos NO llevan whitespace significativo: se recorta cualquier
    // \r/\n residual (creados con echo/heredoc) que rompería URLs o claves.
    const clean = value.trim()
    smCache.set(name, clean)
    return clean
  }
  return fallback !== undefined ? fallback : null
}

/** Secreto obligatorio: lanza error si no está disponible (fail-fast). */
export async function requireSecret(name) {
  const value = await getSecret(name)
  if (value == null || value === '') {
    throw new Error(
      `Secreto requerido "${name}" no configurado: inyéctalo en Cloud Run con ` +
        `--set-secrets="${name}=${name}:latest" o defínelo en Secret Manager.`
    )
  }
  return value
}

/**
 * Versión sincrónica para módulos que no pueden ser async (ej. cifrado KYC).
 * En producción NO hay fallback: si falta la variable, lanza error.
 * En desarrollo se permite `devFallback` explícito (valor de prueba, nunca real).
 */
export function envOrThrow(name, { devFallback } = {}) {
  const value = process.env[name]
  if (value !== undefined && value !== '') return value.trim()
  if (!isProduction() && devFallback !== undefined) return devFallback
  throw new Error(
    `Variable/secreto requerido "${name}" no configurado${isProduction() ? ' en producción' : ''}. ` +
      'Configúralo vía Secret Manager (--set-secrets) o variable de entorno.'
  )
}

/**
 * Precarga los secretos críticos desde Secret Manager al arrancar
 * (indexador, jobs, scripts de mantenimiento). No-op si ya están en env.
 */
export async function loadSecrets(names = DEFAULT_SECRETS) {
  for (const name of names) {
    try {
      await getSecret(name)
    } catch {
      // se ignora: los consumidores validan con requireSecret/envOrThrow
    }
  }
}

/** Marca los valores de respaldo de desarrollo para auditoría (nunca en prod). */
export function devOnly(value) {
  if (isProduction()) {
    throw new Error('devOnly() usado en producción: valor de respaldo no permitido')
  }
  return value
}
