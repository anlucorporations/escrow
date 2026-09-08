import { chromium } from './node_modules/playwright/index.mjs';
import { ethers } from './node_modules/ethers/lib.esm/index.js';
import fs from 'node:fs';
const WEB = 'https://truekeate-web-593453426217.europe-west1.run.app';
const OUT = '../RepoTecnico/pruebas/1ra-prueba';
const CUENTAS = {
  '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc': { nom: 'Ana', clave: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' },
  '0x90f79bf6eb2c4f870365e785982e1f101e93b906': { nom: 'Bruno', clave: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6' },
};
const ORDEN = Object.keys(CUENTAS);
const res = [];
const anotar = (p, ok, d) => { res.push({ paso: p, ok, detalle: d }); console.log(`${ok ? '✅' : '❌'} ${p} — ${d}`); };
const exe = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ headless: true, executablePath: exe, args: ['--no-sandbox', '--disable-gpu'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
  let idx = 0; const oy = {};
  const ord = () => window.__ORD || [];
  const act = () => ord()[idx] || ord()[0];
  window.ethereum = { isMetaMask: true, request: async ({ method, params = [] }) => {
    if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [act()];
    if (method === 'eth_chainId') return '0x7a69';
    if (method === 'net_version') return '31337';
    if (method === 'personal_sign') return window.__F(String(params[1] || act()).toLowerCase(), params[0]);
    if (method === 'wallet_requestPermissions') return [{}];
    if (method === 'wallet_revokePermissions') return null;
    return null;
  }, on: (e, c) => { (oy[e] = oy[e] || []).push(c); }, removeListener: (e, c) => { oy[e] = (oy[e] || []).filter((x) => x !== c); } };
  window.__SEL = (i) => { if (i < ord().length) { idx = i; return true; } return false; };
});
const page = await ctx.newPage();
await page.exposeFunction('__F', async (dir, hex) => {
  const w = new ethers.Wallet(CUENTAS[dir].clave);
  return w.signMessage(hex.startsWith('0x') ? ethers.getBytes(hex) : hex);
});
await page.addInitScript((o) => { window.__ORD = o; }, ORDEN);
page.on('response', async (r) => {
  if (r.url().includes('/truekes/') && r.request().method() === 'POST') {
    let b = ''; try { b = (await r.text()).slice(0, 150); } catch {}
    console.log('[POST]', r.status(), r.url().split('run.app')[1].slice(0, 45), b.replace(/\n/g, '').slice(0, 130));
  }
});
const txt = async () => (await page.locator('body').innerText().catch(() => '')) || '';
const esperar = async (re, ms = 25000) => { const lim = Date.now() + ms; while (Date.now() < lim) { if (re.test((await txt()).replace(/\s+/g, ' '))) return true; await page.waitForTimeout(600); } return false; };
const captura = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const ir = async (r) => { await page.goto(WEB + r, { timeout: 60000, waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1800); };
// Si aparece el intersticial "Iniciar sesión (una firma)" → clic (usuario real)
const confirmarSesion = async () => {
  for (let k = 0; k < 6; k++) {
    const b = page.getByRole('button', { name: /Iniciar sesión \(una firma\)/ }).first();
    if (await b.isVisible().catch(() => false)) { await b.click(); await page.waitForTimeout(4000); }
    const t = (await txt()).replace(/\s+/g, ' ');
    if (!/Iniciar sesión \(una firma\)/.test(t)) return true;
    await page.waitForTimeout(1200);
  }
  return false;
};
async function login(i) {
  await page.evaluate((x) => window.__SEL(x), i);
  await ir('/suite/dashboard');
  if (await esperar(/Mi Trueke Central/, 8000)) { await confirmarSesion(); return true; }
  const b = page.getByRole('button', { name: /Conectar MetaMask/i }).first();
  if (await b.isVisible().catch(() => false)) { await b.click(); await esperar(/Mi Trueke Central/, 25000); await confirmarSesion(); return true; }
  return false;
}
try {
  // 1) Ana: mercado muestra su oferta
  await login(0);
  await ir('/suite/mercado');
  await confirmarSesion();
  const ofertaOk = await esperar(/MacBook Pro 14/, 20000);
  anotar('Mercado: oferta de Ana (MacBook) visible', ofertaOk, 'botón Conectar+Login ya usado; listado PROPUESTO');
  await captura('07-mercado-oferta');

  // 2) Ana: perfil con reputación cargada
  await ir('/suite/perfil');
  await confirmarSesion();
  const calc = await esperar(/Calculando tu reputación/, 12000);
  if (calc) { await esperar((s) => !s.includes('Calculando tu reputación'), 40000); }
  await page.waitForTimeout(2000);
  const tP = await txt();
  const iEf = tP.indexOf('Trueques efectivos');
  const vent = iEf >= 0 ? tP.slice(iEf, iEf + 40).replace(/\n/g, '') : '';
  anotar('Perfil Ana: reputación con 10 trueques', iEf >= 0 && /10/.test(vent), vent || 'sin etiqueta → ' + tP.slice(400, 900).replace(/\n/g, ' | '));
  await captura('03-perfil-ana');

  // 3) Bruno acuerda
  await login(1);
  await ir('/suite/mercado');
  await confirmarSesion();
  const card = page.getByText(/MacBook Pro 14/).first();
  if (await card.isVisible().catch(() => false)) { await card.click().catch(() => {}); await page.waitForTimeout(1800); }
  const sel = page.locator('select').last();
  let n = await sel.locator('option').count().catch(() => 0);
  const lo = Date.now() + 15000;
  while (n <= 1 && Date.now() < lo) { await page.waitForTimeout(700); n = await sel.locator('option').count().catch(() => 0); }
  if (n > 1) await sel.selectOption({ index: 1 });
  const btnAc = page.getByRole('button', { name: /Acordar intercambio/i }).first();
  if (await btnAc.isVisible().catch(() => false)) { await btnAc.click(); }
  const okAc = await esperar(/acordad|Trueke acordado|en curso/, 25000);
  anotar('Bruno acuerda la oferta de Ana', okAc, 'firma por acción "acordar trueke"');
  await captura('08-bruno-acuerda');
  await ir('/suite/intercambio');
  await confirmarSesion();
  await esperar(/Intercambio|Activos|Trueques/, 15000);
  const tInt = await txt();
  anotar('Intercambio Bruno: trueque en curso visible', /MacBook|en curso|ACTIVO|CREADO|Acordad/i.test(tInt), 'historial/activos');
  await captura('09-intercambio-bruno');
} catch (e) {
  anotar('Cierre', false, (e?.message || String(e)).slice(0, 250));
} finally {
  fs.writeFileSync(`${OUT}/cierre-flujo.json`, JSON.stringify({ fecha: new Date().toISOString(), pasos: res }, null, 2));
  await browser.close();
}
const f = res.filter((r) => !r.ok);
console.log(`\n== CIERRE: ${res.length - f.length}/${res.length} OK ==`);
process.exit(f.length ? 1 : 0);
