'use client'

import { useState } from 'react'
import { useEscrow, useAllowedTokens, useTokenInfo } from '@/lib/hooks'
import { getFriendlyError, parseUnits } from '@/lib/escrow'
import { buildMetaCreate, relayRequest } from '@/lib/relay'

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
  const [metaTx, setMetaTx] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')

  const { isConnected, provider, createOperation } = useEscrow()
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
    setTxHash('')

    try {
      const days = parseInt(deadlineDays || '0', 10)
      const deadline =
        days > 0 ? BigInt(Math.floor(Date.now() / 1000) + days * 86400) : 0n
      const amountAUnits = parseUnits(amountA, infoA.info?.decimals ?? 18)
      const amountBUnits = parseUnits(amountB, infoB.info?.decimals ?? 18)

      if (metaTx) {
        // M5: sin gas — el usuario solo firma (EIP-712 + permit); el relayer paga
        if (!provider) throw new Error('Connect your wallet first')
        const signer = await provider.getSigner()
        const req = await buildMetaCreate(signer, provider, {
          tokenA,
          tokenB,
          amountA: amountAUnits,
          amountB: amountBUnits,
          deadline,
        })
        const res = await relayRequest(req)
        setTxHash(res.txHash)
      } else {
        await createOperation({
          tokenA,
          tokenB,
          amountA: amountAUnits,
          amountB: amountBUnits,
          deadline,
        })
      }

      setSuccess(true)
      setTimeout(() => {
        setTokenA('')
        setTokenB('')
        setAmountA('')
        setAmountB('')
        setDeadlineDays('0')
        setSuccess(false)
        setTxHash('')
        onClose() // el padre re-fetcha los datos (sin recargar la página)
      }, 2000)
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

              {/* M5: meta-transacción sin gas */}
              <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={metaTx}
                    onChange={(e) => setMetaTx(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    ⚡ Sin gas (meta-transacción)
                  </span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Solo firmas (EIP-712 + permit); el relayer paga el gas por ti.
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
                {loading
                  ? metaTx
                    ? 'Firmando y enviando al relayer...'
                    : 'Creando (approve + tx)...'
                  : metaTx
                    ? '⚡ Crear sin gas'
                    : 'Crear operación'}
              </button>

              {success && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
                  Operación creada correctamente.
                  {txHash && (
                    <span className="block font-mono text-xs mt-1 break-all">tx: {txHash}</span>
                  )}
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
