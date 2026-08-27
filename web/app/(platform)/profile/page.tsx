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
      <div className="min-h-screen bg-background pt-28 text-center text-slate-500 font-light">
        Cargando perfil...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-28">
      <div className="container mx-auto px-6 max-w-4xl pb-20">
        <h1 className="text-4xl md:text-5xl font-serif text-slate-900 mb-2">Mi perfil</h1>
        <p className="text-slate-500 font-mono text-xs mb-8">
          {profile.username ? `@${profile.username}` : profile.address}
        </p>

        {/* Resumen */}
        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 mb-8 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-purple-100 text-purple-700">
              Nivel: {profile.levelLabel}
            </span>
            {profile.isBusiness && (
              <span className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-indigo-100 text-indigo-700">
                Empresa
              </span>
            )}
            <span className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-fuchsia-100 text-fuchsia-800">
              KYC: {profile.kycStatus}
            </span>
            <button
              onClick={refreshLevel}
              disabled={busy}
              className="px-6 py-2 text-xs font-semibold tracking-wide uppercase bg-slate-900 hover:bg-slate-800 text-white rounded-full transition-all disabled:opacity-50"
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
              <div key={label} className="p-5 bg-indigo-50/30 rounded-[2rem] border border-slate-200/60">
                <p className="text-3xl font-serif text-slate-900">{value}</p>
                <p className="text-[10px] tracking-wider uppercase text-slate-400 mt-2 font-medium">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            {[
              ['Aceptación', profile.reputation.acceptance],
              ['Honestidad', profile.reputation.honesty],
              ['Seguridad', profile.reputation.security],
              ['Confiabilidad', profile.reputation.reliability],
              ['Compromiso', profile.reputation.commitment],
            ].map(([label, value]) => (
              <div key={label as string} className="p-3 bg-indigo-50/10 rounded-2xl text-center border border-slate-100">
                <p className="text-slate-400 mb-1 font-light">{label}</p>
                <p className="font-semibold text-slate-800 font-serif">{(value as number).toFixed(1)}</p>
              </div>
            ))}
          </div>
        </div>

        {msg && (
          <div className="mb-6 p-4 bg-indigo-50/60 border border-indigo-100 text-indigo-700 rounded-2xl text-sm">
            ✓ {msg}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm">
            Error: {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Ubicación (M7) */}
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
            <h2 className="text-2xl font-serif text-slate-900 mb-2">Ubicación</h2>
            <p className="text-xs text-slate-500 font-light mb-6">
              Necesaria para proponer encuentros: la distancia con tu contraparte debe ser ≤ 10 km.
            </p>
            <form onSubmit={saveLocation} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Latitud</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="10.4806"
                    className="w-full px-5 py-3 border border-slate-200 rounded-full text-sm bg-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Longitud</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="-66.9036"
                    className="w-full px-5 py-3 border border-slate-200 rounded-full text-sm bg-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={useMyLocation}
                  className="flex-1 px-6 py-3.5 text-xs font-semibold tracking-wide uppercase bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-all"
                >
                  📍 Usar mi ubicación
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 px-6 py-3.5 text-xs font-semibold tracking-wide uppercase bg-slate-900 hover:bg-slate-800 text-white rounded-full transition-all disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>

          {/* KYC (M6) */}
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
            <h2 className="text-2xl font-serif text-slate-900 mb-2">Verificación KYC</h2>
            <p className="text-xs text-slate-500 font-light mb-6">
              Correo y teléfono se guardan cifrados (AES-256-GCM). Solo el estado de verificación es público.
            </p>
            <form onSubmit={submitKyc} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-5 py-3 border border-slate-200 rounded-full text-sm bg-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  placeholder="usuario@correo.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-5 py-3 border border-slate-200 rounded-full text-sm bg-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  placeholder="+58 412 000 0000"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-semibold tracking-wide uppercase transition-all disabled:opacity-50"
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
