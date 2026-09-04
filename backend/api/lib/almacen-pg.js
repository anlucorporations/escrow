// =============================================================================
// TrueKeate — Almacén híbrido con persistencia PostgreSQL (integración GCP)
// =============================================================================
// Misma interfaz que `crearAlmacen()` (memoria) pero persistiendo en la BD
// off-chain (Cloud SQL) los datos que el control de acceso necesita:
//   - usuarios (inscripción formal + escalera D28)  → tabla `usuarios`
//   - kyc (trámite de verificación)                  → tabla `kyc`
//   - articulos (catálogo observable)                → tabla `articulos`
// El resto (truekes espejo, encargos, sesiones en memoria) mantiene el
// comportamiento del Ciclo 6; los truekes los escribe el indexador en `truekes`.
//
// Uso: const almacen = await crearAlmacenPg(pool);   // pool pg ya conectado
// =============================================================================
import { crearAlmacen } from './almacen.js';

const NORMALIZA_WALLET = (w) => (w || '').toLowerCase();

function filaAUsuario(f) {
  if (!f) return null;
  return {
    wallet: (f.wallet || '').trim().toLowerCase(),
    correo: f.correo ?? null,
    telefono: f.telefono ?? null,
    direccionInscripcion: f.direccion_inscripcion ?? null,
    tipo: f.tipo,
    nivel: f.nivel,
    medalla: f.medalla,
    estado: f.estado, // escalera D28: INSCRITO / VERIFICADO / CERTIFICADO
    consentimientoGdpr: Boolean(f.consentimiento_gdpr),
    consentimientoFecha: f.consentimiento_fecha ?? null,
    smartAccount: f.smart_account ? f.smart_account.trim().toLowerCase() : null,
    createdAt: f.created_at ? f.created_at.toISOString() : new Date().toISOString(),
    updatedAt: f.updated_at ? f.updated_at.toISOString() : null,
  };
}

