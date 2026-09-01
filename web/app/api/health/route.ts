import { NextResponse } from 'next/server'

/**
 * GET /api/health — Health check (Q6/H-06): BD global + RPC.
 * Devuelve 200 solo si ambos están operativos; 503 en caso contrario.
 * Útil para uptime checks de Cloud Monitoring / Cloud Scheduler.
 */
export async function GET() {
  const status = {
    ok: true,
    ts: Date.now(),
    db: false,
    rpc: false,
    block: null as number | null,
  }

  // BD (PostgreSQL global en producción; SQLite en dev)
  try {
    const { query, assertProdDatabase } = await import('@/server/db')
    await assertProdDatabase()
    await query('SELECT 1 AS ok')
    status.db = true
  } catch {
    status.db = false
  }

  // RPC del nodo (Foundry remoto en GCP)
  try {
    const { ethers } = await import('ethers')
    const { envOrThrow } = await import('@/server/secrets')
    const rpcUrl =
      process.env.NEXT_PUBLIC_RPC_URL ?? envOrThrow('RPC_URL', { devFallback: 'http://127.0.0.1:8545' })
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const block = await provider.getBlockNumber()
    status.rpc = true
    status.block = block
  } catch {
    status.rpc = false
  }

  status.ok = status.db && status.rpc
  return NextResponse.json(status, { status: status.ok ? 200 : 503 })
}
