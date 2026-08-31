/**
 * contracts-test.mjs — Suite D: flujos de contrato profundos (ethers directo a Anvil)
 * + verificación de sincronización del indexador vía API.
 *
 * Cubre: refund tras expiración (warp), exchange órdenes, gobernanza socio (apply/vote/resolve),
 * suscripción BRLT, SBT, RWA, vouchers de servicio, meta-transacción relay, valoración legítima,
 * encuentro (meetup) crear/abrir/cerrar, aceptar operación, notificaciones y stats en BD.
 */
import { ethers } from 'ethers'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..', '..', '..')
const RPC = process.env.E2E_RPC || 'http://127.0.0.1:8545'
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:3000'

// Cargar direcciones de .env.local (tolera BOM y CRLF)
const env = {}
for (const raw of fs.readFileSync(path.join(ROOT, 'web', '.env.local'), 'utf8').replace(/^\uFEFF/, '').split('\n')) {
  const line = raw.trim()
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}

const A = (name) => env[`NEXT_PUBLIC_${name}_ADDRESS`]
const ADDR = {
  escrow: A('ESCROW'), registry: A('USER_REGISTRY'), exchange: A('EXCHANGE'),
  governance: A('GOVERNANCE'), subscription: A('SUBSCRIPTION'), brlt: A('BRLT'),
  sbt: A('TRUEKE_SBT'), sbtRegistry: A('SBT_REGISTRY'), rwa: A('TRUEKE_RWA'),
  service: A('TRUEKE_SERVICE'), tka: A('TOKEN_A'), tkb: A('TOKEN_B'), usdt: A('USDT'), delivery: A('DELIVERY'),
}
const KEYS = {
  owner: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  user1: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', // socio_juez_alpha
  user2: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', // socio_juez_beta
  free: '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356', // cuenta libre
}

const provider = new ethers.JsonRpcProvider(RPC)
const wallets = Object.fromEntries(Object.entries(KEYS).map(([k, v]) => [k, new ethers.Wallet(v, provider)]))

const NAME_KEY = {
  Escrow: 'escrow', UserRegistry: 'registry', Exchange: 'exchange', Governance: 'governance',
  Subscription: 'subscription', BRLT: 'brlt', TruekeSBT: 'sbt', SBTRegistry: 'sbtRegistry',
  TruekeRWA: 'rwa', TruekeService: 'service',
}
const C = (name, wallet) => {
  const addr = ADDR[NAME_KEY[name]]
  if (!addr) throw new Error(`FALTA dirección para ${name}`)
  return new ethers.Contract(addr, abi(name), wallet)
}
function abi(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'sc', 'out', `${name}.sol`, `${name}.json`), 'utf8')).abi
}
const ERC20 = (addr, w) => new ethers.Contract(addr, abi('MockERC20'), w)

// Gestión explícita de nonces por cuenta (anvil devuelve nonces 'pending' desactualizados
// entre dos transacciones consecutivas de la misma cuenta).
const nonceTrack = new Map()

/** Rellena huecos de nonce si el pool tiene txs encoladas esperando un nonce perdido. */
async function fillGaps(w) {
  try {
    const pool = await provider.send('txpool_content', [])
    const queued = pool?.queued?.[w.address.toLowerCase()] || {}
    const nonces = Object.keys(queued).map(Number)
    if (!nonces.length) return
    const chain = Number(await provider.getTransactionCount(w.address, 'latest'))
    const min = Math.min(...nonces)
    for (let n = chain; n < min; n++) {
      try {
        const tx = await w.sendTransaction({ to: w.address, value: 0n, nonce: n })
        await tx.wait()
        console.log(`  ↻ gap nonce ${n} rellenado`)
      } catch { /* ya minada */ }
    }
  } catch { /* txpool no disponible */ }
}

