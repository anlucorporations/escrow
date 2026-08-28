import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RegisterProvider, useRegisterModal } from '@/components/RegisterModal'

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

describe('RegisterProvider & useRegisterModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirige a /register al invocar openRegister() sin modal flotante', () => {
    render(
      <RegisterProvider>
        <TestOpener />
      </RegisterProvider>
    )

    fireEvent.click(screen.getByText('Abrir Inscripción'))
    expect(mockPush).toHaveBeenCalledWith('/register')
  })
})
