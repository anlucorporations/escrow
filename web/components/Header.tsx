'use client'

import Link from 'next/link'
import { useState } from 'react'
import { UserMenu } from '@/components/UserMenu'
import { BrandLogo } from '@/components/BrandLogo'
import { useEthereum } from '@/lib/ethereum'
import { useEscrow, useRegistration } from '@/lib/hooks'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isConnected } = useEthereum()
  const { isRegistered, loading: registrationLoading } = useRegistration()
  const { roles } = useEscrow()
  const isAdmin = roles.isOwner

  // Las secciones privadas de la plataforma se muestran tras validar inscripción.
  const hasAccess = isConnected && !registrationLoading && isRegistered

  const navItems = hasAccess
    ? [
        { label: 'Inicio', href: '/' },
        { label: 'Panel', href: '/dashboard' },
        { label: 'Catálogo', href: '/items' },
        { label: 'Truekes', href: '/operations' },
        { label: 'Identidad', href: '/identity' },
        { label: 'Campañas', href: '/campaigns' },
        { label: 'Balances', href: '/balances' },
        { label: 'Perfil', href: '/profile' },
        ...(isAdmin ? [{ label: 'Admin', href: '/add-token' }] : []),
      ]
    : [
        { label: 'Inicio', href: '/' },
        { label: 'Catálogo', href: '/items' },
        { label: 'Ayuda', href: '/help' },
      ]

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
        <div className="flex justify-between items-center h-18">
          {/* Logo Oficial con Isotipo Hexagonal */}
          <BrandLogo variant="full" priority />

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-xs font-bold tracking-wider uppercase text-slate-600 hover:text-[#2A9D8F] transition-colors py-1 px-2 rounded-lg hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <UserMenu />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors"
              aria-label="Abrir menú de navegación"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden pb-4 pt-2 space-y-1 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-[#2A9D8F] hover:bg-[#F8FFFE] rounded-xl transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
