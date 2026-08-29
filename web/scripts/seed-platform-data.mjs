#!/usr/bin/env node
/**
 * seed-platform-data.mjs — Seeding exhaustivo de datos esenciales de TrueKeate.
 * 
 * Inserta y sincroniza todos los registros esenciales en la base de datos PostgreSQL / SQLite:
 *  - Cuentas y perfiles con doble eje de progresión (Rol + Reputación).
 *  - Suscripciones comerciales y locales físicos fijados con UTM.
 *  - Catálogo de bienes físicos RWA, servicios SBT y artículos de trueke P2P.
 *  - Valoraciones en 5 dimensiones, avales de confianza y tesorería comunitaria.
 *  - Solicitudes de admisión a Socio en votación comunitaria.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Cargar .env.local
const envFile = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envFile)) {
  for (const raw of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx > 0) {
      process.env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    }
  }
}

const { initSchema, query } = await import('../server/db.js')

const ADDRS = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".toLowerCase(), // 0: Owner / Socio Fundador
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".toLowerCase(), // 1: Socio 1
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase(), // 2: Socio 2
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906".toLowerCase(), // 3: Empresa 1
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65".toLowerCase(), // 4: Empresa 2
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc".toLowerCase(), // 5: Particular 1
  "0x976EA74026E726554dB657fA54763abd0C3a0aa9".toLowerCase(), // 6: Particular 2
]

async function seed() {
  console.log("=============================================================")
  console.log("🌱 SEEDING EXHAUSTIVO DE DATOS DE PRUEBA TRUEKEATE")
  console.log("=============================================================")
  await initSchema()

  const now = Math.floor(Date.now() / 1000)
  const oneYearFromNow = now + 365 * 24 * 3600

  // 1. Inserción de Usuarios y Roles
  console.log("\n[1/7] Insertando perfiles de usuario en tabla 'users'...")

  const usersData = [
    // 0: SuperUsuario Owner (Socio Fundador Certificado)
    {
      address: ADDRS[0],
      username: 'superadmin',
      email: 'superadmin@truekeate.com',
      phone: '+584120000000',
      physical_address: 'Sede Central TrueKeate, Higuerote, Barlovento, Miranda',
      lat: 10.4806,
      lng: -66.1036,
      utm_easting: 729000,
      utm_northing: 1159000,
      utm_zone: 19,
      utm_hemisphere: 'N',
      identification_level: 'certificado',
      role: 'socio',
      trust_level: 'socio',
      reputation_rank: 'oro',
      completed_trades: 1000,
      disputes_lost: 0,
      effectiveness_pct: 100.0,
      active_trades_limit: 999999,
      kyc_status: 'verified',
      is_business: 0,
      subscription_status: 'none',
      sbt_claimed: 1,
      sbt_token_id: '1',
      sbt_provider: 'TruekeSBT Fundador',
      sbt_verified_at: now,
      two_factor_enabled: 1,
      terms_accepted: 1,
      email_verified: 1,
      phone_verified: 1,
    },
    // 1: Usuario Socio 1 (Juez Alpha)
    {
      address: ADDRS[1],
      username: 'socio_juez_alpha',
      email: 'juez.alpha@truekeate.com',
      phone: '+584126667788',
      physical_address: 'Tribunal Comunitario Alpha, Higuerote, Miranda',
      lat: 10.4835,
      lng: -66.1010,
      utm_easting: 729800,
      utm_northing: 1160100,
      utm_zone: 19,
      utm_hemisphere: 'N',
      identification_level: 'certificado',
      role: 'socio',
      trust_level: 'socio',
      reputation_rank: 'oro',
      completed_trades: 520,
      disputes_lost: 3,
      effectiveness_pct: 99.4,
      active_trades_limit: 999999,
      kyc_status: 'verified',
      is_business: 0,
      subscription_status: 'none',
      sbt_claimed: 1,
      sbt_token_id: '2',
      sbt_provider: 'TruekeSBT Socio',
      sbt_verified_at: now,
      two_factor_enabled: 1,
      terms_accepted: 1,
      email_verified: 1,
      phone_verified: 1,
    },
    // 2: Usuario Socio 2 (Juez Beta)
    {
      address: ADDRS[2],
      username: 'socio_juez_beta',
      email: 'juez.beta@truekeate.com',
      phone: '+584127778899',
      physical_address: 'Tribunal Comunitario Beta, Caucagua, Miranda',
      lat: 10.4120,
      lng: -66.1420,
      utm_easting: 725100,
      utm_northing: 1152000,
      utm_zone: 19,
      utm_hemisphere: 'N',
      identification_level: 'certificado',
      role: 'socio',
      trust_level: 'socio',
      reputation_rank: 'oro',
      completed_trades: 480,
      disputes_lost: 2,
      effectiveness_pct: 99.6,
      active_trades_limit: 999999,
      kyc_status: 'verified',
      is_business: 0,
      subscription_status: 'none',
      sbt_claimed: 1,
      sbt_token_id: '3',
      sbt_provider: 'TruekeSBT Socio',
      sbt_verified_at: now,
      two_factor_enabled: 1,
      terms_accepted: 1,
      email_verified: 1,
      phone_verified: 1,
    },
    // 3: Usuario Empresa 1 (TechZone Barlovento)
    {
      address: ADDRS[3],
      username: 'empresa_tech',
      email: 'tech@barloventas.com',
      phone: '+584124445566',
      physical_address: 'Centro Comercial Barlovento Local 14, Higuerote',
      lat: 10.4790,
      lng: -66.1045,
      utm_easting: 728900,
      utm_northing: 1158500,
      utm_zone: 19,
      utm_hemisphere: 'N',
      identification_level: 'certificado',
      role: 'empresa',
      trust_level: 'frecuente',
      reputation_rank: 'oro',
      completed_trades: 350,
      disputes_lost: 1,
      effectiveness_pct: 99.7,
      active_trades_limit: 999999,
      kyc_status: 'verified',
      is_business: 1,
      subscription_status: 'active',
      sbt_claimed: 1,
      sbt_token_id: '4',
      sbt_provider: 'TruekeSBT Empresa',
      sbt_verified_at: now,
      two_factor_enabled: 1,
      terms_accepted: 1,
      email_verified: 1,
      phone_verified: 1,
    },
    // 4: Usuario Empresa 2 (AgroInsumos El Cacao)
    {
      address: ADDRS[4],
      username: 'empresa_agro',
      email: 'agro@barloventas.com',
      phone: '+584125556677',
      physical_address: 'Av. Comercio Local 3, Tacarigua, Miranda',
      lat: 10.4580,
      lng: -66.1180,
      utm_easting: 727500,
      utm_northing: 1156200,
      utm_zone: 19,
      utm_hemisphere: 'N',
      identification_level: 'certificado',
      role: 'empresa',
      trust_level: 'frecuente',
      reputation_rank: 'oro',
      completed_trades: 290,
      disputes_lost: 1,
      effectiveness_pct: 99.7,
      active_trades_limit: 999999,
      kyc_status: 'verified',
      is_business: 1,
      subscription_status: 'active',
      sbt_claimed: 1,
      sbt_token_id: '5',
      sbt_provider: 'TruekeSBT Empresa',
      sbt_verified_at: now,
      two_factor_enabled: 1,
      terms_accepted: 1,
      email_verified: 1,
      phone_verified: 1,
    },
    // 5: Usuario Particular Verificado 1 (Carlos)
    {
      address: ADDRS[5],
      username: 'particular_carlos',
      email: 'carlos@truekeate.com',
      phone: '+584121112233',
      physical_address: 'Av. Principal 1, Higuerote, Miranda',
      lat: 10.4812,
      lng: -66.1022,
      utm_easting: 729450,
      utm_northing: 1159800,
      utm_zone: 19,
      utm_hemisphere: 'N',
      identification_level: 'verificado',
      role: 'particular',
      trust_level: 'comun',
      reputation_rank: 'plata',
      completed_trades: 85,
      disputes_lost: 4,
      effectiveness_pct: 95.5,
      active_trades_limit: 3,
      kyc_status: 'submitted',
      is_business: 0,
      subscription_status: 'none',
      sbt_claimed: 0,
      sbt_token_id: '',
      sbt_provider: '',
      sbt_verified_at: 0,
      two_factor_enabled: 1,
      terms_accepted: 1,
      email_verified: 1,
      phone_verified: 1,
    },
    // 6: Usuario Particular Verificado 2 (Diana)
    {
      address: ADDRS[6],
      username: 'particular_diana',
      email: 'diana@truekeate.com',
      phone: '+584122223344',
      physical_address: 'Calle Marina 12, Carenero, Miranda',
      lat: 10.5010,
      lng: -66.0880,
      utm_easting: 731200,
      utm_northing: 1162400,
      utm_zone: 19,
      utm_hemisphere: 'N',
      identification_level: 'verificado',
      role: 'particular',
      trust_level: 'comun',
      reputation_rank: 'plata',
      completed_trades: 92,
      disputes_lost: 3,
      effectiveness_pct: 96.8,
      active_trades_limit: 3,
      kyc_status: 'submitted',
      is_business: 0,
      subscription_status: 'none',
      sbt_claimed: 0,
      sbt_token_id: '',
      sbt_provider: '',
      sbt_verified_at: 0,
      two_factor_enabled: 1,
      terms_accepted: 1,
      email_verified: 1,
      phone_verified: 1,
    },
  ]

  for (const u of usersData) {
    await query(
      `INSERT INTO users (
        address, username, email, phone, physical_address, lat, lng,
        utm_easting, utm_northing, utm_zone, utm_hemisphere,
        identification_level, role, trust_level, reputation_rank,
        completed_trades, disputes_lost, effectiveness_pct, active_trades_limit,
        kyc_status, is_business, subscription_status,
        sbt_token_id, sbt_provider, sbt_verified_at,
        two_factor_enabled, terms_accepted, email_verified, phone_verified,
        registered_at, created_at, last_active_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(address) DO UPDATE SET
        username = excluded.username,
        email = excluded.email,
        phone = excluded.phone,
        physical_address = excluded.physical_address,
        lat = excluded.lat,
        lng = excluded.lng,
        utm_easting = excluded.utm_easting,
        utm_northing = excluded.utm_northing,
        utm_zone = excluded.utm_zone,
        utm_hemisphere = excluded.utm_hemisphere,
        identification_level = excluded.identification_level,
        role = excluded.role,
        trust_level = excluded.trust_level,
        reputation_rank = excluded.reputation_rank,
        completed_trades = excluded.completed_trades,
        disputes_lost = excluded.disputes_lost,
        effectiveness_pct = excluded.effectiveness_pct,
        active_trades_limit = excluded.active_trades_limit,
        kyc_status = excluded.kyc_status,
        is_business = excluded.is_business,
        subscription_status = excluded.subscription_status,
        sbt_token_id = excluded.sbt_token_id,
        sbt_provider = excluded.sbt_provider,
        sbt_verified_at = excluded.sbt_verified_at,
        two_factor_enabled = excluded.two_factor_enabled,
        terms_accepted = excluded.terms_accepted,
        email_verified = excluded.email_verified,
        phone_verified = excluded.phone_verified`,
      [
        u.address, u.username, u.email, u.phone, u.physical_address, u.lat, u.lng,
        u.utm_easting, u.utm_northing, u.utm_zone, u.utm_hemisphere,
        u.identification_level, u.role, u.trust_level, u.reputation_rank,
        u.completed_trades, u.disputes_lost, u.effectiveness_pct, u.active_trades_limit,
        u.kyc_status, u.is_business, u.subscription_status,
        u.sbt_token_id, u.sbt_provider, u.sbt_verified_at,
        u.two_factor_enabled, u.terms_accepted, u.email_verified, u.phone_verified,
        now, now, now
      ]
    )
    console.log(`  ✓ Usuario @${u.username} (${u.address.slice(0, 8)}...) -> Rol: ${u.role.toUpperCase()} | Nivel: ${u.identification_level.toUpperCase()} | Rango: ${u.reputation_rank.toUpperCase()}`)
  }

  // 2. Suscripciones Comerciales
  console.log("\n[2/7] Insertando suscripciones comerciales en tabla 'subscriptions'...")
  await query(
    `INSERT INTO subscriptions (address, plan, status, paid_until, updated_at)
     VALUES (?, 'anual', 'active', ?, ?), (?, 'anual', 'active', ?, ?)
     ON CONFLICT(address) DO UPDATE SET status = 'active', paid_until = excluded.paid_until`,
    [ADDRS[3], oneYearFromNow, now, ADDRS[4], oneYearFromNow, now]
  )
  console.log("  ✓ Suscripciones activas por 12 meses para Cuentas 3 y 4 (BRLT).")

  // 3. Locales Comerciales Fijos
  console.log("\n[3/7] Insertando locales comerciales en tabla 'company_stores'...")
  await query(
    `INSERT INTO company_stores (id, owner, name, physical_address, lat, lng, utm_easting, utm_northing, utm_zone, schedule, phone, created_at)
     VALUES 
     ('store_tech_1', ?, 'TechZone Barlovento — CC Barlovento', 'Centro Comercial Barlovento Local 14, Higuerote', 10.4790, -66.1045, 728900, 1158500, 19, 'Lunes a Sábado: 8:00 AM - 6:00 PM', '+584124445566', ?),
     ('store_agro_1', ?, 'AgroInsumos El Cacao — Tacarigua', 'Av. Comercio Local 3, Tacarigua, Miranda', 10.4580, -66.1180, 727500, 1156200, 19, 'Lunes a Domingo: 7:00 AM - 5:00 PM', '+584125556677', ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, physical_address = excluded.physical_address`,
    [ADDRS[3], now, ADDRS[4], now]
  )
  console.log("  ✓ 2 Locales comerciales físicos registrados con coordenadas UTM.")

  // 4. Finanzas Comerciales
  console.log("\n[4/7] Insertando registros en 'company_finances'...")
  await query(
    `INSERT INTO company_finances (id, company, type, token, amount, ref_id, description, created_at)
     VALUES 
     ('fin_1', ?, 'sale', 'BRLT', '450.00', 'SALE-101', 'Venta equipo smartphone Xiaomi Redmi 12', ?),
     ('fin_2', ?, 'swap', 'USDT', '200.00', 'TRUEKE-88', 'Trueke custodiado: Router WiFi 6 por 200 USDT', ?),
     ('fin_3', ?, 'sale', 'BRLT', '120.00', 'SALE-102', 'Venta abono orgánico y fertilizantes 50kg', ?),
     ('fin_4', ?, 'fee', 'BRLT', '-10.00', 'TX-GAS-01', 'Comisión operativa de custodia atómica', ?)
     ON CONFLICT(id) DO NOTHING`,
    [ADDRS[3], now - 86400, ADDRS[3], now - 43200, ADDRS[4], now - 36000, ADDRS[4], now - 18000]
  )
  console.log("  ✓ 4 Movimientos contables en BRLT y USDT insertados.")

  // 5. Catálogo de Artículos y Servicios
  console.log("\n[5/7] Insertando catálogo de bienes RWA, Servicios SBT y Truekes en 'items'...")
  const items = [
    {
      id: 'item_rwa_laptop',
      owner: ADDRS[3],
      title: 'Laptop Lenovo ThinkPad T14 Gen 3 (RWA Tokenizado)',
      description: 'Equipo corporativo Intel Core i7 12va Gen, 32GB RAM DDR5, 1TB SSD NVMe. Garantía comercial 1 año.',
      category: 'rwa',
      quantity: 3,
      status: 'available',
    },
    {
      id: 'item_srv_mantenimiento',
      owner: ADDRS[3],
      title: 'Voucher SBT: Soporte Técnico & Redes Corporativas',
      description: 'Cupón de 10 horas de servicio técnico especializado en servidores, cableado estructurado y CCTV.',
      category: 'service',
      quantity: 5,
      status: 'available',
    },
    {
      id: 'item_rwa_cacao',
      owner: ADDRS[4],
      title: 'Lote de Cacao Fino de Aroma Criollo Barlovento (100 kg RWA)',
      description: 'Cacao orgánico certificado de origen Barlovento, secado solar tradicional. Grado Premium de exportación.',
      category: 'rwa',
      quantity: 10,
      status: 'available',
    },
    {
      id: 'item_srv_agronomia',
      owner: ADDRS[4],
      title: 'Voucher SBT: Asesoría Agronómica y Estudio de Suelos',
      description: 'Jornada técnica en campo para análisis de fertilidad, control de plagas y nutrición de cultivos.',
      category: 'service',
      quantity: 4,
      status: 'available',
    },
    {
      id: 'item_p2p_taladro',
      owner: ADDRS[5],
      title: 'Taladro Inalámbrico Bosch Brushless 18V con 2 Baterías',
      description: 'Herramienta en excelente estado con maletín de transporte y cargador rápido. Busco generador portátil.',
      category: 'general',
      quantity: 1,
      status: 'available',
    },
    {
      id: 'item_p2p_bici',
      owner: ADDRS[6],
      title: 'Bicicleta Montañera Trek Marlin 7 Aro 29',
      description: 'Cuadro aluminio Alpha Silver, frenos de disco hidráulicos Shimano, suspensión RockShox con bloqueo.',
      category: 'general',
      quantity: 1,
      status: 'available',
    },
  ]

  for (const it of items) {
    await query(
      `INSERT INTO items (id, owner, title, description, category, quantity, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, description = excluded.description, category = excluded.category`,
      [it.id, it.owner, it.title, it.description, it.category, it.quantity, it.status, now]
    )
    console.log(`  ✓ [${it.category.toUpperCase()}] "${it.title}" de @${usersData.find(u => u.address === it.owner)?.username}`)
  }

  // 6. Valoraciones en 5 Dimensiones y Avales
  console.log("\n[6/7] Insertando valoraciones en 5 dimensiones y avales de confianza...")
  await query(
    `INSERT INTO ratings (id, operation_id, rater, ratee, acceptance, honesty, security, reliability, commitment, comment, created_at)
     VALUES
     ('rate_1', 1, ?, ?, 5, 5, 5, 5, 5, 'Excelente comerciante. Despacho inmediato y producto RWA conforme.', ?),
     ('rate_2', 1, ?, ?, 5, 5, 5, 5, 5, 'Comprador verificado muy puntual y formal en el punto de encuentro.', ?),
     ('rate_3', 2, ?, ?, 5, 5, 5, 5, 5, 'Socio mediador excelente. Custodia atómica transparente.', ?)
     ON CONFLICT(id) DO NOTHING`,
    [ADDRS[5], ADDRS[3], now - 86400, ADDRS[3], ADDRS[5], now - 86400, ADDRS[6], ADDRS[1], now - 43200]
  )

  await query(
    `INSERT INTO vouches (id, vouch_by, vouch_for, created_at)
     VALUES
     ('vouch_1', ?, ?, ?),
     ('vouch_2', ?, ?, ?),
     ('vouch_3', ?, ?, ?)
     ON CONFLICT(id) DO NOTHING`,
    [ADDRS[0], ADDRS[1], now, ADDRS[1], ADDRS[3], now, ADDRS[2], ADDRS[4], now]
  )
  console.log("  ✓ 3 Valoraciones de 5 estrellas y 3 avales cruzados de reputación insertados.")

  // 7. Gobernanza Comunitaria y Tesorería
  console.log("\n[7/7] Insertando solicitud de Socio en Gobernanza y registro de Tesorería...")
  await query(
    `INSERT INTO socio_applications (id, candidate, motivation, deposit_token, deposit_amount, yes_votes, no_votes, status, created_at)
     VALUES (1, ?, 'Deseo contribuir como Juez Árbitro Comunitario en Barlovento y respaldar la resolución de disputas.', '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853', '500000000000000000000', 2, 0, 'voting', ?)
     ON CONFLICT(id) DO UPDATE SET motivation = excluded.motivation`,
    [ADDRS[5], now - 172800]
  )

  await query(
    `INSERT INTO platform_treasury_logs (id, type, token, amount, actor, description, created_at)
     VALUES
     ('tres_1', 'subscription', 'BRLT', '2400.00', ?, 'Cobro anual membresía de 2 Comercios Verificados', ?),
     ('tres_2', 'gas_expense', 'ETH', '-0.05', ?, 'Gasto operativo de relayer para firmas sin gas EIP-712', ?)
     ON CONFLICT(id) DO NOTHING`,
    [ADDRS[0], now - 86400, ADDRS[0], now - 3600]
  )
  console.log("  ✓ Solicitud de Socio #1 en votación de 5 días y balance de Tesorería configurados.")

  console.log("\n=============================================================")
  console.log("  ✅ [EXITO] SEEDING DE TODAS LAS TABLAS COMPLETADO")
  console.log("=============================================================\n")
}

seed().catch((err) => {
  console.error("❌ Error en seed-platform-data:", err)
  process.exit(1)
})
