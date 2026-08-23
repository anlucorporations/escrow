import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/contracts'

// RPC configurable vía variable de entorno (portable a otras redes).
//   RPC_URL=http://localhost:8545  (por defecto)
const RPC_URL = process.env.RPC_URL ?? 'http://localhost:8545'
const provider = new ethers.JsonRpcProvider(RPC_URL)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
    const operation = await contract.getOperation(BigInt(id))

    return NextResponse.json({
      id: operation.id.toString(),
      user1: operation.user1,
      tokenA: operation.tokenA,
      tokenB: operation.tokenB,
      amountA: operation.amountA.toString(),
      amountB: operation.amountB.toString(),
      status: Number(operation.status),
      createdAt: operation.createdAt.toString(),
      deadline: operation.deadline.toString(),
      closedAt: operation.closedAt.toString(),
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch operation' }, { status: 500 })
  }
}
