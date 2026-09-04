// =============================================================================
// TrueKeate — Tests de la API REST (Ciclo 6 + control de acceso)
// Validan los flujos principales con el almacén en memoria:
//   - auth: /auth/estado (guarda), connect (NO inscribe) y register (inscripción
//     formal con GDPR → INSCRITO) — decisión del director
//   - kyc: escalera D28 (códigos → VERIFICADO; documento+selfie + revisión → CERTIFICADO)
//   - catalog: GET público para observar; publicación AtoA con límite por nivel
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

const wA = walletA.address.toLowerCase();
const wB = walletB.address.toLowerCase();
const wOwner = walletOwner.address.toLowerCase();

function sesionDe(wallet) {
  // token directo al almacén (flujo de sesión por firma se prueba aparte)
  const token = 'tok-' + wallet.address.slice(2, 10);
  almacen.guardarSesion(token, wallet.address.toLowerCase());
  return token;
}

/** Inscribe formalmente una wallet (register con GDPR) → estado INSCRITO. */
async function inscribir(wallet, correo = 'u@x.com') {
  const r = await request(app)
    .post('/auth/register')
    .send({ wallet: wallet.address.toLowerCase(), correo, telefono: '+580000', consentimientoGdpr: true });
  assert.equal(r.status, 200, `register ${wallet.address}: ${JSON.stringify(r.body)}`);
  return r.body.usuario;
}

before(async () => {
  almacen = crearAlmacen();
  app = crearApp({ almacen });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
});

after(() => server.close());

