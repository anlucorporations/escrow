#!/usr/bin/env node
// =============================================================================
// TrueKeate — SCRIPT CONTROLADO DE INYECCIÓN DE DATOS OPERATIVOS (@InyectaDatos)
// =============================================================================
// Propósito: poblar un historial COHERENTE de operaciones en el entorno
// TrueKeate (Cloud SQL + anvil GCP) con las cuentas 2–7 del anvil:
//
//   1) DOS SOCIOS  (cuentas 2 y 3) — CERTIFICADO / ORO   / 2000 BRLT
//   2) DOS EMPRESAS (cuentas 4 y 5) — CERTIFICADO / PLATA / 2000 BRLT
//      cada una con 2 Artículos + 2 Bienes + 2 Servicios tokenizados
//   3) DOS COMUNES  (cuentas 6 y 7) — VERIFICADO / BRONCE / 1000 BRLT
//      cada uno con 3 Artículos tokenizados
//   4) 30 truekes COMPLETADOS permutados (10 por usuario, 1:1 con todos),
//      valoraciones cruzadas 1–5 con variación coherente al perfil.
//
// Mecánica:
//   - BD off-chain (PostgreSQL): registros de usuarios/kyc/artículos/truekes/
//     valoraciones/finanzas escritos de forma IDEMPOTENTE (ON CONFLICT).
//   - On-chain (opcional, anvil): mint REAL de los 24 NFT (TrueKeateNFT, minter
//     = relayer) y emisión REAL de BRLT con quórum de Socios (D32: propuesta
//     EMITIR_BRLT del Owner + votos ≥2/3) con distribución a las 6 wallets.
//
// ⚠️  NUNCA se ejecuta solo: pide confirmación interactiva (o --yes).
// Uso:
//   node scripts/inyectar_datos_operativos.mjs            # con confirmación
//   node scripts/inyectar_datos_operativos.mjs --yes      # sin preguntar
//   node scripts/inyectar_datos_operativos.mjs --dry-run  # solo valida la matriz
//
// Entorno (opcional): DATABASE_URL, RPC_URL, OWNER_PRIVATE_KEY, NFT_ADDRESS,
// REGISTRY_ADDRESS, BRLT_ADDRESS, MINTER_PRIVATE_KEY/RELAYER_PRIVATE_KEY,
// CONTRATOS_FILE (backend/contratos.json por defecto).
// =============================================================================

import { ethers } from '../backend/node_modules/ethers/lib.esm/index.js';
import pgDefault from '../backend/node_modules/pg/lib/index.js';
const { Pool } = pgDefault;
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(__dirname, '..');

// ------------------------------------------------------------------ utilidades
const N = (w) => (w || '').toLowerCase();
const ahora = () => new Date().toISOString();
const dia = 86400_000;

function cargarEnv(ruta) {
  const env = {};
  if (!existsSync(ruta)) return env;
  for (const linea of readFileSync(ruta, 'utf-8').split('\n')) {
    const l = linea.trim();
    if (!l || l.startsWith('#')) continue;
    const i = l.indexOf('=');
    if (i > 0) env[l.slice(0, i).trim()] = l.slice(i + 1).trim();
  }
  return env;
}

function cargarDireccion(env, nombre, contratos, keyContratos, defecto) {
  if (env[nombre]) return env[nombre];
  try {
    const ent = contratos[keyContratos];
    if (ent?.direccion && ent.direccion !== ethers.ZeroAddress) return ent.direccion;
  } catch { /* sin contratos */ }
  return defecto;
}

// ------------------------------------------------------------------ configuración
const args = process.argv.slice(2);
const AUTO = args.includes('--yes') || args.includes('-y');
const DRY = args.includes('--dry-run');
const SOLO_BD = args.includes('--solo-bd'); // omite todo lo on-chain

// Entorno: .env de backend/web y variables de proceso
let env = { ...process.env };
for (const p of [join(RAIZ, 'backend', '.env'), join(RAIZ, 'web', '.env.local'), join(RAIZ, '.env')]) {
  env = { ...cargarEnv(p), ...env };
}

const RPC_URL = env.RPC_URL || 'http://127.0.0.1:8545';
const DATABASE_URL = env.DATABASE_URL || '';
const CONTRATOS_FILE =
  env.CONTRATOS_FILE || join(RAIZ, 'backend', 'contratos.json');
let contratos = {};
try { contratos = JSON.parse(readFileSync(CONTRATOS_FILE, 'utf-8')); } catch { /* sin contratos */ }

const NFT_ADDRESS = cargarDireccion(env, 'NFT_ADDRESS', contratos, 'TrueKeateNFT', null);
const REGISTRY_ADDRESS = cargarDireccion(env, 'REGISTRY_ADDRESS', contratos, 'SociosRegistry', null);
const BRLT_ADDRESS = cargarDireccion(env, 'BRLT_ADDRESS', contratos, 'BRLT', null);

const PK_OWNER =
  env.OWNER_PRIVATE_KEY || env.ADMIN_PRIVATE_KEY ||
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // cuenta 0 anvil
const PK_MINTER =
  env.MINTER_PRIVATE_KEY || env.RELAYER_PRIVATE_KEY ||
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // cuenta 1 anvil

