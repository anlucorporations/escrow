import pg from 'pg'
const { Pool } = pg

const PG_CONFIG = {
  connectionString: 'postgresql://anlucorporations:KeLuDa.2324@127.0.0.1:5432/TrueKeate',
}

async function testDatabaseCreationAndOperations() {
  console.log('====================================================')
  console.log('🔍 PRUEBA DE BASE DE DATOS LOCAL POSTGRESQL (TrueKeate)')
  console.log('====================================================')

  // 1. Conexión de administración para verificar/crear base de datos
  console.log('\n[1/5] Verificando conexión al servidor PostgreSQL...')
  const adminPool = new Pool({
    connectionString: 'postgresql://postgres:KeLuDa.2324@127.0.0.1:5432/postgres',
  })
  
  const versionRes = await adminPool.query('SELECT version()')
  console.log('✓ Servidor activo:', versionRes.rows[0].version.split(',')[0])

  const dbCheck = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = 'truekeate'")
  if (dbCheck.rows.length === 0) {
    console.log('Creando base de datos truekeate...')
    await adminPool.query('CREATE DATABASE truekeate')
    console.log('✓ Base de datos truekeate creada con éxito.')
  } else {
    console.log('✓ Base de datos truekeate detectada y disponible.')
  }
  await adminPool.end()

  // 2. Conexión a la base de datos truekeate e inicialización del esquema
  console.log('\n[2/5] Inicializando tablas e índices...')
  process.env.DATABASE_URL = PG_CONFIG.connectionString
  const { initSchema, query, first } = await import('../server/db.js')
  const {
    acceptCommunityTerms,
    verifyContactChannels,
    setup2FASecret,
    confirm2FA,
    verifyThirdPartySBT,
    getUserIdentityProfile,
    createItem,
    rateOperation,
    getReputation,
    notify,
    listNotifications,
  } = await import('../server/lib.js')

  await initSchema()

  const tables = await query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  )
  console.log(`✓ Esquema inicializado. Total de tablas creadas: ${tables.length}`)
  tables.forEach((t) => console.log(`   • Tabla: ${t.table_name}`))

  // 3. Prueba CRUD: Identidad y Cifrado
  console.log('\n[3/5] Probando inserción y cifrado AES-256 de Identidad...')
  const testWallet = '0x1234567890123456789012345678901234567890'
  await query('DELETE FROM users WHERE address = ?', [testWallet])

  await query(
    'INSERT INTO users (address, username, identification_level, registered_at, created_at) VALUES (?, ?, ?, ?, ?)',
    [testWallet, 'test_usuario', 'inscrito', Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)]
  )

  await acceptCommunityTerms(testWallet)
  await verifyContactChannels(testWallet, {
    email: 'contacto.local@truekeate.com',
    phone: '+584120000001',
    emailCode: '123456',
    phoneCode: '123456',
  })
  await setup2FASecret(testWallet)
  await confirm2FA(testWallet, '123456')
  await verifyThirdPartySBT(testWallet, {
    sbtContract: '0x2B09ECe09c507920c44Ba6d81294F3841D7d472C',
    sbtProviderName: 'Binance BABT',
    tokenId: '999',
  })

  const profileSelf = await getUserIdentityProfile(testWallet, testWallet)
  console.log('✓ Perfil con Nivel 3 creado y verificado:')
  console.log(`   - Usuario: @${profileSelf.username}`)
  console.log(`   - Nivel: ${profileSelf.identification_level}`)
  console.log(`   - Email descifrado: ${profileSelf.email}`)
  console.log(`   - 2FA Activo: ${profileSelf.two_factor_enabled}`)
  console.log(`   - Proveedor SBT: ${profileSelf.sbt_provider}`)

  // 4. Prueba CRUD: Catálogo y Notificaciones
  console.log('\n[4/5] Probando operaciones en catálogo y notificaciones...')
  await notify(testWallet, 'info', '¡Bienvenido a TrueKeate sobre PostgreSQL Local!')
  const notifs = await listNotifications(testWallet)
  console.log(`✓ Notificaciones guardadas y recuperadas: ${notifs.notifications.length}`)
  console.log(`   - Mensaje: "${notifs.notifications[0].message}"`)

  // 5. Limpieza de datos de prueba
  console.log('\n[5/5] Limpiando datos de prueba...')
  await query('DELETE FROM notifications WHERE "user" = ?', [testWallet])
  await query('DELETE FROM users WHERE address = ?', [testWallet])
  console.log('✓ Limpieza completada.')

  console.log('\n====================================================')
  console.log('🎉 COMPROBACIÓN EXITOSA: PostgreSQL Local 100% OPERATIVO')
  console.log('====================================================\n')
}

testDatabaseCreationAndOperations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ ERROR EN PRUEBA DE BASE DE DATOS:', err)
    process.exit(1)
  })
