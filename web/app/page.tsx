'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useEthereum } from '@/lib/ethereum'
import { useRegistration } from '@/lib/hooks'
import { useRouter } from 'next/navigation'
import { useRegisterModal } from '@/components/RegisterModal'

export default function VelvetyLandingPage() {
  const { isConnected, connect } = useEthereum()
  const { isRegistered } = useRegistration()
  const router = useRouter()
  const { openRegister } = useRegisterModal()

  const handleCta = async () => {
    if (!isConnected) {
      await connect()
    } else if (!isRegistered) {
      openRegister()
    } else {
      router.push('/dashboard')
    }
  }

  // Velvety UI Design System:
  // Fonts: Serif for headings, Sans for body.
  // Colors: Warm Nudes (indigo-100), Soft Rose (purple-500), Sage (fuchsia-500), Charcoal (slate-900)

  return (
    <div className="min-h-screen bg-background font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-700">
      
      {/* HERO SECTION */}
      <section className="relative pt-28 pb-32 overflow-hidden flex flex-col items-center text-center px-4">
        {/* Soft decorative background shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] rounded-full bg-indigo-100/60 blur-3xl mix-blend-multiply"></div>
          <div className="absolute top-[20%] -left-[10%] w-[400px] h-[400px] rounded-full bg-purple-50/80 blur-3xl mix-blend-multiply"></div>
        </div>

        <span className="text-xs tracking-[0.2em] uppercase text-slate-500 mb-6 font-medium">Elevate Your Trade</span>
        
        <h1 className="text-5xl md:text-7xl font-serif text-slate-900 mb-8 max-w-4xl leading-tight">
          The art of mindful <br className="hidden md:block"/> 
          <span className="italic text-indigo-600">digital exchange.</span>
        </h1>
        
        <p className="max-w-2xl text-lg text-slate-600 mb-12 font-light leading-relaxed">
          Experience a refined peer-to-peer escrow platform. Secure your assets with elegant smart contracts, designed for transparency and peace of mind.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <button 
            onClick={handleCta}
            className="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-sm tracking-wide uppercase transition-all shadow-xl shadow-slate-900/10"
          >
            {isConnected ? (isRegistered ? 'Enter Suite' : 'Register Wallet') : 'Connect Wallet'}
          </button>
          <Link 
            href="/items" 
            className="px-10 py-4 bg-transparent border border-slate-300 hover:border-slate-400 text-slate-900 rounded-full text-sm tracking-wide uppercase transition-all"
          >
            Explore Collection
          </Link>
        </div>
      </section>

      {/* THREE PILLARS (Velvety Features) */}
      <section className="py-24 bg-white border-y border-slate-100">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-serif text-slate-900 mb-4">A curated experience</h2>
            <p className="text-slate-500 font-light max-w-lg mx-auto">Discover the principles that make our escrow protocol naturally secure and effortlessly beautiful.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                title: 'Bilateral Custody',
                desc: 'Your assets are held in a secure, decentralized vault until both parties fulfill their commitments. Absolute harmony.',
                color: 'bg-indigo-50'
              },
              {
                title: 'Seamless Resolution',
                desc: 'In the rare event of a disagreement, our governance partners provide swift, objective arbitration to restore balance.',
                color: 'bg-purple-50'
              },
              {
                title: 'Timeless Security',
                desc: 'Built on immutable blockchain architecture. No hidden fees, no intermediaries. Just pure, transparent trade.',
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
              <span className="text-xs tracking-[0.2em] uppercase text-indigo-600 mb-4 block font-medium">The Marketplace</span>
              <h2 className="text-4xl md:text-5xl font-serif text-slate-900 mb-6 leading-tight">
                Curated goods <br/>& premium services
              </h2>
              <p className="text-lg text-slate-600 mb-8 font-light leading-relaxed">
                Whether you are trading digital tokens, physical goods, or offering professional services, our catalog connects you with a community of verified merchants and users.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  'Verified merchant profiles with reputation scores.',
                  'Gasless meta-transactions for effortless trading.',
                  'Automated escrow deadlines and refunds.'
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
                Browse the catalog
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
          <h2 className="text-4xl md:text-6xl font-serif mb-8 text-indigo-50">Ready to begin?</h2>
          <p className="text-xl text-slate-400 mb-12 font-light">
            Join the decentralized economy today. Connect your wallet and discover a new standard of trust.
          </p>
          <button 
            onClick={handleCta}
            className="px-12 py-5 bg-indigo-50 hover:bg-white text-slate-900 rounded-full tracking-wide uppercase text-sm font-medium transition-all hover:scale-105"
          >
            Start your journey
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-background py-16 border-t border-slate-200 text-center">
        <h3 className="text-2xl font-serif text-slate-900 mb-4 italic">TrueKeate</h3>
        <p className="text-slate-500 font-light text-sm">
          &copy; {new Date().getFullYear()} TrueKeate Protocol. The beauty of trustless trade.
        </p>
      </footer>
    </div>
  )
}
