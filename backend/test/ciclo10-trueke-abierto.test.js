// =============================================================================
// TrueKeate — Tests del modelo de trueque abierto-publicado (lógica maestra)
// Cubren el ciclo del director (RepoTecnico/logica_trueke.md):
//   2. A publica una oferta (PROPUESTO) con su NFT + "qué quiere recibir".
//   3. La oferta aparece en el Mercado (GET /truekes/ofertas).
//   5. B la acuerda con su artículo → CREADO.
//   5.1 El de mayor nivel/reputación propone punto + fecha/hora.
//   9. Cierre: Recibido Conforme (ambos → COMPLETADO) o No Conforme (→ disputa).
// =============================================================================
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { crearApp } from '../api/app.js';
import { crearAlmacen } from '../api/lib/almacen.js';
import { ethers } from 'ethers';

let app, server, almacen;

const walletA = ethers.Wallet.createRandom();
const walletB = ethers.Wallet.createRandom();
const wA = walletA.address.toLowerCase();
const wB = walletB.address.toLowerCase();

function sesion(wallet) {
  const token = 'tok-' + wallet.address.slice(2, 10);
  almacen.guardarSesion(token, wallet.address.toLowerCase());
  return token;
}

/** Registra e inscribe; devuelve sesión. */
async function registrarYVerificar(wallet, nivel = 'COMUN') {
  const r = await request(app).post('/auth/register').send({
    wallet: wallet.address.toLowerCase(), correo: `${wallet.address.slice(2, 8)}@x.com`,
    telefono: '+58', consentimientoGdpr: true,
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const tok = sesion(wallet);
  // sube a VERIFICADO (escalera D28) y fija nivel
  const init = await request(app).post('/kyc/init').set('Authorization', `Bearer ${tok}`);
  const codigoDemo = init.body.codigoDemo;
  await request(app).post('/kyc/verify-codes').set('Authorization', `Bearer ${tok}`).send({ codigoCorreo: codigoDemo });
  const u = await almacen.getUsuario(wallet.address.toLowerCase());
  almacen.actualizarUsuario(wallet.address.toLowerCase(), { nivel });
  return tok;
}

async function publicarArticulo(tok, titulo, categoria = 'ARTICULO') {
  const r = await request(app).post('/catalog/articulos').set('Authorization', `Bearer ${tok}`)
    .send({ titulo, rubro: 'Electronica', categoria });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.articulo;
}

before(async () => {
  almacen = crearAlmacen();
  app = crearApp({ almacen });
  server = app.listen(0);
  await new Promise((res) => server.on('listening', res));
});

after(() => server.close());

test('trueke abierto: A publica oferta → Mercado → B acuerda → propuesta → cierre conforme (COMPLETADO)', async () => {
  const tokA = await registrarYVerificar(walletA, 'FRECUENTE');
  const tokB = await registrarYVerificar(walletB, 'COMUN');
  const artA = await publicarArticulo(tokA, 'Bici de montaña', 'ARTICULO');
  const artB = await publicarArticulo(tokB, 'Curso de cocina', 'SERVICIO');

  // 2) A publica la oferta (PROPUESTO): su NFT + qué quiere recibir
  const of = await request(app).post('/truekes/ofertas').set('Authorization', `Bearer ${tokA}`).send({
    articuloAId: artA.id,
    descripcionRequerida: 'Busco un servicio de formación',
    tipoRequerido: 'SERVICIO',
  });
  assert.equal(of.status, 201, JSON.stringify(of.body));
  assert.equal(of.body.trueke.estado, 'PROPUESTO');
  assert.equal(of.body.trueke.usuarioB, null, 'oferta sin contraparte');
  assert.equal(of.body.trueke.descripcionRequerida, 'Busco un servicio de formación');
  const ofertaId = of.body.trueke.id;

  // 3) la oferta está en el Mercado
  const mercado = await request(app).get('/truekes/ofertas');
  assert.equal(mercado.status, 200);
  assert.ok(mercado.body.truekes.some((t) => t.id === ofertaId && t.estado === 'PROPUESTO'));

  // B no puede acordar su propia... (A tampoco puede acordar su propia oferta)
  const propio = await request(app).post(`/truekes/${ofertaId}/acordar`).set('Authorization', `Bearer ${tokA}`).send({ articuloBId: artB.id });
  assert.equal(propio.status, 403, 'A no acuerda su propia oferta');

  // 5) B acuerda con su artículo
  const ac = await request(app).post(`/truekes/${ofertaId}/acordar`).set('Authorization', `Bearer ${tokB}`).send({ articuloBId: artB.id });
  assert.equal(ac.status, 200, JSON.stringify(ac.body));
  assert.equal(ac.body.trueke.estado, 'CREADO');
  assert.equal(ac.body.trueke.usuarioB, wB);
  assert.equal(ac.body.trueke.articuloBId, artB.id);

  // 5.1) propone el de mayor nivel: A es FRECUENTE, B es COMUN → A propone
  // (la propuesta ocurre tras el acuerdo, antes de custodiar — punto 5.1→6)
  const propuestaB = await request(app).post(`/truekes/${ofertaId}/propuesta-encuentro`).set('Authorization', `Bearer ${tokB}`).send({
    puntoEncuentroId: 1, horaPautada: '2030-06-01T12:00:00Z',
  });
  assert.equal(propuestaB.status, 403, 'B (menor nivel) no propone');
  const propuestaA = await request(app).post(`/truekes/${ofertaId}/propuesta-encuentro`).set('Authorization', `Bearer ${tokA}`).send({
    puntoEncuentroId: 1, horaPautada: '2030-06-01T12:00:00Z',
  });
  assert.equal(propuestaA.status, 200, JSON.stringify(propuestaA.body));
  assert.ok(propuestaA.body.trueke.horaPautada);

  // custodiar ambos lados (el flujo del escrow sigue igual tras el acuerdo)
  const cA = await request(app).post(`/truekes/${ofertaId}/custodiar`).set('Authorization', `Bearer ${tokA}`).send({ lado: 'A' });
  assert.equal(cA.status, 200);
  const cB = await request(app).post(`/truekes/${ofertaId}/custodiar`).set('Authorization', `Bearer ${tokB}`).send({ lado: 'B' });
  assert.equal(cB.status, 200);
  assert.equal(cB.body.trueke.estado, 'CUSTODIADO');

  // apertura dual + 9) cierre conforme de ambas → COMPLETADO
  await request(app).post(`/truekes/${ofertaId}/firma-recepcion`).set('Authorization', `Bearer ${tokA}`).send({ lado: 'A' });
  const cierreA = await request(app).post(`/truekes/${ofertaId}/cierre`).set('Authorization', `Bearer ${tokA}`).send({ lado: 'A', conforme: true });
  assert.equal(cierreA.status, 200);
  const cierreB = await request(app).post(`/truekes/${ofertaId}/cierre`).set('Authorization', `Bearer ${tokB}`).send({ lado: 'B', conforme: true });
  assert.equal(cierreB.status, 200);
  assert.equal(cierreB.body.trueke.estado, 'COMPLETADO', 'ambos conformes → COMPLETADO');
});

test('trueke abierto: cierre No Conforme abre disputa (EN_DISPUTA)', async () => {
  const tokA = await registrarYVerificar(walletA, 'COMUN');
  const tokB = await registrarYVerificar(walletB, 'COMUN');
  const artA = await publicarArticulo(tokA, 'Tablet', 'ARTICULO');
  const artB = await publicarArticulo(tokB, 'Cámara', 'ARTICULO');

  const of = await request(app).post('/truekes/ofertas').set('Authorization', `Bearer ${tokA}`).send({
    articuloAId: artA.id, descripcionRequerida: 'Busco una cámara', tipoRequerido: 'ARTICULO',
  });
  const ofertaId = of.body.trueke.id;
  await request(app).post(`/truekes/${ofertaId}/acordar`).set('Authorization', `Bearer ${tokB}`).send({ articuloBId: artB.id });
  await request(app).post(`/truekes/${ofertaId}/custodiar`).set('Authorization', `Bearer ${tokA}`).send({ lado: 'A' });
  await request(app).post(`/truekes/${ofertaId}/custodiar`).set('Authorization', `Bearer ${tokB}`).send({ lado: 'B' });

  // B recibe algo que no esperaba → No Conforme
  const nc = await request(app).post(`/truekes/${ofertaId}/cierre`).set('Authorization', `Bearer ${tokB}`).send({ lado: 'B', conforme: false });
  assert.equal(nc.status, 200, JSON.stringify(nc.body));
  assert.equal(nc.body.trueke.estado, 'EN_DISPUTA');
  assert.ok(nc.body.disputa, 'se abre la disputa');
  assert.equal(nc.body.disputa.solicitante, wB);
});

// =============================================================================
// Lógica post-trueke (director):
//   0. Al COMPLETADO los NFTs pasan al inventario de la contraparte (reasignación).
//   1. El receptor puede re-ofrecer el NFT recibido.
//   2. USAR: el dueño consume el NFT → se quema (simulado sin red) y marca usado_el.
// =============================================================================
test('post-trueke: al COMPLETADO se reasigna el dueño y el receptor puede usar el NFT', async () => {
  const tokA = await registrarYVerificar(walletA, 'FRECUENTE');
  const tokB = await registrarYVerificar(walletB, 'COMUN');
  const artA = await publicarArticulo(tokA, 'Bici urbana', 'ARTICULO');
  const artB = await publicarArticulo(tokB, 'Masaje relajante', 'SERVICIO');

  // A oferta su bici; B la acuerda ofreciendo su servicio
  const of = await request(app).post('/truekes/ofertas').set('Authorization', `Bearer ${tokA}`).send({
    articuloAId: artA.id, descripcionRequerida: 'Busco un masaje', tipoRequerido: 'SERVICIO',
  });
  const ofertaId = of.body.trueke.id;
  await request(app).post(`/truekes/${ofertaId}/acordar`).set('Authorization', `Bearer ${tokB}`).send({ articuloBId: artB.id });
  await request(app).post(`/truekes/${ofertaId}/custodiar`).set('Authorization', `Bearer ${tokA}`).send({ lado: 'A' });
  await request(app).post(`/truekes/${ofertaId}/custodiar`).set('Authorization', `Bearer ${tokB}`).send({ lado: 'B' });
  await request(app).post(`/truekes/${ofertaId}/cierre`).set('Authorization', `Bearer ${tokA}`).send({ lado: 'A', conforme: true });
  const cierreB = await request(app).post(`/truekes/${ofertaId}/cierre`).set('Authorization', `Bearer ${tokB}`).send({ lado: 'B', conforme: true });
  assert.equal(cierreB.body.trueke.estado, 'COMPLETADO');

  // Punto 0: el artículo A (bici de A) ahora es del usuario B
  const catalogo = await request(app).get('/catalog');
  const dueno = (a) => (a.usuarioWallet ?? a.wallet ?? '').toLowerCase();
  const bici = catalogo.body.articulos.find((a) => a.id === artA.id);
  assert.equal(dueno(bici), wB, 'la bici pasó al inventario de B');
  const masaje = catalogo.body.articulos.find((a) => a.id === artB.id);
  assert.equal(dueno(masaje), wA, 'el servicio pasó al inventario de A');

  // Punto 1: B ya puede ofrecer la bici recibida en un nuevo trueke
  const misDeB = catalogo.body.articulos.filter((a) => dueno(a) === wB && a.disponible !== false);
  assert.ok(misDeB.some((a) => a.id === artA.id), 'B puede re-ofrecer la bici recibida');

  // Punto 2: B USA la bici (la consume) → se marca usado_el (sin red: simulado)
  const usar = await request(app).post(`/truekes/nft/${bici.nftTokenId ?? 1}/usar`)
    .set('Authorization', `Bearer ${tokB}`).send({ articuloId: artA.id });
  assert.equal(usar.status, 200, JSON.stringify(usar.body));
  assert.equal(usar.body.quemado.simulado, true, 'sin red el quemado se simula');
  assert.ok(usar.body.articulo.usadoEl || usar.body.articulo.usado_el, 'la fila BD marca usado_el');

  // Un tercero NO puede usar un NFT ajeno
  const walletC = ethers.Wallet.createRandom();
  const tokC = await registrarYVerificar(walletC, 'COMUN');
  const usarAjeno = await request(app).post(`/truekes/nft/${bici.nftTokenId ?? 1}/usar`)
    .set('Authorization', `Bearer ${tokC}`).send({ articuloId: artA.id });
  assert.equal(usarAjeno.status, 403, 'un tercero no consume el NFT ajeno');
});
