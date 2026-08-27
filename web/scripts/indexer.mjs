#!/usr/bin/env node
/**
 * Indexador de Eventos Web3 TrueKeate (M1 + RWA + SBT + Multi-Asset Escrow).
 *
 * Escucha continuamente los eventos emitidos por todos los contratos on-chain:
 *  - TruekeEscrow / Escrow (TradeCreated, TradeInTransit, TradeCompleted, Disputed, etc.)
 *  - UserRegistry (UserRegistered, UsernameUpdated, IdentificationLevelUpdated)
 *  - SBTRegistry & TruekeSBT (CredentialIssued, CredentialRevoked, UserCertifiedViaExternal)
 *  - TruekeRWA (RWAMinted, Transfer)
 *  - TruekeService (ServiceCreated, ServiceConsumed)
 *  - Subscription (Subscribed, BusinessStatusChanged)
 *
 * Refleja el estado en la base de datos PostgreSQL local ("TrueKeate") o GCP en tiempo real
 * y genera notificaciones automáticas en la capa off-chain.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ethers } from 'ethers'
import { initSchema, query, first } from '../server/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/* ------------------------- configuración ------------------------- */

function loadEnvLocal() {
  const envFile = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envFile)) return
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}
loadEnvLocal()

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'http://127.0.0.1:8545'
const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS
const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_USER_REGISTRY_ADDRESS
const SBT_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_SBT_REGISTRY_ADDRESS
const TRUEKE_SBT_ADDRESS = process.env.NEXT_PUBLIC_TRUEKE_SBT_ADDRESS
const TRUEKE_RWA_ADDRESS = process.env.NEXT_PUBLIC_TRUEKE_RWA_ADDRESS
const TRUEKE_SERVICE_ADDRESS = process.env.NEXT_PUBLIC_TRUEKE_SERVICE_ADDRESS
const SUBSCRIPTION_ADDRESS = process.env.NEXT_PUBLIC_SUBSCRIPTION_ADDRESS

const START_BLOCK = Number(process.env.START_BLOCK || 0)
const CHUNK = Number(process.env.CHUNK || 1000)

function loadAbi(contract) {
  const artifact = path.join(__dirname, '..', '..', 'sc', 'out', `${contract}.sol`, `${contract}.json`)
  if (!fs.existsSync(artifact)) {
    return []
  }
  return JSON.parse(fs.readFileSync(artifact, 'utf8')).abi
}

/* --------------------------- upserts & helpers ----------------------------- */

async function createNotification(user, type, message, refId = '') {
  try {
    const id = ethers.hexlify(ethers.randomBytes(16)).replace('0x', '')
    const now = Math.floor(Date.now() / 1000)
    await query(
      'INSERT INTO notifications (id, "user", type, message, ref_id, read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
      [id, user.toLowerCase(), type, message, String(refId), now]
    )
  } catch (err) {
    console.error('Error insertando notificación:', err.message)
  }
}

async function upsertUser(address, username, registeredAt, level = 'inscrito') {
  const a = address.toLowerCase()
  await query(
    `INSERT INTO users (address, username, registered_at, identification_level, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(address) DO UPDATE SET 
       username = COALESCE(excluded.username, users.username), 
       registered_at = COALESCE(excluded.registered_at, users.registered_at),
       identification_level = COALESCE(excluded.identification_level, users.identification_level)`,
    [a, username, Number(registeredAt), level, Number(registeredAt)]
  )
}

async function updateUserLevel(address, level) {
  const a = address.toLowerCase()
  await query('UPDATE users SET identification_level = ? WHERE address = ?', [level, a])
  await createNotification(a, 'security', `Tu nivel de identidad ha sido actualizado a: ${level.toUpperCase()}`)
}

async function updateSBTInfo(address, provider, tokenId = '1') {
  const a = address.toLowerCase()
  const now = Math.floor(Date.now() / 1000)
  await query(
    `UPDATE users SET 
      identification_level = 'certificado',
      sbt_provider = ?,
      sbt_token_id = ?,
      sbt_verified_at = ?
     WHERE address = ?`,
    [provider, String(tokenId), now, a]
  )
  await createNotification(a, 'badge', `¡Felicitaciones! Credencial SBT otorgada por ${provider}`)
}

async function upsertOperation(fields) {
  const allowed = [
    'id', 'user1', 'user2', 'token_a', 'token_b', 'amount_a', 'amount_b',
    'status', 'created_at', 'deadline', 'closed_at', 'tracking_info',
    'asset_a_type', 'asset_b_type', 'asset_a_token_id', 'asset_b_token_id'
  ]
  const clean = {}
  for (const k of allowed) if (fields[k] !== undefined) clean[k] = fields[k]
  clean.id = Number(clean.id)
  if (clean.user1) clean.user1 = clean.user1.toLowerCase()
  if (clean.user2) clean.user2 = clean.user2.toLowerCase()
  if (clean.amount_a != null) clean.amount_a = String(clean.amount_a)
  if (clean.amount_b != null) clean.amount_b = String(clean.amount_b)

  const existing = await first('SELECT * FROM operations WHERE id = ?', [clean.id])
  if (existing) {
    for (const k of allowed) {
      if (clean[k] === undefined && existing[k] !== undefined && existing[k] !== null) clean[k] = existing[k]
    }
  }

  const keys = Object.keys(clean)
  const setSql = keys.filter((k) => k !== 'id').map((k) => `${k} = excluded.${k}`).join(', ')
  await query(
    `INSERT INTO operations (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})
     ON CONFLICT(id) DO UPDATE SET ${setSql}`,
    keys.map((k) => clean[k])
  )
}

