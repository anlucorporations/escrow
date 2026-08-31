#!/usr/bin/env node
/**
 * Indexador de Eventos Web3 TrueKeate (M1 + RWA + SBT + Multi-Asset Escrow).
 *
 * Escucha continuamente los eventos emitidos por todos los contratos on-chain:
 *  - Escrow (OperationCreated, OperationCompleted, OperationCancelled,
 *    OperationDisputed, DisputeResolved, OperationExpired)
 *  - UserRegistry (UserRegistered, UsernameUpdated, IdentificationLevelUpdated)
 *  - SBTRegistry & TruekeSBT (CredentialIssued, CredentialRevoked, UserCertifiedViaExternal)
 *  - TruekeRWA (RWAMinted, Transfer)
 *  - TruekeService (ServiceCreated, ServiceConsumed)
 *  - Subscription (Subscribed, BusinessFlagSet)
 *
 * Refleja el estado en la base de datos PostgreSQL local ("TrueKeate") o GCP en tiempo real
 * y genera notificaciones automáticas en la capa off-chain.
 *
 * IMPORTANTE: Al arrancar realiza una SINCRONIZACIÓN HISTÓRICA (backfill) desde el
 * bloque START_BLOCK (0 por defecto) usando getLogs, para que los eventos emitidos
 * ANTES de que el indexador se iniciara también queden reflejados en la BD. Luego
 * se suscribe a eventos en tiempo real.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ethers } from 'ethers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/* ------------------------- configuración ------------------------- */

function loadEnvLocal() {
  const envFile = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envFile)) return
  for (const raw of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx > 0) {
      const key = line.slice(0, idx).trim()
      const val = line.slice(idx + 1).trim()
      process.env[key] = val
    }
  }
}
loadEnvLocal()

const { initSchema, query, first } = await import('../server/db.js')
const { encryptField } = await import('../server/lib.js')

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'http://127.0.0.1:8545'
const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS
const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_USER_REGISTRY_ADDRESS
const SBT_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_SBT_REGISTRY_ADDRESS
const TRUEKE_SBT_ADDRESS = process.env.NEXT_PUBLIC_TRUEKE_SBT_ADDRESS
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

