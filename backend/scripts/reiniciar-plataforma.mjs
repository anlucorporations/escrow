#!/usr/bin/env node
// =============================================================================
// TrueKeate — Motor de reinicio de la plataforma (BD off-chain PostgreSQL)
// =============================================================================
// Borra TODOS los registros de las 14 tablas del esquema (reset total),
// reinicia las secuencias (RESTART IDENTITY) y deja la BD limpia para
// producción. NO toca anvil ni contratos (el nodo queda intacto).
//
// Uso:
//   node reiniciar-plataforma.mjs            # TRUNCATE de las 14 tablas
//   node reiniciar-plataforma.mjs --check    # solo diagnóstico (conteos)
//
// Entorno: DATABASE_URL (o PG_HOST/PG_PORT/PG_USER/PG_PASSWORD/PG_DATABASE).
// =============================================================================
import { Pool } from 'pg';

const SOLO_CHECK = process.argv.includes('--check');

// Las 14 tablas del esquema (backend/db/schema.sql) en orden estable.
const TABLAS = [
  'usuarios',
  'kyc',
  'articulos',
  'truekes',
  'valoraciones',
  'puntos_encuentro',
  'disputas',
  'imagenes_certificadas',
  'suscripciones',
  'campanas',
  'subastas',
  'finanzas',
  'auditoria',
  'indexador_checkpoint',
];

function dsn() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const { PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE } = process.env;
  if (PG_HOST && PG_USER) {
    const pw = PG_PASSWORD ? encodeURIComponent(PG_PASSWORD) : '';
    return `postgresql://${PG_USER}:${pw}@${PG_HOST}:${PG_PORT || '5432'}/${PG_DATABASE || 'postgres'}`;
  }
  return null;
}

async function contar(pool, tabla) {
  const r = await pool.query(`SELECT count(*)::int AS n FROM "${tabla}"`);
  return r.rows[0].n;
}

async function main() {
  const url = dsn();
  if (!url) {
    console.error('❌ Sin DATABASE_URL ni variables PG_*.');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 15_000 });
  try {
    // Verifica qué tablas existen (esquema aplicado al menos una vez).
    const existentes = [];
    for (const t of TABLAS) {
      const r = await pool.query(
        `SELECT to_regclass($1) AS c`,
        [t]
      );
      if (r.rows[0].c) existentes.push(t);
    }
    if (existentes.length === 0) {
      console.error('❌ No existe ninguna tabla del esquema. Aplica primero: psql "$DATABASE_URL" -f db/schema.sql');
      process.exit(1);
    }

    if (SOLO_CHECK) {
      console.log(`🔍 Diagnóstico — ${existentes.length}/${TABLAS.length} tablas encontradas:`);
      for (const t of existentes) {
        const n = await contar(pool, t);
        console.log(`   ${t.padEnd(24)} ${String(n).padStart(6)} filas`);
      }
      console.log('   (modo --check: no se borró nada)');
      return;
    }

    // Resumen previo
    console.log('Resumen previo:');
    const prev = {};
    for (const t of existentes) prev[t] = await contar(pool, t);

    // TRUNCATE conjunto: corta dependencias con CASCADE y reinicia IDENTITY.
    const lista = existentes.map((t) => `"${t}"`).join(', ');
    await pool.query(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`);

    // Verificación posterior
    console.log('Resultado tras limpiar:');
    let total = 0;
    for (const t of existentes) {
      const n = await contar(pool, t);
      total += n;
      console.log(`   ${t.padEnd(24)} ${String(n).padStart(6)} filas`);
    }
    console.log(`\n✅ TRUNCATE completado. Filas restantes: ${total}.`);
    console.log('   Anvil/contratos intactos · extensiones postgis/pgcrypto intactas · esquema intacto.');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
