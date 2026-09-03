#!/usr/bin/env node
// =============================================================================
// TrueKeate — Motor Bootstrap del Owner (cuenta 0) para producción
// =============================================================================
// 1) Verifica que la clave del Owner es dueña de SociosRegistry (on-chain) y
//    muestra la cuenta del relayer derivada de RELAYER_PRIVATE_KEY.
// 2) BD off-chain: registra/actualiza al Owner como CERTIFICADO + tipo/nivel
//    SOCIO + consentimiento GDPR (si DATABASE_URL está disponible).
// 3) On-chain: lo admite como Socio (admitirSocioDirecto) si aún no lo es.
// 4) --smart-account: despliega su SmartAccount si no existe (identidad D35).
//
// Entorno: RPC_URL, OWNER_PRIVATE_KEY|ADMIN_PRIVATE_KEY, DATABASE_URL (opc.),
//          RELAYER_PRIVATE_KEY (opc.), FACTORY_ADDRESS, REGISTRY_ADDRESS.
// =============================================================================
import { ethers } from 'ethers';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRATOS_FILE = process.env.CONTRATOS_FILE || join(__dirname, '..', 'contratos.json');

// Direcciones por defecto del despliegue de pruebas (anvil, chain 31337).
// En producción se sobrescriben con FACTORY_ADDRESS / REGISTRY_ADDRESS o
// actualizando backend/contratos.json.
const REGISTRY_DEFAULT = '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853';
const FACTORY_DEFAULT = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const CUENTA1_ANVIL = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // cuenta 1 de pruebas

const SMART_ACCOUNT = process.argv.includes('--smart-account');

const ABI_REGISTRY = [
  'function owner() view returns (address)',
  'function esSocio(address) view returns (bool)',
  'function admitirSocioDirecto(address)',
];
const ABI_FACTORY = [
  'function cuentas(address) view returns (address)',
  'function desplegarCuenta(address,bytes32) returns (address)',
];

function cargarDireccion(env, keyContratos, defecto) {
  if (process.env[env]) return process.env[env];
  try {
    const c = JSON.parse(readFileSync(CONTRATOS_FILE, 'utf-8'));
    const ent = c[keyContratos];
    if (ent?.direccion && ent.direccion !== ethers.ZeroAddress) return ent.direccion;
  } catch { /* sin contratos.json: usamos el defecto */ }
  return defecto;
}

