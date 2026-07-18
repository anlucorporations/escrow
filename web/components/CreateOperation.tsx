'use client'

import { useState, useEffect } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { ESCROW_ADDRESS, ESCROW_ABI, ERC20_ABI } from '@/lib/contracts'
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
        const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
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
      // Get fresh signer from provider to ensure we use the current selected account
      const currentSigner = await provider.getSigner()
      
      const tokenContract = new ethers.Contract(tokenA, ERC20_ABI, currentSigner)
      const amount = ethers.parseEther(amountA)

      const tx1 = await tokenContract.approve(ESCROW_ADDRESS, amount)
      await tx1.wait()

      const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, currentSigner)
      const tx2 = await contract.createOperation(
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
        window.location.reload()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="border rounded-lg p-6 bg-white dark:bg-zinc-900">
        <h2 className="text-xl font-bold mb-4">Create Operation</h2>
        <p className="text-sm text-gray-500">Please connect your wallet first</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-6 bg-white dark:bg-zinc-900">
      <h2 className="text-xl font-bold mb-4">Create Operation</h2>
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Token A Address (You provide)
          </label>
          <select
            value={tokenA}
            onChange={(e) => setTokenA(e.target.value)}
            className="w-full px-4 py-2 border rounded dark:bg-zinc-800"
            required
          >
            <option value="">Select token...</option>
            {tokens.map((token) => (
              <option key={token.address} value={token.address}>
                {token.symbol} - {token.address.slice(0, 6)}...{token.address.slice(-4)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Amount A
          </label>
          <input
            type="number"
            step="0.01"
            value={amountA}
            onChange={(e) => setAmountA(e.target.value)}
            placeholder="0.0"
            className="w-full px-4 py-2 border rounded dark:bg-zinc-800"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Token B Address (You want)
          </label>
          <select
            value={tokenB}
            onChange={(e) => setTokenB(e.target.value)}
            className="w-full px-4 py-2 border rounded dark:bg-zinc-800"
            required
          >
            <option value="">Select token...</option>
            {tokens.map((token) => (
              <option key={token.address} value={token.address}>
                {token.symbol} - {token.address.slice(0, 6)}...{token.address.slice(-4)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Amount B
          </label>
          <input
            type="number"
            step="0.01"
            value={amountB}
            onChange={(e) => setAmountB(e.target.value)}
            placeholder="0.0"
            className="w-full px-4 py-2 border rounded dark:bg-zinc-800"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Creating Operation...' : 'Create Operation'}
        </button>
        {success && (
          <div className="text-green-600 text-sm">
            Operation created successfully!
          </div>
        )}
        {error && (
          <div className="text-red-600 text-sm">
            Error: {error}
          </div>
        )}
      </form>
    </div>
  )
}
