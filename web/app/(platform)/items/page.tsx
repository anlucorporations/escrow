'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchItems, Item } from '@/lib/items'

const CATEGORIES = ['general', 'electronica', 'hogar', 'vehiculos', 'ropa', 'coleccionables', 'servicios', 'otros']

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchItems({ category: category || undefined, q: q || undefined })
      setItems(data.items)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20">
      <div className="container mx-auto px-4 max-w-6xl pb-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Catálogo de artículos</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Bienes y servicios disponibles para intercambio (TrueKeate)
            </p>
          </div>
          <Link
            href="/items/new"
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
          >
            + Publicar artículo
          </Link>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setCategory('')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              category === ''
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-700'
            }`}
          >
            Todos
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
                category === c
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mb-8">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              load()
            }}
            className="flex gap-2 max-w-md"
          >
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por título o descripción..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Buscar
            </button>
          </form>
        </div>

        {error && <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>}
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Cargando catálogo...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-600 dark:text-gray-400">
            No hay artículos publicados en este rubro todavía.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/items/${item.id}`}
                className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{item.title}</h3>
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 capitalize">
                    {item.category}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                  {item.description || 'Sin descripción'}
                </p>
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>Cantidad: {item.quantity}</span>
                  <span className="font-mono">
                    {item.owner.slice(0, 6)}...{item.owner.slice(-4)}
                  </span>
                </div>
                {item.images.length > 0 && (
                  <div className="mt-3 text-xs text-green-600 dark:text-green-400">
                    ✓ {item.images.length} imagen(es) certificada(s)
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
