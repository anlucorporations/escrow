'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

const RegisterModalContext = createContext<{ openRegister: () => void }>({
  openRegister: () => {},
})

/** Navega a la página completa de inscripción (/register). */
export function useRegisterModal() {
  return useContext(RegisterModalContext)
}

/** Proveedor global para navegación unificada a /register sin modales flotantes. */
export function RegisterProvider({ children }: { children: ReactNode }) {
  const router = useRouter()

  const openRegister = () => {
    router.push('/register')
  }

  return (
    <RegisterModalContext.Provider value={{ openRegister }}>
      {children}
    </RegisterModalContext.Provider>
  )
}
