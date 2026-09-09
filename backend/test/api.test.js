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


async function firmaAccionDe(wallet, accion) {
  const mensaje = `TrueKeate: ${accion} (ts=${Date.now()})`;
  const firma = await wallet.signMessage(mensaje);
  return { mensaje, firma };
}

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

  const initResp = await request(app).post('/kyc/init').set('Authorization', `Bearer ${token}`);
  const codigoDemo = initResp.body.codigoDemo;
  assert.ok(codigoDemo, 'kyc/init debe devolver codigoDemo sin SMTP');
  const v = await request(app).post('/kyc/verify-codes').set('Authorization', `Bearer ${token}`).send({ codigoCorreo: codigoDemo });
  assert.equal(v.status, 200);
  assert.equal(v.body.usuario.estado, 'VERIFICADO');

  // Sin SBT → sube imágenes reales (DNI + selfie) → PENDIENTE (revisión Owner)
  const PNG_1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const sub = await request(app).post('/kyc/submit').set('Authorization', `Bearer ${token}`).send({
    documento: { data: PNG_1x1, mime: 'image/png' },
    selfie: { data: PNG_1x1, mime: 'image/png' },
  });
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
    const r = await request(app).post('/catalog/articulos').set('Authorization', `Bearer ${token}`).send({ titulo: `Art ${i}`, rubro: 'electronica', ...(await firmaAccionDe(walletA, 'publicar artículo')) });
    assert.equal(r.status, 201, `art ${i}: ${JSON.stringify(r.body)}`);
  }
  // 6º artículo: nivel INICIADO → límite 5 (RF-04.2)
  const sexto = await request(app).post('/catalog/articulos').set('Authorization', `Bearer ${token}`).send({ titulo: 'Art 6', rubro: 'electronica', ...(await firmaAccionDe(walletA, 'publicar artículo')) });
  assert.equal(sexto.status, 403);
  assert.match(sexto.body.error, /limite_articulos/);
});

