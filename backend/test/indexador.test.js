// =============================================================================
// TrueKeate — Tests del indexador (Ciclo 4)
// Se validan: mapeo de eventos → SQL, idempotencia por (tx_hash, log_index),
// checkpoints y métricas de lag. Se usa un pool en memoria (sin PostgreSQL).
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ethers } from 'ethers';
import { Indexador } from '../indexador.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scRoot = join(__dirname, '../../sc');

/** Pool en memoria: simula las tablas usadas por el indexador. */
function crearPoolMemoria() {
  const db = {
    auditoria: new Set(), // claves "tx:log:entidad"
    truekes: new Map(),   // escrow_id -> {estado,...}
    indexador_checkpoint: new Map(),
  };
  const query = async (sql, params = []) => {
    if (sql.includes('INSERT INTO auditoria')) {
      const key = `${params[3]}:${params[5]}:${params[0]}`;
      const before = db.auditoria.size;
      db.auditoria.add(key);
      return { rowCount: db.auditoria.size > before ? 1 : 0 };
    }
    if (sql.includes('SELECT 1 FROM auditoria')) {
      const key = `${params[0]}:${params[1]}:${params[2]}`;
      return { rowCount: db.auditoria.has(key) ? 1 : 0 };
    }
    if (sql.includes('INSERT INTO truekes')) {
      db.truekes.set(params[0].toString(), { estado: 'CREADO', tx: params[3] });
      return { rowCount: 1 };
    }
    if (/UPDATE truekes SET (estado|apertura_)/i.test(sql)) {
      const id = params[0].toString();
      if (!db.truekes.has(id)) return { rowCount: 0 };
      db.truekes.get(id).estado = params[1];
      return { rowCount: 1 };
    }
    if (/INSERT INTO indexador_checkpoint/i.test(sql)) {
      db.indexador_checkpoint.set(params[0], params[1]);
      return { rowCount: 1 };
    }
    if (/SELECT\s+ultimo_bloque/i.test(sql)) {
      const v = db.indexador_checkpoint.get(params[0]);
      return { rowCount: v !== undefined ? 1 : 0, rows: v !== undefined ? [{ ultimo_bloque: v }] : [] };
    }
    if (sql.includes('SELECT COUNT(*)')) {
      return { rows: [{ n: db.truekes.size, mas_antiguo: null }] };
    }
    return { rowCount: 0, rows: [] };
  };
  return { db, query };
}

function cargarAbi(nombre) {
  const p = join(scRoot, `out/${nombre}.sol/${nombre}.json`);
  return JSON.parse(readFileSync(p, 'utf-8')).abi;
}

/** Proveedor mock: devuelve logs fabricados. */
function proveedorMock(logs) {
  return {
    _logs: logs,
    async getLogs() { return this._logs; },
    async getBlockNumber() { return 100; },
  };
}

function fabricarLog(entidad, abi, evento, args, txHash = '0x' + 'a'.repeat(64), index = 0, block = 10) {
  const iface = new ethers.Interface(abi);
  const parsed = iface.encodeEventLog(iface.getEvent(evento).format('sighash'), args);
  return {
    address: '0x' + '1'.repeat(40),
    topics: parsed.topics,
    data: parsed.data,
    transactionHash: txHash,
    index,
    blockNumber: block,
    args: iface.parseLog({ topics: parsed.topics, data: parsed.data }).args,
  };
}

function setupContratos() {
  const escrowAbi = cargarAbi('Escrow');
  const brltAbi = cargarAbi('BRLT');
  const suscAbi = cargarAbi('SuscripcionEmpresa');
  return {
    Escrow: { direccion: '0x' + '1'.repeat(40), abi: escrowAbi },
    BRLT: { direccion: '0x' + '2'.repeat(40), abi: brltAbi },
    SuscripcionEmpresa: { direccion: '0x' + '3'.repeat(40), abi: suscAbi },
  };
}

