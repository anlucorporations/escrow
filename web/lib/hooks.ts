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
  GOVERNANCE_ADDRESS,
  GOVERNANCE_ABI,
  SUBSCRIPTION_ADDRESS,
  SUBSCRIPTION_ABI,
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

  // A3.1: Una única instancia memoizada del contrato — no se recrea en cada llamada.
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
      if (!contract || !account) {
        setRoles({ isOwner: false, isArbiter: false, owner: null, arbiter: null })
        return
      }
      try {
        const [owner, arbiter] = await Promise.all([contract.owner(), contract.arbiter()])
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
  }, [contract, account])

  const getSigner = useCallback(async () => {
    if (!provider) throw new Error('Conecta tu billetera primero')
    return provider.getSigner()
  }, [provider])

  // ------------------------------------------------------------ queries

  const getAllowedTokens = useCallback(async (): Promise<string[]> => {
    if (!contract) return []
    const tokens: string[] = await contract.getAllowedTokens()
    return tokens.map((t: string) => ethers.getAddress(t))
  }, [contract])

  const getOperationsCount = useCallback(async (): Promise<number> => {
    if (!contract) return 0
    try {
      const count = await contract.getOperationsCount()
      return Number(count)
    } catch (err) {
      console.warn("Error fetching operations count (wrong network?):", err)
      return 0
    }
  }, [contract])

  /** Paginación real contra el contrato (getOperations(offset, limit)). */
  const getOperations = useCallback(
    async (offset = 0, limit = 50): Promise<Operation[]> => {
      if (!contract) return []
      try {
        const raw = (await contract.getOperations(offset, limit)) as unknown as RawOperation[]
        return raw.map((op) => toOperation(op))
      } catch (err) {
        console.warn("Error fetching operations (wrong network?):", err)
        return []
      }
    },
    [contract]
  )

  const getOperation = useCallback(
    async (id: bigint): Promise<Operation | null> => {
      if (!contract) return null
      const raw = await contract.getOperation(id)
      return toOperation(raw)
    },
    [contract]
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

  // A1.1: resolveDispute ya no necesita `recipient` — user2 está on-chain
  const resolveDispute = useCallback(
    async (id: bigint, favorUser1: boolean) => {
      const signer = await getSigner()
      const c = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer)
      const tx = await c.resolveDispute(id, favorUser1)
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

export interface RegisterParams {
  username: string
  email: string
  phone: string
  physicalAddress: string
  utmEasting: number
  utmNorthing: number
  utmZone: number
  isNorthernHemisphere: boolean
}

export interface RegistrationState {
  isRegistered: boolean
  username: string | null
  loading: boolean
  /** Inscribe la billetera conectada y re-verifica on-chain con 4 datos únicos y coordenadas UTM. */
  register: (params: RegisterParams | string) => Promise<void>
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
      const normalized = ethers.getAddress(account)
      const c = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, provider)
      const [registered, profile] = await Promise.all([
        c.isRegistered(normalized).catch(() => false),
        c.getUserProfile(normalized).catch(() => null),
      ])

      const isReg = Boolean(registered || profile?.isRegistered || profile?.[3])
      const uname = profile?.username || profile?.[1] || null

      setIsRegistered(isReg)
      setUsername(isReg ? uname : null)
    } catch {
      setIsRegistered(false)
      setUsername(null)
    } finally {
      setLoading(false)
    }
  }, [provider, account])

  useEffect(() => {
    if (isConnected && account) {
      refresh()
    } else {
      setIsRegistered(false)
      setUsername(null)
      setLoading(false)
    }

    // Escuchar evento global de registro para sincronizar otros componentes
    const handleRegistered = () => refresh()
    window.addEventListener('user-registered', handleRegistered)
    
    return () => {
      window.removeEventListener('user-registered', handleRegistered)
    }
  }, [isConnected, account, refresh])

  const register = useCallback(
    async (paramsInput: RegisterParams | string) => {
      if (!provider || !account) {
        throw new Error('Conecta tu billetera primero')
      }

      let p: RegisterParams
      if (typeof paramsInput === 'string') {
        const uname = paramsInput.trim()
        p = {
          username: uname,
          email: `${uname.toLowerCase()}@truekeate.com`,
          phone: '+584120000000',
          physicalAddress: 'Barlovento, Miranda, Venezuela',
          utmEasting: 729450,
          utmNorthing: 1159800,
          utmZone: 19,
          isNorthernHemisphere: true,
        }
      } else {
        p = {
          username: paramsInput.username.trim(),
          email: paramsInput.email.trim(),
          phone: paramsInput.phone.trim(),
          physicalAddress: paramsInput.physicalAddress.trim(),
          utmEasting: Math.round(paramsInput.utmEasting),
          utmNorthing: Math.round(paramsInput.utmNorthing),
          utmZone: Number(paramsInput.utmZone) || 19,
          isNorthernHemisphere: Boolean(paramsInput.isNorthernHemisphere),
        }
      }

      if (p.username.length < 3 || p.username.length > 20) {
        throw new Error('El nombre de usuario debe tener entre 3 y 20 caracteres')
      }
      if (!/^[a-zA-Z0-9_]+$/.test(p.username)) {
        throw new Error('Solo se permiten letras, números y guiones bajos (_) en el usuario')
      }
      if (!p.email || !p.email.includes('@')) {
        throw new Error('El correo electrónico es obligatorio y debe ser válido')
      }
      if (!p.phone || p.phone.length < 7) {
        throw new Error('El teléfono móvil es obligatorio')
      }
      if (!p.physicalAddress || p.physicalAddress.length < 3) {
        throw new Error('La dirección de ubicación física es obligatoria')
      }

      const signer = await provider.getSigner()
      const c = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, signer)
      
      // Verificar si ya está inscrito
      const already = await c.isRegistered(account).catch(() => false)
      if (already) {
        await refresh()
        window.dispatchEvent(new Event('user-registered'))
        return
      }

      const tx = await c.register(
        p.username,
        p.email,
        p.phone,
        p.physicalAddress,
        p.utmEasting,
        p.utmNorthing,
        p.utmZone,
        p.isNorthernHemisphere
      )
      await tx.wait()
      
      // Actualizar estado local inmediatamente
      setIsRegistered(true)
      setUsername(p.username)
      await refresh()
      
      // Notificar a otras instancias del hook (ej. AccessGate, Header, UserMenu)
      window.dispatchEvent(new Event('user-registered'))
    },
    [provider, account, refresh]
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

