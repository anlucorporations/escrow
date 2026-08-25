'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { useEthereum } from '@/lib/ethereum'
import { getFriendlyError } from '@/lib/escrow'

interface MeetupModalProps {
  operationId: bigint
  onClose: () => void
}

const DEFAULT_CENTER: [number, number] = [10.4806, -66.9036] // Caracas (demo)

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
    // Import dinámico para evitar problemas de SSR con Leaflet
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Punto de encuentro — op #{operationId.toString()}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Haz clic en el mapa para elegir el punto. La distancia con tu contraparte debe ser{' '}
            <strong>≤ 10 km</strong> (validado off-chain).
          </p>

          <div ref={mapRef} className="h-64 rounded-lg border border-gray-200 dark:border-zinc-700 z-0" />

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
              {position ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}` : 'Ningún punto seleccionado'}
            </p>
            <button
              type="button"
              onClick={useMyLocation}
              className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 rounded-lg hover:border-blue-500"
            >
              📍 Usar mi ubicación
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Fecha y hora del encuentro *
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Lugar (nombre/descripción)
            </label>
            <input
              type="text"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="ej. Plaza Bolívar, frente a la estatua"
              className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
            />
          </div>

          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
              ✓ Encuentro propuesto. Tu contraparte puede verlo en la operación.
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
            {loading ? 'Proponiendo encuentro...' : 'Proponer encuentro'}
          </button>
        </form>
      </div>
    </div>
  )
}
