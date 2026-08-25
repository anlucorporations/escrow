import { NextResponse } from 'next/server'
import { initSchema } from '../../../server/db.js'
import { createCampaign, listCampaigns } from '../../../server/lib.js'

/**
 * Campañas (M11): venta masiva y recolección.
 * POST /api/campaigns  { owner, title, description?, kind? }
 * GET  /api/campaigns  — listado
 * (aprobación: POST /api/campaigns/[id]/approve, solo Socios)
 */
export async function GET() {
  try {
    await initSchema()
    const campaigns = await listCampaigns()
    return NextResponse.json({ campaigns })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al listar campañas' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await initSchema()
    const body = await request.json()
    if (!body.owner) return NextResponse.json({ error: 'Falta owner' }, { status: 400 })
    const campaign = await createCampaign({
      owner: body.owner,
      title: body.title,
      description: body.description,
      kind: body.kind,
    })
    return NextResponse.json({ campaign }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al crear campaña' }, { status: 400 })
  }
}
