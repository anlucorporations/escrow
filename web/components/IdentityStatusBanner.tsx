'use client'

import Link from 'next/link'
import { useEthereum } from '@/lib/ethereum'
import { useProfile, useRegistration } from '@/lib/hooks'

export function IdentityStatusBanner() {
  const { account, isConnected } = useEthereum()
  const { isRegistered, username } = useRegistration()
  const { profile } = useProfile(isConnected && isRegistered ? account : null)

  if (!isConnected || !isRegistered) return null

  const level = profile?.identificationLevel ?? 1

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 p-6 sm:p-8 mb-10 shadow-sm">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Estado de Identidad Web3
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              level >= 3 
                ? 'bg-[#F2F5ED] text-[#8A9A70] border border-[#8A9A70]/30' 
                : level === 2 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-indigo-100 text-indigo-800'
            }`}>
              {level >= 3 ? 'Nivel 3 · Certificado SBT' : level === 2 ? 'Nivel 2 · Verificado' : 'Nivel 1 · Inscrito'}
            </span>
          </div>

          <h2 className="text-2xl font-serif text-slate-900 leading-tight">
            Hola, <span className="italic text-indigo-600">@{username || 'usuario'}</span>
          </h2>
          <p className="text-sm text-slate-500 font-light mt-1">
            {level >= 3
              ? 'Cuentas con la máxima certificación de confianza y emisión de bienes RWA en TrueKeate.'
              : level === 2
                ? 'Tu cuenta cuenta con verificación y 2FA. Obtén tu SBT para desbloquear certificación de bienes físicos RWA.'
                : 'Tu cuenta está inscrita on-chain. Completa tu verificación de contacto y 2FA para subir a Nivel 2.'}
          </p>
        </div>

        {/* Pasos / Progreso visual */}
        <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
          {/* Nivel 1 */}
          <div className="flex-1 lg:flex-initial p-3 bg-indigo-50 rounded-2xl border border-indigo-200 text-center min-w-[90px]">
            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center mx-auto mb-1">
              ✓
            </div>
            <p className="text-[11px] font-bold text-slate-900">Inscrito</p>
            <p className="text-[9px] text-slate-500 font-light">Nivel 1</p>
          </div>

          <div className={`w-4 h-0.5 ${level >= 2 ? 'bg-purple-500' : 'bg-slate-200'}`} />

          {/* Nivel 2 */}
          <div className={`flex-1 lg:flex-initial p-3 rounded-2xl border text-center min-w-[90px] ${
            level >= 2 
              ? 'bg-purple-50 border-purple-200' 
              : 'bg-slate-50 border-slate-200 opacity-60'
          }`}>
            <div className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center mx-auto mb-1 ${
              level >= 2 ? 'bg-purple-600 text-white' : 'bg-slate-300 text-slate-600'
            }`}>
              {level >= 2 ? '✓' : '2'}
            </div>
            <p className="text-[11px] font-bold text-slate-900">Verificado</p>
            <p className="text-[9px] text-slate-500 font-light">2FA / Contacto</p>
          </div>

          <div className={`w-4 h-0.5 ${level >= 3 ? 'bg-[#8A9A70]' : 'bg-slate-200'}`} />

          {/* Nivel 3 */}
          <div className={`flex-1 lg:flex-initial p-3 rounded-2xl border text-center min-w-[90px] ${
            level >= 3 
              ? 'bg-[#F2F5ED] border-[#8A9A70]/40' 
              : 'bg-slate-50 border-slate-200 opacity-60'
          }`}>
            <div className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center mx-auto mb-1 ${
              level >= 3 ? 'bg-[#8A9A70] text-white' : 'bg-slate-300 text-slate-600'
            }`}>
              {level >= 3 ? '✓' : '3'}
            </div>
            <p className="text-[11px] font-bold text-slate-900">Certificado</p>
            <p className="text-[9px] text-slate-500 font-light">SBT & RWA</p>
          </div>
        </div>

        {/* Botón de acción hacia /identity si falta subir de nivel */}
        {level < 3 && (
          <Link
            href="/identity"
            className="w-full lg:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-semibold tracking-wide uppercase transition-all text-center flex-shrink-0"
          >
            {level === 1 ? 'Subir a Nivel 2' : 'Obtener SBT (Nivel 3)'}
          </Link>
        )}
      </div>
    </div>
  )
}
