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
  { key: 'commitment', label: 'Compromiso', hint: 'Tiempo y novedades hasta realizar el intercambio' },
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
      setError('Valora todas las dimensiones (1-5)')
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Valorar operación #{operationId.toString()}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Valoras a {counterparty.slice(0, 6)}...{counterparty.slice(-4)} ({isCreator ? 'tu contraparte' : 'el creador'}).
            Tu valoración alimenta la reputación en 5 dimensiones de la plataforma.
          </p>

          {DIMENSIONS.map((d) => (
            <div key={d.key}>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">
                {d.label}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{d.hint}</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setDim(d.key, star)}
                    className={`text-2xl transition ${(values[d.key] ?? 0) >= star ? 'text-amber-400' : 'text-gray-300 dark:text-zinc-600'}`}
                    aria-label={`${star} estrellas`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Comentario (opcional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
              placeholder="Cuenta tu experiencia..."
            />
          </div>

          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
              ✓ Valoración registrada. ¡Gracias por fortalecer la confianza!
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
              Error: {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 transition-all"
          >
            {loading ? 'Enviando valoración...' : 'Enviar valoración'}
          </button>
        </form>
      </div>
    </div>
  )
}
