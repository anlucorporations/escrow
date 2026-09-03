// =============================================================================
// TrueKeate — Indexador de eventos (listener Node.js propio — D25)
// Fuente: RepoTecnico/arquitectura_tecnica.md §5
//
// Escucha los eventos on-chain de los contratos y actualiza PostgreSQL
// (patrón de lectura impulsada por eventos — RNF-03.2). La blockchain es la
// única fuente de verdad de los estados del escrow (RNF-01.1); el indexador
// NUNCA escribe en cadena.
//
// Garantías (RNF-07.4 / H-16):
//   - Idempotencia por (txHash, logIndex, entidad): constraint UNIQUE en
//     `auditoria`; los eventos ya procesados no se re-aplican.
//   - Checkpoints por contrato (`indexador_checkpoint`) → reproceso desde bloque N.
//   - Reconciliación periódica del estado espejo contra la cadena.
//   - Métricas de lag y endpoint /healthz (D15/RF-18.1, H-17).
// =============================================================================
import { ethers } from 'ethers';

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/postgres';
const CHECKPOINT_STEP = parseInt(process.env.CHECKPOINT_STEP || '50', 10);

/** Mapa de contratos a escuchar: { entidad: { direccion, abi } } (se inyecta por entorno o archivo). */
export class Indexador {
  constructor({ provider, pool, contratos }) {
    this.provider = provider;
    this.pool = pool; // instancia `pg` Pool
    this.contratos = contratos; // { entidad: { direccion, abi } }
    this.procesados = 0;
    this.eventosFallidos = 0;
    this.ultimoCheckpoint = {};
    this.activo = false;
  }

  /** Registra un evento como procesado (idempotente por UNIQUE tx_hash/log_index/entidad). */
  async _registrarProcesado(entidad, evento, log) {
    const payload = JSON.stringify(log.args ?? {}, (_k, v) =>
      typeof v === 'bigint' ? v.toString() : v
    );
    await this.pool.query(
      `INSERT INTO auditoria (entidad, evento, actor, tx_hash, bloque, log_index, payload, procesado, procesado_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,now())
       ON CONFLICT (tx_hash, log_index, entidad) DO NOTHING`,
      [entidad, evento, log.address ?? null, log.transactionHash, log.blockNumber, log.index, payload]
    );
  }

  /** Aplica el evento a la tabla espejo correspondiente. Devuelve las filas afectadas. */
  async _aplicarEvento(entidad, evento, args, log) {
    switch (entidad) {
      case 'Escrow':
        return this._aplicarEscrow(evento, args, log);
      case 'SmartAccount':
        return this._aplicarSmartAccount(evento, args, log);
      case 'SociosRegistry':
        return this._aplicarSociosRegistry(evento, args, log);
      case 'BRLT':
        return this._aplicarBRLT(evento, args, log);
      case 'SuscripcionEmpresa':
        return this._aplicarSuscripcion(evento, args, log);
      default:
        return 0;
    }
  }

  // ------------------------------------------------------------------ Escrow
  async _aplicarEscrow(evento, args, log) {
    if (evento === 'TruekeCreado') {
      const [id, parteA, parteB] = args;
      return (await this.pool.query(
        `INSERT INTO truekes (escrow_id, usuario_a, usuario_b, estado, tx_hash, bloque)
         VALUES ($1,$2,$3,'CREADO',$4,$5)
         ON CONFLICT (escrow_id) DO UPDATE SET estado='CREADO', updated_at=now()`,
        [id.toString(), parteA, parteB, log.transactionHash, log.blockNumber]
      )).rowCount;
    }
    const estados = {
      CustodiaA: 'CUSTODIADO', CustodiaB: 'CUSTODIADO',
      AperturaA: 'APERTURA', AperturaB: 'APERTURA',
      TruekeCompletado: 'COMPLETADO',
      TruekeCancelado: 'ANULADO',
      EscrowBloqueado: 'BLOQUEADO',
    };
    if (estados[evento]) {
      const id = args[0].toString();
      return (await this.pool.query(
        `UPDATE truekes SET estado=$2, updated_at=now() WHERE escrow_id=$1`,
        [id, estados[evento]]
      )).rowCount;
    }
    // AperturaA/B: registrar timestamps (espejo para métricas de ventana — I3)
    if (evento === 'AperturaA' || evento === 'AperturaB') {
      const [id, ts] = args;
      const col = evento === 'AperturaA' ? 'apertura_a' : 'apertura_b';
      return (await this.pool.query(
        `UPDATE truekes SET ${col}=to_timestamp($2), updated_at=now() WHERE escrow_id=$1`,
        [id.toString(), Number(ts)]
      )).rowCount;
    }
    return 0;
  }

  // ------------------------------------------------------------------ SmartAccount
  async _aplicarSmartAccount(evento, args, log) {
    if (evento === 'MerkleRootActualizado') {
      const [root] = args; // root, estado
      return (await this.pool.query(
        `UPDATE kyc SET merkle_root=$1 WHERE usuario_id IN
           (SELECT id FROM usuarios WHERE smart_account=$2)`,
        [Buffer.from(root.slice(2), 'hex'), log.address]
      )).rowCount;
    }
    if (evento === 'OwnerActualizado' || evento === 'RecuperacionEjecutada') {
      const nuevoOwner = args[0];
      return (await this.pool.query(
        `UPDATE usuarios SET wallet=$1 WHERE smart_account=$2`,
        [nuevoOwner, log.address]
      )).rowCount;
    }
    return 0;
  }

