/**
 * Capa de datos TrueKeate (M1).
 *
 * Adaptador portable:
 *  - Local (desarrollo): SQLite nativo de Node (node:sqlite), cero dependencias.
 *  - Producción (GCP):  PostgreSQL vía DATABASE_URL (postgres://...), con pg.
 *
 * El esquema es un subconjunto portable SQL (TEXT/INTEGER/REAL, ids TEXT
 * generados en JS) para que funcione en ambos motores sin migraciones duales.
 * La blockchain sigue siendo la ÚNICA fuente de verdad; esta BD es la capa
 * de lectura impulsada por eventos (indexador) y de datos off-chain.
 */

import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import fs from 'node:fs'

let sqliteDb = null
let pgPool = null

export function isPostgres() {
  const url = process.env.DATABASE_URL || ''
  return url.startsWith('postgres://') || url.startsWith('postgresql://')
}

export function sqliteFile() {
  return process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'truekeate.db')
}

function getSqlite() {
  if (!sqliteDb) {
    const file = sqliteFile()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    sqliteDb = new DatabaseSync(file)
    sqliteDb.exec('PRAGMA journal_mode = WAL')
    sqliteDb.exec('PRAGMA foreign_keys = ON')
  }
  return sqliteDb
}

async function getPg() {
  if (!pgPool) {
    const mod = 'pg'
    const { Pool } = await import(/* webpackIgnore: true */ mod)
    pgPool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pgPool
}

/** Convierte placeholders `?` a `$n` para PostgreSQL. */
function pgPlaceholders(sql) {
  let n = 0
  return sql.replace(/\?/g, () => `$${++n}`)
}

/**
 * Ejecuta una consulta.
 *  - SELECT: devuelve array de filas.
 *  - INSERT ... RETURNING: devuelve la fila devuelta.
 *  - Otros: { changes }.
 */
export async function query(sql, params = []) {
  if (isPostgres()) {
    const pool = await getPg()
    const res = await pool.query(pgPlaceholders(sql), params)
    const kind = sql.trim().slice(0, 6).toUpperCase()
    if (kind === 'SELECT' || kind === 'WITH') return res.rows
    if (kind === 'INSERT' && /RETURNING/i.test(sql)) return res.rows[0] || null
    return { changes: res.rowCount ?? 0 }
  }
  const db = getSqlite()
  const stmt = db.prepare(sql)
  const kind = sql.trim().slice(0, 6).toUpperCase()
  if (kind === 'SELECT' || kind === 'WITH' || kind === 'PRAGMA') return stmt.all(...params)
  if (kind === 'INSERT' && /RETURNING/i.test(sql)) return stmt.get(...params) || null
  if (kind === 'ALTER') {
    // ALTER TABLE no devuelve filas; run() lanza si la columna ya existe
    try {
      stmt.run(...params)
    } catch {
      throw new Error('ALTER_FAILED')
    }
    return { changes: 0 }
  }
  const r = stmt.run(...params)
  return { changes: Number(r.changes) }
}

/** Primera fila o null. */
export async function first(sql, params = []) {
  const rows = await query(sql, params)
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

/* ------------------------------------------------------------------ *
 *  Esquema (idempotente, portable SQLite/PostgreSQL)
 * ------------------------------------------------------------------ */

const SCHEMA = [
  // Usuarios (sincronizados por el indexador desde UserRegistry + datos off-chain)
  `CREATE TABLE IF NOT EXISTS users (
    address            TEXT PRIMARY KEY,
    username           TEXT,
    email              TEXT,
    phone              TEXT,
    kyc_status         TEXT NOT NULL DEFAULT 'pending',  -- pending|submitted|verified
    is_business        INTEGER NOT NULL DEFAULT 0,
    trust_level        TEXT NOT NULL DEFAULT 'iniciado', -- iniciado|comun|frecuente|socio
    subscription_status TEXT NOT NULL DEFAULT 'none',    -- none|active|inactive
    registered_at      INTEGER,
    last_active_at     INTEGER,
    created_at         INTEGER NOT NULL DEFAULT 0
  )`,
  // Operaciones (reflejo del contrato Escrow vía indexador)
  `CREATE TABLE IF NOT EXISTS operations (
    id         INTEGER PRIMARY KEY,
    user1      TEXT NOT NULL,
    user2      TEXT,
    token_a    TEXT,
    token_b    TEXT,
    amount_a   TEXT,
    amount_b   TEXT,
    status     INTEGER NOT NULL DEFAULT 0, -- 0 Active, 1 Completed, 2 Cancelled, 3 Disputed
    created_at INTEGER NOT NULL DEFAULT 0,
    deadline   INTEGER NOT NULL DEFAULT 0,
    closed_at  INTEGER NOT NULL DEFAULT 0
  )`,
  // Artículos (catálogo M2)
  `CREATE TABLE IF NOT EXISTS items (
    id          TEXT PRIMARY KEY,
    owner       TEXT NOT NULL,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category    TEXT NOT NULL DEFAULT 'general',
    quantity    INTEGER NOT NULL DEFAULT 1,
    status      TEXT NOT NULL DEFAULT 'available', -- available|reserved|exchanged
    images      TEXT NOT NULL DEFAULT '[]',        -- JSON: [{cid,sha256,signature}]
    signature   TEXT,                              -- firma ECDSA del payload (certificación)
    created_at  INTEGER NOT NULL DEFAULT 0
  )`,
  // Valoraciones en 5 dimensiones (M3)
  `CREATE TABLE IF NOT EXISTS ratings (
    id          TEXT PRIMARY KEY,
    operation_id INTEGER NOT NULL,
    rater       TEXT NOT NULL,
    ratee       TEXT NOT NULL,
    acceptance  INTEGER NOT NULL,  -- 1-5
    honesty     INTEGER NOT NULL,
    security    INTEGER NOT NULL,
    reliability INTEGER NOT NULL,
    commitment  INTEGER NOT NULL,
    comment     TEXT NOT NULL DEFAULT '',
    created_at  INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_ratings_unique ON ratings (operation_id, rater)`,
  // Puntos de encuentro (M7 / ventana 10 min M16)
  `CREATE TABLE IF NOT EXISTS meetups (
    id            TEXT PRIMARY KEY,
    operation_id  INTEGER NOT NULL,
    scheduled_at  INTEGER NOT NULL,
    lat           REAL,
    lng           REAL,
    place_name    TEXT NOT NULL DEFAULT '',
    opened_at_user1 INTEGER,
    opened_at_user2 INTEGER,
    status        TEXT NOT NULL DEFAULT 'scheduled', -- scheduled|opened|completed|blocked
    blocked_reason TEXT NOT NULL DEFAULT ''
  )`,
  // Avales entre usuarios (M12)
  `CREATE TABLE IF NOT EXISTS vouches (
    id         TEXT PRIMARY KEY,
    vouch_by   TEXT NOT NULL,
    vouch_for  TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_vouches_unique ON vouches (vouch_by, vouch_for)`,
  // Imágenes certificadas (M8)
  `CREATE TABLE IF NOT EXISTS images (
    id        TEXT PRIMARY KEY,
    item_id   TEXT,
    cid       TEXT NOT NULL DEFAULT '',
    sha256    TEXT NOT NULL,
    signature TEXT NOT NULL,
    signed_by TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT 0
  )`,
  // Campañas (M11)
  `CREATE TABLE IF NOT EXISTS campaigns (
    id          TEXT PRIMARY KEY,
    owner       TEXT NOT NULL,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    kind        TEXT NOT NULL DEFAULT 'masiva', -- masiva|recoleccion
    status      TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected|active|finished
    approved_by TEXT,
    created_at  INTEGER NOT NULL DEFAULT 0
  )`,
  // Suscripciones de empresas (M9)
  `CREATE TABLE IF NOT EXISTS subscriptions (
    address    TEXT PRIMARY KEY,
    plan       TEXT NOT NULL DEFAULT 'mensual',
    status     TEXT NOT NULL DEFAULT 'active',
    paid_until INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT 0
  )`,
  // Notificaciones (M15)
  `CREATE TABLE IF NOT EXISTS notifications (
    id         TEXT PRIMARY KEY,
    "user"     TEXT NOT NULL,
    type       TEXT NOT NULL DEFAULT 'info',
    message    TEXT NOT NULL DEFAULT '',
    ref_id     TEXT NOT NULL DEFAULT '',
    read       INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT 0
  )`,
]

/** Crea las tablas si no existen. Idempotente. */
export async function initSchema() {
  for (const sql of SCHEMA) {
    await query(sql)
  }

  // A2.1: Índices críticos — portables para SQLite y PostgreSQL
  const INDEXES = [
    // Operaciones: consultas por usuario (listados, stats)
    'CREATE INDEX IF NOT EXISTS idx_operations_user1        ON operations (user1)',
    'CREATE INDEX IF NOT EXISTS idx_operations_user2        ON operations (user2)',
    'CREATE INDEX IF NOT EXISTS idx_operations_status       ON operations (status)',
    'CREATE INDEX IF NOT EXISTS idx_operations_user1_status ON operations (user1, status)',
    'CREATE INDEX IF NOT EXISTS idx_operations_user2_status ON operations (user2, status)',
    // Artículos: catálogo por owner, categoría y estado
    'CREATE INDEX IF NOT EXISTS idx_items_owner             ON items (owner)',
    'CREATE INDEX IF NOT EXISTS idx_items_category          ON items (category)',
    'CREATE INDEX IF NOT EXISTS idx_items_status            ON items (status)',
    'CREATE INDEX IF NOT EXISTS idx_items_category_status   ON items (category, status)',
    // Valoraciones: promedios por usuario valorado
    'CREATE INDEX IF NOT EXISTS idx_ratings_ratee           ON ratings (ratee)',
    'CREATE INDEX IF NOT EXISTS idx_ratings_rater           ON ratings (rater)',
    // Avales: consultar cuántos avales tiene un usuario
    'CREATE INDEX IF NOT EXISTS idx_vouches_vouch_for       ON vouches (vouch_for)',
    'CREATE INDEX IF NOT EXISTS idx_vouches_vouch_by        ON vouches (vouch_by)',
    // Meetups: buscar por operación
    'CREATE INDEX IF NOT EXISTS idx_meetups_operation_id    ON meetups (operation_id)',
    // Notificaciones: consultas por usuario y estado de lectura
    'CREATE INDEX IF NOT EXISTS idx_notifications_user      ON notifications ("user")',
    'CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications ("user", read)',
    // Campañas: por owner y estado
    'CREATE INDEX IF NOT EXISTS idx_campaigns_owner         ON campaigns (owner)',
    'CREATE INDEX IF NOT EXISTS idx_campaigns_status        ON campaigns (status)',
  ]

  for (const idx of INDEXES) {
    try {
      await query(idx)
    } catch {
      // Índice ya existe o BD no lo soporta — ignorable
    }
  }

  // Columnas añadidas después de la creación inicial (M7 geolocalización)
  await ensureColumn('users', 'lat', 'REAL')
  await ensureColumn('users', 'lng', 'REAL')
  await ensureColumn('users', 'document_hash', 'TEXT NOT NULL DEFAULT \'\'')
  await ensureColumn('users', 'selfie_hash', 'TEXT NOT NULL DEFAULT \'\'')

  // Módulo de Identidad en 3 Niveles y SBTs
  await ensureColumn('users', 'identification_level', 'TEXT NOT NULL DEFAULT \'inscrito\'')
  await ensureColumn('users', 'terms_accepted', 'INTEGER NOT NULL DEFAULT 0')
  await ensureColumn('users', 'email_verified', 'INTEGER NOT NULL DEFAULT 0')
  await ensureColumn('users', 'phone_verified', 'INTEGER NOT NULL DEFAULT 0')
  await ensureColumn('users', 'two_factor_enabled', 'INTEGER NOT NULL DEFAULT 0')
  await ensureColumn('users', 'two_factor_secret', 'TEXT NOT NULL DEFAULT \'\'')
  await ensureColumn('users', 'sbt_token_id', 'TEXT NOT NULL DEFAULT \'\'')
  await ensureColumn('users', 'sbt_provider', 'TEXT NOT NULL DEFAULT \'\'')
  await ensureColumn('users', 'sbt_contract', 'TEXT NOT NULL DEFAULT \'\'')
  await ensureColumn('users', 'sbt_verified_at', 'INTEGER NOT NULL DEFAULT 0')

  // Soporte Multi-Activo y Seguimiento Logístico en Operaciones
  await ensureColumn('operations', 'tracking_info', 'TEXT NOT NULL DEFAULT \'\'')
  await ensureColumn('operations', 'asset_a_type', 'TEXT NOT NULL DEFAULT \'ERC20\'')
  await ensureColumn('operations', 'asset_b_type', 'TEXT NOT NULL DEFAULT \'ERC20\'')
  await ensureColumn('operations', 'asset_a_token_id', 'TEXT NOT NULL DEFAULT \'0\'')
  await ensureColumn('operations', 'asset_b_token_id', 'TEXT NOT NULL DEFAULT \'0\'')
}

/**
 * Añade una columna si no existe (BD ya creadas en versiones anteriores).
 * SQLite: ALTER TABLE ADD COLUMN; PostgreSQL: idempotente vía DO block.
 */
export async function ensureColumn(table, column, decl) {
  try {
    if (isPostgres()) {
      await query(
        `DO $$ BEGIN
           IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${column}') THEN
             ALTER TABLE ${table} ADD COLUMN ${column} ${decl};
           END IF;
         END $$;`
      )
    } else {
      await query(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`)
    }
  } catch {
    // La columna ya existe (error ignorable)
  }
}
