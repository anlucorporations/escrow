'use client'

import { OrderBook } from '@/components/OrderBook'

interface ExchangePlatformProps {
  activeTab: 'trade' | 'create' | 'tokens'
  setActiveTab: (tab: 'trade' | 'create' | 'tokens') => void
  currentUsername: string
}

export function ExchangePlatform({ activeTab, setActiveTab, currentUsername }: ExchangePlatformProps) {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2D2A26] font-sans pb-32">
      {/* Platform Top Header */}
      <header className="border-b border-[#D4A373]/20 bg-[#FAF8F5]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#D4A373] flex items-center justify-center font-bold text-[#2D2A26] text-sm">
              TK
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#2D2A26] font-serif">TrueKeate DEX</h1>
              <p className="text-xs text-[#2D2A26]/70">P2P Decentralized Asset Swap</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2 bg-[#2D2A26]/5 px-3 py-1.5 rounded-full border border-[#D4A373]/30">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-mono font-medium text-[#2D2A26]">
                {currentUsername ? `@${currentUsername}` : 'Conectado'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#D4A373]/20 space-x-8">
          <button
            onClick={() => setActiveTab('trade')}
            className={`pb-4 text-sm font-medium transition-colors relative ${
              activeTab === 'trade'
                ? 'text-[#D4A373] border-b-2 border-[#D4A373] font-semibold'
                : 'text-[#2D2A26]/60 hover:text-[#2D2A26]'
            }`}
          >
            Libro de Órdenes
          </button>
        </div>

        {/* Dynamic Content */}
        <div>
          <OrderBook />
        </div>
      </main>
    </div>
  )
}
