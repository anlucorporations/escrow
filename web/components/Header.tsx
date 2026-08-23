'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@/components/ConnectButton'
import { useEthereum } from '@/lib/ethereum'
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/contracts'
import { ethers } from 'ethers'

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const { account, provider } = useEthereum()

  // Check if user is owner
  const checkAdmin = async () => {
    if (!provider || !account) {
      setIsAdmin(false)
      return
    }

    try {
      const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
      const owner = await contract.owner()
      setIsAdmin(owner.toLowerCase() === account.toLowerCase())
    } catch (err) {
      setIsAdmin(false)
    }
  }

  useEffect(() => {
    checkAdmin()
  }, [account, provider])

  // Hide top header navigation bar on landing page ('/')
  if (pathname === '/') {
    return null
  }

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Operations', href: '/operations' },
    { label: 'Balances', href: '/balances' },
    ...(isAdmin ? [{ label: 'Add Token', href: '/add-token' }] : []),
  ]

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="group">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                E
              </div>
              <span className="text-lg font-bold hidden sm:inline bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Escrow
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <ConnectButton />

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
