'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useEthereum } from '@/lib/ethereum'
import { useProfile, useRegistration } from '@/lib/hooks'
import { useRegisterModal } from '@/components/RegisterModal'

/**
 * Menú de usuario minimalista de la barra de navegación:
 *  - sin conexión: opción "Conectar billetera"
 *  - conectada sin inscribir: opción "Inscribirme"
 *  - conectada e inscrita: nivel de confianza + "Mi actividad" + "Desconectar"
 */
export function UserMenu() {
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; created_at: number; type: string }>>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const { isConnected, account, connect, disconnect } = useEthereum()
  const { isRegistered, username, loading } = useRegistration()
  const { profile } = useProfile(isConnected && isRegistered ? account : null)
  const { openRegister } = useRegisterModal()

  // M15: notificaciones
  useEffect(() => {
    if (!isConnected || !account) return
    let cancelled = false
    const load = async () => {
      const res = await fetch(`/api/notifications?user=${account}`)
      if (!res.ok) return
      const data = await res.json()
      if (!cancelled) {
        setNotifications(data.notifications)
        setUnread(data.unread)
      }
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
    await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: account }) })
    setUnread(0)
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

  const short = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ''

  return (
    <div className="relative" ref={ref}>
      {/* M15: campana de notificaciones */}
      {isConnected && account && (
        <button
          onClick={() => {
            setNotifOpen((v) => !v)
            if (!notifOpen) markRead()
          }}
          aria-label="Notificaciones"
          className="relative p-2 rounded-lg border border-gray-200 dark:border-zinc-700 hover:border-blue-500 transition-colors mr-2"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      )}

      {notifOpen && (
        <div className="absolute right-16 mt-2 w-80 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 font-semibold text-sm text-gray-900 dark:text-white">
            Notificaciones
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">Sin notificaciones</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="px-4 py-3 border-b border-gray-50 dark:border-zinc-800 text-sm">
                  <p className="text-gray-800 dark:text-gray-200">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at * 1000).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menú de usuario"
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-sm"
      >
        <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        {isConnected && account && (
          <span className="font-mono text-xs text-gray-700 dark:text-gray-300 hidden sm:inline">
            {short}
          </span>
        )}
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-lg overflow-hidden z-50">
          {/* Cabecera con estado */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
            {!isConnected ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">Sin billetera conectada</p>
            ) : (
              <>
                <p className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">{account}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {loading
                    ? 'Verificando inscripción...'
                    : isRegistered
                      ? `Inscrito como @${username ?? short}`
                      : 'No inscrito en la plataforma'}
                </p>
                {isRegistered && profile && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">
                      {profile.levelLabel}
                    </span>
                    {profile.isBusiness && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                        Empresa
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                      ★ {profile.reputation.overall.toFixed(1)} · {profile.reputation.total} valoraciones
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="py-1">
            {!isConnected && (
              <button
                onClick={() => {
                  connect()
                  setOpen(false)
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800"
              >
                Conectar billetera
              </button>
            )}

            {isConnected && !loading && !isRegistered && (
              <button
                onClick={() => {
                  openRegister()
                  setOpen(false)
                }}
                className="w-full text-left px-4 py-2.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
              >
                Inscribirme en la plataforma
              </button>
            )}

            {isConnected && !loading && isRegistered && (
              <Link
                href="/operations"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800"
              >
                Mi actividad
              </Link>
            )}

            {isConnected && (
              <button
                onClick={() => {
                  disconnect()
                  setOpen(false)
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
              >
                Desconectar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
