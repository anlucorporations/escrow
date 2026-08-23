import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import {
  ESCROW_ADDRESS,
  ESCROW_ABI,
  USER_REGISTRY_ADDRESS,
  USER_REGISTRY_ABI,
} from '@/lib/contracts'
import { PlatformStats } from '@/lib/stats'

// RPC configurable vía variable de entorno (portable a otras redes).
//   RPC_URL=http://localhost:8545  (por defecto)
const RPC_URL = process.env.RPC_URL ?? 'http://localhost:8545'
const provider = new ethers.JsonRpcProvider(RPC_URL)

const PAGE_SIZE = 100
const MAX_PAGES = 5 // límite para la demo (500 operaciones máximo)

/**
 * Estadísticas públicas de la plataforma leídas on-chain.
 * Se usa en la landing (visible sin billetera conectada).
 */
export async function GET() {
  try {
    const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
    const registry = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, provider)

    const [totalRaw, tokenCountRaw, userCountRaw] = await Promise.all([
      escrow.getOperationsCount(),
      escrow.getAllowedTokensCount(),
      registry.getRegisteredWalletsCount(),
    ])

    const total = Number(totalRaw)
    let completed = 0
    let active = 0

    const pages = Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGES)
    for (let p = 0; p < pages; p++) {
      const ops = await escrow.getOperations(p * PAGE_SIZE, PAGE_SIZE)
      for (const op of ops) {
        const status = Number(op.status)
        if (status === 1) completed++
        else if (status === 0) active++
      }
    }

    const stats: PlatformStats = {
      totalOperations: total,
      completedOperations: completed,
      activeOperations: active,
      tokens: Number(tokenCountRaw),
      users: Number(userCountRaw),
    }

    return NextResponse.json(stats)
  } catch {
    return NextResponse.json({ error: 'Stats unavailable' }, { status: 503 })
  }
}
