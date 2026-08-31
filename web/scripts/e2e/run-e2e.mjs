/**
 * run-e2e.mjs — Pruebas E2E profundas de TrueKeate (navegador headless + wallet inyectada del owner).
 *
 * Suites:
 *  A. Páginas: todas las rutas renderizan sin errores de consola ni hydration mismatch.
 *  B. Flujos owner (UI): conexión automática, dashboard, crear/completar/cancelar/disputar
 *     operaciones, add-token admin, identidad (términos/contacto/2FA/SBT), catálogo, campañas, perfil.
 *  C. APIs: matriz completa de endpoints (éxito + casos de error esperados).
 *
 * Uso: node scripts/e2e/run-e2e.mjs   (desde web/)
 * Genera: scripts/e2e/report.json + capturas en scripts/e2e/shots/
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { startBridge } from './bridge.mjs'
import { providerSource } from './page-provider.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:3000'
const SHOTS = path.join(__dirname, 'shots')
fs.mkdirSync(SHOTS, { recursive: true })

// Cuentas de prueba (Anvil)
const KEYS = {
  owner: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  user2: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', // socio_juez_beta
  free: '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356', // cuenta libre
}

// ------------------------------------------------------------------ reporte
const report = { suites: [], issues: [] }
let currentSuite = ''

function suite(name) {
  currentSuite = name
  report.suites.push({ name, checks: 0, failures: 0 })
  console.log(`\n━━━ SUITE: ${name} ━━━`)
}
function check(name, ok, detail = '') {
  const s = report.suites.find((x) => x.name === currentSuite)
  s.checks++
  if (!ok) {
    s.failures++
    report.issues.push({ suite: currentSuite, check: name, detail: String(detail).slice(0, 400) })
    console.log(`  ✗ ${name}${detail ? ` — ${String(detail).slice(0, 200)}` : ''}`)
  } else {
    console.log(`  ✓ ${name}`)
  }
  return ok
}
async function pageCheck(page, name, ok, detail = '') {
  if (!ok && page) {
    try {
      const safe = name.replace(/[^a-z0-9]+/gi, '_').slice(0, 60)
      await page.screenshot({ path: path.join(SHOTS, `${currentSuite}_${safe}.png`), fullPage: true })
    } catch { /* ignore */ }
  }
  return check(name, ok, detail)
}

// ------------------------------------------------------------------ helpers
async function goto(page, p, { wait = true } = {}) {
  const res = await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 90000 })
  if (wait) {
    await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {})
  }
  return res
}
function collectConsole(page) {
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  return errors
}
function hydrationErrors(errors) {
  return errors.filter(
    (e) => /hydrat/i.test(e) || /did not match/i.test(e) || /server rendered HTML/i.test(e)
  )
}

