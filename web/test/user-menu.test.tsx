import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { UserMenu } from '@/components/UserMenu'

// Mocks
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}))

vi.mock('@/lib/ethereum', () => ({
  useEthereum: vi.fn(),
}))

vi.mock('@/lib/hooks', () => ({
  useRegistration: vi.fn(),
  useProfile: vi.fn(),
  useUserRole: () => ({
    isOwner: false,
    isArbiter: false,
    isSocio: false,
    isBusiness: false,
    isBusinessActive: false,
    roleKey: 'particular',
    roleLabel: 'Particular',
    roleDescription: 'Particular',
    badgeBg: '',
    badgeText: '',
    loading: false,
  }),
  useEscrow: () => ({
    roles: { isOwner: false, isArbiter: false, owner: null, arbiter: null },
  }),
}))

vi.mock('@/components/RegisterModal', () => ({
  useRegisterModal: () => ({ openRegister: vi.fn() }),
}))

import { useEthereum } from '@/lib/ethereum'
import { useRegistration, useProfile } from '@/lib/hooks'

describe('UserMenu — Menú Desplegable de Usuario y Balance', () => {
  it('muestra botón de conectar cuando no hay billetera', () => {
    vi.mocked(useEthereum).mockReturnValue({
      isConnected: false,
      account: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      provider: null,
      signer: null,
    })
    vi.mocked(useRegistration).mockReturnValue({
      isRegistered: false,
      username: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
      register: vi.fn(),
    })
    vi.mocked(useProfile).mockReturnValue({
      profile: null,
      loading: false,
    })

    render(<UserMenu />)
    expect(screen.getByText(/Conectar/i)).toBeInTheDocument()
  })

  it('despliega el menú con accesos a balances, perfil, identidad y truekes al hacer click', () => {
    const disconnectMock = vi.fn()
    vi.mocked(useEthereum).mockReturnValue({
      isConnected: true,
      account: '0x1234567890123456789012345678901234567890',
      connect: vi.fn(),
      disconnect: disconnectMock,
      provider: {} as any,
      signer: {} as any,
    })
    vi.mocked(useRegistration).mockReturnValue({
      isRegistered: true,
      username: 'particular_alice',
      loading: false,
      error: null,
      refresh: vi.fn(),
      register: vi.fn(),
    })
    vi.mocked(useProfile).mockReturnValue({
      profile: {
        address: '0x1234567890123456789012345678901234567890',
        username: 'particular_alice',
        isBusiness: false,
        kycStatus: 'verified',
        trustLevel: 'plata',
        levelLabel: 'Plata',
        identificationLevel: 2,
        sbtClaimed: false,
        sbtProvider: null,
        twoFactorEnabled: true,
        reputation: { total: 10, acceptance: 5, honesty: 5, security: 5, reliability: 5, commitment: 5, overall: 4.8 },
        stats: { completed: 10, active: 2, items: 4, vouches: 3 },
      },
      loading: false,
    })

    render(<UserMenu />)

    // Trigger button
    const trigger = screen.getByLabelText('Menú desplegable de usuario')
    expect(trigger).toBeInTheDocument()
    expect(screen.getByText('@particular_alice')).toBeInTheDocument()

    // Abrir dropdown
    fireEvent.click(trigger)

    // Verificar secciones clave del dropdown
    expect(screen.getByText('Balance de Billetera')).toBeInTheDocument()
    expect(screen.getByText('Consultar saldos TKA, TKB, USDT y BRLT')).toBeInTheDocument()
    expect(screen.getByText('Identidad Web3 & Seguridad 2FA')).toBeInTheDocument()
    expect(screen.getByText('Mi Perfil & Reputación')).toBeInTheDocument()
    expect(screen.getByText('Mis Truekes & Operaciones')).toBeInTheDocument()
    expect(screen.getByText('Desconectar Billetera')).toBeInTheDocument()

    // Probar desconexión
    const disconnectBtn = screen.getByText('Desconectar Billetera')
    fireEvent.click(disconnectBtn)
    expect(disconnectMock).toHaveBeenCalledTimes(1)
  })
})
