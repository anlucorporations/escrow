'use client'

import { useState } from 'react'
import { useEscrow, useAllowedTokens, useTokenInfo } from '@/lib/hooks'
import { getFriendlyError, parseUnits } from '@/lib/escrow'

interface CreateOperationModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateOperationModal({ isOpen, onClose }: CreateOperationModalProps) {
  const [tokenA, setTokenA] = useState('')
  const [tokenB, setTokenB] = useState('')
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const [deadlineDays, setDeadlineDays] = useState('0')
  const [kind, setKind] = useState<'SWAP' | 'PAGO'>('SWAP')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const { isConnected, createOperation } = useEscrow()
  const { tokens } = useAllowedTokens()
  const infoA = useTokenInfo(tokenA || null)
  const infoB = useTokenInfo(tokenB || null)

  if (!isOpen) return null

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenA || !tokenB || !amountA || !amountB) return
    if (tokenA === tokenB) {
      setError('Los tokens A y B deben ser distintos.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const days = parseInt(deadlineDays || '0', 10)
      const deadline =
        days > 0 ? BigInt(Math.floor(Date.now() / 1000) + days * 86400) : 0n

      await createOperation({
        tokenA,
        tokenB,
        amountA: parseUnits(amountA, infoA.info?.decimals ?? 18),
        amountB: parseUnits(amountB, infoB.info?.decimals ?? 18),
        deadline,
      })

      setSuccess(true)
      setTimeout(() => {
        setTokenA('')
        setTokenB('')
        setAmountA('')
        setAmountB('')
        setDeadlineDays('0')
        setSuccess(false)
        onClose() // el padre re-fetcha los datos (sin recargar la página)
      }, 1500)
    } catch (err) {
      setError(getFriendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Crear operación
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isConnected ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                Conecta tu wallet primero
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-5">
              {/* Tipo de operación */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Tipo de operación
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setKind('SWAP')}
                    className={`px-4 py-2 rounded-lg border text-sm font-semibold transition ${
                      kind === 'SWAP'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    SWAP (intercambio)
                  </button>
                  <button
                    type="button"
                    onClick={() => setKind('PAGO')}
                    className={`px-4 py-2 rounded-lg border text-sm font-semibold transition ${
                      kind === 'PAGO'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    PAGO con garantía
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {kind === 'SWAP'
                    ? 'Intercambio directo tokenA ↔ tokenB.'
                    : 'tokenA = pago (ej. USDT), tokenB = recibo de entrega. Ideal con deadline y arbitraje.'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Token A (lo que depositas)
                </label>
                <select
                  value={tokenA}
                  onChange={(e) => setTokenA(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecciona token...</option>
                  {tokens.map((token) => (
                    <option key={token.address} value={token.address}>
                      {token.symbol} — {token.address.slice(0, 6)}...{token.address.slice(-4)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Cantidad A ({infoA.info?.symbol ?? 'token'})
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Token B (lo que recibes)
                </label>
                <select
                  value={tokenB}
                  onChange={(e) => setTokenB(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecciona token...</option>
                  {tokens.map((token) => (
                    <option key={token.address} value={token.address}>
                      {token.symbol} — {token.address.slice(0, 6)}...{token.address.slice(-4)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Cantidad B ({infoB.info?.symbol ?? 'token'})
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Plazo (deadline, en días) — 0 = sin expiración
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 font-semibold transition-all duration-200"
              >
                {loading ? 'Creando (approve + tx)...' : 'Crear operación'}
              </button>

              {success && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
                  Operación creada correctamente.
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
