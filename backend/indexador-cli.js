// =============================================================================
// TrueKeate — Indexador: punto de entrada CLI
// Uso: node indexador-cli.js            # barrido único + reconciliación
//      node indexador-cli.js --watch    # bucle con checkpoints (modo servicio)
// Configuración por entorno:
//   RPC_URL, DATABASE_URL, CONTRATOS_FILE (JSON { entidad: {direccion, abi} })
// =============================================================================
import { Pool } from 'pg';
import { crearIndexador } from './indexador.js';
import { readFileSync } from 'node:fs';

const CONTRATOS_FILE = process.env.CONTRATOS_FILE || './contratos.json';
const WATCH = process.argv.includes('--watch');
const INTERVALO_MS = parseInt(process.env.INTERVALO_MS || '5000', 10);
const DESDE_BLOQUE = parseInt(process.env.DESDE_BLOQUE || '0', 10);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const contratos = JSON.parse(readFileSync(CONTRATOS_FILE, 'utf-8'));
  const idx = await crearIndexador(pool, contratos);

  const ciclo = async () => {
    for (const entidad of Object.keys(contratos)) {
      await idx.barrerDesde(entidad, DESDE_BLOQUE);
    }
    const metrics = await idx.metricasLag();
    console.log('[indexador] métricas:', JSON.stringify(metrics));
    await idx.reconciliar('Escrow');
  };

  await ciclo();
  if (WATCH) {
    console.log(`[indexador] modo servicio: barrido cada ${INTERVALO_MS} ms`);
    setInterval(ciclo, INTERVALO_MS);
  } else {
    await pool.end();
    process.exit(0);
  }
}

main().catch((e) => {
  console.error('[indexador] error fatal:', e);
  process.exit(1);
});
