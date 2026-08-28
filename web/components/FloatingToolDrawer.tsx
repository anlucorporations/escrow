'use client'

import { useState, useEffect, useCallback } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, EXCHANGE_ADDRESS, EXCHANGE_ABI, ERC20_ABI } from '@/lib/contracts'
import { ethers } from 'ethers'

interface FloatingToolDrawerProps {
  activeTab?: 'trade' | 'create' | 'tokens'
  setActiveTab?: (tab: 'trade' | 'create' | 'tokens') => void
  onRegistrationChange: () => void
}

interface TokenBalance {
  address: string
  symbol: string
  decimals: number
  balance: string
}

interface OrderMetrics {
  activeOrdersCount: number
  completedCount: number
  disputedOrCancelledCount: number
  totalOrdersCount: number
}

interface UserProfileData {
  wallet: string
  username: string
  registeredAt: string
}

export function FloatingToolDrawer({ onRegistrationChange }: FloatingToolDrawerProps) {
  const { account, isConnected, connect, disconnect, provider } = useEthereum()
  const [isOpen, setIsOpen] = useState(false)
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)
  const [usernameInput, setUsernameInput] = useState('')
  const [profileData, setProfileData] = useState<UserProfileData | null>(null)
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
      setProfileData(null)
      return
    }
    try {
      const registryContract = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, provider)
      const registered: boolean = await registryContract.isRegistered(account)
      setIsRegistered(registered)

      if (registered) {
        const profile = await registryContract.getUserProfile(account)
        const dateStr = profile.registeredAt && profile.registeredAt > BigInt(0)
          ? new Date(Number(profile.registeredAt) * 1000).toLocaleDateString()
          : 'Hoy'

        setProfileData({
          wallet: profile.wallet,
          username: profile.username,
          registeredAt: dateStr,
        })
      } else {
        setProfileData(null)
      }
      onRegistrationChange()
    } catch (err) {
      console.error('Error checking registration in drawer:', err)
      setIsRegistered(false)
    }
  }, [provider, account, onRegistrationChange])

  const loadMetricsAndBalances = useCallback(async () => {
    if (!provider || !account || !isRegistered || !EXCHANGE_ADDRESS) return

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
            const [sym, bal, dec] = await Promise.all([
              tokenContract.symbol().catch(() => addr.slice(0, 6)),
              tokenContract.balanceOf(account).catch(() => BigInt(0)),
              tokenContract.decimals().catch(() => 18n),
            ])
            return {
              address: addr,
              symbol: sym,
              decimals: Number(dec),
              balance: ethers.formatUnits(bal, Number(dec)),
            }
          } catch {
            return { address: addr, symbol: addr.slice(0, 6), decimals: 18, balance: '0.0' }
          }
        })
      )
      setTokenBalances(balances)

      // 2. Fetch user's orders metrics
      interface RawOrderRow {
        status: bigint | number | string
      }
      let userOrders: RawOrderRow[] = []
      try {
        userOrders = await exchangeContract.getOrdersByMaker(account)
      } catch {
        userOrders = []
      }

      let activeCount = 0
      let completed = 0
      let cancelledOrDisputed = 0

      userOrders.forEach((o) => {
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
    if (!provider || !usernameInput.trim()) return

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const signer = await provider.getSigner()
      const registryContract = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, signer)
      // El registro on-chain requiere 8 parámetros (username, email, phone, dirección,
      // coordenadas UTM). Con solo el alias, se usan valores por defecto locales.
      const uname = usernameInput.trim()
      const tx = await registryContract.register(
        uname,
        `${uname.toLowerCase()}@truekeate.com`,
        '+584120000000',
        'Barlovento, Miranda, Venezuela',
        729450,
        1159800,
        19,
        true
      )
      await tx.wait()

      setSuccess(true)
      await checkRegistrationStatus()
      setTimeout(() => {
        setSuccess(false)
        setIsOpen(false)
      }, 1500)
    } catch (err) {
      console.error('Registration error:', err)
      const e = err as { reason?: string; message?: string }
      let msg = e.reason || e.message || 'Error en la transacción'
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
          {/* Drawer Top Header with @username */}
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm">
              <span className="text-lg">🧰</span>
              <div>
                <span className="block text-xs font-bold text-white">Cajón de Herramientas</span>
                {profileData?.username && (
                  <span className="block text-[11px] text-emerald-400 font-mono font-bold">
                    @{profileData.username}
                  </span>
                )}
              </div>
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
              <div className="p-3 rounded-xl bg-amber-900/30 border border-amber-700/50 text-amber-300 text-xs">
                <span className="font-bold">⚠️ Wallet no inscrita:</span> Inscribe tu wallet asignando un usuario único en la blockchain para habilitar el trading.
              </div>

              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Usuario / Alias On-Chain
                  </label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
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
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow transition disabled:bg-gray-500"
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
            /* Section 3: Registered Trader Metrics & User Profile Section */
            <div className="space-y-4 py-1">
              {/* Indicador de Operaciones */}
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
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
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

              {/* Perfil de Usuario On-Chain */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  👤 Perfil de Usuario Registrado
                </span>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 font-medium">Usuario / Alias:</span>
                    <span className="font-bold text-emerald-400 font-mono">@{profileData?.username}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 font-medium">Estado On-Chain:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]">
                      ✓ Verificado
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 font-medium">Fecha de Registro:</span>
                    <span className="font-mono text-zinc-300">{profileData?.registeredAt}</span>
                  </div>

                  <div className="pt-1.5 border-t border-zinc-900 flex flex-col gap-0.5">
                    <span className="text-[10px] text-zinc-500 font-medium">Dirección de Wallet:</span>
                    <span className="font-mono text-[10px] text-zinc-400 truncate">{account}</span>
                  </div>
                </div>
              </div>

              {/* Disconnect Button */}
              <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-mono text-[11px]">Red Local Anvil</span>
                <button onClick={disconnect} className="text-red-400 hover:underline font-semibold">
                  Desconectar Wallet
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Floating Tool Box Trigger Button (Muestra únicamente el icono cuando el cajón está cerrado) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={!isConnected ? "Conectar Wallet" : isRegistered === false ? "Inscribirse en Exchange" : `@${profileData?.username || 'Trader'}`}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 border backdrop-blur-md hover:scale-110 active:scale-95 ${
          !isConnected
            ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-400/30 shadow-blue-500/30'
            : isRegistered === false
            ? 'bg-amber-950/90 hover:bg-amber-900 text-amber-200 border-amber-700/60 shadow-amber-900/40 animate-pulse'
            : 'bg-zinc-950/90 hover:bg-zinc-900 text-white border-emerald-500/40 shadow-emerald-500/20'
        }`}
      >
        {!isConnected ? (
          <span className="text-2xl">🔌</span>
        ) : isRegistered === false ? (
          /* Estado 2: Billetera en marrón/amber con símbolo de aprobado (✓) */
          <div className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-amber-900/60 border border-amber-600/50 text-amber-400 shadow-inner">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[10px] font-extrabold text-amber-950 shadow">✓</span>
          </div>
        ) : (
          /* Estado 1: Escudo verde con símbolo de conexión (⚡) en su interior */
          <div className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 shadow-inner">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full ring-2 ring-zinc-950 flex items-center justify-center text-[9px] font-black text-zinc-950">⚡</span>
          </div>
        )}
      </button>
    </div>
  )
}
