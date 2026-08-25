#!/usr/bin/env node
/**
 * Indexador de Eventos TrueKeate (M1).
 *
 * Escucha los eventos de Escrow + UserRegistry y los refleja en la base de
 * datos (SQLite en local, PostgreSQL en GCP). La blockchain es la única
 * fuente de verdad; esta BD es la capa de lectura.
 *
 * Uso:
 *   node scripts/indexer.mjs                # replay desde bloque 0 + escucha continua
 *   START_BLOCK=100 node scripts/indexer.mjs
 *   DATABASE_URL=postgres://... node scripts/indexer.mjs   # producción (GCP)
 *
 * Variables de entorno: RPC_URL, ESCROW_ADDRESS, USER_REGISTRY_ADDRESS
 * (se cargan automáticamente desde ../.env.local si existen).
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

const RPC_URL = process.env.RPC_URL || 'http://localhost:8545'
const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS
const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_USER_REGISTRY_ADDRESS
const START_BLOCK = Number(process.env.START_BLOCK || 0)
const CHUNK = Number(process.env.CHUNK || 1000)

if (!ESCROW_ADDRESS || !REGISTRY_ADDRESS) {
  console.error('❌ Faltan NEXT_PUBLIC_ESCROW_ADDRESS / NEXT_PUBLIC_USER_REGISTRY_ADDRESS (ejecuta ./setup.sh)')
  process.exit(1)
}

function loadAbi(contract) {
  const artifact = path.join(__dirname, '..', '..', 'sc', 'out', `${contract}.sol`, `${contract}.json`)
  if (!fs.existsSync(artifact)) {
    console.error(`❌ No existe ${artifact}. Ejecuta: cd sc && forge build`)
    process.exit(1)
  }
  return JSON.parse(fs.readFileSync(artifact, 'utf8')).abi
}

/* --------------------------- upserts ----------------------------- */

async function upsertUser(address, username, registeredAt) {
  const a = address.toLowerCase()
  await query(
    `INSERT INTO users (address, username, registered_at, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(address) DO UPDATE SET username = excluded.username, registered_at = excluded.registered_at`,
    [a, username, Number(registeredAt), Number(registeredAt)]
  )
}

