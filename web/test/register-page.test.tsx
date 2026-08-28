import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RegisterPage from '../app/register/page'
import * as hooks from '@/lib/hooks'
import * as ethereum from '@/lib/ethereum'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('RegisterPage (/register)', () => {
  const mockRegister = vi.fn().mockResolvedValue(undefined)
  const mockConnect = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(ethereum, 'useEthereum').mockReturnValue({
      isConnected: true,
      account: '0x1234567890123456789012345678901234567890',
      signer: null,
      connect: mockConnect,
      disconnect: vi.fn(),
      provider: {} as any,
    })

    vi.spyOn(hooks, 'useRegistration').mockReturnValue({
      isRegistered: false,
      username: null,
      loading: false,
      register: mockRegister,
      refresh: vi.fn().mockResolvedValue(undefined),
    })
  })

  it('renderiza todos los campos obligatorios, coordenadas UTM y términos', () => {
    render(<RegisterPage />)

    expect(screen.getByText(/Identidad Digital Única/i)).toBeDefined()
    expect(screen.getByPlaceholderText('ej. carlos_barlovento')).toBeDefined()
    expect(screen.getByPlaceholderText('usuario@ejemplo.com')).toBeDefined()
    expect(screen.getByPlaceholderText('+58 412 1234567')).toBeDefined()
    expect(screen.getByPlaceholderText(/Calle Marina/i)).toBeDefined()
    expect(screen.getByText(/Coordenadas UTM Calculadas On-Chain/i)).toBeDefined()
    expect(screen.getByRole('checkbox')).toBeDefined()
    expect(screen.getByText(/Completar Inscripción On-Chain/i)).toBeDefined()
  })

  it('valida formulario completo y llama a register on-chain', async () => {
    render(<RegisterPage />)

    fireEvent.change(screen.getByPlaceholderText('ej. carlos_barlovento'), {
      target: { value: 'carlos_trade' },
    })
    fireEvent.change(screen.getByPlaceholderText('usuario@ejemplo.com'), {
      target: { value: 'carlos@truekeate.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('+58 412 1234567'), {
      target: { value: '+584125556677' },
    })
    fireEvent.change(screen.getByPlaceholderText(/Calle Marina/i), {
      target: { value: 'Av. Costanera Local 10, Higuerote' },
    })

    // Aceptar términos
    const termsCheckbox = screen.getByRole('checkbox')
    fireEvent.click(termsCheckbox)

    // Enviar formulario
    const submitBtn = screen.getByRole('button', { name: /Completar Inscripción/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'carlos_trade',
          email: 'carlos@truekeate.com',
          phone: '+584125556677',
          physicalAddress: 'Av. Costanera Local 10, Higuerote',
          utmZone: 19,
          isNorthernHemisphere: true,
        })
      )
    })
  })

  it('muestra mensaje informativo si la billetera ya está inscrita', () => {
    vi.spyOn(hooks, 'useRegistration').mockReturnValue({
      isRegistered: true,
      username: 'usuario_activo',
      loading: false,
      register: mockRegister,
      refresh: vi.fn().mockResolvedValue(undefined),
    })

    render(<RegisterPage />)
    expect(screen.getByText(/¡Ya estás inscrito!/i)).toBeDefined()
    expect(screen.getByText(/@usuario_activo/i)).toBeDefined()
  })
})
