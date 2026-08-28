'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { useEthereum } from '@/lib/ethereum'
import { useEscrow, useTokenInfo } from '@/lib/hooks'
import { StatusBadge } from '@/components/StatusBadge'
import { RateOperationModal } from '@/components/RateOperationModal'
import { MeetupModal } from '@/components/MeetupModal'
import { buildMetaComplete, relayRequest } from '@/lib/relay'
import { Operation, OperationStatus, isExpired, formatUnits, getFriendlyError } from '@/lib/escrow'
import { ReputationBadge } from '@/components/ReputationBadge'

interface OperationCardProps {
  operation: Operation
  onRefresh: () => void
}

interface Meetup {
  id: string
  operation_id: number
  scheduled_at: number
  lat: number
  lng: number
  place_name: string
  status: string
  blocked_reason?: string
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
  const [accepted, setAccepted] = useState(false)
  const [showRate, setShowRate] = useState(false)
  const [showMeetup, setShowMeetup] = useState(false)
  const [meetups, setMeetups] = useState<Meetup[]>([])

  // Re-evalúa el estado "vencida" cada 30 s para operaciones con deadline.
  useEffect(() => {
    const id = setInterval(() => setNow(BigInt(Date.now())), 30_000)
    return () => clearInterval(id)
  }, [])

