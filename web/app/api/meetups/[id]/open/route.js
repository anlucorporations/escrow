import { NextResponse } from 'next/server'
import { initSchema } from '../../../../../server/db.js'
import { openMeetup } from '../../../../../server/lib.js'

/**
 * M16 — Abre el intercambio por una de las partes (ventana ±10 min).
 * POST /api/meetups/[id]/open  { address }
 */
export async function POST(request, { params }) {
  try {
    await initSchema()
    const { id } = await params
    const body = await request.json()
    if (!body.address) return NextResponse.json({ error: 'Falta address' }, { status: 400 })
    const result = await openMeetup(id, body.address)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ ok: true, meetup: result.meetup })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al abrir intercambio' }, { status: 500 })
  }
}
