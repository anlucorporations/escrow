/// <reference types="chrome"/>
/**
 * Aprobaciones DENTRO de la wallet (rediseño): la conexión y la firma se
 * muestran en el mismo espacio que la página principal (el popup), no en una
 * ventana flotante aparte. El background deja la solicitud en storage y el
 * popup la atiende aquí.
 */
import { useState } from 'react'
import { ethers } from 'ethers'
import type { ChainConfig } from '../types'

export interface SolicitudConexion {
  requestId: number
  origin: string
  accounts: string[]
  currentAccountIndex: number
}

export interface SolicitudFirma {
  approvalId: number
  method: string
  params: unknown[]
  chainId: string
}

interface Props {
  conexion?: SolicitudConexion | null
  firma?: SolicitudFirma | null
  chains: ChainConfig[]
  onResponderConexion: (ok: boolean, account?: string, accountIndex?: number) => void
  onResponderFirma: (ok: boolean) => void
}

const acortar = (a: string) => (a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a)

function describirEip712(value: unknown): { dominio: string; tipo: string; valor: string | null } {
  try {
    const obj = typeof value === 'string' ? JSON.parse(value) : value
    const o = obj as {
      domain?: { name?: string }
      primaryType?: string
      message?: Record<string, unknown>
    }
    const valorRaw = o?.message?.value ?? o?.message?.valor ?? o?.message?.amount
    return {
      dominio: o?.domain?.name ? String(o.domain.name) : 'Contrato de la dApp',
      tipo: o?.primaryType ? String(o.primaryType) : 'Mensaje',
      valor: valorRaw === undefined || valorRaw === null ? null : String(valorRaw),
    }
  } catch {
    return { dominio: 'Contrato de la dApp', tipo: 'Mensaje', valor: null }
  }
}

export function Aprobacion({ conexion, firma, chains, onResponderConexion, onResponderFirma }: Props) {
  const [indice, setIndice] = useState(conexion?.currentAccountIndex ?? 0)

  // ── Conexión ─────────────────────────────────────────────────────────
  if (conexion) {
    return (
      <div className="tk-aprobacion">
        <h2 className="tk-aprobacion__titulo">🔐 Solicitud de autorización</h2>
        <div className="tk-aprobacion__dapp">
          <span className="tk-mov__etq">dApp</span>
          <span className="tk-mono">{conexion.origin}</span>
        </div>
        <p className="tk-muted" style={{ fontSize: 12 }}>
          Elige la cuenta que compartes con esta aplicación:
        </p>
        <ul className="tk-sitios">
          {conexion.accounts.map((acc, i) => (
            <li key={acc} className={`tk-sitio${i === indice ? ' tk-sitio--sel' : ''}`}>
              <button className="tk-sitio__info tk-aprobacion__cuenta" onClick={() => setIndice(i)}>
                <span className="tk-sitio__origen">Cuenta {i}</span>
                <span className="tk-sitio__cuenta">{acortar(acc)}</span>
              </button>
              <span aria-hidden>{i === indice ? '🔘' : '⚪'}</span>
            </li>
          ))}
        </ul>
        <div className="tk-aprobacion__acciones">
          <button className="tk-btn tk-btn--outline" onClick={() => onResponderConexion(false)}>
            ❌ Cancelar
          </button>
          <button
            className="tk-btn"
            onClick={() => onResponderConexion(true, conexion.accounts[indice], indice)}
          >
            ✅ Conectar
          </button>
        </div>
      </div>
    )
  }

  // ── Firma ────────────────────────────────────────────────────────────
  if (firma) {
    const esTx = firma.method === 'eth_sendTransaction'
    const esEip712 = firma.method === 'eth_signTypedData_v4'
    const tx = esTx ? (firma.params[0] as { to?: string; value?: string }) : undefined
    const meta = esEip712 ? describirEip712(firma.params[1]) : null
    const fecha = new Date().toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })
    return (
      <div className="tk-aprobacion">
        <h2 className="tk-aprobacion__titulo">
          {esTx ? '💸 Confirmar transacción' : esEip712 ? '✍️ Firmar mensaje · EIP-712' : '✍️ Firmar mensaje · EIP-191'}
        </h2>
        <div className="tx-details">
          <div className="detail-item">
            <div className="detail-label">Billetera firmante</div>
            <div className="detail-value code">{acortar(String(firma.params[0] ?? ''))}</div>
          </div>
          {esTx && tx ? (
            <>
              <div className="detail-item">
                <div className="detail-label">Para</div>
                <div className="detail-value code">{tx.to}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Valor</div>
                <div className="detail-value">{ethers.formatEther(tx.value || '0')} ETH</div>
              </div>
            </>
          ) : (
            <div className="detail-item">
              <div className="detail-label">Qué se firma</div>
              <div className="detail-value">
                {esEip712 ? `${meta?.dominio} · ${meta?.tipo}` : 'Mensaje de texto firmado (EIP-191)'}
              </div>
            </div>
          )}
          <div className="detail-item">
            <div className="detail-label">Red</div>
            <div className="detail-value">
              {chains.find((c) => c.chainId.toLowerCase() === firma.chainId.toLowerCase())?.name ??
                firma.chainId}
            </div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Fecha y hora</div>
            <div className="detail-value">{fecha}</div>
          </div>
          <details className="json-container">
            <summary className="json-label">Datos completos</summary>
            <pre className="json-display">
              {JSON.stringify(
                (() => {
                  try {
                    const v = firma.params[1]
                    return typeof v === 'string' ? JSON.parse(v) : v
                  } catch {
                    return firma.params[1]
                  }
                })(),
                null,
                2
              )}
            </pre>
          </details>
        </div>
        <div className="tk-aprobacion__acciones">
          <button className="tk-btn tk-btn--outline" onClick={() => onResponderFirma(false)}>
            ❌ Rechazar
          </button>
          <button className="tk-btn" onClick={() => onResponderFirma(true)}>
            ✅ Aprobar
          </button>
        </div>
      </div>
    )
  }

  return null
}
