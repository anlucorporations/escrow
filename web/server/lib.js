/**
 * Lógica de negocio TrueKeate (M3 reputación, M4 niveles, M2 catálogo).
 * Funciones puras + consultas a la capa de datos.
 */

import { verifyMessage } from 'ethers'
import crypto from 'node:crypto'
import { query, first } from './db.js'

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
export async function validateRating(operationId, rater) {
  const op = await first('SELECT * FROM operations WHERE id = ?', [operationId])
  if (!op) return { ok: false, error: 'Operación no encontrada' }
  if (Number(op.status) !== 1) return { ok: false, error: 'Solo se puede valorar operaciones completadas' }
  const lower = rater.toLowerCase()
  const isParty = op.user1.toLowerCase() === lower || (op.user2 && op.user2.toLowerCase() === lower)
  if (!isParty) return { ok: false, error: 'Solo las partes de la operación pueden valorar' }
  if (await hasRated(operationId, rater)) return { ok: false, error: 'Ya valoraste esta operación' }
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

export async function createItem({ owner, title, description, category, quantity, images = [], signature = '' }) {
  const v = validateItem({ title, description, category, quantity })
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