  // Puntos de encuentro de la operación activa
  useEffect(() => {
    if (operation.status !== OperationStatus.Active) return
    let cancelled = false
    fetch(`/api/meetups?operationId=${operation.id.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.meetups) setMeetups(data.meetups)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [operation])

  // Capa de datos: contraparte (user2) y estado de aceptación
  useEffect(() => {
    if (!account) return
    let cancelled = false
    fetch(`/api/operations/${operation.id.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.operation) return
        const dbOp = data.operation
        const me = account.toLowerCase()
        const other = me === dbOp.user1?.toLowerCase() ? dbOp.user2 : dbOp.user1
        if (other && other.toLowerCase() !== me) setCounterparty(other)
        if (operation.status === OperationStatus.Active) {
          setAccepted(!!dbOp.user2 && dbOp.user2.toLowerCase() === me)
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
  const canProposeMeetup = operation.status === OperationStatus.Active && !expired && (isCreator || accepted)
  const canAccept = operation.status === OperationStatus.Active && !expired && !isCreator && !accepted
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

  const handleAccept = () =>
    run(async () => {
      if (!account) throw new Error('Conecta tu billetera primero')
      const res = await fetch(`/api/operations/${operation.id.toString()}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: account }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al aceptar')
    }, 'Operación aceptada bilateralmente')

  const handleComplete = () => run(() => completeOperation(operation), 'Trueque completado con éxito ✓')
  const handleMetaComplete = () =>
    run(async () => {
      if (!provider) throw new Error('Conecta tu billetera primero')
      const signer = await provider.getSigner()
      const req = await buildMetaComplete(signer, provider, operation.id, operation.tokenB, operation.amountB)
      await relayRequest(req)
    }, 'Trueque completado sin gas (EIP-712 Relayer) ✓')
  const handleCancel = () => run(() => cancelOperation(operation.id), 'Operación cancelada')
  const handleRefund = () =>
    run(() => refundAfterExpiry(operation.id), 'Fondos liberados y reclamados tras vencimiento')
  const handleDispute = () => run(() => disputeOperation(operation.id), 'Disputa elevada a gobernanza arbitral')
  const handleResolve = (favorUser1: boolean) =>
    run(
      () => resolveDispute(operation.id, favorUser1),
      favorUser1 ? 'Disputa resuelta a favor del creador' : 'Disputa resuelta a favor de la contraparte'
    )

  // Cálculo de etapas del contrato (1. Creada -> 2. Aceptada -> 3. En Tránsito -> 4. Completada)
  const currentStep =
    operation.status === OperationStatus.Completed
      ? 4
      : meetups.some((m) => m.status === 'opened')
      ? 3
      : accepted || counterparty
      ? 2
      : 1

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-md hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 p-6 sm:p-8 space-y-6">
      {/* ENCABEZADO DE LA OPERACIÓN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0A1128] text-[#00E5FF] flex items-center justify-center font-bold text-sm shadow-xs">
            #{operation.id.toString()}
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-[#0A1128]">
              Contrato de Trueque Bilateral
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Creador:</span>
              <span className="font-mono text-slate-800 font-semibold">
                {operation.user1.slice(0, 6)}...{operation.user1.slice(-4)}
              </span>
              <ReputationBadge address={operation.user1} />
            </div>
          </div>
        </div>

        <StatusBadge status={operation.status} expired={expired} />
      </div>

      {/* SALA DE INTERCAMBIO BILATERAL (Smart Escrow 3-Column UI) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-50/80 rounded-2xl p-5 border border-slate-200/70">
        {/* Lado Izquierdo: Tu Oferta / Token A */}
        <div className="bg-white rounded-xl p-4 border border-slate-100 text-center space-y-1 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            {isCreator ? 'Tu Oferta en Custodia' : 'Ofrece el Creador'}
          </span>
          <p className="font-serif font-extrabold text-xl text-[#0A1128]">
            {formatUnits(operation.amountA, tokenA.info?.decimals ?? 18)}
          </p>
          <p className="text-xs font-semibold text-cyan-600 font-mono">
            {tokenA.info?.symbol ?? 'Token A'}
          </p>
          <span className="text-[10px] text-slate-400 font-mono block truncate">
            {operation.tokenA.slice(0, 8)}...{operation.tokenA.slice(-6)}
          </span>
        </div>

        {/* Centro: Isotipo Orbital de TrueKeate */}
        <div className="flex flex-col items-center justify-center py-2 text-center">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-lg shadow-[#00E5FF]/25 border-2 border-cyan-400/40 bg-white flex items-center justify-center group mb-2">
            <Image
              src="/images/truekeate-logo.jpg"
              alt="TrueKeate Escrow"
              fill
              className="object-cover object-top scale-[1.8] animate-spin-slow"
            />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A1128]">
            Custodia Atómica
          </span>
          <span className="text-[10px] text-slate-400 font-light">
            Smart Escrow EIP-712
          </span>
        </div>

        {/* Lado Derecho: Lo que Recibes / Token B */}
        <div className="bg-white rounded-xl p-4 border border-slate-100 text-center space-y-1 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            {isCreator ? 'Lo que Recibes a Cambio' : 'Tu Aporte Requerido'}
          </span>
          <p className="font-serif font-extrabold text-xl text-[#0A1128]">
            {formatUnits(operation.amountB, tokenB.info?.decimals ?? 18)}
          </p>
          <p className="text-xs font-semibold text-amber-600 font-mono">
            {tokenB.info?.symbol ?? 'Token B'}
          </p>
          <span className="text-[10px] text-slate-400 font-mono block truncate">
            {operation.tokenB.slice(0, 8)}...{operation.tokenB.slice(-6)}
          </span>
        </div>
      </div>

      {/* BARRA DE PROGRESO DE ESTADO (1. Creada -> 2. Aceptada -> 3. En Tránsito -> 4. Completada) */}
      <div className="space-y-2 pt-2">
        <div className="flex justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          <span className={currentStep >= 1 ? 'text-cyan-600 font-bold' : ''}>1. Creada</span>
          <span className={currentStep >= 2 ? 'text-cyan-600 font-bold' : ''}>2. Aceptada</span>
          <span className={currentStep >= 3 ? 'text-cyan-600 font-bold' : ''}>3. En Tránsito</span>
          <span className={currentStep >= 4 ? 'text-emerald-600 font-bold' : ''}>4. Completada</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
          <div
            className={`h-full transition-all duration-500 ${
              currentStep === 4
                ? 'bg-emerald-500 w-full'
                : currentStep === 3
                ? 'bg-cyan-500 w-3/4'
                : currentStep === 2
                ? 'bg-cyan-500 w-1/2'
                : 'bg-cyan-500 w-1/4'
            }`}
          ></div>
        </div>
      </div>

      {/* METADATOS Y PLAZOS */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
        <span>Creada: {new Date(Number(operation.createdAt) * 1000).toLocaleString()}</span>
        {operation.deadline !== 0n && (
          <span className={expired ? 'text-rose-500 font-bold' : ''}>
            Vence: {new Date(Number(operation.deadline) * 1000).toLocaleString()}
          </span>
        )}
        {operation.closedAt !== 0n && (
          <span>Finalizada: {new Date(Number(operation.closedAt) * 1000).toLocaleString()}</span>
        )}
      </div>

      {/* PUNTOS DE ENCUENTRO PRESENCIAL */}
      {meetups.length > 0 && (
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <span>📍</span> Puntos de Encuentro Coordinados
          </p>
          <div className="space-y-2">
            {meetups.map((m) => (
              <div
                key={m.id}
                className="text-xs bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {new Date(Number(m.scheduled_at) * 1000).toLocaleString()}
                    {m.place_name ? ` — ${m.place_name}` : ''}
                  </p>
                  <p className="text-slate-400 font-mono text-[11px] mt-0.5">
                    Coordenadas GPS: {m.lat.toFixed(5)}, {m.lng.toFixed(5)}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                    m.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : m.status === 'blocked'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-cyan-100 text-cyan-800'
                  }`}
                >
                  {m.status === 'scheduled'
                    ? 'Programado'
                    : m.status === 'opened'
                    ? 'En Curso'
                    : m.status === 'completed'
                    ? 'Completado'
                    : 'Bloqueado'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FEEDBACK DE ESTADO */}
      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center">
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold text-center">
          Error: {error}
        </div>
      )}

      {/* BOTONES DE ACCIÓN SEGÚN ROL Y ESTADO */}
      <div className="space-y-3 pt-2">
        {canAccept && (
          <button
            onClick={handleAccept}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#00E5FF] to-[#00B4D8] hover:from-[#00B4D8] hover:to-[#008BA3] text-[#0A1128] font-bold rounded-2xl text-xs uppercase tracking-wider transition-all duration-200 shadow-lg shadow-[#00E5FF]/20"
          >
            🤝 Aceptar Operación (Acuerdo Bilateral)
          </button>
        )}

        {canProposeMeetup && (
          <button
            onClick={() => setShowMeetup(true)}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
          >
            <span>📍</span> Proponer Punto de Encuentro
          </button>
        )}

        {canComplete && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleComplete}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition shadow-md shadow-emerald-600/20"
            >
              {loading ? 'Procesando...' : 'Completar Trueque'}
            </button>
            <button
              onClick={handleMetaComplete}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#0A1128] hover:bg-[#1C2541] text-[#00E5FF] font-bold rounded-2xl text-xs uppercase tracking-wider transition border border-cyan-400/30"
            >
              ⚡ Firmar sin Gas (EIP-712)
            </button>
          </div>
        )}

        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={loading}
            className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-2xl text-xs uppercase tracking-wider transition border border-rose-200"
          >
            {loading ? 'Cancelando...' : 'Cancelar Operación & Retirar Fondos'}
          </button>
        )}

