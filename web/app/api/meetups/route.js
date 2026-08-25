import { NextResponse } from 'next/server'
import { initSchema } from '../../../server/db.js'
import { createMeetup, listMeetups } from '../../../server/lib.js'

/**
 * Puntos de encuentro (M7).
 * POST /api/meetups  — proponer encuentro (valida parte + distancia <= 10 km)
 * GET  /api/meetups?operationId=  — encuentros de una operación
 */
export async function GET(request) {
  try {
    await initSchema()
    const { searchParams } = new URL(request.url)
    const operationId = searchParams.get('operationId')
    if (!operationId) {
      return NextResponse.json({ error: 'Falta ?operationId=' }, { status: 400 })
    }
    const meetups = await listMeetups(operationId)
    return NextResponse.json({ meetups })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al listar encuentros' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await initSchema()
    const body = await request.json()
    const { operationId, requester, scheduledAt, lat, lng, placeName } = body
    if (!operationId || !requester) {
      return NextResponse.json({ error: 'Faltan operationId y requester' }, { status: 400 })
    }
    const result = await createMeetup({
      operationId,
      requester,
      scheduledAt,
      lat: Number(lat),
      lng: Number(lng),
      placeName: placeName || '',
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ meetup: result.meetup }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al crear encuentro' }, { status: 500 })
  }
}
