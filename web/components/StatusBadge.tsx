'use client'

import { OperationStatus } from '@/lib/escrow'

interface StatusBadgeProps {
  status: OperationStatus
  expired?: boolean
}

const STYLES: Record<OperationStatus, string> = {
  [OperationStatus.Active]:
    'bg-teal-50 text-[#2A9D8F] border border-[#2A9D8F]/30',
  [OperationStatus.Completed]:
    'bg-emerald-50 text-emerald-700 border border-emerald-500/30',
  [OperationStatus.Cancelled]:
    'bg-slate-100 text-slate-600 border border-slate-200',
  [OperationStatus.Disputed]:
    'bg-amber-50 text-amber-800 border border-amber-500/30',
}

const ICONS: Record<OperationStatus, string> = {
  [OperationStatus.Active]: '●',
  [OperationStatus.Completed]: '✓',
  [OperationStatus.Cancelled]: '✕',
  [OperationStatus.Disputed]: '⚖',
}

const LABELS: Record<OperationStatus, string> = {
  [OperationStatus.Active]: 'Activa',
  [OperationStatus.Completed]: 'Completada',
  [OperationStatus.Cancelled]: 'Cancelada',
  [OperationStatus.Disputed]: 'En disputa',
}

export function StatusBadge({ status, expired = false }: StatusBadgeProps) {
  if (expired) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-[#E63946] border border-[#E63946]/30 inline-flex items-center gap-1">
        <span>⏱</span>
        <span>Vencida</span>
      </span>
    )
  }
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide inline-flex items-center gap-1 ${STYLES[status] ?? STYLES[OperationStatus.Active]}`}
    >
      <span>{ICONS[status] ?? '●'}</span>
      <span>{LABELS[status] ?? 'Desconocida'}</span>
    </span>
  )
}
