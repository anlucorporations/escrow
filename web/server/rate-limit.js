/**
 * Rate-limiting básico (Q4/H-12, H-01) — ventana fija en memoria por clave.
 *
 * Protege endpoints públicos de escritura (relayer, identidad, ratings,
 * meetups, vouches) contra abuso/DoS de gas y del nodo compartido.
 *
 * Nota: en Cloud Run con varias instancias el límite es por instancia (no
 * global); para un control estricto multi-instancia habría que respaldarlo en
 * la BD (M7). Esto cubre el "rate-limiting básico" del plan.
 */

const buckets = new Map()

/** Periodicamente se limpian los buckets vencidos para no acumular memoria. */
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key)
  }
}, 5 * 60 * 1000).unref?.()

/**
 * @returns {{allowed:boolean, remaining:number, retryAfterMs?:number}}
 */
export function rateLimit(key, { limit = 30, windowMs = 60_000 } = {}) {
  const now = Date.now()
  const entry = buckets.get(key)
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now }
  }
  entry.count += 1
  return { allowed: true, remaining: limit - entry.count }
}

/** IP del cliente (primer hop de x-forwarded-for; 'unknown' si no hay). */
export function clientIp(request) {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}

/** Aplica el límite con clave `<scope>:<ip>` y devuelve el resultado. */
export function applyRateLimit(request, { scope, limit = 30, windowMs = 60_000 } = {}) {
  return rateLimit(`${scope}:${clientIp(request)}`, { limit, windowMs })
}

/** Cabeceras HTTP estándar para informar del límite (y 429 con Retry-After). */
export function rateLimitHeaders(result, limit, windowMs) {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil((result.retryAfterMs ?? windowMs) / 1000)),
  }
}
