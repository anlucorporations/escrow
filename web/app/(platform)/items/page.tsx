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
    <div className="min-h-screen bg-background pt-28">
      <div className="container mx-auto px-6 max-w-6xl pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif text-slate-900 mb-2">Colección de artículos</h1>
            <p className="text-slate-500 font-light">
              Bienes y servicios curados disponibles para intercambio seguro (TrueKeate).
            </p>
          </div>
          <Link
            href="/items/new"
            className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-semibold tracking-wide uppercase transition-all"
          >
            + Publicar artículo
          </Link>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2.5 mb-10">
          <button
            onClick={() => setCategory('')}
            className={`px-5 py-2.5 rounded-full text-xs tracking-wider uppercase transition-all ${
              category === ''
                ? 'bg-slate-900 text-white font-medium'
                : 'bg-indigo-100/50 text-slate-700 hover:bg-indigo-100 border border-slate-200'
            }`}
          >
            Todos
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-5 py-2.5 rounded-full text-xs tracking-wider uppercase transition-all capitalize ${
                category === c
                  ? 'bg-slate-900 text-white font-medium'
                  : 'bg-indigo-100/50 text-slate-700 hover:bg-indigo-100 border border-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mb-12">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              load()
            }}
            className="flex gap-3 max-w-md"
          >
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por título o descripción..."
              className="flex-1 px-5 py-3 border border-slate-200 rounded-full text-sm bg-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-semibold tracking-wide uppercase transition-all"
            >
              Buscar
            </button>
          </form>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}
        {loading ? (
          <p className="text-slate-500 font-light">Cargando colección...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-light">
            No hay artículos publicados en esta categoría todavía.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/items/${item.id}`}
                className="bg-white/80 rounded-[2rem] border border-slate-200 p-8 hover:shadow-2xl hover:shadow-indigo-900/5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <h3 className="font-serif text-xl text-slate-950 leading-snug">{item.title}</h3>
                    <span className="px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-indigo-100 text-indigo-700 capitalize flex-shrink-0">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 font-light line-clamp-3 mb-6 leading-relaxed">
                    {item.description || 'Sin descripción'}
                  </p>
                </div>
                <div>
                  <div className="flex justify-between items-center text-xs text-slate-400 pt-4 border-t border-slate-100">
                    <span>Cantidad: {item.quantity}</span>
                    <span className="font-mono text-[10px]">
                      {item.owner.slice(0, 6)}...{item.owner.slice(-4)}
                    </span>
                  </div>
                  {item.images.length > 0 && (
                    <div className="mt-3 text-[11px] text-fuchsia-600 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500"></span>
                      {item.images.length} imagen(es) certificada(s)
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
