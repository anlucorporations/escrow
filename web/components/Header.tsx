'use client'

import Link from 'next/link'
import { useState } from 'react'
import { UserMenu } from '@/components/UserMenu'
import { useEthereum } from '@/lib/ethereum'
import { useEscrow, useRegistration } from '@/lib/hooks'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isConnected } = useEthereum()
  const { isRegistered, loading: registrationLoading } = useRegistration()
  const { roles } = useEscrow()
  const isAdmin = roles.isOwner

  // Las secciones de la plataforma solo se muestran con billetera inscrita.
  const hasAccess = isConnected && !registrationLoading && isRegistered

  const navItems = [
    { label: 'Inicio', href: '/' },
    { label: 'Suite', href: '/dashboard' },
    { label: 'Catálogo', href: '/items' },
    { label: 'Truekes', href: '/operations' },
    { label: 'Campañas', href: '/campaigns' },
    { label: 'Balances', href: '/balances' },
    { label: 'Perfil', href: '/profile' },
    ...(isAdmin ? [{ label: 'Admin', href: '/add-token' }] : []),
  ]

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-slate-200">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl font-serif font-semibold text-slate-900 tracking-tight italic">
              TrueKeate.
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm tracking-wide uppercase text-slate-600 hover:text-slate-900 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <UserMenu />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden pb-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
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
