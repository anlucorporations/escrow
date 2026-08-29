'use client'

import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A2B4C] font-sans selection:bg-[#2A9D8F] selection:text-white">
      {/* Fondo Decorativo Suave */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#2A9D8F]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-[#48CAE4]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        {/* Header Branding */}
        <header className="pt-8 pb-12 flex justify-between items-center border-b border-slate-200/80">
          <BrandLogo variant="full" priority />

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-600 font-mono shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#2A9D8F] animate-pulse" />
              Red Local Anvil: 31337
            </div>
            <Link
              href="/items"
              className="btn-truekeat-primary px-5 py-2 text-xs uppercase tracking-wider"
            >
              Explorar Mercado
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-16 pb-20 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-[#2A9D8F]/30 text-[#2A9D8F] text-xs font-bold uppercase tracking-widest font-heading shadow-xs">
            🛡️ Custodia Atómica · Bienes RWA · Sin Comisiones de Gas
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight max-w-4xl mx-auto font-heading text-[#1A2B4C]">
            El Universo del Intercambio{' '}
            <span className="bg-gradient-to-r from-[#1A2B4C] via-[#2A9D8F] to-[#48CAE4] bg-clip-text text-transparent">
              Descentralizado y Seguro
            </span>
          </h1>

          <p className="text-slate-600 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed font-normal">
            Plataforma Web3 para el intercambio entre pares de criptoactivos, productos físicos tokenizados (RWA) y vouchers de servicios, respaldada por contratos inteligentes auditados y reputación on-chain.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/items"
              className="btn-truekeat-primary px-8 py-4 text-sm uppercase tracking-wider font-heading"
            >
              🚀 Comenzar a Truekear
            </Link>
            <Link
              href="/register"
              className="btn-gold-accent px-7 py-4 text-sm uppercase tracking-wider font-heading"
            >
              👤 Inscribir Billetera (@username)
            </Link>
          </div>
        </section>

        {/* Metrics Grid / Volumen & Comunidad */}
        <section className="py-12 border-y border-slate-200/80 bg-white/60 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs">
              <div className="text-3xl sm:text-4xl font-extrabold text-[#1A2B4C] font-heading">$2.8M+</div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1.5 font-heading">Volumen Custodiado</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs">
              <div className="text-3xl sm:text-4xl font-extrabold text-[#2A9D8F] font-heading">5,400+</div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1.5 font-heading">Usuarios Verificados</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs">
              <div className="text-3xl sm:text-4xl font-extrabold text-[#D4AF37] font-heading">19,200+</div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1.5 font-heading">Truekes Exitosos</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 font-heading">100%</div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1.5 font-heading">Seguridad Atómica</div>
            </div>
          </div>
        </section>

        {/* Ventajas de Seguridad */}
        <section className="py-20">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#1A2B4C] font-heading">
              Arquitectura de Confianza y Seguridad
            </h2>
            <p className="text-slate-500 text-sm">
              Diseño de contratos inteligentes bajo los estándares más estrictos de custodia blockchain.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="vault-card p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-[#2A9D8F]/30 text-[#2A9D8F] flex items-center justify-center text-2xl font-bold">
                🔒
              </div>
              <h3 className="text-lg font-bold text-[#1A2B4C] font-heading">Custodia Bilateral Atómica</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Los fondos y activos quedan bloqueados en `TruekeEscrow.sol` hasta que ambas partes validan la entrega presencial o digital.
              </p>
            </div>

            <div className="vault-card p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center text-2xl font-bold">
                🛡️
              </div>
              <h3 className="text-lg font-bold text-[#1A2B4C] font-heading">Identidad & Soulbound Tokens (SBT)</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Certificaciones intransferibles Nivel 3 en `TruekeSBT.sol` y registro de reputación en 5 dimensiones (Aceptación, Honestidad, Seguridad).
              </p>
            </div>

            <div className="vault-card p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-[#48CAE4]/30 text-[#48CAE4] flex items-center justify-center text-2xl font-bold">
                ⚡
              </div>
              <h3 className="text-lg font-bold text-[#1A2B4C] font-heading">Transacciones sin Gas (EIP-712)</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Firma intercambios desde tu móvil sin pagar comisiones de red mediante nuestro relayer de gas subvencionado por la tesorería.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