export async function crearAlmacenPg(pool) {
  const base = crearAlmacen(); // resto de colecciones en memoria

  return {
    // ------------------------------------------------------------ usuarios
    async crearUsuario(usuario) {
      const wallet = NORMALIZA_WALLET(usuario.wallet);
      const r = await pool.query(
        `INSERT INTO usuarios
           (wallet, correo, telefono, direccion_inscripcion, tipo, nivel, medalla, estado,
            consentimiento_gdpr, consentimiento_fecha, smart_account)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),$10)
         ON CONFLICT (wallet) DO UPDATE SET
           correo=EXCLUDED.correo, telefono=EXCLUDED.telefono,
           direccion_inscripcion=EXCLUDED.direccion_inscripcion,
           tipo=EXCLUDED.tipo, nivel=EXCLUDED.nivel, medalla=EXCLUDED.medalla,
           estado=EXCLUDED.estado, consentimiento_gdpr=EXCLUDED.consentimiento_gdpr,
           consentimiento_fecha=now(), updated_at=now()
         RETURNING *`,
        [
          wallet,
          usuario.correo ?? null,
          usuario.telefono ?? null,
          usuario.direccionInscripcion ?? null,
          usuario.tipo ?? 'PARTICULAR',
          usuario.nivel ?? 'INICIADO',
          usuario.medalla ?? 'BRONCE',
          usuario.estado ?? 'INSCRITO',
          usuario.consentimientoGdpr ?? false,
          usuario.smartAccount ? usuario.smartAccount.toLowerCase() : null,
        ]
      );
      return filaAUsuario(r.rows[0]);
    },

    async getUsuario(wallet) {
      const r = await pool.query(
        `SELECT * FROM usuarios WHERE wallet = $1`,
        [NORMALIZA_WALLET(wallet)]
      );
      return filaAUsuario(r.rows[0] ?? null);
    },

    async actualizarUsuario(wallet, cambios) {
      const actual = await pool.query(`SELECT * FROM usuarios WHERE wallet=$1`, [NORMALIZA_WALLET(wallet)]);
      if (actual.rowCount === 0) return null;
      const u = filaAUsuario(actual.rows[0]);
      const n = { ...u, ...cambios };
      const r = await pool.query(
        `UPDATE usuarios SET
           correo=$2, telefono=$3, direccion_inscripcion=$4, tipo=$5, nivel=$6,
           medalla=$7, estado=$8, consentimiento_gdpr=$9, smart_account=$10, updated_at=now()
         WHERE wallet=$1 RETURNING *`,
        [
          NORMALIZA_WALLET(wallet),
          n.correo ?? null,
          n.telefono ?? null,
          n.direccionInscripcion ?? null,
          n.tipo ?? 'PARTICULAR',
          n.nivel ?? 'INICIADO',
          n.medalla ?? 'BRONCE',
          n.estado ?? 'INSCRITO',
          n.consentimientoGdpr ?? false,
          n.smartAccount ? n.smartAccount.toLowerCase() : null,
        ]
      );
      return filaAUsuario(r.rows[0] ?? null);
    },

    async listarUsuarios() {
      const r = await pool.query(`SELECT * FROM usuarios ORDER BY id`);
      return r.rows.map(filaAUsuario);
    },

    // ------------------------------------------------------------ kyc
    async initKyc(wallet) {
      const u = await this.getUsuario(wallet);
      if (!u) return null;
      const r = await pool.query(
        `INSERT INTO kyc (usuario_id, estado, updated_at)
         VALUES ((SELECT id FROM usuarios WHERE wallet=$1), 'PENDIENTE', now())
         ON CONFLICT DO NOTHING
         RETURNING id, estado`,
        [NORMALIZA_WALLET(wallet)]
      );
      return r.rowCount > 0 ? { wallet: NORMALIZA_WALLET(wallet), estado: 'PENDIENTE', etapa: 0 } : this.getKyc(wallet);
    },

    async getKyc(wallet) {
      const r = await pool.query(
        `SELECT k.id, k.estado, k.revisado_por, k.created_at, u.wallet
           FROM kyc k JOIN usuarios u ON u.id = k.usuario_id
          WHERE u.wallet = $1 ORDER BY k.id DESC LIMIT 1`,
        [NORMALIZA_WALLET(wallet)]
      );
      if (r.rowCount === 0) return null;
      const k = r.rows[0];
      return {
        wallet: k.wallet.trim().toLowerCase(),
        estado: k.estado,
        revisadoPor: k.revisado_por ? k.revisado_por.trim().toLowerCase() : null,
        createdAt: k.created_at ? k.created_at.toISOString() : null,
      };
    },

    async actualizarKyc(wallet, cambios) {
      const k = await this.getKyc(wallet);
      if (!k) return null;
      const cols = [];
      const vals = [];
      if (cambios.estado) { cols.push('estado'); vals.push(cambios.estado); }
      if (cambios.revisadoPor) { cols.push('revisado_por'); vals.push(NORMALIZA_WALLET(cambios.revisadoPor)); }
      if (cols.length === 0) return k;
      cols.push('updated_at');
      vals.push(new Date().toISOString());
      await pool.query(
        `UPDATE kyc SET ${cols.map((c, i) => `${c}=$${i + 2}`).join(', ')}
          WHERE usuario_id = (SELECT id FROM usuarios WHERE wallet=$1)`,
        [NORMALIZA_WALLET(wallet), ...vals]
      );
      return this.getKyc(wallet);
    },

    // ------------------------------------------------------------ catálogo (persistido)
    async crearArticulo(a) {
      const r = await pool.query(
        `INSERT INTO articulos (usuario_id, titulo, descripcion, rubro, disponible)
         VALUES ((SELECT id FROM usuarios WHERE wallet=$1), $2, $3, $4, $5)
         RETURNING id, titulo, rubro, disponible, created_at`,
        [NORMALIZA_WALLET(a.usuarioId ?? a.wallet ?? ''), a.titulo ?? '', a.descripcion ?? null, a.rubro ?? '', a.disponible ?? true]
      );
      const f = r.rows[0];
      return { id: f.id, titulo: f.titulo, rubro: f.rubro, disponible: f.disponible, createdAt: f.created_at.toISOString() };
    },

    async listarArticulos() {
      const r = await pool.query(
        `SELECT a.id, a.titulo, a.descripcion, a.rubro, a.disponible, a.created_at,
                u.wallet AS usuario_wallet, u.nivel AS usuario_nivel
           FROM articulos a JOIN usuarios u ON u.id = a.usuario_id
          WHERE a.disponible = TRUE
          ORDER BY a.created_at DESC`
      );
      return r.rows.map((f) => ({
        id: f.id,
        titulo: f.titulo,
        descripcion: f.descripcion ?? '',
        rubro: f.rubro,
        disponible: f.disponible,
        createdAt: f.created_at.toISOString(),
        usuarioWallet: f.usuario_wallet.trim().toLowerCase(),
        usuarioNivel: f.usuario_nivel,
      }));
    },

    /** Marca un artículo como no disponible (lo retira del catálogo público). */
    async despublicarArticulo(id) {
      const r = await pool.query(
        `UPDATE articulos SET disponible = FALSE, updated_at = now() WHERE id = $1 RETURNING id`,
        [Number(id)]
      );
      return r.rowCount > 0;
    },

    // ------------------------------------------------------------ truekes (persistido)
    // Los trueques creados por la API se persisten con escrow_id NEGATIVO
    // sintético (-1, -2…) para NO colisionar con los escrow_ids positivos que
    // escribe el indexador desde la cadena (RNF-01.1). Cuando la integración
    // on-chain profunda cree el escrow real, su evento TruekeCreado insertará la
    // fila positiva correspondiente.
    async crearTrueke(t) {
      const walletA = NORMALIZA_WALLET(t.usuarioA ?? t.wallet ?? '');
      const walletB = NORMALIZA_WALLET(t.parteB ?? t.usuarioB ?? '');
      const r = await pool.query(
        `INSERT INTO truekes (escrow_id, articulo_a_id, articulo_b_id, usuario_a, usuario_b,
                              estado, hora_pautada)
         VALUES ((SELECT COALESCE(MIN(escrow_id), 0) - 1 FROM truekes WHERE escrow_id < 0),
                 $1, $2, $3, $4, 'CREADO', $5)
         RETURNING id, escrow_id, usuario_a, usuario_b, estado, hora_pautada, updated_at`,
        [
          t.articuloAId ?? t.articulo_a_id ?? null,
          t.articuloBId ?? t.articulo_b_id ?? null,
          walletA,
          walletB,
          t.horaPautada ? new Date(t.horaPautada).toISOString() : null,
        ]
      );
      const f = r.rows[0];
      return Number(f.id);
    },

    async getTrueke(id) {
      const r = await pool.query(
        `SELECT t.*, aa.titulo AS titulo_a, ab.titulo AS titulo_b
           FROM truekes t
           LEFT JOIN articulos aa ON aa.id = t.articulo_a_id
           LEFT JOIN articulos ab ON ab.id = t.articulo_b_id
          WHERE t.id = $1`,
        [Number(id)]
      );
      return filaATrueke(r.rows[0] ?? null);
    },

    async actualizarTrueke(id, cambios) {
      const actual = await this.getTrueke(Number(id));
      if (!actual) return null;
      const estadosValidos = ['CREADO','ACTIVO','CUSTODIADO','APERTURA','EN_DISPUTA',
        'RESOLUCION_SOCIOS','COMPLETADO','ANULADO','BLOQUEADO'];
      const estado = cambios.estado && estadosValidos.includes(cambios.estado) ? cambios.estado : actual.estado;
      const r = await pool.query(
        `UPDATE truekes SET estado=$2, updated_at=now() WHERE id=$1 RETURNING *`,
        [Number(id), estado]
      );
      if (r.rowCount === 0) return null;
      // Campos adicionales (firmas/valoraciones) se guardan en el payload de la fila
      const f = r.rows[0];
      const fila = filaATrueke(f);
      return { ...fila, ...cambios, estado };
    },

    async contarTruekes() {
      const r = await pool.query(`SELECT count(*)::int AS n FROM truekes`);
      return r.rows[0].n;
    },

    async listarTruekes() {
      const r = await pool.query(
        `SELECT t.*, aa.titulo AS titulo_a, ab.titulo AS titulo_b
           FROM truekes t
           LEFT JOIN articulos aa ON aa.id = t.articulo_a_id
           LEFT JOIN articulos ab ON ab.id = t.articulo_b_id
          ORDER BY t.id`
      );
      return r.rows.map(filaATrueke);
    },

    // ------------------------------------------------------------ finanzas (persistido)
    async getFinanzas(wallet) {
      const r = await pool.query(
        `SELECT f.* FROM finanzas f JOIN usuarios u ON u.id = f.usuario_id WHERE u.wallet = $1`,
        [NORMALIZA_WALLET(wallet)]
      );
      if (r.rowCount === 0) return null;
      const f = r.rows[0];
      return {
        wallet: NORMALIZA_WALLET(wallet),
        nftsStock: f.nfts_stock ?? {},
        criptos: f.criptos ?? {},
        brlt: Number(f.brlt ?? 0),
        fondoValor: Number(f.fondo_valor ?? 0),
        porcentajesConfig: f.porcentajes_config,
        updatedAt: f.updated_at ? f.updated_at.toISOString() : null,
      };
    },

    async asegurarFinanzas(wallet) {
      const existente = await this.getFinanzas(wallet);
      if (existente) return existente;
      await pool.query(
        `INSERT INTO finanzas (usuario_id)
         SELECT id FROM usuarios WHERE wallet = $1
         ON CONFLICT (usuario_id) DO NOTHING`,
        [NORMALIZA_WALLET(wallet)]
      );
      return this.getFinanzas(wallet);
    },

    // ------------------------------------------------------------ disputas (persistido)
    async crearDisputa({ truekeId, solicitante, motivo }) {
      const r = await pool.query(
        `INSERT INTO disputas (trueke_id, solicitante, motivo, estado)
         VALUES ($1, $2, $3, 'ABIERTA')
         RETURNING id, trueke_id, solicitante, motivo, estado, created_at`,
        [Number(truekeId), NORMALIZA_WALLET(solicitante), motivo ?? null]
      );
      await this.actualizarTrueke(Number(truekeId), { estado: 'EN_DISPUTA' });
      const f = r.rows[0];
      return {
        id: Number(f.id),
        truekeId: Number(f.trueke_id),
        solicitante: f.solicitante.trim().toLowerCase(),
        motivo: f.motivo,
        estado: f.estado,
        createdAt: f.created_at.toISOString(),
      };
    },

    async listarDisputas() {
      const r = await pool.query(
        `SELECT d.*, t.usuario_a, t.usuario_b, t.estado AS estado_trueke
           FROM disputas d JOIN truekes t ON t.id = d.trueke_id
          ORDER BY d.id DESC`
      );
      return r.rows.map((f) => ({
        id: Number(f.id),
        truekeId: Number(f.trueke_id),
        solicitante: f.solicitante.trim().toLowerCase(),
        motivo: f.motivo,
        estado: f.estado,
        resolucion: f.resolucion,
        sancion: f.sancion,
        registroVotos: f.registro_votos,
        usuarioA: f.usuario_a.trim().toLowerCase(),
        usuarioB: f.usuario_b.trim().toLowerCase(),
        estadoTrueke: f.estado_trueke,
        createdAt: f.created_at.toISOString(),
      }));
    },

    // ------------------------------------------------------------ sesiones (memoria)
    crearEncargo: base.crearEncargo,
    listarEncargos: base.listarEncargos,
    guardarSesion: base.guardarSesion,
    getSesion: base.getSesion,
  };
}

/** Convierte una fila de truekes (con joins) al objeto del router. */
function filaATrueke(f) {
  if (!f) return null;
  return {
    id: Number(f.id),
    escrowId: f.escrow_id !== null ? Number(f.escrow_id) : null,
    articuloAId: f.articulo_a_id !== null ? Number(f.articulo_a_id) : null,
    articuloBId: f.articulo_b_id !== null ? Number(f.articulo_b_id) : null,
    tituloA: f.titulo_a ?? null,
    tituloB: f.titulo_b ?? null,
    usuarioA: f.usuario_a.trim().toLowerCase(),
    usuarioB: f.usuario_b.trim().toLowerCase(),
    estado: f.estado,
    horaPautada: f.hora_pautada ? f.hora_pautada.toISOString() : null,
    txHash: f.tx_hash ?? null,
    bloque: f.bloque !== null ? Number(f.bloque) : null,
    updatedAt: f.updated_at ? f.updated_at.toISOString() : null,
  };
}
