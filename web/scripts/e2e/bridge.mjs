/**
 * Puente de wallet EIP-1193 para pruebas E2E (TrueKeate).
 *
 * Expone un servidor JSON-RPC local (por defecto :8599) que implementa la
 * interfaz que espera MetaMask/ethers v6 (BrowserProvider):
 *  - eth_accounts / eth_requestAccounts -> cuenta activa
 *  - eth_chainId / net_version -> 31337 (Anvil)
 *  - eth_sendTransaction -> firma con la clave privada activa y envía a Anvil
 *  - eth_signTypedData_v4 -> firma EIP-712 (relay/permits)
 *  - personal_sign / eth_sign -> firma de mensajes
 *  - resto -> proxy directo a Anvil (eth_call, eth_getCode, eth_getLogs...)
 *  - tk_setAccount -> cambia la cuenta activa (pruebas multi-cuenta)
 *
 * Uso:  import { startBridge } from './bridge.mjs'
 */

import http from 'node:http'
import { ethers } from 'ethers'

export const BRIDGE_PORT = 8599

export async function startBridge({
  rpcUrl = 'http://127.0.0.1:8545',
  port = BRIDGE_PORT,
  ownerKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
} = {}) {
  const provider = new ethers.JsonRpcProvider(rpcUrl, 31337, { staticNetwork: true })
  const wallets = new Map()
  const nonces = new Map() // nonce gestionado por cuenta (tx secuenciales sin colisión)
  let state = { account: null }

  function walletFor(address) {
    if (!address) return wallets.get(state.account?.toLowerCase())
    return wallets.get(String(address).toLowerCase()) || wallets.get(state.account?.toLowerCase())
  }

  async function nextNonce(w) {
    const addr = w.address.toLowerCase()
    const chainNonce = Number(await provider.getTransactionCount(w.address, 'latest'))
    const used = nonces.get(addr) ?? chainNonce
    return Math.max(chainNonce, used)
  }

  async function handle(method, params = []) {
    switch (method) {
      case 'eth_accounts':
      case 'eth_requestAccounts':
        return state.account ? [state.account] : []
      case 'eth_chainId':
        return '0x7a69'
      case 'net_version':
        return '31337'
      case 'eth_coinbase':
        return state.account || null
      case 'wallet_switchEthereumChain':
      case 'wallet_addEthereumChain':
      case 'wallet_revokePermissions':
      case 'wallet_requestPermissions':
        return null
      case 'eth_sendTransaction': {
        const tx = params[0] || {}
        const w = walletFor(tx.from)
        if (!w) throw new Error('No wallet for ' + tx.from)
        const addr = w.address.toLowerCase()
        let nonce = tx.nonce !== undefined ? Number(tx.nonce) : await nextNonce(w)
        const send = (n) =>
          w.sendTransaction({
            to: tx.to,
            value: tx.value ? BigInt(tx.value) : undefined,
            data: tx.data || '0x',
            gasLimit: tx.gas ? BigInt(tx.gas) : undefined,
            nonce: n,
          })
        let sent
        try {
          sent = await send(nonce)
        } catch (e) {
          // colisión de nonce: refrescar desde la cadena e reintentar una vez
          if (/nonce|already used|too low|replacement/i.test(String(e?.message || e))) {
            nonces.delete(addr)
            nonce = await nextNonce(w)
            sent = await send(nonce)
          } else {
            throw e
          }
        }
        nonces.set(addr, nonce + 1)
        return sent.hash
      }
      case 'eth_signTypedData_v4': {
        const w = walletFor(params[0])
        if (!w) throw new Error('No wallet for ' + params[0])
        const { domain, types, message } = JSON.parse(params[1])
        const rest = { ...types }
        delete rest.EIP712Domain
        return w.signTypedData(domain, rest, message)
      }
      case 'eth_signTypedData': {
        const w = walletFor(params[0])
        if (!w) throw new Error('No wallet for ' + params[0])
        const data = JSON.parse(params[1])
        return w.signTypedData(data.domain, data.types, data.message)
      }
      case 'personal_sign': {
        const w = walletFor(params[1])
        if (!w) throw new Error('No wallet for ' + params[1])
        const data = params[0]
        const msg = /^0x[0-9a-fA-F]*$/.test(data) ? ethers.toUtf8String(data) : data
        return w.signMessage(msg)
      }
      case 'eth_sign': {
        const w = walletFor(params[0])
        if (!w) throw new Error('No wallet for ' + params[0])
        return w.signMessage(ethers.getBytes(params[1]))
      }
      default:
        return provider.send(method, params)
    }
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      return res.end()
    }
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', async () => {
      let payload
      try {
        payload = JSON.parse(body || '{}')
      } catch {
        res.writeHead(400)
        return res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }))
      }
      const { method, params, id } = payload
      try {
        if (method === 'tk_setAccount') {
          const [key] = params || []
          if (!key) throw new Error('tk_setAccount requiere private key')
          const w = new ethers.Wallet(key, provider)
          wallets.set(w.address.toLowerCase(), w)
          state.account = w.address
          return res.end(JSON.stringify({ jsonrpc: '2.0', id, result: w.address }))
        }
        if (method === 'tk_setAccountByAddress') {
          const [addr] = params || []
          state.account = addr
          return res.end(JSON.stringify({ jsonrpc: '2.0', id, result: addr }))
        }
        if (method === 'tk_currentAccount') {
          return res.end(JSON.stringify({ jsonrpc: '2.0', id, result: state.account }))
        }
        const result = await handle(method, params)
        res.end(JSON.stringify({ jsonrpc: '2.0', id: id ?? null, result: result ?? null }))
      } catch (e) {
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: id ?? null,
            error: { code: -32603, message: String(e?.shortMessage || e?.message || e) },
          })
        )
      }
    })
  })

  await new Promise((resolve) => server.listen(port, resolve))

  // Cuenta inicial: owner
  const owner = new ethers.Wallet(ownerKey, provider)
  wallets.set(owner.address.toLowerCase(), owner)
  state.account = owner.address

  return {
    port,
    provider,
    ownerAddress: owner.address,
    async setAccount(key) {
      const w = new ethers.Wallet(key, provider)
      wallets.set(w.address.toLowerCase(), w)
      state.account = w.address
      return w.address
    },
    async setAccountByAddress(address) {
      state.account = address
      return address
    },
    currentAccount: () => state.account,
    async close() {
      await new Promise((resolve) => server.close(resolve))
    },
  }
}
