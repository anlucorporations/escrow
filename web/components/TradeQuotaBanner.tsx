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
      className={`mb-6 p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        isFull
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
          : 'bg-cream-50 dark:bg-card/40 border-primary/15 text-foreground'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{isFull ? '⏳' : '⚡'}</span>
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <span>
              Capacidad de Truekes: {activeTrades} de {limit} simultáneo{limit > 1 ? 's' : ''}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              Nivel: {levelName}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
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
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
          >
            Verificar 2FA (Hasta 3) →
          </Link>
        )}
        {levelName === 'Verificado' && (
          <Link
            href="/identity"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
          >
            Obtener Certificado SBT (Ilimitados) →
          </Link>
        )}
      </div>
    </div>
  )
}
