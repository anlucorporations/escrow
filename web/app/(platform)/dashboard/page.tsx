'use client'

import { useUserRole, useRegistration, useReputation, useTradeQuota } from '@/lib/hooks'
import { useEthereum } from '@/lib/ethereum'
import { IdentityStatusBanner } from '@/components/IdentityStatusBanner'
import { ReputationBadge } from '@/components/ReputationBadge'
import { BrandLogo } from '@/components/BrandLogo'
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
        <div className="max-w-md w-full bg-white rounded-[2.5rem] border border-slate-200 p-10 text-center shadow-2xl shadow-[#0A1128]/5 flex flex-col items-center">
          <BrandLogo variant="isotype" width={64} className="mb-6" />
          <h1 className="text-3xl font-serif text-[#0A1128] mb-3">Acceso a la Suite</h1>
          <p className="text-slate-500 font-light text-sm mb-8">
            Conecta tu billetera Web3 para gestionar tus contratos de trueque y catálogo digital.
          </p>
          <button
            onClick={connect}
            className="w-full py-4 bg-gradient-to-r from-[#00E5FF] to-[#00B4D8] hover:from-[#00B4D8] text-[#0A1128] font-bold rounded-full text-xs uppercase tracking-wider transition-all shadow-md shadow-[#00E5FF]/20"
          >
            Conectar Wallet
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-28 pb-24">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* IDENTITY STATUS PROGRESSION BANNER */}
        <IdentityStatusBanner />

        {/* WELCOME HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 pb-8 border-b border-slate-200">
          <div>
            <span className="text-xs tracking-[0.2em] uppercase text-cyan-600 font-semibold block mb-2">
              Panel de Control · Protocolo TrueKeate
            </span>
            <h1 className="text-4xl md:text-5xl font-serif text-[#0A1128] leading-tight flex items-center flex-wrap gap-3">
              Bienvenido,{' '}
              <span className="italic text-cyan-600">
                {isRegistered && username ? `@${username}` : 'Usuario'}
              </span>
            </h1>
            <p className="text-slate-400 font-mono text-xs mt-1">{account}</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase border border-slate-200 shadow-xs ${role.badgeBg} ${role.badgeText}`}
            >
              {role.roleLabel}
            </span>
            <ReputationBadge showDetails />
          </div>
        </div>

        {/* METRICS CARD GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-[2rem] border border-slate-200/80 p-8 shadow-xs hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-bold block mb-4">
              Capacidad de Truekes
            </span>
            <div className="text-3xl font-serif font-extrabold text-[#0A1128] mb-2">
              {quota.activeTrades} / {quota.isUnlimited ? '∞' : quota.limit}
            </div>
            <p className="text-xs text-slate-500 font-light">
              {quota.isUnlimited ? 'Ilimitados (Certificado)' : `Nivel ${quota.levelName}`}
            </p>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200/80 p-8 shadow-xs hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-bold block mb-4">
              Truekes Completados
            </span>
            <div className="text-3xl font-serif font-extrabold text-[#0A1128] mb-2">{rep.completed}</div>
            <p className="text-xs text-slate-500 font-light">Transacciones efectivas</p>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200/80 p-8 shadow-xs hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-bold block mb-4">
              Efectividad Comercial
            </span>
            <div className="text-3xl font-serif font-extrabold text-emerald-600 mb-2">
              {rep.effectiveness}%
            </div>
            <p className="text-xs text-slate-500 font-light">{rep.lost} disputas perdidas</p>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200/80 p-8 shadow-xs hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-bold block mb-4">
              Rango de Reputación
            </span>
            <div className="text-3xl font-serif font-extrabold text-amber-500 mb-2">{rep.rankName}</div>
            <p className="text-xs text-slate-500 font-light">
              {rep.isOro ? 'Máximo Rango Oro (Apto Empresa)' : rep.isPlata ? 'Rango Plata (Frecuente)' : 'Rango Bronce (Iniciado)'}
            </p>
          </div>
        </div>

        {/* ACCIONES Y SUITES */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-serif text-[#0A1128]">Bóveda de Acciones</h2>
              <Link
                href="/items/new"
                className="px-5 py-2.5 bg-[#0A1128] hover:bg-[#1C2541] text-[#00E5FF] font-bold rounded-full text-xs uppercase tracking-wider transition shadow-sm"
              >
                + Acuñar Activo (Mint)
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white rounded-[2rem] border border-slate-200 p-8 flex flex-col justify-between shadow-xs hover:shadow-lg transition">
                <div>
                  <h3 className="text-xl font-serif font-bold text-[#0A1128] mb-2">Catálogo de Intercambio</h3>
                  <p className="text-xs text-slate-500 font-light leading-relaxed mb-6">
                    Explora y propón truekes con custodia bilateral inteligente y metadatos verificados.
                  </p>
                </div>
                <Link
                  href="/items"
                  className="w-full text-center py-3 bg-[#0A1128] hover:bg-[#1C2541] text-white rounded-full text-xs font-bold uppercase tracking-wider transition"
                >
                  Explorar Catálogo
                </Link>
              </div>

              <div className="bg-white rounded-[2rem] border border-slate-200 p-8 flex flex-col justify-between shadow-xs hover:shadow-lg transition">
                <div>
                  <h3 className="text-xl font-serif font-bold text-[#0A1128] mb-2">Mis Truekes Activos</h3>
                  <p className="text-xs text-slate-500 font-light leading-relaxed mb-6">
                    Administra tus contratos de intercambio, puntos de encuentro GPS y firmas sin gas.
                  </p>
                </div>
                <Link
                  href="/operations"
                  className="w-full text-center py-3 bg-gradient-to-r from-[#00E5FF] to-[#00B4D8] hover:from-[#00B4D8] text-[#0A1128] rounded-full text-xs font-bold uppercase tracking-wider transition shadow-sm"
                >
                  Ver Sala de Operaciones
                </Link>
              </div>
            </div>

            {/* SECCIÓN ESPECIALIZADA PARA EMPRESAS */}
            {role.isBusiness && (
              <div className="mt-8 pt-8 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🏢</span>
                  <h3 className="text-xl font-serif text-[#0A1128]">Suite Exclusiva para Empresas</h3>
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
                  <h3 className="text-xl font-serif text-[#0A1128]">Suite de Gobernanza & Socios</h3>
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
                      Entrar a Votaciones →
                    </Link>
                  </div>

                  <div className="bg-purple-50/60 rounded-[2rem] border border-purple-200/70 p-6 flex flex-col justify-between">
                    <div>
                      <h4 className="text-base font-bold text-purple-900 mb-1">Tesorería de la Plataforma</h4>
                      <p className="text-xs text-purple-800/80 mb-4 font-light">
                        Supervisión de fondos recolectados para gastos de operación.
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

          {/* COLUMNA LATERAL: BILLETERA Y REPUTACIÓN */}
          <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm space-y-6">
              <h3 className="text-lg font-serif font-bold text-[#0A1128]">Bóveda de Billetera</h3>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Dirección Conectada
                </span>
                <p className="font-mono text-xs text-slate-800 font-semibold break-all">{account}</p>
              </div>

              <div className="space-y-3 pt-2">
                <Link
                  href="/balances"
                  className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl text-xs uppercase tracking-wider transition flex items-center justify-between"
                >
                  <span>💰 Balances de Tokens</span>
                  <span>→</span>
                </Link>
                <Link
                  href="/identity"
                  className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl text-xs uppercase tracking-wider transition flex items-center justify-between"
                >
                  <span>🆔 Identidad & SBT N3</span>
                  <span>→</span>
                </Link>
                <Link
                  href="/profile"
                  className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl text-xs uppercase tracking-wider transition flex items-center justify-between"
                >
                  <span>⭐ Perfil & Reputación</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
