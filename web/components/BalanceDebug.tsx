'use client'

import { useState, useEffect } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { ESCROW_ADDRESS, ESCROW_ABI, ERC20_ABI } from '@/lib/contracts'
import { ethers } from 'ethers'

const ACCOUNTS = [
  { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', name: 'Account #0' },
  { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', name: 'Account #1' },
  { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', name: 'Account #2' },
]

interface TokenBalance {
  address: string
  symbol: string
  balance: string
}

interface AccountBalances {
  account: string
  name: string
  eth: string
  tokens: TokenBalance[]
}

export function BalanceDebug() {
  const [balances, setBalances] = useState<AccountBalances[]>([])
  const [loading, setLoading] = useState(false)
  const { provider } = useEthereum()

  const loadBalances = async () => {
    if (!provider) return

    setLoading(true)
    try {
      // Get allowed tokens from escrow contract
      const escrowContract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
      let tokenAddresses: string[] = []

      try {
        const rawTokens = await escrowContract.getAllowedTokens()
        tokenAddresses = rawTokens.map((addr: string) => ethers.getAddress(addr))
        console.log('BalanceDebug - raw tokens:', rawTokens)
        console.log('BalanceDebug - normalized tokens:', tokenAddresses)
      } catch (err) {
        console.log('BalanceDebug - Error fetching tokens:', err)
        tokenAddresses = []
      }

      console.log('BalanceDebug - ESCROW_ADDRESS:', ESCROW_ADDRESS)
      console.log('BalanceDebug - tokenAddresses length:', tokenAddresses.length)

      const accountBalances: AccountBalances[] = []

      // Add escrow contract balances
      const escrowEthBalance = await provider.getBalance(ESCROW_ADDRESS)
      const escrowTokens: TokenBalance[] = []

      for (const tokenAddr of tokenAddresses) {
        try {
          const tokenContract = new ethers.Contract(tokenAddr, ERC20_ABI, provider)
          const [balance, symbol] = await Promise.all([
            tokenContract.balanceOf(ESCROW_ADDRESS),
            tokenContract.symbol()
          ])
          escrowTokens.push({
            address: tokenAddr,
            symbol,
            balance: ethers.formatEther(balance)
          })
        } catch (err) {
          console.error(`Error loading token ${tokenAddr}:`, err)
        }
      }

      accountBalances.push({
        account: ESCROW_ADDRESS,
        name: 'Escrow Contract',
        eth: ethers.formatEther(escrowEthBalance),
        tokens: escrowTokens
      })

      // Add user accounts balances
      for (const acc of ACCOUNTS) {
        const ethBalance = await provider.getBalance(acc.address)
        const tokens: TokenBalance[] = []

        for (const tokenAddr of tokenAddresses) {
          try {
            const tokenContract = new ethers.Contract(tokenAddr, ERC20_ABI, provider)
            const [balance, symbol] = await Promise.all([
              tokenContract.balanceOf(acc.address),
              tokenContract.symbol()
            ])
            tokens.push({
              address: tokenAddr,
              symbol,
              balance: ethers.formatEther(balance)
            })
          } catch (err) {
            console.error(`Error loading token ${tokenAddr}:`, err)
          }
        }

        accountBalances.push({
          account: acc.address,
          name: acc.name,
          eth: ethers.formatEther(ethBalance),
          tokens
        })
      }

      setBalances(accountBalances)
    } catch (error) {
      console.error('Error loading balances:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBalances()
  }, [provider])

  return (
    <div className="border rounded-lg p-6 bg-white dark:bg-zinc-900">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Debug Balances</h2>
        <button
          onClick={loadBalances}
          disabled={loading}
          className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-4">
        {balances.map((acc) => (
          <div key={acc.account} className={`border rounded p-4 ${acc.name === 'Escrow Contract' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' : 'bg-gray-50 dark:bg-zinc-800'}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {acc.name}
                </div>
                <div className="font-mono text-xs break-all">
                  {acc.account}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center py-1">
                <span className="text-sm font-medium">ETH</span>
                <span className="font-mono text-sm">{parseFloat(acc.eth).toFixed(4)}</span>
              </div>

              {acc.tokens.map((token) => (
                <div key={token.address} className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{token.symbol}</span>
                    <span className="text-xs font-mono text-gray-500">
                      {token.address.slice(0, 6)}...{token.address.slice(-4)}
                    </span>
                  </div>
                  <span className="font-mono text-sm">{parseFloat(token.balance).toFixed(2)}</span>
                </div>
              ))}

              {acc.tokens.length === 0 && (
                <div className="text-xs text-gray-500 italic">No tokens loaded</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {balances.length === 0 && !loading && (
        <p className="text-gray-600 dark:text-gray-400 text-center py-4">
          Connect wallet to load balances
        </p>
      )}
    </div>
  )
}
