'use client'

import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { useEthereum } from '@/lib/ethereum'
import { useUserRole, useSocioApplications } from '@/lib/hooks'
import { BRLT_ADDRESS, GOVERNANCE_ADDRESS, GOVERNANCE_ABI } from '@/lib/contracts'
import Link from 'next/link'

interface Application {
  id: number
  candidate: string
  motivation: string
  depositAmount: string
  yesVotes: number
  noVotes: number
  daysLeft: number
  status: 'voting' | 'approved' | 'rejected'
  executed: boolean
  passed: boolean
  canVote: boolean
  hasVoted: boolean
}

const APPLICATION_WINDOW_SECONDS = 5n * 86400n

export default function SocioVotingPage() {
  const { account, provider } = useEthereum()
  const role = useUserRole()
  const { applyForSocio, voteSocioApplication } = useSocioApplications()

  const [applications, setApplications] = useState<Application[]>([])
  const [motivation, setMotivation] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingApps, setLoadingApps] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Carga las postulaciones REALES desde Governance (applicationCount + socioApplications)
  const loadApplications = useCallback(async () => {
    if (!provider) return
    try {
      const gov = new ethers.Contract(GOVERNANCE_ADDRESS, GOVERNANCE_ABI, provider)
      const count = Number(await gov.applicationCount())
      const now = BigInt(Math.floor(Date.now() / 1000))

      const apps: Application[] = []
      for (let i = 0; i < count; i++) {
        const a = await gov.socioApplications(i)
        if (!a.candidate || a.candidate === '0x0000000000000000000000000000000000000000') continue

        const windowEnd = BigInt(a.createdAt) + APPLICATION_WINDOW_SECONDS
        const daysLeft = windowEnd > now ? Math.max(1, Math.ceil(Number(windowEnd - now) / 86400)) : 0
        let hasVoted = false
        if (account) {
          try {
            hasVoted = Boolean(await gov.hasVotedApplication(i, account))
          } catch {
            hasVoted = false
          }
        }
        const executed = Boolean(a.executed)
        const passed = Boolean(a.passed)
        apps.push({
          id: Number(a.id),
          candidate: a.candidate,
          motivation: a.motivation || '',
          depositAmount: ethers.formatUnits(a.depositAmount, 18),
          yesVotes: Number(a.yes),
          noVotes: Number(a.no),
          daysLeft,
          status: executed ? (passed ? 'approved' : 'rejected') : 'voting',
          executed,
          passed,
          canVote: !executed && windowEnd >= now && !hasVoted,
          hasVoted,
        })
      }
      // Más recientes primero
      apps.reverse()
      setApplications(apps)
    } catch (err) {
      console.error('Error cargando postulaciones:', err)
      setError('No se pudieron cargar las postulaciones on-chain')
    } finally {
      setLoadingApps(false)
    }
  }, [provider, account])

  useEffect(() => {
    if (provider) {
      loadApplications()
    }
  }, [provider, loadApplications])

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motivation || motivation.length < 10) {
      setError('La motivación debe tener al menos 10 caracteres')
      return
    }
    setLoading(true)
    setError('')
    setMessage('')
    try {
      await applyForSocio(motivation, BRLT_ADDRESS, '500')
      setMessage('¡Postulación enviada exitosamente! Se ha abierto el periodo de votación de 5 días.')
      setMotivation('')
      await loadApplications()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (appId: number, support: boolean) => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      await voteSocioApplication(appId, support)
      setMessage(`Voto ${support ? 'A FAVOR' : 'EN CONTRA'} registrado con éxito.`)
      await loadApplications()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 pb-8 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/dashboard" className="text-xs text-teal-600 hover:underline">
                ← Volver al Panel
              </Link>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs tracking-wider uppercase text-purple-700 font-semibold">
                Suite de Gobernanza
              </span>
            </div>
            <h1 className="text-4xl font-heading text-slate-900 leading-tight">
              Admisión de Nuevos Socios & Votaciones
            </h1>
            <p className="text-slate-500 font-light mt-1">
              Votación comunitaria por mayoría simple durante 5 días. El depósito de garantía pasa a la plataforma al aprobarse.
            </p>
          </div>
        </div>

        {message && (
          <div className="mb-8 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-8 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* LISTA DE POSTULACIONES REALES */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-heading text-slate-900">
              Postulaciones en Votación ({applications.length})
            </h2>

            {loadingApps ? (
              <div className="text-center py-12 text-slate-400 text-sm font-light">
                Cargando postulaciones on-chain...
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-300 rounded-[2rem] text-slate-400 text-sm font-light">
                No hay postulaciones a Socio registradas en Governance.
              </div>
            ) : (
              <div className="space-y-6">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-slate-900">
                            Postulación #{app.id}
                          </span>
                          {app.status === 'voting' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                              En Votación
                            </span>
                          ) : app.status === 'approved' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                              Aprobada
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                              Rechazada
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                          {app.status === 'voting'
                            ? `Ventana de 5 Días (${app.daysLeft} día(s) restante(s))`
                            : 'Votación Cerrada'}
                        </span>
                        <p className="font-mono text-xs text-slate-500 mt-1">{app.candidate}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900 block">
                          Depósito en Garantía
                        </span>
                        <span className="text-xs text-teal-600 font-mono font-semibold">
                          {app.depositAmount} BRLT
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                      &ldquo;{app.motivation}&rdquo;
                    </p>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
                      <div className="flex items-center gap-4 text-xs font-semibold">
                        <span className="text-emerald-600 flex items-center gap-1">
                          ✓ {app.yesVotes} A Favor
                        </span>
                        <span className="text-rose-600 flex items-center gap-1">
                          ✗ {app.noVotes} En Contra
                        </span>
                      </div>

                      {app.status === 'voting' && role.isSocio ? (
                        app.hasVoted ? (
                          <span className="text-[11px] text-slate-400 italic">
                            Ya votaste en esta postulación.
                          </span>
                        ) : app.canVote ? (
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => handleVote(app.id, true)}
                              disabled={loading}
                              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-semibold transition"
                            >
                              Votar A Favor (SÍ)
                            </button>
                            <button
                              onClick={() => handleVote(app.id, false)}
                              disabled={loading}
                              className="flex-1 sm:flex-none px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-semibold transition"
                            >
                              Votar En Contra (NO)
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            La ventana de votación cerró.
                          </span>
                        )
                      ) : app.status === 'voting' ? (
                        <span className="text-[11px] text-slate-400 italic">
                          Solo los Socios activos pueden emitir votos.
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FORMULARIO DE POSTULACIÓN */}
          <div className="space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
              <h2 className="text-xl font-heading text-slate-900 mb-2">Postularse como Socio</h2>
              <p className="text-xs text-slate-500 font-light leading-relaxed mb-6">
                Deposita 500 BRLT en garantía y comparte tu motivación. Los Socios actuales votarán tu admisión durante 5 días.
              </p>

              <form onSubmit={handleApply} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Motivación / Hoja de Vida
                  </label>
                  <textarea
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    placeholder="Explícale a la comunidad por qué deseas ser Socio y qué aportarás como mediador..."
                    rows={5}
                    minLength={10}
                    required
                    className="w-full px-4 py-3 bg-slate-50/50 rounded-2xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition resize-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  <span className="font-bold text-slate-800">Depósito:</span> 500 BRLT (aprobado → tesorería; rechazado → reembolso)
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-purple-700 hover:bg-purple-800 text-white rounded-full text-xs font-bold uppercase tracking-wider transition shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Procesando...' : 'Enviar Postulación'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
