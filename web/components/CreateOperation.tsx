'use client'

import { useState, useEffect } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { EXCHANGE_ADDRESS, EXCHANGE_ABI, ERC20_ABI } from '@/lib/contracts'
import { ethers } from 'ethers'

export function CreateOperation() {
  const [tokenA, setTokenA] = useState('')
  const [tokenB, setTokenB] = useState('')
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [tokens, setTokens] = useState<Array<{ address: string; symbol: string }>>([])

  const { isConnected, provider } = useEthereum()

  useEffect(() => {
    const loadTokens = async () => {
      if (!provider) return
      try {
        const contract = new ethers.Contract(EXCHANGE_ADDRESS, EXCHANGE_ABI, provider)
        let allowedTokens: string[] = []

        try {
          allowedTokens = await contract.getAllowedTokens()
        } catch (err) {
          console.log('No tokens yet or error fetching tokens:', err)
          allowedTokens = []
        }

        const tokenData = await Promise.all(
          allowedTokens.map(async (addr: string) => {
            try {
              const tokenContract = new ethers.Contract(addr, ERC20_ABI, provider)
              const symbol = await tokenContract.symbol()
              return { address: addr, symbol }
            } catch {
              return { address: addr, symbol: addr.slice(0, 6) }
            }
          })
        )

        setTokens(tokenData)
      } catch (err) {
        console.error('Error loading tokens:', err)
      }
    }
    loadTokens()
  }, [provider, success])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenA || !tokenB || !amountA || !amountB || !provider) return

    setLoading(true)
    setError('')

    try {
      const currentSigner = await provider.getSigner()
      const tokenContract = new ethers.Contract(tokenA, ERC20_ABI, currentSigner)
      const amount = ethers.parseEther(amountA)

      const tx1 = await tokenContract.approve(EXCHANGE_ADDRESS, amount)
      await tx1.wait()

      const contract = new ethers.Contract(EXCHANGE_ADDRESS, EXCHANGE_ABI, currentSigner)
      const tx2 = await contract.createOrder(
        tokenA,
        tokenB,
        amount,
        ethers.parseEther(amountB)
      )
      await tx2.wait()

      setSuccess(true)
      setTimeout(() => {
        setTokenA('')
        setTokenB('')
        setAmountA('')
        setAmountB('')
        setSuccess(false)
      }, 2000)
    } catch (err: any) {
      console.error('Create order error:', err)
      setError(err.reason || err.message || 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="border rounded-lg p-6 bg-white dark:bg-zinc-900 shadow-sm">
        <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">➕ Crear Orden de Intercambio</h2>
        <p className="text-sm text-gray-500">Por favor conecta tu wallet primero</p>
      </div>
    )
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 bg-white dark:bg-zinc-900 shadow-sm">
      <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">➕ Crear Orden de Intercambio (P2P)</h2>
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
            Token a Entregar (Tú Ofreces)
          </label>
          <select
            value={tokenA}
            onChange={(e) => setTokenA(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-sm"
            required
          >
            <option value="">Selecciona token...</option>
            {tokens.map((token) => (
              <option key={token.address} value={token.address}>
                {token.symbol} ({token.address.slice(0, 6)}...{token.address.slice(-4)})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
            Cantidad a Entregar
          </label>
          <input
            type="number"
            step="0.01"
            value={amountA}
            onChange={(e) => setAmountA(e.target.value)}
            placeholder="10.0"
            className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
            Token a Recibir (Tú Solicitas)
          </label>
          <select
            value={tokenB}
            onChange={(e) => setTokenB(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-sm"
            required
          >
            <option value="">Selecciona token...</option>
            {tokens.map((token) => (
              <option key={token.address} value={token.address}>
                {token.symbol} ({token.address.slice(0, 6)}...{token.address.slice(-4)})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
            Cantidad Solicitada
          </label>
          <input
            type="number"
            step="0.01"
            value={amountB}
            onChange={(e) => setAmountB(e.target.value)}
            placeholder="20.0"
            className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-sm"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:bg-gray-400 text-sm shadow-sm"
        >
          {loading ? 'Publicando Orden...' : 'Publicar Orden en el Exchange'}
        </button>
        {success && (
          <div className="text-emerald-600 text-xs font-semibold text-center">
            ¡Orden publicada exitosamente en el libro de órdenes!
          </div>
        )}
        {error && (
          <div className="text-red-600 text-xs font-semibold">
            Error: {error}
          </div>
        )}
      </form>
    </div>
  )
}
