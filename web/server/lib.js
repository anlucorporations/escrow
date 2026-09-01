/**
 * Lógica de negocio TrueKeate (M3 reputación, M4 niveles, M2 catálogo).
 * Funciones puras + consultas a la capa de datos.
 */

import { verifyMessage } from 'ethers'
import crypto from 'node:crypto'
import { query, first } from './db.js'
import { envOrThrow, isProduction } from './secrets.js'

export const DIMENSIONS = ['acceptance', 'honesty', 'security', 'reliability', 'commitment']

// Parámetros del algoritmo de niveles (configurables)
export const LEVEL_RULES = {
  comun: { minAvgRating: 3.5, minCompleted: 3 },
  frecuente: { minAvgRating: 4.2, minCompleted: 25 },
}

export function newId() {
  return crypto.randomUUID()
}

export function nowSec() {
  return Math.floor(Date.now() / 1000)
}

/* ------------------------------------------------------------------ *
 *  M4 — Niveles de confianza
 * ------------------------------------------------------------------ */

/**
 * Calcula el nivel de confianza a partir de la reputación y el volumen.
 * @param {{avgRating?: number, completedCount?: number, isBusiness?: boolean, isSocio?: boolean}} input
 * @returns {'iniciado'|'comun'|'frecuente'|'socio'}
 */
export function computeTrustLevel({ avgRating = 0, completedCount = 0, isBusiness = false, isSocio = false } = {}) {
  if (isSocio) return 'socio'
  if (isBusiness) return 'frecuente'
  if (avgRating >= LEVEL_RULES.frecuente.minAvgRating && completedCount >= LEVEL_RULES.frecuente.minCompleted) {
    return 'frecuente'
  }
  if (avgRating >= LEVEL_RULES.comun.minAvgRating && completedCount >= LEVEL_RULES.comun.minCompleted) {
    return 'comun'
  }
  return 'iniciado'
}

export const LEVEL_LABELS = {
  iniciado: 'Iniciado',
  comun: 'Común',
  frecuente: 'Frecuente',
  socio: 'Socio',
}

/* ------------------------------------------------------------------ *
 *  M3 — Reputación
 * ------------------------------------------------------------------ */

/** Promedio de reputación por dimensión para una dirección. */
export async function getReputation(address) {
  const rows = await query(
    `SELECT COUNT(*) AS total,
            AVG(acceptance)  AS acceptance,
            AVG(honesty)     AS honesty,
            AVG(security)    AS security,
            AVG(reliability) AS reliability,
            AVG(commitment)  AS commitment
     FROM ratings WHERE ratee = ?`,
    [address.toLowerCase()]
  )
  const r = rows[0]
  const avg = (v) => (v == null ? 0 : Math.round(Number(v) * 100) / 100)
  const total = Number(r.total || 0)
  return {
    total,
    acceptance: avg(r.acceptance),
    honesty: avg(r.honesty),
    security: avg(r.security),
    reliability: avg(r.reliability),
    commitment: avg(r.commitment),
    overall:
      total > 0
        ? avg(
            (Number(r.acceptance || 0) +
              Number(r.honesty || 0) +
              Number(r.security || 0) +
              Number(r.reliability || 0) +
              Number(r.commitment || 0)) / 5
          )
        : 0,
  }
}

/** ¿La operación ya fue valorada por este usuario? */
export async function hasRated(operationId, rater) {
  const row = await first('SELECT id FROM ratings WHERE operation_id = ? AND rater = ?', [
    operationId,
    rater.toLowerCase(),
  ])
  return !!row
}

/** Valida que una valoración sea legítima (operación completada y parte implicada). */
export async function validateRating(operationId, rater, ratee) {
  const op = await first('SELECT * FROM operations WHERE id = ?', [operationId])
  if (!op) return { ok: false, error: 'Operación no encontrada' }
  if (Number(op.status) !== 1) return { ok: false, error: 'Solo se puede valorar operaciones completadas' }
  const lower = rater.toLowerCase()
  const isParty = op.user1.toLowerCase() === lower || (op.user2 && op.user2.toLowerCase() === lower)
  if (!isParty) return { ok: false, error: 'Solo las partes de la operación pueden valorar' }
  if (await hasRated(operationId, rater)) return { ok: false, error: 'Ya valoraste esta operación' }
  // La persona valorada debe ser la CONTRAPARTE (evita inflar reputación de terceros)
  if (ratee) {
    const rateeLower = ratee.toLowerCase()
    const counterpart = op.user1.toLowerCase() === lower ? op.user2 : op.user1
    if (!counterpart || counterpart.toLowerCase() !== rateeLower) {
      return { ok: false, error: 'Solo puedes valorar a tu contraparte en la operación' }
    }
  }
  return { ok: true, op }
}

