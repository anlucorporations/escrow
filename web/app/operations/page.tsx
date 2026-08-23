'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { useEscrow } from '@/lib/hooks'
import { OperationCard } from '@/components/OperationCard'
import { CreateOperationModal } from '@/components/CreateOperationModal'
import { Operation, OperationStatus, isExpired } from '@/lib/escrow'

const PAGE_SIZE = 10

type FilterKey = 'all' | 'active' | 'completed' | 'cancelled' | 'disputed' | 'expired'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'active', label: 'Activas' },
  { key: 'completed', label: 'Completadas' },
  { key: 'cancelled', label: 'Canceladas' },
  { key: 'disputed', label: 'En disputa' },
  { key: 'expired', label: 'Vencidas' },
]

export default function OperationsPage() {
  const [operations, setOperations] = useState<Operation[]>([])
  const [filter, setFilter] = useState<FilterKey>('all')
  const [myActivity, setMyActivity] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const { isConnected, account } = useEthereum()
  const { getOperationsCount, getOperations } = useEscrow()
  const loadedAll = useRef(false)

  const loadOperations = useCallback(
    async (append = false) => {
      if (!isConnected) {
        setOperations([])
        setHasMore(false)
        return
      }
      const count = await getOperationsCount()
      const loaded = loadedAll.current ? operations.length : append ? operations.length : 0
      if (loaded >= count) {
        setHasMore(false)
        return
      }
      const page = await getOperations(loaded, PAGE_SIZE)
      const next = append ? [...operations, ...page] : page
      setOperations(next)
      setHasMore(next.length < count)
    },
    [isConnected, getOperationsCount, getOperations, operations]
  )

  useEffect(() => {
    loadedAll.current = false
    loadOperations()
  }, [isConnected]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = async () => {
    setLoadingMore(true)
    try {
      await loadOperations(true)
    } finally {
      setLoadingMore(false)
    }
  }

  const refresh = useCallback(() => {
    loadedAll.current = false
    loadOperations()
  }, [loadOperations])

  const now = BigInt(Date.now())
  const filteredOperations = operations.filter((op) => {
    const expired = isExpired(op, now)
    if (myActivity && account && op.user1.toLowerCase() !== account.toLowerCase()) {
      return false
    }
    switch (filter) {
      case 'active':
        return op.status === OperationStatus.Active && !expired
      case 'completed':
        return op.status === OperationStatus.Completed
      case 'cancelled':
        return op.status === OperationStatus.Cancelled
      case 'disputed':
        return op.status === OperationStatus.Disputed
      case 'expired':
        return expired
      default:
        return true
    }
  })

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Conecta tu wallet
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Conecta tu wallet para ver las operaciones
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-zinc-950 pt-20">
      <div className="container mx-auto px-4 max-w-5xl pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Operaciones
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Custodia bilateral con intercambio atómico, deadline y arbitraje
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl w-full sm:w-auto"
          >
            + Nueva operación
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <label className="inline-flex items-center gap-2 mb-8 cursor-pointer">
          <input
            type="checkbox"
            checked={myActivity}
            onChange={(e) => setMyActivity(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Solo mi actividad (operaciones que creé)
          </span>
        </label>

        {/* Operations List */}
        {filteredOperations.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No hay operaciones
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'all'
                ? 'Crea tu primera operación para empezar'
                : `No hay operaciones en el filtro "${FILTERS.find((f) => f.key === filter)?.label}"`}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-6">
              {filteredOperations.map((op) => (
                <OperationCard key={op.id.toString()} operation={op} onRefresh={refresh} />
              ))}
            </div>
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:border-blue-500 disabled:opacity-50 transition-all"
                >
                  {loadingMore ? 'Cargando...' : 'Cargar más'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      <CreateOperationModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          refresh()
        }}
      />
    </div>
  )
}
