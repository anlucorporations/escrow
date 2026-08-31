'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { triggerHaptic } from '@/lib/mobile'

/**
 * Navegación Inferior Flotante (Design System 2.0 — prototipo §4.5).
 * Barra flotante con blur, botón central hexagonal elevado (⇄ Trueke Central)
 * y 5 destinos: Inicio / Catálogo / Trueke Central / Socios / Perfil.
 */
export function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    {
      label: 'Inicio',
      href: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: 'Catálogo',
      href: '/items',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      label: 'Trueke Central',
      href: '/operations',
      isCenterAction: true,
      icon: '⇄',
    },
    {
      label: 'Socios',
      href: '/governance/socio-voting',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6v6m0 0l3-3m-3 3l-3-3m3 3v6m-9-3h18" />
        </svg>
      ),
    },
    {
      label: 'Perfil',
      href: '/profile',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="bottom-nav-float md:hidden safe-area-mb" aria-label="Navegación principal">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

        if (item.isCenterAction) {
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => triggerHaptic('medium')}
              aria-label="Trueke Central"
              className="flex flex-col items-center justify-center"
            >
              <span className="tk-center-btn">{item.icon}</span>
              <span className="text-[8px] font-bold text-navy-800 mt-0.5 tracking-tight font-heading">
                Trueke
              </span>
            </Link>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => triggerHaptic('light')}
            className={`nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
