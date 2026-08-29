'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEthereum } from '@/lib/ethereum'
import { useRegistration } from '@/lib/hooks'
import { getFriendlyError } from '@/lib/escrow'
import { latLngToUtm, type UtmCoordinates } from '@/lib/utm'
import { BrandLogo } from '@/components/BrandLogo'

export default function RegisterPage() {
  const { isConnected, account, connect } = useEthereum()
  const { isRegistered, username: existingUsername, loading: regLoading, register } = useRegistration()
  const router = useRouter()

  // Form Fields
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [physicalAddress, setPhysicalAddress] = useState('')

  // Geographical Coordinates (Default: Barlovento / Higuerote, Miranda: 10.4806, -66.1036)
  const [lat, setLat] = useState<number>(10.4806)
  const [lng, setLng] = useState<number>(-66.1036)
  const [utm, setUtm] = useState<UtmCoordinates>(latLngToUtm(10.4806, -66.1036))

  const [termsAccepted, setTermsAccepted] = useState(false)
  const [locating, setLocating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Recalculate UTM when Lat/Lng changes
  useEffect(() => {
    try {
      const calculated = latLngToUtm(lat, lng)
      setUtm(calculated)
    } catch {
      // Out of bounds
    }
  }, [lat, lng])

  // GPS auto-detection
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

    if (!isConnected) {
      setError('Conecta tu billetera Web3 antes de inscribirte.')
      return
    }

    if (!termsAccepted) {
      setError('Debes aceptar los términos y condiciones de la comunidad.')
      return
    }

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
        router.push('/dashboard')
      }, 1500)
    } catch (err) {
      setError(getFriendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  // 1. Estado: Sin Billetera Conectada
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] pt-28 pb-20 flex flex-col items-center justify-center px-4">
        <div className="max-w-xl w-full vault-card p-8 sm:p-12 text-center shadow-xl flex flex-col items-center">
          <BrandLogo variant="isotype" width={64} className="mb-6" />

          <span className="text-xs tracking-wider uppercase text-[#2A9D8F] font-bold font-heading block mb-2">
            Inscripción On-Chain
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-[#1A2B4C] mb-4 leading-tight">
            Conecta tu Billetera para Inscribirte
          </h1>
          <p className="text-slate-500 font-normal mb-8 leading-relaxed text-sm sm:text-base">
            Para registrar tu identidad en la blockchain de TrueKeat, primero conecta tu billetera compatible (MetaMask, Rabby, Coinbase Wallet, etc.).
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={connect}
              className="w-full sm:w-auto btn-truekeat-primary px-8 py-4 text-xs uppercase tracking-wider"
            >
              ⚡ Conectar Billetera
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-slate-200 hover:border-slate-400 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wider transition-all text-center"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 2. Estado: Billetera Ya Registrada
  if (isRegistered && !regLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] pt-28 pb-20 flex flex-col items-center justify-center px-4">
        <div className="max-w-xl w-full vault-card p-8 sm:p-12 text-center shadow-xl">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100">
            <span className="text-3xl text-emerald-600 font-bold">✓</span>
          </div>

          <span className="text-xs tracking-wider uppercase text-emerald-600 font-bold font-heading block mb-2">
            Identidad Activa
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-[#1A2B4C] mb-2 leading-tight">
            ¡Ya estás inscrito!
          </h1>
          <p className="text-base font-bold text-[#1A2B4C] mb-2 font-heading">
            @{existingUsername || 'usuario'} <span className="text-[#D4AF37]">✓</span>
          </p>
          <p className="text-xs text-slate-500 font-mono mb-8 truncate">
            {account}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto btn-truekeat-primary px-8 py-4 text-xs uppercase tracking-wider"
            >
              Ir a mi Panel
            </Link>
            <Link
              href="/items"
              className="w-full sm:w-auto px-8 py-4 bg-slate-100 hover:bg-slate-200 text-[#1A2B4C] rounded-full text-xs font-bold uppercase tracking-wider transition-all text-center"
            >
              Explorar Catálogo
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 3. Formulario Completo de Inscripción
  return (
    <div className="min-h-screen bg-[#F8F9FA] pt-28 pb-24">
      <div className="container mx-auto px-6 max-w-4xl">
        {/* ENCABEZADO */}
        <div className="text-center max-w-2xl mx-auto mb-12 flex flex-col items-center">
          <BrandLogo variant="full" className="mb-6" />
          <span className="text-xs tracking-wider uppercase text-[#2A9D8F] font-bold font-heading block mb-2">
            Registro Oficial On-Chain
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold font-heading text-[#1A2B4C] mb-4 leading-tight">
            Inscripción de Usuario a TrueKeat
          </h1>
          <p className="text-slate-500 font-normal text-sm sm:text-base leading-relaxed">
            Completa tus datos para emitir tu registro inmutable en el contrato inteligente. Todos los campos marcados son obligatorios y únicos en el protocolo.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-mono text-slate-600 shadow-xs">
            <span>Billetera:</span>
            <span className="font-bold text-[#1A2B4C]">{account?.slice(0, 8)}...{account?.slice(-6)}</span>
          </div>
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="vault-card p-8 sm:p-12 shadow-xl border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* SECCIÓN 1: IDENTIDAD DIGITAL */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <span className="w-8 h-8 rounded-full bg-teal-50 text-[#2A9D8F] flex items-center justify-center font-bold text-sm">
                  1
                </span>
                <div>
                  <h2 className="text-lg font-bold font-heading text-[#1A2B4C]">Identidad Digital Única</h2>
                  <p className="text-xs text-slate-400 font-normal">Tu nombre público para truekes y reputación</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 font-heading">
                  Nombre de Usuario (@username) <span className="text-[#E63946]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400 font-mono text-sm">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="ej. carlos_barlovento"
                    minLength={3}
                    maxLength={20}
                    className="w-full h-12 pl-9 pr-4 bg-slate-50/50 rounded-2xl border-2 border-slate-200 text-[#1A2B4C] text-sm font-medium focus:border-[#2A9D8F] focus:bg-[#F8FFFE] outline-none transition"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Entre 3 y 20 caracteres (solo letras, números y guiones bajos). Debe ser único en el contrato.
                </p>
              </div>
            </div>

            {/* SECCIÓN 2: DATOS DE CONTACTO */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <span className="w-8 h-8 rounded-full bg-teal-50 text-[#2A9D8F] flex items-center justify-center font-bold text-sm">
                  2
                </span>
                <div>
                  <h2 className="text-lg font-bold font-heading text-[#1A2B4C]">Información de Contacto</h2>
                  <p className="text-xs text-slate-400 font-normal">Para coordinar intercambios y validaciones de seguridad</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 font-heading">
                    Correo Electrónico <span className="text-[#E63946]">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                    className="w-full h-12 px-4 bg-slate-50/50 rounded-2xl border-2 border-slate-200 text-[#1A2B4C] text-sm font-medium focus:border-[#2A9D8F] focus:bg-[#F8FFFE] outline-none transition"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Debe ser único en la plataforma.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 font-heading">
                    Teléfono Móvil <span className="text-[#E63946]">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+58 412 1234567"
                    className="w-full h-12 px-4 bg-slate-50/50 rounded-2xl border-2 border-slate-200 text-[#1A2B4C] text-sm font-medium focus:border-[#2A9D8F] focus:bg-[#F8FFFE] outline-none transition"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Incluye código de país (+58 para Venezuela).</p>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: UBICACIÓN Y POSICIONAMIENTO UTM */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <span className="w-8 h-8 rounded-full bg-teal-50 text-[#2A9D8F] flex items-center justify-center font-bold text-sm">
                  3
                </span>
                <div>
                  <h2 className="text-lg font-bold font-heading text-[#1A2B4C]">Ubicación y Posicionamiento UTM On-Chain</h2>
                  <p className="text-xs text-slate-400 font-normal">
                    Coordenadas exactas guardadas en la blockchain para calcular proximidad comunitaria (≤ 10 km)
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 font-heading">
                  Dirección Física / Punto de Referencia <span className="text-[#E63946]">*</span>
                </label>
                <input
                  type="text"
                  value={physicalAddress}
                  onChange={(e) => setPhysicalAddress(e.target.value)}
                  placeholder="ej. Calle Marina, Frente a la Plaza Bolívar, Higuerote"
                  className="w-full h-12 px-4 bg-slate-50/50 rounded-2xl border-2 border-slate-200 text-[#1A2B4C] text-sm font-medium focus:border-[#2A9D8F] focus:bg-[#F8FFFE] outline-none transition"
                  required
                />
              </div>

              {/* PANEL DE COORDENADAS Y DETECCIÓN GPS */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#1A2B4C] flex items-center gap-2 font-heading">
                      <span>🗺️</span> Posición Geográfica
                    </h3>
                    <p className="text-xs text-slate-500 font-normal">
                      Ajusta tus coordenadas o usa el detector de GPS de tu navegador.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={locating}
                    className="btn-truekeat-primary px-4 py-2 text-xs uppercase tracking-wider font-heading"
                  >
                    <span>📍</span>
                    <span>{locating ? 'Obteniendo GPS...' : 'Detectar mi GPS'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-600 block mb-1 font-heading">Latitud Decimal (°):</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={lat}
                      onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 px-3.5 bg-white rounded-xl border border-slate-200 text-xs font-mono text-[#1A2B4C] focus:border-[#2A9D8F] outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-600 block mb-1 font-heading">Longitud Decimal (°):</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={lng}
                      onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 px-3.5 bg-white rounded-xl border border-slate-200 text-xs font-mono text-[#1A2B4C] focus:border-[#2A9D8F] outline-none"
                    />
                  </div>
                </div>

                {/* VISOR DE COORDENADAS UTM CALCULADAS */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#1A2B4C] font-heading">Coordenadas UTM Calculadas On-Chain:</span>
                    <span className="px-2.5 py-1 rounded-full bg-teal-50 text-[#2A9D8F] font-mono font-bold text-[11px] border border-[#2A9D8F]/30">
                      Zona {utm.zone}{utm.isNorthern ? 'N' : 'S'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 font-mono text-xs text-slate-700 pt-1">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Este (X):</span>
                      <span className="font-bold text-[#1A2B4C]">{utm.easting.toLocaleString()} m</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Norte (Y):</span>
                      <span className="font-bold text-[#1A2B4C]">{utm.northing.toLocaleString()} m</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: TÉRMINOS Y CONDICIONES */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <span className="w-8 h-8 rounded-full bg-teal-50 text-[#2A9D8F] flex items-center justify-center font-bold text-sm">
                  4
                </span>
                <div>
                  <h2 className="text-lg font-bold font-heading text-[#1A2B4C]">Aceptación de Términos</h2>
                  <p className="text-xs text-slate-400 font-normal">Compromiso con el comercio justo y resolución comunitaria</p>
                </div>
              </div>

              <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-[#F8FFFE] transition">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 text-[#2A9D8F] rounded focus:ring-[#2A9D8F] border-slate-300"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  Acepto los <strong>Términos del Protocolo TrueKeat</strong>. Entiendo que los datos registrados serán almacenados permanentemente en la blockchain y que cualquier discrepancia en intercambios será mediada por Socios Árbitros designados.
                </span>
              </label>
            </div>

            {/* FEEDBACK DE MENSAJES */}
            {success && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <span>✓</span> ¡Inscripción confirmada on-chain con éxito! Redirigiendo a tu panel...
              </div>
            )}

            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                ⚠️ {error}
              </div>
            )}

            {/* BOTÓN SUBMIT */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full btn-truekeat-primary py-4 px-6 text-xs uppercase tracking-wider font-heading"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Registrando en la Blockchain...</span>
                </>
              ) : (
                <>
                  <span>🚀 Completar Inscripción On-Chain</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