// ---------------------------------------------------------------------------
test('mapea TruekeCreado → INSERT truekes estado CREADO', async () => {
  const pool = crearPoolMemoria();
  const contratos = setupContratos();
  const log = fabricarLog('Escrow', contratos.Escrow.abi, 'TruekeCreado',
    [0n, '0x' + 'a'.repeat(40), '0x' + 'b'.repeat(40), '0x' + '1'.repeat(40), '0x' + '2'.repeat(40), 3600n]);
  const idx = new Indexador({ provider: proveedorMock([]), pool, contratos });

  const ok = await idx.procesarLog('Escrow', log);
  assert.equal(ok, true);
  assert.equal(pool.db.truekes.get('0').estado, 'CREADO');
  assert.equal(pool.db.auditoria.size, 1, 'evento registrado en auditoría');
});

test('idempotencia: el mismo evento no se re-aplica (UNIQUE tx/log/entidad)', async () => {
  const pool = crearPoolMemoria();
  const contratos = setupContratos();
  const log = fabricarLog('Escrow', contratos.Escrow.abi, 'TruekeCreado',
    [0n, '0x' + 'a'.repeat(40), '0x' + 'b'.repeat(40), '0x' + '1'.repeat(40), '0x' + '2'.repeat(40), 3600n]);
  const idx = new Indexador({ provider: proveedorMock([]), pool, contratos });

  await idx.procesarLog('Escrow', log);
  const segunda = await idx.procesarLog('Escrow', log);
  assert.equal(segunda, false, 'segunda aplicación omitida');
  assert.equal(pool.db.auditoria.size, 1, 'sin duplicados en auditoría');
});

test('mapea CustodiaA/CustodiaB → estado CUSTODIADO y Completado → COMPLETADO', async () => {
  const pool = crearPoolMemoria();
  const contratos = setupContratos();
  const idx = new Indexador({ provider: proveedorMock([]), pool, contratos });
  const abi = contratos.Escrow.abi;

  const creado = fabricarLog('Escrow', abi, 'TruekeCreado',
    [1n, '0x' + 'a'.repeat(40), '0x' + 'b'.repeat(40), '0x' + '1'.repeat(40), '0x' + '2'.repeat(40), 3600n], '0x' + '1'.repeat(64), 0);
  await idx.procesarLog('Escrow', creado);

  const custodia = fabricarLog('Escrow', abi, 'CustodiaA', [1n], '0x' + '2'.repeat(64), 0);
  await idx.procesarLog('Escrow', custodia);
  assert.equal(pool.db.truekes.get('1').estado, 'CUSTODIADO');

  const completado = fabricarLog('Escrow', abi, 'TruekeCompletado', [1n], '0x' + '3'.repeat(64), 0);
  await idx.procesarLog('Escrow', completado);
  assert.equal(pool.db.truekes.get('1').estado, 'COMPLETADO');
  assert.equal(pool.db.auditoria.size, 3);
});

test('barrerDesde actualiza checkpoint y métricas de lag', async () => {
  const pool = crearPoolMemoria();
  const contratos = setupContratos();
  const abi = contratos.Escrow.abi;
  const log = fabricarLog('Escrow', abi, 'TruekeCreado',
    [5n, '0x' + 'a'.repeat(40), '0x' + 'b'.repeat(40), '0x' + '1'.repeat(40), '0x' + '2'.repeat(40), 3600n]);
  const provider = proveedorMock([log]);
  const idx = new Indexador({ provider, pool, contratos });

  const ultimo = await idx.barrerDesde('Escrow', 0);
  assert.equal(ultimo, 100, 'checkpoint = último bloque');
  assert.equal(pool.db.indexador_checkpoint.get('Escrow'), 100);
  assert.equal(pool.db.truekes.get('5').estado, 'CREADO');

  const metrics = await idx.metricasLag();
  assert.equal(metrics.cabeza, 100);
  assert.equal(metrics.lag.Escrow, 0);
});

test('no falla ante evento de contrato desconocido', async () => {
  const pool = crearPoolMemoria();
  const contratos = setupContratos();
  const idx = new Indexador({ provider: proveedorMock([]), pool, contratos });
  const log = { topics: ['0x1234'], data: '0x' };
  const ok = await idx.procesarLog('ContratoInexistente', log);
  assert.equal(ok, false);
});
