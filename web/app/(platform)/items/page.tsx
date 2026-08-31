'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchItems, Item } from '@/lib/items'
import { TradeQuotaBanner } from '@/components/TradeQuotaBanner'
import { AssetCard } from '@/components/AssetCard'

const CATEGORIES = [
  { key: '', label: 'Todos los Activos', icon: '🌐' },
  { key: 'general', label: 'General', icon: '📦' },
  { key: 'electronica', label: 'Electrónica', icon: '💻' },
  { key: 'hogar', label: 'Hogar & Granja', icon: '🏡' },
  { key: 'vehiculos', label: 'Vehículos & Maquinaria', icon: '🚜' },
  { key: 'ropa', label: 'Textil & Calzado', icon: '👕' },
  { key: 'coleccionables', label: 'Coleccionables RWA', icon: '🏺' },
  { key: 'servicios', label: 'Servicios Profesionales', icon: '🛠️' },
  { key: 'otros', label: 'Otros', icon: '✨' },
]

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
    <div className="min-h-screen bg-background pt-28 pb-24">
      <div className="container mx-auto px-6 max-w-6xl">
        <TradeQuotaBanner />

        {/* ENCABEZADO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-8 border-b border-slate-200">
          <div>
            <span className="text-xs tracking-[0.2em] uppercase text-teal-600 font-semibold block mb-2">
              Mercado Descentralizado
            </span>
            <h1 className="text-4xl md:text-5xl font-heading text-navy-900 mb-2 leading-tight">
              Catálogo de Activos & Truekes
            </h1>
            <p className="text-slate-500 font-light text-sm sm:text-base">
              Bienes RWA, servicios profesionales y tokens custodiados bajo contratos inteligentes autónomos.
            </p>
          </div>

          <Link
            href="/items/new"
            className="px-8 py-4 btn-truekeat-primary text-white rounded-full text-xs font-bold tracking-wider uppercase transition-all shadow-lg shadow-teal-500/20 flex items-center gap-2"
          >
            <span>+</span>
            <span>Acuñar Nuevo Activo</span>
          </Link>
        </div>

        {/* BARRA DE BÚSQUEDA Y FILTROS */}
        <div className="space-y-6 mb-12">
          {/* Formulario de búsqueda universal */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              load()
            }}
            className="flex gap-3 max-w-xl"
          >
            <div className="relative flex-1">
              <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Busca por producto, servicio, marca o ubicación..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
              />
            </div>
            <button
              type="submit"
              className="px-7 py-3 bg-navy-800 hover:bg-navy-700 text-white rounded-full text-xs font-bold tracking-wider uppercase transition-all shadow-sm"
            >
              Buscar
            </button>
          </form>

          {/* Píldoras de Filtros por Categoría */}
          <div className="flex flex-wrap gap-2 pt-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 ${
                  category === c.key
                    ? 'bg-navy-800 text-cyan-400 shadow-sm shadow-navy-900/20 border border-navy-800'
                    : 'bg-white text-slate-600 hover:bg-slate-100/80 border border-slate-200'
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* FEEDBACK DE ESTADO Y RESULTADOS */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold mb-8">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-white rounded-[2rem] border border-slate-200 h-96 animate-pulse p-6 space-y-4"
              >
                <div className="w-full h-48 bg-slate-100 rounded-2xl"></div>
                <div className="w-3/4 h-5 bg-slate-100 rounded-md"></div>
                <div className="w-1/2 h-4 bg-slate-100 rounded-md"></div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[2.5rem] border border-slate-200 p-12 max-w-xl mx-auto shadow-sm">
            <span className="text-4xl mb-3 block">📦</span>
            <h3 className="text-xl font-heading text-slate-800 mb-2">No se encontraron activos</h3>
            <p className="text-xs text-slate-500 font-light mb-6">
              No hay artículos disponibles en esta categoría o con los términos buscados.
            </p>
            <Link
              href="/items/new"
              className="px-6 py-3 bg-navy-800 hover:bg-navy-700 text-white rounded-full text-xs font-bold uppercase tracking-wider transition"
            >
              Publicar el Primer Activo
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item) => (
              <AssetCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
