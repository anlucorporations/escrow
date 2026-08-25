import { NextResponse } from 'next/server'
import { initSchema, first } from '../../../../../server/db.js'
import { submitKyc } from '../../../../../server/lib.js'

/**
 * KYC del usuario (M6): correo/teléfono cifrados en BD; hashes de documento
 * y selfie; estado público kyc_status. En producción requiere revisión
 * manual; en demo se auto-aprueba.
 * PUT /api/users/[address]/kyc  { email, phone, documentHash?, selfieHash? }
 */
export async function PUT(request, { params }) {
  try {
    await initSchema()
    const { address } = await params
    const body = await request.json()
    const { email, phone, documentHash, selfieHash } = body

    if (!email || !phone) {
      return NextResponse.json({ error: 'Faltan email y phone' }, { status: 400 })
    }

    const existing = await first('SELECT address FROM users WHERE address = ?', [address.toLowerCase()])
    if (!existing) {
      return NextResponse.json({ error: 'Usuario no encontrado en la BD (¿indexador activo?)' }, { status: 404 })
    }

    await submitKyc(address, { email, phone, documentHash: documentHash || '', selfieHash: selfieHash || '' })
    return NextResponse.json({ ok: true, kycStatus: 'verified' })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al guardar KYC' }, { status: 400 })
  }
}