async function main() {
  const rpc = process.env.RPC_URL || 'http://127.0.0.1:8545';
  const pkOwner = process.env.OWNER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
  if (!pkOwner) {
    console.error('❌ Falta OWNER_PRIVATE_KEY o ADMIN_PRIVATE_KEY.');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  const owner = new ethers.Wallet(pkOwner, provider);
  const registryDir = cargarDireccion('REGISTRY_ADDRESS', 'SociosRegistry', REGISTRY_DEFAULT);
  const factoryDir = cargarDireccion('FACTORY_ADDRESS', 'SmartAccountFactory', FACTORY_DEFAULT);

  console.log('🧑‍💼 Owner (firmante):', owner.address);

  // ---- 1. Verificación on-chain: ¿el firmante es el owner del registry? -----
  const registry = new ethers.Contract(registryDir, ABI_REGISTRY, owner);
  let duenoRegistry = ethers.ZeroAddress;
  try {
    duenoRegistry = await registry.owner();
    console.log('🏛  SociosRegistry:', registryDir);
    console.log('    dueño del registry:', duenoRegistry);
    if (duenoRegistry.toLowerCase() !== owner.address.toLowerCase()) {
      console.warn('⚠️  El firmante NO es el dueño on-chain de SociosRegistry.');
      console.warn('    El deploy se hizo desde la cuenta 0 del anvil: 0xf39Fd6e5…2266.');
      console.warn('    Usa la clave privada de ESA cuenta como OWNER_PRIVATE_KEY.');
    } else {
      console.log('✅ El firmante coincide con el owner del despliegue (cuenta 0).');
    }
  } catch (e) {
    console.warn('⚠️  No se pudo leer owner() del registry (' + e.message + ').');
    console.warn('    ¿El RPC responde? ¿La dirección del registry es correcta?');
  }

  // ---- Verificación relayer (cuenta 1) ---------------------------------------
  if (process.env.RELAYER_PRIVATE_KEY) {
    const relayer = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY);
    const esperada = process.env.RELAYER_CUENTA_ESPERADA || CUENTA1_ANVIL;
    console.log('🤖 Relayer (RELAYER_PRIVATE_KEY →):', relayer.address);
    if (relayer.address.toLowerCase() === esperada.toLowerCase()) {
      console.log('✅ El relayer es la cuenta 1 esperada de pruebas (' + esperada + ').');
    } else {
      console.log('ℹ️  El relayer NO es la cuenta 1 de anvil local (' + esperada + ').');
      console.log('   Si es producción, es correcto: RELAYER_PRIVATE_KEY viene de Secret Manager.');
    }
  } else {
    console.log('ℹ️  RELAYER_PRIVATE_KEY no definida: se omite la verificación del relayer.');
  }

  // ---- 2. BD off-chain: registrar Owner CERTIFICADO + SOCIO -----------------
  let pool = null;
  if (process.env.DATABASE_URL) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15_000 });
    try {
      const wallet = owner.address.toLowerCase();
      const r = await pool.query(
        `INSERT INTO usuarios
           (wallet, tipo, nivel, medalla, estado, consentimiento_gdpr, consentimiento_fecha, actividad_ultima)
         VALUES ($1, 'SOCIO', 'SOCIO', 'ORO', 'CERTIFICADO', TRUE, now(), now())
         ON CONFLICT (wallet) DO UPDATE SET
           tipo='SOCIO', nivel='SOCIO', medalla='ORO', estado='CERTIFICADO',
           consentimiento_gdpr=TRUE, consentimiento_fecha=now(), updated_at=now()
         RETURNING id, wallet, tipo, nivel, estado`,
        [wallet]
      );
      console.log('🗄  BD off-chain: Owner registrado →', JSON.stringify(r.rows[0]));
    } catch (e) {
      console.error('❌ Error escribiendo en BD:', e.message);
      console.error('   ¿Existe el esquema? Aplica: psql "$DATABASE_URL" -f backend/db/schema.sql');
      process.exitCode = 1;
    }
  } else {
    console.log('ℹ️  DATABASE_URL no definida: se omite el registro en BD off-chain.');
  }

  // ---- 3. On-chain: admitir al Owner como Socio ------------------------------
  try {
    const esSocio = await registry.esSocio(owner.address);
    console.log('👥 esSocio(owner) on-chain:', esSocio);
    if (!esSocio) {
      const tx = await registry.admitirSocioDirecto(owner.address);
      const rec = await tx.wait();
      console.log('✅ Owner admitido como Socio. tx:', rec.hash);
    } else {
      console.log('✅ El Owner ya figura como Socio en el registry.');
    }
  } catch (e) {
    console.error('❌ Fallo al admitir Socio:', e.message);
    process.exitCode = 1;
  }

  // ---- 4. Opcional: SmartAccount del Owner ----------------------------------
  if (SMART_ACCOUNT) {
    try {
      const factory = new ethers.Contract(factoryDir, ABI_FACTORY, owner);
      const existente = await factory.cuentas(owner.address);
      if (existente !== ethers.ZeroAddress) {
        console.log('✅ SmartAccount del Owner ya existe:', existente);
        if (pool) {
          await pool.query(
            `UPDATE usuarios SET smart_account=$1, updated_at=now() WHERE wallet=$2`,
            [existente.toLowerCase(), owner.address.toLowerCase()]
          );
          console.log('🗄  BD: smart_account actualizada.');
        }
      } else {
        console.log('🚀 Desplegando SmartAccount del Owner (root inicial 0x0 = INSCRITO, D28)…');
        const tx = await factory.desplegarCuenta(owner.address, ethers.ZeroHash, { gasLimit: 3_000_000n });
        const rec = await tx.wait();
        const cuenta = await factory.cuentas(owner.address);
        console.log('✅ SmartAccount desplegada:', cuenta, '· tx:', rec.hash);
        if (pool) {
          await pool.query(
            `UPDATE usuarios SET smart_account=$1, updated_at=now() WHERE wallet=$2`,
            [cuenta.toLowerCase(), owner.address.toLowerCase()]
          );
          console.log('🗄  BD: smart_account actualizada.');
        }
      }
    } catch (e) {
      console.error('❌ Fallo al gestionar SmartAccount:', e.message);
      process.exitCode = 1;
    }
  }

  if (pool) await pool.end();
  console.log('\n✅ Bootstrap del Owner finalizado.');
  console.log('   Recordatorio: la escalera CERTIFICADO on-chain (merkle D28) se fija cuando el');
  console.log('   backend KYC genere el root real; aquí se registró CERTIFICADO en la BD off-chain');
  console.log('   y SOCIO on-chain (admitirSocioDirecto).');
}

main().catch((e) => {
  console.error('❌ Error fatal:', e);
  process.exit(1);
});
