'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { ethers } from 'ethers'

/** Provider inyectado por MetaMask (extiende EIP-1193 con eventos). */
export interface EthereumProvider extends ethers.Eip1193Provider {
  on(event: string, handler: (...args: unknown[]) => void): void
  removeListener(event: string, handler: (...args: unknown[]) => void): void
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

interface EthereumContextType {
  provider: ethers.BrowserProvider | null
  signer: ethers.Signer | null
  account: string | null
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => void
}

const EthereumContext = createContext<EthereumContextType>({
  provider: null,
  signer: null,
  account: null,
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
})

export function EthereumProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const disconnect = useCallback(() => {
    setProvider(null)
    setSigner(null)
    setAccount(null)
    setIsConnected(false)
  }, [])

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum)
          const accounts = await provider.send('eth_accounts', [])

          if (accounts.length > 0) {
            const signer = await provider.getSigner()
            setProvider(provider)
            setSigner(signer)
            setAccount(accounts[0])
            setIsConnected(true)
          }
        } catch (error) {
          console.error('Error checking connection:', error)
        }
      }
    }

    checkConnection()
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = async (...args: unknown[]) => {
        const accounts = (args[0] ?? []) as string[]
        if (accounts.length === 0) {
          disconnect()
        } else {
          // Update signer when account changes
          if (provider) {
            try {
              const newSigner = await provider.getSigner()
              setSigner(newSigner)
              setAccount(accounts[0])
            } catch (error) {
              console.error('Error updating signer:', error)
              setAccount(accounts[0])
            }
          } else {
            setAccount(accounts[0])
          }
        }
      }

      const handleChainChanged = () => {
        window.location.reload()
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum?.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [provider, disconnect])

  const connect = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!')
      return
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])
      const signer = await provider.getSigner()

      setProvider(provider)
      setSigner(signer)
      setAccount(accounts[0] as string)
      setIsConnected(true)
    } catch (error) {
      console.error('Error connecting:', error)
    }
  }

  return (
    <EthereumContext.Provider value={{ provider, signer, account, isConnected, connect, disconnect }}>
      {children}
    </EthereumContext.Provider>
  )
}

export function useEthereum() {
  return useContext(EthereumContext)
}
