// Smoke test del almacén pg (modelo abierto) contra la BD local — no es un test de la suite.
import { Pool } from 'pg';
import { crearAlmacenPg } from '../api/lib/almacen-pg.js';
import { ethers } from 'ethers';

const pool = new Pool({
  host: '127.0.0.1', port: 5432, user: 'postgres', database: 'truekeate',
  connectionTimeoutMillis: 5000,
});
const almacen = await crearAlmacenPg(pool);
const wA = ethers.Wallet.createRandom().address.toLowerCase();
const wB = ethers.Wallet.createRandom().address.toLowerCase();

// usuario A (VERIFICADO, FRECUENTE) y B (VERIFICADO, COMUN)
await almacen.crearUsuario({ wallet: wA, correo: 'a@x.com', telefono: '+58', consentimientoGdpr: true, estado: 'VERIFICADO', nivel: 'FRECUENTE' });
await almacen.crearUsuario({ wallet: wB, correo: 'b@x.com', telefono: '+58', consentimientoGdpr: true, estado: 'VERIFICADO', nivel: 'COMUN' });

const artA = await almacen.crearArticulo({ wallet: wA, titulo: 'Bici', rubro: 'Deportes', categoria: 'ARTICULO' });
const artB = await almacen.crearArticulo({ wallet: wB, titulo: 'Curso', rubro: 'Educacion', categoria: 'SERVICIO' });

// oferta PROPUESTO
const id = await almacen.crearOferta({ usuarioA: wA, articuloAId: artA.id, descripcionRequerida: 'quiero un curso', tipoRequerido: 'SERVICIO' });
const oferta = await almacen.getTrueke(id);
console.log('oferta:', JSON.stringify({ id: oferta.id, estado: oferta.estado, usuarioB: oferta.usuarioB, descripcionRequerida: oferta.descripcionRequerida, tipoRequerido: oferta.tipoRequerido }));

const ofertas = await almacen.listarOfertas();
console.log('ofertas mercado:', ofertas.length);

// acordar
const acordado = await almacen.acordarOferta(id, { usuarioB: wB, articuloBId: artB.id });
console.log('acordado:', JSON.stringify({ estado: acordado.estado, usuarioB: acordado.usuarioB, articuloBId: acordado.articuloBId }));

// propuesta de encuentro vía actualizarTrueke (persistencia de hora/punto)
const prop = await almacen.actualizarTrueke(id, { puntoEncuentroId: 1, horaPautada: '2030-06-01T12:00:00Z' });
console.log('propuesta persistida:', JSON.stringify({ horaPautada: prop.horaPautada, puntoEncuentroId: prop.puntoEncuentroId }));

// cierre conforme A
await almacen.registrarCierre(id, { lado: 'A', conforme: true });
const cierre = await almacen.actualizarTrueke(id, { estado: 'COMPLETADO' });
console.log('cierre:', JSON.stringify({ cierreA: cierre.cierreA, estado: cierre.estado }));

// limpieza
await pool.query('DELETE FROM truekes WHERE id=$1', [id]);
await pool.query('DELETE FROM articulos WHERE id IN ($1,$2)', [artA.id, artB.id]);
await pool.query('DELETE FROM usuarios WHERE wallet IN ($1,$2)', [wA, wB]);
await pool.end();
console.log('SMOKE PG OK');
