import { chromium } from './node_modules/playwright/index.mjs';
import { ethers } from './node_modules/ethers/lib.esm/index.js';
const WEB = 'https://truekeate-web-593453426217.europe-west1.run.app';
const OUT = '../RepoTecnico/pruebas/1ra-prueba';
const DIANA = { dir: '0x14dc79964da2c08b23698b3d3cc7ca32193d9955', clave: '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356' };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const exe = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
const res = [];
const anotar = (p, ok, d) => { res.push({ p, ok, d }); console.log(`${ok ? 'PASS' : 'FAIL'} ${p} — ${d}`); };
const browser = await chromium.launch({ headless: true, executablePath: exe, args: ['--no-sandbox', '--disable-gpu'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript((d) => {
  window.ethereum = { isMetaMask: true, request: async ({ method, params = [] }) => {
    if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [d];
    if (method === 'eth_chainId') return '0x7a69';
    if (method === 'net_version') return '31337';
    if (method === 'personal_sign') return window.__F(params[0]);
    if (method === 'wallet_requestPermissions') return [{}];
    return null;
  }, on: () => {}, removeListener: () => {} };
}, DIANA.dir);
const page = await ctx.newPage();
await page.exposeFunction('__F', async (hex) => new ethers.Wallet(DIANA.clave).signMessage(hex.startsWith('0x') ? ethers.getBytes(hex) : hex));
const txt = () => page.locator('body').innerText().catch(() => '');
const esperar = async (re, ms = 50000) => { const lim=Date.now()+ms; while (Date.now()<lim){ if (re.test((await txt()).replace(/\s+/g,' '))) return true; await page.waitForTimeout(700);} return false; };
const confirmar = async () => { for (let k=0;k<8;k++){ const b = page.getByRole('button',{name:/Iniciar sesión \(una firma\)/}).first(); if (await b.isVisible().catch(()=>false)){ await b.click(); await page.waitForTimeout(4000);} const t=(await txt()).replace(/\s+/g,' '); if (!/Iniciar sesión \(una firma\)/.test(t)) return true; await page.waitForTimeout(1000);} return false; };
try {
  await page.goto(WEB + '/suite/certificacion', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const conectar = page.getByRole('button', { name: /Conectar MetaMask/i }).first();
  if (await conectar.isVisible().catch(() => false)) await conectar.click();
  await confirmar();
  anotar('Formulario sin SBT', await esperar(/No detectamos un SBT/), '');
  await page.locator('#doc-img').setInputFiles({ name: 'dni.png', mimeType: 'image/png', buffer: PNG });
  await page.locator('#selfie-img').setInputFiles({ name: 'selfie.png', mimeType: 'image/png', buffer: PNG });
  const btn = page.getByRole('button', { name: /Enviar KYC \(DNI \+ selfie\)/ });
  anotar('Botón habilitado con previews', await btn.isEnabled().catch(()=>false), '');
  await btn.click();
  anotar('Éxito "KYC enviado" (PENDIENTE)', await esperar(/KYC enviado/, 60000), 'subida real de imágenes OK');
  await page.screenshot({ path: `${OUT}/owner-04-upload-ok.png` }).catch(()=>{});
} catch (e) { anotar('UI upload', false, (e?.message||'').slice(0,200)); }
await browser.close();
const f = res.filter(r=>!r.ok);
console.log(`== UI UPLOAD: ${res.length-f.length}/${res.length} OK ==`);
process.exit(f.length?1:0);
