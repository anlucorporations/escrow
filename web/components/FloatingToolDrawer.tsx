'use client'

import { useState, useEffect, useCallback } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, EXCHANGE_ADDRESS, EXCHANGE_ABI, ERC20_ABI } from '@/lib/contracts'
import { ethers } from 'ethers'

interface FloatingToolDrawerProps {
  activeTab: 'trade' | 'create' | 'tokens'
  setActiveTab: (tab: 'trade' | 'create' | 'tokens') => void
  onRegistrationChange: () => void
}

interface TokenBalance {
  address: string
  symbol: string
  balance: string
}

interface OrderMetrics {
  activeOrdersCount: number
  completedCount: number
  disputedOrCancelledCount: number
  totalOrdersCount: number
}

export function FloatingToolDrawer({ activeTab, setActiveTab, onRegistrationChange }: FloatingToolDrawerProps) {
  const { account, isConnected, connect, disconnect, provider } = useEthereum()
  const [isOpen, setIsOpen] = useState(false)
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)
  const [username, setUsername] = useState('')
  const [currentUsername, setCurrentUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Metrics and Balances State
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([])
  const [metrics, setMetrics] = useState<OrderMetrics>({
    activeOrdersCount: 0,
    completedCount: 0,
    disputedOrCancelledCount: 0,
    totalOrdersCount: 0,
  })

  const checkRegistrationStatus = useCallback(async () => {
    if (!provider || !account) {
      setIsRegistered(false)
      setCurrentUsername('')
      return
    }
    try {
      const registryContract = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, provider)
      const registered: boolean = await registryContract.isRegistered(account)
      setIsRegistered(registered)

      if (registered) {
        const profile = await registryContract.getUserProfile(account)
        setCurrentUsername(profile.username)
      } else {
        setCurrentUsername('')
      }
      onRegistrationChange()
    } catch (err) {
      console.error('Error checking registration in drawer:', err)
      setIsRegistered(false)
    }
  }, [provider, account, onRegistrationChange])

  const loadMetricsAndBalances = useCallback(async () => {
    if (!provider || !account || !isRegistered) return

    try {
      const exchangeContract = new ethers.Contract(EXCHANGE_ADDRESS, EXCHANGE_ABI, provider)

      // 1. Fetch allowed tokens & balances
      let allowedTokens: string[] = []
      try {
        allowedTokens = await exchangeContract.getAllowedTokens()
      } catch {
        allowedTokens = []
      }

      const balances = await Promise.all(
        allowedTokens.map(async (addr: string) => {
          try {
            const tokenContract = new ethers.Contract(addr, ERC20_ABI, provider)
            const [sym, bal] = await Promise.all([
              tokenContract.symbol().catch(() => addr.slice(0, 6)),
              tokenContract.balanceOf(account).catch(() => BigInt(0)),
            ])
            return {
              address: addr,
              symbol: sym,
              balance: ethers.formatEther(bal),
            }
          } catch {
            return { address: addr, symbol: addr.slice(0, 6), balance: '0.0' }
          }
        })
      )
      setTokenBalances(balances)

      // 2. Fetch user's orders metrics
      let userOrders: any[] = []
      try {
        userOrders = await exchangeContract.getOrdersByMaker(account)
      } catch {
        userOrders = []
      }

      let activeCount = 0
      let completed = 0
      let cancelledOrDisputed = 0

      userOrders.forEach((o: any) => {
        const st = Number(o.status)
        if (st === 0) activeCount++
        else if (st === 1) completed++
        else if (st === 2) cancelledOrDisputed++
      })

      setMetrics({
        activeOrdersCount: activeCount,
        completedCount: completed,
        disputedOrCancelledCount: cancelledOrDisputed,
        totalOrdersCount: userOrders.length,
      })
    } catch (err) {
      console.error('Error loading drawer metrics:', err)
    }
  }, [provider, account, isRegistered])

  useEffect(() => {
    checkRegistrationStatus()
  }, [checkRegistrationStatus])

  useEffect(() => {
    if (isOpen && isRegistered) {
      loadMetricsAndBalances()
      const interval = setInterval(loadMetricsAndBalances, 5000)
      return () => clearInterval(interval)
    }
  }, [isOpen, isRegistered, loadMetricsAndBalances])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!provider || !username.trim()) return

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const signer = await provider.getSigner()
      const registryContract = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, signer)
      const tx = await registryContract.registerUser(username.trim())
      await tx.wait()

      setSuccess(true)
      await checkRegistrationStatus()
      setTimeout(() => {
        setSuccess(false)
        setIsOpen(false)
      }, 1500)
    } catch (err: any) {
      console.error('Registration error:', err)
      let msg = err.reason || err.message || 'Error en la transacción'
      if (msg.includes('Failed to fetch') || msg.includes('-32603') || msg.includes('coalesce')) {
        msg = 'Error de conexión RPC en MetaMask. Asegúrate de tener seleccionada la red Local Anvil (http://127.0.0.1:8545 - Chain ID 31337). Si el error persiste, en MetaMask ve a Ajustes ➔ Avanzado ➔ "Borrar datos de la actividad de la cuenta".'
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Popover Tool Drawer Window */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 rounded-2xl bg-zinc-900 border border-zinc-800 text-white shadow-2xl p-5 backdrop-blur-xl animate-fade-in space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm">
              <span className="text-xl">🧰</span> Cajón de Herramientas P2P
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded bg-zinc-800"
            >
              ✕
            </button>
          </div>

          {/* Section 1: Wallet Connection */}
          {!isConnected ? (
            <div className="space-y-3 py-2 text-center">
              <p className="text-xs text-zinc-400">
                Conecta tu wallet Web3 para acceder a la plataforma o inscribirte en la blockchain.
              </p>
              <button
                onClick={() => {
                  connect()
                }}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg transition"
              >
                🔌 Conectar Wallet
              </button>
            </div>
          ) : isRegistered === false ? (
            /* Section 2: Registration Form */
            <div className="space-y-3 py-1">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                <span className="font-bold">⚠️ Wallet no inscrita:</span> Inscribe tu wallet asignando un usuario único en la blockchain para habilitar el trading.
              </div>

              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Usuario / Alias On-Chain
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ej. @satoshi_nakamoto"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    minLength={3}
                    maxLength={20}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow transition disabled:bg-gray-500"
                >
                  {loading ? 'Asentando en Blockchain...' : '✍️ Inscribir Wallet On-Chain'}
                </button>
              </form>

              {success && (
                <div className="text-xs text-emerald-400 font-semibold text-center">
                  ¡Inscripción confirmada en la blockchain!
                </div>
              )}
              {error && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium leading-relaxed">
                  {error}
                </div>
              )}

              <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-500 font-mono">
                <span className="truncate max-w-[200px]">{account}</span>
                <button onClick={disconnect} className="text-red-400 hover:underline">
                  Desconectar
                </button>
              </div>
            </div>
          ) : (
            /* Section 3: Registered Trader Metrics & Tools */
            <div className="space-y-4 py-1">
              {/* Profile Badge */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block">Trader Inscrito</span>
                  <span className="font-bold text-sm text-emerald-300">@{currentUsername}</span>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              {/* Indicador de Operaciones: Concretadas Felizmente vs En Disputa / Canceladas */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  📈 Indicador de Operaciones
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-[10px] text-emerald-400 uppercase block font-semibold">Concretadas</span>
                    <span className="text-lg font-bold text-emerald-300">{metrics.completedCount}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                    <span className="text-[10px] text-red-400 uppercase block font-semibold">En Disputa / Canc.</span>
                    <span className="text-lg font-bold text-red-300">{metrics.disputedOrCancelledCount}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex justify-between items-center text-xs">
                  <span className="text-blue-300 font-medium">⏳ Operaciones Activas:</span>
                  <span className="font-bold text-blue-400">{metrics.activeOrdersCount} abiertas</span>
                </div>
              </div>

              {/* Balances de Todos los Tokens */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  🪙 Balances de Tokens (Wallet)
                </span>
                {tokenBalances.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No hay tokens cargados.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {tokenBalances.map((tb) => (
                      <div
                        key={tb.address}
                        className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 flex justify-between items-center text-xs"
                      >
                        <span className="font-semibold text-zinc-300">{tb.symbol}</span>
                        <span className="font-mono font-bold text-white">{parseFloat(tb.balance).toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Navegación del Exchange */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Navegación</span>
                <button
                  onClick={() => {
                    setActiveTab('trade')
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                    activeTab === 'trade' ? 'bg-blue-600 text-white' : 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <span>📊 Libro de Órdenes P2P</span>
                  <span>➔</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('create')
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                    activeTab === 'create' ? 'bg-blue-600 text-white' : 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <span>➕ Publicar Nueva Orden</span>
                  <span>➔</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('tokens')
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                    activeTab === 'tokens' ? 'bg-blue-600 text-white' : 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <span>🪙 Tokens Autorizados (Admin)</span>
                  <span>➔</span>
                </button>
              </div>

              <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-500 font-mono">
                <span className="truncate max-w-[200px]">{account}</span>
                <button onClick={disconnect} className="text-red-400 hover:underline">
                  Salir
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Floating Tool Box Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 px-5 py-3.5 rounded-full text-sm font-extrabold shadow-2xl transition-all duration-300 border backdrop-blur-md hover:scale-105 active:scale-95 ${
          !isConnected
            ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-400/30 shadow-blue-500/30'
            : isRegistered === false
            ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-400/30 shadow-amber-500/30 animate-bounce'
            : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-700 shadow-purple-500/20'
        }`}
      >
        <span className="text-lg">🧰</span>
        {!isConnected ? (
          <span>Conectar Wallet</span>
        ) : isRegistered === false ? (
          <span>Inscribirse en Exchange</span>
        ) : (
          <span>Trader @{currentUsername || 'Inscrito'}</span>
        )}
      </button>
    </div>
  )
}
