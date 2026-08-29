'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { triggerHaptic } from '@/lib/mobile'

export function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    {
      label: 'Inicio',
      href: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: 'Catálogo',
      href: '/items',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      label: 'Trueke',
      href: '/items/new',
      isCenterAction: true,
      icon: (
        <span className="text-lg font-black font-mono">⇄</span>
      ),
    },
    {
      label: 'Operaciones',
      href: '/operations',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    {
      label: 'Identidad',
      href: '/identity',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-40 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl md:hidden shadow-lg shadow-[#1A2B4C]/10 transition-all safe-area-pb">
      <div className="flex items-center justify-around h-15 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

          if (item.isCenterAction) {
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => triggerHaptic('medium')}
                className="relative -top-5 flex flex-col items-center justify-center"
                aria-label="Publicar o Crear Trueke"
              >
                <div className="w-12 h-12 hexagon-badge bg-gradient-to-tr from-[#1A2B4C] to-[#2A9D8F] text-white flex items-center justify-center shadow-md shadow-[#2A9D8F]/30 border-2 border-white transition-transform active:scale-95">
                  {item.icon}
                </div>
                <span className="text-[10px] font-bold text-[#1A2B4C] mt-0.5 tracking-tight font-heading">
                  {item.label}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => triggerHaptic('light')}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-xs transition-all relative ${
                isActive
                  ? 'text-[#2A9D8F] font-bold'
                  : 'text-slate-500 hover:text-[#1A2B4C]'
              }`}
            >
              <div className={`p-1 rounded-xl transition-transform ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-[#D4AF37] rounded-full"></span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
