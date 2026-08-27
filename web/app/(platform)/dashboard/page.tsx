'use client'

import { useUserRole, useRegistration, useReputation, useTradeQuota } from '@/lib/hooks'
import { useEthereum } from '@/lib/ethereum'
import { IdentityStatusBanner } from '@/components/IdentityStatusBanner'
import { ReputationBadge } from '@/components/ReputationBadge'
import Link from 'next/link'

export default function DashboardPage() {
  const { account, isConnected, connect } = useEthereum()
  const { username, isRegistered } = useRegistration()
  const role = useUserRole()
  const rep = useReputation(account || undefined)
  const quota = useTradeQuota(account || undefined)

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background pt-28 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-[2rem] border border-slate-200 p-10 text-center shadow-2xl shadow-indigo-900/5">
          <h1 className="text-3xl font-serif text-slate-900 mb-4">Acceso a la Suite</h1>
          <p className="text-slate-500 font-light mb-8">
            Conecta tu billetera Web3 para gestionar tus truekes y catálogo digital.
          </p>
          <button
            onClick={connect}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-semibold tracking-wide uppercase transition-all"
          >
            Conectar Billetera
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* IDENTITY STATUS PROGRESSION BANNER */}
        <IdentityStatusBanner />

        {/* WELCOME HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 pb-8 border-b border-slate-200">
          <div>
            <span className="text-xs tracking-[0.2em] uppercase text-slate-400 font-medium block mb-2">
              Panel de Control
            </span>
            <h1 className="text-4xl md:text-5xl font-serif text-slate-900 leading-tight flex items-center flex-wrap gap-3">
              Bienvenido,{' '}
              <span className="italic text-indigo-600">
                {isRegistered && username ? `@${username}` : 'Usuario'}
              </span>
            </h1>
            <p className="text-slate-500 font-light mt-1 font-mono text-xs">{account}</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase border border-slate-200 ${role.badgeBg} ${role.badgeText}`}
            >
              {role.roleLabel}
            </span>
            <ReputationBadge showDetails />
          </div>
        </div>

        {/* METRICS CARD GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-900/5 transition-all duration-300">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-medium block mb-4">
              Capacidad de Truekes
            </span>
            <div className="text-3xl font-serif text-slate-900 mb-2">
              {quota.activeTrades} / {quota.isUnlimited ? '∞' : quota.limit}
            </div>
            <p className="text-xs text-slate-500 font-light">
              {quota.isUnlimited ? 'Ilimitados (Certificado)' : `Nivel ${quota.levelName}`}
            </p>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-900/5 transition-all duration-300">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-medium block mb-4">
              Truekes Completados
            </span>
            <div className="text-3xl font-serif text-slate-900 mb-2">{rep.completed}</div>
            <p className="text-xs text-slate-500 font-light">Transacciones efectivas</p>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-900/5 transition-all duration-300">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-medium block mb-4">
              Efectividad Comercial
            </span>
            <div className="text-3xl font-serif text-slate-900 mb-2 text-emerald-600">
              {rep.effectiveness}%
            </div>
            <p className="text-xs text-slate-500 font-light">{rep.lost} disputas perdidas</p>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-900/5 transition-all duration-300">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-medium block mb-4">
              Rango de Reputación
            </span>
            <div className="text-3xl font-serif text-slate-900 mb-2">{rep.rankName}</div>
            <p className="text-xs text-slate-500 font-light">
              {rep.isOro ? 'Máximo Rango Oro (Apto Empresa)' : rep.isPlata ? 'Rango Plata (Frecuente)' : 'Rango Bronce (Iniciado)'}
            </p>
          </div>
        </div>

        {/* ACCIONES Y SUITES */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-2xl font-serif text-slate-900 mb-2">Acciones Rápidas</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-indigo-50/50 rounded-[2rem] border border-slate-200/60 p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-serif text-slate-900 mb-3">Catálogo de Intercambio</h3>
                  <p className="text-sm text-slate-500 font-light leading-relaxed mb-6">
                    Explora y propón truekes con custodia bilateral inteligente.
                  </p>
                </div>
                <Link
                  href="/items"
                  className="w-full text-center py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-semibold tracking-wide uppercase transition-all"
                >
                  Ver Catálogo
                </Link>
              </div>

              <div className="bg-purple-50/50 rounded-[2rem] border border-slate-200/60 p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-serif text-slate-900 mb-3">Mis Truekes Activos</h3>
                  <p className="text-sm text-slate-500 font-light leading-relaxed mb-6">
                    Administra tus contratos de intercambio, entregas y disputas.
                  </p>
                </div>
                <Link
                  href="/operations"
                  className="w-full text-center py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-semibold tracking-wide uppercase transition-all"
                >
                  Ver Operaciones
                </Link>
              </div>
            </div>

            {/* SECCIÓN ESPECIALIZADA PARA EMPRESAS */}
            {role.isBusiness && (
              <div className="mt-8 pt-8 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🏢</span>
                  <h3 className="text-xl font-serif text-slate-900">Suite Exclusiva para Empresas</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="bg-amber-50/60 rounded-[2rem] border border-amber-200/70 p-6 flex flex-col justify-between">
                    <div>
                      <h4 className="text-base font-bold text-amber-900 mb-1">Inventario & Tiendas</h4>
                      <p className="text-xs text-amber-800/80 mb-4 font-light">
                        Gestión masiva de artículos y locales comerciales de encuentro físico.
                      </p>
                    </div>
                    <Link
                      href="/company/inventory"
                      className="text-center py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-xs font-semibold uppercase tracking-wider"
                    >
                      Gestionar Inventario →
                    </Link>
                  </div>

                  <div className="bg-amber-50/60 rounded-[2rem] border border-amber-200/70 p-6 flex flex-col justify-between">
                    <div>
                      <h4 className="text-base font-bold text-amber-900 mb-1">Finanzas Comerciales</h4>
                      <p className="text-xs text-amber-800/80 mb-4 font-light">
                        Flujo de caja en USDT, BRLT y pagos procesados de clientes.
                      </p>
                    </div>
                    <Link
                      href="/company/finances"
                      className="text-center py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-xs font-semibold uppercase tracking-wider"
                    >
                      Ver Finanzas →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* SECCIÓN ESPECIALIZADA PARA SOCIOS */}
            {role.isSocio && (
              <div className="mt-8 pt-8 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">⚖️</span>
                  <h3 className="text-xl font-serif text-slate-900">Suite de Gobernanza & Socios</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="bg-purple-50/60 rounded-[2rem] border border-purple-200/70 p-6 flex flex-col justify-between">
                    <div>
                      <h4 className="text-base font-bold text-purple-900 mb-1">Votación de Nuevos Socios</h4>
                      <p className="text-xs text-purple-800/80 mb-4 font-light">
                        Revisa solicitudes de admisión y vota por mayoría simple (ventana de 5 días).
                      </p>
                    </div>
                    <Link
                      href="/governance/socio-voting"
                      className="text-center py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-full text-xs font-semibold uppercase tracking-wider"
                    >
                      Revisar Votaciones →
                    </Link>
                  </div>

                  <div className="bg-purple-50/60 rounded-[2rem] border border-purple-200/70 p-6 flex flex-col justify-between">
                    <div>
                      <h4 className="text-base font-bold text-purple-900 mb-1">Finanzas Globales & Gas</h4>
                      <p className="text-xs text-purple-800/80 mb-4 font-light">
                        Gastos operativos, fondo de tesorería y reembolsos de gas relayer.
                      </p>
                    </div>
                    <Link
                      href="/governance/treasury"
                      className="text-center py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-full text-xs font-semibold uppercase tracking-wider"
                    >
                      Ver Tesorería →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SIDEBAR DE ENLACES */}
          <div>
            <h2 className="text-2xl font-serif text-slate-900 mb-6">Explorar Suite</h2>
            <div className="bg-white rounded-[2rem] border border-slate-200 p-6 space-y-4">
              <Link
                href="/identity"
                className="block p-4 rounded-xl hover:bg-slate-50 border border-slate-100 transition-all"
              >
                <span className="text-xs font-bold text-indigo-600 block mb-1">🛡️ Identidad Web3</span>
                <p className="text-xs text-slate-500 font-light">
                  Avanza a Verificado (2FA) o Certificado (SBT).
                </p>
              </Link>

              <Link
                href="/profile"
                className="block p-4 rounded-xl hover:bg-slate-50 border border-slate-100 transition-all"
              >
                <span className="text-xs font-bold text-slate-900 block mb-1">📍 Mi Perfil & GPS</span>
                <p className="text-xs text-slate-500 font-light">
                  Gestiona tus coordenadas UTM y puntos de encuentro.
                </p>
              </Link>

              <Link
                href="/balances"
                className="block p-4 rounded-xl hover:bg-slate-50 border border-slate-100 transition-all"
              >
                <span className="text-xs font-bold text-slate-900 block mb-1">💰 Billetera & Saldos</span>
                <p className="text-xs text-slate-500 font-light">
                  Revisa saldos en TKA, TKB, USDT y BRLT.
                </p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
