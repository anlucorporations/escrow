/// <reference types="chrome"/>
import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import ChainManager from './components/ChainManager'
import LogsPanel from './components/LogsPanel'
import TransferSection from './components/TransferSection'
import WalletSetup from './components/WalletSetup'
import { Ficha } from './components/Ficha'
import { RecibirQR } from './components/RecibirQR'
import { Contactos } from './components/Contactos'
import { Comprar } from './components/Comprar'
import { Cambiar } from './components/Cambiar'
import { Caracteristicas } from './components/Caracteristicas'
import { Configuracion } from './components/Configuracion'
import { VaultPassword } from './components/VaultPassword'
import { VaultUnlock } from './components/VaultUnlock'
import { formatWeiToEth, parseEthToWei } from './utils/amount'
import { LOCAL_CHAIN_ID, mergeChains } from './utils/chains'
import {
  MAX_LOG_ENTRIES,
  appendLog,
  clearLogs,
  createLogEntry,
  isSameEntry,
  loadLogs
} from './utils/logs'
import { notifyWalletReset, sendRPCToBackground } from './utils/rpc'
import { walletKeysToReset } from './utils/storage'
import type { ChainConfig, LogEntry, LogMessage, LogType } from './types'

/**
 * Popup principal de la wallet.
 *
 * Es solo interfaz: no importa ethers ni maneja claves. Toda la criptografía
 * (derivación de cuentas, firmas y envío de transacciones) ocurre en el service
 * worker, al que se piden las operaciones por RPC.
 */
