import { NextResponse } from 'next/server'
import { initSchema } from '../../../../server/db.js'
import { verifyThirdPartySBT } from '../../../../server/lib.js'
import { applyRateLimit, rateLimitHeaders } from '../../../../server/rate-limit.js'

/**
 * POST /api/identity/verify-sbt — Verifica y registra un SBT de terceros (Binance BABT, WorldID, etc.)
 */
export async function POST(request) {
  try {
    const rl = applyRateLimit(request, { scope: 'identity-sbt', limit: 20 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Demasiadas peticiones. Intenta en unos segundos.' }, { status: 429, headers: rateLimitHeaders(rl, 20, 60000) })
    }
    await initSchema()
    const body = await request.json()
    const { address, sbtContract, sbtProviderName, tokenId, signature } = body

    if (!address || !sbtContract || !sbtProviderName) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios (address, sbtContract, sbtProviderName)' }, { status: 400 })
    }

    const result = await verifyThirdPartySBT(address, { sbtContract, sbtProviderName, tokenId, signature })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al verificar SBT' }, { status: 400 })
  }
}