// ------------------------------------------------------------------ ABIs
const ABI_BRLT = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address,uint256) returns (bool)',
  'function approve(address,uint256) returns (bool)',
];
const ABI_NFT = [
  'function mint(address,string,string) returns (uint256)',
  'function minter() view returns (address)',
  'function siguienteTokenId() view returns (uint256)',
  'function owner() view returns (address)',
];
const ABI_REGISTRY = [
  'function owner() view returns (address)',
  'function esSocio(address) view returns (bool)',
  'function totalSocios() view returns (uint256)',
  'function admitirSocioDirecto(address)',
  'function crearPropuesta(uint8,bytes32,uint256) returns (uint256)',
  'function votarPropuesta(uint256,bool)',
];

// ------------------------------------------------------------------ datos maestros
// Cuentas 0 y 1 = Owner y Relayer (no se tocan). Cuentas 2..7 = perfiladas.
const CUENTA_ANVIL = {
  2: { clave: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' },
  3: { clave: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6' },
  4: { clave: '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a' },
  5: { clave: '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba' },
  6: { clave: '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e' },
  7: { clave: '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356' },
};

// Perfiles de usuario (rol plataforma: tipo/nivel/medalla/estado D28)
const PERFILES = [
  {
    idx: 2, nombre: 'Ana López', rol: 'socio',
    tipo: 'SOCIO', nivel: 'SOCIO', medalla: 'ORO', estado: 'CERTIFICADO',
    correo: 'ana.lopez@truekeate.org',
    username: 'ana.lopez', telefono: '+34 600 111 222',
    direccion: 'Paseo de la Castellana 45, Madrid', brlt: 2000,
    rubro: 'tecnología y coleccionismo', bio: 'Coleccionista de piezas vintage y tecnología reacondicionada.',
  },
  {
    idx: 3, nombre: 'Bruno Fernández', rol: 'socio',
    tipo: 'SOCIO', nivel: 'SOCIO', medalla: 'ORO', estado: 'CERTIFICADO',
    correo: 'bruno.fernandez@truekeate.org',
    username: 'bruno.fernandez', telefono: '+34 600 333 444',
    direccion: 'Avinguda Diagonal 208, Barcelona', brlt: 2000,
    rubro: 'audio y diseño', bio: 'Diseñador de producto; truequea equipos de audio y mobiliario.',
  },
  {
    idx: 4, nombre: 'EcoTech Solutions', rol: 'empresa',
    tipo: 'EMPRESA', nivel: 'FRECUENTE', medalla: 'PLATA', estado: 'CERTIFICADO',
    correo: 'contacto@ecotechsolutions.example',
    username: 'ecotech', telefono: '+34 960 555 666',
    direccion: 'Parque Tecnológico, Calle Marconi 12, Valencia', brlt: 2000,
    rubro: 'energía limpia y agro', bio: 'Empresa de soluciones solares y domótica sostenible.',
  },
  {
    idx: 5, nombre: 'ServiPro Digital', rol: 'empresa',
    tipo: 'EMPRESA', nivel: 'FRECUENTE', medalla: 'PLATA', estado: 'CERTIFICADO',
    correo: 'ventas@serviprodigital.example',
    username: 'servipro', telefono: '+34 950 777 888',
    direccion: 'Polígono Innovación, Parcela 8, Sevilla', brlt: 2000,
    rubro: 'tecnología y servicios TI', bio: 'Proveedora de servicios de ciberseguridad, desarrollo y cloud.',
  },
  {
    idx: 6, nombre: 'Carlos Mendoza', rol: 'comun',
    tipo: 'PARTICULAR', nivel: 'COMUN', medalla: 'BRONCE', estado: 'VERIFICADO',
    correo: 'carlos.mendoza@truekeate.org',
    username: 'carlos.mendoza', telefono: '+34 610 999 000',
    direccion: 'Calle Gran Vía 1, Bilbao', brlt: 1000,
    rubro: 'fitness y gaming', bio: 'Entusiasta del deporte y los videojuegos; rota su equipamiento.',
  },
  {
    idx: 7, nombre: 'Diana Rojas', rol: 'comun',
    tipo: 'PARTICULAR', nivel: 'COMUN', medalla: 'BRONCE', estado: 'VERIFICADO',
    correo: 'diana.rojas@truekeate.org',
    username: 'diana.rojas', telefono: '+34 620 111 333',
    direccion: 'Calle Alfonso I 22, Zaragoza', brlt: 1000,
    rubro: 'fotografía y diseño', bio: 'Fotógrafa freelance; truequea ópticas, luces y gadgets.',
  },
];

// Catálogo tokenizado: 24 ítems (3 por socio/común, 6 por empresa)
const CATALOGO = [
  // -- Ana (socio 2): 3 artículos
  { p: 2, titulo: 'Cámara analógica Olympus OM-1 + 50mm', desc: 'Cuerpo compacto restaurado, obturador revisado, incluye funda de cuero.', rubro: 'fotografía', categoria: 'ARTICULO' },
  { p: 2, titulo: 'Lote 12 vinilos de jazz (Blue Note, 1ª ed.)', desc: 'Colección verificada con estado de surco VG+/NM, carátulas originales.', rubro: 'coleccionismo', categoria: 'ARTICULO' },
  { p: 2, titulo: 'MacBook Pro 14" M1 Pro reacondicionado', desc: 'Certificado por taller: batería 92%, 16 GB RAM, 512 GB SSD, 1 año de garantía.', rubro: 'computación', categoria: 'ARTICULO' },
  // -- Bruno (socio 3): 3 artículos
  { p: 3, titulo: 'Guitarra electroacústica Taylor 214ce', desc: 'Tapa de abeto macizo, estuche rígido, cuerdas nuevas y afinación perfecta.', rubro: 'música', categoria: 'ARTICULO' },
  { p: 3, titulo: 'Monitor de estudio Adam Audio T7V (par)', desc: 'Pares de monitores de campo cercano con tweeter X-ART, impecables.', rubro: 'audio', categoria: 'ARTICULO' },
  { p: 3, titulo: 'Librería modular de roble (3 módulos)', desc: 'Diseño escandinavo, madera maciza, fácil desmontaje y transporte.', rubro: 'mobiliario', categoria: 'ARTICULO' },
  // -- EcoTech (empresa 4): 2 artículos + 2 bienes + 2 servicios
  { p: 4, titulo: 'Panel solar fotovoltaico 450W (lote 4 uds)', desc: 'Eficiencia 22,4%, 25 años de garantía de potencia, excedente de instalación.', rubro: 'energía', categoria: 'ARTICULO' },
  { p: 4, titulo: 'Dron DJI Mavic 3 Enterprise', desc: 'Cámara 4/3 CMOS, RTK listo, usado para inspección; baterías al 95%.', rubro: 'inspección', categoria: 'ARTICULO' },
  { p: 4, titulo: 'Inversor híbrido trifásico 10kW + batería 15kWh', desc: 'Bien físico auditado (RWA): instalación solar completa llave en mano.', rubro: 'energía', categoria: 'BIEN' },
  { p: 4, titulo: 'Sistema de riego inteligente con 15 sondas LoRaWAN', desc: 'Bien físico auditado (RWA): kit agro sostenible con pasarela IP67.', rubro: 'agrotech', categoria: 'BIEN' },
  { p: 4, titulo: 'Servicio: auditoría energética domiciliaria (45 días)', desc: 'Voucher redimible: estudio de consumo, propuesta de ahorro y asesoría.', rubro: 'servicios', categoria: 'SERVICIO' },
  { p: 4, titulo: 'Servicio: instalación y mantenimiento solar (30 días)', desc: 'Voucher redimible: instalación certificada de paneles e inversores.', rubro: 'servicios', categoria: 'SERVICIO' },
  // -- ServiPro (empresa 5): 2 artículos + 2 bienes + 2 servicios
  { p: 5, titulo: 'Workstation Dell Precision 7960 (2×Xeon)', desc: '128 GB ECC, RTX A4000, 4 TB NVMe; excedente de proyecto de render.', rubro: 'hardware', categoria: 'ARTICULO' },
  { p: 5, titulo: 'Lote 8 routers MikroTik WiFi 6 gestionables', desc: 'Modelo empresarial con VPN, balanceo de carga y soporte PoE.', rubro: 'redes', categoria: 'ARTICULO' },
  { p: 5, titulo: 'Servidor rack 2U con 24 bahías SAS (RWA)', desc: 'Bien físico auditado (RWA): almacenamiento empresarial, fuentes redundantes.', rubro: 'infraestructura', categoria: 'BIEN' },
  { p: 5, titulo: 'Cabina SAN 24TB Fibre Channel (RWA)', desc: 'Bien físico auditado (RWA): almacenamiento centralizado de alta disponibilidad.', rubro: 'infraestructura', categoria: 'BIEN' },
  { p: 5, titulo: 'Servicio: auditoría de seguridad de contratos (30 días)', desc: 'Voucher redimible: análisis estático, fuzzing y revisión de riesgos EVM.', rubro: 'ciberseguridad', categoria: 'SERVICIO' },
  { p: 5, titulo: 'Servicio: consultoría cloud y DevOps (45 días)', desc: 'Voucher redimible: despliegue Kubernetes, CI/CD y alta disponibilidad.', rubro: 'cloud', categoria: 'SERVICIO' },
  // -- Carlos (común 6): 3 artículos
  { p: 6, titulo: 'Bicicleta de montaña Trek Marlin 7 (talla M)', desc: 'Horquilla con bloqueo, frenos hidráulicos, revisión completa hace 2 meses.', rubro: 'deporte', categoria: 'ARTICULO' },
  { p: 6, titulo: 'Consola Steam Deck OLED 512GB', desc: 'Edición limitada con funda oficial, cables originales y 3 juegos incluidos.', rubro: 'gaming', categoria: 'ARTICULO' },
  { p: 6, titulo: 'Set mancuernas ajustables Bowflex 2×24kg', desc: 'Selector de peso rápido, con base y guía de entrenamiento.', rubro: 'fitness', categoria: 'ARTICULO' },
  // -- Diana (común 7): 3 artículos
  { p: 7, titulo: 'Objetivo Canon EF 85mm f/1.8 USM', desc: 'Cristal sin hongos ni arañazos, enfoque rápido y silencioso, tapas incluidas.', rubro: 'fotografía', categoria: 'ARTICULO' },
  { p: 7, titulo: 'Flash Godox AD200 Pro + accesorios', desc: 'Flash portátil TTL/HSS con batería extra, softbox y disparador.', rubro: 'fotografía', categoria: 'ARTICULO' },
  { p: 7, titulo: 'Tableta gráfica Wacom Intuos Pro M', desc: 'Lápiz Pro Pen 2, Bluetooth, superficie nueva; ideal para retoque.', rubro: 'diseño', categoria: 'ARTICULO' },
];

// ------------------------------------------------------------------ pool
function crearPool() {
  if (!DATABASE_URL) {
    console.error('❌ Falta DATABASE_URL (variable de entorno o backend/.env).');
    console.error('   Ej.: postgresql://usuario:clave@host:puerto/bd  (o socket /cloudsql/...)');
    process.exit(1);
  }
  const ssl = /@.*\.run\.app/.test(DATABASE_URL) || /sslmode=require/.test(DATABASE_URL)
    ? { rejectUnauthorized: false }
    : undefined;
  return new Pool({ connectionString: DATABASE_URL, ssl, connectionTimeoutMillis: 15_000 });
}

async function confirmar() {
  if (AUTO || DRY) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const resp = await new Promise((res) =>
    rl.question('⚠️  ¿Ejecutar la inyección de datos en el entorno configurado? (s/n): ', res)
  );
  rl.close();
  if (!/^(s|si|y|yes)$/i.test(resp.trim())) {
    console.log('❌ Operación cancelada por el usuario.');
    process.exit(0);
  }
}

// ------------------------------------------------------------------ main
async function main() {
  console.log('============================================================');
  console.log('  TrueKeate · Inyección de datos operativos (@InyectaDatos)');
  console.log('============================================================');
  console.log(`  RPC   : ${RPC_URL}`);
  console.log(`  BD    : ${DATABASE_URL ? 'configurada' : 'FALTA'}`);
  console.log(`  Modo  : ${DRY ? 'DRY-RUN (sin cambios)' : AUTO ? 'automático (--yes)' : 'interactivo'}`);
  if (SOLO_BD) console.log('  On-chain: OMITIDO (--solo-bd)');
  if (!NFT_ADDRESS) console.warn('  ⚠️  Sin NFT_ADDRESS: el mint on-chain se omite (tokenId simulado).');
  if (!REGISTRY_ADDRESS || !BRLT_ADDRESS) console.warn('  ⚠️  Sin REGISTRY/BRLT: la emisión on-chain se omite (solo BD).');

  await confirmar();

  // El modo --dry-run valida la matriz y el plan SIN necesitar la BD.
  let pool = null;
  if (!DRY) {
    pool = crearPool();
    try {
      await pool.query('SELECT 1');
    } catch (e) {
      console.error('❌ No se pudo conectar a la BD:', e.message);
      process.exit(1);
    }
    // NOTA: autocommit por sentencia (sin BEGIN/COMMIT explícitos): sobre un pool
    // remoto (proxy Cloud SQL) cada pool.query() puede usar un cliente distinto y
    // un corte de conexión revierte la transacción entera en silencio. Cada
    // INSERT/UPDATE es idempotente (ON CONFLICT / pre-checks), así que una
    // ejecución interrumpida se puede relanzar sin duplicar datos.
  }

  const owner = new ethers.Wallet(PK_OWNER);
  const minter = new ethers.Wallet(PK_MINTER);
  const wallets = Object.fromEntries(
    Object.entries(CUENTA_ANVIL).map(([i, c]) => [Number(i), new ethers.Wallet(c.clave)])
  );

  console.log('\n👤 Owner  :', owner.address);
  console.log('🤖 Minter :', minter.address, '(relayer)');
  for (const [i, w] of Object.entries(wallets)) {
    const p = PERFILES.find((x) => x.idx === Number(i));
    console.log(`  cuenta ${i} → ${w.address}  [${p.nombre}]`);
  }

  // =====================================================================
  // 1. USUARIOS + KYC (idempotente)
  // =====================================================================
  console.log('\n[1/6] Registrando 6 usuarios (perfil, escalera D28)…');
  const usuarioPorIdx = {};
  for (const p of PERFILES) {
    const wallet = wallets[p.idx].address.toLowerCase();
    usuarioPorIdx[p.idx] = wallet;
    const kycEstado = p.estado === 'CERTIFICADO' ? 'APROBADO' : 'PENDIENTE';
    if (!DRY) {
      const r = await pool.query(
        `INSERT INTO usuarios
           (wallet, username, correo, telefono, direccion_inscripcion, tipo, nivel, medalla, estado,
            consentimiento_gdpr, consentimiento_fecha, actividad_ultima, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, TRUE, now() - interval '120 days', now() - interval '2 days', now() - interval '120 days', now())
         ON CONFLICT (wallet) DO UPDATE SET
           username=COALESCE(EXCLUDED.username, usuarios.username),
           correo=EXCLUDED.correo, telefono=EXCLUDED.telefono,
           direccion_inscripcion=EXCLUDED.direccion_inscripcion,
           tipo=EXCLUDED.tipo, nivel=EXCLUDED.nivel, medalla=EXCLUDED.medalla,
           estado=EXCLUDED.estado, consentimiento_gdpr=TRUE, updated_at=now()
         RETURNING id, wallet`,
        [wallet, p.username ?? null, p.correo, p.telefono, p.direccion, p.tipo, p.nivel, p.medalla, p.estado]
      );
      const uid = Number(r.rows[0].id);
      const kycPrev = await pool.query(`SELECT id FROM kyc WHERE usuario_id=$1`, [uid]);
      if (kycPrev.rowCount === 0) {
        await pool.query(
          `INSERT INTO kyc (usuario_id, estado, revisado_por, created_at, updated_at)
           VALUES ($1, $2, $3, now() - interval '100 days', now())`,
          [uid, kycEstado, owner.address.toLowerCase()]
        );
      }
      await pool.query(
        `INSERT INTO finanzas (usuario_id, nfts_stock, criptos, brlt, fondo_valor, updated_at)
         VALUES ($1, '{}', '{}', $2, 0, now())
         ON CONFLICT (usuario_id) DO UPDATE SET brlt = EXCLUDED.brlt, updated_at = now()`,
        [uid, p.brlt]
      );
      console.log(`  ✓ ${p.nombre.padEnd(18)} ${wallet.slice(0, 8)}…  ${p.tipo}/${p.medalla}/${p.estado}`);
    } else {
      console.log(`  [dry] ${p.nombre.padEnd(18)} ${wallet.slice(0, 8)}…  ${p.tipo}/${p.medalla}/${p.estado}`);
    }
  }

  // =====================================================================
  // 2. ARTÍCULOS tokenizados (+imágenes) — mint on-chain opcional
  // =====================================================================
  console.log('\n[2/6] Creando 24 artículos/bienes/servicios tokenizados…');
  let proveedor = null;
  let cNft = null;
  if (!DRY && !SOLO_BD && NFT_ADDRESS) {
    proveedor = new ethers.JsonRpcProvider(RPC_URL, undefined, { cacheTimeout: -1 });
    cNft = new ethers.Contract(NFT_ADDRESS, ABI_NFT, new ethers.Wallet(PK_MINTER, proveedor));
    const minterReal = await cNft.minter().catch(() => null);
    if (minterReal && minterReal.toLowerCase() !== minter.address.toLowerCase()) {
      console.warn(`  ⚠️  minter del contrato (${minterReal}) ≠ clave configurada (${minter.address}).`);
    }
    console.log(`  → TrueKeateNFT ${NFT_ADDRESS} (siguiente token: ${(await cNft.siguienteTokenId().catch(() => '?')).toString()})`);
  }

  const articuloIdPorIdx = {}; // p.idx -> [ids]
  const REUSE_TOKENS = process.env.REUTILIZAR_TOKEN_ID_BASE
    ? Number(process.env.REUTILIZAR_TOKEN_ID_BASE)
    : null;
  if (REUSE_TOKENS !== null) {
    console.log(`  → Reutilizando tokens on-chain ya minteados (base ${REUSE_TOKENS}): no se vuelve a mintear.`);
  }
  for (const [n, item] of CATALOGO.entries()) {
    const perfil = PERFILES.find((x) => x.idx === item.p);
    const usuarioWallet = wallets[item.p].address.toLowerCase();
    const categoria = item.categoria;

    // Mint on-chain real (minter plataforma) → nft_token_id; si no hay red, simulado
    let tokenId = null;
    if (REUSE_TOKENS !== null) {
      tokenId = REUSE_TOKENS + n; // el mint ya ocurrió (ids consecutivos en orden de CATALOGO)
    } else if (!DRY && !SOLO_BD && cNft) {
      try {
        const uri = `data:application/json,${encodeURIComponent(JSON.stringify({
          name: item.titulo, description: item.desc, rubro: item.rubro, categoria,
        }))}`;
        const tx = await cNft.mint(usuarioWallet, categoria, uri);
        const recibo = await tx.wait();
        for (const log of recibo.logs || []) {
          try {
            const parsed = cNft.interface.parseLog(log);
            if (parsed && parsed.name === 'ArticuloMinteado') { tokenId = Number(parsed.args[0]); break; }
          } catch { /* log ajeno */ }
        }
        if (tokenId === null) tokenId = Number(await cNft.siguienteTokenId()) - 1;
      } catch (e) {
        console.warn(`  ⚠️  mint ${item.titulo.slice(0, 30)}… falló:`, (e.shortMessage || e.message || '').slice(0, 120));
      }
    } else {
      tokenId = 1000 + n; // simulado si --dry-run / --solo-bd / sin contrato
    }

    if (!DRY) {
      // idempotencia: si el dueño ya tiene un artículo con ese título, se actualiza
      // (token/nft/disponible) en vez de duplicar
      const prev = await pool.query(
        `SELECT id, nft_token_id FROM articulos
          WHERE usuario_id=(SELECT id FROM usuarios WHERE wallet=$1) AND titulo=$2`,
        [usuarioWallet, item.titulo]
      );
      let aid = prev.rowCount > 0 ? Number(prev.rows[0].id) : null;
      if (aid !== null) {
        if (prev.rows[0].nft_token_id === null && tokenId !== null) {
          await pool.query(`UPDATE articulos SET nft_token_id=$2, disponible=TRUE, updated_at=now() WHERE id=$1`, [aid, tokenId]);
        }
      } else {
        const r = await pool.query(
          `INSERT INTO articulos
             (usuario_id, titulo, descripcion, rubro, categoria, nft_token_id, disponible, created_at, updated_at)
           VALUES ((SELECT id FROM usuarios WHERE wallet=$1), $2, $3, $4, $5, $6, TRUE,
                   now() - interval '110 days', now() - interval '110 days')
           RETURNING id`,
          [usuarioWallet, item.titulo, item.desc, item.rubro, categoria, tokenId]
        );
        aid = Number(r.rows[0].id);
      }
      if (aid !== null) {
        (articuloIdPorIdx[item.p] = articuloIdPorIdx[item.p] || []).push(aid);
        console.log(`  ✓ #${String(aid).padStart(2)} ${item.titulo.slice(0, 44).padEnd(46)} [${categoria}] token ${tokenId}`);
      }
    } else {
      console.log(`  [dry] ${item.titulo.slice(0, 44).padEnd(46)} [${categoria}] token ${tokenId ?? '(sim)'}`);
    }
  }

  // =====================================================================
  // 3. Matriz PERMUTADA de truekes: 30 = 10 por usuario (15 pares × 2)
  // =====================================================================
  console.log('\n[3/6] Generando historial de 30 truekes COMPLETADOS (10 por usuario)…');
  const idxs = PERFILES.map((p) => p.idx); // [2..7]
  const pares = [];
  for (let i = 0; i < idxs.length; i++) {
    for (let j = i + 1; j < idxs.length; j++) {
      pares.push({ a: idxs[i], b: idxs[j] }); // ronda 1 (A oferta)
      pares.push({ a: idxs[j], b: idxs[i] }); // ronda 2 (sentido inverso)
    }
  }
  // validación de cobertura
  const apariciones = {};
  for (const pr of pares) {
    apariciones[pr.a] = (apariciones[pr.a] || 0) + 1;
    apariciones[pr.b] = (apariciones[pr.b] || 0) + 1;
  }
  for (const p of PERFILES) {
    if (apariciones[p.idx] !== 10) {
      console.error(`❌ Matriz rota: ${p.nombre} aparece ${apariciones[p.idx]} veces (esperado 10).`);
      process.exit(1);
    }
  }
  console.log(`  ✓ Matriz validada: ${pares.length} truekes · 10 por usuario · 5 como oferente + 5 como contraparte`);

  // Selección determinista de ítems por usuario según su catálogo
  const catPorIdx = {};
  for (const item of CATALOGO) (catPorIdx[item.p] = catPorIdx[item.p] || []).push(item);

  function elegirItem(pidx, k) {
    const lista = catPorIdx[pidx];
    return lista[k % lista.length];
  }

  // 5 rondas de 6 pares: en la ronda k, el usuario i oferta a (i+k+1)%6. Como hay
  // 5 rondas y 5 contrapartes posibles, cada usuario oferta exactamente una vez a
  // cada uno de los otros 5 (5 como A) y, por el par complementario de otra ronda,
  // recibe la otra dirección (5 como B). Total = 30 truekes dirigidos únicos.
  const plan = [];
  for (let k = 0; k < 5; k++) {
    for (let i = 0; i < idxs.length; i++) {
      const a = idxs[i];
      const b = idxs[(i + k + 1) % idxs.length];
      if (a !== b) plan.push({ a, b, k });
    }
  }

  if (plan.length !== 30) {
    console.error(`❌ Plan generó ${plan.length} truekes (esperado 30).`);
    process.exit(1);
  }

  // estado previo de escrow_id negativo
  const escrowBase = !DRY
    ? Number((await pool.query(`SELECT COALESCE(MIN(escrow_id),0) m FROM truekes WHERE escrow_id<0`)).rows[0].m)
    : 0;
  const yaCreados = !DRY
    ? new Set((await pool.query(`SELECT escrow_id FROM truekes WHERE escrow_id<0`)).rows.map((r) => Number(r.escrow_id)))
    : new Set();
  console.log(`  → escrow_id sintéticos desde ${escrowBase - 1}`);

  const haceDias = (d, h = 0) => new Date(Date.now() - d * dia - h * 3600_000).toISOString();

  const cierres = ['CONFORME', 'CONFORME', 'CONFORME', 'CONFORME', 'NO_CONFORME', 'CONFORME'];
  const motivos = [
    'Artículo entregado en el punto de encuentro acordado.',
    'Cambio verificado en custodia; ambas partes conformes.',
    'Intercambio impecable, ítem idéntico al descrito en el NFT.',
    'Punto de encuentro oficial, entrega puntual.',
    'Una pieza llegó con un desperfecto; resuelto con reposición y sin disputa formal.',
    'Trueque completado tras verificación física del bien.',
  ];

  let nTrueke = 0;
  const creadosEnRonda = [];
  for (const t of plan) {
    nTrueke++;
    const pA = PERFILES.find((x) => x.idx === t.a);
    const pB = PERFILES.find((x) => x.idx === t.b);
    const itemA = elegirItem(t.a, nTrueke);
    const itemB = elegirItem(t.b, nTrueke + 3);
    const idxA = (articuloIdPorIdx[t.a] || [])[nTrueke % (articuloIdPorIdx[t.a] || [1]).length];
    const idxB = (articuloIdPorIdx[t.b] || [])[(nTrueke + 3) % (articuloIdPorIdx[t.b] || [1]).length];
    const diasA = 90 - nTrueke * 2.5;
    const creado = haceDias(Math.max(1, Math.round(diasA)), 3);
    const completado = haceDias(Math.max(0, Math.round(diasA - 1.5)), 1);
    const cierre = cierres[nTrueke % cierres.length];
    const motivo = motivos[nTrueke % motivos.length];
    const estadoF = cierre === 'NO_CONFORME' ? 'COMPLETADO' : 'COMPLETADO';

    if (!DRY) {
      // Idempotencia por firma de trueque (mismos usuarios/artículos/estado):
      // si la operación ya está en el historial, no se duplica (el escrow_id
      // sintético negativo se genera de nuevo pero no se inserta).
      const dup = await pool.query(
        `SELECT id FROM truekes
          WHERE usuario_a=$1 AND usuario_b=$2 AND articulo_a_id=$3 AND articulo_b_id=$4 AND estado='COMPLETADO'`,
        [usuarioPorIdx[t.a], usuarioPorIdx[t.b], idxA ?? null, idxB ?? null]
      );
      const nuevoEscrow = escrowBase - nTrueke;
      if (dup.rowCount === 0 && !yaCreados.has(nuevoEscrow)) {
        await pool.query(
          `INSERT INTO truekes
             (escrow_id, articulo_a_id, articulo_b_id, usuario_a, usuario_b, estado,
              descripcion_requerida, tipo_requerido, cierre_a, cierre_b, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'CONFORME', 'CONFORME', $9)`,
          [
            nuevoEscrow,
            idxA ?? null, idxB ?? null,
            usuarioPorIdx[t.a], usuarioPorIdx[t.b],
            estadoF,
            `Busco: ${itemB.titulo}`,
            itemB.categoria,
            completado,
          ]
        );
        yaCreados.add(nuevoEscrow);
        creadosEnRonda.push(nuevoEscrow);
      }
      console.log(`  ✓ T#${String(nTrueke).padStart(2)} ${pA.nombre.split(' ')[0].slice(0, 8).padEnd(9)} ⇄ ${pB.nombre.split(' ')[0].slice(0, 8).padEnd(9)}  ${motivo.slice(0, 58)}`);
    } else {
      console.log(`  [dry] T#${String(nTrueke).padStart(2)} ${pA.nombre.slice(0, 8).padEnd(9)} ⇄ ${pB.nombre.slice(0, 8).padEnd(9)}  ${itemA.titulo.slice(0, 22)} ↔ ${itemB.titulo.slice(0, 22)}`);
    }
  }

  // =====================================================================
  // 4. VALORACIONES cruzadas (2 por trueke; variación por perfil 1–5)
  // =====================================================================
  console.log('\n[4/6] Insertando 60 valoraciones cruzadas (5 dimensiones, 1–5)…');
  function notaPara(perfil, s) {
    // ORO: 4–5 · PLATA: 4–5 (con algún 3) · BRONCE: 3–5 — coherente a la medalla
    const base = { ORO: 5, PLATA: 4, BRONCE: 3 }[perfil.medalla] ?? 4;
    const d = (s * 7) % 3; // 0,1,2 determinista
    return Math.max(1, Math.min(5, base + (d === 0 ? -1 : d === 2 && perfil.medalla !== 'ORO' ? 1 : 0)));
  }
  for (let k = 0; k < 30; k++) {
    const pr = plan[k];
    const pA = PERFILES.find((x) => x.idx === pr.a);
    const pB = PERFILES.find((x) => x.idx === pr.b);
    if (!DRY) {
      const escrowK = escrowBase - (k + 1);
      // solo valorar truekes creados en esta ejecución (idempotencia)
      if (!creadosEnRonda.includes(escrowK)) continue;
      const tid = (await pool.query(
        `SELECT id FROM truekes WHERE escrow_id = $1`, [escrowK]
      )).rows[0]?.id;
      if (!tid) continue;
      const creadoEn = haceDias(Math.max(1, Math.round(90 - (k + 1) * 2.5)), 3);
      for (const [valorador, valorado, perfilValorado, s] of [
        [usuarioPorIdx[pr.a], usuarioPorIdx[pr.b], pB, k],
        [usuarioPorIdx[pr.b], usuarioPorIdx[pr.a], pA, k + 13],
      ]) {
        const n = (x) => notaPara(perfilValorado, s + x);
        await pool.query(
          `INSERT INTO valoraciones
             (trueke_id, valorador, valorado, aceptacion, honestidad, seguridad, confiabilidad, compromiso, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (trueke_id, valorador) DO NOTHING`,
          [tid, valorador, valorado, n(1), n(2), n(3), n(4), n(5), creadoEn]
        );
      }
    }
  }
  if (DRY) console.log('  [dry] 60 valoraciones (2 por trueke)');

  // =====================================================================
  // 5. BRLT on-chain: emisión con quórum de Socios (D32) + distribución
  // =====================================================================
  console.log('\n[5/6] Emisión BRLT on-chain (propuesta EMITIR_BRLT con quórum ≥2/3)…');
  if (!DRY && !SOLO_BD && REGISTRY_ADDRESS && BRLT_ADDRESS) {
    proveedor = proveedor || new ethers.JsonRpcProvider(RPC_URL, undefined, { cacheTimeout: -1 });
    const registry = new ethers.Contract(REGISTRY_ADDRESS, ABI_REGISTRY, new ethers.Wallet(PK_OWNER, proveedor));
    const cBrlt = new ethers.Contract(BRLT_ADDRESS, ABI_BRLT, new ethers.Wallet(PK_OWNER, proveedor));

    const duenoRegistry = await registry.owner().catch(() => null);
    if (duenoRegistry && duenoRegistry.toLowerCase() !== owner.address.toLowerCase()) {
      console.warn(`  ⚠️  el owner del registry es ${duenoRegistry}; la clave configurada es ${owner.address}.`);
    }

    const TOTAL_NETO = PERFILES.reduce((a, p) => a + p.brlt, 0); // 10000
    const GROSSO = Math.ceil((TOTAL_NETO * 100) / 95); // +5% al FondoDeValor (D7)
    const pct = 5;

    // (a) admitir socios 2 y 3 si no lo son (admitirSocioDirecto)
    for (const i of [2, 3]) {
      const w = wallets[i].address;
      const es = await registry.esSocio(w).catch(() => false);
      if (!es) {
        const tx = await registry.admitirSocioDirecto(w);
        await tx.wait();
        console.log(`  ✓ ${PERFILES.find(p=>p.idx===i).nombre} admitido como Socio on-chain`);
      } else {
        console.log(`  · ${PERFILES.find(p=>p.idx===i).nombre} ya es Socio`);
      }
    }

    // (b) propuesta única EMITIR_BRLT (tipo 0 según enum) por el Owner
    const proposito = ethers.encodeBytes32String('Inyeccion operativa TrueKeate');
    const txP = await registry.crearPropuesta(0, proposito, ethers.parseEther(String(GROSSO)));
    const recP = await txP.wait();
    // id real de la propuesta: se lee del evento PropuestaCreada del recibo
    let idPropuesta = null;
    try {
      const iface = new ethers.Interface([
        'event PropuestaCreada(uint256 indexed id, uint8 tipo, address proponente, uint256 parametro)',
      ]);
      for (const log of recP.logs || []) {
        try { const par = iface.parseLog(log); if (par) { idPropuesta = Number(par.args[0]); break; } } catch { /* */ }
      }
    } catch { /* */ }
    if (idPropuesta === null) throw new Error('No se pudo leer el id de la propuesta (evento PropuestaCreada)');
    console.log(`  → Propuesta #${idPropuesta}: emitir ${GROSSO} BRLT (${pct}% → FondoDeValor)`);

    // (c) votos: owner + socios 2 y 3 (quórum 2/3 alcanzado → ejecución inmediata D32)
    const votantes = [owner, wallets[2], wallets[3]];
    for (const v of votantes) {
      try {
        const cV = new ethers.Contract(REGISTRY_ADDRESS, ABI_REGISTRY, v.connect(proveedor));
        const tx = await cV.votarPropuesta(idPropuesta, true);
        await tx.wait();
        console.log(`  ✓ voto a favor de ${v.address.slice(0, 8)}…`);
      } catch (e) {
        console.warn(`  ⚠️  voto de ${v.address.slice(0, 8)} falló:`, (e.shortMessage || e.message || '').slice(0, 110));
      }
    }

    // (d) distribución exacta: owner recibe neto (grosso − 5%) y transfiere a los 6
    const saldoOwner = await cBrlt.balanceOf(owner.address);
    console.log(`  → saldo Owner tras emisión: ${ethers.formatEther(saldoOwner)} BRLT`);
    for (const p of PERFILES) {
      const destino = wallets[p.idx].address;
      const monto = ethers.parseEther(String(p.brlt));
      const tx = await cBrlt.transfer(destino, monto);
      await tx.wait();
      const saldo = await cBrlt.balanceOf(destino);
      console.log(`  ✓ ${p.nombre.padEnd(18)} recibe ${p.brlt} BRLT → saldo ${ethers.formatEther(saldo)}`);
    }
  } else {
    console.log('  · on-chain omitido (--solo-bd / --dry-run / falta dirección). Los saldos quedan solo en finanzas (BD).');
  }

  // =====================================================================
  // 6. CONSISTENCIA: finanzas.brlt = saldo on-chain real (o pedido) + cierre
  // =====================================================================
  console.log('\n[6/6] Ajuste final de finanzas y cierre…');
  if (!DRY) {
    for (const p of PERFILES) {
      const wallet = wallets[p.idx].address.toLowerCase();
      let brltFinal = p.brlt;
      if (!SOLO_BD && BRLT_ADDRESS) {
        try {
          const cB = new ethers.Contract(BRLT_ADDRESS, ABI_BRLT, proveedor || new ethers.JsonRpcProvider(RPC_URL));
          brltFinal = Number(ethers.formatEther(await cB.balanceOf(wallet)));
        } catch { /* sin red: se deja el pedido */ }
      }
      await pool.query(
        `UPDATE finanzas SET brlt=$2, nfts_stock=$3, criptos=$4, updated_at=now()
         WHERE usuario_id=(SELECT id FROM usuarios WHERE wallet=$1)`,
        [wallet, brltFinal,
         JSON.stringify({ tokenizados: (CATALOGO.filter(c => c.p === p.idx).length) }),
         JSON.stringify({})]
      );
      console.log(`  ✓ ${p.nombre.padEnd(18)} finanzas.brlt = ${brltFinal} · NFTs = ${CATALOGO.filter(c => c.p === p.idx).length}`);
    }
  } else {
    console.log('  [dry] finanzas.brlt = 2000/2000/2000/2000/1000/1000');
  }

  // =====================================================================
  console.log('\n============================================================');
  console.log('  RESUMEN DE LA INYECCIÓN (coherente con perfiles)');
  console.log('============================================================');
  console.log('  · 2 SOCIOS   CERTIFICADO/ORO   · 2000 BRLT · 3 artículos c/u');
  console.log('  · 2 EMPRESAS CERTIFICADO/PLATA · 2000 BRLT · 2 art + 2 bienes + 2 servicios c/u');
  console.log('  · 2 COMUNES  VERIFICADO/BRONCE · 1000 BRLT · 3 artículos c/u');
  console.log(`  · 30 truekes COMPLETADOS permutados (10 por usuario) con valoraciones 1–5`);
  console.log(`  · ${DRY ? 'DRY-RUN: no se escribió nada' : 'BD actualizada'}` +
    (!DRY && !SOLO_BD && NFT_ADDRESS ? ' · NFT mint real on-chain' : '') +
    (!DRY && !SOLO_BD && REGISTRY_ADDRESS && BRLT_ADDRESS ? ' · BRLT emitido con quórum' : ''));
  console.log('============================================================\n');
  if (pool) await pool.end();
}

main().catch((e) => {
  console.error('❌ Error en la inyección:', e);
  process.exit(1);
});
