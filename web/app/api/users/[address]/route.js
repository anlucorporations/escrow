import { NextResponse } from 'next/server'
import { initSchema, first } from '../../../../server/db.js'
import { getReputation, refreshTrustLevel, LEVEL_LABELS, computeTrustLevel } from '../../../../server/lib.js'

/**
 * Perfil público de un usuario (M3/M4).
 * GET  /api/users/[address] — reputación, nivel, estadísticas
 * POST /api/users/[address]/refresh — recalcula el nivel de confianza
 */
export async function GET(request, { params }) {
  try {
    await initSchema()
    const { address } = await params
    const addr = address.toLowerCase()

    const user = await first('SELECT * FROM users WHERE address = ?', [addr])
    const reputation = await getReputation(addr)
    const completed = await first(
      'SELECT COUNT(*) AS total FROM operations WHERE (user1 = ? OR user2 = ?) AND status = 1',
      [addr, addr]
    )
    const active = await first('SELECT COUNT(*) AS total FROM operations WHERE user1 = ? AND status = 0', [addr])
    const items = await first('SELECT COUNT(*) AS total FROM items WHERE owner = ?', [addr])
    const vouches = await first('SELECT COUNT(*) AS total FROM vouches WHERE vouch_for = ?', [addr])

    const level = user ? user.trust_level : computeTrustLevel({ avgRating: reputation.overall, completedCount: Number(completed.total || 0) })

    return NextResponse.json({
      address: addr,
      username: user?.username || null,
      isBusiness: user ? Number(user.is_business) === 1 : false,
      kycStatus: user?.kyc_status || 'pending',
      subscriptionStatus: user?.subscription_status || 'none',
      trustLevel: level,
      levelLabel: LEVEL_LABELS[level] || level,
      reputation,
      stats: {
        completed: Number(completed.total || 0),
        active: Number(active.total || 0),
        items: Number(items.total || 0),
        vouches: Number(vouches.total || 0),
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al obtener perfil' }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    await initSchema()
    const { address } = await params
    const level = await refreshTrustLevel(address)
    if (!level) {
      return NextResponse.json({ error: 'Usuario no encontrado en la BD (¿indexador activo?)' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, trustLevel: level, levelLabel: LEVEL_LABELS[level] })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al refrescar nivel' }, { status: 500 })
  }
}
