'use client'

import { useState, useEffect, useCallback } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { EXCHANGE_ADDRESS, EXCHANGE_ABI, ERC20_ABI, USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI } from '@/lib/contracts'
import { ethers } from 'ethers'

export interface Order {
  id: bigint
  maker: string
  giveToken: string
  takeToken: string
  giveAmount: bigint
  takeAmount: bigint
  status: number // 0: OPEN, 1: FILLED, 2: CANCELLED
  createdAt: bigint
  filledAt: bigint
}

function OrderCard({ order, onRefresh }: { order: Order; onRefresh: () => void }) {
  const { account, signer, provider } = useEthereum()
  const [giveSymbol, setGiveSymbol] = useState('')
  const [takeSymbol, setTakeSymbol] = useState('')
  const [makerHandle, setMakerHandle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const loadDetails = async () => {
      if (!provider) return
      try {
        const giveContract = new ethers.Contract(order.giveToken, ERC20_ABI, provider)
        const takeContract = new ethers.Contract(order.takeToken, ERC20_ABI, provider)
        const registryContract = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, provider)

        const [gSym, tSym, profile] = await Promise.all([
          giveContract.symbol().catch(() => 'TKA'),
          takeContract.symbol().catch(() => 'TKB'),
          registryContract.getUserProfile(order.maker).catch(() => null)
        ])

        setGiveSymbol(gSym)
        setTakeSymbol(tSym)
        if (profile && profile.username) {
          setMakerHandle(`@${profile.username}`)
        } else {
          setMakerHandle(`${order.maker.slice(0, 6)}...${order.maker.slice(-4)}`)
        }
      } catch (err) {
        console.error('Error loading order card details:', err)
      }
    }
    loadDetails()
  }, [order, provider])

  const handleFillOrder = async () => {
    if (!signer) return
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      // Step 1: Approve requested token
      const tokenContract = new ethers.Contract(order.takeToken, ERC20_ABI, signer)
      const tx1 = await tokenContract.approve(EXCHANGE_ADDRESS, order.takeAmount)
      await tx1.wait()

      // Step 2: Fill order in Exchange
      const exchangeContract = new ethers.Contract(EXCHANGE_ADDRESS, EXCHANGE_ABI, signer)
      const tx2 = await exchangeContract.fillOrder(order.id)
      await tx2.wait()

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onRefresh()
      }, 2000)
    } catch (err: any) {
      console.error('Fill order error:', err)
      setError(err.reason || err.message || 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!signer) return
    setLoading(true)
    setError('')

    try {
      const exchangeContract = new ethers.Contract(EXCHANGE_ADDRESS, EXCHANGE_ABI, signer)
      const tx = await exchangeContract.cancelOrder(order.id)
      await tx.wait()
      onRefresh()
    } catch (err: any) {
      console.error('Cancel order error:', err)
      setError(err.reason || err.message || 'Cancel failed')
    } finally {
      setLoading(false)
    }
  }

  const isMaker = account?.toLowerCase() === order.maker.toLowerCase()
  const statusLabel = order.status === 0 ? 'Abierta' : order.status === 1 ? 'Ejecutada' : 'Cancelada'
  const statusColor = order.status === 0 
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
    : order.status === 1 
    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    : 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Orden #{order.id.toString()}</span>
          <h4 className="font-bold text-base mt-0.5 text-zinc-900 dark:text-zinc-100">
            Trader {makerHandle}
          </h4>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
        <div>
          <span className="text-xs text-gray-500 block mb-1">Entrega (Ofrece):</span>
          <span className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            {ethers.formatEther(order.giveAmount)} <span className="text-xs font-medium text-blue-500">{giveSymbol || '...'}</span>
          </span>
        </div>
        <div>
          <span className="text-xs text-gray-500 block mb-1">Solicita (Pide):</span>
          <span className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            {ethers.formatEther(order.takeAmount)} <span className="text-xs font-medium text-emerald-500">{takeSymbol || '...'}</span>
          </span>
        </div>
      </div>

      {order.status === 0 && !isMaker && (
        <div>
          <button
            onClick={handleFillOrder}
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:bg-gray-400 text-sm shadow-sm"
          >
            {loading ? 'Procesando Intercambio...' : 'Ejecutar Intercambio'}
          </button>
          {success && (
            <div className="mt-2 text-xs text-emerald-600 text-center font-medium">
              ¡Intercambio realizado exitosamente!
            </div>
          )}
          {error && (
            <div className="mt-2 text-xs text-red-600 font-medium">
              Error: {error}
            </div>
          )}
        </div>
      )}

      {order.status === 0 && isMaker && (
        <button
          onClick={handleCancelOrder}
          disabled={loading}
          className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 font-semibold rounded-lg transition disabled:opacity-50 text-sm"
        >
          {loading ? 'Cancelando...' : 'Cancelar Orden'}
        </button>
      )}
    </div>
  )
}

export function OrderBook() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<'all' | 'open' | 'my'>('open')
  const { provider, account } = useEthereum()

  const loadOrders = useCallback(async () => {
    if (!provider) return
    try {
      const exchangeContract = new ethers.Contract(EXCHANGE_ADDRESS, EXCHANGE_ABI, provider)
      let rawOrders: any[] = []

      try {
        rawOrders = await exchangeContract.getOrdersPaged(0, 100)
      } catch (err) {
        console.error('Error loading orders:', err)
        rawOrders = []
      }

      const formatted: Order[] = rawOrders.map((o: any) => ({
        id: o.id,
        maker: o.maker,
        giveToken: o.giveToken,
        takeToken: o.takeToken,
        giveAmount: o.giveAmount,
        takeAmount: o.takeAmount,
        status: Number(o.status),
        createdAt: o.createdAt,
        filledAt: o.filledAt
      }))

      setOrders(formatted)
    } catch (err) {
      console.error('Error fetching order book:', err)
    }
  }, [provider])

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 5000)
    return () => clearInterval(interval)
  }, [loadOrders])

  const filteredOrders = orders.filter((o) => {
    if (filter === 'open') return o.status === 0
    if (filter === 'my') return account && o.maker.toLowerCase() === account.toLowerCase()
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            📊 Libro de Órdenes (P2P Exchange)
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Intercambios P2P en tiempo real sin intermediarios
          </p>
        </div>

        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => setFilter('open')}
            className={`px-3 py-1.5 rounded-md transition ${filter === 'open' ? 'bg-white dark:bg-zinc-700 font-bold shadow-sm' : 'text-gray-500'}`}
          >
            Abiertas ({orders.filter(o => o.status === 0).length})
          </button>
          <button
            onClick={() => setFilter('my')}
            className={`px-3 py-1.5 rounded-md transition ${filter === 'my' ? 'bg-white dark:bg-zinc-700 font-bold shadow-sm' : 'text-gray-500'}`}
          >
            Mis Órdenes
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md transition ${filter === 'all' ? 'bg-white dark:bg-zinc-700 font-bold shadow-sm' : 'text-gray-500'}`}
          >
            Todas ({orders.length})
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-xl dark:border-zinc-800 text-gray-500">
          No hay órdenes {filter === 'open' ? 'abiertas' : filter === 'my' ? 'propias' : ''} disponibles en este momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id.toString()} order={order} onRefresh={loadOrders} />
          ))}
        </div>
      )}
    </div>
  )
}
