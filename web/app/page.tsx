'use client'

import { useState, useEffect, useCallback } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI } from '@/lib/contracts'
import { ethers } from 'ethers'
import { LandingPage } from '@/components/LandingPage'
import { FloatingToolDrawer } from '@/components/FloatingToolDrawer'
import { ExchangePlatform } from '@/components/ExchangePlatform'

export default function Home() {
  const { account, isConnected, provider } = useEthereum()
  const [isRegistered, setIsRegistered] = useState<boolean>(false)
  const [currentUsername, setCurrentUsername] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'trade' | 'create' | 'tokens'>('trade')

  const verifyUserRegistration = useCallback(async () => {
    if (!provider || !account) {
      setIsRegistered(false)
      setCurrentUsername('')
      return
    }

    try {
      const registryContract = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, provider)
      const registered: boolean = await registryContract.isRegistered(account)
      setIsRegistered(registered)

      if (registered) {
        const profile = await registryContract.getUserProfile(account)
        setCurrentUsername(profile.username)
      } else {
        setCurrentUsername('')
      }
    } catch (err) {
      console.error('Error verifying user registration on page:', err)
      setIsRegistered(false)
    }
  }, [provider, account])

  useEffect(() => {
    verifyUserRegistration()
  }, [verifyUserRegistration])

  const canAccessExchange = isConnected && isRegistered

  return (
    <div className="relative">
      {/* 
        Access Control Gating:
        - If connected & registered on-chain -> Shows ExchangePlatform interface
        - Otherwise (visitor, disconnected or unregistered) -> Shows LandingPage
      */}
      {canAccessExchange ? (
        <ExchangePlatform
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUsername={currentUsername}
        />
      ) : (
        <LandingPage />
      )}

      {/* Floating Tool Drawer Navigation (Cajón de Herramientas) */}
      <FloatingToolDrawer
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRegistrationChange={verifyUserRegistration}
      />
    </div>
  )
}
