import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { AccessGate } from '@/components/AccessGate'
import { IdentityStatusBanner } from '@/components/IdentityStatusBanner'

// Mocks
vi.mock('@/lib/ethereum', () => ({
  useEthereum: vi.fn(),
}))

vi.mock('@/lib/hooks', () => ({
  useRegistration: vi.fn(),
  useProfile: vi.fn(),
}))

vi.mock('@/components/RegisterModal', () => ({
  useRegisterModal: () => ({ openRegister: vi.fn() }),
}))

import { useEthereum } from '@/lib/ethereum'
import { useRegistration, useProfile } from '@/lib/hooks'

describe('AccessGate & IdentityStatusBanner — Control de Acceso Web3', () => {
  it('AccessGate bloquea y solicita conectar billetera cuando no está conectado', () => {
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
      refresh: vi.fn(),
      register: vi.fn(),
    })

    render(
      <AccessGate>
        <div>Contenido Privado de la Suite</div>
      </AccessGate>
    )

    expect(screen.getByText('Acceso Reservado a la Suite TrueKeate')).toBeInTheDocument()
    expect(screen.getByText('Conectar Billetera')).toBeInTheDocument()
    expect(screen.queryByText('Contenido Privado de la Suite')).toBeNull()
  })

  it('AccessGate solicita inscripción cuando la billetera está conectada pero no registrada (Nivel 0)', () => {
    vi.mocked(useEthereum).mockReturnValue({
      isConnected: true,
      account: '0x1234567890123456789012345678901234567890',
      connect: vi.fn(),
      disconnect: vi.fn(),
      provider: {} as any,
      signer: {} as any,
    })
    vi.mocked(useRegistration).mockReturnValue({
      isRegistered: false,
      username: null,
      loading: false,
      refresh: vi.fn(),
      register: vi.fn(),
    })

    render(
      <AccessGate>
        <div>Contenido Privado de la Suite</div>
      </AccessGate>
    )

    expect(screen.getByText('Inscripción Requerida en TrueKeate')).toBeInTheDocument()
    expect(screen.getByText(/Inscribirme Ahora/i)).toBeInTheDocument()
    expect(screen.queryByText('Contenido Privado de la Suite')).toBeNull()
  })

  it('AccessGate permite el acceso completo cuando el usuario está inscrito (Nivel 1+)', () => {
    vi.mocked(useEthereum).mockReturnValue({
      isConnected: true,
      account: '0x1234567890123456789012345678901234567890',
      connect: vi.fn(),
      disconnect: vi.fn(),
      provider: {} as any,
      signer: {} as any,
    })
    vi.mocked(useRegistration).mockReturnValue({
      isRegistered: true,
      username: 'usuario_demo',
      loading: false,
      refresh: vi.fn(),
      register: vi.fn(),
    })

    render(
      <AccessGate>
        <div>Contenido Privado de la Suite</div>
      </AccessGate>
    )

    expect(screen.getByText('Contenido Privado de la Suite')).toBeInTheDocument()
  })

  it('IdentityStatusBanner muestra Nivel 1, Nivel 2 y Nivel 3 con progresión', () => {
    vi.mocked(useEthereum).mockReturnValue({
      isConnected: true,
      account: '0x1234567890123456789012345678901234567890',
      connect: vi.fn(),
      disconnect: vi.fn(),
      provider: {} as any,
      signer: {} as any,
    })
    vi.mocked(useRegistration).mockReturnValue({
      isRegistered: true,
      username: 'particular_alice',
      loading: false,
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
        reputation: { total: 5, acceptance: 5, honesty: 5, security: 5, reliability: 5, commitment: 5, overall: 5 },
        vouchesCount: 2,
        canVouch: true,
      } as any,
      loading: false,
    })

    render(<IdentityStatusBanner />)

    expect(screen.getByText('@particular_alice')).toBeInTheDocument()
    expect(screen.getByText('Nivel 2 · Verificado')).toBeInTheDocument()
    expect(screen.getByText('Obtener SBT (Nivel 3)')).toBeInTheDocument()
  })
})