test('truekes: Verificado crea (máx 3 activos RF-14.4) y valida valoración 1–5 (D18)', async () => {
  await inscribir(walletB, 'b@x.com');
  const tokA = sesionDe(walletA); // A ya es CERTIFICADO (test KYC) con 5 artículos
  const tokB = sesionDe(walletB);
  // B → VERIFICADO (con código de correo)
  const initResp = await request(app).post('/kyc/init').set('Authorization', `Bearer ${tokB}`);
  const codigoDemo = initResp.body.codigoDemo;
  assert.ok(codigoDemo, 'kyc/init debe devolver codigoDemo sin SMTP');
  await request(app).post('/kyc/verify-codes').set('Authorization', `Bearer ${tokB}`).send({ codigoCorreo: codigoDemo });

  // B publica su artículo; el artículo de A se toma de su catálogo existente.
  const artB = await request(app).post('/catalog/articulos').set('Authorization', `Bearer ${tokB}`).send({ titulo: 'Curso B', rubro: 'Educacion', ...(await firmaAccionDe(walletB, 'publicar artículo')) });
  assert.equal(artB.status, 201, JSON.stringify(artB.body));
  const catalogo = await request(app).get('/catalog');
  const artDeA = catalogo.body.articulos.find((a) => a.wallet === wA);
  assert.ok(artDeA, 'A debe tener un artículo en el catálogo (tests previos)');

  // B (Verificado) crea el trueque ofreciendo su artículo por uno de A
  const c = await request(app).post('/truekes').set('Authorization', `Bearer ${tokB}`).send({
    ...(await firmaAccionDe(walletB, 'crear trueque')),
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
  const cu = await request(app).post(`/truekes/${c.body.trueke.id}/custodiar`).set('Authorization', `Bearer ${tokB}`).send({ lado: 'A', ...(await firmaAccionDe(walletB, 'custodiar trueque')) });
  assert.equal(cu.status, 200);
  assert.equal(cu.body.trueke.estado, 'CUSTODIADO');

  // valoración fuera de rango
  const bad = await request(app).post(`/truekes/${c.body.trueke.id}/valoracion`).set('Authorization', `Bearer ${tokB}`).send({ valorado: wA, aceptacion: 6, honestidad: 5, seguridad: 5, confiabilidad: 5, compromiso: 5, ...(await firmaAccionDe(walletB, 'valorar trueque')) });
  assert.equal(bad.status, 400);

  const val = await request(app).post(`/truekes/${c.body.trueke.id}/valoracion`).set('Authorization', `Bearer ${tokB}`).send({ valorado: wA, aceptacion: 5, honestidad: 4, seguridad: 5, confiabilidad: 5, compromiso: 5, ...(await firmaAccionDe(walletB, 'valorar trueque')) });
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

// ---------------------------------------------------------------------------
// Flujo de disputas afinado (director 2026-09-08):
// REPORTADA → ESPERA_JUSTIFICATIVO → EN_VOTACION → RESUELTA (ANULAR|VALIDO)
// ---------------------------------------------------------------------------
const PNG_1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const walletS1 = ethers.Wallet.createRandom();
const walletS2 = ethers.Wallet.createRandom();
const wS1 = walletS1.address.toLowerCase();
const wS2 = walletS2.address.toLowerCase();

/** Crea un trueke nuevo entre A (wA, CERTIFICADO) y B (wB, VERIFICADO), custodiado. */
async function crearTruekeCustodiado() {
  const tokB = sesionDe(walletB);
  const artNuevoB = await request(app).post('/catalog/articulos').set('Authorization', `Bearer ${tokB}`)
    .send({ titulo: `Objeto B ${Date.now()}`, rubro: 'Electronica', ...(await firmaAccionDe(walletB, 'publicar artículo')) });
  assert.equal(artNuevoB.status, 201, JSON.stringify(artNuevoB.body));
  const catalogo = await request(app).get('/catalog');
  const artDeA = catalogo.body.articulos.find((a) => a.wallet === wA);
  assert.ok(artDeA, 'A debe tener artículo');
  const c = await request(app).post('/truekes').set('Authorization', `Bearer ${tokB}`).send({
    ...(await firmaAccionDe(walletB, 'crear trueque')),
    parteB: wA,
    articuloAId: artNuevoB.body.articulo.id,
    articuloBId: artDeA.id,
    horaPautada: '2030-02-01T12:00:00Z',
  });
  assert.equal(c.status, 201, JSON.stringify(c.body));
  const id = c.body.trueke.id;
  const cu = await request(app).post(`/truekes/${id}/custodiar`).set('Authorization', `Bearer ${tokB}`)
    .send({ lado: 'A', ...(await firmaAccionDe(walletB, 'custodiar trueque')) });
  assert.equal(cu.status, 200);
  assert.equal(cu.body.trueke.estado, 'CUSTODIADO');
  return id;
}

test('disputa: No Conforme con motivo+fotos → REPORTADA; justificativo del conforme → EN_VOTACION; socios votan VALIDO → COMPLETADO', async () => {
  // B es usuarioA (creador) y wA la contraparte (usuarioB)
  const t2 = await crearTruekeCustodiado();
  const tokB = sesionDe(walletB);

  // 1) validación del formulario: sin motivo o sin fotos → 400 (trueke aún CUSTODIADO)
  const mal = await request(app).post(`/truekes/${t2}/cierre`).set('Authorization', `Bearer ${tokB}`).send({
    lado: 'A', conforme: false, ...(await firmaAccionDe(walletB, 'cerrar trueque')),
  });
  assert.equal(mal.status, 400);

  // 2) B firma ✗ No Conforme con formulario (motivo + fotos)
  const nc = await request(app).post(`/truekes/${t2}/cierre`).set('Authorization', `Bearer ${tokB}`).send({
    lado: 'A', conforme: false, motivo: 'El objeto llegó dañado',
    fotos: [{ data: PNG_1x1, mime: 'image/png' }, { data: PNG_1x1, mime: 'image/png' }],
    ...(await firmaAccionDe(walletB, 'cerrar trueque')),
  });
  assert.equal(nc.status, 200, JSON.stringify(nc.body));
  assert.equal(nc.body.disputa.estado, 'REPORTADA');
  assert.equal(nc.body.trueke.estado, 'EN_DISPUTA');

  // evidencias del reclamante guardadas
  const det1 = await request(app).get(`/disputas/${nc.body.disputa.id}`).set('Authorization', `Bearer ${tokB}`);
  assert.equal(det1.status, 200);
  assert.equal(det1.body.evidencias.filter((e) => e.tipo === 'RECLAMO').length, 2);

  // 2) padrón de socios para la votación (BD: tipo SOCIO; prod: on-chain)
  almacen.crearUsuario({ wallet: wS1, tipo: 'SOCIO', estado: 'CERTIFICADO', nivel: 'SOCIO', medalla: 'ORO' });
  almacen.crearUsuario({ wallet: wS2, tipo: 'SOCIO', estado: 'CERTIFICADO', nivel: 'SOCIO', medalla: 'ORO' });

  // 3) la contraparte CONFORME carga su justificativo con fotos → EN_VOTACION
  const tokA = sesionDe(walletA);
  const jus = await request(app).post(`/disputas/${nc.body.disputa.id}/justificativo`).set('Authorization', `Bearer ${tokA}`)
    .send({ fotos: [{ data: PNG_1x1, mime: 'image/png' }] });
  assert.equal(jus.status, 200, JSON.stringify(jus.body));
  assert.equal(jus.body.disputa.estado, 'EN_VOTACION');
  const tTras = await request(app).get(`/truekes/${t2}`).set('Authorization', `Bearer ${tokB}`);
  assert.equal(tTras.body.trueke.estado, 'RESOLUCION_SOCIOS');

  // 4) un Socio que es PARTE del trueke no puede votar (punto 4 del director).
  //    A es parte; la subimos al padrón como SOCIO para verificar la exclusión.
  await almacen.actualizarUsuario(wA, { tipo: 'SOCIO', nivel: 'SOCIO', medalla: 'ORO' });
  const votoParte = await request(app).post(`/disputas/${nc.body.disputa.id}/votar`).set('Authorization', `Bearer ${tokA}`).send({ voto: 'VALIDO' });
  assert.equal(votoParte.status, 403);
  assert.equal(votoParte.body.error, 'socio_involucrado');

  // 5) los socios votan → al votar todos los elegibles, veredicto inmediato (mayoría simple)
  const tS1 = sesionDe(walletS1);
  const tS2 = sesionDe(walletS2);
  const v1 = await request(app).post(`/disputas/${nc.body.disputa.id}/votar`).set('Authorization', `Bearer ${tS1}`).send({ voto: 'VALIDO' });
  assert.equal(v1.status, 200, JSON.stringify(v1.body));
  assert.equal(v1.body.disputa.estado, 'EN_VOTACION'); // falta el 2º voto
  const v2 = await request(app).post(`/disputas/${nc.body.disputa.id}/votar`).set('Authorization', `Bearer ${tS2}`).send({ voto: 'VALIDO' });
  assert.equal(v2.status, 200, JSON.stringify(v2.body));
  assert.equal(v2.body.disputa.estado, 'RESUELTA');
  assert.equal(v2.body.disputa.veredicto, 'VALIDO');

  // el trueke quedó COMPLETADO (liberación en cruz)
  const final = await request(app).get(`/truekes/${t2}`).set('Authorization', `Bearer ${tokB}`);
  assert.equal(final.body.trueke.estado, 'COMPLETADO');

  // 6) notificaciones: veredicto a los involucrados y aviso de votación a socios
  const notifB = await request(app).get('/notificaciones').set('Authorization', `Bearer ${tokB}`);
  assert.equal(notifB.status, 200);
  assert.ok(notifB.body.notificaciones.some((n) => n.tipo === 'VEREDICTO'), 'B debe tener la notificación de veredicto');
  const notifS1 = await request(app).get('/notificaciones').set('Authorization', `Bearer ${tS1}`);
  assert.ok(notifS1.body.notificaciones.some((n) => n.tipo === 'VOTACION_ABIERTA'), 'S1 debe tener el aviso de votación');

  // doble voto → 409
  const v3 = await request(app).post(`/disputas/${nc.body.disputa.id}/votar`).set('Authorization', `Bearer ${tS1}`).send({ voto: 'ANULAR' });
  assert.equal(v3.status, 409);
});

test('disputa: contraparte conforme previa → ESPERA_JUSTIFICATIVO; vence 3 días sin justificativo → ANULA (falla a favor del reclamante)', async () => {
  const t1 = await crearTruekeCustodiado();
  const tokA = sesionDe(walletA);
  const tokB = sesionDe(walletB);

  // A (usuarioB/contraparte) firma Conforme primero
  const conf = await request(app).post(`/truekes/${t1}/cierre`).set('Authorization', `Bearer ${tokA}`).send({
    lado: 'B', conforme: true, ...(await firmaAccionDe(walletA, 'cerrar trueque')),
  });
  assert.equal(conf.status, 200);

  // B (usuarioA) declara No Conforme → como la contraparte ya está CONFORME → ESPERA_JUSTIFICATIVO
  const nc = await request(app).post(`/truekes/${t1}/cierre`).set('Authorization', `Bearer ${tokB}`).send({
    lado: 'A', conforme: false, motivo: 'No coincide la descripción',
    fotos: [{ data: PNG_1x1, mime: 'image/png' }],
    ...(await firmaAccionDe(walletB, 'cerrar trueque')),
  });
  assert.equal(nc.status, 200, JSON.stringify(nc.body));
  assert.equal(nc.body.disputa.estado, 'ESPERA_JUSTIFICATIVO');
  assert.ok(nc.body.disputa.justificativoVenceAt, 'debe tener plazo de justificativo');

  // notificación PEDIDO_JUSTIFICATIVO a la contraparte (A)
  const notifA = await request(app).get('/notificaciones').set('Authorization', `Bearer ${tokA}`);
  assert.ok(notifA.body.notificaciones.some((n) => n.tipo === 'PEDIDO_JUSTIFICATIVO'));

  // simular vencimiento de 3 días → el GET resuelve: falla a favor del reclamante (ANULAR)
  await almacen.actualizarDisputa(nc.body.disputa.id, {
    justificativoVenceAt: new Date(Date.now() - 1000).toISOString(),
  });
  const lista = await request(app).get('/disputas').set('Authorization', `Bearer ${tokB}`);
  const resuelta = lista.body.disputas.find((d) => d.id === nc.body.disputa.id);
  assert.equal(resuelta.estado, 'RESUELTA');
  assert.equal(resuelta.veredicto, 'ANULAR');
  const tFinal = await request(app).get(`/truekes/${t1}`).set('Authorization', `Bearer ${tokB}`);
  assert.equal(tFinal.body.trueke.estado, 'ANULADO');
});

test('disputa: ambas partes No Conformes → EN_VOTACION directo; mayoría ANULAR → devolución total', async () => {
  const t3 = await crearTruekeCustodiado();
  const tokA = sesionDe(walletA);
  const tokB = sesionDe(walletB);

  // B (usuarioA) declara No Conforme primero
  const nc = await request(app).post(`/truekes/${t3}/cierre`).set('Authorization', `Bearer ${tokB}`).send({
    lado: 'A', conforme: false, motivo: 'No recibí mi parte',
    fotos: [{ data: PNG_1x1, mime: 'image/png' }],
    ...(await firmaAccionDe(walletB, 'cerrar trueque')),
  });
  assert.equal(nc.status, 200);
  assert.equal(nc.body.disputa.estado, 'REPORTADA');

  // A declara también No Conforme → ambas con evidencia → EN_VOTACION directo (sin ESPERA_JUSTIFICATIVO)
  const nc2 = await request(app).post(`/disputas/${nc.body.disputa.id}/no-conforme`).set('Authorization', `Bearer ${tokA}`).send({
    motivo: 'A mí tampoco me llegó lo acordado',
    fotos: [{ data: PNG_1x1, mime: 'image/png' }],
  });
  assert.equal(nc2.status, 200, JSON.stringify(nc2.body));
  assert.equal(nc2.body.disputa.estado, 'EN_VOTACION');

  // socios votan ANULAR (2/2) → veredicto ANULAR → trueke ANULADO (devolución total)
  const tS1 = sesionDe(walletS1);
  const tS2 = sesionDe(walletS2);
  const v1 = await request(app).post(`/disputas/${nc.body.disputa.id}/votar`).set('Authorization', `Bearer ${tS1}`).send({ voto: 'ANULAR' });
  assert.equal(v1.status, 200, JSON.stringify(v1.body));
  const v2 = await request(app).post(`/disputas/${nc.body.disputa.id}/votar`).set('Authorization', `Bearer ${tS2}`).send({ voto: 'ANULAR' });
  assert.equal(v2.status, 200, JSON.stringify(v2.body));
  assert.equal(v2.body.disputa.estado, 'RESUELTA');
  assert.equal(v2.body.disputa.veredicto, 'ANULAR');
  const final = await request(app).get(`/truekes/${t3}`).set('Authorization', `Bearer ${tokB}`);
  assert.equal(final.body.trueke.estado, 'ANULADO');

  // acceso del Socio a la votación (con pruebas de ambas partes)
  const votaciones = await request(app).get('/disputas/votaciones').set('Authorization', `Bearer ${tS1}`);
  assert.equal(votaciones.status, 200);
  const resuelta = votaciones.body.votaciones.find((v) => v.id === nc.body.disputa.id);
  assert.ok(resuelta);
  assert.ok(resuelta.evidencias.some((e) => e.tipo === 'RECLAMO'));
  assert.ok(resuelta.miVoto === 'ANULAR');
});

test('admin: un Socio del padrón (sin rol OWNER) NO accede a /admin/* (endurecimiento Sistemas)', async () => {
  // Ana es SOCIO pero NO el Owner → 403 en TODAS las rutas admin (RF-13.1)
  const walletSocio = ethers.Wallet.createRandom();
  const wSocio = walletSocio.address.toLowerCase();
  almacen.crearUsuario({ wallet: wSocio, tipo: 'SOCIO', nivel: 'SOCIO', medalla: 'ORO', estado: 'CERTIFICADO' });
  const token = sesionDe(walletSocio);

  for (const ruta of ['/admin/db', '/admin/contratos', '/admin/kpis-disputas', '/admin/usuarios', '/admin/infra/health']) {
    const r = await request(app).get(ruta).set('Authorization', `Bearer ${token}`);
    assert.equal(r.status, 403, `${ruta} debe rechazar a un Socio no-Owner`);
    assert.equal(r.body.error, 'solo_owner', ruta);
  }

  // GET /admin/owner es público: devuelve la wallet del Owner (sin exponer PII)
  const o = await request(app).get('/admin/owner');
  assert.equal(o.status, 200);
  assert.equal(o.body.owner, wOwner.toLowerCase());
});

