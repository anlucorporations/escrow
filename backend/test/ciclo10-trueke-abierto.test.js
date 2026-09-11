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


async function firmaAccionDe(wallet, accion) {
  const mensaje = `TrueKeate: ${accion} (ts=${Date.now()})`;
  const firma = await wallet.signMessage(mensaje);
  return { mensaje, firma };
}

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

async function publicarArticulo(wallet, tok, titulo, categoria = 'ARTICULO') {
  const r = await request(app).post('/catalog/articulos').set('Authorization', `Bearer ${tok}`)
    .send({ titulo, rubro: 'Electronica', categoria, ...(await firmaAccionDe(wallet, 'publicar artículo')) });
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
  const artA = await publicarArticulo(walletA, tokA, 'Bici de montaña', 'ARTICULO');
  const artB = await publicarArticulo(walletB, tokB, 'Curso de cocina', 'SERVICIO');

  // 2) A publica la oferta (PROPUESTO): su NFT + qué quiere recibir
  const of = await request(app).post('/truekes/ofertas').set('Authorization', `Bearer ${tokA}`).send({
    ...(await firmaAccionDe(walletA, 'publicar oferta de trueque')),
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
  const propio = await request(app).post(`/truekes/${ofertaId}/acordar`).set('Authorization', `Bearer ${tokA}`).send({ articuloBId: artB.id, ...(await firmaAccionDe(walletB, 'acordar trueque')) });
  assert.equal(propio.status, 403, 'A no acuerda su propia oferta');

  // 5) B acuerda con su artículo
  const ac = await request(app).post(`/truekes/${ofertaId}/acordar`).set('Authorization', `Bearer ${tokB}`).send({ articuloBId: artB.id, ...(await firmaAccionDe(walletB, 'acordar trueque')) });
  assert.equal(ac.status, 200, JSON.stringify(ac.body));
  assert.equal(ac.body.trueke.estado, 'CREADO');
  assert.equal(ac.body.trueke.usuarioB, wB);
  assert.equal(ac.body.trueke.articuloBId, artB.id);

  // 5.1) propone el de mayor nivel: A es FRECUENTE, B es COMUN → A propone
  // (la propuesta ocurre tras el acuerdo, antes de custodiar — punto 5.1→6)
  const propuestaB = await request(app).post(`/truekes/${ofertaId}/propuesta-encuentro`).set('Authorization', `Bearer ${tokB}`).send({
    ...(await firmaAccionDe(walletB, 'proponer encuentro')),
    puntoEncuentroId: 1, horaPautada: '2030-06-01T12:00:00Z',
  });
  assert.equal(propuestaB.status, 403, 'B (menor nivel) no propone');
  const propuestaA = await request(app).post(`/truekes/${ofertaId}/propuesta-encuentro`).set('Authorization', `Bearer ${tokA}`).send({
    ...(await firmaAccionDe(walletA, 'proponer encuentro')),
    puntoEncuentroId: 1, horaPautada: '2030-06-01T12:00:00Z',
  });
  assert.equal(propuestaA.status, 200, JSON.stringify(propuestaA.body));
  assert.ok(propuestaA.body.trueke.horaPautada);

  // custodiar ambos lados (el flujo del escrow sigue igual tras el acuerdo)
  const cA = await request(app).post(`/truekes/${ofertaId}/custodiar`).set('Authorization', `Bearer ${tokA}`).send({ lado: 'A', ...(await firmaAccionDe(walletA, 'custodiar trueque')) });
  assert.equal(cA.status, 200);
  const cB = await request(app).post(`/truekes/${ofertaId}/custodiar`).set('Authorization', `Bearer ${tokB}`).send({ lado: 'B', ...(await firmaAccionDe(walletB, 'custodiar trueque')) });
  assert.equal(cB.status, 200);
  assert.equal(cB.body.trueke.estado, 'CUSTODIADO');

  // apertura dual + 9) cierre conforme de ambas → COMPLETADO
  await request(app).post(`/truekes/${ofertaId}/firma-recepcion`).set('Authorization', `Bearer ${tokA}`).send({ lado: 'A', ...(await firmaAccionDe(walletA, 'custodiar trueque')) });
  const cierreA = await request(app).post(`/truekes/${ofertaId}/cierre`).set('Authorization', `Bearer ${tokA}`).send({ lado: 'A', conforme: true, ...(await firmaAccionDe(walletA, 'cerrar trueque')) });
  assert.equal(cierreA.status, 200);
  const cierreB = await request(app).post(`/truekes/${ofertaId}/cierre`).set('Authorization', `Bearer ${tokB}`).send({ lado: 'B', conforme: true, ...(await firmaAccionDe(walletB, 'cerrar trueque')) });
  assert.equal(cierreB.status, 200);
  assert.equal(cierreB.body.trueke.estado, 'COMPLETADO', 'ambos conformes → COMPLETADO');
});

test('trueke abierto: cierre No Conforme abre disputa (EN_DISPUTA)', async () => {
  const tokA = await registrarYVerificar(walletA, 'COMUN');
  const tokB = await registrarYVerificar(walletB, 'COMUN');
  const artA = await publicarArticulo(walletA, tokA, 'Tablet', 'ARTICULO');
  const artB = await publicarArticulo(walletB, tokB, 'Cámara', 'ARTICULO');

  const of = await request(app).post('/truekes/ofertas').set('Authorization', `Bearer ${tokA}`).send({
    ...(await firmaAccionDe(walletA, 'publicar oferta de trueque')),
    articuloAId: artA.id, descripcionRequerida: 'Busco una cámara', tipoRequerido: 'ARTICULO',
  });
  const ofertaId = of.body.trueke.id;
  await request(app).post(`/truekes/${ofertaId}/acordar`).set('Authorization', `Bearer ${tokB}`).send({ articuloBId: artB.id, ...(await firmaAccionDe(walletB, 'acordar trueque')) });
  await request(app).post(`/truekes/${ofertaId}/custodiar`).set('Authorization', `Bearer ${tokA}`).send({ lado: 'A', ...(await firmaAccionDe(walletA, 'custodiar trueque')) });
  await request(app).post(`/truekes/${ofertaId}/custodiar`).set('Authorization', `Bearer ${tokB}`).send({ lado: 'B', ...(await firmaAccionDe(walletB, 'custodiar trueque')) });

  // B recibe algo que no esperaba → No Conforme
  // El No Conforme abre el formulario de disputa: exige motivo + al menos una foto
  const nc = await request(app).post(`/truekes/${ofertaId}/cierre`).set('Authorization', `Bearer ${tokB}`).send({
    lado: 'B', conforme: false,
    motivo: 'Recibí un artículo distinto al ofertado',
    fotos: [{ data: 'ZGVtbw==', mime: 'image/jpeg' }],
    ...(await firmaAccionDe(walletB, 'cerrar trueque')),
  });
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
  const artA = await publicarArticulo(walletA, tokA, 'Bici urbana', 'ARTICULO');
  const artB = await publicarArticulo(walletB, tokB, 'Masaje relajante', 'SERVICIO');

  // A oferta su bici; B la acuerda ofreciendo su servicio
  const of = await request(app).post('/truekes/ofertas').set('Authorization', `Bearer ${tokA}`).send({
    ...(await firmaAccionDe(walletA, 'publicar oferta de trueque')),
    articuloAId: artA.id, descripcionRequerida: 'Busco un masaje', tipoRequerido: 'SERVICIO',
  });
  const ofertaId = of.body.trueke.id;
  await request(app).post(`/truekes/${ofertaId}/acordar`).set('Authorization', `Bearer ${tokB}`).send({ articuloBId: artB.id, ...(await firmaAccionDe(walletB, 'acordar trueque')) });
  await request(app).post(`/truekes/${ofertaId}/custodiar`).set('Authorization', `Bearer ${tokA}`).send({ lado: 'A', ...(await firmaAccionDe(walletA, 'custodiar trueque')) });
  await request(app).post(`/truekes/${ofertaId}/custodiar`).set('Authorization', `Bearer ${tokB}`).send({ lado: 'B', ...(await firmaAccionDe(walletB, 'custodiar trueque')) });
  await request(app).post(`/truekes/${ofertaId}/cierre`).set('Authorization', `Bearer ${tokA}`).send({ lado: 'A', conforme: true, ...(await firmaAccionDe(walletA, 'cerrar trueque')) });
  const cierreB = await request(app).post(`/truekes/${ofertaId}/cierre`).set('Authorization', `Bearer ${tokB}`).send({ lado: 'B', conforme: true, ...(await firmaAccionDe(walletB, 'cerrar trueque')) });
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
    .set('Authorization', `Bearer ${tokB}`).send({ articuloId: artA.id, ...(await firmaAccionDe(walletB, 'usar NFT')) });
  assert.equal(usar.status, 200, JSON.stringify(usar.body));
  assert.equal(usar.body.quemado.simulado, true, 'sin red el quemado se simula');
  assert.ok(usar.body.articulo.usadoEl || usar.body.articulo.usado_el, 'la fila BD marca usado_el');

  // Un tercero NO puede usar un NFT ajeno
  const walletC = ethers.Wallet.createRandom();
  const tokC = await registrarYVerificar(walletC, 'COMUN');
  const usarAjeno = await request(app).post(`/truekes/nft/${bici.nftTokenId ?? 1}/usar`)
    .set('Authorization', `Bearer ${tokC}`).send({ articuloId: artA.id, ...(await firmaAccionDe(walletC, 'usar NFT')) });
  assert.equal(usarAjeno.status, 403, 'un tercero no consume el NFT ajeno');
});

// Punto 5 del director: contacto de la contraparte visible mientras el trueke esté ACTIVO.
test('contacto: la contraparte ve teléfono mientras el trueke está activo y se oculta al cerrar', async () => {
  const tokA = await registrarYVerificar(walletA, 'FRECUENTE');
  const tokB = await registrarYVerificar(walletB, 'COMUN');
  const artA = await publicarArticulo(walletA, tokA, 'Bici contacto', 'ARTICULO');
  const artB = await publicarArticulo(walletB, tokB, 'Curso contacto', 'SERVICIO');

  const of = await request(app).post('/truekes/ofertas').set('Authorization', `Bearer ${tokA}`).send({
    ...(await firmaAccionDe(walletA, 'publicar oferta de trueque')),
    articuloAId: artA.id, descripcionRequerida: 'Busco un curso', tipoRequerido: 'SERVICIO',
  });
  const ofertaId = of.body.trueke.id;
  await request(app).post(`/truekes/${ofertaId}/acordar`).set('Authorization', `Bearer ${tokB}`).send({
    articuloBId: artB.id, ...(await firmaAccionDe(walletB, 'acordar trueque')),
  });

  // B (activo, parte) consulta el contacto de A → visible (teléfono/correo)
  const cont = await request(app).get(`/truekes/${ofertaId}/contacto`).set('Authorization', `Bearer ${tokB}`);
  assert.equal(cont.status, 200, JSON.stringify(cont.body));
  assert.equal(cont.body.oculto, false);
  assert.ok(cont.body.contacto.wallet, 'expone la wallet de la contraparte');

  // un tercero NO puede ver el contacto
  const walletC2 = ethers.Wallet.createRandom();
  const tokC2 = await registrarYVerificar(walletC2, 'COMUN');
  const contAjeno = await request(app).get(`/truekes/${ofertaId}/contacto`).set('Authorization', `Bearer ${tokC2}`);
  assert.equal(contAjeno.status, 403, 'un tercero no ve el contacto');

  // custodiar y cerrar conforme → COMPLETADO → contacto oculto
  await request(app).post(`/truekes/${ofertaId}/custodiar`).set('Authorization', `Bearer ${tokA}`).send({ lado: 'A', ...(await firmaAccionDe(walletA, 'custodiar trueque')) });
  await request(app).post(`/truekes/${ofertaId}/custodiar`).set('Authorization', `Bearer ${tokB}`).send({ lado: 'B', ...(await firmaAccionDe(walletB, 'custodiar trueque')) });
  await request(app).post(`/truekes/${ofertaId}/cierre`).set('Authorization', `Bearer ${tokA}`).send({ lado: 'A', conforme: true, ...(await firmaAccionDe(walletA, 'cerrar trueque')) });
  await request(app).post(`/truekes/${ofertaId}/cierre`).set('Authorization', `Bearer ${tokB}`).send({ lado: 'B', conforme: true, ...(await firmaAccionDe(walletB, 'cerrar trueque')) });

  const contCerrado = await request(app).get(`/truekes/${ofertaId}/contacto`).set('Authorization', `Bearer ${tokB}`);
  assert.equal(contCerrado.status, 200);
  assert.equal(contCerrado.body.oculto, true, 'al cerrar el trueke el contacto se oculta');
});

// Puntos 6 y 7 del director: la contraparte acepta/rechaza la propuesta y al
// aceptar ambos NFTs pasan a custodia automática del escrow.
test('encuentro: la contraparte acepta y ambos NFTs pasan a custodia automática', async () => {
  const tokA = await registrarYVerificar(walletA, 'FRECUENTE');
  const tokB = await registrarYVerificar(walletB, 'COMUN');
  const artA = await publicarArticulo(walletA, tokA, 'Bici encuentro', 'ARTICULO');
  const artB = await publicarArticulo(walletB, tokB, 'Curso encuentro', 'SERVICIO');

  const of = await request(app).post('/truekes/ofertas').set('Authorization', `Bearer ${tokA}`).send({
    ...(await firmaAccionDe(walletA, 'publicar oferta de trueque')),
    articuloAId: artA.id, descripcionRequerida: 'Busco un curso', tipoRequerido: 'SERVICIO',
  });
  const ofertaId = of.body.trueke.id;
  await request(app).post(`/truekes/${ofertaId}/acordar`).set('Authorization', `Bearer ${tokB}`).send({
    articuloBId: artB.id, ...(await firmaAccionDe(walletB, 'acordar trueque')),
  });

  // A (mayor nivel) propone
  const prop = await request(app).post(`/truekes/${ofertaId}/propuesta-encuentro`).set('Authorization', `Bearer ${tokA}`).send({
    ...(await firmaAccionDe(walletA, 'proponer encuentro')),
    puntoEncuentroId: 1, horaPautada: '2030-09-01T18:00:00Z',
  });
  assert.equal(prop.status, 200);
  assert.equal(prop.body.encuentroEstado, 'PROPUESTO');

  // A NO puede aceptar su propia propuesta
  const autoAceptar = await request(app).post(`/truekes/${ofertaId}/encuentro/aceptar`).set('Authorization', `Bearer ${tokA}`).send({
    ...(await firmaAccionDe(walletA, 'aceptar encuentro')),
  });
  assert.equal(autoAceptar.status, 403, 'no se acepta la propia propuesta');

  // B (contraparte) acepta → custodia automática de ambos NFTs
  const acepta = await request(app).post(`/truekes/${ofertaId}/encuentro/aceptar`).set('Authorization', `Bearer ${tokB}`).send({
    ...(await firmaAccionDe(walletB, 'aceptar encuentro')),
  });
  assert.equal(acepta.status, 200, JSON.stringify(acepta.body));
  assert.equal(acepta.body.custodia, 'AUTOMATICA_AMBOS');
  assert.equal(acepta.body.trueke.estado, 'CUSTODIADO');
  assert.equal(acepta.body.encuentroEstado, 'ACEPTADO');

  // Cierre conforme → COMPLETADO (liberación final)
  await request(app).post(`/truekes/${ofertaId}/cierre`).set('Authorization', `Bearer ${tokA}`).send({ lado: 'A', conforme: true, ...(await firmaAccionDe(walletA, 'cerrar trueque')) });
  const cierreB2 = await request(app).post(`/truekes/${ofertaId}/cierre`).set('Authorization', `Bearer ${tokB}`).send({ lado: 'B', conforme: true, ...(await firmaAccionDe(walletB, 'cerrar trueque')) });
  assert.equal(cierreB2.body.trueke.estado, 'COMPLETADO', 'se libera y transfiere al finalizar');
});

test('encuentro: la contraparte puede rechazar la propuesta', async () => {
  const tokA = await registrarYVerificar(walletA, 'FRECUENTE');
  const tokB = await registrarYVerificar(walletB, 'COMUN');
  const artA = await publicarArticulo(walletA, tokA, 'Bici rechazo', 'ARTICULO');
  const artB = await publicarArticulo(walletB, tokB, 'Curso rechazo', 'SERVICIO');
  const of = await request(app).post('/truekes/ofertas').set('Authorization', `Bearer ${tokA}`).send({
    ...(await firmaAccionDe(walletA, 'publicar oferta de trueque')),
    articuloAId: artA.id, descripcionRequerida: 'Busco un curso', tipoRequerido: 'SERVICIO',
  });
  const ofertaId = of.body.trueke.id;
  await request(app).post(`/truekes/${ofertaId}/acordar`).set('Authorization', `Bearer ${tokB}`).send({
    articuloBId: artB.id, ...(await firmaAccionDe(walletB, 'acordar trueque')),
  });
  await request(app).post(`/truekes/${ofertaId}/propuesta-encuentro`).set('Authorization', `Bearer ${tokA}`).send({
    ...(await firmaAccionDe(walletA, 'proponer encuentro')),
    puntoEncuentroId: 1, horaPautada: '2030-09-02T18:00:00Z',
  });
  const recha = await request(app).post(`/truekes/${ofertaId}/encuentro/rechazar`).set('Authorization', `Bearer ${tokB}`).send({
    ...(await firmaAccionDe(walletB, 'rechazar encuentro')),
  });
  assert.equal(recha.status, 200);
  assert.equal(recha.body.encuentroEstado, 'RECHAZADO');
});

// Punto 1 del director: el inventario admite 1..N imágenes y el catálogo las sirve.
test('imágenes: publicar artículo con imágenes y servirlas por URL', async () => {
  const tokA = await registrarYVerificar(walletA, 'COMUN');
  const px = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; // 1x1 png
  const art = await request(app).post('/catalog/articulos').set('Authorization', `Bearer ${tokA}`).send({
    ...(await firmaAccionDe(walletA, 'publicar artículo')),
    titulo: 'Bici con foto', rubro: 'Deportes', categoria: 'ARTICULO',
    imagenes: [
      { data: px, mime: 'image/png' },
      { data: px, mime: 'image/png' },
    ],
  });
  assert.equal(art.status, 201, JSON.stringify(art.body));
  assert.equal(art.body.imagenes.length, 2, 'se guardaron 2 imágenes');
  assert.ok(art.body.imagenes[0].url.includes('/imagen/'));

  // el catálogo público expone las imágenes del artículo
  const catalogo = await request(app).get('/catalog');
  const conImg = catalogo.body.articulos.find((a) => a.id === art.body.articulo.id);
  assert.ok(conImg.imagenes && conImg.imagenes.length === 2, 'el catálogo trae las imágenes');

  // servir una imagen por su URL
  const img = await request(app).get(art.body.imagenes[0].url);
  assert.equal(img.status, 200);
  assert.equal(img.headers['content-type'], 'image/png');
});
