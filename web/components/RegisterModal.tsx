'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useRegistration } from '@/lib/hooks'
import { getFriendlyError } from '@/lib/escrow'
import { latLngToUtm, type UtmCoordinates } from '@/lib/utm'

const RegisterModalContext = createContext<{ openRegister: () => void }>({
  openRegister: () => {},
})

/** Abre el modal de inscripción desde cualquier parte de la app. */
export function useRegisterModal() {
  return useContext(RegisterModalContext)
}

/** Proveedor global: renderiza el modal de inscripción una sola vez. */
export function RegisterProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <RegisterModalContext.Provider value={{ openRegister: () => setIsOpen(true) }}>
      {children}
      {isOpen && <RegisterModal onClose={() => setIsOpen(false)} />}
    </RegisterModalContext.Provider>
  )
}

function RegisterModal({ onClose }: { onClose: () => void }) {
  const { register } = useRegistration()
  const router = useRouter()

  // Campos del formulario
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [physicalAddress, setPhysicalAddress] = useState('')

  // Coordenadas geográficas (Default: Barlovento / Higuerote, Miranda: 10.4806, -66.1036)
  const [lat, setLat] = useState<number>(10.4806)
  const [lng, setLng] = useState<number>(-66.1036)
  const [utm, setUtm] = useState<UtmCoordinates>(latLngToUtm(10.4806, -66.1036))

  const [locating, setLocating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Recalcular UTM cuando cambian lat/lng
  useEffect(() => {
    try {
      const calculated = latLngToUtm(lat, lng)
      setUtm(calculated)
    } catch {
      // Coordenadas fuera de rango
    }
  }, [lat, lng])

  // Obtener ubicación GPS actual del dispositivo
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setError('La geolocalización no está soportada en tu navegador.')
      return
    }
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = Number(pos.coords.latitude.toFixed(6))
        const newLng = Number(pos.coords.longitude.toFixed(6))
        setLat(newLat)
        setLng(newLng)
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        setError(`No se pudo obtener la ubicación GPS: ${err.message}`)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const name = username.trim()
    const mail = email.trim()
    const tel = phone.trim()
    const addr = physicalAddress.trim()

    if (name.length < 3 || name.length > 20) {
      setError('El nombre de usuario debe tener entre 3 y 20 caracteres.')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      setError('El nombre de usuario solo puede contener letras, números y guiones bajos (_).')
      return
    }
    if (!mail || !mail.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido.')
      return
    }
    if (!tel || tel.length < 7) {
      setError('Por favor ingresa un número de teléfono válido.')
      return
    }
    if (!addr || addr.length < 3) {
      setError('La dirección física de tu ubicación es obligatoria.')
      return
    }

    setLoading(true)
    try {
      await register({
        username: name,
        email: mail,
        phone: tel,
        physicalAddress: addr,
        utmEasting: utm.easting,
        utmNorthing: utm.northing,
        utmZone: utm.zone,
        isNorthernHemisphere: utm.isNorthern,
      })

      setSuccess(true)
      setTimeout(() => {
        onClose()
        router.push('/items')
      }, 1500)
    } catch (err: any) {
      setError(getFriendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-amber-900/20 dark:border-amber-500/20 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        {/* Cabecera Velvety */}
        <div className="bg-gradient-to-r from-amber-800 to-amber-950 px-6 py-5 text-white flex justify-between items-center">
          <div>
            <span className="text-xs uppercase tracking-widest text-amber-300 font-semibold">
              Identidad Web3 On-Chain
            </span>
            <h2 className="text-xl font-bold font-serif flex items-center gap-2">
              <span>✍️</span> Inscripción a TrueKeate
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-amber-200 hover:text-white hover:bg-white/10 rounded-lg transition"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-5">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-3 rounded-xl">
            ℹ️ Los 4 datos solicitados son <strong>obligatorios y únicos on-chain</strong>. La posición en el mapa se almacena en <strong>Coordenadas UTM</strong> para verificación de proximidad comunitaria.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Username */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                1. Nombre de Usuario Único <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-400 font-mono">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="mi_usuario"
                  minLength={3}
                  maxLength={20}
                  className="w-full pl-8 pr-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl dark:bg-zinc-800 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  required
                />
              </div>
            </div>

            {/* 2. Correo y Teléfono en Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                  2. Correo Electrónico <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl dark:bg-zinc-800 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                  3. Teléfono Móvil <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+58 412 1234567"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl dark:bg-zinc-800 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  required
                />
              </div>
            </div>

            {/* 3. Dirección Física */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                4. Dirección Física / Referencia <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={physicalAddress}
                onChange={(e) => setPhysicalAddress(e.target.value)}
                placeholder="ej. Av. Bicentenaria, Edif. Central, Barlovento"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl dark:bg-zinc-800 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                required
              />
            </div>

            {/* 4. Selector de Posición en Mapa Interactivo */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <span>🗺️</span> Posición en Mapa
                </span>
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={locating}
                  className="text-xs bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 text-amber-900 dark:text-amber-200 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition"
                >
                  {locating ? '📍 Localizando...' : '📍 Detectar mi GPS'}
                </button>
              </div>

              {/* Controles de Lat/Lng manuales o por mapa */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-500 block mb-1">Latitud (°):</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Longitud (°):</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              {/* Banner de Coordenadas UTM calculadas on-chain */}
              <div className="p-3 bg-gradient-to-br from-amber-500/10 to-amber-900/10 border border-amber-500/30 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-900 dark:text-amber-300">
                    Coordenadas UTM On-Chain:
                  </span>
                  <span className="font-mono font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded text-[11px]">
                    Zona {utm.zone}{utm.isNorthern ? 'N' : 'S'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  <div>
                    <span className="text-zinc-400 text-[10px] block">Este (X):</span>
                    <span className="font-bold">{utm.easting.toLocaleString()} m</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[10px] block">Norte (Y):</span>
                    <span className="font-bold">{utm.northing.toLocaleString()} m</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mensajes de Feedback */}
            {success && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                <span>✓</span> ¡Inscripción exitosa on-chain! Redirigiendo al catálogo...
              </div>
            )}

            {error && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-semibold">
                ⚠️ {error}
              </div>
            )}

            {/* Botón de Envío */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white font-bold rounded-xl shadow-lg shadow-amber-900/20 disabled:opacity-50 transition-all duration-200 text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Registrando en Blockchain...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Completar Inscripción On-Chain</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

