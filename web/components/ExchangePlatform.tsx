'use client'

import { OrderBook } from '@/components/OrderBook'
import { CreateOperation } from '@/components/CreateOperation'
import { AddToken } from '@/components/AddToken'

interface ExchangePlatformProps {
  activeTab: 'trade' | 'create' | 'tokens'
  setActiveTab: (tab: 'trade' | 'create' | 'tokens') => void
  currentUsername: string
}

export function ExchangePlatform({ activeTab, setActiveTab, currentUsername }: ExchangePlatformProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-32">
      {/* Platform Top Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
              X
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-white">
                P2P EXCHANGE PLATFORM
              </h1>
              <span className="text-[10px] text-zinc-400 font-mono">Acceso Concedido: Trader Verificado On-Chain</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              @{currentUsername || 'Trader'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container & Navigation Tabs */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-900 overflow-x-auto">
          <button
            onClick={() => setActiveTab('trade')}
            className={`pb-3 px-6 font-bold text-sm transition border-b-2 whitespace-nowrap ${
              activeTab === 'trade'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            📊 Libro de Órdenes P2P
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`pb-3 px-6 font-bold text-sm transition border-b-2 whitespace-nowrap ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            ➕ Publicar Orden
          </button>

          <button
            onClick={() => setActiveTab('tokens')}
            className={`pb-3 px-6 font-bold text-sm transition border-b-2 whitespace-nowrap ${
              activeTab === 'tokens'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            🪙 Administrar Tokens
          </button>
        </div>

        {/* Tab View Contents */}
        <div>
          {activeTab === 'trade' && <OrderBook />}
          {activeTab === 'create' && <CreateOperation />}
          {activeTab === 'tokens' && <AddToken />}
        </div>
      </main>
    </div>
  )
}
