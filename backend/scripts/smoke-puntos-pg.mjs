// Smoke del almacén pg: puntos de encuentro con PostGIS real (BD local).
import { Pool } from 'pg';
import { crearAlmacenPg } from '../api/lib/almacen-pg.js';
import { ethers } from 'ethers';

const pool = new Pool({ host: '127.0.0.1', port: 5432, user: 'postgres', database: 'truekeate' });
const almacen = await crearAlmacenPg(pool);
const w = ethers.Wallet.createRandom().address.toLowerCase();

await almacen.crearUsuario({ wallet: w, correo: 'geo@x.com', telefono: '+58', consentimientoGdpr: true, estado: 'VERIFICADO', nivel: 'COMUN' });

const p1 = await almacen.crearPunto({ wallet: w, lat: -34.6037, lng: -58.3816, direccion: 'Plaza de Mayo' });
console.log('punto creado:', JSON.stringify({ id: p1.id, lat: p1.lat, lng: p1.lng, dir: p1.direccion }));
const p2 = await almacen.crearPunto({ wallet: w, lat: 10.5, lng: -66.9, direccion: 'CCCT' });

const uso1 = await almacen.registrarUsoPunto(w, p1.id);
await new Promise((r) => setTimeout(r, 20));
const uso2 = await almacen.registrarUsoPunto(w, p2.id);
console.log('usos:', uso1.puntoId, uso2.puntoId);

const favs = await almacen.listarPuntosFavoritosDe(w);
console.log('favoritos orden:', favs.map((f) => f.puntoId).join(','));
const mios = await almacen.listarPuntosDe(w);
console.log('mis puntos:', mios.length);

// limpieza
await pool.query('DELETE FROM puntos_favoritos WHERE punto_encuentro_id IN ($1,$2)', [p1.id, p2.id]);
await pool.query('DELETE FROM puntos_encuentro WHERE id IN ($1,$2)', [p1.id, p2.id]);
await pool.query('DELETE FROM usuarios WHERE wallet=$1', [w]);
await pool.end();
console.log('SMOKE PUNTOS PG OK');
