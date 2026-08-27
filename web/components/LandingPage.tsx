'use client'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-500 selection:text-white">
      {/* Background Decorative Blur Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        {/* Header Branding */}
        <header className="pt-8 pb-12 flex justify-between items-center border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/20 text-lg">
              X
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                SECURE EXCHANGE P2P
              </span>
              <span className="block text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
                Protocolo Descentralizado
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Red Local Anvil: Online
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-16 pb-20 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-widest">
            🛡️ Intercambio de Activos 100% Custodiado por Contrato Inteligente
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight max-w-4xl mx-auto">
            Intercambia Tokens de Forma{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Segura, Transparente y Sin Intermediarios
            </span>
          </h1>

          <p className="text-zinc-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed font-normal">
            Plataforma de intercambio Peer-to-Peer donde cada transacción es ejecutada directamente por código auditado en la blockchain con registro obligatorio de usuarios por Wallet.
          </p>

          {/* Quick Guidance Box */}
          <div className="inline-block p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-zinc-300 text-sm max-w-md mx-auto shadow-2xl backdrop-blur-md">
            <p className="font-medium text-zinc-200 flex items-center justify-center gap-2">
              💡 <span className="underline decoration-blue-500 underline-offset-4 font-bold">Cómo empezar:</span>
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Usa el <strong className="text-white">Cajón de Herramientas Flotante</strong> en la esquina inferior derecha para conectar tu billetera e inscribirte en la blockchain.
            </p>
          </div>
        </section>

        {/* Metrics Grid / Volumen & Comunidad */}
        <section className="py-12 border-y border-zinc-900">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition">
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono">$2.8M+</div>
              <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider mt-2">Volumen de Transacciones</div>
            </div>
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition">
              <div className="text-3xl sm:text-4xl font-extrabold text-blue-400 font-mono">5,400+</div>
              <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider mt-2">Traders Inscritos</div>
            </div>
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition">
              <div className="text-3xl sm:text-4xl font-extrabold text-purple-400 font-mono">19,200+</div>
              <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider mt-2">Órdenes Ejecutadas</div>
            </div>
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono">100%</div>
              <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider mt-2">Seguridad On-Chain</div>
            </div>
          </div>
        </section>

        {/* Ventajas de Seguridad */}
        <section className="py-20">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
              Ventajas de Seguridad Garantizadas
            </h2>
            <p className="text-zinc-400 text-sm">
              Diseño de contratos inteligentes bajo las más estrictas normas de auditoría Ethereum.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 space-y-4 hover:border-blue-500/50 transition duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-2xl font-bold">
                🔒
              </div>
              <h3 className="text-lg font-bold text-white">SafeERC20 Standard</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Protección contra tokens con comportamientos no estándar (USDT, Fee-on-Transfer), garantizando que las transferencias no puedan congelar fondos.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 space-y-4 hover:border-purple-500/50 transition duration-300">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-2xl font-bold">
                🛡️
              </div>
              <h3 className="text-lg font-bold text-white">Patrón CEI & ReentrancyGuard</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Actualización de estados en la blockchain previa a cualquier envío de tokens (*Checks-Effects-Interactions*), eliminando vectores de reentrada.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 space-y-4 hover:border-emerald-500/50 transition duration-300">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl font-bold">
                ✍️
              </div>
              <h3 className="text-lg font-bold text-white">Registro de Usuarios On-Chain</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Verificación previa del perfil de Wallet en `UserRegistry.sol`, impidiendo que actores no verificados publiquen o manipulen el libro de órdenes.
              </p>
            </div>
          </div>
        </section>

        {/* Beneficios del Exchange */}
        <section className="py-16 border-t border-zinc-900">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-block px-3 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase">
                Beneficios Exclusivos
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
                La Forma Más Transparente de Intercambiar Activos Digitales
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                A diferencia de los exchanges centralizados (CEX), en nuestra plataforma tú mantienes el control total de tus llaves privadas hasta el segundo exacto en que se ejecuta el intercambio.
              </p>
              <ul className="space-y-3 text-sm text-zinc-300">
                <li className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">✓</span> Sin intermediarios ni custodia de claves por terceros.
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">✓</span> Libro de órdenes P2P en tiempo real con ejecución atómica.
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">✓</span> Cancelación instantánea de órdenes abiertas sin penalizaciones.
                </li>
              </ul>
            </div>

            {/* Visual Feature Showcase Card */}
            <div className="p-8 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs font-mono text-zinc-500">Live P2P Trading System</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex justify-between items-center">
                  <div>
                    <span className="text-blue-400 font-bold">@trader0</span> intercambia <strong>100 TKA</strong>
                  </div>
                  <span className="text-emerald-400 font-bold">➔ 200 TKB</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex justify-between items-center">
                  <div>
                    <span className="text-purple-400 font-bold">@trader1</span> intercambia <strong>50 TKB</strong>
                  </div>
                  <span className="text-emerald-400 font-bold">➔ 25 TKA</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
