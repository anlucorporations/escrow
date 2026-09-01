import { NextResponse } from 'next/server'
import { initSchema } from '../../../server/db.js'
import { createVouch, listVouches } from '../../../server/lib.js'
import { applyRateLimit, rateLimitHeaders } from '../../../server/rate-limit.js'

/**
 * Avales entre usuarios verificados (M12).
 * POST /api/vouches  { vouchBy, vouchFor }  — solo KYC verificado
 * GET  /api/vouches?user=  — avales recibidos
 */
export async function GET(request) {
  try {
    await initSchema()
    const { searchParams } = new URL(request.url)
    const user = searchParams.get('user')
    if (!user) return NextResponse.json({ error: 'Falta ?user=' }, { status: 400 })
    const vouches = await listVouches(user)
    return NextResponse.json({ vouches, total: vouches.length })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al listar avales' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const rl = applyRateLimit(request, { scope: 'vouches', limit: 30 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Demasiadas peticiones. Intenta en unos segundos.' }, { status: 429, headers: rateLimitHeaders(rl, 30, 60000) })
    }
    await initSchema()
    const body = await request.json()
    if (!body.vouchBy || !body.vouchFor) {
      return NextResponse.json({ error: 'Faltan vouchBy y vouchFor' }, { status: 400 })
    }
    await createVouch(body.vouchBy, body.vouchFor)
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al crear aval' }, { status: 400 })
  }
}
