'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchItem, Item, OwnerInfo, Reputation } from '@/lib/items'

function Stars({ value }: { value: number }) {
  return (
    <span className="text-amber-400 text-sm" aria-label={`${value}/5`}>
      {'★'.repeat(Math.round(value))}
      {'☆'.repeat(5 - Math.round(value))}
    </span>
  )
}

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  const [data, setData] = useState<{ item: Item; owner: OwnerInfo | null; reputation: Reputation } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    params.then((p) => setId(p.id))
  }, [params])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetchItem(id)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20 text-center py-20 text-red-600">
        {error} · <Link href="/items" className="text-blue-600 underline">Volver al catálogo</Link>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20 text-center py-20 text-gray-500">
        Cargando artículo...
      </div>
    )
  }

  const { item, owner, reputation } = data

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20">
      <div className="container mx-auto px-4 max-w-4xl pb-20">
        <Link href="/items" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-6 inline-block">
          ← Volver al catálogo
        </Link>

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-8 mb-6">
          <div className="flex justify-between items-start gap-4 mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{item.title}</h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 capitalize">
              {item.category}
            </span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">{item.description || 'Sin descripción'}</p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <span>Cantidad: {item.quantity}</span>
            <span>Estado: <span className="capitalize">{item.status}</span></span>
            <span>Publicado: {new Date(item.created_at * 1000).toLocaleDateString()}</span>
          </div>

          {item.images.length > 0 && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-800 dark:text-green-200">
              ✓ {item.images.length} imagen(es) certificada(s) — hash SHA-256 + firma ECDSA registrada
            </div>
          )}

          <div className="mt-4 text-xs text-gray-400 dark:text-gray-500 break-all font-mono">
            Certificación: {item.signature ? `firma ECDSA verificada (${item.signature.slice(0, 18)}...)` : 'sin firma'}
          </div>
        </div>

        {/* Perfil del propietario (M3/M4) */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Propietario</h2>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
              {owner ? (owner.username ? `@${owner.username}` : `${owner.address.slice(0, 8)}...`) : item.owner}
            </span>
            {owner && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">
                Nivel: {owner.levelLabel || owner.trustLevel}
              </span>
            )}
            {owner?.isBusiness && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                Empresa
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Valoraciones</p>
              <p className="font-bold text-gray-900 dark:text-white">{reputation.total}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Promedio general</p>
              <p className="font-bold text-gray-900 dark:text-white">
                {reputation.overall.toFixed(1)} <Stars value={reputation.overall} />
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Intercambios completados</p>
              <p className="font-bold text-gray-900 dark:text-white">{/* rep. total como proxy */}—</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            {[
              ['Aceptación', reputation.acceptance],
              ['Honestidad', reputation.honesty],
              ['Seguridad', reputation.security],
              ['Confiabilidad', reputation.reliability],
              ['Compromiso', reputation.commitment],
            ].map(([label, value]) => (
              <div key={label as string} className="p-2 bg-gray-50 dark:bg-zinc-800 rounded text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                <p className="font-semibold text-gray-900 dark:text-white">{(value as number).toFixed(1)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
