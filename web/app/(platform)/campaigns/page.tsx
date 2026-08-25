'use client'

import { useEffect, useState } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { useProfile } from '@/lib/hooks'
import { getFriendlyError } from '@/lib/escrow'

interface Campaign {
  id: string
  owner: string
  title: string
  description: string
  kind: string
  status: string
  approved_by: string | null
  created_at: number
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  active: 'Activa',
  finished: 'Finalizada',
}

/** Campañas (M11): venta masiva y recolección, aprobadas por Socios. */
export default function CampaignsPage() {
  const { account } = useEthereum()
  const { profile } = useProfile(account)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<'masiva' | 'recoleccion'>('masiva')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const load = async () => {
    const res = await fetch('/api/campaigns')
    if (res.ok) setCampaigns((await res.json()).campaigns)
  }

  useEffect(() => {
    load()
  }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account) return
    setBusy(true)
    setError('')
    setMsg('')
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: account, title, description, kind }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setTitle('')
      setDescription('')
      setMsg('Campaña creada (pendiente de aprobación de un Socio).')
      load()
    } catch (err) {
      setError(getFriendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const approve = async (id: string) => {
    if (!account) return
    setBusy(true)
    setError('')
    setMsg('')
    try {
      const res = await fetch(`/api/campaigns/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approver: account }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setMsg('Campaña aprobada por el Socio.')
      load()
    } catch (err) {
      setError(getFriendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const isSocio = profile?.trustLevel === 'socio'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20">
      <div className="container mx-auto px-4 max-w-5xl pb-20">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Campañas</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Venta masiva (empresas) y recolección por causas — aprobadas por el nivel Socio.
        </p>

        {msg && <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 rounded-lg text-sm">✓ {msg}</div>}
        {error && <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg text-sm">Error: {error}</div>}

        {/* Crear campaña */}
        <form onSubmit={create} className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Nueva campaña</h2>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Título *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                minLength={3}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
                placeholder="ej. Venta masiva de zapatos"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Tipo</label>
              <select value={kind} onChange={(e) => setKind(e.target.value as 'masiva' | 'recoleccion')} className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white">
                <option value="masiva">Venta masiva</option>
                <option value="recoleccion">Recolección (causa)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Descripción</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
                placeholder="Detalles..."
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
          >
            {busy ? 'Creando...' : 'Crear campaña'}
          </button>
        </form>

        {/* Listado */}
        <div className="space-y-4">
          {campaigns.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-10">No hay campañas todavía.</p>
          )}
          {campaigns.map((c) => (
            <div key={c.id} className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-6">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{c.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{c.description || 'Sin descripción'}</p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    c.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                  }`}>
                    {STATUS_LABELS[c.status] || c.status}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{c.kind}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {c.owner.slice(0, 8)}... · {new Date(c.created_at * 1000).toLocaleDateString()}
                </p>
                {c.status === 'pending' && isSocio && (
                  <button
                    onClick={() => approve(c.id)}
                    disabled={busy}
                    className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    Aprobar (Socio)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
