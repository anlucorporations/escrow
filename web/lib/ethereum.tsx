'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { ethers } from 'ethers'

declare global {
  interface Window {
    ethereum?: any
  }
}

interface EthereumContextType {
  provider: ethers.BrowserProvider | null
  signer: ethers.Signer | null
  account: string | null
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

const EthereumContext = createContext<EthereumContextType>({
  provider: null,
  signer: null,
  account: null,
  isConnected: false,
  connect: async () => {},
  disconnect: async () => {},
})

export function EthereumProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const clearLocalState = useCallback(() => {
    setProvider(null)
    setSigner(null)
    setAccount(null)
    setIsConnected(false)
  }, [])

  const disconnect = useCallback(async () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('is_wallet_disconnected', 'true')

      if (window.ethereum && window.ethereum.request) {
        try {
          // Revoke MetaMask permissions to disconnect the wallet completely from the DApp
          await window.ethereum.request({
            method: 'wallet_revokePermissions',
            params: [{ eth_accounts: {} }],
          })
        } catch (err) {
          console.log('Revoke permissions error or not supported:', err)
        }
      }
    }

    clearLocalState()
  }, [clearLocalState])

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        if (localStorage.getItem('is_wallet_disconnected') === 'true') {
          return
        }

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
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          clearLocalState()
        } else {
          if (localStorage.getItem('is_wallet_disconnected') !== 'true') {
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
  }, [provider, clearLocalState])

  const connect = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!')
      return
    }

    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('is_wallet_disconnected')
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])
      const signer = await provider.getSigner()

      setProvider(provider)
      setSigner(signer)
      setAccount(accounts[0])
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
