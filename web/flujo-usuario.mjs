// Flujo de usuario crítico: publicar oferta (Ana) → ver en Mercado → acordar (Bruno)
import { chromium } from './node_modules/playwright/index.mjs';
import { ethers } from './node_modules/ethers/lib.esm/index.js';
import fs from 'node:fs';
const WEB = 'https://truekeate-web-593453426217.europe-west1.run.app';
const OUT = '../RepoTecnico/pruebas/1ra-prueba';
const CUENTAS = {
  '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc': '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  '0x90f79bf6eb2c4f870365e785982e1f101e93b906': '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
};
const ORDEN = Object.keys(CUENTAS);
const resumen = [];
const anotar = (p, ok, d) => { resumen.push({ paso: p, ok, detalle: d }); console.log(`${ok ? '✅' : '❌'} ${p} — ${d}`); };
const exe = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ headless: true, executablePath: exe, args: ['--no-sandbox', '--disable-gpu'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
  let idx = 0;
  const oy = {};
  const ord = () => window.__ORD || [];
  const act = () => (ord()[idx] || ord()[0]);
  window.ethereum = {
    isMetaMask: true,
    request: async ({ method, params = [] }) => {
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [act()];
      if (method === 'eth_chainId') return '0x7a69';
      if (method === 'net_version') return '31337';
      if (method === 'personal_sign') return window.__F(String(params[1] || act()).toLowerCase(), params[0]);
      if (method === 'wallet_requestPermissions') return [{}];
      if (method === 'wallet_revokePermissions') return null;
      return null;
    },
    on: (e, c) => { (oy[e] = oy[e] || []).push(c); },
    removeListener: (e, c) => { oy[e] = (oy[e] || []).filter((x) => x !== c); },
  };
  window.__SEL = (i) => { if (i >= 0 && i < (window.__ORD || []).length) { idx = i; return true; } return false; };
});
const page = await ctx.newPage();
page.on('response', async (r) => {
  if ((r.url().includes('/truekes/ofertas') || r.url().includes('/truekes/')) && r.request().method() === 'POST') {
    let b = ''; try { b = (await r.text()).slice(0, 200); } catch {}
    console.log('[POST]', r.status(), r.url().split('run.app')[1].slice(0, 40), b.replace(/\n/g, ''));
  }
});
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.exposeFunction('__F', async (dir, hex) => {
  const clave = CUENTAS[dir];
  if (!clave) throw new Error('sin clave ' + dir);
  const w = new ethers.Wallet(clave);
  return w.signMessage(hex.startsWith('0x') ? ethers.getBytes(hex) : hex);
});
await page.addInitScript((o) => { window.__ORD = o; }, ORDEN);
const txt = async () => (await page.locator('body').innerText().catch(() => '')) || '';
const esperar = async (re, ms = 30000) => { const lim = Date.now() + ms; while (Date.now() < lim) { if (re.test((await txt()).replace(/\s+/g, ' '))) return true; await page.waitForTimeout(600); } return false; };
const captura = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
async function ir(r) { await page.goto(WEB + r, { timeout: 60000, waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1800); }
async function login(i) {
  await page.evaluate((x) => window.__SEL(x), i);
  await ir('/suite/dashboard');
  if (await esperar(/Mi Trueke Central/)) return true;
  const b = page.getByRole('button', { name: /Conectar MetaMask/i }).first();
  if (await b.isVisible().catch(() => false)) { await b.click(); return await esperar(/Mi Trueke Central/); }
  return false;
}
try {
  // 1) Ana publica un trueke (oferta abierta)
  const okA = await login(0);
  anotar('Login Ana', okA, 'dashboard suite');
  await esperar(/Cargando tus trueques/).then(async (sigue) => { if (sigue) await esperar(/CERRADOS\s*\d|OFERTADOS\s*\d/); });
  // abrir/confirmar el formulario
  const tituloBtn = page.getByText(/Publicar trueke en el Mercado/).first();
  if (await tituloBtn.isVisible().catch(() => false)) { await tituloBtn.click().catch(() => {}); await page.waitForTimeout(1200); }
  const formVisible = await page.getByText(/Publicar un trueke \(oferta abierta\)/).isVisible().catch(() => false);
  const sel = page.locator('select').first();
  // esperar a que se carguen los artículos del usuario (fetch /catalog)
  let nOpts = await sel.locator('option').count().catch(() => 0);
  const limOpts = Date.now() + 20000;
  while (nOpts <= 1 && Date.now() < limOpts) { await page.waitForTimeout(800); nOpts = await sel.locator('option').count().catch(() => 0); }
  if (formVisible && nOpts > 1) {
    await sel.selectOption({ index: 1 });
    const elegido = (await sel.locator('option').nth(1).innerText().catch(() => '')).trim();
    const ta = page.getByPlaceholder(/Ej: busco/i);
    await ta.fill('Busco un bien de energía renovable o equipo de audio.');
    await page.getByRole('button', { name: /Publicar en el Mercado/i }).click();
    const okPub = await esperar(/Trueke publicado/, 20000);
    anotar('Ana publica oferta', okPub, `"${elegido.slice(0, 34)}" → PROPUESTO (firma por acción)`);
    await captura('06-oferta-publicada');
    await page.waitForTimeout(2000);
    const tMerc = await (async () => { await ir('/suite/mercado'); return txt(); })();
    const ofertaVisible = /Mercado de trueques/.test(tMerc) && /Olympus|MacBook|vinilos/i.test(tMerc);
    anotar('Mercado muestra la oferta de Ana', ofertaVisible, 'consulta pública /truekes/ofertas');
    await captura('07-mercado');
  } else {
    anotar('Ana publica oferta', false, `form=${formVisible} opts=${nOpts}`);
    console.log('  body:', (await txt()).slice(0, 400).replace(/\n+/g, ' | '));
  }
  // 1b) Perfil Ana: reputación con 10 trueques efectivos
  await ir('/suite/perfil');
  await esperar(/Calculando tu reputación/).then(async (v) => { if (v) await esperar(/Puntaje|Trueques efectivos|Reputación/); });
  const tPerf = await txt();
  const iEf = tPerf.indexOf('Trueques efectivos');
  const vent = iEf >= 0 ? tPerf.slice(iEf, iEf + 50) : '';
  anotar('Perfil Ana: reputación 10 trueques', /Mi Perfil/.test(tPerf) && vent.includes('10'), vent.replace(/\n/g, '|') || 'sin métrica');
  await captura('03-perfil-ana');

  // 2) Bruno acuerda
  const okB = await login(1);
  anotar('Login Bruno', okB, 'dashboard suite');
  await ir('/suite/mercado');
  const abrir = page.getByRole('button', { name: /Ver detalle|Acordar|Detalle/i }).first();
  if (await abrir.isVisible().catch(() => false)) { await abrir.click(); await page.waitForTimeout(1500); }
  const selMio = page.locator('select').last();
  const nMios = await selMio.locator('option').count().catch(() => 0);
  if (nMios > 1) await selMio.selectOption({ index: 1 });
  const btnAc = page.getByRole('button', { name: /Acordar intercambio/i }).first();
  if (await btnAc.isVisible().catch(() => false)) { await btnAc.click(); }
  const okAc = await esperar(/acordad|Trueke acordado|CREADO|en curso/i, 25000);
  anotar('Bruno acuerda la oferta de Ana', okAc, 'firma por acción "acordar trueke"');
  await captura('08-bruno-acuerda');
  await ir('/suite/intercambio');
  const tInt = await txt();
  anotar('Intercambio Bruno: historial/activos', /Intercambio|Trueques|activo/i.test(tInt), 'sección consultada');
  await captura('09-intercambio-bruno');
} catch (e) {
  anotar('Flujo', false, (e?.message || String(e)).slice(0, 200));
} finally {
  fs.writeFileSync(`${OUT}/flujo-resultado.json`, JSON.stringify({ fecha: new Date().toISOString(), pasos: resumen }, null, 2));
  await browser.close();
}
const f = resumen.filter((r) => !r.ok);
console.log(`\n== FLUJO: ${resumen.length - f.length}/${resumen.length} OK ==`);
process.exit(f.length ? 1 : 0);
