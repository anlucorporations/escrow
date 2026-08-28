'use client'

import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { useEthereum } from '@/lib/ethereum'
import { useEscrow } from '@/lib/hooks'
import { USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI } from '@/lib/contracts'
function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function AwardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  )
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function RefreshIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}

function AlertTriangleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

interface AdminUserRow {
  address: string
  username: string
  identification_level: 'inscrito' | 'verificado' | 'certificado'
  trust_level: string
  terms_accepted: boolean
  email_verified: boolean
  two_factor_enabled: boolean
  sbt_provider: string
  sbt_verified_at: number
  kyc_status: string
}

export default function AdminIdentityPage() {
  const { account, isConnected, provider } = useEthereum()
  const { roles } = useEscrow()

  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadUsers = useCallback(async () => {
    if (!provider || !account) return
    try {
      setLoading(true)
      // Directorio real on-chain (UserRegistry.getRegisteredWalletsPaged)
      const registry = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, provider)
      const profiles = await registry.getRegisteredWalletsPaged(0, 100)

      // Enriquecer con la capa de datos (2FA, SBT, KYC) vía /api/identity
      const rows = await Promise.all(
        (profiles as Array<{ wallet: string; username: string; identificationLevel: number }>).map(async (p) => {
          let extra: Record<string, unknown> = {}
          try {
            const res = await fetch(`/api/identity/${p.wallet}?requester=${account}`)
            const data = await res.json()
            if (data.profile) extra = data.profile
          } catch {
            // perfil off-chain no disponible: se muestran solo datos on-chain
          }
          const levelMap = ['inscrito', 'verificado', 'certificado'] as const
          return {
            address: p.wallet,
            username: p.username || '',
            identification_level:
              (levelMap[Number(p.identificationLevel)] as AdminUserRow['identification_level']) ?? 'inscrito',
            trust_level: (extra.trust_level as string) || 'iniciado',
            terms_accepted: Boolean(extra.terms_accepted),
            email_verified: Boolean(extra.email_verified),
            two_factor_enabled: Boolean(extra.two_factor_enabled),
            sbt_provider: (extra.sbt_provider as string) || '',
            sbt_verified_at: Number(extra.sbt_verified_at) || 0,
            kyc_status: (extra.kyc_status as string) || 'pending',
          }
        })
      )
      setUsers(rows)
    } catch {
      setStatusMsg({ type: 'error', text: 'Error al cargar datos de administración' })
    } finally {
      setLoading(false)
    }
  }, [provider, account])

  useEffect(() => {
    if (isConnected && account) {
      loadUsers()
    }
  }, [isConnected, account, loadUsers])

  const handleApproveKYC = async (userAddress: string) => {
    try {
      setActionLoading(true)
      const res = await fetch(`/api/users/${userAddress}/kyc`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // El admin no conoce los datos privados del usuario: el servidor conserva
        // los valores ya cifrados y solo aprueba el estado KYC/Nivel 3.
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.ok) {
        setStatusMsg({ type: 'success', text: `KYC y Certificación Nivel 3 aprobados para ${userAddress.slice(0, 6)}... ✓` })
        await loadUsers()
      }
    } catch (err) {
      const e = err as { message?: string }
      setStatusMsg({ type: 'error', text: e.message || 'Error al aprobar KYC' })
    } finally {
      setActionLoading(false)
    }
  }

  if (!roles.isOwner && !loading) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <AlertTriangleIcon className="w-12 h-12 text-amber-600 mx-auto" />
        <h2 className="text-2xl font-serif font-bold text-gray-900">Acceso Restringido al Administrador</h2>
        <p className="text-sm text-gray-600">
          Este módulo solo puede ser administrado por el Owner de TrueKeate o por el contrato de Gobernanza.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header Velvety */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-800 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldIcon className="w-4 h-4 text-amber-700" />
            Panel Exclusivo de Administración
          </div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Gestión Global de Identidades y SBTs</h1>
        </div>

        <button
          onClick={loadUsers}
          disabled={loading}
          className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <RefreshIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar Registros
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 ${
            statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <CheckCircleIcon className="w-5 h-5" />
          <span className="flex-1">{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-xs underline font-semibold">Cerrar</button>
        </div>
      )}

      {/* Grid de Proveedores SBT y Auditoría */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4 md:col-span-1">
          <h3 className="text-base font-serif font-bold text-gray-900 flex items-center gap-2">
            <AwardIcon className="w-5 h-5 text-amber-700" />
            Proveedores de SBTs de Terceros
          </h3>
          <p className="text-xs text-stone-600">
            Administra la lista blanca de contratos SBT externos admitidos en <code className="text-amber-800 font-bold">SBTRegistry.sol</code>.
          </p>

          <div className="space-y-2 pt-2">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs flex justify-between items-center">
              <div>
                <p className="font-bold text-stone-900">Binance BABT</p>
                <p className="text-stone-500 font-mono text-[10px]">0x2B09...472C</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Activo</span>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs flex justify-between items-center">
              <div>
                <p className="font-bold text-stone-900">WorldID / Worldcoin</p>
                <p className="text-stone-500 font-mono text-[10px]">EAS / WorldID Hub</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Activo</span>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs flex justify-between items-center">
              <div>
                <p className="font-bold text-stone-900">Gitcoin Passport</p>
                <p className="text-stone-500 font-mono text-[10px]">Stamps Registry</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Activo</span>
            </div>
          </div>
        </div>

        {/* Tabla de Usuarios Registrados */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4 md:col-span-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-base font-serif font-bold text-gray-900 flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-amber-700" />
              Directorio de Identidades TrueKeate
            </h3>
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Buscar billetera..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-1.5 border border-stone-300 rounded-lg text-xs w-full sm:w-48"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider">
                  <th className="py-2.5 font-semibold">Billetera</th>
                  <th className="py-2.5 font-semibold">Nivel</th>
                  <th className="py-2.5 font-semibold">2FA</th>
                  <th className="py-2.5 font-semibold">SBT / Origen</th>
                  <th className="py-2.5 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map((u) => (
                  <tr key={u.address} className="hover:bg-stone-50/50">
                    <td className="py-3 font-mono text-stone-900 font-medium">
                      {u.address.slice(0, 6)}...{u.address.slice(-4)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.identification_level === 'certificado'
                            ? 'bg-amber-100 text-amber-800'
                            : u.identification_level === 'verificado'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {u.identification_level}
                      </span>
                    </td>
                    <td className="py-3">
                      {u.two_factor_enabled ? (
                        <span className="text-emerald-600 font-semibold">Activo ✓</span>
                      ) : (
                        <span className="text-stone-400">Inactivo</span>
                      )}
                    </td>
                    <td className="py-3 text-stone-600">
                      {u.sbt_provider || 'Pendiente'}
                    </td>
                    <td className="py-3 text-right">
                      {u.identification_level !== 'certificado' && (
                        <button
                          onClick={() => handleApproveKYC(u.address)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded text-[11px] font-semibold transition-colors"
                        >
                          Aprobar Nivel 3
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
