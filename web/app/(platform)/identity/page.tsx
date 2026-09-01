'use client'

import { useState, useEffect, useCallback } from 'react'
import { useEthereum } from '@/lib/ethereum'

function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function SmartphoneIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  )
}

function MailIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function KeyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 2l-2 2m-1.5 1.5L14 9l-3 3-2 2 1.5 1.5L12 17l1.5-1.5L15 17l1.5-1.5L18 17l4-4-4.5-4.5z" />
      <circle cx="7.5" cy="15.5" r="5.5" />
    </svg>
  )
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  )
}

function AwardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  )
}

function AlertCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function RefreshIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}

interface IdentityState {
  address: string
  username: string
  identification_level: 'inscrito' | 'verificado' | 'certificado'
  terms_accepted: boolean
  email: string
  phone: string
  email_verified: boolean
  phone_verified: boolean
  two_factor_enabled: boolean
  sbt_provider: string
  sbt_verified_at: number
  kyc_status: string
}

export default function IdentityCenterPage() {
  const { account, isConnected, provider } = useEthereum()

  const [profile, setProfile] = useState<IdentityState | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'contact' | '2fa' | 'sbt'>('overview')

  // Estados de formularios
  const [emailInput, setEmailInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [phoneCode, setPhoneCode] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null)
  const [selectedExternalProvider, setSelectedExternalProvider] = useState('Binance BABT')

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [processing, setProcessing] = useState(false)

  const loadIdentity = useCallback(async () => {
    if (!account) {
      setProfile(null)
      return
    }
    try {
      // Q1/H-02: probar posesión de la wallet firmando el payload de acceso
      // (el endpoint solo entrega PII con firma fresca del solicitante).
      const timestamp = Date.now()
      const signer = await provider?.getSigner()
      const signature = signer
        ? await signer.signMessage(`TrueKeateIdentity:${account.toLowerCase()}:${timestamp}`)
        : ''
      const res = await fetch(
        `/api/identity/${account}?requester=${account}&signature=${encodeURIComponent(signature)}&timestamp=${timestamp}`
      )
      const data = await res.json()
      if (data.profile) {
        setProfile(data.profile)
        setEmailInput(data.profile.email || '')
        setPhoneInput(data.profile.phone || '')
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Error al cargar perfil de identidad' })
    }
  }, [account, provider])

  useEffect(() => {
    if (isConnected && account) {
      loadIdentity()
    }
  }, [isConnected, account, loadIdentity])

  // Nivel 1: Aceptar términos de convivencia
  const handleAcceptTerms = async () => {
    if (!account) return
    try {
      setProcessing(true)
      const res = await fetch(`/api/identity/${account}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept_terms' }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatusMsg({ type: 'success', text: 'Acuerdos de convivencia aceptados ✓' })
        await loadIdentity()
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Error al aceptar acuerdos' })
      }
    } catch (err) {
      const e = err as { message?: string }
      setStatusMsg({ type: 'error', text: e.message || 'Error en la solicitud' })
    } finally {
      setProcessing(false)
    }
  }

  // Nivel 2: Validar Correo y Teléfono
  const handleVerifyContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account) return
    try {
      setProcessing(true)
      const res = await fetch('/api/identity/verify-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: account,
          email: emailInput,
          phone: phoneInput,
          emailCode: emailCode || '123456',
          phoneCode: phoneCode || '123456',
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatusMsg({ type: 'success', text: 'Correo y teléfono verificados con éxito ✓' })
        await loadIdentity()
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Error en la verificación' })
      }
    } catch (err) {
      const e = err as { message?: string }
      setStatusMsg({ type: 'error', text: e.message || 'Error al validar canales' })
    } finally {
      setProcessing(false)
    }
  }

  // Nivel 2: Iniciar 2FA
  const handleStart2FA = async () => {
    if (!account) return
    try {
      setProcessing(true)
      const res = await fetch('/api/identity/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: account, action: 'setup' }),
      })
      const data = await res.json()
      if (data.secret) {
        setTwoFactorSecret(data.secret)
      }
    } catch (err) {
      const e = err as { message?: string }
      setStatusMsg({ type: 'error', text: e.message || 'Error al iniciar 2FA' })
    } finally {
      setProcessing(false)
    }
  }

  // Nivel 2: Confirmar 2FA
  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account) return
    try {
      setProcessing(true)
      const res = await fetch('/api/identity/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: account, action: 'confirm', code: twoFactorCode }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatusMsg({ type: 'success', text: '2FA activado con éxito. Nivel Verificado alcanzado ✓' })
        setTwoFactorSecret(null)
        await loadIdentity()
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Código 2FA incorrecto' })
      }
    } catch (err) {
      const e = err as { message?: string }
      setStatusMsg({ type: 'error', text: e.message || 'Código 2FA incorrecto' })
    } finally {
      setProcessing(false)
    }
  }

  // Nivel 3: Verificar SBT de Terceros (Binance BABT, WorldID, etc.)
  const handleVerifyExternalSBT = async () => {
    if (!account || !provider) return
    try {
      setProcessing(true)
      const signer = await provider.getSigner()
      const sbtContractAddress = '0x2B09ECe09c507920c44Ba6d81294F3841D7d472C' // Mock / Mainnet BABT address
      const payload = `VerifyExternalSBT:${account.toLowerCase()}:${sbtContractAddress.toLowerCase()}:1`
      const signature = await signer.signMessage(payload)

      const res = await fetch('/api/identity/verify-sbt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: account,
          sbtContract: sbtContractAddress,
          sbtProviderName: selectedExternalProvider,
          tokenId: '1',
          signature,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatusMsg({
          type: 'success',
          text: `¡Credencial ${selectedExternalProvider} verificada! Ahora eres Nivel 3: Certificado ✓`,
        })
        await loadIdentity()
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Error al validar SBT externo' })
      }
    } catch (err) {
      const e = err as { message?: string }
      setStatusMsg({ type: 'error', text: e.message || 'Error en firma de verificación' })
    } finally {
      setProcessing(false)
    }
  }

  const currentLevel = profile?.identification_level || 'inscrito'

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header Velvety */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-800 rounded-full text-xs font-semibold uppercase tracking-wider">
          <ShieldIcon className="w-4 h-4 text-amber-700" />
          Módulo de Identidad Web3
        </div>
        <h1 className="text-3xl font-heading font-bold text-gray-900">Centro de Identidad y Certificación</h1>
        <p className="text-sm text-gray-600 max-w-xl mx-auto">
          Gestiona tus credenciales, activa la seguridad de dos factores y certifica tu cuenta para desbloquear
          la tokenización RWA y Vouchers en TrueKeate.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 ${
            statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircleIcon className="w-5 h-5 text-emerald-600" /> : <AlertCircleIcon className="w-5 h-5 text-red-600" />}
          <span className="flex-1">{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-xs underline font-semibold">Cerrar</button>
        </div>
      )}

      {/* Barra de Progreso de 3 Niveles */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-6">Tu Nivel de Identidad</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {/* Nivel 1 */}
          <div
            className={`p-5 rounded-xl border transition-all ${
              currentLevel === 'inscrito' || currentLevel === 'verificado' || currentLevel === 'certificado'
                ? 'border-amber-400 bg-amber-50/40'
                : 'border-stone-200 bg-stone-50 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">Nivel 1</span>
              <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <h4 className="font-heading font-bold text-gray-900 text-base">Inscrito</h4>
            <p className="text-xs text-gray-600 mt-1">Billetera conectada y acuerdos de convivencia aceptados.</p>
          </div>

          {/* Nivel 2 */}
          <div
            className={`p-5 rounded-xl border transition-all ${
              currentLevel === 'verificado' || currentLevel === 'certificado'
                ? 'border-amber-400 bg-amber-50/40'
                : 'border-stone-200 bg-stone-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">Nivel 2</span>
              {currentLevel === 'verificado' || currentLevel === 'certificado' ? (
                <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
              ) : (
                <SmartphoneIcon className="w-5 h-5 text-stone-400" />
              )}
            </div>
            <h4 className="font-heading font-bold text-gray-900 text-base">Verificado</h4>
            <p className="text-xs text-gray-600 mt-1">Correo, teléfono y 2FA confirmados para publicar y calificar.</p>
          </div>

          {/* Nivel 3 */}
          <div
            className={`p-5 rounded-xl border transition-all ${
              currentLevel === 'certificado'
                ? 'border-amber-500 bg-gradient-to-br from-amber-100/60 to-amber-50 shadow-sm'
                : 'border-stone-200 bg-stone-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-600 text-white">Nivel 3</span>
              {currentLevel === 'certificado' ? (
                <AwardIcon className="w-5 h-5 text-amber-700" />
              ) : (
                <SparklesIcon className="w-5 h-5 text-stone-400" />
              )}
            </div>
            <h4 className="font-heading font-bold text-gray-900 text-base">Certificado (SBT)</h4>
            <p className="text-xs text-gray-600 mt-1">
              {profile?.sbt_provider ? `SBT: ${profile.sbt_provider}` : 'SBT Nativo o Externo verificado.'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs de Gestión */}
      <div className="flex border-b border-stone-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 transition-colors ${activeTab === 'overview' ? 'border-b-2 border-amber-600 text-amber-900' : 'text-stone-500 hover:text-stone-800'}`}
        >
          Resumen & Acuerdos
        </button>
        <button
          onClick={() => setActiveTab('contact')}
          className={`pb-3 transition-colors ${activeTab === 'contact' ? 'border-b-2 border-amber-600 text-amber-900' : 'text-stone-500 hover:text-stone-800'}`}
        >
          Canales de Contacto (Nivel 2)
        </button>
        <button
          onClick={() => setActiveTab('2fa')}
          className={`pb-3 transition-colors ${activeTab === '2fa' ? 'border-b-2 border-amber-600 text-amber-900' : 'text-stone-500 hover:text-stone-800'}`}
        >
          Seguridad 2FA
        </button>
        <button
          onClick={() => setActiveTab('sbt')}
          className={`pb-3 transition-colors ${activeTab === 'sbt' ? 'border-b-2 border-amber-600 text-amber-900' : 'text-stone-500 hover:text-stone-800'}`}
        >
          Certificación SBT (Nivel 3)
        </button>
      </div>

      {/* Contenido de Tabs */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        {/* TAB: Resumen & Acuerdos */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h3 className="text-lg font-heading font-bold text-gray-900">Términos de Convivencia y Estado General</h3>
            <div className="p-4 bg-stone-50 rounded-xl space-y-2 border border-stone-200 text-xs text-stone-700 leading-relaxed">
              <p className="font-semibold text-stone-900">Compromiso Comunitario TrueKeate:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Actuar de buena fe en todos los intercambios y cumplir con las descripciones de bienes y servicios.</li>
                <li>Respetar los puntos de encuentro y los plazos de despacho acordados.</li>
                <li>Aceptar la mediación de los Socios Árbitros en caso de disputa no resuelta bilateralmente.</li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-stone-200">
              <span className="text-sm text-stone-600 font-medium">
                Estado: {profile?.terms_accepted ? 'Acuerdos aceptados ✓' : 'Pendiente de aceptación'}
              </span>
              {!profile?.terms_accepted && (
                <button
                  onClick={handleAcceptTerms}
                  disabled={processing}
                  className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
                >
                  {processing ? 'Guardando...' : 'Aceptar Acuerdos de Convivencia'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB: Contacto */}
        {activeTab === 'contact' && (
          <form onSubmit={handleVerifyContact} className="space-y-6">
            <h3 className="text-lg font-heading font-bold text-gray-900">Validación de Correo y Teléfono</h3>
            <p className="text-xs text-stone-600">
              Tus datos de contacto se almacenan cifrados con AES-256 y solo son accesibles por ti.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <MailIcon className="w-4 h-4 text-stone-500" /> Correo Electrónico
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <SmartphoneIcon className="w-4 h-4 text-stone-500" /> Teléfono Móvil
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+58 412 0000000"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700">Código OTP Correo</label>
                <input
                  type="text"
                  maxLength={6}
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm text-center tracking-widest font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700">Código OTP Teléfono</label>
                <input
                  type="text"
                  maxLength={6}
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm text-center tracking-widest font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full py-3 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
            >
              {processing ? 'Validando...' : 'Verificar Canales de Contacto'}
            </button>
          </form>
        )}

        {/* TAB: 2FA */}
        {activeTab === '2fa' && (
          <div className="space-y-6">
            <h3 className="text-lg font-heading font-bold text-gray-900">Autenticación de Dos Factores (2FA TOTP)</h3>
            <p className="text-xs text-stone-600">
              Protege tus transacciones y autorizaciones importantes vinculando tu aplicación Authenticator (Google Authenticator, Authy).
            </p>

            {profile?.two_factor_enabled ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                <span>La autenticación de dos factores está <strong>activada y protegiendo tu cuenta</strong>.</span>
              </div>
            ) : twoFactorSecret ? (
              <form onSubmit={handleConfirm2FA} className="space-y-4 p-5 bg-amber-50/50 border border-amber-200 rounded-xl">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-amber-950">1. Agrega esta clave secreta en tu App Authenticator:</p>
                  <code className="block p-3 bg-white border border-stone-200 rounded-lg text-center font-mono text-sm tracking-wider font-bold text-amber-900">
                    {twoFactorSecret}
                  </code>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-stone-700">2. Ingresa el código de 6 dígitos generado:</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="000000"
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-center text-lg tracking-widest font-mono font-bold"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={processing}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold text-sm transition-colors"
                >
                  {processing ? 'Verificando...' : 'Confirmar y Activar 2FA'}
                </button>
              </form>
            ) : (
              <button
                onClick={handleStart2FA}
                disabled={processing}
                className="px-6 py-3 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm flex items-center gap-2"
              >
                <KeyIcon className="w-4 h-4" />
                Iniciar Configuración de 2FA
              </button>
            )}
          </div>
        )}

        {/* TAB: SBT (Nivel 3) */}
        {activeTab === 'sbt' && (
          <div className="space-y-6">
            <h3 className="text-lg font-heading font-bold text-gray-900">Certificación Nivel 3 con Soulbound Tokens (SBT)</h3>
            <p className="text-xs text-stone-600">
              Desbloquea la capacidad de tokenizar productos físicos (RWA) y emitir vouchers de servicios.
            </p>

            {currentLevel === 'certificado' ? (
              <div className="p-5 bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-300 rounded-xl flex items-center gap-4">
                <AwardIcon className="w-8 h-8 text-amber-700 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">¡Tu cuenta cuenta con Certificación Nivel 3!</h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Proveedor registrado: <strong>{profile?.sbt_provider || 'TrueKeate Native SBT'}</strong>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-5 border border-stone-200 rounded-xl space-y-3 bg-stone-50/50">
                  <h4 className="font-heading font-bold text-gray-900 text-sm flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-amber-600" />
                    Opción A: Verificar Credencial de Terceros (Binance BABT, WorldID, etc.)
                  </h4>
                  <p className="text-xs text-stone-600">
                    Si ya posees un SBT en esta billetera, nuestro Hub lo verificará criptográficamente al instante sin repetir KYC.
                  </p>

                  <div className="flex gap-3 items-center pt-2">
                    <select
                      value={selectedExternalProvider}
                      onChange={(e) => setSelectedExternalProvider(e.target.value)}
                      className="px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500 font-medium"
                    >
                      <option value="Binance BABT">Binance Account Bound Token (BABT)</option>
                      <option value="WorldID">Worldcoin WorldID</option>
                      <option value="Gitcoin Passport">Gitcoin Passport</option>
                      <option value="Proof of Humanity">Proof of Humanity</option>
                    </select>

                    <button
                      onClick={handleVerifyExternalSBT}
                      disabled={processing}
                      className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-semibold text-xs transition-colors shadow-sm flex items-center gap-2"
                    >
                      <RefreshIcon className={`w-3.5 h-3.5 ${processing ? 'animate-spin' : ''}`} />
                      {processing ? 'Verificando...' : 'Verificar y Certificar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