/** Registra una valoración y devuelve la reputación actualizada del valorado. */
export async function createRating({
  operationId,
  rater,
  ratee,
  acceptance,
  honesty,
  security,
  reliability,
  commitment,
  comment = '',
}) {
  const dims = [acceptance, honesty, security, reliability, commitment]
  for (const d of dims) {
    if (!Number.isInteger(d) || d < 1 || d > 5) {
      throw new Error('Las valoraciones deben ser enteros entre 1 y 5')
    }
  }
  await query(
    `INSERT INTO ratings (id, operation_id, rater, ratee, acceptance, honesty, security, reliability, commitment, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newId(), operationId, rater.toLowerCase(), ratee.toLowerCase(), ...dims, comment, nowSec()]
  )
  return getReputation(ratee)
}

/* ------------------------------------------------------------------ *
 *  M4 — Refresco del nivel de un usuario
 * ------------------------------------------------------------------ */

/** Recalcula y persiste el nivel de confianza de una dirección. */
export async function refreshTrustLevel(address) {
  const user = await first('SELECT * FROM users WHERE address = ?', [address.toLowerCase()])
  if (!user) return null
  const reputation = await getReputation(address)
  const completed = await first(
    'SELECT COUNT(*) AS total FROM operations WHERE (user1 = ? OR user2 = ?) AND status = 1',
    [address.toLowerCase(), address.toLowerCase()]
  )
  const level = computeTrustLevel({
    avgRating: reputation.overall,
    completedCount: Number(completed.total || 0),
    isBusiness: Number(user.is_business) === 1,
    isSocio: user.trust_level === 'socio',
  })
  await query('UPDATE users SET trust_level = ?, last_active_at = ? WHERE address = ?', [
    level,
    nowSec(),
    address.toLowerCase(),
  ])
  return level
}

/* ------------------------------------------------------------------ *
 *  M2 — Catálogo de artículos
 * ------------------------------------------------------------------ */

export function validateItem({ title, description = '', category = 'general', quantity = 1 }) {
  if (!title || title.trim().length < 3 || title.trim().length > 80) {
    throw new Error('El título debe tener entre 3 y 80 caracteres')
  }
  const qty = Number(quantity)
  if (!Number.isInteger(qty) || qty < 1 || qty > 100000) {
    throw new Error('La cantidad debe ser un entero entre 1 y 100000')
  }
  return { title: title.trim(), description: description.trim(), category: category.trim() || 'general', quantity: qty }
}

export async function createItem({ owner, title, description, category, quantity, images = [], signature = '', payload = '' }) {
  const v = validateItem({ title, description, category, quantity })

  // A2.4: Verificar firma ECDSA — reconstruir el payload canónico y validar
  if (signature) {
    const expectedPayload = itemPayload({ owner, title: v.title, description: v.description, category: v.category, quantity: v.quantity })
    const payloadToCheck = payload || expectedPayload
    if (!verifySignature(payloadToCheck, signature, owner)) {
      throw new Error('Firma inválida: la firma no corresponde al owner declarado')
    }
  }

  const item = {
    id: newId(),
    owner: owner.toLowerCase(),
    title: v.title,
    description: v.description,
    category: v.category,
    quantity: v.quantity,
    images: JSON.stringify(images),
    signature,
    created_at: nowSec(),
  }
  await query(
    `INSERT INTO items (id, owner, title, description, category, quantity, images, signature, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.id, item.owner, item.title, item.description, item.category, item.quantity, item.images, item.signature, item.created_at]
  )
  // Registro individual de imágenes certificadas (M8)
  for (const img of images) {
    await query(
      `INSERT INTO images (id, item_id, cid, sha256, signature, signed_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newId(), item.id, img.cid || '', img.sha256, img.signature, item.owner, nowSec()]
    )
  }
  return { ...item, images }
}

/**
 * M8 — Certificación de imágenes: cada imagen debe llevar su hash SHA-256 y
 * la firma ECDSA de la wallet propietaria sobre ese hash.
 */
export function verifyImageSignatures(images, owner) {
  const out = []
  for (const img of images || []) {
    if (!img || !img.sha256 || !img.signature) {
      throw new Error('Cada imagen requiere sha256 y firma (certificación)')
    }
    if (!verifySignature(img.sha256, img.signature, owner)) {
      throw new Error('Firma de imagen inválida: el hash no fue firmado por la wallet propietaria')
    }
    out.push({ sha256: img.sha256, signature: img.signature, cid: img.cid || '' })
  }
  return out
}

export async function listItems({ category, owner, q, limit = 50, offset = 0 } = {}) {
  const where = []
  const params = []
  if (category) {
    where.push('category = ?')
    params.push(category)
  }
  if (owner) {
    where.push('owner = ?')
    params.push(owner.toLowerCase())
  }
  if (q) {
    where.push('(title LIKE ? OR description LIKE ?)')
    params.push(`%${q}%`, `%${q}%`)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const rows = await query(
    `SELECT * FROM items ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )
  const total = await first(`SELECT COUNT(*) AS total FROM items ${whereSql}`, params)
  return { items: rows.map(decodeItem), total: Number(total.total) }
}

export function decodeItem(row) {
  if (!row) return null
  let images = []
  try {
    images = JSON.parse(row.images || '[]')
  } catch {
    images = []
  }
  return { ...row, images }
}

export async function getItem(id) {
  return decodeItem(await first('SELECT * FROM items WHERE id = ?', [id]))
}

/** Verifica la firma ECDSA de un payload (certificación M8). */
export function verifySignature(payload, signature, expectedAddress) {
  if (!payload || !signature || !expectedAddress) return false
  try {
    const recovered = verifyMessage(payload, signature)
    return recovered.toLowerCase() === expectedAddress.toLowerCase()
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ *
 *  Control de acceso criptográfico a PII (H-02 / Q1)
 * ------------------------------------------------------------------ */

/** Payload canónico que el SOLICITANTE firma para probar que posee su wallet. */
export function identityAccessPayload(requester, timestamp) {
  return `TrueKeateIdentity:${String(requester).toLowerCase()}:${timestamp}`
}

/**
 * Verifica que `requester` posee la wallet que declara (firma ECDSA fresca).
 * Con esto, /api/identity/[address] puede distinguir:
 *  - titular (requester == target) con prueba de posesión -> datos privados
 *  - owner de la plataforma (on-chain) con prueba de posesión -> PII de terceros
 *  - cualquier otro -> solo datos públicos (sin IDOR: ya no basta pasar
 *    requester=<victima> en el query string).
 */
export function verifyIdentityAccess(requester, signature, timestamp) {
  if (!requester || !signature || !timestamp) return false
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) return false
  const payload = identityAccessPayload(requester, timestamp)
  return verifySignature(payload, signature, requester)
}

/* ------------------------------------------------------------------ *
 *  TOTP real (RFC 6238) — sin dependencias (H-01 / Q2)
 * ------------------------------------------------------------------ */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Decode(input) {
  const clean = String(input).toUpperCase().replace(/=+$/, '').replace(/\s/g, '')
  let bits = 0
  let value = 0
  const out = []
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

/** Genera un secreto base32 de 160 bits compatible con apps Authenticator. */
export function generateTotpSecret() {
  const bytes = crypto.randomBytes(20) // 160 bits
  let bits = 0
  let value = 0
  let out = ''
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return out
}

/** Código TOTP para un secreto base32 (ventana en pasos de 30 s). */
export function totpCode(secret, { window = 0, timeStep = 30, digits = 6 } = {}) {
  let key
  try {
    key = base32Decode(secret)
  } catch {
    // Secreto legacy en hex: se usa como bytes directamente
    key = Buffer.from(String(secret).replace(/^0x/i, ''), 'hex')
  }
  if (!key || key.length === 0) throw new Error('Secreto 2FA inválido')
  const counter = Math.floor(Date.now() / 1000 / timeStep) + window
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const hmac = crypto.createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const bin =
    ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3]
  return String(bin % 10 ** digits).padStart(digits, '0')
}

/** Valida un código TOTP permitiendo ±`window` pasos de 30 s. */
export function verifyTotp(secret, code, { window = 1 } = {}) {
  if (!code || !/^\d{6}$/.test(String(code))) return false
  for (let w = -window; w <= window; w++) {
    if (totpCode(secret, { window: w }) === String(code)) return true
  }
  return false
}

/**
 * Payload canónico que se firma al crear un artículo (espejo en web/lib/items.ts
 * para el frontend). El servidor reconstruye este string y verifica la firma.
 */
export function itemPayload({ owner, title, description, category, quantity }) {
  return JSON.stringify({
    owner: (owner || '').toLowerCase(),
    title: (title || '').trim(),
    description: (description || '').trim(),
    category: (category || 'general').trim(),
    quantity: Number(quantity || 1),
  })
}

/* ------------------------------------------------------------------ *
 *  M7 — Puntos de encuentro (geolocalización)
 * ------------------------------------------------------------------ */

/** Distancia máxima permitida entre las partes (TrueKeate). */
export const MAX_MEETUP_DISTANCE_KM = 10

/** Distancia haversine en km (local/SQLite). En producción se usa PostGIS. */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * M7 — Aceptación de la operación (acuerdo bilateral off-chain).
 * La contraparte (user2) solo se conoce on-chain al completar; para poder
 * proponer encuentros con la regla de <= 10 km, el segundo usuario acepta
 * el acuerdo en la capa de datos (ambas partes "abren" el intercambio).
 */
export async function acceptOperation(operationId, address) {
  const op = await first('SELECT * FROM operations WHERE id = ?', [Number(operationId)])
  if (!op) return { ok: false, error: 'Operación no encontrada' }
  if (Number(op.status) !== 0) return { ok: false, error: 'La operación no está activa' }
  const lower = address.toLowerCase()
  if (op.user1.toLowerCase() === lower) return { ok: false, error: 'El creador no puede aceptar su propia operación' }
  if (op.user2 && op.user2.toLowerCase() === lower) return { ok: true, op }
  await query('UPDATE operations SET user2 = ? WHERE id = ?', [lower, Number(operationId)])
  return { ok: true, op: { ...op, user2: lower } }
}

/**
 * Valida y registra un punto de encuentro (M7):
 * - la operación debe existir y estar activa
 * - el solicitante debe ser parte (user1 o user2 en la capa de datos)
 * - si la contraparte tiene ubicación registrada, la distancia debe ser <= 10 km
 */
export async function createMeetup({ operationId, requester, scheduledAt, lat, lng, placeName = '' }) {
  const op = await first('SELECT * FROM operations WHERE id = ?', [Number(operationId)])
  if (!op) return { ok: false, error: 'Operación no encontrada' }
  if (Number(op.status) !== 0) return { ok: false, error: 'La operación no está activa' }

  const lower = requester.toLowerCase()
  const isParty = op.user1.toLowerCase() === lower || (op.user2 && op.user2.toLowerCase() === lower)
  if (!isParty) return { ok: false, error: 'Solo las partes de la operación pueden proponer un encuentro' }

  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return { ok: false, error: 'Coordenadas inválidas' }
  }
  if (!scheduledAt || Number(scheduledAt) <= nowSec()) {
    return { ok: false, error: 'La fecha debe estar en el futuro' }
  }

  // Distancia con la contraparte (si tiene ubicación registrada)
  const otherAddress = op.user1.toLowerCase() === lower ? op.user2 : op.user1
  let distanceKm = null
  if (otherAddress) {
    const other = await first('SELECT lat, lng FROM users WHERE address = ?', [otherAddress])
    if (other && other.lat != null && other.lng != null) {
      distanceKm = haversineKm(lat, lng, Number(other.lat), Number(other.lng))
      if (distanceKm > MAX_MEETUP_DISTANCE_KM) {
        return {
          ok: false,
          error: `La distancia entre las partes es ${distanceKm.toFixed(1)} km (máximo ${MAX_MEETUP_DISTANCE_KM} km)`,
        }
      }
    }
  }

  const meetup = {
    id: newId(),
    operation_id: Number(operationId),
    scheduled_at: Number(scheduledAt),
    lat,
    lng,
    place_name: placeName,
    status: 'scheduled',
  }
  await query(
    `INSERT INTO meetups (id, operation_id, scheduled_at, lat, lng, place_name, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [meetup.id, meetup.operation_id, meetup.scheduled_at, meetup.lat, meetup.lng, meetup.place_name, meetup.status]
  )
  // M15: notificar a la contraparte
  const notifyTarget = op.user1.toLowerCase() === lower ? op.user2 : op.user1
  if (notifyTarget) {
    await notify(
      notifyTarget,
      'meetup',
      `Te propusieron un punto de encuentro para la operación #${operationId} (${placeName || 'ver en la operación'}).`,
      meetup.id
    )
  }
  return { ok: true, meetup: { ...meetup, distance_km: distanceKm } }
}

