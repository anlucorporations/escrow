#!/usr/bin/env node
/**
 * setup-gcp-db.mjs — Inicialización de la capa de datos en GCP (Cloud SQL).
 *
 * - Habilita la extensión PostGIS (regla geoespacial de <= 10 km entre partes).
 * - Crea el esquema TrueKeate (tablas + índices) de forma idempotente.
 *
 * Uso (desde web/):
 *   # Con DATABASE_URL inyectado por Secret Manager / env:
 *   DATABASE_URL="postgres://app:...@/truekeate?host=/cloudsql/PROYECTO:REGION:INSTANCIA" \
 *     node scripts/setup-gcp-db.mjs
 *
 *   # Local con gcloud CLI (ADC del usuario):
 *   USE_GCLOUD_SECRETS=true node scripts/setup-gcp-db.mjs
 *
 * Seguridad: la cadena de conexión NUNCA se hardcodea; se lee de
 * DATABASE_URL (env o Secret Manager).
 */
import { loadSecrets, requireSecret, isGcp } from '../server/secrets.js'

async function run() {
  console.log('======================================================')
  console.log('☁️  SETUP BASE DE DATOS GCP (Cloud SQL PostgreSQL + PostGIS)')
  console.log('======================================================')

  await loadSecrets()
  const databaseUrl = await requireSecret('DATABASE_URL')

  if (!(databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'))) {
    throw new Error('DATABASE_URL no apunta a PostgreSQL (postgres://...). ¿Estás en el entorno GCP correcto?')
  }

  const { query } = await import('../server/db.js')

  // 1) PostGIS — geometría para distancias (>= 10 km) y zonas UTM
  console.log('\n[1/3] Habilitando extensión PostGIS...')
  await query('CREATE EXTENSION IF NOT EXISTS postgis')
  const gis = await query("SELECT extversion FROM pg_extension WHERE extname = 'postgis'")
  console.log(`✓ PostGIS ${gis[0]?.extversion || '?'} activo.`)

  // 2) Esquema (tablas + índices) idempotente
  console.log('\n[2/3] Inicializando esquema TrueKeate (tablas e índices)...')
  const { initSchema } = await import('../server/db.js')
  await initSchema()
  console.log('✓ Esquema inicializado.')

  // 3) Verificación
  console.log('\n[3/3] Verificando tablas creadas...')
  const tables = await query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  )
  console.log(`✓ Total de tablas: ${tables.length}`)
  tables.forEach((t) => console.log(`   • ${t.table_name}`))

  console.log('\n======================================================')
  console.log('🎉 Cloud SQL PostgreSQL listo para TrueKeate (indexador + API)')
  console.log('======================================================\n')
}

run().catch((err) => {
  console.error('\n❌ ERROR EN SETUP DE BD GCP:', err.message || err)
  process.exit(1)
})
