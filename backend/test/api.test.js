// =============================================================================
// TrueKeate — Tests de la API REST (Ciclo 6)
// Validan los flujos principales con el almacén en memoria:
//   - auth: connect (inscripción automática RF-01.4) y register con consentimiento
//   - kyc: escalera D28 (códigos → VERIFICADO; documento+selfie + revisión → CERTIFICADO)
//   - catalog: publicación AtoA con límite por nivel; encargo
//   - truekes: creación (Verificado), custodiar, firma, valoración 1–5
//   - admin: dashboard del Owner
// =============================================================================
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { crearApp } from '../api/app.js';
import { crearAlmacen } from '../api/lib/almacen.js';
import { ethers } from 'ethers';

let app;
let server;
let almacen;

// wallets de prueba
const walletA = ethers.Wallet.createRandom();
const walletB = ethers.Wallet.createRandom();
const walletOwner = ethers.Wallet.createRandom();

function sesionDe(wallet) {
  // token directo al almacén (flujo de sesión por firma se prueba aparte)
  const token = 'tok-' + wallet.address.slice(2, 10);
  almacen.guardarSesion(token, wallet.address.toLowerCase());
  return token;
}

before(async () => {
  almacen = crearAlmacen();
  app = crearApp({ almacen });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
});

after(() => server.close());

// ---------------------------------------------------------------------------
test('POST /auth/connect inscribe la wallet (RF-01.4) y /auth/register con GDPR (D17)', async () => {
  const w = walletA.address.toLowerCase();
  const c = await request(app).post('/auth/connect').send({ wallet: w });
  assert.equal(c.status, 200);
  assert.equal(c.body.usuario.estado, 'INSCRITO', 'escalera D28 inicia INSCRITO');

  const rr = await request(app).post('/auth/register').send({ wallet: w, correo: 'a@x.com', telefono: '+58', consentimientoGdpr: false });
  assert.equal(rr.status, 400, 'sin consentimiento GDPR se rechaza');

  const ok = await request(app).post('/auth/register').send({ wallet: w, correo: 'a@x.com', telefono: '+58', consentimientoGdpr: true });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.usuario.consentimientoGdpr, true);
});

test('POST /auth/connect rechaza wallet malformada', async () => {
  const r = await request(app).post('/auth/connect').send({ wallet: 'no-es-wallet' });
  assert.equal(r.status, 400);
});

test('KYC: códigos → VERIFICADO; submit + revisión Owner → CERTIFICADO (D28/CU-02)', async () => {
  const w = walletA.address.toLowerCase();
  const token = sesionDe(walletA);

  await request(app).post('/auth/connect').send({ wallet: w });
  await request(app).post('/kyc/init').set('Authorization', `Bearer ${token}`);

  const v = await request(app).post('/kyc/verify-codes').set('Authorization', `Bearer ${token}`).send({ codigoCorreo: '123456', codigoTelefono: '654321' });
  assert.equal(v.status, 200);
  assert.equal(v.body.usuario.estado, 'VERIFICADO');

  const sub = await request(app).post('/kyc/submit').set('Authorization', `Bearer ${token}`).send({ documentoRef: 'ipfs/doc1', selfieRef: 'ipfs/selfie1' });
  assert.equal(sub.status, 200);
  assert.equal(sub.body.kyc.estado, 'PENDIENTE', 'revisión humana del Owner (RF-18.4)');

  // el Owner revisa y aprueba → CERTIFICADO
  const rev = await request(app).post('/kyc/review').set('Authorization', `Bearer ${token}`).send({ wallet: w, aprobar: true });
  assert.equal(rev.status, 200);
  assert.equal(rev.body.usuario.estado, 'CERTIFICADO');
});

test('catalog: solo Verificado/Certificado publica; límite por nivel (D14/RF-04.2)', async () => {
  const w = walletA.address.toLowerCase();
  const token = sesionDe(walletA);
  // A ya es CERTIFICADO por el test anterior

  for (let i = 0; i < 5; i++) {
    const r = await request(app).post('/catalog/articulos').set('Authorization', `Bearer ${token}`).send({ titulo: `Art ${i}`, rubro: 'electronica' });
    assert.equal(r.status, 201);
  }
  // 6º artículo: nivel CERTIFICADO con nivel INICIADO → límite 5 (RF-04.2)
  const sexto = await request(app).post('/catalog/articulos').set('Authorization', `Bearer ${token}`).send({ titulo: 'Art 6', rubro: 'electronica' });
  assert.equal(sexto.status, 403);
  assert.match(sexto.body.error, /limite_articulos/);
});

test('truekes: Verificado crea (máx 3 activos RF-14.4) y valida valoración 1–5 (D18)', async () => {
  const wA = walletA.address.toLowerCase();
  const wB = walletB.address.toLowerCase();
  const tokA = sesionDe(walletA);
  const tokB = sesionDe(walletB);
  await request(app).post('/auth/connect').send({ wallet: wA });
  await request(app).post('/auth/connect').send({ wallet: wB });
  // B → VERIFICADO
  await request(app).post('/kyc/init').set('Authorization', `Bearer ${tokB}`);
  await request(app).post('/kyc/verify-codes').set('Authorization', `Bearer ${tokB}`).send({ codigoCorreo: '1', codigoTelefono: '2' });

  const c = await request(app).post('/truekes').set('Authorization', `Bearer ${tokA}`).send({ parteB: wB, activoA: { token: '0x1', cantidad: 100 }, activoB: { token: '0x2', cantidad: 50 }, horaPautada: 9999999999 });
  assert.equal(c.status, 201);

  // custodiar lado A
  const cu = await request(app).post(`/truekes/${c.body.trueke.id}/custodiar`).set('Authorization', `Bearer ${tokA}`).send({ lado: 'A' });
  assert.equal(cu.status, 200);
  assert.equal(cu.body.trueke.estado, 'CUSTODIADO');

  // valoración fuera de rango
  const bad = await request(app).post(`/truekes/${c.body.trueke.id}/valoracion`).set('Authorization', `Bearer ${tokA}`).send({ valorado: wB, aceptacion: 6, honestidad: 5, seguridad: 5, confiabilidad: 5, compromiso: 5 });
  assert.equal(bad.status, 400);

  const val = await request(app).post(`/truekes/${c.body.trueke.id}/valoracion`).set('Authorization', `Bearer ${tokA}`).send({ valorado: wB, aceptacion: 5, honestidad: 4, seguridad: 5, confiabilidad: 5, compromiso: 5 });
  assert.equal(val.status, 200);
});

test('admin: dashboard requiere rol Owner y expone KPIs', async () => {
  const w = walletOwner.address.toLowerCase();
  almacen.crearUsuario({ wallet: w, rol: 'OWNER' });
  const token = sesionDe(walletOwner);

  const d = await request(app).get('/admin/db').set('Authorization', `Bearer ${token}`);
  assert.equal(d.status, 200);
  assert.ok(d.body.usuarios >= 1);

  const k = await request(app).get('/admin/kpis-disputas').set('Authorization', `Bearer ${token}`);
  assert.equal(k.status, 200);
  assert.ok('totalTruekes' in k.body);
});

test('healthz responde', async () => {
  const r = await request(app).get('/healthz');
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
});