function App() {
  const [isWalletLoaded, setIsWalletLoaded] = useState(false)
  const [accounts, setAccounts] = useState<string[]>([])
  const [currentAccountIndex, setCurrentAccountIndex] = useState(0)
  const [balance, setBalance] = useState('0')
  const [balanceWei, setBalanceWei] = useState<bigint>(0n)
  const [chainId, setChainId] = useState(LOCAL_CHAIN_ID)
  const [chains, setChains] = useState<ChainConfig[]>(() => mergeChains([]))
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  /** dApps autorizadas (origen → cuenta) para el pie y la ficha Conexiones. */
  const [sitiosConectados, setSitiosConectados] = useState<Record<string, string>>({})
  /** Panel de gestión de saldo abierto (M2.1.4). */
  const [panelSaldo, setPanelSaldo] = useState<
    'recibir' | 'enviar' | 'comprar' | 'cambiar' | 'contactos' | null
  >(null)
  /** Estado de la bóveda cifrada: si existe y si está abierta. */
  const [boveda, setBoveda] = useState<{
    existe: boolean
    desbloqueada: boolean
    migracionPendiente: boolean
  } | null>(null)
  /** Frase pendiente de cifrar (aún no se ha escrito en disco). */
  const [pendienteCifrar, setPendienteCifrar] = useState<string | null>(null)

  const bootstrapped = useRef(false)

  // ── Bus de logs ─────────────────────────────────────────────────────
  const addLog = useCallback((type: LogType, content: string, source = 'wallet') => {
    const entry = createLogEntry(type, content, source)
    setLogs((prev) => [...prev, entry].slice(-MAX_LOG_ENTRIES))
    void appendLog(entry)
  }, [])

  // Historial guardado + entradas que publica el service worker (actividad de dApps)
  useEffect(() => {
    void loadLogs().then((stored) => setLogs(stored.slice(-MAX_LOG_ENTRIES)))

    const listener = (message: unknown) => {
      const msg = message as LogMessage
      if (msg?.type !== 'CODECRYPTO_LOG' || !msg.entry) return
      setLogs((prev) => {
        if (isSameEntry(prev[prev.length - 1], msg.entry)) return prev
        return [...prev, msg.entry].slice(-MAX_LOG_ENTRIES)
      })
    }

    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  const handleClearLogs = useCallback(async () => {
    await clearLogs()
    setLogs([])
  }, [])

  // ── Redes ───────────────────────────────────────────────────────────
  const refreshChains = useCallback(async () => {
    try {
      const list = await sendRPCToBackground<ChainConfig[]>('wallet_getChains')
      if (Array.isArray(list) && list.length > 0) setChains(list)
    } catch (error) {
      console.error('No se pudieron cargar las redes:', error)
    }
  }, [])

  // ── Carga de la wallet ──────────────────────────────────────────────
  const applyWallet = useCallback(async (
    phrase: string,
    options?: { accountIndex?: number; chainId?: string; persist?: boolean }
  ) => {
    const normalized = phrase.trim().replace(/\s+/g, ' ').toLowerCase()
    if (normalized.split(' ').length !== 12) {
      throw new Error('La frase debe tener exactamente 12 palabras')
    }

    const derived = await sendRPCToBackground<string[]>('wallet_deriveAccounts', [normalized, 5])
    const index = options?.accountIndex ?? 0
    const activeChain = options?.chainId || chainId

    setAccounts(derived)
    setCurrentAccountIndex(index)
    setChainId(activeChain)
    setIsWalletLoaded(true)
    setIsLoading(false)

    if (options?.persist !== false) {
      // La frase NO se guarda aquí: su sitio es la bóveda cifrada. En disco
      // solo quedan datos públicos (direcciones, índice y red).
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({
          codecrypto_accounts: derived,
          codecrypto_current_account: index.toString(),
          codecrypto_chain_id: activeChain
        }, () => resolve())
      })
      await chrome.storage.local.remove('codecrypto_mnemonic')
      addLog('event', `Wallet guardada · ${derived.length} cuentas derivadas`, 'wallet')
    }
  }, [chainId, addLog])

  /** Carga cuentas ya derivadas desde el almacenamiento (sin mnemonic). */
  const cargarCuentasGuardadas = useCallback(async () => {
    const guardado = await new Promise<Record<string, unknown>>((resolve) => {
      chrome.storage.local.get(
        ['codecrypto_accounts', 'codecrypto_current_account', 'codecrypto_chain_id'],
        (result) => resolve(result)
      )
    })
    const cuentas = (guardado.codecrypto_accounts as string[]) || []
    if (!cuentas.length) return false
    setAccounts(cuentas)
    setCurrentAccountIndex(parseInt((guardado.codecrypto_current_account as string) || '0'))
    setChainId((guardado.codecrypto_chain_id as string) || LOCAL_CHAIN_ID)
    setIsWalletLoaded(true)
    setIsLoading(false)
    return true
  }, [])

  /** Bloquea la wallet: se olvida la clave y se pide la contraseña. */
  const bloquearWallet = useCallback(async () => {
    await sendRPCToBackground('wallet_lock')
    setBoveda((b) => (b ? { ...b, desbloqueada: false } : b))
    setIsWalletLoaded(false)
    addLog('event', 'Wallet bloqueada', 'wallet')
  }, [addLog])

  /** Aviso de migración: pasa la frase heredada en claro al paso de contraseña. */
  const migrarBoveda = useCallback(async () => {
    const datos = await new Promise<Record<string, unknown>>((resolve) =>
      chrome.storage.local.get('codecrypto_mnemonic', (r) => resolve(r))
    )
    const frase = datos.codecrypto_mnemonic as string | undefined
    if (frase) setPendienteCifrar(frase)
  }, [])

  const handleLoadWallet = useCallback(
    async (phrase: string) => {
      // Sin bóveda todavía: primero se pide la contraseña y se cifra la frase.
      if (!boveda?.existe) {
        setPendienteCifrar(phrase)
        return
      }
      await applyWallet(phrase, { persist: true })
    },
    [applyWallet, boveda]
  )

  // Arranque: redes + wallet guardada (solo la primera vez)
  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true

    const bootstrap = async () => {
      await refreshChains()
      try {
        // Bóveda primero: si existe y está cerrada, se pide la contraseña y no
        // se toca ninguna frase. Si está abierta, las cuentas ya están en disco.
        const estado = await sendRPCToBackground<{
          existe: boolean
          desbloqueada: boolean
          migracionPendiente: boolean
        }>('wallet_vaultStatus')
        setBoveda(estado)

        if (estado.existe) {
          if (estado.desbloqueada) await cargarCuentasGuardadas()
          setIsLoading(false)
          return
        }

        // Compatibilidad: wallet creada antes de existir la bóveda.
        const stored = await new Promise<Record<string, unknown>>((resolve) => {
          chrome.storage.local.get([
            'codecrypto_mnemonic',
            'codecrypto_current_account',
            'codecrypto_chain_id'
          ], (result) => resolve(result))
        })

        const savedMnemonic = stored.codecrypto_mnemonic as string | undefined
        if (!savedMnemonic) {
          setIsLoading(false)
          return
        }

        await applyWallet(savedMnemonic, {
          accountIndex: parseInt((stored.codecrypto_current_account as string) || '0'),
          chainId: (stored.codecrypto_chain_id as string) || LOCAL_CHAIN_ID,
          persist: false
        })
      } catch (error) {
        addLog('error', `No se pudo cargar la wallet: ${(error as Error).message}`)
        setIsLoading(false)
      }
    }

    void bootstrap()
    // El guardia `bootstrapped` garantiza que el arranque ocurra una sola vez,
    // aunque las dependencias cambien (p. ej. al cambiar de red)
  }, [addLog, applyWallet, refreshChains, cargarCuentasGuardadas])

  // ── Balance (sondeo cada 5 s) ───────────────────────────────────────
  const updateBalance = useCallback(async () => {
    if (!isWalletLoaded || !accounts.length) return

    try {
      const balanceHex = await sendRPCToBackground<string>('eth_getBalance', [accounts[currentAccountIndex], 'latest'])
      // Se guarda el wei exacto (bigint) para validar el saldo y el formato
      // legible para mostrarlo; nada de Number() que perdería precisión.
      const wei = BigInt(balanceHex)
      setBalanceWei(wei)
      setBalance(formatWeiToEth(wei))
    } catch (error) {
      // Silenciar errores de sondeo (el nodo puede estar apagado)
      console.error('Error actualizando balance:', error)
    }
  }, [isWalletLoaded, accounts, currentAccountIndex])

  useEffect(() => {
    if (!isWalletLoaded || !accounts.length) return

    void updateBalance()
    const interval = setInterval(() => void updateBalance(), 5000)

    return () => clearInterval(interval)
  }, [isWalletLoaded, accounts, currentAccountIndex, chainId, updateBalance])

  // ── dApps conectadas (M2.1.7) ───────────────────────────────────────
  useEffect(() => {
    if (!isWalletLoaded) return
    const cargarSitios = async () => {
      try {
        const sitios = await sendRPCToBackground<Record<string, string>>('wallet_getConnectedSites')
        setSitiosConectados(sitios || {})
      } catch {
        setSitiosConectados({})
      }
    }
    void cargarSitios()
    // Mantener el pie en vivo cuando una dApp se conecta o se desconecta.
    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area !== 'local' || !changes.codecrypto_connected_sites) return
      setSitiosConectados(
        (changes.codecrypto_connected_sites.newValue as Record<string, string>) || {}
      )
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => chrome.storage.onChanged.removeListener(onChanged)
  }, [isWalletLoaded])

  const desconectarSitio = useCallback(
    async (origen: string) => {
      try {
        const sitios = await sendRPCToBackground<Record<string, string>>(
          'wallet_disconnectSite',
          [origen]
        )
        setSitiosConectados(sitios || {})
        addLog('event', `Desconectada dApp ${origen}`)
      } catch (e) {
        addLog('error', `No se pudo desconectar ${origen}: ${(e as Error).message}`)
      }
    },
    [addLog]
  )

  // ── Cambios de cuenta y de red ──────────────────────────────────────
  const changeAccount = (index: number) => {
    if (index >= accounts.length || index < 0) {
      addLog('error', 'Índice de cuenta inválido')
      return
    }

    setCurrentAccountIndex(index)
    addLog('event', `Cuenta cambiada a ${accounts[index].slice(0, 10)}…`)

    chrome.storage.local.set({ codecrypto_current_account: index.toString() }, () => {
      chrome.runtime.sendMessage({
        type: 'ACCOUNT_CHANGED',
        accountIndex: index,
        account: accounts[index]
      }, () => { void chrome.runtime.lastError })
    })
  }

  const changeChain = (newChainId: string) => {
    setChainId(newChainId)
    const chain = chains.find((item) => item.chainId === newChainId)
    addLog('event', `Red cambiada a ${chain?.name || newChainId}`)

    chrome.storage.local.set({ codecrypto_chain_id: newChainId }, () => {
      chrome.runtime.sendMessage({ type: 'CHAIN_CHANGED', chainId: newChainId }, () => {
        void chrome.runtime.lastError
      })
    })
  }

  // ── Reset ───────────────────────────────────────────────────────────
  const resetWallet = () => {
    addLog('event', 'Reseteando wallet…')

    // Se borran TODAS las claves de la wallet (mnemonic, cuentas, cuenta activa,
    // red, sitios conectados, redes personalizadas y solicitudes pendientes),
    // pero se conserva el historial de logs (requisito 23 y Test 8).
    chrome.storage.local.get(null, (all) => {
      const keys = walletKeysToReset(Object.keys(all))
      chrome.storage.local.remove(keys, () => {
        addLog('event', `Datos de extensión limpiados (${keys.length} claves)`)
      })
    })

    // El background cierra las ventanas abiertas y cancela sus solicitudes
    notifyWalletReset()

    setIsWalletLoaded(false)
    setAccounts([])
    setCurrentAccountIndex(0)
    setBalance('0')
    setBalanceWei(0n)
    setChainId(LOCAL_CHAIN_ID)
    void refreshChains()

    addLog('event', '✅ Wallet reseteada · ingresa o crea una nueva frase')
  }

  // ── Transferencias ──────────────────────────────────────────────────
  const handleTransfer = async (toAccountIndex: number, amount: string) => {
    if (!isWalletLoaded) return

    try {
      addLog('message', `Transferencia de ${amount} ETH a la cuenta ${toAccountIndex}`)

      // Conversión EXACTA ETH → wei (antes: BigInt(parseFloat(amount) * 1e18),
      // que desviaba importes reales: 1.1 ETH → 1100000000000000128 wei)
      const valueWei = parseEthToWei(amount)
      if (valueWei > balanceWei) {
        throw new Error(`Saldo insuficiente: disponible ${formatWeiToEth(balanceWei)} ETH`)
      }

      const tx = {
        to: accounts[toAccountIndex],
        value: '0x' + valueWei.toString(16),
        from: accounts[currentAccountIndex]
      }

      const txHash = await sendRPCToBackground<string>('eth_sendTransaction', [tx])
      addLog('event', `Transacción enviada: ${txHash.slice(0, 18)}…`)

      await new Promise((resolve) => setTimeout(resolve, 2000))
      await updateBalance()
      addLog('event', '✅ Transacción confirmada')

      return txHash
    } catch (error) {
      const err = error as Error
      addLog('error', `Error en transferencia: ${err.message}`)
      throw err
    }
  }

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="app">
      <header className="tk-brand">
        <img
          className="tk-brand__logo"
          src="/brand/TrueKeate_logoIntegral.svg"
          alt="TrueKeate"
        />
        <div className="tk-brand__text">
          <span className="tk-brand__title">CodeCrypto Wallet</span>
          <span className="tk-brand__sub">Wallet nativa de la plataforma</span>
        </div>
      </header>

      {boveda?.migracionPendiente && isWalletLoaded && !pendienteCifrar && (
        <div className="tk-warning" style={{ margin: '0 0 12px' }}>
          Tu wallet guarda la frase de recuperación <strong>sin cifrar</strong>.{' '}
          <button
            className="tk-btn tk-btn--gold"
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => void migrarBoveda()}
          >
            🔐 Cifrarla ahora
          </button>
        </div>
      )}

      {pendienteCifrar ? (
        <VaultPassword
          mnemonic={pendienteCifrar}
          onListo={async () => {
            const frase = pendienteCifrar
            setPendienteCifrar(null)
            setBoveda({ existe: true, desbloqueada: true, migracionPendiente: false })
            await applyWallet(frase, { persist: true })
          }}
        />
      ) : isLoading ? (
        <div className="wallet-setup-container">
          <div className="wallet-setup">
            <h2>⏳ Cargando wallet...</h2>
            <p className="setup-note">Verificando si hay una wallet guardada</p>
          </div>
        </div>
      ) : boveda?.existe && !boveda.desbloqueada ? (
        <VaultUnlock onDesbloqueada={() => void cargarCuentasGuardadas()} />
      ) : !isWalletLoaded ? (
        <>
          <WalletSetup onLoadWallet={handleLoadWallet} />
          <LogsPanel logs={logs} onClear={handleClearLogs} />
        </>
      ) : (
        <>
          <div className="wallet-info">
            {/* M2.1.2 · Gestión de cuentas: cuenta en uso + cambio */}
            <Ficha id="cuenta" titulo="Cuenta" icono="👤" abierta>
              <p className="address">{accounts[currentAccountIndex]}</p>
              <div className="account-selector">
                <label>Cambiar cuenta: </label>
                <select
                  value={currentAccountIndex}
                  onChange={(e) => changeAccount(parseInt(e.target.value))}
                >
                  {accounts.map((acc, i) => (
                    <option key={i} value={i}>
                      Cuenta {i}: {acc.slice(0, 6)}...{acc.slice(-4)}
                    </option>
                  ))}
                </select>
              </div>
            </Ficha>

            {/* M2.1.3 · Balance (ETH principal; multi-token en C2) */}
            <Ficha id="balance" titulo="Balance" icono="💰" abierta>
              <p className="balance">{balance} ETH</p>
              <p className="tk-muted" style={{ fontSize: 11, margin: '4px 0 0' }}>
                ◀ ETH ▶ · los tokens agregados con sus flechas llegan en el ciclo C2.
              </p>
            </Ficha>

            {/* M2.1.4 · Gestión de saldo */}
            <Ficha id="saldo" titulo="Gestionar saldo" icono="💸" abierta>
              <div className="tk-actions">
                <button
                  className={`tk-action${panelSaldo === 'recibir' ? ' tk-action--activa' : ''}`}
                  onClick={() => setPanelSaldo(panelSaldo === 'recibir' ? null : 'recibir')}
                  title="Ver mi dirección y su QR"
                >
                  <span className="tk-action__icono">📥</span>Recibir
                </button>
                <button
                  className="tk-action"
                  onClick={() =>
                    document
                      .getElementById('ficha-enviar')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                  title="Abrir el formulario de envío"
                >
                  <span className="tk-action__icono">📤</span>Enviar
                </button>
                <button
                  className={`tk-action${panelSaldo === 'comprar' ? ' tk-action--activa' : ''}`}
                  onClick={() => setPanelSaldo(panelSaldo === 'comprar' ? null : 'comprar')}
                  title="Comprar cripto o recibir desde un exchange"
                >
                  <span className="tk-action__icono">🛒</span>Comprar
                </button>
                <button
                  className={`tk-action${panelSaldo === 'cambiar' ? ' tk-action--activa' : ''}`}
                  onClick={() => setPanelSaldo(panelSaldo === 'cambiar' ? null : 'cambiar')}
                  title="Intercambiar tokens ERC-20"
                >
                  <span className="tk-action__icono">🔄</span>Cambiar
                </button>
                <button
                  className={`tk-action${panelSaldo === 'contactos' ? ' tk-action--activa' : ''}`}
                  onClick={() => setPanelSaldo(panelSaldo === 'contactos' ? null : 'contactos')}
                  title="Direcciones guardadas"
                >
                  <span className="tk-action__icono">📇</span>Contactos
                </button>
              </div>
              {panelSaldo === 'recibir' && accounts[currentAccountIndex] && (
                <RecibirQR address={accounts[currentAccountIndex]} />
              )}
              {panelSaldo === 'comprar' && accounts[currentAccountIndex] && (
                <Comprar account={accounts[currentAccountIndex]} />
              )}
              {panelSaldo === 'cambiar' && accounts[currentAccountIndex] && (
                <Cambiar account={accounts[currentAccountIndex]} chainId={chainId} />
              )}
              {panelSaldo === 'contactos' && <Contactos />}
            </Ficha>

            {/* Enviar: formulario operativo actual */}
            <Ficha id="enviar" titulo="Enviar" icono="📤" abierta={false}>
              <TransferSection
                accounts={accounts}
                currentAccountIndex={currentAccountIndex}
                balanceWei={balanceWei}
                onTransfer={handleTransfer}
              />
            </Ficha>

            {/* M2.1.5 · Red */}
            <Ficha id="red" titulo="Red" icono="🌐" abierta={false}>
              <ChainManager
                chains={chains}
                activeChainId={chainId}
                onSwitch={changeChain}
                onChainsChanged={setChains}
              />
            </Ficha>

            {/* M2.1.6 · Características: Tokens reales; DeFi/NFT/Actividad en C2 */}
            <Ficha id="caracteristicas" titulo="Características" icono="🧩" abierta={false}>
              {accounts[currentAccountIndex] && (
                <Caracteristicas account={accounts[currentAccountIndex]} chainId={chainId} />
              )}
            </Ficha>

            {/* M6 · Configuración (M5: modo de vista) */}
            <Ficha id="configuracion" titulo="Configuración" icono="⚙️" abierta={false}>
              {accounts[currentAccountIndex] && (
                <Configuracion
                  chainId={chainId}
                  chains={chains}
                  onSwitch={changeChain}
                  onChainsChanged={setChains}
                  account={accounts[currentAccountIndex]}
                  logs={logs}
                />
              )}
            </Ficha>

            {/* M2.1.7 · Conexiones: dApps autorizadas con desconexión individual */}
            <Ficha id="conexiones" titulo="Conexiones" icono="🔌" abierta={false}>
              {Object.keys(sitiosConectados).length === 0 ? (
                <p className="tk-muted" style={{ fontSize: 11, marginTop: 10 }}>
                  Ninguna dApp conectada.
                </p>
              ) : (
                <ul className="tk-sitios">
                  {Object.entries(sitiosConectados).map(([origen, cuenta]) => (
                    <li key={origen} className="tk-sitio">
                      <div className="tk-sitio__info">
                        <span className="tk-sitio__origen">{origen}</span>
                        <span className="tk-sitio__cuenta">
                          {cuenta.slice(0, 6)}…{cuenta.slice(-4)}
                        </span>
                      </div>
                      <button
                        className="tk-sitio__desconectar"
                        onClick={() => void desconectarSitio(origen)}
                        title={`Desconectar ${origen}`}
                      >
                        ⛔
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Ficha>
          </div>

          {/* M2.1.7 · Pie fijo: dApp conectada + desconexión + bloqueo */}
          <footer className="tk-footer">
            <div className="tk-footer__dapp">
              <span
                className={`tk-dot${
                  Object.keys(sitiosConectados).length > 0 ? ' tk-dot--ok' : ''
                }`}
                aria-hidden
              />
              <span>
                {Object.keys(sitiosConectados).length > 0
                  ? `${Object.keys(sitiosConectados).length} dApp(s) conectada(s)`
                  : 'Sin dApp conectada'}
              </span>
            </div>
            <div className="tk-footer__acciones">
              {Object.keys(sitiosConectados).length > 0 && (
                <button
                  onClick={() => void desconectarSitio(Object.keys(sitiosConectados)[0])}
                  title="Desconectar la dApp"
                >
                  ⛔
                </button>
              )}
              {boveda?.existe && (
                <button onClick={() => void bloquearWallet()} title="Bloquear wallet">
                  🔒
                </button>
              )}
              <button onClick={resetWallet} title="Reiniciar wallet">
                🔄
              </button>
            </div>
          </footer>

          <LogsPanel logs={logs} onClear={handleClearLogs} />
        </>
      )}
    </div>
  )
}

export default App
