'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useRegistration } from '@/lib/hooks'
import { getFriendlyError } from '@/lib/escrow'

const RegisterModalContext = createContext<{ openRegister: () => void }>({
  openRegister: () => {},
})

/** Abre el modal de inscripción desde cualquier parte de la app. */
export function useRegisterModal() {
  return useContext(RegisterModalContext)
}

/** Proveedor global: renderiza el modal de inscripción una sola vez. */
export function RegisterProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <RegisterModalContext.Provider value={{ openRegister: () => setIsOpen(true) }}>
      {children}
      {isOpen && <RegisterModal onClose={() => setIsOpen(false)} />}
    </RegisterModalContext.Provider>
  )
}

function RegisterModal({ onClose }: { onClose: () => void }) {
  const { register } = useRegistration()
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = username.trim()
    if (name.length < 3 || name.length > 20) {
      setError('El nombre de usuario debe tener entre 3 y 20 caracteres.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await register(name)
      setSuccess(true)
      setTimeout(() => {
        onClose()
        router.push('/items')
      }, 1200)
    } catch (err) {
      setError(getFriendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full">
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Inscripción a la plataforma
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Para acceder a la plataforma tu billetera debe estar <strong>inscrita on-chain</strong>.
            Elige un nombre de usuario único (3-20 caracteres). La inscripción es pública y gratuita.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Nombre de usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej. alice"
                minLength={3}
                maxLength={20}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 font-semibold transition-all duration-200"
            >
              {loading ? 'Inscribiendo (tx on-chain)...' : 'Inscribirme'}
            </button>

            {success && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
                ✓ Inscripción verificada on-chain. ¡Bienvenido!
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                Error: {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
