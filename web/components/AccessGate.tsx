'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { useEthereum } from '@/lib/ethereum'
import { useRegistration } from '@/lib/hooks'
import { useRegisterModal } from '@/components/RegisterModal'

/**
 * Puerta de acceso de la plataforma:
 *  - sin billetera conectada -> prompt de conexión
 *  - billetera conectada pero no inscrita on-chain -> prompt de inscripción
 *  - conectada e inscrita -> contenido de la página
 */
export function AccessGate({ children }: { children: ReactNode }) {
  const { isConnected, connect } = useEthereum()
  const { isRegistered, loading } = useRegistration()
  const { openRegister } = useRegisterModal()

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-2xl text-center py-20">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Acceso restringido
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Conecta tu billetera para acceder a la plataforma de intercambio.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={connect}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
            >
              Conectar billetera
            </button>
            <Link
              href="/"
              className="px-8 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:border-blue-500 transition-all duration-200"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20">
        <div className="container mx-auto px-4 text-center py-20 text-gray-500 dark:text-gray-400">
          Verificando inscripción on-chain...
        </div>
      </div>
    )
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-2xl text-center py-20">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-600 dark:text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 4v.01M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Billetera no inscrita
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Tu billetera está conectada pero aún no está registrada en el contrato
            on-chain. Inscríbete para acceder a la plataforma.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={openRegister}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
            >
              Inscribirme ahora
            </button>
            <Link
              href="/"
              className="px-8 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:border-blue-500 transition-all duration-200"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
