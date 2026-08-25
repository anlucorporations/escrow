'use client'

import { useCallback, useEffect, useState } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { useEscrow, useTokenInfo } from '@/lib/hooks'
import { StatusBadge } from '@/components/StatusBadge'
import { RateOperationModal } from '@/components/RateOperationModal'
import { buildMetaComplete, relayRequest } from '@/lib/relay'
import { Operation, OperationStatus, isExpired, formatUnits, getFriendlyError } from '@/lib/escrow'

interface OperationCardProps {
  operation: Operation
  onRefresh: () => void
}

export function OperationCard({ operation, onRefresh }: OperationCardProps) {
  const { account } = useEthereum()
  const { provider, completeOperation, cancelOperation, refundAfterExpiry, disputeOperation, resolveDispute, roles } =
    useEscrow()
  const tokenA = useTokenInfo(operation.tokenA)
  const tokenB = useTokenInfo(operation.tokenB)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [now, setNow] = useState(BigInt(Date.now()))
  const [counterparty, setCounterparty] = useState<string | null>(null)
  const [showRate, setShowRate] = useState(false)

  // Re-evalúa el estado "vencida" cada 30 s para operaciones con deadline.
  useEffect(() => {
    const id = setInterval(() => setNow(BigInt(Date.now())), 30_000)
    return () => clearInterval(id)
  }, [])

  // Para valoraciones (M3): la contraparte (user2) solo existe en la capa de datos
  useEffect(() => {
    if (operation.status !== OperationStatus.Completed || !account) return
    let cancelled = false
    fetch(`/api/operations/${operation.id.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.operation) {
          const dbOp = data.operation
          const me = account.toLowerCase()
          const other = me === dbOp.user1?.toLowerCase() ? dbOp.user2 : dbOp.user1
          if (other && other.toLowerCase() !== me) setCounterparty(other)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [operation, account])

  const expired = isExpired(operation, now)
  const isCreator = account?.toLowerCase() === operation.user1.toLowerCase()
  const canComplete =
    operation.status === OperationStatus.Active && !isCreator && !expired
  const canCancel = operation.status === OperationStatus.Active && isCreator
  const canDispute =
    operation.status === OperationStatus.Active && !expired && roles.arbiter !== null
  const canRefund = operation.status === OperationStatus.Active && isCreator && expired
  const isDisputed = operation.status === OperationStatus.Disputed
  const canResolve = isDisputed && roles.isArbiter
  const canRate = operation.status === OperationStatus.Completed && counterparty !== null

  const run = useCallback(
    async (fn: () => Promise<unknown>, okMessage: string) => {
      setLoading(true)
      setError('')
      setSuccess('')
      try {
        await fn()
        setSuccess(okMessage)
        setTimeout(() => {
          setSuccess('')
          onRefresh()
        }, 1500)
      } catch (err) {
        setError(getFriendlyError(err))
      } finally {
        setLoading(false)
      }
    },
    [onRefresh]
  )

  const handleComplete = () => run(() => completeOperation(operation), 'Operación completada ✓')
  const handleMetaComplete = () =>
    run(async () => {
      if (!provider) throw new Error('Connect your wallet first')
      const signer = await provider.getSigner()
      const req = await buildMetaComplete(signer, provider, operation.id, operation.tokenB, operation.amountB)
      await relayRequest(req)
    }, 'Operación completada sin gas (relayer) ✓')
  const handleCancel = () => run(() => cancelOperation(operation.id), 'Operación cancelada')
  const handleRefund = () =>
    run(() => refundAfterExpiry(operation.id), 'Fondos reclamados tras el vencimiento')
  const handleDispute = () => run(() => disputeOperation(operation.id), 'Disputa abierta')
  const handleResolve = (favorUser1: boolean, recipient: string) =>
    run(
      () => resolveDispute(operation.id, favorUser1, recipient),
      favorUser1 ? 'Resuelto a favor del creador' : 'Resuelto a favor de la contraparte'
    )

  return (
    <div className="border border-gray-200 dark:border-zinc-700 rounded-lg p-6 bg-white dark:bg-zinc-900 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4 gap-3">
        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">
            Operación #{operation.id.toString()}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Creador: {operation.user1.slice(0, 6)}...{operation.user1.slice(-4)}
          </p>
        </div>
        <StatusBadge status={operation.status} expired={expired} />
      </div>

      <div className="space-y-3 mb-6 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
        <div className="flex justify-between items-center gap-4">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Ofrece (Token A)</p>
            <p className="font-bold text-lg text-gray-900 dark:text-white">
              {formatUnits(operation.amountA, tokenA.info?.decimals ?? 18)} {tokenA.info?.symbol ?? '...'}
            </p>
          </div>
          <svg className="w-6 h-6 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
          </svg>
          <div className="text-right">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Pide (Token B)</p>
            <p className="font-bold text-lg text-gray-900 dark:text-white">
              {formatUnits(operation.amountB, tokenB.info?.decimals ?? 18)} {tokenB.info?.symbol ?? '...'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-zinc-700 pt-3">
          <span>Creada: {new Date(Number(operation.createdAt) * 1000).toLocaleString()}</span>
          {operation.deadline !== 0n && (
            <span>Vence: {new Date(Number(operation.deadline) * 1000).toLocaleString()}</span>
          )}
          {operation.closedAt !== 0n && (
            <span>Cerrada: {new Date(Number(operation.closedAt) * 1000).toLocaleString()}</span>
          )}
        </div>
      </div>

      {/* Botones contextuales por actor + estado */}
      <div className="space-y-2">
        {canComplete && (
          <>
            <button
              onClick={handleComplete}
              disabled={loading}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-400 font-semibold transition-all duration-200"
            >
              {loading ? 'Procesando...' : 'Completar operación'}
            </button>
            {/* M5: completar sin gas vía relayer */}
            <button
              onClick={handleMetaComplete}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:from-gray-400 disabled:to-gray-400 font-semibold transition-all duration-200"
            >
              ⚡ Completar sin gas (firma + relayer)
            </button>
          </>
        )}

        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={loading}
            className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 font-semibold transition-all duration-200"
          >
            {loading ? 'Cancelando...' : 'Cancelar operación'}
          </button>
        )}

        {canRefund && (
          <button
            onClick={handleRefund}
            disabled={loading}
            className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-400 font-semibold transition-all duration-200"
          >
            {loading ? 'Reclamando...' : 'Reclamar fondos (venció)'}
          </button>
        )}

        {canDispute && (
          <button
            onClick={handleDispute}
            disabled={loading}
            className="w-full px-4 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-gray-400 font-semibold transition-all duration-200"
          >
            {loading ? 'Abriendo disputa...' : 'Disputar operación'}
          </button>
        )}

        {canResolve && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-2">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Panel de árbitro — resolver disputa #{operation.id.toString()}
            </p>
            <button
              onClick={() => handleResolve(true, operation.user1)}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold"
            >
              A favor del creador (refund)
            </button>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => handleResolve(false, account ?? '')}
                disabled={loading || !account}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
              >
                A favor de mi dirección (contraparte)
              </button>
            </div>
          </div>
        )}

        {canRate && (
          <button
            onClick={() => setShowRate(true)}
            className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-semibold transition-all duration-200"
          >
            Valorar operación (reputación)
          </button>
        )}

        {success && (
          <div className="text-green-600 dark:text-green-400 text-sm text-center bg-green-50 dark:bg-green-900/20 p-2 rounded">
            {success}
          </div>
        )}
        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
            Error: {error}
          </div>
        )}

        {operation.status === OperationStatus.Completed && operation.closedAt !== 0n && (
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-zinc-800 rounded">
            Finalizada el {new Date(Number(operation.closedAt) * 1000).toLocaleString()}
          </div>
        )}
      </div>

      {showRate && counterparty && (
        <RateOperationModal
          operationId={operation.id}
          counterparty={counterparty}
          isCreator={isCreator}
          onClose={() => {
            setShowRate(false)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}
