'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useEthereum } from '@/lib/ethereum'
import { useRegistration } from '@/lib/hooks'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'

export default function VelvetyLandingPage() {
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

  // Velvety UI Design System with Official TrueKeate Branding:
  return (
    <div className="min-h-screen bg-background font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-700">
      
      {/* HERO SECTION */}
      <section className="relative pt-24 pb-32 overflow-hidden flex flex-col items-center text-center px-4">
        {/* Soft decorative background shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] rounded-full bg-cyan-100/40 blur-3xl mix-blend-multiply"></div>
          <div className="absolute top-[20%] -left-[10%] w-[400px] h-[400px] rounded-full bg-amber-50/70 blur-3xl mix-blend-multiply"></div>
        </div>

        {/* Isotipo 3D Hexagonal con Glow */}
        <div className="mb-8 relative group">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden shadow-2xl shadow-[#00E5FF]/20 border-2 border-slate-200/80 bg-white p-1 relative transform group-hover:scale-105 transition-all duration-300">
            <Image
              src="/images/truekeate-logo.jpg"
              alt="TrueKeate Isotipo Oficial"
              fill
              priority
              className="object-cover object-top scale-[1.75]"
            />
          </div>
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#00E5FF]/20 to-amber-500/20 blur-lg -z-10 group-hover:opacity-100 transition-opacity"></div>
        </div>

        <span className="text-xs tracking-[0.2em] uppercase text-slate-500 mb-4 font-semibold">
          El Universo del Intercambio Descentralizado
        </span>
        
        <h1 className="text-5xl md:text-7xl font-serif text-slate-900 mb-8 max-w-4xl leading-tight">
          El arte del intercambio <br className="hidden md:block"/> 
          <span className="italic text-indigo-600">digital y consciente.</span>
        </h1>
        
        <p className="max-w-2xl text-lg text-slate-600 mb-12 font-light leading-relaxed">
          Descubre una plataforma de custodia e intercambio entre pares de alta fidelidad. Protege tus activos y bienes con contratos inteligentes elegantes, diseñados para garantizar máxima transparencia y tranquilidad.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <button 
            onClick={handleCta}
            className="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-sm tracking-wide uppercase transition-all shadow-xl shadow-slate-900/10"
          >
            {isConnected ? (isRegistered ? 'Ir al Catálogo' : 'Registrar Billetera') : 'Conectar Billetera'}
          </button>
          <Link 
            href="/items" 
            className="px-10 py-4 bg-transparent border border-slate-300 hover:border-slate-400 text-slate-900 rounded-full text-sm tracking-wide uppercase transition-all"
          >
            Explorar Catálogo
          </Link>
        </div>
      </section>

      {/* THREE PILLARS (Velvety Features) */}
      <section id="pilares" className="py-24 bg-white border-y border-slate-100 scroll-mt-20">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-serif text-slate-900 mb-4">Los Tres Pilares de Confianza</h2>
            <p className="text-slate-500 font-light max-w-lg mx-auto">Descubre los principios que hacen que nuestro protocolo de custodia sea naturalmente seguro, transparente y fácil de usar.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                title: 'Custodia Bilateral',
                desc: 'Tus activos y tokens quedan resguardados en bóvedas criptográficas inteligentes hasta que ambas partes validan y cumplen sus compromisos.',
                color: 'bg-indigo-50'
              },
              {
                title: 'Resolución Imparcial',
                desc: 'En el improbable caso de una discrepancia, socios árbitros designados por la gobernanza aplican mediación justa y objetiva on-chain.',
                color: 'bg-purple-50'
              },
              {
                title: 'Seguridad Inmutable',
                desc: 'Construido sobre arquitectura blockchain sin intermediarios ocultos. Trueke transparente con trazabilidad total y sin comisiones abusivas.',
                color: 'bg-[#F2F5ED]' // Soft sage hint
              }
            ].map((pillar, i) => (
              <div key={i} className="flex flex-col items-center text-center group cursor-pointer">
                <div className={`w-32 h-32 rounded-full ${pillar.color} mb-8 flex items-center justify-center transition-transform duration-500 group-hover:scale-105`}>
                  <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-xl font-serif text-slate-400">
                    0{i+1}
                  </div>
                </div>
                <h3 className="text-2xl font-serif text-slate-900 mb-4">{pillar.title}</h3>
                <p className="text-slate-600 font-light leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IMAGE / SHOWCASE SECTION */}
      <section className="py-24 bg-indigo-50/50">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 w-full relative">
              {/* Abstract decorative element representing an image in the UI Kit */}
              <div className="aspect-[4/5] w-full rounded-[2rem] bg-indigo-100 overflow-hidden relative shadow-2xl shadow-indigo-900/5">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-200/40 to-transparent"></div>
                {/* Decorative arch */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-3/4 bg-white/40 rounded-t-full border border-white/60 backdrop-blur-sm"></div>
              </div>
            </div>
            <div className="flex-1">
              <span className="text-xs tracking-[0.2em] uppercase text-indigo-600 mb-4 block font-medium">El Mercado Descentralizado</span>
              <h2 className="text-4xl md:text-5xl font-serif text-slate-900 mb-6 leading-tight">
                Bienes RWA certificados <br/>& servicios profesionales
              </h2>
              <p className="text-lg text-slate-600 mb-8 font-light leading-relaxed">
                Ya sea que intercambies tokens digitales, bienes físicos con compromiso inmutable SHA-256 o vouchers de servicios, nuestro catálogo te conecta con una comunidad de comerciantes y usuarios verificados.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  'Perfiles de comerciantes con nivel de reputación y avales comunitarios.',
                  'Meta-transacciones sin gas para operar sin complicaciones.',
                  'Plazos de custodia automáticos y reembolsos garantizados tras vencimiento.'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-700 font-light">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2.5"></div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link 
                href="/items" 
                className="inline-flex items-center gap-2 text-indigo-700 font-medium hover:text-indigo-900 transition-colors border-b border-indigo-200 pb-1"
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
      <section className="py-32 bg-slate-900 text-white text-center px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-serif mb-8 text-indigo-50">¿Listo para comenzar?</h2>
          <p className="text-xl text-slate-400 mb-12 font-light">
            Únete a la nueva economía descentralizada hoy mismo. Conecta tu billetera y descubre un nuevo estándar de confianza en el comercio entre pares.
          </p>
          <button 
            onClick={handleCta}
            className="px-12 py-5 bg-indigo-50 hover:bg-white text-slate-900 rounded-full tracking-wide uppercase text-sm font-medium transition-all hover:scale-105"
          >
            Iniciar Experiencia
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-[#070D1E] py-16 border-t border-slate-200 text-center flex flex-col items-center justify-center">
        <BrandLogo variant="full" className="mb-4" />
        <p className="text-slate-500 font-light text-xs mt-2">
          &copy; {new Date().getFullYear()} Protocolo TrueKeate. El arte del intercambio y la confianza en Web3.
        </p>
      </footer>
    </div>
  )
}
