import pg from 'pg'
const { Pool } = pg

async function run() {
  const adminPool = new Pool({
    connectionString: 'postgresql://postgres:KeLuDa.2324@127.0.0.1:5432/postgres',
  })

  console.log('Verificando usuario anlucorporations en PostgreSQL...')
  const check = await adminPool.query("SELECT 1 FROM pg_roles WHERE rolname = 'anlucorporations'")
  if (check.rows.length === 0) {
    console.log('Creando usuario anlucorporations...')
    await adminPool.query("CREATE USER anlucorporations WITH PASSWORD 'KeLuDa.2324' CREATEDB SUPERUSER")
    console.log('✓ Usuario anlucorporations creado con éxito.')
  } else {
    console.log('Actualizando credenciales y permisos de anlucorporations...')
    await adminPool.query("ALTER USER anlucorporations WITH PASSWORD 'KeLuDa.2324' CREATEDB SUPERUSER")
    console.log('✓ Usuario anlucorporations actualizado.')
  }

  await adminPool.query('GRANT ALL PRIVILEGES ON DATABASE truekeate TO anlucorporations')
  await adminPool.end()

  console.log('Probando conexión directa como anlucorporations a la BD truekeate...')
  const userPool = new Pool({
    connectionString: 'postgresql://anlucorporations:KeLuDa.2324@127.0.0.1:5432/truekeate',
  })
  const res = await userPool.query('SELECT current_user, current_database(), version()')
  console.log('✓ Conexión exitosa:', {
    usuario: res.rows[0].current_user,
    base_datos: res.rows[0].current_database,
  })
  await userPool.end()
}

run().catch((err) => {
  console.error('Error al configurar usuario PostgreSQL:', err)
  process.exit(1)
})
