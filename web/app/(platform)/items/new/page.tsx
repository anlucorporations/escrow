'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEthereum } from '@/lib/ethereum'
import { createItemSigned, certifyImage } from '@/lib/items'
import { getFriendlyError } from '@/lib/escrow'

const CATEGORIES = ['general', 'electronica', 'hogar', 'vehiculos', 'ropa', 'coleccionables', 'servicios', 'otros']

interface CertifiedFile {
  sha256: string
  signature: string
  fileName: string
}

/**
 * Publicar artículo (M2 + M8). La wallet firma el payload canónico (ECDSA) y
 * cada imagen (hash SHA-256) para certificar autenticidad; el servidor
 * verifica todas las firmas antes de guardar.
 */
export default function NewItemPage() {
  const router = useRouter()
  const { account, provider } = useEthereum()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [quantity, setQuantity] = useState('1')
  const [files, setFiles] = useState<CertifiedFile[]>([])
  const [certifying, setCertifying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!provider || !e.target.files || e.target.files.length === 0) return
    setCertifying(true)
    setError('')
    try {
      const signer = await provider.getSigner()
      const certified: CertifiedFile[] = []
      for (const file of Array.from(e.target.files)) {
        certified.push(await certifyImage(file, signer))
      }
      setFiles((prev) => [...prev, ...certified])
    } catch (err) {
      setError(getFriendlyError(err))
    } finally {
      setCertifying(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!provider || !account) {
      setError('Conecta tu billetera primero')
      return
    }
    setLoading(true)
    setError('')
    try {
      const signer = await provider.getSigner()
      const item = await createItemSigned(
        signer,
        {
          owner: account,
          title,
          description,
          category,
          quantity: parseInt(quantity, 10) || 1,
        },
        files.map((f) => ({ sha256: f.sha256, signature: f.signature }))
      )
      router.push(`/items/${item.id}`)
    } catch (err) {
      setError(getFriendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20">
      <div className="container mx-auto px-4 max-w-2xl pb-20">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Publicar artículo</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          El artículo se certifica con la firma de tu billetera (ECDSA) — nadie puede publicar a nombre de otro.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-8">
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              minLength={3}
              maxLength={80}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
              placeholder="ej. Bicicleta de montaña rodada 29"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
              placeholder="Estado, características, detalles..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Rubro *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Cantidad *</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min={1}
                max={100000}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
              />
            </div>
          </div>

          {/* M8: imágenes certificadas */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Imágenes (se certifican: SHA-256 + firma de tu wallet)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              disabled={certifying}
              className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            {certifying && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Calculando hash y firmando imágenes (revisa MetaMask)...
              </p>
            )}
            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((f) => (
                  <li key={f.sha256} className="flex items-start justify-between gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-xs">
                    <div>
                      <p className="font-semibold text-green-800 dark:text-green-200">{f.fileName}</p>
                      <p className="font-mono text-green-700 dark:text-green-300 break-all">sha256: {f.sha256.slice(0, 32)}...</p>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-green-600 text-white font-semibold flex-shrink-0">✓ firmada</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {account && (
            <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
              Propietario: {account}
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
            {loading ? 'Firmando y publicando...' : 'Publicar artículo (firma ECDSA)'}
          </button>
        </form>
      </div>
    </div>
  )
}
