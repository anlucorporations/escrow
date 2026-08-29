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
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-400 animate-pulse">
        Cargando rango...
      </span>
    )
  }

  const badgeStyles = isOro
    ? 'bg-amber-50 text-[#1A2B4C] border-[#D4AF37]/50 shadow-xs'
    : isPlata
    ? 'bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
    : 'bg-orange-50 text-[#C5A065] border-[#C5A065]/40'

  const icon = isOro ? '👑' : isPlata ? '🥈' : '🥉'

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border font-heading ${badgeStyles}`}
        title={`Rango ${rankName}: ${completed} truekes completados, ${lost} disputas perdidas (${effectiveness}% efectividad)`}
      >
        <span>{icon}</span>
        <span>Rango {rankName}</span>
        {effectiveness >= 90 && <span className="text-[10px] text-[#2A9D8F] font-black">★ {effectiveness}%</span>}
      </span>

      {showDetails && (
        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
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
