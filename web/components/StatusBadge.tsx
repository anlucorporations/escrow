'use client'

import { OperationStatus } from '@/lib/escrow'

interface StatusBadgeProps {
  status: OperationStatus
  expired?: boolean
}

const STYLES: Record<OperationStatus, string> = {
  [OperationStatus.Active]:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  [OperationStatus.Completed]:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  [OperationStatus.Cancelled]:
    'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200',
  [OperationStatus.Disputed]:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
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
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200">
        Vencida
      </span>
    )
  }
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${STYLES[status] ?? STYLES[OperationStatus.Active]}`}
    >
      {LABELS[status] ?? 'Desconocida'}
    </span>
  )
}
