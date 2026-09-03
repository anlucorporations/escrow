// =============================================================================
// TrueKeate — API: punto de entrada de PRODUCCIÓN (Cloud Run / GCP)
// Uso: node api/index-gcp.js
//
// Orquesta la API REST con los servicios reales del entorno:
//   - almacén (en memoria en esta fase; el puente a PostgreSQL se completa en
//     la integración C8 manteniendo la misma interfaz — ver lib/almacen.js)
//   - relayer EIP-712 (cuenta RELAYER_PRIVATE_KEY, red RPC_URL) si está configurado
//   - indexador de eventos contra PostgreSQL (DATABASE_URL) si está configurado
//
// Config: PORT (Cloud Run inyecta 8080), RPC_URL, DATABASE_URL, CONTRATOS_FILE,
//         RELAYER_PRIVATE_KEY, FACTORY_ADDRESS (o contratos.json), LIMITE_METATX_DIARIO…
// =============================================================================
import { Pool } from 'pg';
import { ethers } from 'ethers';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearAlmacen } from './lib/almacen.js';
import { iniciarServidor } from './app.js';
import { crearIndexador } from '../indexador.js';
import { RelayerEIP712 } from '../relayer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRATOS_FILE =
  process.env.CONTRATOS_FILE || join(__dirname, '..', 'contratos.json');

async function main() {
  const contratos = JSON.parse(readFileSync(CONTRATOS_FILE, 'utf-8'));
  const almacen = crearAlmacen();
  const deps = { almacen, contratos };

  // ---- Red on-chain (anvil/GCP) ---------------------------------------------
  const rpc = process.env.RPC_URL || 'http://127.0.0.1:8545';
  const provider = new ethers.JsonRpcProvider(rpc);

  // ---- Relayer EIP-712 (RF-09.2, RF-15.2) -----------------------------------
  const pkRelayer = process.env.RELAYER_PRIVATE_KEY;
  const factoryDir =
    process.env.FACTORY_ADDRESS ||
    contratos.SmartAccountFactory?.direccion ||
    '0x40918ba7f132e0acba2ce4de4c4baf9bd2d7d849'; // despliegue GCP 2026-09
  const abiSA = contratos.SmartAccount?.abi;
  if (pkRelayer && abiSA) {
    const wallet = new ethers.Wallet(pkRelayer, provider);
    deps.relayer = new RelayerEIP712({
      provider,
      wallet,
      smartAccountFactory: factoryDir,
      abiSmartAccount: abiSA,
    });
    deps.proveedor = provider;
    deps.contratoEscrow = contratos.Escrow?.direccion;
    deps.escrowAbi = contratos.Escrow?.abi;
    deps.walletEmpresas = wallet; // cuenta de la plataforma para empresas (R1)
    console.log(`[index-gcp] Relayer activo (${wallet.address}) · factory ${factoryDir}`);
  } else {
    console.warn('[index-gcp] Relayer NO configurado (falta RELAYER_PRIVATE_KEY o ABI SmartAccount).');
  }

  // ---- Indexador de eventos (D25) → PostgreSQL ------------------------------
  if (process.env.DATABASE_URL) {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 5,
        connectionTimeoutMillis: 20_000,
      });
      const idx = await crearIndexador(pool, contratos);
      deps.indexador = idx;
      const INTERVALO_MS = parseInt(process.env.INTERVALO_MS || '10000', 10);
      const DESDE_BLOQUE = parseInt(process.env.DESDE_BLOQUE || '0', 10);
      const ciclo = async () => {
        try {
          for (const entidad of Object.keys(contratos)) {
            await idx.barrerDesde(entidad, DESDE_BLOQUE);
          }
          await idx.reconciliar('Escrow');
        } catch (e) {
          console.error('[index-gcp] ciclo indexador:', e.message);
        }
      };
      await ciclo();
      setInterval(ciclo, INTERVALO_MS);
      console.log(`[index-gcp] Indexador activo (cada ${INTERVALO_MS} ms desde bloque ${DESDE_BLOQUE}).`);
    } catch (e) {
      console.error('[index-gcp] Indexador NO iniciado:', e.message);
    }
  } else {
    console.warn('[index-gcp] DATABASE_URL ausente: indexador desactivado.');
  }

  // ---- API REST --------------------------------------------------------------
  const puerto = parseInt(process.env.PORT || '8080', 10);
  iniciarServidor(deps, puerto);
  console.log(`[index-gcp] TrueKeate API (producción) escuchando en :${puerto}`);
}

main().catch((e) => {
  console.error('[index-gcp] error fatal:', e);
  process.exit(1);
});
