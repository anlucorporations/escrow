import { NextResponse } from 'next/server'
import { initSchema } from '../../../server/db.js'
import { createItem, listItems, verifySignature, verifyImageSignatures, itemPayload } from '../../../server/lib.js'

/**
 * Catálogo de artículos (M2) + certificación de imágenes (M8).
 * GET  /api/items?category=&owner=&q=&limit=&offset=  — listado público
 * POST /api/items  — crear artículo (payload e imágenes firmados por la wallet)
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

    // M8: cada imagen debe estar certificada (hash SHA-256 + firma de la wallet)
    const certifiedImages = verifyImageSignatures(images, owner)

    const item = await createItem({ owner, title, description, category, quantity, images: certifiedImages, signature })
    return NextResponse.json({ item }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al crear artículo' }, { status: 400 })
  }
}
