import { NextResponse } from 'next/server'
import { initSchema } from '../../../../../server/db.js'
import { setUserLocation } from '../../../../../server/lib.js'

/**
 * Ubicación del usuario (M7) — necesaria para la regla de <= 10 km.
 * PUT /api/users/[address]/location  { lat, lng }
 */
export async function PUT(request, { params }) {
  try {
    await initSchema()
    const { address } = await params
    const body = await request.json()
    await setUserLocation(address, Number(body.lat), Number(body.lng))
    return NextResponse.json({ ok: true, address: address.toLowerCase(), lat: Number(body.lat), lng: Number(body.lng) })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al guardar ubicación' }, { status: 400 })
  }
}
