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
    // Revocar el permiso eth_accounts en MetaMask (EIP-2255): la billetera
    // queda realmente desconectada de la Dapp (y deja de aparecer como
    // conectada en la UI de MetaMask), no solo se limpia el estado local.
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        window.ethereum
          .request({
            method: 'wallet_revokePermissions',
            params: [{ eth_accounts: {} }],
          })
          .catch((err: unknown) => {
            // Algunos wallets no soportan wallet_revokePermissions;
            // igualmente se limpia el estado local.
            console.error('Error revoking wallet permissions:', err)
          })
      } catch (err) {
        console.error('Error revoking wallet permissions:', err)
      }
    }

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
          const network = await provider.getNetwork()
          
          // Only auto-connect if we are actually on Anvil local node
          if (network.chainId !== 31337n) {
            console.warn("MetaMask is connected to the wrong network. Expected Anvil (31337).")
            return
          }

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
      
      // Ensure we are on Anvil local network (Chain ID 31337 / 0x7a69)
      const network = await provider.getNetwork()
      if (network.chainId !== 31337n) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7a69' }],
          })
        } catch (switchError) {
          // This error code indicates that the chain has not been added to MetaMask.
          const code =
            switchError && typeof switchError === 'object' && 'code' in switchError
              ? (switchError as { code?: number }).code
              : undefined
          if (code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x7a69',
                  chainName: 'Anvil Localhost',
                  rpcUrls: ['http://127.0.0.1:8545'],
                  nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18,
                  },
                },
              ],
            })
          } else {
            throw switchError
          }
        }
      }

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