async function call(w, fn) {
  await fillGaps(w)
  const addr = w.address.toLowerCase()
  const chainNonce = Number(await provider.getTransactionCount(w.address, 'latest'))
  const used = nonceTrack.get(addr) ?? chainNonce
  const nonce = Math.max(chainNonce, used)
  // IMPORTANTE: no avanzar el contador hasta que la tx se emita de verdad.
  // Si el envío falla (p. ej. estimateGas revierte), el nonce queda sin usar
  // y un contador avanzado crearía un hueco que encola las txs siguientes.
  let res
  try {
    // gasLimit explícito: evita eth_estimateGas, que en anvil simula sobre el
    // bloque 'pending' con el reloj sin warp (causa falsos "revert" de tiempo).
    res = await fn({ nonce, gasLimit: 800000 })
  } catch (e) {
    nonceTrack.delete(addr)
    throw e
  }
  nonceTrack.set(addr, nonce + 1)
  await res.wait()
  return res
}

const report = { suite: 'D. Contratos + indexador', checks: 0, failures: 0, issues: [] }
function check(name, ok, detail = '') {
  report.checks++
  if (!ok) {
    report.failures++
    report.issues.push({ check: name, detail: String(detail).slice(0, 300) })
    console.log(`  ✗ ${name}${detail ? ` — ${String(detail).slice(0, 180)}` : ''}`)
  } else {
    console.log(`  ✓ ${name}`)
  }
  return ok
}
const api = async (p, opts = {}) => {
  const res = await fetch(BASE + p, { headers: { 'Content-Type': 'application/json' }, ...opts })
  let body = null
  try { body = await res.json() } catch { body = await res.text() }
  return { status: res.status, body }
}

const W = (n) => ethers.parseUnits(n, 18)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Avanza el reloj de anvil de forma VERIFICADA. En esta versión de anvil el
 * salto (evm_increaseTime / evm_setNextBlockTimestamp) se aplica UN BLOQUE
 * después del evm_mine inmediato, por lo que se minan bloques hasta que el
 * timestamp realmente avanza (máx. 12 intentos por método).
 */
async function warp(seconds) {
  const before = (await provider.getBlock('latest')).timestamp
  const mineUntil = async () => {
    for (let i = 0; i < 6; i++) {
      await provider.send('evm_mine', []).catch(() => {})
      const t = (await provider.getBlock('latest')).timestamp
      if (t >= before + seconds) return t
    }
    return null
  }
  await provider.send('evm_increaseTime', [seconds]).catch(() => {})
  let t = await mineUntil()
  if (!t) {
    await provider.send('evm_setNextBlockTimestamp', [String(before + seconds)]).catch(() => {})
    t = await mineUntil()
  }
  if (!t) {
    console.log(`  ⚠ warp incompleto: pedido +${seconds}`)
  }
  return (await provider.getBlock('latest')).timestamp
}

