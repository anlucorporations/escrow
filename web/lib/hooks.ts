'use client'

// Hooks compartidos de la DApp Escrow (una sola fuente de verdad).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { useEthereum } from '@/lib/ethereum'
import {
  ESCROW_ADDRESS,
  ESCROW_ABI,
  ERC20_ABI,
  USER_REGISTRY_ADDRESS,
  USER_REGISTRY_ABI,
} from '@/lib/contracts'
import {
  Operation,
  TokenInfo,
  RawOperation,
  toOperation,
  getFriendlyError,
} from '@/lib/escrow'
import { UserProfile } from '@/lib/items'

export interface RoleInfo {
  isOwner: boolean
  isArbiter: boolean
  owner: string | null
  arbiter: string | null
}

/**
 * Hook central de acceso al contrato Escrow: instancia del contrato, roles
 * (owner / árbitro) y acciones de escritura con approve encadenado.
 */
export function useEscrow() {
  const { provider, account, isConnected } = useEthereum()

  // Instancia del contrato derivada del provider (sin setState en efectos).
  const contract = useMemo(() => {
    if (!provider) return null
    return new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
  }, [provider])

  const [roles, setRoles] = useState<RoleInfo>({
    isOwner: false,
    isArbiter: false,
    owner: null,
    arbiter: null,
  })

  useEffect(() => {
    let cancelled = false
    const loadRoles = async () => {
      if (!provider || !account) {
        setRoles({ isOwner: false, isArbiter: false, owner: null, arbiter: null })
        return
      }
      try {
        const c = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
        const [owner, arbiter] = await Promise.all([c.owner(), c.arbiter()])
        if (cancelled) return
        setRoles({
          owner,
          arbiter,
          isOwner: owner.toLowerCase() === account.toLowerCase(),
          isArbiter: arbiter.toLowerCase() === account.toLowerCase(),
        })
      } catch {
        if (!cancelled) setRoles({ isOwner: false, isArbiter: false, owner: null, arbiter: null })
      }
    }
    loadRoles()
    return () => {
      cancelled = true
    }
  }, [provider, account])

  const getSigner = useCallback(async () => {
    if (!provider) throw new Error('Connect your wallet first')
    return provider.getSigner()
  }, [provider])

  // ------------------------------------------------------------ queries

  const getAllowedTokens = useCallback(async (): Promise<string[]> => {
    if (!provider) return []
    const c = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
    const tokens: string[] = await c.getAllowedTokens()
    return tokens.map((t: string) => ethers.getAddress(t))
  }, [provider])

  const getOperationsCount = useCallback(async (): Promise<number> => {
    if (!provider) return 0
    const c = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
    const count = await c.getOperationsCount()
    return Number(count)
  }, [provider])

  /** Paginación real contra el contrato (getOperations(offset, limit)). */
  const getOperations = useCallback(
    async (offset = 0, limit = 50): Promise<Operation[]> => {
      if (!provider) return []
      const c = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
      const raw = (await c.getOperations(offset, limit)) as unknown as RawOperation[]
      return raw.map((op) => toOperation(op))
    },
    [provider]
  )

  const getOperation = useCallback(
    async (id: bigint): Promise<Operation | null> => {
      if (!provider) return null
      const c = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
      const raw = await c.getOperation(id)
      return toOperation(raw)
    },
    [provider]
  )

  // ------------------------------------------------------------ actions

  /** Approve + createOperation en cadena (1 botón). */
  const createOperation = useCallback(
    async (params: {
      tokenA: string
      tokenB: string
      amountA: bigint
      amountB: bigint
      deadline: bigint
    }) => {
      const signer = await getSigner()
      const token = new ethers.Contract(params.tokenA, ERC20_ABI, signer)
      const tx1 = await token.approve(ESCROW_ADDRESS, params.amountA)
      await tx1.wait()
      const c = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer)
      const tx2 = await c.createOperation(
        params.tokenA,
        params.tokenB,
        params.amountA,
        params.amountB,
        params.deadline
      )
      await tx2.wait()
      return tx2
    },
    [getSigner]
  )

  /** Approve + completeOperation en cadena (1 botón). */
  const completeOperation = useCallback(
    async (op: Operation) => {
      const signer = await getSigner()
      const token = new ethers.Contract(op.tokenB, ERC20_ABI, signer)
      const tx1 = await token.approve(ESCROW_ADDRESS, op.amountB)
      await tx1.wait()
      const c = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer)
      const tx2 = await c.completeOperation(op.id)
      await tx2.wait()
      return tx2
    },
    [getSigner]
  )

  const cancelOperation = useCallback(
    async (id: bigint) => {
      const signer = await getSigner()
      const c = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer)
      const tx = await c.cancelOperation(id)
      await tx.wait()
      return tx
    },
    [getSigner]
  )

  const refundAfterExpiry = useCallback(
    async (id: bigint) => {
      const signer = await getSigner()
      const c = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer)
      const tx = await c.refundAfterExpiry(id)
      await tx.wait()
      return tx
    },
    [getSigner]
  )

  const disputeOperation = useCallback(
    async (id: bigint) => {
      const signer = await getSigner()
      const c = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer)
      const tx = await c.disputeOperation(id)
      await tx.wait()
      return tx
    },
    [getSigner]
  )

  const resolveDispute = useCallback(
    async (id: bigint, favorUser1: boolean, recipient: string) => {
      const signer = await getSigner()
      const c = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer)
      const tx = await c.resolveDispute(id, favorUser1, recipient)
      await tx.wait()
      return tx
    },
    [getSigner]
  )

  const addToken = useCallback(
    async (tokenAddress: string) => {
      const signer = await getSigner()
      const c = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer)
      const tx = await c.addToken(tokenAddress)
      await tx.wait()
      return tx
    },
    [getSigner]
  )

  const setArbiter = useCallback(
    async (arbiterAddress: string) => {
      const signer = await getSigner()
      const c = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer)
      const tx = await c.setArbiter(arbiterAddress)
      await tx.wait()
      return tx
    },
    [getSigner]
  )

  return {
    contract,
    provider,
    isConnected,
    account,
    roles,
    getAllowedTokens,
    getOperationsCount,
    getOperations,
    getOperation,
    createOperation,
    completeOperation,
    cancelOperation,
    refundAfterExpiry,
    disputeOperation,
    resolveDispute,
    addToken,
    setArbiter,
  }
}

