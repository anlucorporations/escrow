import { NextResponse } from 'next/server'
import { initSchema, first } from '../../../../server/db'

/**
 * Operación desde la capa de datos (M1). A diferencia de la cadena, aquí
 * se conoce user2 (completada por), útil para valoraciones (M3).
 * GET /api/operations/[id]
 */
export async function GET(request, { params }) {
  try {
    await initSchema()
    const { id } = await params
    const op = await first('SELECT * FROM operations WHERE id = ?', [Number(id)])
    if (!op) {
      return NextResponse.json({ error: 'Operación no encontrada (¿indexador activo?)' }, { status: 404 })
    }
    return NextResponse.json({ operation: op })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al obtener la operación' }, { status: 500 })
  }
}