async function main() {
  console.log('━━━ SUITE: D. Contratos + indexador ━━━')
  const escrow = C('Escrow', wallets.owner)
  const exchange = C('Exchange', wallets.owner)
  const gov = C('Governance', wallets.owner)
  const sub = C('Subscription', wallets.owner)
  const rwa = C('TruekeRWA', wallets.owner)
  const service = C('TruekeService', wallets.owner)

  // D1. Refund tras expiración (warp de tiempo)
  {
    const tkb = ERC20(ADDR.tkb, wallets.owner)
    const chainTime = (await provider.getBlock('latest')).timestamp
    await call(wallets.owner, (o) => tkb.approve(ADDR.escrow, W('50'), o))
    await call(wallets.owner, (o) => escrow.createOperation(ADDR.tkb, ADDR.usdt, W('3'), W('6'), chainTime + 86400, o))
    const id = Number(await escrow.getOperationsCount())
    // avanzar 2 días -> deadline vencida
    await warp(172800)
    await call(wallets.owner, (o) => escrow.refundAfterExpiry(id, o))
    const op = await escrow.getOperation(id)
    check('D1 refundAfterExpiry (vencida)', Number(op.status) === 2, `status=${op.status}`)
    let reverted = false
    try { await call(wallets.owner, (o) => escrow.refundAfterExpiry(id, o)) } catch { reverted = true }
    check('D1 refund doble revierte', reverted)
  }

  // D2. Exchange: crear orden + llenar + cancelar
  {
    const ex = exchange.connect(wallets.user1)
    const tkb = ERC20(ADDR.tkb, wallets.user1)
    const usdt6 = 10n ** 6n // USDT mock tiene 6 decimales
    await call(wallets.user1, (o) => tkb.approve(ADDR.exchange, W('25'), o))
    const orderId = Number(await ex.createOrder.staticCall(ADDR.tkb, ADDR.usdt, W('5'), 10n * usdt6))
    await call(wallets.user1, (o) => ex.createOrder(ADDR.tkb, ADDR.usdt, W('5'), 10n * usdt6, o))
    check('D2 createOrder', orderId >= 1)
    const usdt = ERC20(ADDR.usdt, wallets.user2)
    await call(wallets.user2, (o) => usdt.approve(ADDR.exchange, 10n * usdt6, o))
    await call(wallets.user2, (o) => exchange.connect(wallets.user2).fillOrder(orderId, o))
    const filled = await exchange.getOrder(orderId)
    check('D2 fillOrder', Number(filled.status) === 1, `status=${filled.status}`)
    const order2 = Number(await ex.createOrder.staticCall(ADDR.tkb, ADDR.usdt, W('2'), 4n * usdt6))
    await call(wallets.user1, (o) => ex.createOrder(ADDR.tkb, ADDR.usdt, W('2'), 4n * usdt6, o))
    await call(wallets.user1, (o) => ex.cancelOrder(order2, o))
    const cancelled = await exchange.getOrder(order2)
    check('D2 cancelOrder', Number(cancelled.status) === 2, `status=${cancelled.status}`)
  }

  // D3. Gobernanza: postular + votar + resolver (warp 5 días)
  {
    const brlt = ERC20(ADDR.brlt, wallets.free)
    await call(wallets.free, (o) => brlt.approve(ADDR.governance, W('500'), o))
    const appId = Number(await gov.connect(wallets.free).applyForSocio.staticCall('Quiero ser socio para mediar disputas en mi comunidad', ADDR.brlt, W('500')))
    await call(wallets.free, (o) => gov.connect(wallets.free).applyForSocio('Quiero ser socio para mediar disputas en mi comunidad', ADDR.brlt, W('500'), o))
    check('D3 applyForSocio (cuenta libre)', appId >= 0)
    await call(wallets.owner, (o) => gov.voteSocioApplication(appId, true, o))
    check('D3 voteSocioApplication (owner socio)', true)
    let early = false
    try { await call(wallets.owner, (o) => gov.resolveSocioApplication(appId, o)) } catch { early = true }
    check('D3 resolver antes de 5 días revierte', early)
    await warp(6 * 86400)
    await call(wallets.owner, (o) => gov.resolveSocioApplication(appId, o))
    const app = await gov.socioApplications(appId)
    const isSocio = await gov.isSocio(wallets.free.address)
    check('D3 resolveSocioApplication aprobada', Boolean(app.passed) && isSocio, `passed=${app.passed} isSocio=${isSocio}`)
  }

  // D4. Suscripción: nueva empresa se suscribe
  {
    const brlt = ERC20(ADDR.brlt, wallets.free)
    const bal = await brlt.balanceOf(wallets.free.address)
    if (bal >= W('100')) {
      await call(wallets.free, (o) => brlt.approve(ADDR.subscription, W('1200'), o))
      await call(wallets.free, (o) => sub.connect(wallets.free).subscribe(12, o))
      const active = await sub.isActive(wallets.free.address)
      check('D4 subscribe(12) empresa activa', active)
    } else {
      check('D4 subscribe(12) empresa activa', false, `saldo BRLT insuficiente: ${bal}`)
    }
  }

  // D5. SBT + RWA + Vouchers de servicio (owner Nivel 3)
  {
    const sbtReg = C('SBTRegistry', wallets.owner)
    const [valid] = await sbtReg.hasValidIdentity(wallets.owner.address)
    check('D5 SBTRegistry.hasValidIdentity(owner)', valid)
    await call(wallets.owner, (o) => rwa.mintRWA(wallets.owner.address, 'Lote de cacao certificado', 'agro', 'QmE2Etest', ethers.id('condicion'), o))
    const rwaCount = Number(await rwa.balanceOf(wallets.owner.address))
    check('D5 mintRWA (requiere Nivel 3)', rwaCount >= 1, `balance=${rwaCount}`)
    await call(wallets.owner, (o) => service.createServiceBatch(wallets.owner.address, 10, 'Consultoría legal', 'servicios', 'QmSvcE2E', o))
    const svcCount = await service.balanceOf(wallets.owner.address, 1)
    check('D5 createServiceBatch', Number(svcCount) === 10, `balance=${svcCount}`)
    await call(wallets.owner, (o) => service.consumeAndBurn(wallets.owner.address, 1, 2, o))
    const after = await service.balanceOf(wallets.owner.address, 1)
    check('D5 consumeAndBurn', Number(after) === 8, `balance=${after}`)
  }

  // D6. Meta-transacción vía relay (crear sin gas)
  {
    const signer = wallets.user1
    const escrowC = new ethers.Contract(ADDR.escrow, abi('Escrow'), provider)
    const tkb = ERC20(ADDR.tkb, provider)
    const nonce = await escrowC.metaNonces(signer.address)
    const amountA = W('4')
    const domain = { name: 'Escrow', version: '1', chainId: 31337, verifyingContract: ADDR.escrow }
    const types = {
      MetaCreateOperation: [
        { name: 'user', type: 'address' }, { name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' },
        { name: 'amountA', type: 'uint256' }, { name: 'amountB', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }, { name: 'nonce', type: 'uint256' },
      ],
    }
    const value = { user: signer.address, tokenA: ADDR.tkb, tokenB: ADDR.usdt, amountA, amountB: W('8'), deadline: 0, nonce }
    const signature = await signer.signTypedData(domain, types, value)
    const permitTypes = {
      Permit: [
        { name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' },
      ],
    }
    const tokenName = await tkb.name()
    // deadline del permit relativo al reloj de la CADENA (puede estar warpeado)
    const chainNow = BigInt((await provider.getBlock('latest')).timestamp)
    const permitDeadline = chainNow + 3600n
    const ownerNonce = await tkb.nonces(signer.address)
    const permitSig = await signer.signTypedData(
      { name: tokenName, version: '1', chainId: 31337, verifyingContract: ADDR.tkb },
      permitTypes,
      { owner: signer.address, spender: ADDR.escrow, value: amountA, nonce: ownerNonce, deadline: permitDeadline }
    )
    const psig = ethers.Signature.from(permitSig)
    const relayer = new ethers.Wallet(env.RELAYER_PRIVATE_KEY, provider)
    await call(relayer, (o) => escrowC.connect(relayer).metaCreateOperation(
      signer.address, ADDR.tkb, ADDR.usdt, amountA, W('8'), 0, nonce,
      signature, permitDeadline, psig.v, psig.r, psig.s, o
    ))
    const count = Number(await escrowC.getOperationsCount())
    check('D6 metaCreateOperation vía relay', count >= 4, `count=${count}`)
  }

  // D7. Valoración legítima (partes de op completada) + duplicado rechazado
  {
    // La BD persiste entre reinicios: buscar una op completada del owner SIN valorar
    const count = Number(await escrow.getOperationsCount())
    const candidates = []
    for (let i = 1; i <= count; i++) {
      const op = await escrow.getOperation(i)
      if (Number(op.status) === 1 && op.user1.toLowerCase() === wallets.owner.address.toLowerCase()) {
        candidates.push({ id: Number(op.id), counterparty: op.user2 })
      }
    }
    let rated = false
    let usedOp = null
    for (const c of candidates) {
      if (c.counterparty === ethers.ZeroAddress) continue
      const r = await api('/api/ratings', {
        method: 'POST',
        body: JSON.stringify({ operationId: c.id, rater: wallets.owner.address, ratee: c.counterparty, acceptance: 5, honesty: 5, security: 5, reliability: 5, commitment: 5, comment: 'E2E' }),
      })
      if (r.status === 201) { rated = true; usedOp = c; break }
    }
    check('D7 valoración legítima (owner->contraparte)', rated)
    if (usedOp) {
      const dup = await api('/api/ratings', {
        method: 'POST',
        body: JSON.stringify({ operationId: usedOp.id, rater: wallets.owner.address, ratee: usedOp.counterparty, acceptance: 4, honesty: 4, security: 4, reliability: 4, commitment: 4 }),
      })
      check('D7 valoración duplicada rechazada', dup.status >= 400, `status=${dup.status}`)
    }
  }

  // D8. Encuentro: crear + abrir + cerrar (operación activa)
  {
    const count = Number(await escrow.getOperationsCount())
    let activeOp = null
    for (let i = count; i >= 1; i--) {
      const op = await escrow.getOperation(i)
      if (Number(op.status) === 0) { activeOp = op; break }
    }
    if (activeOp) {
      // El solicitante debe ser PARTE de la operación (puede no ser el owner)
      const requester = activeOp.user1 === ethers.ZeroAddress ? wallets.owner.address : activeOp.user1
      // dentro de la ventana ±10 min para poder abrir el encuentro de inmediato
      const scheduledAt = Math.floor(Date.now() / 1000) + 300
      const m = await api('/api/meetups', {
        method: 'POST',
        body: JSON.stringify({ operationId: Number(activeOp.id), requester, scheduledAt, lat: 10.4806, lng: -66.1036, placeName: 'Plaza Bolívar' }),
      })
      check('D8 crear meetup', [200, 201].includes(m.status) && m.body.meetup, `status=${m.status} ${JSON.stringify(m.body).slice(0, 140)}`)
      if (m.body?.meetup) {
        const mid = m.body.meetup.id
        const open = await api(`/api/meetups/${mid}/open`, { method: 'POST', body: JSON.stringify({ address: requester }) })
        check('D8 abrir meetup', open.status === 200 && open.body.ok, `status=${open.status} ${JSON.stringify(open.body).slice(0, 120)}`)
        const close = await api(`/api/meetups/${mid}/close`, { method: 'POST' })
        check('D8 cerrar meetup', close.status === 200 && close.body.ok, `status=${close.status} ${JSON.stringify(close.body).slice(0, 120)}`)
      }
    } else {
      check('D8 encuentro', false, 'sin operaciones activas')
    }
  }

  // D9. Indexador: operaciones en BD + notificaciones + identidad owner
  {
    await sleep(2500)
    const stats = await api('/api/stats')
    const ops = Number(stats.body.totalOperations)
    check('D9 indexador: operaciones en BD', ops >= 4, `totalOperations=${ops}`)
    const notif = await api(`/api/notifications?user=${wallets.owner.address}`)
    check('D9 indexador: notificaciones owner', notif.status === 200, `status=${notif.status}`)
    const ident = await api(`/api/identity/${wallets.owner.address}?requester=${wallets.owner.address}`)
    check('D9 identidad owner completa', ident.status === 200 && ident.body.profile?.username === 'superadmin', JSON.stringify(ident.body.profile || {}).slice(0, 160))
  }

  console.log(`\n════════════════════════════════════════════`)
  console.log(`RESUMEN D: ${report.checks - report.failures}/${report.checks}`)
  console.log(`════════════════════════════════════════════`)
  fs.writeFileSync(path.join(__dirname, 'report-d.json'), JSON.stringify(report, null, 2), 'utf8')
  process.exit(report.failures > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('FATAL D:', e?.shortMessage || e?.message || e)
  process.exit(2)
})
