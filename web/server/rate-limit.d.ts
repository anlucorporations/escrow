// Declaración de tipos para server/rate-limit.js (Q4)

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterMs?: number
}

export declare function rateLimit(key: string, opts?: { limit?: number; windowMs?: number }): RateLimitResult

export declare function clientIp(request: Request): string

export declare function applyRateLimit(
  request: Request,
  opts: { scope: string; limit?: number; windowMs?: number }
): RateLimitResult

export declare function rateLimitHeaders(result: RateLimitResult, limit: number, windowMs: number): Record<string, string>
