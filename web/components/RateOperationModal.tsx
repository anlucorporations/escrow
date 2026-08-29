'use client'

import { useState } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { getFriendlyError } from '@/lib/escrow'

interface RateOperationModalProps {
  operationId: bigint
  counterparty: string
  isCreator: boolean
  onClose: () => void
}

const DIMENSIONS = [
  { key: 'acceptance', label: 'Aceptación del producto', hint: 'Apariencia y estado del artículo' },
  { key: 'honesty', label: 'Honestidad publicitaria', hint: '¿La descripción fue fiel?' },
  { key: 'security', label: 'Seguridad', hint: 'Certificados y evidencias legales' },
  { key: 'reliability', label: 'Confiabilidad', hint: 'Experiencia durante el intercambio' },
  { key: 'commitment', label: 'Compromiso', hint: 'Puntualidad y cumplimiento del trueque' },
]

/** Valoración en 5 dimensiones de una operación completada (M3). */
export function RateOperationModal({ operationId, counterparty, isCreator, onClose }: RateOperationModalProps) {
  const { account, provider } = useEthereum()
  const [values, setValues] = useState<Record<string, number>>({})
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const setDim = (key: string, v: number) => setValues((prev) => ({ ...prev, [key]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!provider || !account) return
    if (DIMENSIONS.some((d) => !values[d.key])) {
      setError('Valora todas las 5 dimensiones con estrellas (1 a 5)')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationId: operationId.toString(),
          rater: account,
          ratee: counterparty,
          acceptance: values.acceptance,
          honesty: values.honesty,
          security: values.security,
          reliability: values.reliability,
          commitment: values.commitment,
          comment,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al valorar')
      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch (err) {
      setError(getFriendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#1A2B4C]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-5 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <h2 className="text-xl font-bold font-heading text-[#1A2B4C]">
              Valorar Operación #{operationId.toString()}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 text-slate-500 rounded-full transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Valoras a <strong className="text-[#1A2B4C] font-mono">{counterparty.slice(0, 6)}...{counterparty.slice(-4)}</strong> ({isCreator ? 'tu contraparte' : 'el creador'}).
            Tu valoración alimenta la reputación en 5 dimensiones on-chain y off-chain de TrueKeat.
          </p>

          {DIMENSIONS.map((d) => (
            <div key={d.key} className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <label className="block text-xs font-bold text-[#1A2B4C] font-heading mb-0.5">
                {d.label}
              </label>
              <p className="text-[11px] text-slate-400 mb-2">{d.hint}</p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setDim(d.key, star)}
                    className={`text-2xl transition hover:scale-110 active:scale-95 ${(values[d.key] ?? 0) >= star ? 'text-[#D4AF37]' : 'text-slate-300'}`}
                    aria-label={`${star} estrellas`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 font-heading">
              Comentario de la Experiencia (Opcional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full p-4 border-2 border-slate-200 rounded-2xl text-xs text-[#1A2B4C] focus:border-[#2A9D8F] focus:bg-[#F8FFFE] outline-none transition"
              placeholder="Comparte detalles del estado de los bienes y la puntualidad en el punto de encuentro..."
            />
          </div>

          {success && (
            <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold text-center">
              ✓ Valoración en 5 dimensiones registrada. ¡Gracias por fortalecer la confianza comunitaria!
            </div>
          )}
          {error && (
            <div className="p-3.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-xs font-bold text-center">
              Error: {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-gold-accent py-3.5 px-4 text-xs uppercase tracking-wider font-heading"
          >
            {loading ? 'Enviando valoración...' : 'Emitir Valoración (5D)'}
          </button>
        </form>
      </div>
    </div>
  )
}
