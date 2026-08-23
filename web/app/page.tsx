'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useEthereum } from '@/lib/ethereum'
import { useRegistration } from '@/lib/hooks'
import { useRegisterModal } from '@/components/RegisterModal'
import { PlatformStats } from '@/lib/stats'

export default function Home() {
  const { isConnected, connect } = useEthereum()
  const { isRegistered } = useRegistration()
  const { openRegister } = useRegisterModal()
  const [stats, setStats] = useState<PlatformStats | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PlatformStats | null) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {
        if (!cancelled) setStats(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleCta = () => {
    if (!isConnected) connect()
    else if (!isRegistered) openRegister()
    // si está inscrito, el CTA ya apunta a /operations
  }

  const statItems = [
    {
      label: 'Operaciones completadas',
      value: stats ? String(stats.completedOperations) : '—',
      hint: 'intercambios atómicos liquidados',
    },
    {
      label: 'Comunidad inscrita',
      value: stats ? String(stats.users) : '—',
      hint: 'usuarios verificados on-chain',
    },
    {
      label: 'Tokens soportados',
      value: stats ? String(stats.tokens) : '—',
      hint: 'ERC20 autorizados por el admin',
    },
    {
      label: 'Operaciones activas',
      value: stats ? String(stats.activeOperations) : '—',
      hint: 'fondos en custodia bilateral',
    },
  ]

  const security = [
    {
      title: 'Custodia bilateral',
      desc: 'El contrato retiene el Token A antes de publicar la oferta. Nadie pierde nada mientras espera a su contraparte.',
    },
    {
      title: 'Intercambio atómico',
      desc: 'Ambos pagos ocurren en la misma transacción: o ambos reciben lo suyo, o nadie recibe nada.',
    },
    {
      title: 'Expiración automática',
      desc: 'Con deadline configurado, el creador recupera sus fondos automáticamente si la oferta vence sin contraparte.',
    },
    {
      title: 'Arbitraje on-chain',
      desc: 'Disputas resueltas por un árbitro designado, con trazabilidad total en la blockchain.',
    },
  ]

  const benefits = [
    'Sin intermediarios ni custodia de la plataforma',
    'Liquidación en una sola transacción',
    'Transparencia total: todo es verificable on-chain',
    'Deadline (plazo) configurable por operación',
    'Disputas y arbitraje con trazabilidad',
    'Acceso solo para usuarios inscritos on-chain',
  ]

  const reviews = [
    {
      name: 'María G.',
      role: 'Freelancer',
      text: 'Cobré un proyecto con el modo PAGO con garantía: el cliente depositó los USDT, entregué mi recibo y recibí el pago al instante. Cero confianza, cero comisiones.',
    },
    {
      name: 'Luis R.',
      role: 'Trader P2P',
      text: 'Hago swaps TKA↔TKB sin conocer a la contraparte. El intercambio atómico elimina el riesgo de que alguien no cumpla.',
    },
    {
      name: 'Ana P.',
      role: 'Admin de comunidad',
      text: 'La expiración automática me salvó de fondos bloqueados: mi oferta venció y recuperé todo con un clic. El arbitraje da mucha tranquilidad.',
    },
  ]

  const awards = [
    '🏆 Ganador Hackathon DeFi 2025',
    '🥇 Mejor caso práctico de Escrow',
    '🌟 Proyecto destacado de intercambio P2P',
    '🔒 Certificación de seguridad on-chain',
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Hero */}
      <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="inline-block px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 mb-8">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Escrow Protocol — intercambio sin confianza
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
            Intercambia tokens entre pares,
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              sin intermediarios.
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed mb-10">
            Custodia bilateral con intercambio atómico, plazos de expiración y
            arbitraje on-chain. Una plataforma de intercambio segura, transparente
            y accesible solo para su comunidad inscrita.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isConnected && isRegistered ? (
              <Link
                href="/operations"
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg"
              >
                Explorar la plataforma
              </Link>
            ) : (
              <button
                onClick={handleCta}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg"
              >
                {!isConnected
                  ? 'Conectar billetera'
                  : isRegistered
                    ? 'Explorar la plataforma'
                    : 'Inscribirme en la plataforma'}
              </button>
            )}
            <a
              href="#ventajas"
              className="px-8 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:border-blue-500 transition-all duration-200"
            >
              Conocer más
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-y border-gray-100 dark:border-zinc-800">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {statItems.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">{s.label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{s.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="ventajas" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Ventajas de seguridad
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              La lógica del contrato protege a ambas partes en cada paso
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {security.map((item) => (
              <div
                key={item.title}
                className="p-8 rounded-xl border border-gray-100 dark:border-zinc-800 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-zinc-900/50">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Beneficios del exchange
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Todo lo que ganas al operar en la plataforma
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((b) => (
              <div
                key={b}
                className="flex items-start gap-3 p-5 rounded-lg border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              >
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-gray-700 dark:text-gray-300">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Reseñas de usuarios
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Lo que dice la comunidad que ya opera con la plataforma
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {reviews.map((r) => (
              <figure key={r.name} className="p-8 rounded-xl border border-gray-100 dark:border-zinc-800">
                <div className="flex gap-0.5 mb-4 text-amber-400" aria-label="5 estrellas">
                  {'★★★★★'.split('').map((s, i) => (
                    <span key={i}>{s}</span>
                  ))}
                </div>
                <blockquote className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                  “{r.text}”
                </blockquote>
                <figcaption>
                  <p className="font-semibold text-gray-900 dark:text-white">{r.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{r.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Awards */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-zinc-900/50">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Premios y reconocimientos
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Un protocolo de intercambio validado por la comunidad
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {awards.map((a) => (
              <div
                key={a}
                className="px-6 py-3 rounded-full border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium text-gray-800 dark:text-gray-200"
              >
                {a}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Únete a la comunidad
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Conecta tu billetera, inscríbete on-chain y empieza a operar con
            total seguridad.
          </p>
          <button
            onClick={handleCta}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg"
          >
            {!isConnected ? 'Conectar billetera' : isRegistered ? 'Ir a la plataforma' : 'Inscribirme ahora'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 py-10 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © 2026 Escrow DApp. Intercambio seguro de tokens entre pares.
          </p>
          <div className="flex gap-6">
            <Link href="/operations" className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600">
              Operaciones
            </Link>
            <Link href="/balances" className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600">
              Balances
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
