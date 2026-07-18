'use client'

import { useState, useEffect } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { ESCROW_ADDRESS, ESCROW_ABI, ERC20_ABI } from '@/lib/contracts'
import { ethers } from 'ethers'

interface Operation {
  id: bigint
  user1: string
  tokenA: string
  tokenB: string
  amountA: bigint
  amountB: bigint
  isActive: boolean
  closedAt: bigint
}

function OperationCard({ operation, onRefresh }: { operation: Operation; onRefresh: () => void }) {
  const { account, signer } = useEthereum()
  const [tokenASymbol, setTokenASymbol] = useState('')
  const [tokenBSymbol, setTokenBSymbol] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const loadSymbols = async () => {
      if (!signer) return
      try {
        const tokenA = new ethers.Contract(operation.tokenA, ERC20_ABI, signer)
        const tokenB = new ethers.Contract(operation.tokenB, ERC20_ABI, signer)
        const [symA, symB] = await Promise.all([tokenA.symbol(), tokenB.symbol()])
        setTokenASymbol(symA)
        setTokenBSymbol(symB)
      } catch (err) {
        console.error('Error loading symbols:', err)
      }
    }
    loadSymbols()
  }, [operation, signer])

  const handleComplete = async () => {
    if (!signer) return
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      // Step 1: Approve tokenB
      const tokenContract = new ethers.Contract(operation.tokenB, ERC20_ABI, signer)
      const tx1 = await tokenContract.approve(ESCROW_ADDRESS, operation.amountB)
      await tx1.wait()

      // Step 2: Complete operation
      const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer)
      const tx2 = await contract.completeOperation(operation.id)
      await tx2.wait()

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onRefresh()
      }, 2000)
    } catch (err: unknown) {
      setError((err as Error).message || 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!signer) return
    setLoading(true)
    setError('')
    try {
      const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer)
      const tx = await contract.cancelOperation(operation.id)
      await tx.wait()
      setTimeout(() => onRefresh(), 2000)
    } catch (err: unknown) {
      setError((err as Error).message || 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  const isCreator = account?.toLowerCase() === operation.user1.toLowerCase()

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-zinc-900">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg">Operation #{operation.id.toString()}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Creator: {operation.user1.slice(0, 6)}...{operation.user1.slice(-4)}
          </p>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${
          operation.isActive
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
        }`}>
          {operation.isActive ? 'Active' : 'Closed'}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Offering:</span>
          <span className="font-medium">
            {ethers.formatEther(operation.amountA)} {tokenASymbol || '...'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Requesting:</span>
          <span className="font-medium">
            {ethers.formatEther(operation.amountB)} {tokenBSymbol || '...'}
          </span>
        </div>
      </div>

      {operation.isActive && !isCreator && (
        <div className="space-y-2">
          <button
            onClick={handleComplete}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : 'Complete Operation'}
          </button>
          {success && (
            <div className="text-green-600 text-sm text-center">
              Operation completed successfully!
            </div>
          )}
          {error && (
            <div className="text-red-600 text-sm">
              Error: {error}
            </div>
          )}
        </div>
      )}

      {operation.isActive && isCreator && (
        <button
          onClick={handleCancel}
          disabled={loading}
          className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
        >
          {loading ? 'Cancelling...' : 'Cancel Operation'}
        </button>
      )}

      {!operation.isActive && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          Closed at {new Date(Number(operation.closedAt) * 1000).toLocaleString()}
        </div>
      )}
    </div>
  )
}

export function OperationsList() {
  const [operations, setOperations] = useState<Operation[]>([])
  const { provider } = useEthereum()

  const loadOperations = async () => {
    if (!provider) return

    try {
      const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
      let allOps: any[] = []

      try {
        allOps = await contract.getAllOperations()
      } catch (err) {
        console.log('No operations yet or error fetching operations:', err)
        allOps = []
      }

      const ops: Operation[] = allOps.map((op: any) => ({
        id: op.id,
        user1: op.user1,
        tokenA: op.tokenA,
        tokenB: op.tokenB,
        amountA: op.amountA,
        amountB: op.amountB,
        isActive: op.isActive,
        closedAt: op.closedAt,
      }))

      setOperations(ops)
    } catch (error) {
      console.error('Error loading operations:', error)
    }
  }

  useEffect(() => {
    loadOperations()
    const interval = setInterval(loadOperations, 5000)
    return () => clearInterval(interval)
  }, [provider])

  if (operations.length === 0) {
    return (
      <div className="border rounded-lg p-6 bg-white dark:bg-zinc-900">
        <h2 className="text-xl font-bold mb-4">Operations</h2>
        <p className="text-gray-600 dark:text-gray-400">No operations yet.</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-6 bg-white dark:bg-zinc-900">
      <h2 className="text-xl font-bold mb-4">Operations</h2>
      <div className="grid gap-4">
        {operations.map((op) => (
          <OperationCard
            key={op.id.toString()}
            operation={op}
            onRefresh={loadOperations}
          />
        ))}
      </div>
    </div>
  )
}
