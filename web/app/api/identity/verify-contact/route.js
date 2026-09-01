import { NextResponse } from 'next/server'
import { initSchema } from '../../../../server/db.js'
import { verifyContactChannels } from '../../../../server/lib.js'
import { applyRateLimit, rateLimitHeaders } from '../../../../server/rate-limit.js'

/**
 * POST /api/identity/verify-contact — Valida códigos OTP de correo y teléfono (Nivel 2)
 */
export async function POST(request) {
  try {
    const rl = applyRateLimit(request, { scope: 'identity-verify', limit: 20 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Demasiadas peticiones. Intenta en unos segundos.' }, { status: 429, headers: rateLimitHeaders(rl, 20, 60000) })
    }
    await initSchema()
    const body = await request.json()
    const { address, email, phone, emailCode, phoneCode } = body

    if (!address || !email || !phone) {
      return NextResponse.json({ error: 'Faltan address, email o phone' }, { status: 400 })
    }

    const result = await verifyContactChannels(address, { email, phone, emailCode, phoneCode })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al validar contacto' }, { status: 400 })
  }
}
