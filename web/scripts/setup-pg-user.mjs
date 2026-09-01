#!/usr/bin/env node
/**
 * Configuración del usuario de aplicación en PostgreSQL local (desarrollo).
 *
 * ⚠️ SEGURIDAD: NO contiene credenciales hardcodeadas. Se leen del entorno:
 *   ADMIN_DATABASE_URL  → conexión de administrador (crear usuario).
 *   DB_APP_USER         → nombre del usuario (por defecto: anlucorporations).
 *   DB_APP_PASSWORD     → contraseña del usuario (Obligatoria).
 *   DATABASE_URL        → conexión del usuario para la prueba final
 *                         (por defecto localhost/TrueKeate con el usuario/contraseña anteriores).
 *
 * Ejemplo:
 *   ADMIN_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/postgres \
 *   DB_APP_USER=anlucorporations \
 *   DB_APP_PASSWORD='<CLAVE_LOCAL_SEGURA>' \
 *   node web/scripts/setup-pg-user.mjs
 *
 * En GCP no se usa este script: el usuario lo crea Cloud SQL
 * (gcloud sql users create app ...) y la contraseña vive en Secret Manager.
 */
import pg from 'pg'
const { Pool } = pg

const ADMIN_URL = process.env.ADMIN_DATABASE_URL || 'postgresql://postgres@127.0.0.1:5432/postgres'
const APP_USER = process.env.DB_APP_USER || 'anlucorporations'
const APP_PASSWORD = process.env.DB_APP_PASSWORD || ''
const TARGET_URL =
  process.env.DATABASE_URL ||
  `postgresql://${APP_USER}${APP_PASSWORD ? `:${APP_PASSWORD}` : ''}@127.0.0.1:5432/TrueKeate`

async function run() {
  if (!APP_PASSWORD) {
    console.error('❌ DB_APP_PASSWORD es obligatoria (no se permiten contraseñas en el código).')
    process.exit(1)
  }

  const adminPool = new Pool({ connectionString: ADMIN_URL })

  console.log(`Verificando usuario ${APP_USER} en PostgreSQL...`)
  const check = await adminPool.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [APP_USER])
  if (check.rows.length === 0) {
    console.log(`Creando usuario ${APP_USER}...`)
    await adminPool.query(`CREATE USER "${APP_USER}" WITH PASSWORD $1 CREATEDB SUPERUSER`, [APP_PASSWORD])
    console.log(`✓ Usuario ${APP_USER} creado con éxito.`)
  } else {
    console.log(`Actualizando credenciales y permisos de ${APP_USER}...`)
    await adminPool.query(`ALTER USER "${APP_USER}" WITH PASSWORD $1 CREATEDB SUPERUSER`, [APP_PASSWORD])
    console.log(`✓ Usuario ${APP_USER} actualizado.`)
  }

  await adminPool.query(`GRANT ALL PRIVILEGES ON DATABASE "TrueKeate" TO "${APP_USER}"`)
  await adminPool.end()

  console.log(`Probando conexión directa como ${APP_USER} a la BD TrueKeate...`)
  const userPool = new Pool({ connectionString: TARGET_URL })
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