async function upsertUser(
  address,
  username,
  registeredAt,
  level = 'inscrito',
  email = '',
  phone = '',
  physicalAddress = '',
  utmEasting = 0,
  utmNorthing = 0,
  utmZone = 19,
  utmHemisphere = 'N'
) {
  const a = address.toLowerCase()
  // M6: correo/teléfono se guardan CIFRADOS (AES-256-GCM), igual que en KYC,
  // para que la capa de identidad los descifre de forma consistente.
  const encEmail = email ? encryptField(email) : ''
  const encPhone = phone ? encryptField(phone) : ''
  await query(
    `INSERT INTO users (
       address, username, registered_at, identification_level, created_at,
       email, phone, physical_address, utm_easting, utm_northing, utm_zone, utm_hemisphere
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(address) DO UPDATE SET 
       username = COALESCE(excluded.username, users.username), 
       registered_at = COALESCE(excluded.registered_at, users.registered_at),
       identification_level = CASE
         WHEN excluded.identification_level = 'inscrito' THEN users.identification_level
         ELSE excluded.identification_level
       END,
       email = CASE WHEN excluded.email <> '' THEN excluded.email ELSE users.email END,
       phone = CASE WHEN excluded.phone <> '' THEN excluded.phone ELSE users.phone END,
       physical_address = CASE WHEN excluded.physical_address <> '' THEN excluded.physical_address ELSE users.physical_address END,
       utm_easting = CASE WHEN excluded.utm_easting <> 0 THEN excluded.utm_easting ELSE users.utm_easting END,
       utm_northing = CASE WHEN excluded.utm_northing <> 0 THEN excluded.utm_northing ELSE users.utm_northing END,
       utm_zone = excluded.utm_zone,
       utm_hemisphere = excluded.utm_hemisphere`,
    [
      a,
      username,
      Number(registeredAt),
      level,
      Number(registeredAt),
      encEmail,
      encPhone,
      physicalAddress,
      Number(utmEasting),
      Number(utmNorthing),
      Number(utmZone),
      utmHemisphere,
    ]
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

  const keys = Object.keys(clean).filter((k) => k !== 'id')
  if (keys.length === 0) return // nada que actualizar (solo id)
  const setSql = keys.map((k) => `${k} = excluded.${k}`).join(', ')
  const values = ['id', ...keys].map((k) => clean[k])
  await query(
    `INSERT INTO operations (${['id', ...keys].join(', ')}) VALUES (${['id', ...keys].map(() => '?').join(', ')})
     ON CONFLICT(id) DO UPDATE SET ${setSql}`,
    values
  )
}

/** Asegura que la fila de usuario exista antes de actualizar columnas (evita UPDATE 0 filas). */
async function ensureUserRow(address) {
  const a = address.toLowerCase()
  await query(
    `INSERT INTO users (address, created_at) VALUES (?, ?)
     ON CONFLICT(address) DO NOTHING`,
    [a, Math.floor(Date.now() / 1000)]
  )
}

/* ---------------------- procesamiento de eventos ---------------------- */

// Funciones de manejo por evento. Cada una recibe los args decodificados del log.
const escrowHandlers = {
  OperationCreated: async (operationId, user1, tokenA, tokenB, amountA, amountB, deadline) => {
    console.log(`🔔 Evento on-chain: Escrow.OperationCreated #${operationId}`)
    await upsertOperation({
      id: Number(operationId), user1, token_a: tokenA, token_b: tokenB,
      amount_a: amountA, amount_b: amountB, status: 0,
      created_at: Math.floor(Date.now() / 1000), deadline: Number(deadline),
    })
    await createNotification(user1, 'trade', `Trueke #${operationId} creado y en custodia atómica`, String(operationId))
  },

  OperationCompleted: async (operationId, user2, amountA, amountB, completedAt) => {
    console.log(`✅ Evento on-chain: Escrow.OperationCompleted #${operationId}`)
    await upsertOperation({
      id: Number(operationId), user2, status: 1, closed_at: Number(completedAt),
    })
    const op = await first('SELECT user1 FROM operations WHERE id = ?', [Number(operationId)])
    if (op && op.user1) {
      await createNotification(op.user1, 'trade', `¡Trueke #${operationId} completado con éxito! Califica a tu contraparte.`, String(operationId))
    }
    await createNotification(user2, 'trade', `¡Trueke #${operationId} completado con éxito! Califica a tu contraparte.`, String(operationId))
  },

  OperationCancelled: async (operationId, amountA, cancelledAt) => {
    console.log(`❌ Evento on-chain: Escrow.OperationCancelled #${operationId}`)
    await upsertOperation({ id: Number(operationId), status: 2, closed_at: Number(cancelledAt) })
    const op = await first('SELECT user1 FROM operations WHERE id = ?', [Number(operationId)])
    if (op && op.user1) {
      await createNotification(op.user1, 'trade', `El Trueke #${operationId} fue cancelado. Tus fondos fueron devueltos.`, String(operationId))
    }
  },

  OperationDisputed: async (operationId, disputer) => {
    console.log(`⚠️ Evento on-chain: Escrow.OperationDisputed #${operationId}`)
    // La contraparte que abre la disputa queda registrada como user2 on-chain;
    // el indexador debe reflejarlo para que las valoraciones post-disputa funcionen.
    await upsertOperation({ id: Number(operationId), user2: disputer, status: 3 })
    const op = await first('SELECT user1, user2 FROM operations WHERE id = ?', [Number(operationId)])
    const targets = new Set([disputer])
    if (op) {
      if (op.user1) targets.add(op.user1)
      if (op.user2) targets.add(op.user2)
    }
    for (const t of targets) {
      await createNotification(t, 'dispute', `Disputa abierta para el Trueke #${operationId}. Un Socio Árbitro mediará el caso.`, String(operationId))
    }
  },

  DisputeResolved: async (operationId, favorUser1, resolvedAt) => {
    console.log(`⚖️ Evento on-chain: Escrow.DisputeResolved #${operationId} (favorUser1: ${favorUser1})`)
    await upsertOperation({ id: Number(operationId), status: 1, closed_at: Number(resolvedAt) })
    const op = await first('SELECT user1, user2 FROM operations WHERE id = ?', [Number(operationId)])
    if (op && op.user1) {
      await createNotification(op.user1, 'dispute', `Disputa del Trueke #${operationId} resuelta por el árbitro.`, String(operationId))
    }
    if (op && op.user2) {
      await createNotification(op.user2, 'dispute', `Disputa del Trueke #${operationId} resuelta por el árbitro.`, String(operationId))
    }
  },

  OperationExpired: async (operationId, user1, amountA, expiredAt) => {
    console.log(`⏳ Evento on-chain: Escrow.OperationExpired #${operationId}`)
    await upsertOperation({ id: Number(operationId), status: 2, closed_at: Number(expiredAt) })
    await createNotification(user1, 'trade', `El Trueke #${operationId} venció y reclamaste tus fondos.`, String(operationId))
  },
}

let CHUNK_OVERRIDE = 0
const chunkSize = () => (CHUNK_OVERRIDE > 0 ? CHUNK_OVERRIDE : CHUNK)

/**
 * Backfill histórico: procesa los logs de `fromBlock` a `toBlock` en chunks y
 * despacha cada evento al handler correspondiente (mismo código que el listener).
 */
async function backfillLogs(contract, iface, topics, handlerMap, label) {
  let from = START_BLOCK
  const latest = await contract.runner.provider.getBlockNumber()
  if (from > latest) return 0
  let processed = 0
  while (from <= latest) {
    const size = chunkSize()
    const to = Math.min(from + size - 1, latest)
    try {
      const logs = await contract.runner.provider.getLogs({
        address: contract.target,
        fromBlock: from,
        toBlock: to,
        topics: [topics],
      })
      for (const log of logs) {
        const parsed = iface.parseLog(log)
        if (!parsed) continue
        const handler = handlerMap[parsed.name]
        if (handler) {
          await handler(...parsed.args.map((a) => (typeof a === 'bigint' ? a : a)))
        }
        processed++
      }
      if (from === latest) break
      from = to + 1
    } catch (err) {
      console.error(`❌ Error en backfill ${label} (bloques ${from}-${to}):`, err.message)
      if (to - from > 10) {
        CHUNK_OVERRIDE = Math.max(10, Math.floor((to - from + 1) / 2))
        continue
      }
      throw err
    }
  }
  return processed
}

/** Envuelve un listener para que un error en una escritura NO tumbe el indexador. */
function safeListener(handler) {
  return (...args) => {
    Promise.resolve()
      .then(() => handler(...args))
      .catch((err) => console.error('❌ Error en listener de eventos:', err?.message || err))
  }
}

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
    const escrowAbi = loadAbi('Escrow')
    const escrow = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, provider)
    contracts.push({ name: 'Escrow', contract: escrow })

    // Sincronización histórica (eventos anteriores al arranque del indexador)
    const escrowIface = new ethers.Interface(escrowAbi)
    for (const [eventName, handler] of Object.entries(escrowHandlers)) {
      try {
        const topic = escrowIface.getEvent(eventName)?.topicHash
        if (topic) {
          const n = await backfillLogs(escrow, escrowIface, topic, { [eventName]: handler }, `Escrow.${eventName}`)
          if (n > 0) console.log(`  ↻ Backfill Escrow.${eventName}: ${n} evento(s) procesado(s)`)
        }
      } catch (err) {
        console.error(`❌ No se pudo hacer backfill de Escrow.${eventName}:`, err.message)
      }
    }

    // Listeners en tiempo real
    for (const [eventName, handler] of Object.entries(escrowHandlers)) {
      escrow.on(eventName, (...args) => {
        const event = args[args.length - 1]
        const values = args.slice(0, -1)
        console.log(`🔔 Evento on-chain en vivo: Escrow.${eventName} #${event?.args?.[0]?.toString?.() ?? ''}`)
        handler(...values).catch((err) => console.error(`❌ Error procesando ${eventName}:`, err.message))
      })
    }
  }

  if (REGISTRY_ADDRESS) {
    const registryAbi = loadAbi('UserRegistry')
    const registry = new ethers.Contract(REGISTRY_ADDRESS, registryAbi, provider)
    contracts.push({ name: 'UserRegistry', contract: registry })

    async function handleUserRegistered(
      wallet,
      username,
      email,
      phone,
      physicalAddress,
      utmEasting,
      utmNorthing,
      utmZone,
      isNorthernHemisphere,
      regAt,
      level
    ) {
      const lvlNum = Number(level)
      const lvlStr = lvlNum === 1 ? 'verificado' : lvlNum === 2 ? 'certificado' : 'inscrito'
      const hemStr = isNorthernHemisphere ? 'N' : 'S'
      console.log(
        `👤 Evento on-chain: UserRegistry.UserRegistered -> @${username} (${wallet.slice(0, 6)}...) [${lvlStr}] (UTM: ${utmZone}${hemStr} ${utmEasting}m E, ${utmNorthing}m N)`
      )
      await upsertUser(
        wallet,
        username,
        regAt,
        lvlStr,
        email,
        phone,
        physicalAddress,
        utmEasting,
        utmNorthing,
        utmZone,
        hemStr
      )
    }

    // Backfill histórico de registros (eventos anteriores al arranque)
    try {
      const registryIface = new ethers.Interface(registryAbi)

      async function handleLevelUpdated(wallet, newLevel) {
        const lvlNum = Number(newLevel)
        const lvlStr = lvlNum === 1 ? 'verificado' : lvlNum === 2 ? 'certificado' : 'inscrito'
        console.log(`🛡️ Evento on-chain: UserRegistry.IdentificationLevelUpdated -> ${wallet.slice(0, 6)}... -> ${lvlStr}`)
        await updateUserLevel(wallet, lvlStr)
      }

      const regTopic = registryIface.getEvent('UserRegistered')?.topicHash
      if (regTopic) {
        const n = await backfillLogs(registry, registryIface, regTopic, {
          UserRegistered: handleUserRegistered,
        }, 'UserRegistry.UserRegistered')
        if (n > 0) console.log(`  ↻ Backfill UserRegistry.UserRegistered: ${n} evento(s) procesado(s)`)
      }
      const lvlTopic = registryIface.getEvent('IdentificationLevelUpdated')?.topicHash
      if (lvlTopic) {
        const n = await backfillLogs(registry, registryIface, lvlTopic, {
          IdentificationLevelUpdated: handleLevelUpdated,
        }, 'UserRegistry.IdentificationLevelUpdated')
        if (n > 0) console.log(`  ↻ Backfill UserRegistry.IdentificationLevelUpdated: ${n} evento(s) procesado(s)`)
      }
    } catch (err) {
      console.error('❌ No se pudo hacer backfill de UserRegistry:', err.message)
    }

    registry.on(
      'UserRegistered',
      safeListener(
        async (
          wallet,
          username,
          email,
          phone,
          physicalAddress,
          utmEasting,
          utmNorthing,
          utmZone,
          isNorthernHemisphere,
          regAt,
          level
        ) => {
          await handleUserRegistered(
            wallet,
            username,
            email,
            phone,
            physicalAddress,
            utmEasting,
            utmNorthing,
            utmZone,
            isNorthernHemisphere,
            regAt,
            level
          )
        })
    )

    registry.on('IdentificationLevelUpdated', safeListener(async (wallet, newLevel) => {
      await handleLevelUpdated(wallet, newLevel)
    }))

    registry.on('ReputationUpdated', safeListener(async (wallet, completed, lost, rank) => {
      const rankNum = Number(rank)
      const rankStr = rankNum === 3 ? 'oro' : rankNum === 2 ? 'plata' : 'bronce'
      const compNum = Number(completed)
      const lostNum = Number(lost)
      const total = compNum + lostNum
      const eff = total > 0 ? (compNum * 100) / total : 100.0
      console.log(`🏆 Evento on-chain: UserRegistry.ReputationUpdated -> ${wallet.slice(0, 6)}... [${rankStr.toUpperCase()}] (${compNum} completados, ${lostNum} perdidos, ${eff.toFixed(1)}% eff)`)
      await ensureUserRow(wallet)
      await query(
        `UPDATE users SET completed_trades = ?, disputes_lost = ?, reputation_rank = ?, effectiveness_pct = ? WHERE address = ?`,
        [compNum, lostNum, rankStr, eff, wallet.toLowerCase()]
      )
    }))
  }

  const GOVERNANCE_ADDRESS = process.env.NEXT_PUBLIC_GOVERNANCE_ADDRESS
  if (GOVERNANCE_ADDRESS && loadAbi('Governance').length > 0) {
    const gov = new ethers.Contract(GOVERNANCE_ADDRESS, loadAbi('Governance'), provider)
    contracts.push({ name: 'Governance', contract: gov })

    gov.on('SocioSet', safeListener(async (account, flag) => {
      console.log(`⚖️ Evento on-chain: Governance.SocioSet -> ${account.slice(0, 6)}... (Socio: ${flag})`)
      await ensureUserRow(account)
      await query(`UPDATE users SET role = 'socio' WHERE address = ?`, [account.toLowerCase()])
    }))

    gov.on('SocioApplicationCreated', safeListener(async (id, candidate, motivation, depToken, depAmount, created) => {
      console.log(`📝 Evento on-chain: Governance.SocioApplicationCreated #${id} por ${candidate.slice(0, 6)}...`)
      await query(
        `INSERT INTO socio_applications (id, candidate, motivation, deposit_token, deposit_amount, created_at, status)
         VALUES (?, ?, ?, ?, ?, ?, 'voting')
         ON CONFLICT(id) DO UPDATE SET motivation = excluded.motivation`,
        [Number(id), candidate.toLowerCase(), motivation, depToken, depAmount.toString(), Number(created)]
      )
      await createNotification(candidate, 'governance', `Tu postulación a Socio #${id} está en votación (ventana de 5 días).`, String(id))
    }))

    gov.on('SocioApplicationVoted', safeListener(async (id, socio, support) => {
      console.log(`🗳️ Evento on-chain: Governance.SocioApplicationVoted #${id} por ${socio.slice(0, 6)}... (Voto: ${support ? 'SÍ' : 'NO'})`)
      if (support) {
        await query(`UPDATE socio_applications SET yes_votes = yes_votes + 1 WHERE id = ?`, [Number(id)])
      } else {
        await query(`UPDATE socio_applications SET no_votes = no_votes + 1 WHERE id = ?`, [Number(id)])
      }
    }))

    gov.on('SocioApplicationResolved', safeListener(async (id, candidate, passed) => {
      console.log(`🏛️ Evento on-chain: Governance.SocioApplicationResolved #${id} -> ${passed ? 'APROBADA' : 'RECHAZADA'}`)
      const status = passed ? 'approved' : 'rejected'
      const now = Math.floor(Date.now() / 1000)
      await query(`UPDATE socio_applications SET status = ?, resolved_at = ? WHERE id = ?`, [status, now, Number(id)])
      if (passed) {
        await ensureUserRow(candidate)
        await query(`UPDATE users SET role = 'socio' WHERE address = ?`, [candidate.toLowerCase()])
        await createNotification(candidate, 'governance', `¡Felicidades! Tu postulación a Socio #${id} fue aprobada. Ahora tienes rol de Socio y Árbitro.`, String(id))
      } else {
        await createNotification(candidate, 'governance', `Tu postulación a Socio #${id} no alcanzó los votos requeridos. Tu depósito fue reembolsado.`, String(id))
      }
    }))
  }

  if (SBT_REGISTRY_ADDRESS && loadAbi('SBTRegistry').length > 0) {
    const sbtReg = new ethers.Contract(SBT_REGISTRY_ADDRESS, loadAbi('SBTRegistry'), provider)
    contracts.push({ name: 'SBTRegistry', contract: sbtReg })

    sbtReg.on('UserCertifiedViaExternal', safeListener(async (user, providerAddr, provName) => {
      console.log(`🎖️ Evento on-chain: SBTRegistry.UserCertifiedViaExternal -> ${user.slice(0, 6)}... vía ${provName}`)
      await updateSBTInfo(user, provName)
    }))
  }

  if (TRUEKE_SBT_ADDRESS && loadAbi('TruekeSBT').length > 0) {
    const sbtContract = new ethers.Contract(TRUEKE_SBT_ADDRESS, loadAbi('TruekeSBT'), provider)
    contracts.push({ name: 'TruekeSBT', contract: sbtContract })

    sbtContract.on('CredentialIssued', safeListener(async (user, tokenId, originProvider) => {
      console.log(`🎖️ Evento on-chain: TruekeSBT.CredentialIssued #${tokenId} -> ${user.slice(0, 6)}... (${originProvider})`)
      await updateSBTInfo(user, originProvider, tokenId.toString())
    }))
  }

  // Suscripciones de Empresas (M9): sincronizar estado a la capa de datos
  if (SUBSCRIPTION_ADDRESS && loadAbi('Subscription').length > 0) {
    const sub = new ethers.Contract(SUBSCRIPTION_ADDRESS, loadAbi('Subscription'), provider)
    contracts.push({ name: 'Subscription', contract: sub })

    sub.on('Subscribed', safeListener(async (company, months, paidUntil) => {
      console.log(`💳 Evento on-chain: Subscription.Subscribed -> ${company.slice(0, 6)}... (${months} meses, hasta ${paidUntil})`)
      await ensureUserRow(company)
      await query(
        `INSERT INTO subscriptions (address, plan, status, paid_until, updated_at)
         VALUES (?, 'mensual', 'active', ?, ?)
         ON CONFLICT(address) DO UPDATE SET status = 'active', paid_until = excluded.paid_until, updated_at = excluded.updated_at`,
        [company.toLowerCase(), Number(paidUntil), Math.floor(Date.now() / 1000)]
      )
      await query(`UPDATE users SET subscription_status = 'active' WHERE address = ?`, [company.toLowerCase()])
    }))

    sub.on('BusinessFlagSet', safeListener(async (company, flag) => {
      console.log(`🏬 Evento on-chain: Subscription.BusinessFlagSet -> ${company.slice(0, 6)}... (empresa: ${flag})`)
      await ensureUserRow(company)
      await query(`UPDATE users SET is_business = ? WHERE address = ?`, [flag ? 1 : 0, company.toLowerCase()])
    }))
  }

  console.log(`\n👂 Indexador activo y sincronizando ${contracts.length} contratos inteligentes en tiempo real...`)
  console.log(`   (Todos los eventos modificarán automáticamente la base de datos "TrueKeate")\n`)
}

process.on('uncaughtException', (err) => {
  if (err?.message && err.message.includes('filter not found')) {
    console.warn('⚠️ [Indexer] Filtro de polling expirado en Anvil (recuperado automáticamente)')
    return
  }
  console.error('⚠️ [Indexer] Excepción no capturada:', err)
})

process.on('unhandledRejection', (reason) => {
  const msg = typeof reason === 'object' && reason !== null && 'message' in reason ? String(reason.message) : String(reason)
  if (msg.includes('filter not found')) {
    console.warn('⚠️ [Indexer] Filtro de polling expirado en Anvil (recuperado automáticamente)')
    return
  }
  console.error('⚠️ [Indexer] Promesa rechazada:', reason)
})

main().catch((err) => {
  console.error('❌ Error fatal en Indexador:', err)
  process.exit(1)
})
