/**
 * Notificaciones (M6 · RF-WN-19): fichas deslizables con el resumen de las
 * novedades no leídas. Se alimenta del bus de actividad de la wallet
 * (`LogEntry[]`) y guarda la marca de lectura en `chrome.storage.local`.
 */
import { useEffect, useState } from 'react'
import type { LogEntry } from '../types'

const CLAVE_VISTO = 'codecrypto_notifications_seen'

export function Notificaciones({ logs }: { logs: LogEntry[] }) {
  const [visto, setVisto] = useState(0)

  useEffect(() => {
    void chrome.storage.local.get(CLAVE_VISTO).then((s) => {
      setVisto(Number(s[CLAVE_VISTO]) || 0)
    })
  }, [])

  const recientes = [...logs].reverse().slice(0, 12)
  const esNueva = (l: LogEntry) => new Date(l.timestamp).getTime() > visto
  const noLeidas = recientes.filter(esNueva).length

  const marcarLeidas = async () => {
    const ahora = Date.now()
    setVisto(ahora)
    await chrome.storage.local.set({ [CLAVE_VISTO]: ahora })
  }

  return (
    <div className="tk-notifs">
      <div className="tk-notifs__cabecera">
        <span className="tk-muted" style={{ fontSize: 10 }}>
          {noLeidas > 0 ? `${noLeidas} sin leer` : 'Todo leído'}
        </span>
        {noLeidas > 0 && (
          <button className="tk-notifs__marcar" onClick={() => void marcarLeidas()}>
            Marcar como leídas
          </button>
        )}
      </div>

      {recientes.length === 0 ? (
        <p className="tk-muted" style={{ fontSize: 11 }}>
          Sin novedades todavía.
        </p>
      ) : (
        <div className="tk-notifs__pista">
          {recientes.map((l, i) => (
            <article
              key={`${l.timestamp}-${i}`}
              className={`tk-notif${esNueva(l) ? ' tk-notif--nueva' : ''}`}
            >
              <span className="tk-notif__punto" aria-hidden />
              <span className="tk-notif__texto">{l.content}</span>
              <span className="tk-notif__hora">
                {new Date(l.timestamp).toLocaleString('es', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
