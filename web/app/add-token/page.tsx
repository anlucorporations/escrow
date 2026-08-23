'use client'

import { useState } from 'react'
import { useEscrow, useAllowedTokens } from '@/lib/hooks'
import { ESCROW_ADDRESS } from '@/lib/contracts'
import { getFriendlyError } from '@/lib/escrow'

export default function AddTokenPage() {
  const [tokenAddress, setTokenAddress] = useState('')
  const [arbiterAddress, setArbiterAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const { isConnected, roles, addToken, setArbiter } = useEscrow()
  const { tokens } = useAllowedTokens()

  const isAdmin = roles.isOwner

  const handleAddToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenAddress) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await addToken(tokenAddress)
      setTokenAddress('')
      setSuccess('Token añadido correctamente.')
    } catch (err) {
      setError(getFriendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSetArbiter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!arbiterAddress) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await setArbiter(arbiterAddress)
      setArbiterAddress('')
      setSuccess('Árbitro actualizado correctamente.')
    } catch (err) {
      setError(getFriendlyError(err))
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
              Conecta tu wallet
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Conecta tu wallet primero
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
              Solo administrador
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Solo el owner del contrato puede gestionar tokens y árbitro
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
            Administración
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona tokens autorizados y el rol de árbitro
          </p>
        </div>

        {/* Contract Info */}
        <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>Contrato Escrow:</strong>
          </p>
          <p className="font-mono text-xs break-all text-blue-800 dark:text-blue-300">
            {ESCROW_ADDRESS}
          </p>
          <p className="mt-2 text-sm text-blue-900 dark:text-blue-200">
            <strong>Árbitro actual:</strong>{' '}
            <span className="font-mono text-xs">
              {roles.arbiter ?? 'No configurado (0x000...000)'}
            </span>
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 rounded-lg text-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg text-sm">
            Error: {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Add Token Form */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Añadir nuevo token
            </h2>

            <form onSubmit={handleAddToken} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Dirección del token ERC20
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
                  El contrato valida que sea un contrato con symbol() ERC20
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-400 font-semibold transition-all duration-200"
              >
                {loading ? 'Añadiendo...' : 'Añadir token'}
              </button>
            </form>
          </div>

          {/* Set Arbiter Form */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Árbitro de disputas
            </h2>

            <form onSubmit={handleSetArbiter} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Dirección del árbitro
                </label>
                <input
                  type="text"
                  value={arbiterAddress}
                  onChange={(e) => setArbiterAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Solo el árbitro puede resolver disputas (0x000...000 deshabilita)
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 font-semibold transition-all duration-200"
              >
                {loading ? 'Guardando...' : 'Designar árbitro'}
              </button>
            </form>
          </div>
        </div>

        {/* Added Tokens List */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Tokens autorizados ({tokens.length})
          </h2>

          {tokens.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">Aún no hay tokens añadidos</p>
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
                        {token.name} · {token.decimals} decimals
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
  )
}
