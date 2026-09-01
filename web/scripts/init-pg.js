#!/usr/bin/env node
/**
 * Inicialización de PostgreSQL local (desarrollo).
 *
 * Crea la base de datos `truekeate` si no existe e inicializa el esquema.
 *
 * ⚠️ SEGURIDAD: NO contiene credenciales hardcodeadas. Las cadenas de
 * conexión se leen del entorno:
 *   ADMIN_DATABASE_URL  → conexión de administrador (por defecto usa el
 *                         usuario del SO a 127.0.0.1, autenticación local).
 *   DATABASE_URL        → base objetivo donde se crea el esquema
 *                         (por defecto: la base `truekeate` en localhost).
 *
 * Ejemplo:
 *   ADMIN_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/postgres \
 *   DATABASE_URL=postgresql://postgres@127.0.0.1:5432/truekeate \
 *   node web/scripts/init-pg.js
 *
 * En GCP, usa en su lugar: node web/scripts/setup-gcp-db.mjs
 */
import pg from 'pg'
const { Pool } = pg

const ADMIN_URL =
  process.env.ADMIN_DATABASE_URL || 'postgresql://postgres@127.0.0.1:5432/postgres'
const TARGET_URL =
  process.env.DATABASE_URL || 'postgresql://postgres@127.0.0.1:5432/truekeate'

async function run() {
  console.log('Verificando base de datos truekeate...')
  const adminPool = new Pool({ connectionString: ADMIN_URL })
  try {
    const check = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = 'truekeate'")
    if (check.rows.length === 0) {
      console.log('Creando base de datos truekeate...')
      await adminPool.query('CREATE DATABASE truekeate')
      console.log('✓ Base de datos truekeate creada con éxito.')
    } else {
      console.log('✓ Base de datos truekeate ya existe.')
    }
  } finally {
    await adminPool.end()
  }

  console.log('Inicializando esquema en truekeate...')
  process.env.DATABASE_URL = TARGET_URL
  const { initSchema, query } = await import('../server/db.js')
  await initSchema()
  const tables = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
  console.log('✓ Esquema inicializado correctamente. Tablas existentes:', tables.map((t) => t.table_name))
}

run().catch((err) => {
  console.error('Error en inicialización PostgreSQL:', err)
  process.exit(1)
})