export interface UserRoleInfo {
  isOwner: boolean
  isArbiter: boolean
  isSocio: boolean
  isBusiness: boolean
  isBusinessActive: boolean
  roleKey: 'admin' | 'socio' | 'business' | 'particular'
  roleLabel: string
  roleDescription: string
  badgeBg: string
  badgeText: string
  loading: boolean
}

/**
 * Hook para consultar el rol y nivel completo del usuario on-chain.
 */
export function useUserRole(): UserRoleInfo {
  const { provider, account, isConnected } = useEthereum()
  const [roleInfo, setRoleInfo] = useState<UserRoleInfo>({
    isOwner: false,
    isArbiter: false,
    isSocio: false,
    isBusiness: false,
    isBusinessActive: false,
    roleKey: 'particular',
    roleLabel: 'Usuario Particular',
    roleDescription: 'Intercambios P2P seguros entre pares con custodia bilateral.',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/30',
    badgeText: 'text-blue-700 dark:text-blue-300',
    loading: true,
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!provider || !account) {
        setRoleInfo({
          isOwner: false,
          isArbiter: false,
          isSocio: false,
          isBusiness: false,
          isBusinessActive: false,
          roleKey: 'particular',
          roleLabel: 'Usuario Particular',
          roleDescription: 'Intercambios P2P seguros entre pares con custodia bilateral.',
          badgeBg: 'bg-blue-100 dark:bg-blue-900/30',
          badgeText: 'text-blue-700 dark:text-blue-300',
          loading: false,
        })
        return
      }

      try {
        const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
        const gov = new ethers.Contract(GOVERNANCE_ADDRESS, GOVERNANCE_ABI, provider)
        const sub = new ethers.Contract(SUBSCRIPTION_ADDRESS, SUBSCRIPTION_ABI, provider)

        const [owner, arbiter, isSocioRaw, isBizRaw, isBizActiveRaw] = await Promise.all([
          escrow.owner().catch(() => null),
          escrow.arbiter().catch(() => null),
          gov.isSocio(account).catch(() => false),
          sub.businessFlag(account).catch(() => false),
          sub.isActive(account).catch(() => false),
        ])

        if (cancelled) return

        const isOwner = owner?.toLowerCase() === account.toLowerCase()
        const isArbiter = arbiter?.toLowerCase() === account.toLowerCase()
        const isSocio = Boolean(isSocioRaw)
        const isBusiness = Boolean(isBizRaw)
        const isBusinessActive = Boolean(isBizActiveRaw)

        let roleKey: 'admin' | 'socio' | 'business' | 'particular' = 'particular'
        let roleLabel = 'Usuario Particular'
        let roleDescription = 'Intercambios P2P seguros entre pares con custodia bilateral.'
        let badgeBg = 'bg-blue-100 dark:bg-blue-900/30'
        let badgeText = 'text-blue-700 dark:text-blue-300'

        if (isOwner) {
          roleKey = 'admin'
          roleLabel = 'Administrador Supremo'
          roleDescription = 'Control total sobre los tokens permitidos y la pausa del protocolo.'
          badgeBg = 'bg-fuchsia-100 dark:bg-fuchsia-900/30'
          badgeText = 'text-fuchsia-700 dark:text-fuchsia-300'
        } else if (isSocio) {
          roleKey = 'socio'
          roleLabel = 'Socio Árbitro'
          roleDescription = 'Mediador de disputas autorizado con poder de resolución on-chain.'
          badgeBg = 'bg-red-100 dark:bg-red-900/30'
          badgeText = 'text-red-700 dark:text-red-300'
        } else if (isBusiness) {
          roleKey = 'business'
          roleLabel = isBusinessActive ? 'Comerciante Verificado' : 'Comerciante (Inactivo)'
          roleDescription = 'Catálogo comercial propio, insignias de confianza y soporte BRLT.'
          badgeBg = isBusinessActive ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-gray-100 dark:bg-gray-800'
          badgeText = isBusinessActive ? 'text-amber-700 dark:text-amber-300' : 'text-gray-600 dark:text-gray-400'
        }

        setRoleInfo({
          isOwner,
          isArbiter,
          isSocio,
          isBusiness,
          isBusinessActive,
          roleKey,
          roleLabel,
          roleDescription,
          badgeBg,
          badgeText,
          loading: false,
        })
      } catch (e) {
        console.warn("Failed to load user role", e)
        if (!cancelled) {
          setRoleInfo(prev => ({ ...prev, loading: false }))
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [provider, account, isConnected])

  return roleInfo
}

export { getFriendlyError }

