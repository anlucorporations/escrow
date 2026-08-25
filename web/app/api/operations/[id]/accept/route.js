import { NextResponse } from 'next/server'
import { initSchema } from '../../../../../server/db.js'
import { acceptOperation } from '../../../../../server/lib.js'

/**
 * Aceptación de la operación (M7): la contraparte registra su acuerdo en la
 * capa de datos para habilitar encuentros con la regla de <= 10 km.
 * POST /api/operations/[id]/accept  { address }
 */
export async function POST(request, { params }) {
  try {
    await initSchema()
    const { id } = await params
    const body = await request.json()
    if (!body.address) {
      return NextResponse.json({ error: 'Falta address' }, { status: 400 })
    }
    const result = await acceptOperation(id, body.address)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al aceptar operación' }, { status: 500 })
  }
}
