import { NextResponse } from 'next/server'
import { initSchema } from '../../../../server/db.js'
import { getUserIdentityProfile, acceptCommunityTerms } from '../../../../server/lib.js'

/**
 * GET /api/identity/[address]?requester=0x...&isOwner=false
 * Retorna el perfil de identidad con control de privacidad estricto:
 * - Si requester == address o isOwner == true -> Datos privados completos.
 * - Si requester != address -> Solo datos públicos e insignias.
 */
export async function GET(request, context) {
  try {
    await initSchema()
    const { address } = await context.params
    const { searchParams } = new URL(request.url)
    const requester = searchParams.get('requester') || ''
    const isOwner = searchParams.get('isOwner') === 'true'

    const profile = await getUserIdentityProfile(address, requester, isOwner)
    return NextResponse.json({ profile })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al obtener identidad' }, { status: 500 })
  }
}

/**
 * POST /api/identity/[address] — Aceptar acuerdos de convivencia o actualizar perfil
 */
export async function POST(request, context) {
  try {
    await initSchema()
    const { address } = await context.params
    const body = await request.json()
    const { action } = body

    if (action === 'accept_terms') {
      const res = await acceptCommunityTerms(address)
      return NextResponse.json(res)
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al actualizar identidad' }, { status: 500 })
  }
}
