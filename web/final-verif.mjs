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
  let idx = 0; const oy = {};
  const ord = () => window.__ORD || [];
  const act = () => (ord()[idx] || ord()[0]);
  window.ethereum = { isMetaMask: true,
    request: async ({ method, params = [] }) => {
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [act()];
      if (method === 'eth_chainId') return '0x7a69';
      if (method === 'net_version') return '31337';
      if (method === 'personal_sign') return window.__F(String(params[1] || act()).toLowerCase(), params[0]);
      if (method === 'wallet_requestPermissions') return [{}];
      if (method === 'wallet_revokePermissions') return null;
      return null;
    },
    on: (e, c) => { (oy[e] = oy[e] || []).push(c); }, removeListener: (e, c) => { oy[e] = (oy[e] || []).filter((x) => x !== c); } };
  window.__SEL = (i) => { if (i >= 0 && i < (window.__ORD || []).length) { idx = i; return true; } return false; };
});
const page = await ctx.newPage();
await page.exposeFunction('__F', async (dir, hex) => {
  const w = new ethers.Wallet(CUENTAS[dir]);
  return w.signMessage(hex.startsWith('0x') ? ethers.getBytes(hex) : hex);
});
await page.addInitScript((o) => { window.__ORD = o; }, ORDEN);
page.on('response', async (r) => {
  if (r.url().includes('/truekes/') && r.request().method() === 'POST' && !r.url().includes('/ofertas?')) {
    let b = ''; try { b = (await r.text()).slice(0, 160); } catch {}
    console.log('[POST]', r.status(), r.url().split('run.app')[1].slice(0, 40), b.replace(/\n/g, ''));
  }
});
const txt = async () => (await page.locator('body').innerText().catch(() => '')) || '';
const esperar = async (re, ms = 25000) => { const lim = Date.now() + ms; while (Date.now() < lim) { if (re.test((await txt()).replace(/\s+/g, ' '))) return true; await page.waitForTimeout(600); } return false; };
const captura = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
async function ir(r) { await page.goto(WEB + r, { timeout: 60000, waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500); }
async function login(i) {
  await page.evaluate((x) => window.__SEL(x), i);
  await ir('/suite/dashboard');
  if (await esperar(/Mi Trueke Central/, 8000)) return true;
  const b = page.getByRole('button', { name: /Conectar MetaMask/i }).first();
  if (await b.isVisible().catch(() => false)) { await b.click(); return await esperar(/Mi Trueke Central/, 25000); }
  return false;
}
try {
  // A) Ana: mercado debe listar su oferta (MacBook, id 92)
  await login(0);
  await ir('/suite/mercado');
  const ofertaOk = await esperar(/MacBook Pro 14/, 20000);
  anotar('Mercado lista la oferta de Ana (MacBook)', ofertaOk, 'GET /truekes/ofertas → PROPUESTO visible');
  await captura('07-mercado-oferta');

  // B) Ana: perfil con reputación (10 trueques efectivos)
  await ir('/suite/perfil');
  if (await esperar(/Calculando tu reputación/, 10000)) await esperar(/Puntaje de confianza|Trueques efectivos/, 25000);
  await page.waitForTimeout(1500);
  const tPerf = await txt();
  const iEf = tPerf.indexOf('Trueques efectivos');
  const vent = iEf >= 0 ? tPerf.slice(iEf, iEf + 40).replace(/\n/g, '') : '(no encontrada)';
  anotar('Perfil Ana: reputación y 10 trueques', iEf >= 0 && /10/.test(vent), 'métrica: ' + vent);
  await captura('03-perfil-ana');

  // C) Bruno: acordar la oferta de Ana
  await login(1);
  await ir('/suite/mercado');
  const card = page.getByText(/MacBook Pro 14/).first();
  if (await card.isVisible().catch(() => false)) { await card.click().catch(() => {}); await page.waitForTimeout(1500); }
  const sel = page.locator('select').last();
  let nOpts = await sel.locator('option').count().catch(() => 0);
  const limO = Date.now() + 15000;
  while (nOpts <= 1 && Date.now() < limO) { await page.waitForTimeout(700); nOpts = await sel.locator('option').count().catch(() => 0); }
  if (nOpts > 1) await sel.selectOption({ index: 1 });
  const btnAc = page.getByRole('button', { name: /Acordar intercambio/i }).first();
  if (await btnAc.isVisible().catch(() => false)) { await btnAc.click(); }
  const okAc = await esperar(/acordad|Trueke acordado|estado CREADO|en curso|Acordado/, 25000);
  anotar('Bruno acuerda oferta de Ana', okAc, 'POST /truekes/:id/acordar con firma por acción');
  await captura('08-bruno-acuerda');
  await ir('/suite/intercambio');
  const tInt = await txt();
  anotar('Intercambio Bruno (trueque en curso)', /MacBook|en curso|ACTIVO|CREADO/i.test(tInt), 'historial/activos visible');
  await captura('09-intercambio-bruno');
} catch (e) {
  anotar('Verificación', false, (e?.message || String(e)).slice(0, 250));
} finally {
  fs.writeFileSync(`${OUT}/verificacion-final.json`, JSON.stringify({ fecha: new Date().toISOString(), pasos: resumen }, null, 2));
  await browser.close();
}
const f = resumen.filter((r) => !r.ok);
console.log(`\n== VERIFICACIÓN FINAL: ${resumen.length - f.length}/${resumen.length} OK ==`);
process.exit(f.length ? 1 : 0);
