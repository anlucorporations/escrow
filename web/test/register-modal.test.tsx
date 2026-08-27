import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RegisterProvider, useRegisterModal } from '@/components/RegisterModal'
import * as hooks from '@/lib/hooks'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

function TestOpener() {
  const { openRegister } = useRegisterModal()
  return <button onClick={openRegister}>Abrir Inscripción</button>
}

describe('RegisterModal Component (4 mandatory unique fields & UTM coordinates)', () => {
  const mockRegister = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(hooks, 'useRegistration').mockReturnValue({
      isRegistered: false,
      username: null,
      loading: false,
      register: mockRegister,
      refresh: vi.fn().mockResolvedValue(undefined),
    })
  })

  it('renderiza todos los 4 campos obligatorios y coordenadas UTM', () => {
    render(
      <RegisterProvider>
        <TestOpener />
      </RegisterProvider>
    )

    fireEvent.click(screen.getByText('Abrir Inscripción'))

    expect(screen.getByText('Inscripción a TrueKeate')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('mi_usuario')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('usuario@ejemplo.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('+58 412 1234567')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('ej. Av. Bicentenaria, Edif. Central, Barlovento')).toBeInTheDocument()
    expect(screen.getByText(/Coordenadas UTM On-Chain:/i)).toBeInTheDocument()
  })

  it('envía los 4 campos y coordenadas UTM on-chain exitosamente', async () => {
    render(
      <RegisterProvider>
        <TestOpener />
      </RegisterProvider>
    )

    fireEvent.click(screen.getByText('Abrir Inscripción'))

    fireEvent.change(screen.getByPlaceholderText('mi_usuario'), { target: { value: 'trader_luis' } })
    fireEvent.change(screen.getByPlaceholderText('usuario@ejemplo.com'), { target: { value: 'luis@truekeate.com' } })
    fireEvent.change(screen.getByPlaceholderText('+58 412 1234567'), { target: { value: '+584129998877' } })
    fireEvent.change(screen.getByPlaceholderText('ej. Av. Bicentenaria, Edif. Central, Barlovento'), {
      target: { value: 'Av. Las Delicias, Higuerote' },
    })

    fireEvent.click(screen.getByText('Completar Inscripción On-Chain'))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'trader_luis',
          email: 'luis@truekeate.com',
          phone: '+584129998877',
          physicalAddress: 'Av. Las Delicias, Higuerote',
          utmZone: expect.any(Number),
          isNorthernHemisphere: true,
        })
      )
    })
  })
})
