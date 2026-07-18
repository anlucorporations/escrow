'use client'

import { useEthereum } from '@/lib/ethereum'

export function ConnectButton() {
  const { account, isConnected, connect, disconnect } = useEthereum()

  if (isConnected && account) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm font-mono">
          {account.slice(0, 6)}...{account.slice(-4)}
        </span>
        <button
          onClick={disconnect}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={connect}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      Connect Wallet
    </button>
  )
}
