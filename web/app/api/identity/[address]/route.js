import { NextResponse } from 'next/server'
import { initSchema } from '../../../../server/db.js'
import { getUserIdentityProfile, acceptCommunityTerms, verifyIdentityAccess } from '../../../../server/lib.js'

/**
 * GET /api/identity/[address]?requester=0x...&signature=0x...&timestamp=...
 * Retorna el perfil de identidad con control de privacidad estricto:
 * - Datos privados completos SOLO si `requester` firma (ECDSA) el payload
 *   "TrueKeateIdentity:<address>:<timestamp>" con su wallet (Q1/H-02):
 *     * titular (requester == address) -> perfil privado propio.
 *     * owner del contrato Escrow (verificado on-chain Y con firma válida).
 * - Sin firma válida o sin coincidencia -> SOLO datos públicos.
 *
 * El flag `isOwner` NUNCA se acepta del cliente: se deriva del contrato.
 */
async function isPlatformOwner(requester) {
  if (!requester) return false
  try {
    const { ethers } = await import('ethers')
    const { ESCROW_ADDRESS, ESCROW_ABI } = await import('@/lib/contracts')
    const { envOrThrow } = await import('@/server/secrets')
    const RPC_URL =
      process.env.NEXT_PUBLIC_RPC_URL ?? envOrThrow('RPC_URL', { devFallback: 'http://127.0.0.1:8545' })
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
    const signature = searchParams.get('signature') || ''
    const timestamp = searchParams.get('timestamp') || ''

    // Prueba criptográfica de que `requester` posee su wallet (firma fresca).
    const provedOwnership = verifyIdentityAccess(requester, signature, timestamp)

    // El acceso de "Owner" requiere firma válida; el parámetro del cliente se ignora.
    const isOwner = provedOwnership && (await isPlatformOwner(requester))
    // El titular recibe datos privados solo si demostró posesión de su wallet.
    const verifiedSelf = provedOwnership && requester.toLowerCase() === address.toLowerCase()

    const profile = await getUserIdentityProfile(address, requester, isOwner, verifiedSelf)
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
