import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/contracts'

const provider = new ethers.JsonRpcProvider('http://localhost:8545')

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
      isActive: operation.isActive,
      closedAt: operation.closedAt.toString(),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch operation' }, { status: 500 })
  }
}