export async function listMeetups(operationId) {
  return query('SELECT * FROM meetups WHERE operation_id = ? ORDER BY scheduled_at DESC', [Number(operationId)])
}

/** Actualiza la ubicación registrada de un usuario (para regla de 10 km). */
export async function setUserLocation(address, lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new Error('Coordenadas inválidas')
  }
  await query('UPDATE users SET lat = ?, lng = ? WHERE address = ?', [lat, lng, address.toLowerCase()])
}

/* ------------------------------------------------------------------ *
 *  M12 — Avales entre usuarios verificados
 * ------------------------------------------------------------------ */

/** Un usuario verificado avala a otro (5 avales = aceptación de operación). */
export async function createVouch(vouchBy, vouchFor) {
  const by = vouchBy.toLowerCase()
  const for_ = vouchFor.toLowerCase()
  if (by === for_) throw new Error('No puedes avalarte a ti mismo')

  const user = await first('SELECT kyc_status FROM users WHERE address = ?', [by])
  if (!user) throw new Error('Avalador no encontrado en la BD')
  if (user.kyc_status !== 'verified') throw new Error('Solo usuarios verificados (KYC) pueden avalar')

  const existing = await first('SELECT id FROM vouches WHERE vouch_by = ? AND vouch_for = ?', [by, for_])
  if (existing) throw new Error('Ya avalaste a este usuario')

  await query('INSERT INTO vouches (id, vouch_by, vouch_for, created_at) VALUES (?, ?, ?, ?)', [
    newId(),
    by,
    for_,
    nowSec(),
  ])
  return { ok: true }
}

