#!/usr/bin/env node
/**
 * Creación e inicialización de la base de datos PostgreSQL "TrueKeate"
 * (desarrollo local).
 *
 * ⚠️ SEGURIDAD: NO contiene credenciales hardcodeadas. Las cadenas de
 * conexión se leen del entorno:
 *   ADMIN_DATABASE_URL  → conexión de administrador (por defecto localhost,
 *                         autenticación por usuario del SO).
 *   DATABASE_URL        → base objetivo donde se crea el esquema
 *                         (por defecto: "TrueKeate" en localhost).
 *   DB_OWNER            → propietario de la base (por defecto: el usuario
 *                         de ADMIN_DATABASE_URL).
 *
 * Ejemplo:
 *   ADMIN_DATABASE_URL=postgresql://anlucorporations@127.0.0.1:5432/postgres \
 *   DATABASE_URL=postgresql://anlucorporations@127.0.0.1:5432/TrueKeate \
 *   node web/scripts/create-truekeate-db.mjs
 *
 * En GCP, usa en su lugar: node web/scripts/setup-gcp-db.mjs
 */
import pg from 'pg'
const { Pool } = pg

async function run() {
  console.log('====================================================')
  console.log('🐘 CREACIÓN DE BASE DE DATOS "TrueKeate" EN POSTGRESQL')
  console.log('====================================================')

  const ADMIN_URL = process.env.ADMIN_DATABASE_URL || 'postgresql://postgres@127.0.0.1:5432/postgres'
  const TARGET_URL = process.env.DATABASE_URL || 'postgresql://postgres@127.0.0.1:5432/TrueKeate'
  const owner = process.env.DB_OWNER || new URL(ADMIN_URL).username || 'postgres'

  const adminPool = new Pool({ connectionString: ADMIN_URL })

  console.log('\n[1/3] Verificando si existe la base de datos "TrueKeate"...')
  const check = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = 'TrueKeate'")
  if (check.rows.length === 0) {
    console.log(`Creando base de datos "TrueKeate" con propietario ${owner}...`)
    await adminPool.query(`CREATE DATABASE "TrueKeate" OWNER "${owner}"`)
    console.log('✓ Base de datos "TrueKeate" creada exitosamente.')
  } else {
    console.log('✓ Base de datos "TrueKeate" ya existe.')
  }

  await adminPool.query(`GRANT ALL PRIVILEGES ON DATABASE "TrueKeate" TO "${owner}"`)
  await adminPool.end()

  console.log('\n[2/3] Conectando a "TrueKeate" e inicializando esquema...')
  process.env.DATABASE_URL = TARGET_URL
  const { initSchema, query } = await import('../server/db.js')
  await initSchema()

  console.log('\n[3/3] Verificando tablas creadas en "TrueKeate"...')
  const tables = await query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  )
  console.log(`✓ Esquema inicializado. Total de tablas: ${tables.length}`)
  tables.forEach((t) => console.log(`   • ${t.table_name}`))

  console.log('\n====================================================')
  console.log('🎉 BASE DE DATOS "TrueKeate" 100% LISTA Y OPERATIVA')
  console.log('====================================================\n')
}

run().catch((err) => {
  console.error('\n❌ ERROR AL CREAR BASE DE DATOS "TrueKeate":', err)
  process.exit(1)
})
