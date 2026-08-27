import pg from 'pg'
const { Pool } = pg

const adminPool = new Pool({
  connectionString: 'postgresql://postgres:KeLuDa.2324@127.0.0.1:5432/postgres',
})

async function run() {
  console.log('Verificando base de datos truekeate...')
  const check = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = 'truekeate'")
  if (check.rows.length === 0) {
    console.log('Creando base de datos truekeate...')
    await adminPool.query('CREATE DATABASE truekeate')
    console.log('✓ Base de datos truekeate creada con éxito.')
  } else {
    console.log('✓ Base de datos truekeate ya existe.')
  }
  await adminPool.end()

  console.log('Inicializando esquema en truekeate...')
  process.env.DATABASE_URL = 'postgresql://postgres:KeLuDa.2324@127.0.0.1:5432/truekeate'
  const { initSchema, query } = await import('../server/db.js')
  await initSchema()
  const tables = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
  console.log('✓ Esquema inicializado correctamente. Tablas existentes:', tables.map((t) => t.table_name))
}

run().catch((err) => {
  console.error('Error en inicialización PostgreSQL:', err)
  process.exit(1)
})
