/**
 * Perfil (M6 · RF-WN-24/25): información de la cuenta, modo oscuro y respaldo
 * de la frase de recuperación.
 *
 * El respaldo exige la bóveda DESBLOQUEADA (método `wallet_revealMnemonic`,
 * solo extensión). El cambio de clave de bloqueo y el backup exportable quedan
 * para el cierre de M6.
 */
import { useEffect, useState } from 'react'
import { sendRPCToBackground } from '../utils/rpc'

const CLAVE_TEMA = 'codecrypto_theme'

export function Perfil({ account }: { account: string }) {
  const [oscuro, setOscuro] = useState(false)
  const [frase, setFrase] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    void chrome.storage.local.get(CLAVE_TEMA).then((s) => {
      const dark = s[CLAVE_TEMA] === 'dark'
      setOscuro(dark)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    })
  }, [])

  const alternarTema = async () => {
    const nuevo = !oscuro
    setOscuro(nuevo)
    document.documentElement.dataset.theme = nuevo ? 'dark' : 'light'
    await chrome.storage.local.set({ [CLAVE_TEMA]: nuevo ? 'dark' : 'light' })
  }

  const revelar = async () => {
    setError(null)
    setCargando(true)
    try {
      setFrase(await sendRPCToBackground<string>('wallet_revealMnemonic'))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="tk-perfil">
      <h4 className="tk-config__area">Cuenta</h4>
      <p className="tk-mono" style={{ fontSize: 10, wordBreak: 'break-all', margin: 0 }}>
        {account}
      </p>

      <h4 className="tk-config__area">Apariencia</h4>
      <label className="tk-switch">
        <input type="checkbox" checked={oscuro} onChange={() => void alternarTema()} />
        <span>🌙 Modo oscuro</span>
      </label>

      <h4 className="tk-config__area">Respaldo de la frase</h4>
      {frase ? (
        <>
          <p className="tk-warning" style={{ marginTop: 4 }}>
            <strong>Nunca compartas esta frase.</strong> Quien la tenga controla tus fondos.
          </p>
          <p className="tk-mono tk-perfil__frase">{frase}</p>
          <button className="tk-btn" onClick={() => setFrase(null)}>
            Ocultar
          </button>
        </>
      ) : (
        <>
          <button className="tk-btn" onClick={() => void revelar()} disabled={cargando}>
            {cargando ? '⏳ Verificando…' : '👁️ Mostrar frase de recuperación'}
          </button>
          <p className="tk-muted" style={{ fontSize: 10, marginTop: 6 }}>
            Requiere la bóveda desbloqueada. Sirve para respaldar la wallet.
          </p>
        </>
      )}
      {error && (
        <p className="tk-contactos__error" role="alert">
          {error}
        </p>
      )}

      <h4 className="tk-config__area">Seguridad</h4>
      <p className="tk-muted" style={{ fontSize: 11, margin: 0 }}>
        El cambio de clave de bloqueo y el backup exportable de la bóveda llegan en el cierre de
        M6; hoy la frase se guarda cifrada (AES-256) y se bloquea sola a los 15 minutos.
      </p>
    </div>
  )
}
