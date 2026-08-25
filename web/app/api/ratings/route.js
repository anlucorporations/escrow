import { NextResponse } from 'next/server'
import { initSchema, query } from '../../../server/db'
import { validateRating, createRating, DIMENSIONS } from '../../../server/lib'

/**
 * Valoraciones en 5 dimensiones (M3).
 * POST /api/ratings — emitir valoración (solo partes de operación completada)
 * GET  /api/ratings?user=&limit=&offset= — listado de valoraciones recibidas
 */
export async function GET(request) {
  try {
    await initSchema()
    const { searchParams } = new URL(request.url)
    const user = searchParams.get('user')
    if (!user) {
      return NextResponse.json({ error: 'Falta ?user=' }, { status: 400 })
    }
    const limit = Math.min(Number(searchParams.get('limit') || 20), 100)
    const offset = Number(searchParams.get('offset') || 0)
    const rows = await query(
      `SELECT * FROM ratings WHERE ratee = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [user.toLowerCase(), limit, offset]
    )
    const total = await query('SELECT COUNT(*) AS total FROM ratings WHERE ratee = ?', [user.toLowerCase()])
    return NextResponse.json({ ratings: rows, total: Number(total[0].total) })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al listar valoraciones' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await initSchema()
    const body = await request.json()
    const { operationId, rater, ratee, comment } = body

    if (!operationId || !rater || !ratee) {
      return NextResponse.json({ error: 'Faltan operationId, rater y ratee' }, { status: 400 })
    }

    const check = await validateRating(operationId, rater)
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 })
    }

    const reputation = await createRating({
      operationId: Number(operationId),
      rater,
      ratee,
      acceptance: body.acceptance,
      honesty: body.honesty,
      security: body.security,
      reliability: body.reliability,
      commitment: body.commitment,
      comment: comment || '',
    })

    return NextResponse.json({ ok: true, reputation, dimensions: DIMENSIONS }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al crear valoración' }, { status: 400 })
  }
}