  // ------------------------------------------------------------------ SociosRegistry
  async _aplicarSociosRegistry(evento, args) {
    if (evento === 'SocioAdmitido') {
      const [socio] = args;
      return (await this.pool.query(
        `UPDATE usuarios SET tipo='SOCIO', updated_at=now() WHERE wallet=$1`,
        [socio]
      )).rowCount;
    }
    return 0;
  }

  // ------------------------------------------------------------------ BRLT
  async _aplicarBRLT(evento, args) {
    if (evento === 'EmisionRegistrada') {
      const [, monto] = args; // id, monto, proposito, destino
      return (await this.pool.query(
        `UPDATE finanzas SET brlt = COALESCE(brlt,0) + $1, updated_at=now()
         WHERE usuario_id IN (SELECT id FROM usuarios WHERE tipo='SOCIO' LIMIT 1)`,
        [monto.toString()]
      )).rowCount;
    }
    return 0;
  }

  // ------------------------------------------------------------------ SuscripcionEmpresa
  async _aplicarSuscripcion(evento, args, log) {
    if (evento === 'Suscrita') {
      const [empresa, montoBloqueado, cicloInicio] = args;
      return (await this.pool.query(
        `INSERT INTO suscripciones (empresa_id, monto, ciclo_inicio, ciclo_fin, tx_hash, estado)
         VALUES ((SELECT id FROM usuarios WHERE wallet=$1), $2, to_timestamp($3), to_timestamp($3 + 2592000), $4, 'ACTIVA')`,
        [empresa, montoBloqueado.toString(), Number(cicloInicio), log.transactionHash]
      )).rowCount;
    }
    return 0;
  }

  /** Procesa un log: idempotencia → aplicar evento → checkpoint. */
  async procesarLog(entidad, log) {
    const contrato = this.contratos[entidad];
    if (!contrato) return false;
    const iface = new ethers.Interface(contrato.abi);
    const parsed = iface.parseLog({ topics: log.topics, data: log.data });
    if (!parsed) return false;

    // idempotencia: si ya existe en auditoria, se omite
    const existe = await this.pool.query(
      `SELECT 1 FROM auditoria WHERE tx_hash=$1 AND log_index=$2 AND entidad=$3`,
      [log.transactionHash, log.index, entidad]
    );
    if (existe.rowCount > 0) return false;

    try {
      await this._aplicarEvento(entidad, parsed.name, parsed.args, log);
      await this._registrarProcesado(entidad, parsed.name, log);
      this.procesados++;
      return true;
    } catch (e) {
      this.eventosFallidos++;
      console.error(`[indexador] fallo ${entidad}.${parsed.name} @${log.blockNumber}:`, e.message);
      return false;
    }
  }

  /** Barrido de eventos desde un bloque inicial (reproceso desde bloque N — RNF-07.4). */
  async barrerDesde(entidad, desdeBloque) {
    const contrato = this.contratos[entidad];
    const iface = new ethers.Interface(contrato.abi);
    const filtros = iface.fragments
      .filter((f) => f.type === 'event')
      .map((f) => f.topicHash); // ethers v6: hash 0x…32 bytes (format('sighash') devolvía el nombre en v6)
    const direccion = contrato.direccion;

    for (const topic0 of filtros) {
      const eventos = await this.provider.getLogs({
        address: direccion,
        topics: [topic0],
        fromBlock: desdeBloque,
        toBlock: 'latest',
      });
      for (const log of eventos) {
        await this.procesarLog(entidad, log);
      }
    }
    // actualizar checkpoint
    const ultimo = await this.provider.getBlockNumber();
    await this.pool.query(
      `INSERT INTO indexador_checkpoint (contrato, ultimo_bloque, updated_at)
       VALUES ($1,$2,now())
       ON CONFLICT (contrato) DO UPDATE SET ultimo_bloque=$2, updated_at=now()`,
      [entidad, ultimo]
    );
    this.ultimoCheckpoint[entidad] = ultimo;
    return ultimo;
  }

  /** Reconciliación periódica: compara estado espejo contra la cadena (RNF-01.1). */
  async reconciliar(entidad) {
    // En este ciclo se implementa el barrido; la reconciliación fina de cada trueke
    // (leer estado on-chain vs espejo) se completa en C8 con los getters del escrow.
    const rows = await this.pool.query(
      `SELECT COUNT(*)::int AS n, MIN(updated_at) AS mas_antiguo FROM truekes`
    );
    return { espejo: rows.rows[0] };
  }

  /** Métricas de lag (H-17): bloques pendientes por contrato. */
  async metricasLag() {
    const cabeza = await this.provider.getBlockNumber();
    const lag = {};
    for (const [entidad] of Object.entries(this.contratos)) {
      const cp = await this.pool.query(
        `SELECT ultimo_bloque FROM indexador_checkpoint WHERE contrato=$1`,
        [entidad]
      );
      const ultimo = cp.rowCount > 0 && cp.rows.length > 0 ? cp.rows[0].ultimo_bloque : 0;
      lag[entidad] = Math.max(0, cabeza - Number(ultimo));
    }
    return { cabeza, lag, procesados: this.procesados, fallidos: this.eventosFallidos };
  }
}

/** Crea una instancia con las variables de entorno estándar del workspace. */
export async function crearIndexador(pool, contratos) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const idx = new Indexador({ provider, pool, contratos });
  return idx;
}
