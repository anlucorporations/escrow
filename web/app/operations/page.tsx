'use client'

import { useState, useEffect } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { ESCROW_ADDRESS, ESCROW_ABI, ERC20_ABI } from '@/lib/contracts'
import { ethers } from 'ethers'
import { CreateOperationModal } from '@/components/CreateOperationModal'

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
      const tokenContract = new ethers.Contract(operation.tokenB, ERC20_ABI, signer)
      const tx1 = await tokenContract.approve(ESCROW_ADDRESS, operation.amountB)
      await tx1.wait()

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
    <div className="border border-gray-200 dark:border-zinc-700 rounded-lg p-6 bg-white dark:bg-zinc-900 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">
            Operation #{operation.id.toString()}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Creator: {operation.user1.slice(0, 6)}...{operation.user1.slice(-4)}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            operation.isActive
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
          }`}
        >
          {operation.isActive ? 'Active' : 'Closed'}
        </span>
      </div>

      <div className="space-y-3 mb-6 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Offering</p>
            <p className="font-bold text-lg text-gray-900 dark:text-white">
              {ethers.formatEther(operation.amountA)} {tokenASymbol || '...'}
            </p>
          </div>
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4"
            />
          </svg>
          <div className="text-right">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Requesting</p>
            <p className="font-bold text-lg text-gray-900 dark:text-white">
              {ethers.formatEther(operation.amountB)} {tokenBSymbol || '...'}
            </p>
          </div>
        </div>
      </div>

      {operation.isActive && !isCreator && (
        <div className="space-y-2">
          <button
            onClick={handleComplete}
            disabled={loading}
            className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-400 font-semibold transition-all duration-200"
          >
            {loading ? 'Processing...' : 'Complete Operation'}
          </button>
          {success && (
            <div className="text-green-600 dark:text-green-400 text-sm text-center bg-green-50 dark:bg-green-900/20 p-2 rounded">
              Operation completed successfully!
            </div>
          )}
          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
              Error: {error}
            </div>
          )}
        </div>
      )}

      {operation.isActive && isCreator && (
        <button
          onClick={handleCancel}
          disabled={loading}
          className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 font-semibold transition-all duration-200"
        >
          {loading ? 'Cancelling...' : 'Cancel Operation'}
        </button>
      )}

      {!operation.isActive && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-zinc-800 rounded">
          Closed at {new Date(Number(operation.closedAt) * 1000).toLocaleString()}
        </div>
      )}
    </div>
  )
}

export default function OperationsPage() {
  const [operations, setOperations] = useState<Operation[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all')
  const [showModal, setShowModal] = useState(false)
  const { provider, isConnected } = useEthereum()

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

  const filteredOperations = operations.filter((op) => {
    if (filter === 'active') return op.isActive
    if (filter === 'closed') return !op.isActive
    return true
  })

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Connect Your Wallet
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Please connect your wallet to view operations
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20">
      <div className="container mx-auto px-4 max-w-5xl pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Operations
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your escrow operations and token swaps
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl w-full sm:w-auto"
          >
            + New Operation
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-8">
          {(['all', 'active', 'closed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({' '}
              {filteredOperations.filter(
                (op) =>
                  (f === 'all' || f === 'active') && op.isActive ||
                  (f === 'all' || f === 'closed') && !op.isActive
              ).length}{' '}
              )
            </button>
          ))}
        </div>

        {/* Operations List */}
        {filteredOperations.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No operations found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'all'
                ? 'Start by creating a new operation'
                : `No ${filter} operations at the moment`}
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredOperations.map((op) => (
              <OperationCard
                key={op.id.toString()}
                operation={op}
                onRefresh={loadOperations}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateOperationModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          loadOperations()
        }}
      />
    </div>
  )
}
