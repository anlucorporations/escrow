import { NextResponse } from 'next/server'
import { initSchema } from '../../../server/db.js'
import { listNotifications, markNotificationsRead } from '../../../server/lib.js'

/**
 * Notificaciones (M15).
 * GET  /api/notifications?user=  — listado + no leídas
 * POST /api/notifications/read { user }  — marcar como leídas
 */
export async function GET(request) {
  try {
    await initSchema()
    const { searchParams } = new URL(request.url)
    const user = searchParams.get('user')
    if (!user) return NextResponse.json({ error: 'Falta ?user=' }, { status: 400 })
    const data = await listNotifications(user)
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al listar notificaciones' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await initSchema()
    const body = await request.json()
    if (!body.user) return NextResponse.json({ error: 'Falta user' }, { status: 400 })
    await markNotificationsRead(body.user)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al marcar leídas' }, { status: 500 })
  }
}
