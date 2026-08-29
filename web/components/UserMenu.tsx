'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEthereum } from '@/lib/ethereum'
import { useEscrow, useProfile, useRegistration, useUserRole } from '@/lib/hooks'
import { triggerHaptic } from '@/lib/mobile'

/**
 * Menú Desplegable de Usuario Velvety (Mobile & Desktop).
 * 
 * Permite acceder de forma centralizada a:
 *  - Configuración de Identidad (Nivel 1, 2, 3 SBT, 2FA) -> /identity
 *  - Perfil, Reputación y Ubicación -> /profile
 *  - Balances de Billetera y Tokens -> /balances
 *  - Mis Truekes y Operaciones -> /operations
 *  - Panel de Control -> /dashboard
 *  - Copiar dirección Web3 al portapapeles
 *  - Desconexión segura
 */
export function UserMenu() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; created_at: number; type: string }>>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const pathname = usePathname()

  const { isConnected, account, connect, disconnect } = useEthereum()
  const { isRegistered, username, loading: regLoading } = useRegistration()
  const profileResult = useProfile(isConnected && isRegistered ? account : null)
  const profile = profileResult?.profile ?? null
  const role = useUserRole()
  const { roles } = useEscrow()

  const isAdmin = roles.isOwner

  const handleConnect = async () => {
    try {
      await connect()
      if (pathname === '/') {
        router.push('/items')
      }
    } catch {}
  }

  // Notificaciones off-chain
  useEffect(() => {
    if (!isConnected || !account) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/notifications?user=${account}`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          setNotifications(data.notifications || [])
          setUnread(data.unread || 0)
        }
      } catch {}
    }
    load()
    const id = setInterval(load, 15000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [isConnected, account])

  const markRead = async () => {
    if (!account) return
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: account }),
      })
      setUnread(0)
    } catch {}
  }

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const copyAddress = async () => {
    if (!account) return
    try {
      await navigator.clipboard.writeText(account)
      triggerHaptic('success')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const short = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ''
  const level = profile?.identificationLevel ?? (isRegistered ? 1 : 0)

  // Si no está conectado
  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        className="px-6 py-2.5 bg-gradient-to-r from-[#00E5FF] to-[#00B4D8] hover:from-[#00B4D8] hover:to-[#008BA3] text-[#0A1128] font-bold rounded-full text-xs uppercase tracking-wider transition-all duration-300 shadow-md shadow-[#00E5FF]/20 active:scale-95 flex items-center gap-2"
      >
        <span>⚡</span>
        <span>Conectar Wallet</span>
      </button>
    )
  }

  return (
    <div className="relative flex items-center gap-2" ref={ref}>
      {/* Campana de Notificaciones */}
      {account && (
        <div className="relative">
          <button
            onClick={() => {
              triggerHaptic('light')
              setNotifOpen((v) => !v)
              setOpen(false)
              if (!notifOpen) markRead()
            }}
            aria-label="Notificaciones"
            className="p-2.5 rounded-full bg-white border border-slate-200 hover:border-cyan-400 text-slate-700 transition-colors relative shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-[#0A1128] text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unread}
              </span>
            )}
          </button>

          {/* Panel de Notificaciones */}
          {notifOpen && (
            <div className="absolute right-0 mt-3 w-80 rounded-[2rem] bg-white border border-slate-200 shadow-2xl shadow-cyan-900/10 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <span className="font-serif font-bold text-sm text-[#0A1128]">Notificaciones</span>
                <span className="text-[10px] text-cyan-600 font-mono font-bold uppercase">En tiempo real</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <p className="px-6 py-8 text-center text-xs text-slate-400 font-light">Sin notificaciones pendientes</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="px-6 py-3.5 text-xs hover:bg-slate-50/60 transition-colors">
                      <p className="text-slate-800 font-light leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono">{new Date(n.created_at * 1000).toLocaleTimeString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botón Disparador del Menú de Usuario (Píldora con pulso e Isotipo) */}
      <button
        onClick={() => {
          triggerHaptic('light')
          setOpen((v) => !v)
          setNotifOpen(false)
        }}
        aria-label="Menú desplegable de usuario"
        className="flex items-center gap-2.5 px-3.5 py-1.5 bg-white rounded-full border border-slate-200 hover:border-cyan-400 transition-all shadow-xs group"
      >
        {/* Avatar Hexagonal / Indicador de Nivel */}
        <div className={`w-7 h-7 clip-hexagon flex items-center justify-center text-[10px] font-bold text-white shadow-xs ${
          level >= 3 ? 'bg-amber-500' : level === 2 ? 'bg-cyan-500' : isRegistered ? 'bg-[#0A1128]' : 'bg-slate-400'
        }`}>
          {isRegistered && username ? username.slice(0, 1).toUpperCase() : '0x'}
        </div>

        {/* Nombre / Identificador */}
        <div className="text-left">
          <p className="text-xs font-bold text-[#0A1128] leading-tight flex items-center gap-1">
            <span>{regLoading ? 'Cargando...' : isRegistered && username ? `@${username}` : short}</span>
            {isRegistered && <span className="text-[#00E5FF] text-[10px]">☑</span>}
          </p>
          <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
            {level >= 3 ? 'N3 · Certificado' : level === 2 ? 'N2 · Verificado' : isRegistered ? 'N1 · Inscrito' : 'Sin Registrar'}
          </p>
        </div>

        {/* Flecha Chevron */}
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180 text-cyan-500' : 'group-hover:text-slate-600'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* TARJETA DESPLEGABLE DE USUARIO (Velvety Luxury Dropdown) */}
      {open && (
        <div className="absolute right-0 top-full mt-3 w-84 sm:w-96 rounded-[2.2rem] bg-white border border-slate-200/90 shadow-2xl shadow-indigo-900/15 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 p-2">
          
          {/* CABECERA: Identidad & Nivel */}
          <div className="p-5 bg-gradient-to-br from-slate-50/80 to-indigo-50/30 rounded-[1.8rem] border border-slate-100 mb-2">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">
                  Billetera Web3
                </span>
                <h3 className="text-lg font-serif font-bold text-slate-900 leading-snug">
                  {isRegistered && username ? `@${username}` : 'Billetera Conectada'}
                </h3>
              </div>

              {/* Badge de Nivel */}
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                level >= 3 
                  ? 'bg-[#F2F5ED] text-[#8A9A70] border border-[#8A9A70]/30' 
                  : level === 2 
                    ? 'bg-purple-100 text-purple-800' 
                    : isRegistered
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-amber-100 text-amber-800'
              }`}>
                {level >= 3 ? 'Nivel 3 · SBT' : level === 2 ? 'Nivel 2 · 2FA' : isRegistered ? 'Nivel 1 · Inscrito' : 'Nivel 0'}
              </span>
            </div>

            {/* Dirección con botón de copia rápida */}
            <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-slate-200/70 shadow-sm">
              <span className="font-mono text-[11px] text-slate-600 truncate max-w-[200px] sm:max-w-[230px]">
                {account}
              </span>
              <button
                onClick={copyAddress}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors ml-2 flex-shrink-0"
              >
                {copied ? (
                  <span className="text-emerald-600 font-bold">✓ ¡Copiado!</span>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            {/* Prompt de inscripción si no está registrado */}
            {!isRegistered && !regLoading && (
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="w-full mt-3 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold tracking-wide uppercase transition-all shadow-sm block text-center"
              >
                Inscribir Billetera (@username)
              </Link>
            )}
          </div>

          {/* SECCIÓN 1: Balance de Billetera & Finanzas */}
          <div className="px-2 py-1 mb-2">
            <Link
              href="/balances"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between p-3.5 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-2xl border border-indigo-100 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                    Balance de Billetera
                  </h4>
                  <p className="text-[10px] text-slate-500 font-light">
                    Consultar saldos TKA, TKB, USDT y BRLT
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-indigo-600 bg-white px-2.5 py-1 rounded-full border border-indigo-200/60 shadow-xs">
                Ver saldos →
              </span>
            </Link>
          </div>

          {/* SECCIÓN 2: Enlaces de Configuración & Navegación de Usuario */}
          <div className="space-y-0.5 px-2 py-1 border-t border-slate-100">
            {/* Centro de Identidad & 2FA */}
            <Link
              href="/identity"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    Identidad Web3 & Seguridad 2FA
                  </p>
                  <p className="text-[10px] text-slate-400 font-light">
                    Verificación de contacto y credenciales SBT
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">N{level}</span>
            </Link>

            {/* Perfil & Reputación */}
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    Mi Perfil & Reputación
                  </p>
                  <p className="text-[10px] text-slate-400 font-light">
                    Ubicación para encuentros y avales recibidos
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-amber-600 font-bold">
                ★ {profile?.reputation.overall.toFixed(1) ?? '5.0'}
              </span>
            </Link>

            {/* Mis Truekes */}
            <Link
              href="/operations"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    Mis Truekes & Operaciones
                  </p>
                  <p className="text-[10px] text-slate-400 font-light">
                    Intercambios activos y custodia bilateral
                  </p>
                </div>
              </div>
            </Link>

            {/* Panel de Control */}
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    Panel de Control (Suite)
                  </p>
                  <p className="text-[10px] text-slate-400 font-light">
                    Métricas generales y accesos rápidos
                  </p>
                </div>
              </div>
            </Link>

            {/* SECCIÓN EMPRESA (Si es Empresa Activa) */}
            {role.isBusiness && (
              <>
                <Link
                  href="/company/inventory"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-amber-50/70 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-amber-600">📦</span>
                    <div>
                      <p className="text-xs font-semibold text-amber-900 group-hover:text-amber-700">
                        Inventario Comercial
                      </p>
                      <p className="text-[10px] text-amber-600/80 font-light">
                        Gestión de stock, catálogos y tiendas
                      </p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/company/finances"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-amber-50/70 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-amber-600">📈</span>
                    <div>
                      <p className="text-xs font-semibold text-amber-900 group-hover:text-amber-700">
                        Finanzas Comerciales
                      </p>
                      <p className="text-[10px] text-amber-600/80 font-light">
                        Cobros y flujo de ventas en cripto
                      </p>
                    </div>
                  </div>
                </Link>
              </>
            )}

            {/* SECCIÓN SOCIO (Si es Socio Árbitro) */}
            {role.isSocio && (
              <>
                <Link
                  href="/governance/socio-voting"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-purple-50/70 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-purple-600">⚖️</span>
                    <div>
                      <p className="text-xs font-semibold text-purple-900 group-hover:text-purple-700">
                        Votación de Nuevos Socios
                      </p>
                      <p className="text-[10px] text-purple-600/80 font-light">
                        Revisión de postulaciones y quórum
                      </p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/governance/treasury"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-purple-50/70 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-purple-600">🌐</span>
                    <div>
                      <p className="text-xs font-semibold text-purple-900 group-hover:text-purple-700">
                        Finanzas Globales & Gas
                      </p>
                      <p className="text-[10px] text-purple-600/80 font-light">
                        Tesorería y costos de operación
                      </p>
                    </div>
                  </div>
                </Link>
              </>
            )}

            {/* Administración (si es Admin) */}
            {isAdmin && (
              <Link
                href="/add-token"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-fuchsia-50/60 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-fuchsia-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-fuchsia-800">
                      Panel de Administración
                    </p>
                    <p className="text-[10px] text-fuchsia-600 font-light">
                      Autorizar tokens y gestión del contrato
                    </p>
                  </div>
                </div>
              </Link>
            )}
          </div>

          {/* PIE DEL MENÚ: Desconexión */}
          <div className="pt-2 px-2 pb-1 border-t border-slate-100">
            <button
              onClick={() => {
                triggerHaptic('light')
                disconnect()
                setOpen(false)
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl hover:bg-rose-50 text-rose-600 hover:text-rose-700 text-xs font-semibold tracking-wide uppercase transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Desconectar Billetera</span>
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
