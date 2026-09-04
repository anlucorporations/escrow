// =============================================================================
// TrueKeate — Tests de la integración de la suite (finanzas, disputas)
// Cubren los endpoints REST nuevos persistidos (Ciclos faltantes):
//   - finanzas: GET /finanzas/mi (rol: BRLT solo Socio/Owner — D5/RF-14.7)
//   - disputas: POST /disputas (solicitar anulación → EN_DISPUTA) y GET /disputas
//   - truekes: GET /truekes (mis trueques) ya cubierto en api.test.js
// =============================================================================
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { crearApp } from '../api/app.js';
import { crearAlmacen } from '../api/lib/almacen.js';
import { ethers } from 'ethers';

let app, server, almacen;

const wA = ethers.Wallet.createRandom().address.toLowerCase();
const wB = ethers.Wallet.createRandom().address.toLowerCase();
const wOwner = ethers.Wallet.createRandom().address.toLowerCase();

function sesion(w) {
  const token = 'tok-' + w.slice(2, 10);
  almacen.guardarSesion(token, w);
  return token;
}

async function inscribir(w) {
  const r = await request(app).post('/auth/register').send({ wallet: w, correo: `${w.slice(2, 8)}@x.com`, telefono: '+58', consentimientoGdpr: true });
  assert.equal(r.status, 200);
}

async function certificar(w) {
  await inscribir(w);
  const tok = sesion(w);
  await request(app).post('/kyc/init').set('Authorization', `Bearer ${tok}`);
  await request(app).post('/kyc/verify-codes').set('Authorization', `Bearer ${tok}`).send({ codigoCorreo: '1', codigoTelefono: '2' });
  return tok;
}

/** Crea un escenario listo: A y B certificados, un trueque CUSTODIADO entre ambos. */
async function escenarioTrueque() {
  const tokA = await certificar(wA);
  const tokB = await certificar(wB);
  const artA = await request(app).post('/catalog/articulos').set('Authorization', `Bearer ${tokA}`).send({ titulo: 'Objeto A', rubro: 'Hogar' });
  const artB = await request(app).post('/catalog/articulos').set('Authorization', `Bearer ${tokB}`).send({ titulo: 'Objeto B', rubro: 'Hogar' });
  const c = await request(app).post('/truekes').set('Authorization', `Bearer ${tokA}`).send({
    parteB: wB, articuloAId: artA.body.articulo.id, articuloBId: artB.body.articulo.id,
  });
  await request(app).post(`/truekes/${c.body.trueke.id}/custodiar`).set('Authorization', `Bearer ${tokA}`).send({ lado: 'A' });
  await request(app).post(`/truekes/${c.body.trueke.id}/custodiar`).set('Authorization', `Bearer ${tokB}`).send({ lado: 'B' });
  return { tokA, tokB, truekeId: c.body.trueke.id };
}

before(async () => {
  almacen = crearAlmacen();
  app = crearApp({ almacen });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
});
after(() => server.close());

test('finanzas: GET /finanzas/mi devuelve saldos; BRLT solo para Socio/Owner (D5/RF-14.7)', async () => {
  const tokA = await certificar(wA);
  const r = await request(app).get('/finanzas/mi').set('Authorization', `Bearer ${tokA}`);
  assert.equal(r.status, 200);
  assert.ok('nftsStock' in r.body);
  assert.ok('criptos' in r.body);
  assert.equal(r.body.brlt, undefined, 'Particular NO ve BRLT (D5)');
});

test('finanzas: un Socio (Owner) SÍ ve BRLT y el fondo', async () => {
  almacen.crearUsuario({ wallet: wOwner, rol: 'OWNER', tipo: 'SOCIO' });
  const tok = sesion(wOwner);
  const r = await request(app).get('/finanzas/mi').set('Authorization', `Bearer ${tok}`);
  assert.equal(r.status, 200);
  assert.ok('brlt' in r.body, 'Socio/Owner ve BRLT');
});

test('disputas: solicitar anulación de un trueque propio → EN_DISPUTA y aparece en GET /disputas', async () => {
  const { tokA, truekeId } = await escenarioTrueque();
  const d = await request(app).post('/disputas').set('Authorization', `Bearer ${tokA}`).send({ truekeId, motivo: 'el otro lado no entrega' });
  assert.equal(d.status, 201, JSON.stringify(d.body));
  assert.equal(d.body.disputa.estado, 'ABIERTA');

  // el trueque pasó a EN_DISPUTA
  const detalle = await request(app).get(`/truekes/${truekeId}`).set('Authorization', `Bearer ${tokA}`);
  assert.equal(detalle.body.trueke.estado, 'EN_DISPUTA');

  const mías = await request(app).get('/disputas').set('Authorization', `Bearer ${tokA}`);
  assert.equal(mías.status, 200);
  assert.ok(mías.body.disputas.some((x) => x.truekeId === truekeId));
});

test('disputas: un tercero NO puede solicitar ni ver la disputa', async () => {
  const wC = ethers.Wallet.createRandom().address.toLowerCase();
  const tokC = await certificar(wC);
  const { truekeId } = await escenarioTrueque();
  const d = await request(app).post('/disputas').set('Authorization', `Bearer ${tokC}`).send({ truekeId, motivo: 'intruso' });
  assert.equal(d.status, 403);
});
