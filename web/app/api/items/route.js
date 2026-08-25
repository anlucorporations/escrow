import { NextResponse } from 'next/server'
import { initSchema } from '../../../server/db'
import { createItem, listItems, verifySignature, itemPayload } from '../../../server/lib'

/**
 * Catálogo de artículos (M2).
 * GET  /api/items?category=&owner=&q=&limit=&offset=  — listado público
 * POST /api/items  — crear artículo (body firmado por la wallet propietaria)
 */
export async function GET(request) {
  try {
    await initSchema()
    const { searchParams } = new URL(request.url)
    const result = await listItems({
      category: searchParams.get('category') || undefined,
      owner: searchParams.get('owner') || undefined,
      q: searchParams.get('q') || undefined,
      limit: Math.min(Number(searchParams.get('limit') || 50), 100),
      offset: Number(searchParams.get('offset') || 0),
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al listar artículos' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await initSchema()
    const body = await request.json()
    const { owner, title, description, category, quantity, images, signature } = body

    if (!owner || !signature) {
      return NextResponse.json({ error: 'Faltan owner/signature (certificación ECDSA requerida)' }, { status: 400 })
    }

    // Certificación: el payload firmado debe coincidir con los datos enviados
    const expected = itemPayload({ owner, title, description, category, quantity })
    if (!verifySignature(expected, signature, owner)) {
      return NextResponse.json({ error: 'Firma inválida: el payload no fue firmado por la wallet propietaria' }, { status: 401 })
    }

    const item = await createItem({ owner, title, description, category, quantity, images: images || [], signature })
    return NextResponse.json({ item }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al crear artículo' }, { status: 400 })
  }
}
