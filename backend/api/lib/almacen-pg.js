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

    // ------------------------------------------------------------ resto (memoria, vía base)
    crearEncargo: base.crearEncargo,
    listarEncargos: base.listarEncargos,
    crearTrueke: base.crearTrueke,
    getTrueke: base.getTrueke,
    actualizarTrueke: base.actualizarTrueke,
    contarTruekes: base.contarTruekes,
    listarTruekes: base.listarTruekes,
    guardarSesion: base.guardarSesion,
    getSesion: base.getSesion,
  };
}
