/// <reference types="chrome"/>
/**
 * `notification.html`: ventana de confirmación de firmas y transacciones.
 *
 * Muestra los detalles de la solicitud pendiente (leída de `chrome.storage.local`)
 * y **solo aprueba o rechaza**: la firma la hace el service worker con ethers
 * después de recibir la respuesta, de modo que el mnemonic nunca pasa por aquí.
 */
import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import './App.css'
import { CHAINS_KEY, findChain, formatChainLabel, mergeChains } from './utils/chains'
import type { ChainConfig, SignResponseMessage } from './types'

/** Transacción tal y como llega en `eth_sendTransaction`. */
interface TransactionRequest {
  to?: string
  value?: string
  data?: string
  from?: string
}

interface PendingRequestData {
  approvalId: number
  method: string
  params: unknown[]
  chainId: string
}

/** Formatea el JSON del mensaje EIP-712 sin romper la ventana si viene malformado. */
function prettyJson(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return String(text)
  }
}

function Notification() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PendingRequestData | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Redes disponibles (por defecto + personalizadas) para mostrar el nombre real
  const [chains, setChains] = useState<ChainConfig[]>(() => mergeChains([]))

  useEffect(() => {
    const loadRequest = async () => {
      try {
        const stored = await chrome.storage.local.get(['codecrypto_pending_request', CHAINS_KEY])

        const customChains = (stored[CHAINS_KEY] as ChainConfig[]) || []
        setChains(mergeChains(customChains))

        const request = stored.codecrypto_pending_request as PendingRequestData | undefined
        if (!request) {
          throw new Error('No hay solicitud pendiente')
        }

        setData(request)
        setLoading(false)
      } catch (err) {
        console.error('Error cargando solicitud:', err)
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      }
    }

    void loadRequest()
  }, [])

  const sendResponse = (message: SignResponseMessage, closeDelay: number) => {
    chrome.runtime.sendMessage(message, () => {
      if (chrome.runtime.lastError) {
        console.error('❌ Error enviando mensaje:', chrome.runtime.lastError.message)
      }
      setTimeout(() => window.close(), closeDelay)
    })
  }

  const handleApprove = () => {
    if (!data) return
    console.log('✅ Usuario aprobó la solicitud')
    // Solo se aprueba: el background firma con ethers (EIP-1559 / EIP-712)
    sendResponse({ type: 'SIGN_RESPONSE', approvalId: data.approvalId, success: true }, 500)
  }

  const handleReject = () => {
    if (!data) return
    console.log('❌ Usuario rechazó la solicitud')
    sendResponse({
      type: 'SIGN_RESPONSE',
      approvalId: data.approvalId,
      success: false,
      error: 'User rejected'
    }, 0)
  }

  if (loading) {
    return (
      <div className="notification-container">
        <div className="notification-content">
          <h2>⏳ Cargando...</h2>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="notification-container">
        <div className="notification-content">
          <h2>❌ Error</h2>
          <p>{error}</p>
          <button onClick={() => window.close()}>Cerrar</button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="notification-container">
        <div className="notification-content">
          <h2>❌ No hay solicitud</h2>
          <button onClick={() => window.close()}>Cerrar</button>
        </div>
      </div>
    )
  }

  const isTransaction = data.method === 'eth_sendTransaction'
  const tx = isTransaction ? (data.params[0] as TransactionRequest | undefined) : undefined
  const chain = findChain(chains, data.chainId)

  return (
    <div className="notification-container">
      <div className="notification-header">
        <h1>🔐 CodeCrypto Wallet</h1>
        <p>Solicitud de Firma</p>
      </div>

      <div className="notification-content">
        {isTransaction && tx ? (
          <>
            <h2>💸 Confirmar Transacción</h2>
            <div className="tx-details">
              <div className="detail-item">
                <div className="detail-label">Para:</div>
                <div className="detail-value">{tx.to}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Valor:</div>
                <div className="detail-value">
                  {ethers.formatEther(tx.value || '0')} ETH
                </div>
              </div>
              {tx.data && tx.data !== '0x' && (
                <div className="detail-item">
                  <div className="detail-label">Data:</div>
                  <div className="detail-value code">{tx.data.slice(0, 40)}...</div>
                </div>
              )}
              <div className="detail-item">
                <div className="detail-label">Red:</div>
                <div className="detail-value">
                  {chain ? formatChainLabel(chain) : `Chain ${data.chainId}`}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2>✍️ Firmar Mensaje EIP-712</h2>
            <div className="tx-details">
              <div className="detail-item">
                <div className="detail-label">Dirección:</div>
                <div className="detail-value code">{String(data.params[0] ?? '')}</div>
              </div>
              <div className="json-container">
                <div className="json-label">Datos del Mensaje:</div>
                <pre className="json-display">{prettyJson(data.params[1])}</pre>
              </div>
              <div className="detail-item">
                <div className="detail-label">Red:</div>
                <div className="detail-value">
                  {chain ? formatChainLabel(chain) : `Chain ${data.chainId}`}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="notification-actions">
        <button
          className="btn-reject"
          onClick={handleReject}
          disabled={loading}
        >
          {loading ? '⏳' : '❌'} Rechazar
        </button>
        <button
          className="btn-approve"
          onClick={handleApprove}
          disabled={loading}
        >
          {loading ? '⏳' : '✅'} Aprobar
        </button>
      </div>
    </div>
  )
}

export default Notification
