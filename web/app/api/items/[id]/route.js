import { NextResponse } from 'next/server'
import { initSchema, query } from '../../../../server/db'
import { getReputation, LEVEL_LABELS, getItem } from '../../../../server/lib'

/**
 * Detalle de un artículo (M2) + perfil público del propietario (M3/M4).
 * GET /api/items/[id]
 */
export async function GET(request, { params }) {
  try {
    await initSchema()
    const { id } = await params
    const item = await getItem(id)
    if (!item) {
      return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 })
    }

    const reputation = await getReputation(item.owner)
    const owner = await query('SELECT address, username, trust_level, is_business, kyc_status FROM users WHERE address = ?', [item.owner])

    return NextResponse.json({
      item,
      owner: owner[0]
        ? {
            address: owner[0].address,
            username: owner[0].username,
            trustLevel: owner[0].trust_level,
            levelLabel: LEVEL_LABELS[owner[0].trust_level] || owner[0].trust_level,
            isBusiness: Number(owner[0].is_business) === 1,
            kycStatus: owner[0].kyc_status,
          }
        : { address: item.owner },
      reputation,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al obtener el artículo' }, { status: 500 })
  }
}
