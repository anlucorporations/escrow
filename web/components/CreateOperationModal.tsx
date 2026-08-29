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
        // Sin gas: firma EIP-712 + permit
        if (!provider) throw new Error('Conecta tu billetera primero')
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
        onClose()
      }, 2000)
    } catch (err) {
      setError(getFriendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#1A2B4C]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-5 flex justify-between items-center z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 hexagon-badge bg-gradient-to-tr from-[#1A2B4C] to-[#2A9D8F] flex items-center justify-center text-white text-xs font-bold">
              ⇄
            </div>
            <h2 className="text-xl font-bold font-heading text-[#1A2B4C]">
              Crear Operación Escrow
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 text-slate-500 rounded-full transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isConnected ? (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm">
                Conecta tu wallet primero para aperturar custodia.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              {/* Tipo de operación */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 font-heading">
                  Tipo de Operación
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setKind('SWAP')}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition ${
                      kind === 'SWAP'
                        ? 'bg-[#1A2B4C] text-white border-[#1A2B4C] shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    SWAP (Intercambio)
                  </button>
                  <button
                    type="button"
                    onClick={() => setKind('PAGO')}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition ${
                      kind === 'PAGO'
                        ? 'bg-[#1A2B4C] text-white border-[#1A2B4C] shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    PAGO con Garantía
                  </button>
                </div>
              </div>

              {/* Meta-transacción sin gas */}
              <div className="p-3.5 bg-teal-50/70 border border-[#2A9D8F]/30 rounded-2xl">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={metaTx}
                    onChange={(e) => setMetaTx(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#2A9D8F] focus:ring-[#2A9D8F]"
                  />
                  <span className="text-xs font-bold text-[#1A2B4C] font-heading">
                    ⚡ Sin gas (Meta-transacción EIP-712)
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 mt-1">
                  Solo firmas con tu wallet; el relayer cubre las tarifas de red por ti.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 font-heading">
                  Token A (lo que depositas)
                </label>
                <select
                  value={tokenA}
                  onChange={(e) => setTokenA(e.target.value)}
                  className="w-full h-12 px-4 border-2 border-slate-200 rounded-xl text-sm text-[#1A2B4C] focus:border-[#2A9D8F] focus:bg-[#F8FFFE] outline-none transition"
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 font-heading">
                  Cantidad A ({infoA.info?.symbol ?? 'token'})
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                  placeholder="0.0"
                  className="w-full h-12 px-4 border-2 border-slate-200 rounded-xl text-sm text-[#1A2B4C] focus:border-[#2A9D8F] focus:bg-[#F8FFFE] outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 font-heading">
                  Token B (lo que recibes)
                </label>
                <select
                  value={tokenB}
                  onChange={(e) => setTokenB(e.target.value)}
                  className="w-full h-12 px-4 border-2 border-slate-200 rounded-xl text-sm text-[#1A2B4C] focus:border-[#2A9D8F] focus:bg-[#F8FFFE] outline-none transition"
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 font-heading">
                  Cantidad B ({infoB.info?.symbol ?? 'token'})
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                  placeholder="0.0"
                  className="w-full h-12 px-4 border-2 border-slate-200 rounded-xl text-sm text-[#1A2B4C] focus:border-[#2A9D8F] focus:bg-[#F8FFFE] outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 font-heading">
                  Plazo (días) — 0 = sin expiración
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(e.target.value)}
                  className="w-full h-12 px-4 border-2 border-slate-200 rounded-xl text-sm text-[#1A2B4C] focus:border-[#2A9D8F] focus:bg-[#F8FFFE] outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-truekeat-primary py-3.5 px-4 text-xs uppercase tracking-wider mt-2"
              >
                {loading
                  ? metaTx
                    ? 'Firmando y enviando al relayer...'
                    : 'Creando custodia...'
                  : metaTx
                    ? '⚡ Crear sin Gas (EIP-712)'
                    : 'Aperturar Custodia Escrow'}
              </button>

              {success && (
                <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold text-center">
                  Operación creada correctamente.
                  {txHash && (
                    <span className="block font-mono text-[10px] mt-1 break-all">tx: {txHash}</span>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-xs font-bold text-center">
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