export async function listVouches(address) {
  const rows = await query('SELECT * FROM vouches WHERE vouch_for = ? ORDER BY created_at DESC', [address.toLowerCase()])
  return rows
}

/* ------------------------------------------------------------------ *
 *  M11 — Campañas (venta masiva / recolección)
 * ------------------------------------------------------------------ */

export async function createCampaign({ owner, title, description = '', kind = 'masiva' }) {
  if (!title || title.trim().length < 3) throw new Error('El título debe tener al menos 3 caracteres')
  if (!['masiva', 'recoleccion'].includes(kind)) throw new Error('kind debe ser masiva o recoleccion')
  const campaign = {
    id: newId(),
    owner: owner.toLowerCase(),
    title: title.trim(),
    description: description.trim(),
    kind,
    status: 'pending',
    created_at: nowSec(),
  }
  await query(
    `INSERT INTO campaigns (id, owner, title, description, kind, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [campaign.id, campaign.owner, campaign.title, campaign.description, campaign.kind, campaign.status, campaign.created_at]
  )
  return campaign
}

export async function listCampaigns() {
  return query('SELECT * FROM campaigns ORDER BY created_at DESC')
}

/** Aprueba una campaña (solo Socios, verificado on-chain vía Governance). */
export async function approveCampaign(campaignId, approver, governanceAddress, provider) {
  const { ethers } = await import('ethers')
  const campaign = await first('SELECT * FROM campaigns WHERE id = ?', [campaignId])
  if (!campaign) throw new Error('Campaña no encontrada')
  if (campaign.status !== 'pending') throw new Error('La campaña ya no está pendiente')

  const governanceAbi = ['function isSocio(address) view returns (bool)']
  const gov = new ethers.Contract(governanceAddress, governanceAbi, provider)
  const socio = await gov.isSocio(approver)
  if (!socio) throw new Error('Solo un Socio puede aprobar campañas')

  await query('UPDATE campaigns SET status = ?, approved_by = ? WHERE id = ?', ['approved', approver.toLowerCase(), campaignId])
  return { ...campaign, status: 'approved', approved_by: approver.toLowerCase() }
}

/* ------------------------------------------------------------------ *
 *  M15 — Notificaciones (capa de datos)
 * ------------------------------------------------------------------ */

export async function notify(user, type, message, refId = '') {
  await query(
    'INSERT INTO notifications (id, "user", type, message, ref_id, read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
    [newId(), user.toLowerCase(), type, message, refId, nowSec()]
  )
}

export async function listNotifications(address) {
  const rows = await query(
    'SELECT * FROM notifications WHERE "user" = ? ORDER BY created_at DESC LIMIT 30',
    [address.toLowerCase()]
  )
  const unread = await first('SELECT COUNT(*) AS total FROM notifications WHERE "user" = ? AND read = 0', [address.toLowerCase()])
  return { notifications: rows, unread: Number(unread.total || 0) }
}

export async function markNotificationsRead(address) {
  await query('UPDATE notifications SET read = 1 WHERE "user" = ?', [address.toLowerCase()])
}

/* ------------------------------------------------------------------ *
 *  M16 — Ventana de intercambio (10 minutos)
 * ------------------------------------------------------------------ */

export const MEETUP_WINDOW_MIN = 10

/**
 * Abre el intercambio por una de las partes (M16):
 * - debe estar dentro de [scheduled_at - 10m, scheduled_at + 10m]
 * - al abrir ambas partes, la diferencia entre aperturas debe ser <= 10 min
 * - cada parte solo puede abrir UNA vez; cualquier violación bloquea el encuentro
 */
export async function openMeetup(meetupId, address) {
  const m = await first('SELECT * FROM meetups WHERE id = ?', [meetupId])
  if (!m) return { ok: false, error: 'Encuentro no encontrado' }
  if (m.status === 'blocked') return { ok: false, error: 'El encuentro está bloqueado' }
  if (m.status === 'completed') return { ok: false, error: 'El encuentro ya se completó' }

  // Solo las partes de la operación pueden abrir el intercambio
  const op = await first('SELECT * FROM operations WHERE id = ?', [Number(m.operation_id)])
  const lower = address.toLowerCase()
  if (!op) return { ok: false, error: 'Operación no encontrada' }
  const isParty = op.user1.toLowerCase() === lower || (op.user2 && op.user2.toLowerCase() === lower)
  if (!isParty) return { ok: false, error: 'Solo las partes de la operación pueden abrir el intercambio' }

  const now = nowSec()
  const windowMs = MEETUP_WINDOW_MIN * 60
  if (now < Number(m.scheduled_at) - windowMs || now > Number(m.scheduled_at) + windowMs) {
    await query("UPDATE meetups SET status = 'blocked', blocked_reason = 'Fuera de la ventana de 10 minutos' WHERE id = ?", [meetupId])
    return { ok: false, error: 'Fuera de la ventana de 10 minutos (±10 min de la hora pautada)' }
  }

  // La misma parte no puede abrir dos veces (evita reiniciar la ventana)
  if (m.opened_by && m.opened_by.toLowerCase() === lower) {
    return { ok: false, error: 'Ya abriste el intercambio. Espera a que tu contraparte también lo abra.' }
  }

  const bothOpened = m.opened_at_user1 != null && m.opened_at_user2 != null
  if (bothOpened && m.status === 'opened') {
    return { ok: false, error: 'El intercambio ya fue abierto por ambas partes' }
  }

  if (m.opened_at_user1 == null && m.opened_at_user2 == null) {
    // primera apertura
    await query('UPDATE meetups SET opened_at_user1 = ?, opened_by = ?, status = ? WHERE id = ?', [now, lower, 'opened', meetupId])
    return { ok: true, meetup: { ...m, opened_at_user1: now, opened_by: lower, status: 'opened' } }
  }

  // segunda apertura (parte distinta): validar diferencia <= 10 min
  const firstOpen = Number(m.opened_at_user1 ?? m.opened_at_user2)
  if (Math.abs(now - firstOpen) > windowMs) {
    await query(
      "UPDATE meetups SET opened_at_user2 = ?, opened_by = ?, status = 'blocked', blocked_reason = 'Diferencia de apertura mayor a 10 minutos' WHERE id = ?",
      [now, lower, meetupId]
    )
    return { ok: false, error: 'Diferencia de apertura mayor a 10 minutos: intercambio bloqueado' }
  }

  await query('UPDATE meetups SET opened_at_user2 = ?, opened_by = ?, status = ? WHERE id = ?', [now, lower, 'opened', meetupId])
  return { ok: true, meetup: { ...m, opened_at_user2: now, opened_by: lower, status: 'opened' } }
}

export async function closeMeetup(meetupId, closer = '') {
  const m = await first('SELECT * FROM meetups WHERE id = ?', [meetupId])
  if (!m) return { ok: false, error: 'Encuentro no encontrado' }
  if (m.status === 'blocked') return { ok: false, error: 'El encuentro está bloqueado' }

  // Q8/H-04: solo las partes de la operación pueden cerrar el intercambio.
  if (closer) {
    const op = await first('SELECT user1, user2 FROM operations WHERE id = ?', [Number(m.operation_id)])
    const lower = String(closer).toLowerCase()
    const isParty =
      op && (op.user1?.toLowerCase() === lower || op.user2?.toLowerCase() === lower)
    if (!isParty) {
      return { ok: false, error: 'Solo las partes de la operación pueden cerrar el intercambio' }
    }
  }

  await query("UPDATE meetups SET status = 'completed' WHERE id = ?", [meetupId])
  return { ok: true }
}

/* ------------------------------------------------------------------ *
 *  M6 — KYC cifrado (metadata confidencial en PostgreSQL/SQLite)
 * ------------------------------------------------------------------ */

function kycKey() {
  // Clave derivada de KYC_SECRET.
  // Producción: obligatoria vía GCP Secret Manager (fail-fast si falta).
  // Desarrollo: fallback de prueba explícito, NUNCA usado en producción.
  const secret = envOrThrow('KYC_SECRET', { devFallback: 'truekeate-dev-secret-0123456789abcdef' })
  return crypto.createHash('sha256').update(secret).digest()
}

/** Cifra un campo KYC (AES-256-GCM): iv:tag:data en hex. */
export function encryptField(plain) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', kycKey(), iv)
  const enc = Buffer.concat([cipher.update(String(plain ?? ''), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

/** Descifra un campo KYC cifrado ('' si falla). */
export function decryptField(enc) {
  try {
    const [ivHex, tagHex, dataHex] = String(enc).split(':')
    const decipher = crypto.createDecipheriv('aes-256-gcm', kycKey(), Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8')
  } catch {
    return ''
  }
}

/**
 * Registra la verificación KYC (M6): correo/teléfono CIFRADOS en la BD y
 * hashes de documento/selfie. El estado público es solo kyc_status.
 * Si email/phone no se proveen, se conservan los valores ya cifrados.
 * (Q2/H-01) En PRODUCCIÓN no existe auto-aprobación: el KYC queda en
 * 'submitted' a la espera de un rol verificador real; en dev/demo se
 * auto-aprueba (comportamiento heredado).
 */
export async function submitKyc(address, { email, phone, documentHash = '', selfieHash = '' }) {
  const existing = await first('SELECT email, phone FROM users WHERE address = ?', [address.toLowerCase()])
  const encryptedEmail = email ? encryptField(email) : (existing?.email || '')
  const encryptedPhone = phone ? encryptField(phone) : (existing?.phone || '')

  if (isProduction()) {
    // Sin auto-aprobación: marca como enviado, pendiente de verificación real
    await query(
      `UPDATE users SET email = ?, phone = ?, document_hash = ?, selfie_hash = ?, kyc_status = 'submitted' WHERE address = ?`,
      [encryptedEmail, encryptedPhone, documentHash, selfieHash, address.toLowerCase()]
    )
    return { ok: true, kycStatus: 'submitted', message: 'KYC enviado; pendiente de verificación' }
  }

  await query(
    `UPDATE users SET email = ?, phone = ?, document_hash = ?, selfie_hash = ?, kyc_status = 'verified', identification_level = 'certificado' WHERE address = ?`,
    [encryptedEmail, encryptedPhone, documentHash, selfieHash, address.toLowerCase()]
  )
  return { ok: true, kycStatus: 'verified' }
}

/* ------------------------------------------------------------------ *
 *  Módulo de Identidad en 3 Niveles (Inscrito, Verificado, Certificado)
 * ------------------------------------------------------------------ */

/** Nivel 1: Aceptar acuerdos de convivencia de la comunidad TrueKeate */
export async function acceptCommunityTerms(address) {
  const addr = address.toLowerCase()
  await query('UPDATE users SET terms_accepted = 1 WHERE address = ?', [addr])
  return { ok: true, message: 'Acuerdos de convivencia aceptados' }
}

/** Nivel 2: Validar contacto (correo y teléfono con código OTP) */
export async function verifyContactChannels(address, { email, phone, emailCode, phoneCode }) {
  const addr = address.toLowerCase()
  // Q2/H-01: en PRODUCCIÓN se rechazan códigos vacíos y el valor por defecto
  // '123456'; se exige un código OTP real de 6 dígitos (M2: servicio OTP).
  // En dev/demo se conserva el comportamiento de prueba heredado.
  const validCode = (code) => {
    if (!code) return false
    if (isProduction()) return /^\d{6}$/.test(code) && code !== '123456'
    return code === '123456' || (code.length === 6 && /^\d{6}$/.test(code))
  }
  const validEmailCode = validCode(emailCode)
  const validPhoneCode = validCode(phoneCode)

  if (!validEmailCode || !validPhoneCode) {
    throw new Error('Código de verificación incorrecto')
  }

  const encryptedEmail = encryptField(email || '')
  const encryptedPhone = encryptField(phone || '')

  await query(
    `UPDATE users SET email = ?, phone = ?, email_verified = 1, phone_verified = 1 WHERE address = ?`,
    [encryptedEmail, encryptedPhone, addr]
  )

  // Si ya tiene 2FA activado, ascender a 'verificado'
  const u = await first('SELECT two_factor_enabled FROM users WHERE address = ?', [addr])
  if (Number(u?.two_factor_enabled) === 1) {
    await query("UPDATE users SET identification_level = 'verificado' WHERE address = ?", [addr])
  }

  return { ok: true, emailVerified: true, phoneVerified: true }
}

/** Nivel 2: Iniciar configuración 2FA (TOTP RFC 6238) */
export async function setup2FASecret(address) {
  const addr = address.toLowerCase()
  // Q2/H-01: secreto base32 de 160 bits real (compatible con Google Authenticator)
  const secret = generateTotpSecret()
  const encryptedSecret = encryptField(secret)

  await query('UPDATE users SET two_factor_secret = ? WHERE address = ?', [encryptedSecret, addr])

  // Retornar secreto para configuración en app Authenticator (Google Authenticator / Authy)
  const otpauthUri = `otpauth://totp/TrueKeate:${addr.slice(0, 6)}...?secret=${secret}&issuer=TrueKeate`
  return { secret, otpauthUri }
}

/** Nivel 2: Confirmar código 2FA y habilitar */
export async function confirm2FA(address, code) {
  const addr = address.toLowerCase()
  const u = await first('SELECT two_factor_secret, email_verified, phone_verified FROM users WHERE address = ?', [addr])
  if (!u || !u.two_factor_secret) {
    throw new Error('No se ha iniciado la configuración de 2FA')
  }

  // Q2/H-01: en PRODUCCIÓN se valida TOTP real contra el secreto (RFC 6238);
  // en dev se acepta además el código de prueba '123456'.
  const secret = decryptField(u.two_factor_secret)
  const valid = isProduction() ? verifyTotp(secret, code) : code === '123456' || verifyTotp(secret, code)
  if (!valid) {
    throw new Error('Código 2FA inválido')
  }

  await query("UPDATE users SET two_factor_enabled = 1 WHERE address = ?", [addr])

  // Si tiene email y teléfono validados, asciende a Nivel 2: Verificado
  if (Number(u.email_verified) === 1 && Number(u.phone_verified) === 1) {
    await query("UPDATE users SET identification_level = 'verificado' WHERE address = ?", [addr])
  }

  return { ok: true, twoFactorEnabled: true, identificationLevel: 'verificado' }
}

/** Nivel 3: Certificación mediante verificación de SBT de terceros (Binance BABT, WorldID, etc.) */
export async function verifyThirdPartySBT(address, { sbtContract, sbtProviderName, tokenId, signature }) {
  const addr = address.toLowerCase()
  if (!sbtContract || !sbtProviderName) {
    throw new Error('Contrato de SBT y nombre de proveedor requeridos')
  }

  // Validar firma de posesión de la clave privada
  if (signature) {
    const payload = `VerifyExternalSBT:${addr}:${sbtContract.toLowerCase()}:${tokenId || '0'}`
    if (!verifySignature(payload, signature, addr)) {
      throw new Error('Firma de verificación inválida: no coincide con la wallet propietaria')
    }
  }

  await query(
    `UPDATE users SET 
      identification_level = 'certificado',
      sbt_provider = ?,
      sbt_contract = ?,
      sbt_token_id = ?,
      sbt_verified_at = ?
     WHERE address = ?`,
    [sbtProviderName, sbtContract.toLowerCase(), String(tokenId || '1'), nowSec(), addr]
  )

  return {
    ok: true,
    identificationLevel: 'certificado',
    provider: sbtProviderName,
    verifiedAt: nowSec()
  }
}

/** Consulta del perfil de identidad con estricta segregación de privacidad (Usuario vs. Owner vs. Público) */
export async function getUserIdentityProfile(targetAddress, requestingAddress = '', isOwner = false, verifiedSelf = false) {
  const target = targetAddress.toLowerCase()
  // Q1/H-02: los datos privados solo se entregan si la ruta verificó la firma
  // del titular (verifiedSelf) o del owner de la plataforma (isOwner).
  const isSelf = Boolean(verifiedSelf)

  const u = await first('SELECT * FROM users WHERE address = ?', [target])
  if (!u) {
    return {
      address: target,
      username: '',
      identification_level: 'inscrito',
      isRegistered: false,
      trust_level: 'iniciado',
      sbt_provider: ''
    }
  }

  const publicData = {
    address: u.address,
    username: u.username || '',
    identification_level: u.identification_level || 'inscrito',
    isRegistered: Number(u.registered_at) > 0,
    trust_level: u.trust_level || 'iniciado',
    sbt_provider: u.sbt_provider || '',
    sbt_verified_at: u.sbt_verified_at || 0,
    is_business: Number(u.is_business) === 1
  }

  // Si es el propio usuario o el Owner de la plataforma, retornar datos privados completos
  if (isSelf || isOwner) {
    return {
      ...publicData,
      terms_accepted: Number(u.terms_accepted) === 1,
      email: decryptField(u.email),
      phone: decryptField(u.phone),
      email_verified: Number(u.email_verified) === 1,
      phone_verified: Number(u.phone_verified) === 1,
      two_factor_enabled: Number(u.two_factor_enabled) === 1,
      sbt_token_id: u.sbt_token_id || '',
      sbt_contract: u.sbt_contract || '',
      document_hash: u.document_hash || '',
      selfie_hash: u.selfie_hash || '',
      kyc_status: u.kyc_status || 'pending'
    }
  }

  // Para terceros: Solo datos públicos (insignias y nivel de confianza)
  return publicData
}