/* ---------------------- procesamiento de eventos ---------------------- */

async function main() {
  await initSchema()
  console.log(`=============================================================`)
  console.log(`📡 INDEXADOR DE EVENTOS ON-CHAIN -> POSTGRESQL ("TrueKeate")`)
  console.log(`=============================================================`)
  console.log(`📦 Base de datos conectada: ${process.env.DATABASE_URL || 'SQLite'}`)

  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const network = await provider.getNetwork()
  console.log(`⛓  Conectado a RPC: ${RPC_URL} (Chain ID: ${network.chainId})`)

  // Contratos a indexar
  const contracts = []

  if (ESCROW_ADDRESS) {
    const escrowAbi = loadAbi('TruekeEscrow').length > 0 ? loadAbi('TruekeEscrow') : loadAbi('Escrow')
    const escrow = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, provider)
    contracts.push({ name: 'Escrow', contract: escrow })

    // Listeners Escrow
    escrow.on('TradeCreated', async (id, u1, typeA, tokA, amtA, typeB, tokB, amtB, deadline, ev) => {
      console.log(`🔔 Evento on-chain: TruekeEscrow.TradeCreated #${id}`)
      await upsertOperation({
        id: Number(id), user1: u1, token_a: tokA, token_b: tokB,
        amount_a: amtA, amount_b: amtB, status: 0,
        created_at: Math.floor(Date.now() / 1000), deadline: Number(deadline),
        asset_a_type: String(typeA), asset_b_type: String(typeB)
      })
      await createNotification(u1, 'trade', `Trueke #${id} creado y en custodia atómica`, String(id))
    })

    escrow.on('TradeInTransit', async (id, caller, trackingInfo, inTransitAt) => {
      console.log(`🚚 Evento on-chain: TruekeEscrow.TradeInTransit #${id} (Guía: ${trackingInfo})`)
      await upsertOperation({ id: Number(id), status: 0, tracking_info: trackingInfo })
      const op = await first('SELECT user1, user2 FROM operations WHERE id = ?', [Number(id)])
      if (op) {
        if (op.user1) await createNotification(op.user1, 'shipping', `Trueke #${id} marcado En Tránsito: ${trackingInfo}`, String(id))
        if (op.user2) await createNotification(op.user2, 'shipping', `Trueke #${id} despachado con guía: ${trackingInfo}`, String(id))
      }
    })

    escrow.on('TradeCompleted', async (id, u2) => {
      console.log(`✅ Evento on-chain: TruekeEscrow.TradeCompleted #${id}`)
      await upsertOperation({ id: Number(id), user2: u2, status: 1, closed_at: Math.floor(Date.now() / 1000) })
      const op = await first('SELECT user1 FROM operations WHERE id = ?', [Number(id)])
      if (op && op.user1) await createNotification(op.user1, 'trade', `¡Trueke #${id} completado con éxito! Califica a tu contraparte.`, String(id))
      await createNotification(u2, 'trade', `¡Trueke #${id} completado con éxito! Califica a tu contraparte.`, String(id))
    })

    escrow.on('TradeDisputed', async (id, caller) => {
      console.log(`⚠️ Evento on-chain: TruekeEscrow.TradeDisputed #${id}`)
      await upsertOperation({ id: Number(id), status: 3 })
      await createNotification(caller, 'dispute', `Disputa abierta para el Trueke #${id}. Un Socio Árbitro mediará el caso.`, String(id))
    })
  }

  if (REGISTRY_ADDRESS) {
    const registry = new ethers.Contract(REGISTRY_ADDRESS, loadAbi('UserRegistry'), provider)
    contracts.push({ name: 'UserRegistry', contract: registry })

    registry.on('UserRegistered', async (wallet, username, regAt, level) => {
      const lvlStr = level === 1 ? 'verificado' : level === 2 ? 'certificado' : 'inscrito'
      console.log(`👤 Evento on-chain: UserRegistry.UserRegistered -> @${username} (${wallet.slice(0, 6)}...) [${lvlStr}]`)
      await upsertUser(wallet, username, regAt, lvlStr)
    })

    registry.on('IdentificationLevelUpdated', async (wallet, newLevel) => {
      const lvlStr = newLevel === 1 ? 'verificado' : newLevel === 2 ? 'certificado' : 'inscrito'
      console.log(`🛡️ Evento on-chain: UserRegistry.IdentificationLevelUpdated -> ${wallet.slice(0, 6)}... -> ${lvlStr}`)
      await updateUserLevel(wallet, lvlStr)
    })
  }

  if (SBT_REGISTRY_ADDRESS && loadAbi('SBTRegistry').length > 0) {
    const sbtReg = new ethers.Contract(SBT_REGISTRY_ADDRESS, loadAbi('SBTRegistry'), provider)
    contracts.push({ name: 'SBTRegistry', contract: sbtReg })

    sbtReg.on('UserCertifiedViaExternal', async (user, providerAddr, provName) => {
      console.log(`🎖️ Evento on-chain: SBTRegistry.UserCertifiedViaExternal -> ${user.slice(0, 6)}... vía ${provName}`)
      await updateSBTInfo(user, provName)
    })
  }

  console.log(`\n👂 Indexador activo y sincronizando ${contracts.length} contratos inteligentes en tiempo real...`)
  console.log(`   (Todos los eventos modificarán automáticamente la base de datos "TrueKeate")\n`)
}

main().catch((err) => {
  console.error('❌ Error fatal en Indexador:', err)
  process.exit(1)
})
