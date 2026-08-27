'use client'

import React from 'react'
import { useReputation } from '@/lib/hooks'

interface ReputationBadgeProps {
  address?: string
  showDetails?: boolean
  className?: string
}

export function ReputationBadge({ address, showDetails = false, className = '' }: ReputationBadgeProps) {
  const { rankName, completed, lost, effectiveness, loading, isOro, isPlata } = useReputation(address)

  if (loading) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-400 animate-pulse">
        Cargando rango...
      </span>
    )
  }

  const badgeStyles = isOro
    ? 'bg-gradient-to-r from-amber-500/10 to-yellow-500/20 text-amber-700 dark:text-amber-300 border-amber-400/40 shadow-sm'
    : isPlata
    ? 'bg-gradient-to-r from-slate-200 to-gray-300/30 text-slate-700 dark:text-slate-200 border-slate-300/50'
    : 'bg-gradient-to-r from-orange-950/10 to-amber-900/10 text-amber-900 dark:text-amber-200 border-amber-800/30'

  const icon = isOro ? '🥇' : isPlata ? '🥈' : '🥉'

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeStyles}`}
        title={`Rango ${rankName}: ${completed} truekes completados, ${lost} disputas perdidas (${effectiveness}% efectividad)`}
      >
        <span>{icon}</span>
        <span>Rango {rankName}</span>
        {effectiveness >= 90 && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">★ 90%+</span>}
      </span>

      {showDetails && (
        <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <span>
            <strong>{completed}</strong> truekes
          </span>
          <span>•</span>
          <span>
            <strong>{effectiveness}%</strong> efectividad
          </span>
        </div>
      )}
    </div>
  )
}
