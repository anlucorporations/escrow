import { NextResponse } from 'next/server'
import { initSchema } from '../../../../server/db.js'
import { setup2FASecret, confirm2FA } from '../../../../server/lib.js'
import { applyRateLimit, rateLimitHeaders } from '../../../../server/rate-limit.js'

/**
 * POST /api/identity/2fa
 * action: 'setup' -> Genera secreto y otpauthUri para app Authenticator
 * action: 'confirm' -> Valida el código TOTP de 6 dígitos y activa 2FA
 */
export async function POST(request) {
  try {
    const rl = applyRateLimit(request, { scope: 'identity-2fa', limit: 20 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Demasiadas peticiones. Intenta en unos segundos.' }, { status: 429, headers: rateLimitHeaders(rl, 20, 60000) })
    }
    await initSchema()
    const body = await request.json()
    const { address, action, code } = body

    if (!address) {
      return NextResponse.json({ error: 'Address es requerido' }, { status: 400 })
    }

    if (action === 'setup') {
      const data = await setup2FASecret(address)
      return NextResponse.json(data)
    }

    if (action === 'confirm') {
      if (!code) return NextResponse.json({ error: 'Código 2FA requerido' }, { status: 400 })
      const result = await confirm2FA(address, code)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Acción 2FA no válida' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error en 2FA' }, { status: 400 })
  }
}
