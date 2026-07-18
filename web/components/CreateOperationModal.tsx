'use client'

import { useState, useEffect } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { ESCROW_ADDRESS, ESCROW_ABI, ERC20_ABI } from '@/lib/contracts'
import { ethers } from 'ethers'

interface CreateOperationModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateOperationModal({ isOpen, onClose }: CreateOperationModalProps) {
  const [tokenA, setTokenA] = useState('')
  const [tokenB, setTokenB] = useState('')
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [tokens, setTokens] = useState<Array<{ address: string; symbol: string }>>([])

  const { isConnected, provider } = useEthereum()

  useEffect(() => {
    const loadTokens = async () => {
      if (!provider) return
      try {
        const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
        let allowedTokens: string[] = []

        try {
          allowedTokens = await contract.getAllowedTokens()
        } catch (err) {
          console.log('No tokens yet or error fetching tokens:', err)
          allowedTokens = []
        }

        const tokenData = await Promise.all(
          allowedTokens.map(async (addr: string) => {
            try {
              const tokenContract = new ethers.Contract(addr, ERC20_ABI, provider)
              const symbol = await tokenContract.symbol()
              return { address: addr, symbol }
            } catch {
              return { address: addr, symbol: addr.slice(0, 6) }
            }
          })
        )

        setTokens(tokenData)
      } catch (err) {
        console.error('Error loading tokens:', err)
      }
    }
    if (isOpen) {
      loadTokens()
    }
  }, [provider, isOpen])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenA || !tokenB || !amountA || !amountB || !provider) return

    setLoading(true)
    setError('')

    try {
      const currentSigner = await provider.getSigner()

      const tokenContract = new ethers.Contract(tokenA, ERC20_ABI, currentSigner)
      const amount = ethers.parseEther(amountA)

      const tx1 = await tokenContract.approve(ESCROW_ADDRESS, amount)
      await tx1.wait()

      const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, currentSigner)
      const tx2 = await contract.createOperation(
        tokenA,
        tokenB,
        amount,
        ethers.parseEther(amountB)
      )
      await tx2.wait()

      setSuccess(true)
      setTimeout(() => {
        setTokenA('')
        setTokenB('')
        setAmountA('')
        setAmountB('')
        setSuccess(false)
        onClose()
        window.location.reload()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create Operation
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isConnected ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                Please connect your wallet first
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Token A (You Provide)
                </label>
                <select
                  value={tokenA}
                  onChange={(e) => setTokenA(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select token...</option>
                  {tokens.map((token) => (
                    <option key={token.address} value={token.address}>
                      {token.symbol} - {token.address.slice(0, 6)}...{token.address.slice(-4)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Amount A
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Token B (You Want)
                </label>
                <select
                  value={tokenB}
                  onChange={(e) => setTokenB(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select token...</option>
                  {tokens.map((token) => (
                    <option key={token.address} value={token.address}>
                      {token.symbol} - {token.address.slice(0, 6)}...{token.address.slice(-4)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Amount B
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 font-semibold transition-all duration-200"
              >
                {loading ? 'Creating...' : 'Create Operation'}
              </button>

              {success && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
                  Operation created successfully!
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  Error: {error}
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
