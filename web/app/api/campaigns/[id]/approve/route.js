import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { initSchema } from '../../../../../server/db.js'
import { approveCampaign } from '../../../../../server/lib.js'
import { envOrThrow } from '../../../../../server/secrets.js'

/**
 * Aprobación de campañas (M11): solo Socios, verificado on-chain contra
 * Governance.isSocio(). POST /api/campaigns/[id]/approve  { approver }
 */
// Q5/H-13: fail-fast en producción
const RPC_URL = envOrThrow('RPC_URL', { devFallback: 'http://127.0.0.1:8545' })
const GOVERNANCE = process.env.NEXT_PUBLIC_GOVERNANCE_ADDRESS ?? '0x0000000000000000000000000000000000000000'
const provider = new ethers.JsonRpcProvider(RPC_URL)

export async function POST(request, { params }) {
  try {
    await initSchema()
    const { id } = await params
    const body = await request.json()
    if (!body.approver) return NextResponse.json({ error: 'Falta approver' }, { status: 400 })
    const campaign = await approveCampaign(id, body.approver, GOVERNANCE, provider)
    return NextResponse.json({ campaign })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al aprobar campaña' }, { status: 400 })
  }
}
