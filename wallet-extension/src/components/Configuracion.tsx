/**
 * Configuración (M5/M6 · RF-WN-14..17, M6.1).
 *
 * En este ciclo habilita la elección del MODO DE VISTA (panel lateral, pestaña o
 * flotante) y deja preparadas las áreas de red, ayuda y perfil para M6. El modo
 * se guarda en `chrome.storage.local` (`codecrypto_view_mode`) y lo aplican el
 * side panel, la apertura de pestaña y el content script `floating.ts`.
 */
import { useEffect, useState } from 'react'

type Modo = 'panel' | 'pestana' | 'flotante'

const CLAVE_MODO = 'codecrypto_view_mode'
const URL_AYUDA = 'https://truekeate-web-593453426217.europe-west1.run.app/help/manual'

const MODOS: { id: Modo; icono: string; titulo: string; texto: string }[] = [
  { id: 'panel', icono: '📊', titulo: 'Panel lateral', texto: 'Junto a la pestaña de la dApp.' },
  { id: 'pestana', icono: '🗂️', titulo: 'Pestaña', texto: 'Se abre como pestaña del navegador.' },
  { id: 'flotante', icono: '🪟', titulo: 'Flotante', texto: 'Botón y panel sobre la propia web.' },
]

export function Configuracion({ chainId }: { chainId: string }) {
  const [modo, setModo] = useState<Modo>('panel')
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    void chrome.storage.local.get(CLAVE_MODO).then((s) => {
      const guardado = s[CLAVE_MODO] as Modo | undefined
      if (guardado) setModo(guardado)
    })
  }, [])

  const aplicar = async (m: Modo) => {
    setModo(m)
    setAviso(null)
    await chrome.storage.local.set({ [CLAVE_MODO]: m })
    try {
      if (m === 'panel') {
        const win = await chrome.windows.getCurrent()
        if (win.id !== undefined) {
          const sidePanel = (
            chrome as unknown as {
              sidePanel?: { open: (o: { windowId: number }) => Promise<void> }
            }
          ).sidePanel
          await sidePanel?.open({ windowId: win.id })
        }
      } else if (m === 'pestana') {
        await chrome.tabs.create({ url: chrome.runtime.getURL('index.html') })
      }
      // "flotante": lo aplica el content script floating.js en las páginas.
    } catch (e) {
      setAviso(`No se pudo abrir el modo: ${(e as Error).message}`)
    }
  }

  return (
    <div className="tk-config">
      <h4 className="tk-config__area">Modo de vista</h4>
      <div className="tk-modos">
        {MODOS.map((m) => (
          <button
            key={m.id}
            className={`tk-modo${modo === m.id ? ' tk-modo--activo' : ''}`}
            onClick={() => void aplicar(m.id)}
            aria-pressed={modo === m.id}
          >
            <span className="tk-modo__icono" aria-hidden>
              {m.icono}
            </span>
            <span className="tk-modo__titulo">{m.titulo}</span>
            <span className="tk-modo__texto">{m.texto}</span>
          </button>
        ))}
      </div>
      {aviso && (
        <p className="tk-contactos__error" role="alert">
          {aviso}
        </p>
      )}

      <h4 className="tk-config__area">Red</h4>
      <p className="tk-muted" style={{ fontSize: 11 }}>
        Red actual: <strong>{chainId}</strong>. La gestión completa de redes llega en el ciclo M6.
      </p>

      <h4 className="tk-config__area">Ayuda</h4>
      <button className="tk-btn tk-config__enlace" onClick={() => void chrome.tabs.create({ url: URL_AYUDA })}>
        ❓ Abrir la ayuda de la plataforma
      </button>

      <h4 className="tk-config__area">Perfil</h4>
      <p className="tk-muted" style={{ fontSize: 11 }}>
        Clave de bloqueo, respaldo/cifrado del mnemonic y modo oscuro se habilitan en M6.
      </p>
    </div>
  )
}
