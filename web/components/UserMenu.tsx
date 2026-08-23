'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useEthereum } from '@/lib/ethereum'
import { useRegistration } from '@/lib/hooks'
import { useRegisterModal } from '@/components/RegisterModal'

/**
 * Menú de usuario minimalista de la barra de navegación:
 *  - sin conexión: opción "Conectar billetera"
 *  - conectada sin inscribir: opción "Inscribirme"
 *  - conectada e inscrita: "Mi actividad" + "Desconectar"
 */
export function UserMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { isConnected, account, connect, disconnect } = useEthereum()
  const { isRegistered, username, loading } = useRegistration()
  const { openRegister } = useRegisterModal()

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const short = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ''

  return (
    <div className="relative" ref={ref}>
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