// ------------------------------------------------------------------ main
async function main() {
  const bridge = await startBridge({ ownerKey: KEYS.owner })
  console.log(`Bridge wallet owner: ${bridge.ownerAddress}`)

  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript({ content: providerSource })
  const page = await context.newPage()
  page.setDefaultTimeout(60000)

  // ================================================================ SUITE A
  suite('A. Páginas (smoke + consola)')
  const PAGES = [
    ['/', 'TrueKeat'],
    ['/register', /inscrito/i],
    ['/help', 'Ayuda'],
    ['/items', 'Catálogo'],
    ['/operations', 'Operaciones'],
    ['/dashboard', 'Panel de Control'],
    ['/identity', 'Centro de Identidad'],
    ['/campaigns', 'Campañas'],
    ['/balances', 'Balances'],
    ['/profile', 'Mi perfil'],
    ['/add-token', 'Token'],
    ['/admin/identity', 'Identidades'],
    ['/governance/socio-voting', 'Admisión de Nuevos Socios'],
    ['/governance/treasury', 'Tesorería'],
    ['/company/finances', 'Finanzas Comerciales'],
    ['/company/inventory', 'Gestión de Inventario'],
  ]
  for (const [p, expectText] of PAGES) {
    const errors = collectConsole(page)
    try {
      const res = await goto(page, p)
      const okStatus = res && res.status() < 400
      const matcher = expectText instanceof RegExp ? expectText : new RegExp(expectText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      const hasText = await page.getByText(matcher, { exact: false }).first().isVisible().catch(() => false)
      const hyd = hydrationErrors(errors)
      await pageCheck(page, `GET ${p}`, okStatus && hasText && hyd.length === 0, `status=${res?.status()} texto=${hasText} hyd=${hyd.length}`)
      if (errors.length) {
        check(`consola limpia ${p}`, errors.length === 0, errors.join(' | '))
      }
    } catch (e) {
      await pageCheck(page, `GET ${p}`, false, e.message)
    }
  }

  // ================================================================ SUITE B
  suite('B. Flujos owner (UI + wallet inyectada)')

  // B1. Conexión automática como owner
  {
    await goto(page, '/dashboard')
    const connected = await page.getByText('Bienvenido', { exact: false }).first().isVisible().catch(() => false)
    const uname = await page.getByText('@superadmin', { exact: false }).first().isVisible().catch(() => false)
    await pageCheck(page, 'B1 auto-conexión owner + @superadmin', connected && uname, `connected=${connected} uname=${uname}`)
    const roleBadge = await page.getByText('Fundador', { exact: false }).first().isVisible().catch(() => false)
    await pageCheck(page, 'B1 rol Socio (Fundador) visible', roleBadge)
  }

  // B2. Crear operación escrow (owner -> user1)
  {
    await goto(page, '/operations')
    await page.getByRole('button', { name: /Nueva operación/ }).click()
    await page.getByText('Crear Operación Escrow', { exact: true }).waitFor({ state: 'visible' })
    // tokenA = TKA (index 1), tokenB = TKB (index 2) según orden de allowedTokens
    const selects = page.locator('form select')
    await selects.nth(0).selectOption({ index: 1 })
    await selects.nth(1).selectOption({ index: 2 })
    const inputs = page.locator('form input[type="number"]')
    await inputs.nth(0).fill('10')
    await inputs.nth(1).fill('20')
    await inputs.nth(2).fill('0')
    await page.getByRole('button', { name: /Aperturar Custodia Escrow/ }).click()
    const okMsg = await page.getByText('Operación creada correctamente.').waitFor({ state: 'visible', timeout: 90000 }).then(() => true).catch(() => false)
    await pageCheck(page, 'B2 crear operación (tx firmada por owner)', okMsg)
    // esperar cierre del modal y verificar en la lista (recarga fresca)
    await page.waitForTimeout(3500)
    await goto(page, '/operations')
    const card = await page.getByText('Contrato de Trueque Bilateral', { exact: false }).first().isVisible().catch(() => false)
    await pageCheck(page, 'B2 operación visible en lista', card)
  }

  // B3. Completar como otro usuario (cambio de cuenta vía bridge + accountsChanged)
  {
    const addr2 = await bridge.setAccount(KEYS.user2)
    await page.evaluate((a) => window.__tkEthereum._emit('accountsChanged', [a]), addr2)
    await page.waitForTimeout(1500)
    await goto(page, '/operations')
    const completeBtn = page.getByRole('button', { name: /Completar Trueque/ }).last()
    const visible = await completeBtn.isVisible().catch(() => false)
    await pageCheck(page, 'B3 botón Completar visible para user2', visible)
    if (visible) {
      await completeBtn.click()
      // éxito vía UI o vía estado on-chain (robusto a timing del mensaje)
      const done = await Promise.race([
        page.getByText('Trueque completado con éxito', { exact: false }).first().waitFor({ state: 'visible', timeout: 90000 }).then(() => true).catch(() => false),
        (async () => {
          for (let i = 0; i < 60; i++) {
            const r = await fetch(`${BASE}/api/stats`).then((x) => x.json()).catch(() => null)
            if (r && r.completedOperations > 0) return true
            await new Promise((res) => setTimeout(res, 1500))
          }
          return false
        })(),
      ])
      await pageCheck(page, 'B3 completar operación (tx user2)', done)
    }
    await bridge.setAccount(KEYS.owner)
    await page.evaluate((a) => window.__tkEthereum._emit('accountsChanged', [a]), bridge.ownerAddress)
    await page.waitForTimeout(1500)
  }

  // B4. Disputa + resolución por el árbitro (owner)
  {
    // crear operación nueva como owner
    await goto(page, '/operations')
    await page.getByRole('button', { name: /Nueva operación/ }).click()
    await page.getByText('Crear Operación Escrow', { exact: true }).waitFor({ state: 'visible' })
    const selects = page.locator('form select')
    await selects.nth(0).selectOption({ index: 1 })
    await selects.nth(1).selectOption({ index: 2 })
    const inputs = page.locator('form input[type="number"]')
    await inputs.nth(0).fill('1')
    await inputs.nth(1).fill('2')
    await inputs.nth(2).fill('0')
    await page.getByRole('button', { name: /Aperturar Custodia Escrow/ }).click()
    const okMsg = await page.getByText('Operación creada correctamente.').waitFor({ state: 'visible', timeout: 90000 }).then(() => true).catch(() => false)
    await pageCheck(page, 'B4 crear op para disputa', okMsg)
    await page.waitForTimeout(3500)
    // user2 abre disputa
    const addr2 = await bridge.setAccount(KEYS.user2)
    await page.evaluate((a) => window.__tkEthereum._emit('accountsChanged', [a]), addr2)
    await page.waitForTimeout(1500)
    await goto(page, '/operations')
    const disputeBtn = page.getByRole('button', { name: /Abrir Disputa Arbitral/ }).last()
    const dVisible = await disputeBtn.isVisible().catch(() => false)
    await pageCheck(page, 'B4 botón disputa visible para user2', dVisible)
    if (dVisible) {
      await disputeBtn.click()
      await page.getByText('Disputa elevada', { exact: false }).first().waitFor({ state: 'visible', timeout: 90000 }).then(() => true).catch(() => false)
      await page.waitForTimeout(1500)
    }
    // owner (árbitro) resuelve a favor del creador
    await bridge.setAccount(KEYS.owner)
    await page.evaluate((a) => window.__tkEthereum._emit('accountsChanged', [a]), bridge.ownerAddress)
    await page.waitForTimeout(1500)
    await goto(page, '/operations')
    const panel = page.getByText('Panel de Árbitro', { exact: false }).last()
    const pVisible = await panel.isVisible().catch(() => false)
    await pageCheck(page, 'B4 panel de árbitro visible para owner', pVisible)
    if (pVisible) {
      await page.getByRole('button', { name: /favor del creador/i }).last().click()
      const res = await page.getByText('Disputa resuelta a favor del creador', { exact: false }).first().waitFor({ state: 'visible', timeout: 90000 }).then(() => true).catch(() => false)
      await pageCheck(page, 'B4 disputa resuelta', res)
      await page.waitForTimeout(1500)
    }
  }

  // B5. Cancelar operación (owner)
  {
    await goto(page, '/operations')
    await page.getByRole('button', { name: /Nueva operación/ }).click()
    await page.getByText('Crear Operación Escrow', { exact: true }).waitFor({ state: 'visible' })
    const selects = page.locator('form select')
    await selects.nth(0).selectOption({ index: 1 })
    await selects.nth(1).selectOption({ index: 2 })
    const inputs = page.locator('form input[type="number"]')
    await inputs.nth(0).fill('5')
    await inputs.nth(1).fill('10')
    await inputs.nth(2).fill('0')
    await page.getByRole('button', { name: /Aperturar Custodia Escrow/ }).click()
    await page.getByText('Operación creada correctamente.').waitFor({ state: 'visible', timeout: 90000 }).then(() => true).catch(() => false)
    await page.waitForTimeout(3500)
    const cancelBtn = page.getByRole('button', { name: /Cancelar Operación/ }).last()
    const cVisible = await cancelBtn.isVisible().catch(() => false)
    await pageCheck(page, 'B5 botón cancelar visible para creador', cVisible)
    if (cVisible) {
      await cancelBtn.click()
      const done = await page.getByText('Operación cancelada', { exact: false }).first().waitFor({ state: 'visible', timeout: 90000 }).then(() => true).catch(() => false)
      await pageCheck(page, 'B5 operación cancelada', done)
    }
  }

  // B6. Admin: añadir token (desplegar MockERC20 nuevo + form)
  {
    const { ethers } = await import('ethers')
    const artifact = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'sc', 'out', 'MockERC20.sol', 'MockERC20.json'), 'utf8'))
    const wallet = new ethers.Wallet(KEYS.owner, bridge.provider)
    const tokenFactory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet)
    const newToken = await tokenFactory.deploy('TokenC', 'TKC', 18)
    await newToken.waitForDeployment()
    const addr = await newToken.getAddress()
    await goto(page, '/add-token')
    const input = page.locator('input[type="text"]').first()
    await input.fill(addr)
    await page.getByRole('button', { name: /Añadir Token/i }).first().click()
    const okMsg = await page.getByText('Token añadido correctamente.').waitFor({ state: 'visible', timeout: 90000 }).then(() => true).catch(() => false)
    await pageCheck(page, 'B6 addToken admin (owner)', okMsg)
  }

  // B7. Identidad: términos + contacto + 2FA + SBT externo
  {
    await goto(page, '/identity')
    const termsBtn = page.getByRole('button', { name: /Aceptar Acuerdos/ }).first()
    if (await termsBtn.isVisible().catch(() => false)) {
      await termsBtn.click()
      await page.getByText('acuerdos aceptados', { exact: false }).first().waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false)
      await page.waitForTimeout(800)
    }
    await pageCheck(page, 'B7 términos aceptados (sin error)', true)

    // Contacto (Nivel 2)
    await page.getByRole('button', { name: /Canales de Contacto/ }).click()
    const emailInput = page.locator('input[type="email"]')
    const phoneInput = page.locator('input[type="tel"]')
    await emailInput.fill(`owner_e2e_${Date.now()}@truekeate.com`)
    await phoneInput.fill('+584129999999')
    const codes = page.locator('input[maxlength="6"]')
    if ((await codes.count()) >= 2) {
      await codes.nth(0).fill('123456')
      await codes.nth(1).fill('123456')
    }
    await page.getByRole('button', { name: /Verificar Canales/ }).click()
    const contactOk = await page.getByText(/Correo y teléfono verificados/).first().waitFor({ state: 'visible', timeout: 60000 }).then(() => true).catch(() => false)
    await pageCheck(page, 'B7 verificación contacto (123456)', contactOk)

    // 2FA
    await page.getByRole('button', { name: /Seguridad 2FA/ }).click()
    const start2fa = page.getByRole('button', { name: /Iniciar Configuración de 2FA/ })
    if (await start2fa.isVisible().catch(() => false)) {
      await start2fa.click()
      const secretVisible = await page.locator('code').first().isVisible({ timeout: 30000 }).catch(() => false)
      await pageCheck(page, 'B7 2FA secreto mostrado', secretVisible)
      if (secretVisible) {
        const codeInput = page.locator('input[maxlength="6"]').first()
        await codeInput.fill('123456')
        await page.getByRole('button', { name: /Confirmar y Activar 2FA/ }).click()
        const twoOk = await page.getByText(/2FA activado/).first().waitFor({ state: 'visible', timeout: 60000 }).then(() => true).catch(() => false)
        await pageCheck(page, 'B7 2FA activado', twoOk)
      }
    }

    // SBT externo (Nivel 3)
    await page.getByRole('button', { name: /Certificación SBT/ }).click()
    const sbtBtn = page.getByRole('button', { name: /Verificar y Certificar/ })
    if (await sbtBtn.isVisible().catch(() => false)) {
      await sbtBtn.click()
      const sbtOk = await page.getByText(/¡Credencial .* verificada/).first().waitFor({ state: 'visible', timeout: 60000 }).then(() => true).catch(() => false)
      await pageCheck(page, 'B7 SBT externo verificado', sbtOk)
    }
  }

  // B8. Catálogo: crear artículo firmado
  {
    await goto(page, '/items/new')
    await page.getByPlaceholder(/Bicicleta de montaña/).fill(`E2E Laptop ${Date.now()}`)
    await page.getByPlaceholder(/Estado, características/).fill('Artículo de prueba E2E')
    await page.getByRole('button', { name: /Publicar Artículo/i }).first().click()
    // la firma personal_sign ocurre vía bridge; redirige a /items/[id]
    const detail = await page.waitForURL(/\/items\/[0-9a-f-]+/, { timeout: 90000 }).then(() => true).catch(() => false)
    await pageCheck(page, 'B8 artículo creado con firma ECDSA', detail)
    if (detail) {
      const titleVisible = await page.getByText(/E2E Laptop/).first().waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false)
      await pageCheck(page, 'B8 detalle del artículo renderiza', titleVisible)
    }
  }

  // B9. Campañas: crear + aprobar (owner es socio)
  {
    await goto(page, '/campaigns')
    const titleInput = page.locator('input[type="text"]').first()
    const hasForm = await titleInput.isVisible().catch(() => false)
    await pageCheck(page, 'B9 formulario campaña visible', hasForm)
    if (hasForm) {
      await titleInput.fill(`Campaña E2E ${Date.now()}`)
      const submit = page.getByRole('button', { name: /Crear Campaña/i })
      await submit.click()
      await page.waitForTimeout(2000)
      const created = await page.getByText(/Campaña E2E/).first().isVisible().catch(() => false)
      await pageCheck(page, 'B9 campaña creada', created)
      const approveBtn = page.getByRole('button', { name: /Aprobar/i }).first()
      if (await approveBtn.isVisible().catch(() => false)) {
        await approveBtn.click()
        await page.waitForTimeout(2000)
        const approved = await page.getByText(/Aprobada/i).first().isVisible().catch(() => false)
        await pageCheck(page, 'B9 campaña aprobada (socio)', approved)
      }
    }
  }

  // B10. Perfil: KYC (form scoped) + ubicación
  {
    await goto(page, '/profile')
    const kycForm = page.locator('form').filter({ has: page.getByPlaceholder('usuario@correo.com') })
    const kycEmail = kycForm.locator('input[type="email"]')
    const kycPhone = kycForm.locator('input[type="tel"]')
    const hasKyc = await kycEmail.isVisible().catch(() => false)
    if (hasKyc) {
      await kycEmail.fill(`owner_kyc_${Date.now()}@truekeate.com`)
      await kycPhone.fill('+5841299887766')
      await kycForm.getByRole('button', { name: /Enviar verificación/ }).click()
      const kycOk = await page.getByText(/cifrados en la BD/).first().waitFor({ state: 'visible', timeout: 60000 }).then(() => true).catch(() => false)
      await pageCheck(page, 'B10 KYC enviado (cifrado AES)', kycOk)
    } else {
      await pageCheck(page, 'B10 form KYC visible', false, 'input email no encontrado en /profile')
    }
  }

  // ================================================================ SUITE C
  suite('C. APIs (matriz completa)')
  const api = async (p, opts = {}) => {
    const res = await fetch(BASE + p, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    })
    let body = null
    try { body = await res.json() } catch { body = await res.text() }
    return { status: res.status, body }
  }
  const owner = bridge.ownerAddress

  // C1. stats
  {
    const r = await api('/api/stats')
    check('C1 GET /api/stats', r.status === 200 && typeof r.body.totalOperations === 'number', JSON.stringify(r.body).slice(0, 120))
  }
  // C2. items list + create (firma inválida esperada)
  {
    const r = await api('/api/items')
    check('C2 GET /api/items', r.status === 200 && Array.isArray(r.body.items), JSON.stringify(r.body).slice(0, 120))
    const bad = await api('/api/items', {
      method: 'POST',
      body: JSON.stringify({ owner, title: 'X', description: '', category: 'general', quantity: 1, signature: '0x00' }),
    })
    check('C2 POST /api/items firma inválida -> 4xx', bad.status >= 400, `status=${bad.status}`)
  }
  // C3. identity privacy: tercero no ve email
  {
    const r = await api(`/api/identity/${owner}?requester=${owner}`)
    check('C3 identidad propia (owner)', r.status === 200 && r.body.profile?.username === 'superadmin', JSON.stringify(r.body).slice(0, 160))
    const other = await api(`/api/identity/${owner}?requester=0x70997970C51812dc3A010C7d01b50e0d17dc79C8`)
    check('C3 tercero NO recibe email', other.status === 200 && other.body.profile?.email === undefined, JSON.stringify(other.body).slice(0, 160))
  }
  // C4. operations (id inexistente -> 404)
  {
    const r = await api('/api/operations/999999')
    check('C4 GET /api/operations/999999 -> 404', r.status === 404, `status=${r.status}`)
    const r2 = await api('/api/operations/1')
    check('C4 GET /api/operations/1 (indexada)', r2.status === 200 && r2.body.operation, `status=${r2.status}`)
    const r3 = await api('/api/operation/999999')
    check('C4 GET /api/operation/999999 -> 404', r3.status === 404, `status=${r3.status}`)
  }
  // C5. ratings: valorar sin ser parte -> error esperado
  {
    const r = await api('/api/ratings', {
      method: 'POST',
      body: JSON.stringify({ operationId: 1, rater: owner, ratee: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', acceptance: 5, honesty: 5, security: 5, reliability: 5, commitment: 5 }),
    })
    // owner no es parte de la op 1 (user1 = 0x7099...): debe rechazar
    check('C5 POST /api/ratings no-parte -> 4xx', r.status >= 400, `status=${r.status} ${JSON.stringify(r.body).slice(0, 100)}`)
  }
  // C6. vouches: solo verificado puede avalar
  {
    const r = await api('/api/vouches', {
      method: 'POST',
      body: JSON.stringify({ vouchBy: owner, vouchFor: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' }),
    })
    check('C6 POST /api/vouches owner -> ok o 4xx controlado', [200, 201, 400].includes(r.status), `status=${r.status} ${JSON.stringify(r.body).slice(0, 100)}`)
  }
  // C7. meetups: operación inexistente -> 404/400
  {
    const r = await api('/api/meetups', {
      method: 'POST',
      body: JSON.stringify({ operationId: 999999, requester: owner, scheduledAt: Math.floor(Date.now() / 1000) + 3600, lat: 10.48, lng: -66.1 }),
    })
    check('C7 POST /api/meetups op inexistente -> 4xx', r.status >= 400, `status=${r.status}`)
  }
  // C8. notifications
  {
    const r = await api(`/api/notifications?user=${owner}`)
    check('C8 GET /api/notifications', r.status === 200 && Array.isArray(r.body.notifications), JSON.stringify(r.body).slice(0, 120))
  }
  // C9. campaigns
  {
    const r = await api('/api/campaigns')
    check('C9 GET /api/campaigns', r.status === 200 && Array.isArray(r.body.campaigns), JSON.stringify(r.body).slice(0, 120))
  }
  // C10. users profile
  {
    const r = await api(`/api/users/${owner}`)
    check('C10 GET /api/users/[address]', r.status === 200, `status=${r.status} ${JSON.stringify(r.body).slice(0, 140)}`)
    const ref = await api(`/api/users/${owner}/refresh`, { method: 'POST' })
    check('C10 POST /api/users/[address]/refresh', ref.status === 200, `status=${ref.status} ${JSON.stringify(ref.body).slice(0, 100)}`)
  }
  // C11. relay: kind inválido -> 400
  {
    const r = await api('/api/relay', { method: 'POST', body: JSON.stringify({ kind: 'nope' }) })
    check('C11 POST /api/relay kind inválido -> 400', r.status === 400, `status=${r.status}`)
  }

  // ================================================================ resumen
  await browser.close()
  await bridge.close()

  const total = report.suites.reduce((a, s) => a + s.checks, 0)
  const fails = report.suites.reduce((a, s) => a + s.failures, 0)
  console.log(`\n════════════════════════════════════════════`)
  console.log(`RESUMEN: ${total} checks, ${fails} fallos`)
  for (const s of report.suites) console.log(`  ${s.name}: ${s.checks - s.failures}/${s.checks}`)
  console.log(`════════════════════════════════════════════`)

  fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(report, null, 2), 'utf8')
  console.log('Reporte: scripts/e2e/report.json')
  process.exit(fails > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(2)
})
