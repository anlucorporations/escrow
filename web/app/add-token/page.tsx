'use client'

import { useState, useEffect } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { ESCROW_ADDRESS, ESCROW_ABI, ERC20_ABI } from '@/lib/contracts'
import { ethers } from 'ethers'

export default function AddTokenPage() {
  const [tokenAddress, setTokenAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [tokens, setTokens] = useState<Array<{ address: string; symbol: string; name: string }>>([])
  const [isAdmin, setIsAdmin] = useState(false)

  const { isConnected, provider, account } = useEthereum()

  // Check if user is owner
  useEffect(() => {
    const checkAdmin = async () => {
      if (!provider || !account) {
        setIsAdmin(false)
        return
      }

      try {
        const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
        const owner = await contract.owner()
        setIsAdmin(owner.toLowerCase() === account.toLowerCase())
      } catch (err) {
        setIsAdmin(false)
      }
    }

    checkAdmin()
  }, [account, provider])

  useEffect(() => {
    const loadTokens = async () => {
      if (!provider) return
      try {
        const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
        let allowedTokens: string[] = []

        try {
          const rawTokens = await contract.getAllowedTokens()
          allowedTokens = rawTokens.map((addr: string) => ethers.getAddress(addr))
        } catch (err) {
          console.log('No tokens yet or error fetching tokens:', err)
          allowedTokens = []
        }

        const tokenData = await Promise.all(
          allowedTokens.map(async (addr: string) => {
            try {
              const tokenContract = new ethers.Contract(addr, ERC20_ABI, provider)
              const [symbol, name] = await Promise.all([
                tokenContract.symbol(),
                tokenContract.name(),
              ])
              return { address: addr, symbol, name }
            } catch (err) {
              console.error(`Error loading token ${addr}:`, err)
              return { address: addr, symbol: '???', name: 'Unknown Token' }
            }
          })
        )

        setTokens(tokenData)
      } catch (err) {
        console.error('Error loading tokens:', err)
      }
    }
    loadTokens()
  }, [provider, success])

  const handleAddToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenAddress || !provider) return

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const currentSigner = await provider.getSigner()
      const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, currentSigner)
      const tx = await contract.addToken(tokenAddress)
      await tx.wait()

      setSuccess(true)
      setTokenAddress('')

      setTimeout(() => {
        setSuccess(false)
        window.location.reload()
      }, 2000)
    } catch (err: any) {
      console.error('Error adding token:', err)
      setError(err.message || 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Connect Your Wallet
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Please connect your wallet first
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4v2m0 4v2M6.228 6.228a9 9 0 1012.544 0M9 11a3 3 0 106 0 3 3 0 00-6 0z"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Admin Only
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Only the contract owner can add new tokens
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20">
      <div className="container mx-auto px-4 max-w-4xl pb-20">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Token Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Add new ERC20 tokens to the escrow contract
          </p>
        </div>

        {/* Contract Info */}
        <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>Escrow Contract:</strong>
          </p>
          <p className="font-mono text-xs break-all text-blue-800 dark:text-blue-300">
            {ESCROW_ADDRESS}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Add Token Form */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Add New Token
            </h2>

            <form onSubmit={handleAddToken} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Token Contract Address
                </label>
                <input
                  type="text"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must be a valid ERC20 token contract address
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-400 font-semibold transition-all duration-200"
              >
                {loading ? 'Adding Token...' : 'Add Token'}
              </button>

              {success && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 rounded-lg text-sm">
                  Token added successfully!
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg text-sm">
                  Error: {error}
                </div>
              )}
            </form>
          </div>

          {/* Added Tokens List */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Allowed Tokens ({tokens.length})
            </h2>

            {tokens.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m0 0h6m0 0h-6m0 0h-6"
                    />
                  </svg>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  No tokens added yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tokens.map((token) => (
                  <div
                    key={token.address}
                    className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-700 rounded-lg border border-gray-200 dark:border-zinc-600 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {token.symbol}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {token.name}
                        </div>
                        <div className="text-xs font-mono text-gray-500 dark:text-gray-500 break-all">
                          {token.address}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <svg
                          className="w-5 h-5 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
