'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useEthereum } from '@/lib/ethereum'
import { useRegistration } from '@/lib/hooks'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'

export default function TrueKeateLandingPage() {
  const { isConnected, connect } = useEthereum()
  const { isRegistered } = useRegistration()
  const router = useRouter()

  // Redirigir automáticamente a la sección de Catálogo (/items) al conectar e inscribir la billetera
  useEffect(() => {
    if (isConnected && isRegistered) {
      router.push('/items')
    }
  }, [isConnected, isRegistered, router])

  const handleCta = async () => {
    if (!isConnected) {
      await connect()
    } else if (!isRegistered) {
      router.push('/register')
    } else {
      router.push('/items')
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans text-navy-800 selection:bg-teal-500/20 selection:text-teal-600">
      {/* HERO — Bóveda Digital */}
      <section className="relative pt-24 pb-32 overflow-hidden flex flex-col items-center text-center px-4">
        {/* Fondo decorativo con gradientes de identidad */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] rounded-full bg-teal-500/15 blur-3xl mix-blend-multiply"></div>
          <div className="absolute top-[20%] -left-[10%] w-[400px] h-[400px] rounded-full bg-gold-500/15 blur-3xl mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-navy-900/5 to-transparent"></div>
        </div>

        {/* Isotipo 3D Hexagonal con Glow Teal-Gold */}
        <div className="mb-8 relative group">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden shadow-2xl shadow-teal-500/25 border-2 border-navy-800/20 bg-white p-1 relative transform group-hover:scale-105 transition-all duration-300">
            <Image
              src="/images/truekeate-logo.jpg"
              alt="TrueKeate Isotipo Oficial"
              fill
              priority
              className="object-cover object-top scale-[1.75]"
            />
          </div>
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-teal-500/25 to-gold-500/25 blur-lg -z-10 group-hover:opacity-100 transition-opacity"></div>
        </div>

        <span className="text-xs tracking-[0.2em] uppercase text-teal-600 mb-4 font-bold">
          Bóveda P2P · El Universo del Intercambio Descentralizado
        </span>

        <h1 className="text-5xl md:text-7xl font-heading font-extrabold text-navy-900 mb-8 max-w-4xl leading-tight tracking-tight">
          El arte del intercambio{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-400">digital y consciente.</span>
        </h1>

        <p className="max-w-2xl text-lg text-slate-600 mb-12 font-light leading-relaxed">
          Custodia atómica, bienes RWA y reputación comunitaria en una plataforma de intercambio entre pares respaldada por smart contracts. Sin intermediarios ocultos.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <button
            onClick={handleCta}
            className="btn-truekeat-primary px-10 py-4 text-white text-sm tracking-wide uppercase shadow-xl shadow-teal-500/25"
          >
            {isConnected ? (isRegistered ? 'Ir al Catálogo' : 'Registrar Billetera') : 'Conectar Billetera'}
          </button>
          <Link
            href="/items"
            className="btn-truekeat-secondary px-10 py-4 text-sm tracking-wide uppercase"
          >
            Explorar Catálogo
          </Link>
        </div>
      </section>

      {/* TRES PILARES DE CONFIANZA */}
      <section id="pilares" className="py-24 bg-white border-y border-slate-100 scroll-mt-20">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-heading font-bold text-navy-900 mb-4">Los Tres Pilares de Confianza</h2>
            <p className="text-slate-500 font-light max-w-lg mx-auto">Los principios que hacen que nuestro protocolo de custodia sea naturalmente seguro, transparente y fácil de usar.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                title: 'Custodia Bilateral',
                desc: 'Tus activos y tokens quedan resguardados en bóvedas criptográficas inteligentes hasta que ambas partes validan y cumplen sus compromisos.',
                color: 'bg-teal-50',
                ring: 'ring-teal-500/20',
                icon: '🛡️'
              },
              {
                title: 'Resolución Imparcial',
                desc: 'En el improbable caso de una discrepancia, socios árbitros designados por la gobernanza aplican mediación justa y objetiva on-chain.',
                color: 'bg-gold-500/10',
                ring: 'ring-gold-500/25',
                icon: '⚖️'
              },
              {
                title: 'Seguridad Inmutable',
                desc: 'Construido sobre arquitectura blockchain sin intermediarios ocultos. Trueke transparente con trazabilidad total y sin comisiones abusivas.',
                color: 'bg-cyan-50',
                ring: 'ring-cyan-400/20',
                icon: '🔒'
              }
            ].map((pillar, i) => (
              <div key={i} className="flex flex-col items-center text-center group cursor-pointer">
                <div className={`w-32 h-32 rounded-full ${pillar.color} ring-8 ${pillar.ring} mb-8 flex items-center justify-center transition-transform duration-500 group-hover:scale-105`}>
                  <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl">
                    {pillar.icon}
                  </div>
                </div>
                <h3 className="text-2xl font-heading font-bold text-navy-900 mb-4">{pillar.title}</h3>
                <p className="text-slate-600 font-light leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SHOWCASE — MERCADO RWA */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 w-full relative">
              <div className="aspect-[4/5] w-full rounded-[2rem] bg-gradient-to-tr from-navy-900 to-navy-800 overflow-hidden relative shadow-2xl shadow-navy-900/20">
                <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/15 to-gold-500/10"></div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-3/4 bg-white/10 rounded-t-full border border-white/20 backdrop-blur-sm"></div>
                <div className="absolute top-6 left-6 hexagon-badge w-12 h-12 bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-white text-lg font-black shadow-lg">
                  ⇄
                </div>
                <div className="absolute top-6 right-6 bg-gold-500 text-navy-900 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-sm">
                  RWA
                </div>
              </div>
            </div>
            <div className="flex-1">
              <span className="text-xs tracking-[0.2em] uppercase text-teal-600 mb-4 block font-bold">El Mercado Descentralizado</span>
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-navy-900 mb-6 leading-tight">
                Bienes RWA certificados <br />& servicios profesionales
              </h2>
              <p className="text-lg text-slate-600 mb-8 font-light leading-relaxed">
                Intercambia tokens digitales, bienes físicos con compromiso inmutable SHA-256 o vouchers de servicios con comerciantes y usuarios verificados de la comunidad.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  'Perfiles de comerciantes con nivel de reputación y avales comunitarios.',
                  'Meta-transacciones sin gas para operar sin complicaciones.',
                  'Plazos de custodia automáticos y reembolsos garantizados tras vencimiento.'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-700 font-light">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 mt-2.5"></div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/items"
                className="inline-flex items-center gap-2 text-teal-600 font-semibold hover:text-teal-700 transition-colors border-b border-teal-500/30 pb-1"
              >
                Explorar el catálogo
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* BANNER CTA */}
      <section className="py-32 bg-gradient-to-r from-navy-900 to-navy-800 text-white text-center px-4 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-teal-500/10 blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-gold-500/10 blur-3xl"></div>
        <div className="max-w-3xl mx-auto relative">
          <span className="text-xs tracking-[0.2em] uppercase text-gold-400 mb-4 block font-bold">Bóveda Digital</span>
          <h2 className="text-4xl md:text-6xl font-heading font-extrabold mb-8 text-white tracking-tight">¿Listo para comenzar?</h2>
          <p className="text-xl text-slate-300 mb-12 font-light">
            Únete a la nueva economía descentralizada hoy mismo. Conecta tu billetera y descubre un nuevo estándar de confianza en el comercio entre pares.
          </p>
          <button
            onClick={handleCta}
            className="btn-gold-accent px-12 py-5 text-sm tracking-wide uppercase"
          >
            Iniciar Experiencia
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-navy-950 py-16 border-t border-slate-200 text-center flex flex-col items-center justify-center">
        <BrandLogo variant="full" className="mb-4" />
        <p className="text-slate-500 font-light text-xs mt-2">
          &copy; {new Date().getFullYear()} Protocolo TrueKeate. El arte del intercambio y la confianza en Web3.
        </p>
      </footer>
    </div>
  )
}
