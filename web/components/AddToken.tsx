'use client'

import { useState, useEffect } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { ESCROW_ADDRESS, ESCROW_ABI, ERC20_ABI } from '@/lib/contracts'
import { ethers } from 'ethers'

export function AddToken() {
  const [tokenAddress, setTokenAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [tokens, setTokens] = useState<Array<{ address: string; symbol: string; name: string }>>([])

  const { isConnected, provider } = useEthereum()

  useEffect(() => {
    const loadTokens = async () => {
      if (!provider) return
      try {
        const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
        let allowedTokens: string[] = []

        try {
          const rawTokens = await contract.getAllowedTokens()
          allowedTokens = rawTokens.map((addr: string) => ethers.getAddress(addr))
          console.log('AddToken - raw tokens:', rawTokens)
          console.log('AddToken - normalized tokens:', allowedTokens)
        } catch (err) {
          console.log('No tokens yet or error fetching tokens:', err)
          allowedTokens = []
        }

        console.log('AddToken - allowedTokens length:', allowedTokens.length)

        const tokenData = await Promise.all(
          allowedTokens.map(async (addr: string) => {
            try {
              const tokenContract = new ethers.Contract(addr, ERC20_ABI, provider)
              const [symbol, name] = await Promise.all([
                tokenContract.symbol(),
                tokenContract.name()
              ])
              return { address: addr, symbol, name }
            } catch (err) {
              console.error(`Error loading token ${addr}:`, err)
              return { address: addr, symbol: '???', name: 'Unknown Token' }
            }
          })
        )

        console.log('AddToken - tokenData:', tokenData)
        setTokens(tokenData)
      } catch (err) {
        console.error('Error loading tokens:', err)
      }
    }
    loadTokens()
  }, [provider, success])

  const handleAddToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenAddress || !provider) return

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      // Get fresh signer from provider to ensure we use the current selected account
      const currentSigner = await provider.getSigner()
      const currentAddress = await currentSigner.getAddress()
      console.log('Current address:', currentAddress)
      
      const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, currentSigner)
      console.log('Adding token:', tokenAddress)
      const tx = await contract.addToken(tokenAddress)
      console.log('Transaction sent:', tx.hash)
      await tx.wait()
      console.log('Transaction confirmed')

      setSuccess(true)
      setTokenAddress('')

      // Force reload after a short delay
      setTimeout(() => {
        setSuccess(false)
        window.location.reload()
      }, 2000)
    } catch (err: any) {
      console.error('Error adding token:', err)
      setError(err.message || 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="border rounded-lg p-6 bg-white dark:bg-zinc-900">
        <h2 className="text-xl font-bold mb-4">Add Token (Admin Only)</h2>
        <p className="text-sm text-gray-500">Please connect your wallet first</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-6 bg-white dark:bg-zinc-900">
      <h2 className="text-xl font-bold mb-4">Add Token (Admin Only)</h2>
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
        <div className="font-medium mb-1">Escrow Contract:</div>
        <div className="font-mono text-xs break-all">{ESCROW_ADDRESS}</div>
      </div>
      <form onSubmit={handleAddToken} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Token Address
          </label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 border rounded dark:bg-zinc-800"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          {loading ? 'Adding...' : 'Add Token'}
        </button>
        {success && (
          <div className="text-green-600 text-sm">
            Token added successfully!
          </div>
        )}
        {error && (
          <div className="text-red-600 text-sm">
            Error: {error}
          </div>
        )}
      </form>

      <div className="mt-6 pt-6 border-t">
        <h3 className="text-lg font-semibold mb-3">Added Tokens ({tokens.length})</h3>
        {tokens.length === 0 ? (
          <p className="text-sm text-gray-500">No tokens added yet</p>
        ) : (
          <div className="space-y-2">
            {tokens.map((token) => (
              <div
                key={token.address}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded"
              >
                <div className="flex-1">
                  <div className="font-medium">{token.symbol}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{token.name}</div>
                </div>
                <div className="text-xs font-mono text-gray-500">
                  {token.address}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
