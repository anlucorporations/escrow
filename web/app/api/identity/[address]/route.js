import { NextResponse } from 'next/server'
import { initSchema } from '../../../../server/db.js'
import { getUserIdentityProfile, acceptCommunityTerms } from '../../../../server/lib.js'

/**
 * GET /api/identity/[address]?requester=0x...
 * Retorna el perfil de identidad con control de privacidad estricto:
 * - Si requester == address -> Datos privados completos (propietario).
 * - Si requester == owner del contrato Escrow (verificado on-chain) -> Datos privados completos.
 * - Cualquier otro -> Solo datos públicos e insignias.
 *
 * El flag `isOwner` NUNCA se acepta del cliente: se deriva del contrato.
 */
async function isPlatformOwner(requester) {
  if (!requester) return false
  try {
    const { ethers } = await import('ethers')
    const { ESCROW_ADDRESS, ESCROW_ABI } = await import('@/lib/contracts')
    const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'http://127.0.0.1:8545'
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
    const owner = await escrow.owner()
    return owner.toLowerCase() === requester.toLowerCase()
  } catch {
    return false
  }
}

export async function GET(request, context) {
  try {
    await initSchema()
    const { address } = await context.params
    const { searchParams } = new URL(request.url)
    const requester = searchParams.get('requester') || ''

    // El acceso de "Owner" se valida contra el contrato; el parámetro del cliente se ignora.
    const isOwner = await isPlatformOwner(requester)

    const profile = await getUserIdentityProfile(address, requester, isOwner)
    return NextResponse.json({ profile })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al obtener identidad' }, { status: 500 })
  }
}

/**
 * POST /api/identity/[address] — Aceptar acuerdos de convivencia o actualizar perfil
 */
export async function POST(request, context) {
  try {
    await initSchema()
    const { address } = await context.params
    const body = await request.json()
    const { action } = body

    if (action === 'accept_terms') {
      const res = await acceptCommunityTerms(address)
      return NextResponse.json(res)
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al actualizar identidad' }, { status: 500 })
  }
}
