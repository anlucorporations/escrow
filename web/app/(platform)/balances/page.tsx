'use client'

import { useCallback, useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { useEthereum } from '@/lib/ethereum'
import { useAllowedTokens } from '@/lib/hooks'
import { ERC20_ABI } from '@/lib/contracts'
import { formatUnits } from '@/lib/escrow'

interface TokenBalance {
  address: string
  symbol: string
  name: string
  decimals: number
  balance: bigint
}

export default function BalancesPage() {
  const [balances, setBalances] = useState<TokenBalance[]>([])
  const [loading, setLoading] = useState(false)
  const { provider, account, isConnected } = useEthereum()
  const { tokens } = useAllowedTokens()

  const loadBalances = useCallback(async () => {
    if (!provider || !account) return
    setLoading(true)
    try {
      const results: TokenBalance[] = []
      for (const token of tokens) {
        try {
          const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider)
          const balance: bigint = await tokenContract.balanceOf(account)
          results.push({ ...token, balance })
        } catch (err) {
          console.error(`Error cargando balance de ${token.address}:`, err)
        }
      }
      setBalances(results)
    } catch (error) {
      console.error('Error cargando balances:', error)
    } finally {
      setLoading(false)
    }
  }, [provider, account, tokens])

  useEffect(() => {
    loadBalances()
    const interval = setInterval(loadBalances, 10000) // Refresh cada 10 s
    return () => clearInterval(interval)
  }, [loadBalances])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Conecta tu wallet
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Conecta tu wallet para ver tus balances
            </p>
          </div>
        </div>
      </div>
    )
  }

  const held = balances.filter((b) => b.balance > 0n)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20">
      <div className="container mx-auto px-4 max-w-5xl pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Tus balances
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Saldos formateados con los decimals reales de cada token
            </p>
          </div>
          <button
            onClick={loadBalances}
            disabled={loading}
            className="px-6 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-all duration-200"
          >
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {/* User Address */}
        <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-200 mb-1">
            <strong>Dirección:</strong>
          </p>
          <p className="font-mono text-sm break-all text-blue-800 dark:text-blue-300">
            {account}
          </p>
        </div>

        {/* Summary Card */}
        {held.length > 0 && (
          <div className="mb-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Tokens con saldo</p>
            <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {held.length}
            </p>
          </div>
        )}

        {/* Token Balances Grid */}
        {balances.length === 0 ? (
          <div className="text-center py-20">
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
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No hay tokens disponibles
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Aún no se han añadido tokens autorizados al contrato
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {balances.map((token) => {
              const hasBalance = token.balance > 0n
              return (
                <div
                  key={token.address}
                  className={`rounded-lg border p-6 transition-all ${
                    hasBalance
                      ? 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:shadow-lg'
                      : 'bg-gray-50 dark:bg-zinc-900/50 border-gray-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {token.symbol}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {token.name}
                      </p>
                    </div>
                    {hasBalance && (
                      <div className="flex-shrink-0">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                          Holding
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-700 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Balance ({token.decimals} decimals)
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {formatUnits(token.balance, token.decimals)}
                    </p>
                  </div>

                  <div className="p-2 bg-gray-50 dark:bg-zinc-800 rounded">
                    <p className="text-xs text-gray-600 dark:text-gray-400 break-all font-mono">
                      {token.address}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
