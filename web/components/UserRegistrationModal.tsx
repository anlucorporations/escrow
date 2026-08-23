'use client'

import { useState, useEffect, useCallback } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI } from '@/lib/contracts'
import { ethers } from 'ethers'

export function UserRegistrationModal() {
  const { account, isConnected, provider } = useEthereum()
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)
  const [username, setUsername] = useState('')
  const [currentProfile, setCurrentProfile] = useState<{ username: string; registeredAt: bigint } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const checkRegistrationStatus = useCallback(async () => {
    if (!provider || !account) return
    try {
      const registryContract = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, provider)
      const registered: boolean = await registryContract.isRegistered(account)
      setIsRegistered(registered)

      if (registered) {
        const profile = await registryContract.getUserProfile(account)
        setCurrentProfile({
          username: profile.username,
          registeredAt: profile.registeredAt
        })
      } else {
        setCurrentProfile(null)
      }
    } catch (err) {
      console.error('Error checking user registration:', err)
      setIsRegistered(false)
    }
  }, [provider, account])

  useEffect(() => {
    checkRegistrationStatus()
  }, [checkRegistrationStatus])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!provider || !username.trim()) return

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const signer = await provider.getSigner()
      const registryContract = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, signer)
      const tx = await registryContract.registerUser(username.trim())
      await tx.wait()

      setSuccess(true)
      await checkRegistrationStatus()
      setTimeout(() => {
        setSuccess(false)
      }, 2000)
    } catch (err: any) {
      console.error('Registration failed:', err)
      setError(err.reason || err.message || 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected || !account) return null

  if (isRegistered === true && currentProfile) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-medium">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Trader: <span className="font-bold">@{currentProfile.username}</span>
      </div>
    )
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-base text-amber-600 dark:text-amber-400 flex items-center gap-2">
            ⚠️ Registro de Wallet Requerido
          </h3>
          <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">
            Para realizar intercambios seguros en el Exchange, debes inscribir tu wallet asignando un usuario único en la blockchain.
          </p>
        </div>
      </div>

      <form onSubmit={handleRegister} className="mt-3 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Tu usuario (ej. @crypto_trader)"
          className="px-3 py-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 text-sm flex-1"
          minLength={3}
          maxLength={20}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm rounded disabled:bg-gray-400"
        >
          {loading ? 'Inscribiendo...' : 'Inscribir Wallet'}
        </button>
      </form>

      {success && (
        <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
          ¡Wallet inscrita exitosamente como @{username}!
        </div>
      )}
      {error && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-semibold">
          Error: {error}
        </div>
      )}
    </div>
  )
}
