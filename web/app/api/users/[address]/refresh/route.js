import { NextResponse } from 'next/server'
import { initSchema } from '../../../../../server/db.js'
import { refreshTrustLevel, LEVEL_LABELS } from '../../../../../server/lib.js'

/**
 * Recalcula el nivel de confianza de un usuario (M4).
 * POST /api/users/[address]/refresh
 */
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