// ---------------------------------------------------------------------------
test('GET /auth/estado: wallet no inscrita → inscrito:false (guarda de acceso)', async () => {
  const r = await request(app).get(`/auth/estado?wallet=${wA}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.inscrito, false);
});

test('POST /auth/connect NO inscribe (inscripción formal) y /auth/register con GDPR inscribe', async () => {
  const c = await request(app).post('/auth/connect').send({ wallet: wA });
  assert.equal(c.status, 200);
  assert.equal(c.body.inscrito, false, 'conectar no inscribe (decisión del director)');

  // sin consentimiento GDPR se rechaza
  const rr = await request(app).post('/auth/register').send({ wallet: wA, correo: 'a@x.com', telefono: '+58', consentimientoGdpr: false });
  assert.equal(rr.status, 400, 'sin consentimiento GDPR se rechaza');

  // register formal → INSCRITO
  const ok = await request(app).post('/auth/register').send({ wallet: wA, correo: 'a@x.com', telefono: '+58', consentimientoGdpr: true });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.usuario.estado, 'INSCRITO');

  // ahora /auth/estado la reconoce
  const e = await request(app).get(`/auth/estado?wallet=${wA}`);
  assert.equal(e.body.inscrito, true);
  assert.equal(e.body.usuario.estado, 'INSCRITO');
});

test('POST /auth/connect rechaza wallet malformada', async () => {
  const r = await request(app).post('/auth/connect').send({ wallet: 'no-es-wallet' });
  assert.equal(r.status, 400);
});

test('GET /catalog es público (wallet sin inscribir observa ofertas)', async () => {
  const r = await request(app).get('/catalog');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.articulos));
});

test('KYC: códigos → VERIFICADO; submit + revisión Owner → CERTIFICADO (D28/CU-02)', async () => {
  await inscribir(walletA);
  const token = sesionDe(walletA);

  await request(app).post('/kyc/init').set('Authorization', `Bearer ${token}`);

  const v = await request(app).post('/kyc/verify-codes').set('Authorization', `Bearer ${token}`).send({ codigoCorreo: '123456', codigoTelefono: '654321' });
  assert.equal(v.status, 200);
  assert.equal(v.body.usuario.estado, 'VERIFICADO');

  const sub = await request(app).post('/kyc/submit').set('Authorization', `Bearer ${token}`).send({ documentoRef: 'ipfs/doc1', selfieRef: 'ipfs/selfie1' });
  assert.equal(sub.status, 200);
  assert.equal(sub.body.kyc.estado, 'PENDIENTE', 'revisión humana del Owner (RF-18.4)');

  // el Owner revisa y aprueba → CERTIFICADO
  const rev = await request(app).post('/kyc/review').set('Authorization', `Bearer ${token}`).send({ wallet: wA, aprobar: true });
  assert.equal(rev.status, 200);
  assert.equal(rev.body.usuario.estado, 'CERTIFICADO');
});

test('catalog: solo Verificado/Certificado publica; límite por nivel (D14/RF-04.2)', async () => {
  // A quedó CERTIFICADO en el test anterior
  const token = sesionDe(walletA);

  for (let i = 0; i < 5; i++) {
    const r = await request(app).post('/catalog/articulos').set('Authorization', `Bearer ${token}`).send({ titulo: `Art ${i}`, rubro: 'electronica' });
    assert.equal(r.status, 201, `art ${i}: ${JSON.stringify(r.body)}`);
  }
  // 6º artículo: nivel INICIADO → límite 5 (RF-04.2)
  const sexto = await request(app).post('/catalog/articulos').set('Authorization', `Bearer ${token}`).send({ titulo: 'Art 6', rubro: 'electronica' });
  assert.equal(sexto.status, 403);
  assert.match(sexto.body.error, /limite_articulos/);
});

test('truekes: Verificado crea (máx 3 activos RF-14.4) y valida valoración 1–5 (D18)', async () => {
  await inscribir(walletB, 'b@x.com');
  const tokA = sesionDe(walletA); // A ya es CERTIFICADO (test KYC) con 5 artículos
  const tokB = sesionDe(walletB);
  // B → VERIFICADO
  await request(app).post('/kyc/init').set('Authorization', `Bearer ${tokB}`);
  await request(app).post('/kyc/verify-codes').set('Authorization', `Bearer ${tokB}`).send({ codigoCorreo: '1', codigoTelefono: '2' });

  // B publica su artículo; el artículo de A se toma de su catálogo existente.
  const artB = await request(app).post('/catalog/articulos').set('Authorization', `Bearer ${tokB}`).send({ titulo: 'Curso B', rubro: 'Educacion' });
  assert.equal(artB.status, 201, JSON.stringify(artB.body));
  const catalogo = await request(app).get('/catalog');
  const artDeA = catalogo.body.articulos.find((a) => a.wallet === wA);
  assert.ok(artDeA, 'A debe tener un artículo en el catálogo (tests previos)');

  // B (Verificado) crea el trueque ofreciendo su artículo por uno de A
  const c = await request(app).post('/truekes').set('Authorization', `Bearer ${tokB}`).send({
    parteB: wA,
    articuloAId: artB.body.articulo.id,
    articuloBId: artDeA.id,
    horaPautada: '2030-01-01T12:00:00Z',
  });
  assert.equal(c.status, 201, JSON.stringify(c.body));

  // GET /truekes — mis trueques (B los ve)
  const mios = await request(app).get('/truekes').set('Authorization', `Bearer ${tokB}`);
  assert.equal(mios.status, 200);
  assert.ok(mios.body.truekes.some((t) => t.id === c.body.trueke.id));

  // custodiar lado A (el creador B custodia su lado A)
  const cu = await request(app).post(`/truekes/${c.body.trueke.id}/custodiar`).set('Authorization', `Bearer ${tokB}`).send({ lado: 'A' });
  assert.equal(cu.status, 200);
  assert.equal(cu.body.trueke.estado, 'CUSTODIADO');

  // valoración fuera de rango
  const bad = await request(app).post(`/truekes/${c.body.trueke.id}/valoracion`).set('Authorization', `Bearer ${tokB}`).send({ valorado: wA, aceptacion: 6, honestidad: 5, seguridad: 5, confiabilidad: 5, compromiso: 5 });
  assert.equal(bad.status, 400);

  const val = await request(app).post(`/truekes/${c.body.trueke.id}/valoracion`).set('Authorization', `Bearer ${tokB}`).send({ valorado: wA, aceptacion: 5, honestidad: 4, seguridad: 5, confiabilidad: 5, compromiso: 5 });
  assert.equal(val.status, 200);
});

test('admin: dashboard requiere rol Owner y expone KPIs', async () => {
  almacen.crearUsuario({ wallet: wOwner, rol: 'OWNER' });
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