async function upsertOperation(fields) {
  const allowed = ['id', 'user1', 'user2', 'token_a', 'token_b', 'amount_a', 'amount_b', 'status', 'created_at', 'deadline', 'closed_at']
  const clean = {}
  for (const k of allowed) if (fields[k] !== undefined) clean[k] = fields[k]
  clean.id = Number(clean.id)
  if (clean.user1) clean.user1 = clean.user1.toLowerCase()
  if (clean.user2) clean.user2 = clean.user2.toLowerCase()
  if (clean.amount_a != null) clean.amount_a = String(clean.amount_a)
  if (clean.amount_b != null) clean.amount_b = String(clean.amount_b)

  // Fusionar con la fila existente: los upserts parciales (p.ej. solo
  // OperationCompleted) no deben violar NOT NULL en columnas ausentes.
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

/* ---------------------- procesamiento eventos ---------------------- */

const ESCROW_EVENTS = [
  'OperationCreated',
  'OperationCompleted',
  'OperationCancelled',
  'OperationDisputed',
  'DisputeResolved',
  'OperationExpired',
]
const REGISTRY_EVENTS = ['UserRegistered', 'UsernameUpdated']

const blockTsCache = new Map()
async function blockTimestamp(provider, blockNumber) {
  if (!blockTsCache.has(blockNumber)) {
    try {
      const block = await provider.getBlock(blockNumber)
      blockTsCache.set(blockNumber, block ? Number(block.timestamp) : Math.floor(Date.now() / 1000))
    } catch {
      blockTsCache.set(blockNumber, Math.floor(Date.now() / 1000))
    }
  }
  return blockTsCache.get(blockNumber)
}

function makeEscrowHandlers(provider) {
  return {
    async OperationCreated(operationId, user1, tokenA, tokenB, amountA, amountB, deadline, event) {
      const ts = await blockTimestamp(provider, event.blockNumber)
      await upsertOperation({
        id: operationId, user1, token_a: tokenA, token_b: tokenB,
        amount_a: amountA, amount_b: amountB, status: 0,
        created_at: ts, deadline,
      })
    },
    async OperationCompleted(operationId, user2) {
      await upsertOperation({ id: operationId, user2, status: 1 })
    },
    async OperationCancelled(operationId) {
      await upsertOperation({ id: operationId, status: 2 })
    },
    async OperationDisputed(operationId) {
      await upsertOperation({ id: operationId, status: 3 })
    },
    async DisputeResolved(operationId) {
      await upsertOperation({ id: operationId, status: 1 })
    },
    async OperationExpired(operationId) {
      await upsertOperation({ id: operationId, status: 2 })
    },
  }
}

const registryHandlers = {
  async UserRegistered(wallet, username, registeredAt) {
    await upsertUser(wallet, username, registeredAt)
  },
  async UsernameUpdated(wallet, newUsername) {
    await upsertUser(wallet, newUsername, Math.floor(Date.now() / 1000))
  },
}

async function main() {
  await initSchema()
  console.log(`📦 Base de datos lista (${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'})`)

  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const escrow = new ethers.Contract(ESCROW_ADDRESS, loadAbi('Escrow'), provider)
  const registry = new ethers.Contract(REGISTRY_ADDRESS, loadAbi('UserRegistry'), provider)
  const escrowHandlers = makeEscrowHandlers(provider)

  const latest = await provider.getBlockNumber()
  console.log(`⛓  RPC: ${RPC_URL} · bloque actual: ${latest}`)

  // 1) Replay histórico en chunks
  let processed = 0
  const fromBlock = Math.min(START_BLOCK, latest)
  for (let from = fromBlock; from <= latest; from += CHUNK) {
    const to = Math.min(from + CHUNK - 1, latest)
    const batches = await Promise.all([
      ...ESCROW_EVENTS.map((e) => escrow.queryFilter(e, from, to)),
      ...REGISTRY_EVENTS.map((e) => registry.queryFilter(e, from, to)),
    ])
    const all = batches
      .flat()
      .sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index)
    for (const log of all) {
      const handler = log.address.toLowerCase() === ESCROW_ADDRESS.toLowerCase()
        ? escrowHandlers[log.fragment.name]
        : registryHandlers[log.fragment.name]
      if (handler) {
        await handler(...log.args, log)
        processed++
      }
    }
    console.log(`  · bloques ${from}-${to} (${all.length} eventos)`)
  }
  console.log(`✅ Replay completado: ${processed} eventos procesados`)

  // 2) Escucha continua
  for (const ev of ESCROW_EVENTS) {
    escrow.on(ev, (...args) => {
      const event = args[args.length - 1]
      const handlerArgs = args.slice(0, -1)
      escrowHandlers[ev](...handlerArgs, event)
        .then(() => console.log(`🔔 Escrow.${ev} (bloque ${event.blockNumber})`))
        .catch((err) => console.error(`❌ Error en ${ev}:`, err))
    })
  }
  for (const ev of REGISTRY_EVENTS) {
    registry.on(ev, (...args) => {
      const event = args[args.length - 1]
      const handlerArgs = args.slice(0, -1)
      registryHandlers[ev](...handlerArgs, event)
        .then(() => console.log(`🔔 UserRegistry.${ev} (bloque ${event.blockNumber})`))
        .catch((err) => console.error(`❌ Error en ${ev}:`, err))
    })
  }
  console.log('👂 Escuchando eventos en tiempo real... (Ctrl+C para detener)')
}

main().catch((err) => {
  console.error('❌ Indexador falló:', err)
  process.exit(1)
})
