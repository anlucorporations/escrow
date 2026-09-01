import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/contracts'
import { envOrThrow } from '@/server/secrets'
import { applyRateLimit, rateLimitHeaders } from '@/server/rate-limit'

/**
 * Relayer de meta-transacciones (M5).
 *
 * Recibe intenciones firmadas por los usuarios (EIP-712 + permit EIP-2612)
 * y las ejecuta en la blockchain pagando el gas con la clave del relayer.
 * Los particulares firman gratis; el contrato verifica las firmas y nonces.
 *
 *   POST /api/relay  { kind: 'create'|'complete', ...intención firmada }
 *
 * La clave del relayer se configura con RELAYER_PRIVATE_KEY.
 *  - Producción (GCP): se inyecta desde Secret Manager (`--set-secrets`);
 *    si falta, la PRIMERA petición falla con error claro (fail-fast en
 *    runtime, no en build). NUNCA usa un valor por defecto en producción.
 *  - Desarrollo: fallback explícito a la cuenta #4 de Anvil (solo local).
 *
 * Los secretos se leen de forma perezosa (primer request) para que `next build`
 * pueda compilar sin variables de entorno y la imagen no hornee secretos.
 */
let relay: { provider: ethers.JsonRpcProvider; wallet: ethers.Wallet } | null = null

function getRelay() {
  if (!relay) {
    const rpcUrl =
      process.env.NEXT_PUBLIC_RPC_URL ?? envOrThrow('RPC_URL', { devFallback: 'http://127.0.0.1:8545' })
    const relayerKey = envOrThrow('RELAYER_PRIVATE_KEY', {
      devFallback: '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
    })
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    relay = { provider, wallet: new ethers.Wallet(relayerKey, provider) }
  }
  return relay
}

interface PermitBody {
  deadline: string
  v: number
  r: string
  s: string
}

interface CreateBody {
  kind: 'create'
  user: string
  tokenA: string
  tokenB: string
  amountA: string
  amountB: string
  deadline: string
  nonce: string
  signature: string
  permit: PermitBody
}

interface CompleteBody {
  kind: 'complete'
  user: string
  operationId: string
  nonce: string
  signature: string
  permit: PermitBody
}

export async function POST(request: Request) {
  // Q4/H-12: rate-limit básico por IP — el relayer quema gas del operador.
  const rl = applyRateLimit(request, { scope: 'relay', limit: 10, windowMs: 60_000 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas peticiones al relayer. Intenta en unos segundos.' },
      { status: 429, headers: rateLimitHeaders(rl, 10, 60_000) }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  try {
    const { wallet } = getRelay()
    const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet)

    if (body.kind === 'create') {
      const { user, tokenA, tokenB, amountA, amountB, deadline, nonce, signature, permit } =
        body as unknown as CreateBody
      const tx = await escrow.metaCreateOperation(
        user,
        tokenA,
        tokenB,
        BigInt(amountA),
        BigInt(amountB),
        BigInt(deadline),
        BigInt(nonce),
        signature,
        BigInt(permit.deadline),
        permit.v,
        permit.r,
        permit.s
      )
      const receipt = await tx.wait()
      return NextResponse.json({ ok: true, txHash: receipt.hash, kind: 'create' })
    }

    if (body.kind === 'complete') {
      const { user, operationId, nonce, signature, permit } = body as unknown as CompleteBody
      const tx = await escrow.metaCompleteOperation(
        user,
        BigInt(operationId),
        BigInt(nonce),
        signature,
        BigInt(permit.deadline),
        permit.v,
        permit.r,
        permit.s
      )
      const receipt = await tx.wait()
      return NextResponse.json({ ok: true, txHash: receipt.hash, kind: 'complete' })
    }

    return NextResponse.json({ error: 'kind debe ser create o complete' }, { status: 400 })
  } catch (err: unknown) {
    const e = err as { shortMessage?: string; message?: string }
    const msg = e?.shortMessage || e?.message || 'Error en el relayer'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
