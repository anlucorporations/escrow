import { NextResponse } from 'next/server'
import { initSchema } from '../../../../../server/db.js'
import { closeMeetup } from '../../../../../server/lib.js'

/**
 * M16 — Cierra el intercambio (ambas partes conformes).
 * POST /api/meetups/[id]/close
 */
export async function POST(request, { params }) {
  try {
    await initSchema()
    const { id } = await params
    const result = await closeMeetup(id)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al cerrar intercambio' }, { status: 500 })
  }
}
