'use client'

import React from 'react'
import Link from 'next/link'
import { useTradeQuota } from '@/lib/hooks'

export function TradeQuotaBanner() {
  const { activeTrades, limit, canCreate, isUnlimited, levelName, loading } = useTradeQuota()

  if (loading || isUnlimited) return null

  const isFull = !canCreate

  return (
    <div
      className={`mb-6 p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
        isFull
          ? 'bg-amber-50 border-[#D4AF37]/40 text-[#1A2B4C]'
          : 'bg-white border-slate-200 text-[#1A2B4C]'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{isFull ? '⏳' : '⚡'}</span>
        <div>
          <div className="text-sm font-bold flex items-center gap-2 font-heading">
            <span>
              Capacidad de Truekes: {activeTrades} de {limit} simultáneo{limit > 1 ? 's' : ''}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-[#2A9D8F] font-bold border border-[#2A9D8F]/30">
              Nivel: {levelName}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isFull
              ? `Has alcanzado tu límite de ${limit} intercambio${limit > 1 ? 's' : ''} activo${limit > 1 ? 's' : ''}. Completa o cancela tu operación en curso para abrir una nueva.`
              : `Puedes tener hasta ${limit} intercambio${limit > 1 ? 's' : ''} activo${limit > 1 ? 's' : ''} al mismo tiempo.`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        {levelName === 'Inscrito' && (
          <Link
            href="/identity"
            className="btn-truekeat-primary px-4 py-2 text-xs uppercase tracking-wider font-heading"
          >
            Verificar 2FA (Hasta 3) →
          </Link>
        )}
        {levelName === 'Verificado' && (
          <Link
            href="/identity"
            className="btn-gold-accent px-4 py-2 text-xs uppercase tracking-wider font-heading"
          >
            Obtener Certificado SBT (Ilimitados) →
          </Link>
        )}
      </div>
    </div>
  )
}
