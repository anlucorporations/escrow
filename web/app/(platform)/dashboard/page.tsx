'use client'

import { useUserRole, useRegistration } from '@/lib/hooks'
import { useEthereum } from '@/lib/ethereum'
import { IdentityStatusBanner } from '@/components/IdentityStatusBanner'
import Link from 'next/link'

export default function DashboardPage() {
  const { account, isConnected, connect } = useEthereum()
  const { username, isRegistered } = useRegistration()
  const role = useUserRole()

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

  // Velvety Style User Dashboard
  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <div className="container mx-auto px-6 max-w-6xl">
        
        {/* IDENTITY STATUS PROGRESSION BANNER */}
        <IdentityStatusBanner />

        {/* WELCOME HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 pb-8 border-b border-slate-200">
          <div>
            <span className="text-xs tracking-[0.2em] uppercase text-slate-400 font-medium block mb-2">Panel de Control</span>
            <h1 className="text-4xl md:text-5xl font-serif text-slate-900 leading-tight">
              Bienvenido, <span className="italic text-indigo-600">{isRegistered && username ? `@${username}` : 'Comerciante'}</span>
            </h1>
            <p className="text-slate-500 font-light mt-1 font-mono text-xs">
              {account}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase border border-slate-200 ${role.badgeBg} ${role.badgeText}`}>
              {role.roleLabel}
            </span>
          </div>
        </div>

        {/* METRICS CARD GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Truekes Activos', value: '3', desc: 'Esperando confirmación' },
            { label: 'Truekes Completados', value: '18', desc: 'Historial seguro' },
            { label: 'Nivel de Confianza', value: 'Plata', desc: 'Verificación básica' },
            { label: 'BRLT Balance', value: '12,500', desc: 'Moneda local' },
          ].map((metric, i) => (
            <div key={i} className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-900/5 transition-all duration-300">
              <span className="text-xs tracking-wider uppercase text-slate-400 font-medium block mb-4">{metric.label}</span>
              <div className="text-3xl font-serif text-slate-900 mb-2">{metric.value}</div>
              <p className="text-xs text-slate-500 font-light">{metric.desc}</p>
            </div>
          ))}
        </div>

        {/* QUICK ACTIONS & SECTIONS */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-2xl font-serif text-slate-900 mb-2">Acciones Rápidas</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { title: 'Nuevo Trueke', desc: 'Inicia un intercambio bilateral custodiado.', href: '/operations', cta: 'Iniciar' },
                { title: 'Publicar Producto', desc: 'Sube un bien o servicio a la colección.', href: '/items/new', cta: 'Publicar' },
              ].map((act, i) => (
                <div key={i} className="bg-indigo-50/50 rounded-[2rem] border border-slate-200/60 p-8 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-serif text-slate-900 mb-3">{act.title}</h3>
                    <p className="text-sm text-slate-500 font-light leading-relaxed mb-6">{act.desc}</p>
                  </div>
                  <Link
                    href={act.href}
                    className="w-full text-center py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-semibold tracking-wide uppercase transition-all"
                  >
                    {act.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-serif text-slate-900 mb-6">Explorar Suite</h2>
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 space-y-4 shadow-sm">
              {[
                { label: 'Colección de Artículos', href: '/items' },
                { label: 'Gestión de Truekes', href: '/operations' },
                { label: 'Mis Balances', href: '/balances' },
                { label: 'Reputación & Perfil', href: '/profile' },
                { label: 'Centro de Ayuda', href: '/help' },
              ].map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0 text-sm text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  <span>{item.label}</span>
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
