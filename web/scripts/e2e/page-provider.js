/**
 * Proveedor EIP-1193 inyectado en el navegador para pruebas E2E.
 * Delega todo el JSON-RPC al puente local (bridge.mjs) que firma con la clave del owner.
 * Se inyecta con context.addInitScript({ content: providerSource }) ANTES de cargar la app.
 */
export const providerSource = `
(() => {
  if (window.__tkEthereum) return
  const BRIDGE = window.__TK_BRIDGE_URL || 'http://127.0.0.1:8599'
  const listeners = {}
  const emit = (ev, ...args) => (listeners[ev] || []).forEach((fn) => { try { fn(...args) } catch (e) { console.error('listener', ev, e) } })

  const ethereum = {
    isMetaMask: true,
    isTk: true,
    request: async ({ method, params }) => {
      const res = await fetch(BRIDGE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Math.floor(Math.random() * 1e9), method, params: params || [] }),
      })
      const data = await res.json()
      if (data.error) {
        const err = new Error(data.error.message)
        err.code = data.error.code
        throw err
      }
      return data.result
    },
    on: (ev, fn) => { (listeners[ev] ||= []).push(fn) },
    removeListener: (ev, fn) => { if (listeners[ev]) listeners[ev] = listeners[ev].filter((f) => f !== fn) },
    removeAllListeners: (ev) => { if (ev) delete listeners[ev]; else for (const k of Object.keys(listeners)) delete listeners[k] },
    _emit: emit,
  }
  Object.defineProperty(window, 'ethereum', { value: ethereum, writable: true, configurable: true })
  window.__tkEthereum = ethereum
})()
`
