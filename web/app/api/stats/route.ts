import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import {
  ESCROW_ADDRESS,
  ESCROW_ABI,
  USER_REGISTRY_ADDRESS,
  USER_REGISTRY_ABI,
} from '@/lib/contracts'
import { PlatformStats } from '@/lib/stats'
import { envOrThrow } from '@/server/secrets'

// Q5/H-13: fail-fast en producción (nada de degradación silenciosa a localhost)
const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? envOrThrow('RPC_URL', { devFallback: 'http://127.0.0.1:8545' })
const provider = new ethers.JsonRpcProvider(RPC_URL)

const PAGE_SIZE = 100
const MAX_PAGES = 5 // límite para la demo (500 operaciones máximo)

/**
 * Estadísticas públicas de la plataforma.
 * On-chain (fuente de verdad) + capa de datos (catálogo, reputación).
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

    // Capa de datos (M1+): catálogo y reputación; tolerante a fallos
    try {
      const { query, initSchema } = await import('../../../server/db.js')
      await initSchema()
      const items = (await query('SELECT COUNT(*) AS total FROM items')) as Array<{ total: number | string }>
      const users = (await query('SELECT trust_level, COUNT(*) AS total FROM users GROUP BY trust_level')) as Array<{
        trust_level: string
        total: number | string
      }>
      const ratings = (await query('SELECT COUNT(*) AS total, AVG(acceptance) AS a FROM ratings')) as Array<{
        total: number | string
        a: number | string | null
      }>

      stats.items = Number(items[0].total)
      stats.usersByLevel = Object.fromEntries(users.map((u) => [u.trust_level, Number(u.total)]))
      stats.ratings = Number(ratings[0].total)
      stats.avgRating = ratings[0].a == null ? 0 : Math.round(Number(ratings[0].a) * 100) / 100
    } catch {
      // BD no disponible: la landing sigue mostrando las stats on-chain
    }

    return NextResponse.json(stats)
  } catch {
    return NextResponse.json({ error: 'Stats unavailable' }, { status: 503 })
  }
}
