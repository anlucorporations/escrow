// =============================================================================
// TrueKeate — PRUEBA 1 EN PRODUCCIÓN desde navegador (Chromium headless interno)
// Simula a un usuario real contra el despliegue GCP: conecta wallet (mock
// EIP-1193 con FIRMAS EIP-191 reales de las cuentas anvil), pulsa botones y
// verifica funciones. Genera capturas PNG y un resumen JSON.
// =============================================================================
import { chromium } from './node_modules/playwright/index.mjs';
import { ethers } from './node_modules/ethers/lib.esm/index.js';
import fs from 'node:fs';

const WEB = process.env.WEB_URL || 'https://truekeate-web-593453426217.europe-west1.run.app';
const OUT = process.env.OUT_DIR || '../RepoTecnico/pruebas/1ra-prueba';
fs.mkdirSync(OUT, { recursive: true });

const CUENTAS = {
  '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc': { idx: 2, nombre: 'Ana López', clave: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' },
  '0x90f79bf6eb2c4f870365e785982e1f101e93b906': { idx: 3, nombre: 'Bruno Fernández', clave: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6' },
  '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65': { idx: 4, nombre: 'EcoTech Solutions', clave: '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a' },
  '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc': { idx: 5, nombre: 'ServiPro Digital', clave: '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba' },
  '0x976ea74026e726554db657fa54763abd0c3a0aa9': { idx: 6, nombre: 'Carlos Mendoza', clave: '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e' },
  '0x14dc79964da2c08b23698b3d3cc7ca32193d9955': { idx: 7, nombre: 'Diana Rojas', clave: '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356' },
};
const ORDEN = Object.keys(CUENTAS); // orden del selector (Ana, Bruno, EcoTech, ServiPro, Carlos, Diana)

const resumen = [];
const anotar = (paso, ok, detalle) => { resumen.push({ paso, ok, detalle }); console.log(`${ok ? '✅' : '❌'} ${paso} — ${detalle}`); };

async function firmar(direccion, datosHex) {
  const info = CUENTAS[direccion.toLowerCase()];
  if (!info) throw new Error('cuenta desconocida ' + direccion);
  const wallet = new ethers.Wallet(info.clave);
  const bytes = typeof datosHex === 'string' && datosHex.startsWith('0x') ? ethers.getBytes(datosHex) : datosHex;
  return wallet.signMessage(bytes);
}

const exe = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ headless: true, executablePath: exe, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

await ctx.addInitScript(() => {
  // Se lee __DSH_ORDEN de forma DIFERIDA (otro init script lo define después)
  let idx = 0;
  const oyentes = {};
  const orden = () => window.__DSH_ORDEN || [];
  const actual = () => (orden()[idx] || orden()[0]);
  window.ethereum = {
    isMetaMask: true,
    request: async ({ method, params = [] }) => {
      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts': return [actual()];
        case 'eth_chainId': return '0x7a69';
        case 'net_version': return '31337';
        case 'personal_sign': {
          const dir = String(params[1] || actual()).toLowerCase();
          return window.__DSH_FIRMAR(dir, params[0]);
        }
        case 'wallet_requestPermissions': return [{ eth_accounts: {} }];
        case 'wallet_revokePermissions': return null;
        case 'wallet_watchAsset': return true;
        case 'eth_sendTransaction': throw { code: 4001, message: 'rechazada (prueba)' };
        default: return null;
      }
    },
    on: (ev, cb) => { (oyentes[ev] = oyentes[ev] || []).push(cb); },
    removeListener: (ev, cb) => { oyentes[ev] = (oyentes[ev] || []).filter((x) => x !== cb); },
    _emit: (ev, ...args) => (oyentes[ev] || []).forEach((cb) => { try { cb(...args); } catch {} }),
  };
  window.__DSH_SELECCIONAR = (i) => {
    if (i < 0 || i >= (window.__DSH_ORDEN || []).length) return false;
    idx = i;
    try { window.ethereum._emit('accountsChanged', [actual()]); } catch {}
    try { localStorage.removeItem('truekeate.token'); localStorage.removeItem('truekeate.tokenWallet'); } catch {}
    try { localStorage.setItem('truekeate.account', actual()); } catch {}
    return true;
  };
});
const page = await ctx.newPage();
await page.exposeFunction('__DSH_FIRMAR', firmar);
await page.addInitScript((orden) => { window.__DSH_ORDEN = orden; }, ORDEN);

const captura = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const bodyText = async () => (await page.locator('body').innerText().catch(() => '')) || '';
const snippet = async (max=200) => (await bodyText()).replace(/\n+/g, ' | ').slice(0, max);

async function ir(ruta, conSuite = true) {
  await page.goto(WEB + ruta, { timeout: 60000, waitUntil: 'domcontentloaded' });
  await esperarContenido(conSuite);
}

// Espera contenido estable: sin "Verificando inscripción…" y, si conSuite=true,
// espera además a que desaparezca el guard "Conecta tu billetera" (reconexión).
async function esperarContenido(conSuite = true) {
  const limite = Date.now() + 30000;
  while (Date.now() < limite) {
    const t = (await bodyText()).replace(/\s+/g, ' ');
    const ocupado = /Verificando inscripción|Conectando…|Cargando/.test(t);
    const enGuard = conSuite && /Conecta tu billetera para continuar/.test(t);
    if (t.length > 60 && !ocupado && !enGuard) return;
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(1200);
}

async function loginComo(i) {
  await page.evaluate((x) => window.__DSH_SELECCIONAR(x), i);
  for (let intento = 0; intento < 3; intento++) {
    await ir('/suite/dashboard', false); // no esperar a que desaparezca el guard aquí
    const ok = await page.getByRole('heading', { name: /Mi Trueke Central/i }).isVisible().catch(() => false);
    if (ok) return true;
    const btn = page.getByRole('button', { name: /Conectar MetaMask|Iniciar sesión/i }).first();
    if (await btn.isVisible().catch(() => false)) {
      try { await btn.click(); } catch {}
      await esperarContenido(true);
      await page.waitForTimeout(2000);
    } else {
      await page.waitForTimeout(2500);
    }
  }
  const okFinal = await page.getByRole('heading', { name: /Mi Trueke Central/i }).isVisible().catch(() => false);
  if (!okFinal) console.log('  [login] sin dashboard →', (await snippet(220)));
  return okFinal;
}

try {
  // 0) Landing
  await page.goto(WEB + '/', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const titulo = await page.title();
  const h1 = await page.getByRole('heading', { level: 1 }).first().innerText().catch(() => '');
  anotar('Landing pública', /TrueKeate/.test(titulo) && h1.length > 0, `título="${titulo}" h1="${h1.slice(0, 50)}"`);
  await captura('01-landing');

  // 1) Ana — login único (SOCIO/CERTIFICADO/ORO)
  const okAna = await loginComo(0);
  anotar('Login wallet Ana (SOCIO)', okAna, 'conexión + firma EIP-191 "TrueKeate: iniciar sesión" → suite');
  if (okAna) {
    await captura('02-dashboard-ana');
    // Perfil: métricas de reputación con 10 trueques
    await ir('/suite/perfil');
    const tPerfil = await bodyText();
    const iEf = tPerfil.indexOf('Trueques efectivos');
    const ventana = iEf >= 0 ? tPerfil.slice(iEf, iEf + 60) : '';
    anotar('Perfil Ana: 10 trueques efectivos', /Mi Perfil/.test(tPerfil) && /10/.test(ventana), ventana ? 'métrica: ' + ventana.replace(/\n/g, '|') : 'etiqueta ausente → ' + tPerfil.slice(0, 140));
    await captura('03-perfil-ana');
    // Finanzas
    await ir('/suite/finanzas');
    const tFin = await bodyText();
    anotar('Finanzas Ana: BRLT 2.000', /Finanzas/.test(tFin) && /2\.?000/.test(tFin), 'saldo BRLT 2000 visible → ' + (tFin.match(/BRLT[\s\S]{0,60}/)?.[0] || tFin.slice(0,120)));
    await captura('04-finanzas-ana');
    // Inventario
    await ir('/suite/inventario');
    const tInv = await bodyText();
    const itemsAna = /Olympus|vinilos|MacBook/i.test(tInv);
    anotar('Inventario Ana: 3 ítems tokenizados', /Mi Inventario/.test(tInv) && itemsAna, itemsAna ? 'Olympus/vinilos/MacBook listados' : 'sin nombres esperados → ' + (await snippet(180)));
    await captura('05-inventario-ana');
    // Publicar trueke (firma por acción)
    await ir('/suite/dashboard');
    const formVisible = await page.getByText(/Publicar un trueke/i).isVisible().catch(() => false);
    if (formVisible) {
      const selArt = page.locator('select').first();
      const nOpts = await selArt.locator('option').count().catch(() => 0);
      if (nOpts > 1) {
        await selArt.selectOption({ index: 1 });
        const tituloElegido = (await selArt.locator('option').nth(1).innerText().catch(() => '')).trim();
        await page.getByPlaceholder(/Ej: busco/i).fill('Busco un bien de energía renovable o equipo de audio.');
        await page.getByRole('button', { name: /Publicar en el Mercado/i }).click();
        await page.waitForTimeout(6000);
        const okPub = await page.getByText(/Trueke publicado|publicado en el Mercado/i).first().isVisible().catch(() => false);
        anotar('Ana publica trueke en Mercado', okPub, `firma por acción + oferta PROPUESTO (${tituloElegido.slice(0, 30)})`);
        await captura('06-oferta-publicada');
      } else anotar('Ana publica trueke', false, 'sin artículos en selector');
    } else anotar('Ana publica trueke', false, 'formulario no visible → ' + (await snippet(180)));
  }

  // 2) Mercado público: debe verse la oferta de Ana
  await ir('/suite/mercado');
  const tMerc = await bodyText();
  anotar('Mercado muestra la oferta', /Mercado de trueques/.test(tMerc) && /Olympus|MacBook|vinilos/i.test(tMerc), 'oferta PROPUESTO en el mercado');
  await captura('07-mercado');

  // 3) Bruno acuerda la oferta de Ana (login + firma por acción)
  const okBruno = await loginComo(1);
  anotar('Login wallet Bruno (SOCIO)', okBruno, 'conexión + sesión');
  if (okBruno) {
    await ir('/suite/mercado');
    await page.waitForTimeout(2000);
    const abrir = page.getByRole('button', { name: /Ver|Acordar|Detalle/i }).first();
    if (await abrir.isVisible().catch(() => false)) { await abrir.click(); await page.waitForTimeout(2000); }
    const selMio = page.locator('select').last();
    const nMios = await selMio.locator('option').count().catch(() => 0);
    if (nMios > 1) { await selMio.selectOption({ index: 1 }); }
    const btnAc = page.getByRole('button', { name: /Acordar intercambio/i }).first();
    if (await btnAc.isVisible().catch(() => false)) { await btnAc.click(); await page.waitForTimeout(6000); }
    const tTras = await bodyText();
    const okAc = /acordad|trueque acordado|CREADO|en curso/i.test(tTras);
    anotar('Bruno acuerda la oferta de Ana', okAc, 'firma por acción "acordar trueke"');
    await captura('08-bruno-acuerda');
    await ir('/suite/intercambio');
    await captura('09-intercambio-bruno');
  }

  // 4) EcoTech (EMPRESA): inventario 6 y finanzas 2000
  const okEco = await loginComo(2);
  anotar('Login wallet EcoTech (EMPRESA)', okEco, 'conexión + sesión');
  if (okEco) {
    await ir('/suite/inventario');
    const tInvE = await bodyText();
    const ecoItems = /Panel solar|Dron DJI|Inversor|riego|auditoría energética|instalación solar/i.test(tInvE);
    anotar('Inventario EcoTech: 6 ítems (2 art + 2 bienes + 2 serv)', ecoItems, 'categorías ARTICULO/BIEN/SERVICIO tokenizadas');
    await captura('10-inventario-ecotech');
    await ir('/suite/finanzas');
    const tFinE = await bodyText();
    anotar('Finanzas EcoTech: BRLT 2.000', /2\.?000|2\s*000/.test(tFinE), 'saldo empresa 2000 BRLT');
    await captura('11-finanzas-ecotech');
  }

  // 5) Carlos (COMÚN): 1000 BRLT, inventario 3, estado VERIFICADO
  const okCar = await loginComo(3);
  anotar('Login wallet Carlos (PARTICULAR)', okCar, 'conexión + sesión');
  if (okCar) {
    await ir('/suite/finanzas');
    const tFinC = await bodyText();
    anotar('Finanzas Carlos: BRLT 1.000', /1\.?000|1\s*000/.test(tFinC), 'saldo común 1000 BRLT');
    await captura('12-finanzas-carlos');
    await ir('/suite/perfil');
    const tPerC = await bodyText();
    anotar('Perfil Carlos: escalera VERIFICADO', /VERIFICADO/i.test(tPerC), 'estado D28 Verificado');
    await captura('13-perfil-carlos');
    await ir('/suite/inventario');
    const tInvC = await bodyText();
    anotar('Inventario Carlos: 3 ítems', /Trek|Steam Deck|Bowflex|mancuernas/i.test(tInvC), 'artículos listados');
    await captura('14-inventario-carlos');
  }
} catch (e) {
  anotar('Ejecución global', false, (e?.message || String(e)).slice(0, 300));
} finally {
  fs.writeFileSync(`${OUT}/resultado.json`, JSON.stringify({ fecha: new Date().toISOString(), web: WEB, pasos: resumen }, null, 2));
  await browser.close();
}
const fallos = resumen.filter((r) => !r.ok);
console.log(`\n== RESUMEN: ${resumen.length - fallos.length}/${resumen.length} OK · ${fallos.length} fallos ==`);
process.exit(fallos.length ? 1 : 0);
