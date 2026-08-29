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
    <div className="vault-card p-6 sm:p-8 mb-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2A9D8F] font-heading">
              Estado de Identidad Web3
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              level >= 3 
                ? 'bg-amber-50 text-[#D4AF37] border border-[#D4AF37]/30' 
                : level === 2 
                  ? 'bg-teal-50 text-[#2A9D8F] border border-[#2A9D8F]/30' 
                  : 'bg-slate-100 text-[#1A2B4C]'
            }`}>
              {level >= 3 ? 'Nivel 3 · Certificado SBT' : level === 2 ? 'Nivel 2 · Verificado' : 'Nivel 1 · Inscrito'}
            </span>
          </div>

          <h2 className="text-2xl font-heading font-extrabold text-[#1A2B4C] leading-tight">
            Hola, <span className="text-[#2A9D8F]">@{username || 'usuario'}</span>
          </h2>
          <p className="text-sm text-slate-500 font-normal mt-1">
            {level >= 3
              ? 'Cuentas con la máxima certificación de confianza y emisión de bienes RWA en TrueKeat.'
              : level === 2
                ? 'Tu cuenta cuenta con verificación y 2FA. Obtén tu SBT para desbloquear certificación de bienes físicos RWA.'
                : 'Tu cuenta está inscrita on-chain. Completa tu verificación de contacto y 2FA para subir a Nivel 2.'}
          </p>
        </div>

        {/* Pasos / Progreso visual */}
        <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
          {/* Nivel 1 */}
          <div className="flex-1 lg:flex-initial p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center min-w-[90px]">
            <div className="w-5 h-5 rounded-full bg-[#1A2B4C] text-white text-[10px] font-bold flex items-center justify-center mx-auto mb-1">
              ✓
            </div>
            <p className="text-[11px] font-bold text-[#1A2B4C] font-heading">Inscrito</p>
            <p className="text-[9px] text-slate-400 font-medium">Nivel 1</p>
          </div>

          <div className={`w-4 h-0.5 ${level >= 2 ? 'bg-[#2A9D8F]' : 'bg-slate-200'}`} />

          {/* Nivel 2 */}
          <div className={`flex-1 lg:flex-initial p-3 rounded-2xl border text-center min-w-[90px] ${
            level >= 2 
              ? 'bg-teal-50/70 border-[#2A9D8F]/30' 
              : 'bg-slate-50 border-slate-200 opacity-60'
          }`}>
            <div className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center mx-auto mb-1 ${
              level >= 2 ? 'bg-[#2A9D8F] text-white' : 'bg-slate-300 text-slate-600'
            }`}>
              {level >= 2 ? '✓' : '2'}
            </div>
            <p className="text-[11px] font-bold text-[#1A2B4C] font-heading">Verificado</p>
            <p className="text-[9px] text-slate-400 font-medium">2FA / Contacto</p>
          </div>

          <div className={`w-4 h-0.5 ${level >= 3 ? 'bg-[#D4AF37]' : 'bg-slate-200'}`} />

          {/* Nivel 3 */}
          <div className={`flex-1 lg:flex-initial p-3 rounded-2xl border text-center min-w-[90px] ${
            level >= 3 
              ? 'bg-amber-50/70 border-[#D4AF37]/40' 
              : 'bg-slate-50 border-slate-200 opacity-60'
          }`}>
            <div className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center mx-auto mb-1 ${
              level >= 3 ? 'bg-[#D4AF37] text-[#1A2B4C]' : 'bg-slate-300 text-slate-600'
            }`}>
              {level >= 3 ? '✓' : '3'}
            </div>
            <p className="text-[11px] font-bold text-[#1A2B4C] font-heading">Certificado</p>
            <p className="text-[9px] text-slate-400 font-medium">SBT & RWA</p>
          </div>
        </div>

        {/* Botón de acción hacia /identity */}
        {level < 3 && (
          <Link
            href="/identity"
            className="w-full lg:w-auto btn-truekeat-primary px-6 py-3 text-xs uppercase tracking-wider text-center flex-shrink-0"
          >
            {level === 1 ? 'Subir a Nivel 2' : 'Obtener SBT (Nivel 3)'}
          </Link>
        )}
      </div>
    </div>
  )
}
