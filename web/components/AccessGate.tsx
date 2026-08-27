'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { useEthereum } from '@/lib/ethereum'
import { useRegistration } from '@/lib/hooks'
import { useRegisterModal } from '@/components/RegisterModal'

/**
 * Puerta de Acceso a la Plataforma TrueKeate (Mobile & Desktop).
 * 
 * Gestiona los 3 estados de acceso:
 * 1. Sin billetera -> Invitación a conectar.
 * 2. Conectado pero no inscrito -> Registro on-chain de @username (Nivel 1).
 * 3. Inscrito (Nivel 1+) -> Acceso completo a todas las funciones de la Suite.
 */
export function AccessGate({ children }: { children: ReactNode }) {
  const { isConnected, connect } = useEthereum()
  const { isRegistered, loading } = useRegistration()
  const { openRegister } = useRegisterModal()

  // 1. Estado: Sin billetera conectada
  if (!isConnected) {
    return (
      <div className="min-h-[80vh] bg-background flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-xl w-full bg-white rounded-[2.5rem] border border-slate-200 p-8 sm:p-12 text-center shadow-2xl shadow-indigo-900/5">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-100">
            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <span className="text-xs tracking-[0.2em] uppercase text-indigo-600 font-semibold block mb-2">
            Suite Privada
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif text-slate-900 mb-4 leading-tight">
            Acceso Reservado a la Suite TrueKeate
          </h1>
          <p className="text-slate-500 font-light mb-8 leading-relaxed text-sm sm:text-base">
            Conecta tu billetera Web3 para gestionar tus intercambios custodiados, tokens, bienes RWA y reputación on-chain.
          </p>

          {/* Tres Pilares / Niveles Informativos */}
          <div className="grid grid-cols-3 gap-3 mb-8 text-left">
            <div className="p-3 bg-indigo-50/50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-semibold uppercase text-indigo-600 block mb-1">Nivel 1</span>
              <p className="text-xs font-serif font-bold text-slate-900">Inscrito</p>
              <p className="text-[10px] text-slate-500 font-light mt-0.5">Truekes P2P</p>
            </div>
            <div className="p-3 bg-purple-50/50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-semibold uppercase text-purple-600 block mb-1">Nivel 2</span>
              <p className="text-xs font-serif font-bold text-slate-900">Verificado</p>
              <p className="text-[10px] text-slate-500 font-light mt-0.5">2FA & Campañas</p>
            </div>
            <div className="p-3 bg-[#F2F5ED] rounded-2xl border border-slate-100">
              <span className="text-[10px] font-semibold uppercase text-[#8A9A70] block mb-1">Nivel 3</span>
              <p className="text-xs font-serif font-bold text-slate-900">Certificado</p>
              <p className="text-[10px] text-slate-500 font-light mt-0.5">SBT & RWA</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={connect}
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-semibold tracking-wide uppercase transition-all shadow-lg shadow-slate-900/10"
            >
              Conectar Billetera
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto px-8 py-4 bg-transparent border border-slate-200 hover:border-slate-400 text-slate-700 rounded-full text-xs font-semibold tracking-wide uppercase transition-all text-center"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 2. Estado: Verificando on-chain
  if (loading) {
    return (
      <div className="min-h-[80vh] bg-background flex flex-col items-center justify-center px-4">
        <div className="w-12 h-12 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-slate-500 font-light">Verificando nivel de identidad en la blockchain...</p>
      </div>
    )
  }

  // 3. Estado: Billetera conectada pero no inscrita on-chain (Nivel 0)
  if (!isRegistered) {
    return (
      <div className="min-h-[80vh] bg-background flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-xl w-full bg-white rounded-[2.5rem] border border-slate-200 p-8 sm:p-12 text-center shadow-2xl shadow-indigo-900/5">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-100">
            <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>

          <span className="text-xs tracking-[0.2em] uppercase text-amber-600 font-semibold block mb-2">
            Paso 1 Obligatorio
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif text-slate-900 mb-4 leading-tight">
            Inscripción Requerida en TrueKeate
          </h1>
          <p className="text-slate-500 font-light mb-8 leading-relaxed text-sm sm:text-base">
            Tu billetera está conectada pero aún no cuenta con un <strong className="font-semibold text-slate-800">@nombre_de_usuario</strong> registrado on-chain. Elige tu identificador para desbloquear el Nivel 1 y acceder a la suite completa.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={openRegister}
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-semibold tracking-wide uppercase transition-all shadow-lg shadow-slate-900/10"
            >
              Inscribirme Ahora (Elegir @username)
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto px-8 py-4 bg-transparent border border-slate-200 hover:border-slate-400 text-slate-700 rounded-full text-xs font-semibold tracking-wide uppercase transition-all text-center"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 4. Estado: Inscrito (Nivel 1+) -> Acceso concedido a todas las funciones
  return <>{children}</>
}
