'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { useEthereum } from '@/lib/ethereum'
import { getFriendlyError } from '@/lib/escrow'

interface MeetupModalProps {
  operationId: bigint
  onClose: () => void
}

const DEFAULT_CENTER: [number, number] = [10.4806, -66.9036] // Caracas / Higuerote

/**
 * M7 — Proponer punto de encuentro con mapa OpenStreetMap (Leaflet).
 * El servidor valida que la distancia entre las partes sea <= 10 km.
 */
export function MeetupModal({ operationId, onClose }: MeetupModalProps) {
  const { account } = useEthereum()
  const mapRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [scheduledAt, setScheduledAt] = useState('')
  const [placeName, setPlaceName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!mapRef.current) return
    let map: L.Map | null = null
    let cancelled = false
    import('leaflet').then((L) => {
      if (cancelled || !mapRef.current) return
      map = L.map(mapRef.current).setView(DEFAULT_CENTER, 12)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)
      map.on('click', (e: L.LeafletMouseEvent) => {
        const pos: [number, number] = [e.latlng.lat, e.latlng.lng]
        setPosition(pos)
        if (markerRef.current) markerRef.current.remove()
        markerRef.current = L.marker(pos).addTo(map!)
      })
    })
    return () => {
      cancelled = true
      map?.remove()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account) {
      setError('Conecta tu billetera primero')
      return
    }
    if (!position || !scheduledAt) {
      setError('Selecciona un punto en el mapa y una fecha')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/meetups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationId: operationId.toString(),
          requester: account,
          scheduledAt: Math.floor(new Date(scheduledAt).getTime() / 1000),
          lat: position[0],
          lng: position[1],
          placeName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear encuentro')
      setSuccess(true)
      setTimeout(onClose, 1800)
    } catch (err) {
      setError(getFriendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setError('No se pudo obtener tu ubicación')
    )
  }

  return (
    <div className="fixed inset-0 bg-[#1A2B4C]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-5 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <span className="text-xl">📍</span>
            <h2 className="text-xl font-bold font-heading text-[#1A2B4C]">
              Punto de Encuentro — Op #{operationId.toString()}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 text-slate-500 rounded-full transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Haz clic en el mapa para fijar el punto de entrega. La distancia debe ser{' '}
            <strong className="text-[#1A2B4C]">≤ 10 km</strong> para garantizar seguridad en Barlovento.
          </p>

          <div ref={mapRef} className="h-60 rounded-2xl border border-slate-200 z-0 overflow-hidden shadow-xs" />

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-mono">
              {position ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}` : 'Ningún punto seleccionado'}
            </p>
            <button
              type="button"
              onClick={useMyLocation}
              className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-[#1A2B4C] rounded-xl border border-slate-200 transition"
            >
              📍 Usar mi ubicación
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 font-heading">
              Fecha y Hora del Encuentro *
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
              className="w-full h-12 px-4 border-2 border-slate-200 rounded-xl text-sm text-[#1A2B4C] focus:border-[#2A9D8F] focus:bg-[#F8FFFE] outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 font-heading">
              Lugar / Referencia
            </label>
            <input
              type="text"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="ej. Plaza Bolívar de Higuerote, CC Barlovento"
              className="w-full h-12 px-4 border-2 border-slate-200 rounded-xl text-sm text-[#1A2B4C] focus:border-[#2A9D8F] focus:bg-[#F8FFFE] outline-none transition"
            />
          </div>

          {success && (
            <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold text-center">
              ✓ Punto de encuentro agendado. La contraparte ha sido notificada.
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
            className="w-full btn-truekeat-primary py-3.5 px-4 text-xs uppercase tracking-wider font-heading mt-2"
          >
            {loading ? 'Proponiendo encuentro...' : 'Confirmar Punto de Encuentro'}
          </button>
        </form>
      </div>
    </div>
  )
}
