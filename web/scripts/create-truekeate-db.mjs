import pg from 'pg'
const { Pool } = pg

async function run() {
  console.log('====================================================')
  console.log('🐘 CREACIÓN DE BASE DE DATOS "TrueKeate" EN POSTGRESQL')
  console.log('====================================================')

  const adminPool = new Pool({
    connectionString: 'postgresql://anlucorporations:KeLuDa.2324@127.0.0.1:5432/postgres',
  })

  console.log('\n[1/3] Verificando si existe la base de datos "TrueKeate"...')
  const check = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = 'TrueKeate'")
  if (check.rows.length === 0) {
    console.log('Creando base de datos "TrueKeate" con propietario anlucorporations...')
    await adminPool.query('CREATE DATABASE "TrueKeate" OWNER anlucorporations')
    console.log('✓ Base de datos "TrueKeate" creada exitosamente.')
  } else {
    console.log('✓ Base de datos "TrueKeate" ya existe.')
  }

  await adminPool.query('GRANT ALL PRIVILEGES ON DATABASE "TrueKeate" TO anlucorporations')
  await adminPool.end()

  console.log('\n[2/3] Conectando a "TrueKeate" e inicializando esquema...')
  process.env.DATABASE_URL = 'postgresql://anlucorporations:KeLuDa.2324@127.0.0.1:5432/TrueKeate'
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