/**
 * Hook que resuelve symbol / name / decimals de un token ERC20.
 * Los decimals dinámicos permiten formatear correctamente tokens con ≠18 decimales.
 */
export function useTokenInfo(addr: string | null | undefined) {  const { provider } = useEthereum()
  const [info, setInfo] = useState<TokenInfo | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!provider || !addr) {
        setInfo(null)
        return
      }
      setLoading(true)
      try {
        const token = new ethers.Contract(addr, ERC20_ABI, provider)
        const [name, symbol, decimals] = await Promise.all([
          token.name(),
          token.symbol(),
          token.decimals(),
        ])
        if (!cancelled) setInfo({ address: addr, name, symbol, decimals: Number(decimals) })
      } catch {
        if (!cancelled) setInfo({ address: addr, name: 'Unknown', symbol: addr.slice(0, 6), decimals: 18 })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [provider, addr])

  return { info, loading }
}

/**
 * Hook que carga los tokens autorizados por el contrato con su metadata
 * (symbol / name / decimals). Fuente única para selects y listas.
 */
export function useAllowedTokens() {
  const { provider } = useEthereum()
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!provider) {
        setTokens([])
        return
      }
      setLoading(true)
      try {
        const c = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
        const addresses: string[] = await c.getAllowedTokens()
        const infos = await Promise.all(
          addresses.map(async (addr: string) => {
            try {
              const token = new ethers.Contract(addr, ERC20_ABI, provider)
              const [name, symbol, decimals] = await Promise.all([
                token.name(),
                token.symbol(),
                token.decimals(),
              ])
              return { address: ethers.getAddress(addr), name, symbol, decimals: Number(decimals) }
            } catch {
              return { address: addr, name: 'Unknown', symbol: addr.slice(0, 6), decimals: 18 }
            }
          })
        )
        if (!cancelled) setTokens(infos)
      } catch {
        if (!cancelled) setTokens([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [provider])

  return { tokens, loading }
}

export interface RegistrationState {
  isRegistered: boolean
  username: string | null
  loading: boolean
  /** Inscribe la billetera conectada y re-verifica on-chain. */
  register: (username: string) => Promise<void>
  refresh: () => Promise<void>
}

/**
 * Hook de inscripción on-chain (UserRegistry): la fuente de verdad es el
 * contrato; tras cada transacción se re-verifica registered(address).
 */
export function useRegistration(): RegistrationState {
  const { provider, account, isConnected } = useEthereum()
  const [isRegistered, setIsRegistered] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!provider || !account) {
      setIsRegistered(false)
      setUsername(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const c = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, provider)
      const [registered, profile] = await Promise.all([
        c.isRegistered(account),
        c.getUserProfile(account),
      ])
      setIsRegistered(Boolean(registered))
      setUsername(profile?.username ?? null)
    } catch {
      setIsRegistered(false)
      setUsername(null)
    } finally {
      setLoading(false)
    }
  }, [provider, account])

  useEffect(() => {
    if (isConnected) {
      refresh()
    } else {
      setIsRegistered(false)
      setUsername(null)
      setLoading(false)
    }
  }, [isConnected, refresh])

  const register = useCallback(
    async (usernameInput: string) => {
      if (!provider) throw new Error('Connect your wallet first')
      const signer = await provider.getSigner()
      const c = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, signer)
      const tx = await c.register(usernameInput.trim())
      await tx.wait()
      await refresh() // verificación on-chain tras la inscripción
    },
    [provider, refresh]
  )

  return { isRegistered, username, loading, register, refresh }
}

/**
 * Perfil público de un usuario (reputación, nivel de confianza) desde la
 * capa de datos (M3/M4). Fuente: GET /api/users/[address].
 */
export function useProfile(address: string | null | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!address) {
        setProfile(null)
        return
      }
      setLoading(true)
      try {
        const { fetchProfile } = await import('@/lib/items')
        const data = await fetchProfile(address)
        if (!cancelled) setProfile(data)
      } catch {
        if (!cancelled) setProfile(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [address])

  return { profile, loading }
}

export { getFriendlyError }
