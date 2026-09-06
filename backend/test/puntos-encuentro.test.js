// =============================================================================
// TrueKeate — Tests de puntos de encuentro (lógica maestra puntos 5.1 y 7)
//   - POST /puntos-encuentro crea un punto con lat/lng.
//   - GET /puntos-encuentro/favoritos ordena por último uso.
//   - POST /puntos-encuentro/:id/usar registra el favorito (upsert).
//   - La propuesta de encuentro de un trueke registra el punto como usado.
// =============================================================================
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { crearApp } from '../api/app.js';
import { crearAlmacen } from '../api/lib/almacen.js';
import { ethers } from 'ethers';

let app, server, almacen;
const wallet = ethers.Wallet.createRandom();
const w = wallet.address.toLowerCase();
const wallet2 = ethers.Wallet.createRandom();
const w2 = wallet2.address.toLowerCase();

before(async () => {
  almacen = crearAlmacen();
  almacen.crearUsuario({ wallet: w, estado: 'VERIFICADO', nivel: 'COMUN' });
  almacen.crearUsuario({ wallet: w2, estado: 'VERIFICADO', nivel: 'COMUN' });
  almacen.guardarSesion('tok-p1', w);
  almacen.guardarSesion('tok-p2', w2);
  // artículos para el trueque
  const a1 = almacen.crearArticulo({ wallet: w, titulo: 'Bici', rubro: 'Deportes', categoria: 'ARTICULO' });
  const a2 = almacen.crearArticulo({ wallet: w2, titulo: 'Curso', rubro: 'Educacion', categoria: 'SERVICIO' });
  // trueque directo acordado (A=wallet crea con parteB=wallet2)
  const id = almacen.crearTrueke({ usuarioA: w, parteB: w2, articuloAId: a1.id, articuloBId: a2.id });
  almacen.actualizarTrueke(id, { estado: 'CREADO' });
  app = crearApp({ almacen });
  server = app.listen(0);
  await new Promise((res) => server.on('listening', res));
});

after(() => server.close());

test('puntos de encuentro: crear, listar míos, favoritos y usar', async () => {
  // crear punto
  const p = await request(app).post('/puntos-encuentro').set('Authorization', 'Bearer tok-p1')
    .send({ lat: -34.6037, lng: -58.3816, direccion: 'Plaza de Mayo', radioKm: 10 });
  assert.equal(p.status, 201, JSON.stringify(p.body));
  assert.ok(p.body.punto.id);
  assert.equal(Number(p.body.punto.lat.toFixed(4)), -34.6037);

  // coords inválidas
  const bad = await request(app).post('/puntos-encuentro').set('Authorization', 'Bearer tok-p1')
    .send({ lat: 999, lng: 0 });
  assert.equal(bad.status, 400);

  // mis puntos
  const mios = await request(app).get('/puntos-encuentro/mios').set('Authorization', 'Bearer tok-p1');
  assert.equal(mios.status, 200);
  assert.equal(mios.body.puntos.length, 1);

  // favoritos vacíos al inicio
  const fav0 = await request(app).get('/puntos-encuentro/favoritos').set('Authorization', 'Bearer tok-p1');
  assert.equal(fav0.body.favoritos.length, 0);

  // usar el punto → aparece como favorito
  const uso = await request(app).post(`/puntos-encuentro/${p.body.punto.id}/usar`).set('Authorization', 'Bearer tok-p1');
  assert.equal(uso.status, 200);
  assert.ok(uso.body.uso.ultimoUso);

  const fav = await request(app).get('/puntos-encuentro/favoritos').set('Authorization', 'Bearer tok-p1');
  assert.equal(fav.body.favoritos.length, 1);
  assert.equal(fav.body.favoritos[0].puntoId, p.body.punto.id);
});

test('propuesta de encuentro registra el punto como usado (punto 7)', async () => {
  const p = await request(app).post('/puntos-encuentro').set('Authorization', 'Bearer tok-p1')
    .send({ lat: 10.5, lng: -66.9, direccion: 'CCCT Caracas' });
  const puntoId = p.body.punto.id;

  // propone A (parte que gana por desempate → A en empate de nivel/reputación)
  const prop = await request(app).post('/truekes/1/propuesta-encuentro').set('Authorization', 'Bearer tok-p1')
    .send({ puntoEncuentroId: puntoId, horaPautada: '2030-08-01T15:00:00Z' });
  assert.equal(prop.status, 200, JSON.stringify(prop.body));

  const fav = await request(app).get('/puntos-encuentro/favoritos').set('Authorization', 'Bearer tok-p1');
  assert.ok(fav.body.favoritos.some((f) => f.puntoId === puntoId), 'el punto propuesto quedó en favoritos');
});
