import { NextResponse } from 'next/server'
import { initSchema, first } from '../../../../../server/db.js'
import { submitKyc } from '../../../../../server/lib.js'
import { applyRateLimit, rateLimitHeaders } from '../../../../../server/rate-limit.js'

/**
 * KYC del usuario (M6): correo/teléfono cifrados en BD; hashes de documento
 * y selfie; estado público kyc_status. En producción requiere revisión
 * manual; en demo se auto-aprueba.
 * PUT /api/users/[address]/kyc  { email, phone, documentHash?, selfieHash? }
 */
export async function PUT(request, { params }) {
  try {
    const rl = applyRateLimit(request, { scope: 'kyc', limit: 15 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Demasiadas peticiones. Intenta en unos segundos.' }, { status: 429, headers: rateLimitHeaders(rl, 15, 60000) })
    }
    await initSchema()
    const { address } = await params
    const body = await request.json()
    const { email, phone, documentHash, selfieHash } = body

    const existing = await first('SELECT address, email FROM users WHERE address = ?', [address.toLowerCase()])
    if (!existing) {
      return NextResponse.json({ error: 'Usuario no encontrado en la BD (¿indexador activo?)' }, { status: 404 })
    }
    // email/phone son opcionales si el usuario ya tiene valores cifrados
    // (p. ej. aprobación KYC del admin sin conocer sus datos privados)
    if (!email && !phone && !existing.email) {
      return NextResponse.json({ error: 'Faltan email y phone' }, { status: 400 })
    }

    await submitKyc(address, { email: email || '', phone: phone || '', documentHash: documentHash || '', selfieHash: selfieHash || '' })
    return NextResponse.json({ ok: true, kycStatus: 'verified' })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al guardar KYC' }, { status: 400 })
  }
}
