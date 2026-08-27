'use client'

import { useState } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { useUserRole, useSocioApplications } from '@/lib/hooks'
import { BRLT_ADDRESS } from '@/lib/contracts'
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
}

export default function SocioVotingPage() {
  const { account } = useEthereum()
  const role = useUserRole()
  const { applyForSocio, voteSocioApplication, resolveSocioApplication } = useSocioApplications()

  const [applications, setApplications] = useState<Application[]>([
    {
      id: 0,
      candidate: '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
      motivation: 'Abogado especialista en contratos mercantiles y arbitraje comercial en Barlovento. Compromiso con mediación justa.',
      depositAmount: '500.00 BRLT',
      yesVotes: 2,
      noVotes: 0,
      daysLeft: 3,
      status: 'voting',
    },
    {
      id: 1,
      candidate: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
      motivation: 'Empresario local con más de 1,200 truekes exitosos y 98% efectividad. Deseo apoyar en la resolución de disputas.',
      depositAmount: '500.00 BRLT',
      yesVotes: 2,
      noVotes: 0,
      daysLeft: 4,
      status: 'voting',
    },
  ])

  const [motivation, setMotivation] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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
      setApplications(prev =>
        prev.map(a =>
          a.id === appId
            ? {
                ...a,
                yesVotes: support ? a.yesVotes + 1 : a.yesVotes,
                noVotes: !support ? a.noVotes + 1 : a.noVotes,
              }
            : a
        )
      )
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
              <Link href="/dashboard" className="text-xs text-indigo-600 hover:underline">
                ← Volver al Panel
              </Link>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs tracking-wider uppercase text-purple-700 font-semibold">
                Suite de Gobernanza
              </span>
            </div>
            <h1 className="text-4xl font-serif text-slate-900 leading-tight">
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
          {/* LISTA DE POSTULACIONES ACTIVAS */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-serif text-slate-900">
              Postulaciones en Votación Activa ({applications.length})
            </h2>

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
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                          Ventana de 5 Días ({app.daysLeft} días restantes)
                        </span>
                      </div>
                      <p className="font-mono text-xs text-slate-500">{app.candidate}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900 block">
                        Depósito en Garantía
                      </span>
                      <span className="text-xs text-indigo-600 font-mono font-semibold">
                        {app.depositAmount}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                    "{app.motivation}"
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

                    {role.isSocio ? (
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
                        Solo los Socios activos pueden emitir votos.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FORMULARIO POSTULACIÓN */}
          <div>
            <div className="bg-purple-50/50 rounded-[2rem] border border-purple-200/70 p-6 shadow-sm">
              <h3 className="text-lg font-serif text-purple-950 mb-2">
                Postularme como Socio Árbitro
              </h3>
              <p className="text-xs text-purple-900/70 mb-6 font-light">
                Requiere nivel Certificado y depósito de <strong>500 BRLT</strong>. Si tu solicitud es aprobada por mayoría simple, el depósito pasa a la tesorería de la plataforma para gastos operativos.
              </p>

              <form onSubmit={handleApply} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Motivación y Experiencia
                  </label>
                  <textarea
                    rows={4}
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    placeholder="Describe tu trayectoria comercial, capacidad de mediación y razones para ser Socio Árbitro..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-purple-100 text-[11px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Depósito requerido:</span>
                    <strong className="text-purple-700">500 BRLT</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Ventana de votación:</span>
                    <strong>5 días</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Criterio:</span>
                    <strong>Mayoría simple (&gt;50%)</strong>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Procesando...' : 'Enviar Solicitud On-Chain'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
