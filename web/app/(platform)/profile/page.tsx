'use client'

import { useEffect, useState } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { useProfile } from '@/lib/hooks'
import { getFriendlyError } from '@/lib/escrow'

/**
 * Perfil del usuario (M3/M4/M6/M7): nivel de confianza, reputación,
 * ubicación (para encuentros <= 10 km) y verificación KYC cifrada.
 */
export default function ProfilePage() {
  const { account } = useEthereum()
  const { profile, loading } = useProfile(account)
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) {
      setLat('')
      setLng('')
    }
  }, [profile])

  const saveLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account) return
    setBusy(true)
    setMsg('')
    setError('')
    try {
      const res = await fetch(`/api/users/${account}/location`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: parseFloat(lat), lng: parseFloat(lng) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setMsg('Ubicación guardada (regla ≤ 10 km activa para tus encuentros).')
    } catch (err) {
      setError(getFriendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
      },
      () => setError('No se pudo obtener tu ubicación')
    )
  }

  const submitKyc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account) return
    setBusy(true)
    setMsg('')
    setError('')
    try {
      const res = await fetch(`/api/users/${account}/kyc`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setMsg(`KYC ${data.kycStatus}: tus datos quedaron cifrados en la BD (AES-256-GCM).`)
    } catch (err) {
      setError(getFriendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const refreshLevel = async () => {
    if (!account) return
    setBusy(true)
    setMsg('')
    setError('')
    try {
      const res = await fetch(`/api/users/${account}/refresh`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setMsg(`Nivel actualizado: ${data.levelLabel}`)
    } catch (err) {
      setError(getFriendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20 text-center py-20 text-gray-500">
        Cargando perfil...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20">
      <div className="container mx-auto px-4 max-w-4xl pb-20">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Mi perfil</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {profile.username ? `@${profile.username}` : profile.address}
        </p>

        {/* Resumen */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-8 mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">
              Nivel: {profile.levelLabel}
            </span>
            {profile.isBusiness && (
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                Empresa
              </span>
            )}
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
              KYC: {profile.kycStatus}
            </span>
            <button
              onClick={refreshLevel}
              disabled={busy}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Recalcular nivel
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              ['Reputación', profile.reputation.overall.toFixed(1)],
              ['Valoraciones', String(profile.reputation.total)],
              ['Completados', String(profile.stats.completed)],
              ['Artículos', String(profile.stats.items)],
            ].map(([label, value]) => (
              <div key={label} className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            {[
              ['Aceptación', profile.reputation.acceptance],
              ['Honestidad', profile.reputation.honesty],
              ['Seguridad', profile.reputation.security],
              ['Confiabilidad', profile.reputation.reliability],
              ['Compromiso', profile.reputation.commitment],
            ].map(([label, value]) => (
              <div key={label as string} className="p-2 bg-gray-50 dark:bg-zinc-800 rounded text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                <p className="font-semibold text-gray-900 dark:text-white">{(value as number).toFixed(1)}</p>
              </div>
            ))}
          </div>
        </div>

        {msg && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 rounded-lg text-sm">
            ✓ {msg}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg text-sm">
            Error: {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Ubicación (M7) */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Ubicación</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Necesaria para proponer encuentros: la distancia con tu contraparte debe ser ≤ 10 km.
            </p>
            <form onSubmit={saveLocation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Latitud</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="10.4806"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Longitud</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="-66.9036"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={useMyLocation}
                  className="flex-1 px-4 py-2 text-sm bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 rounded-lg hover:border-blue-500"
                >
                  📍 Usar mi ubicación
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>

          {/* KYC (M6) */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Verificación KYC</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Correo y teléfono se guardan <strong>cifrados</strong> (AES-256-GCM); solo el estado
              de verificación es público. (Demo: auto-aprobación; producción requiere revisión.)
            </p>
            <form onSubmit={submitKyc} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
                  placeholder="usuario@correo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
                  placeholder="+58 412 000 0000"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 font-semibold"
              >
                {busy ? 'Guardando...' : 'Enviar verificación'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
