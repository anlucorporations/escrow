'use client'

import { useState } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { UserRegistrationModal } from '@/components/UserRegistrationModal'
import { OrderBook } from '@/components/OrderBook'
import { CreateOperation } from '@/components/CreateOperation'
import { AddToken } from '@/components/AddToken'

export default function Home() {
  const { isConnected } = useEthereum()
  const [activeTab, setActiveTab] = useState<'trade' | 'create' | 'tokens'>('trade')

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-10 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
              🔒 Peer-to-Peer Decentralized Exchange
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              P2P Exchange Platform
            </h1>
            <p className="text-blue-100 text-sm mt-1 max-w-xl">
              Plataforma segura de intercambio de tokens entre usuarios registrados directamente en la blockchain sin custodios centralizados.
            </p>
          </div>

          <UserRegistrationModal />
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isConnected ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-2">Bienvenido al Exchange P2P</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-6 text-sm">
              Conecta tu wallet para inscribirte en la plataforma, publicar órdenes e intercambiar tokens de forma segura.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tabs Navigation */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setActiveTab('trade')}
                className={`pb-3 px-6 font-semibold text-sm transition border-b-2 ${
                  activeTab === 'trade'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                📊 Libro de Órdenes
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`pb-3 px-6 font-semibold text-sm transition border-b-2 ${
                  activeTab === 'create'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                ➕ Publicar Orden
              </button>
              <button
                onClick={() => setActiveTab('tokens')}
                className={`pb-3 px-6 font-semibold text-sm transition border-b-2 ${
                  activeTab === 'tokens'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                🪙 Tokens (Admin)
              </button>
            </div>

            {/* Tab Contents */}
            <div>
              {activeTab === 'trade' && <OrderBook />}
              {activeTab === 'create' && <CreateOperation />}
              {activeTab === 'tokens' && <AddToken />}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