        {canRefund && (
          <button
            onClick={handleRefund}
            disabled={loading}
            className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition shadow-md"
          >
            {loading ? 'Reclamando...' : 'Reclamar Fondos (Venció el Plazo)'}
          </button>
        )}

        {canDispute && (
          <button
            onClick={handleDispute}
            disabled={loading}
            className="w-full py-3 px-4 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-2xl text-xs uppercase tracking-wider transition border border-amber-200"
          >
            {loading ? 'Abriendo disputa...' : '⚖️ Abrir Disputa Arbitral'}
          </button>
        )}

        {canResolve && (
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
            <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              ⚖️ Panel de Árbitro — Resolver Disputa #{operation.id.toString()}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => handleResolve(true)}
                disabled={loading}
                className="px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase"
              >
                A favor del Creador
              </button>
              <button
                onClick={() => handleResolve(false)}
                disabled={loading}
                className="px-4 py-2.5 bg-[#0A1128] text-[#00E5FF] font-bold rounded-xl text-xs uppercase"
              >
                A favor de Contraparte
              </button>
            </div>
          </div>
        )}

        {canRate && (
          <button
            onClick={() => setShowRate(true)}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition shadow-md"
          >
            ⭐ Valorar Operación & Emitir Reputación
          </button>
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

      {showMeetup && (
        <MeetupModal
          operationId={operation.id}
          onClose={() => {
            setShowMeetup(false)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}
