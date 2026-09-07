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
        `INSERT INTO articulos (usuario_id, titulo, descripcion, rubro, categoria, disponible)
         VALUES ((SELECT id FROM usuarios WHERE wallet=$1), $2, $3, $4, $5, $6)
         RETURNING id, titulo, rubro, categoria, disponible, created_at`,
        [NORMALIZA_WALLET(a.usuarioId ?? a.wallet ?? ''), a.titulo ?? '', a.descripcion ?? null, a.rubro ?? '', a.categoria ?? 'ARTICULO', a.disponible ?? true]
      );
      const f = r.rows[0];
      return { id: f.id, titulo: f.titulo, rubro: f.rubro, categoria: f.categoria, disponible: f.disponible, createdAt: f.created_at.toISOString() };
    },

    async listarArticulos() {
      const r = await pool.query(
        `SELECT a.id, a.titulo, a.descripcion, a.rubro, a.categoria, a.nft_token_id, a.disponible, a.usado_el, a.created_at,
                u.wallet AS usuario_wallet, u.nivel AS usuario_nivel
           FROM articulos a JOIN usuarios u ON u.id = a.usuario_id
          ORDER BY a.created_at DESC`
      );
      return r.rows.map((f) => ({
        id: f.id,
        titulo: f.titulo,
        descripcion: f.descripcion ?? '',
        rubro: f.rubro,
        categoria: f.categoria ?? 'ARTICULO',
        nftTokenId: f.nft_token_id !== null ? Number(f.nft_token_id) : null,
        disponible: f.disponible,
        usadoEl: f.usado_el ? f.usado_el.toISOString() : null,
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

    /** Persiste el tokenId del NFT on-chain del artículo (lógica maestra punto 1). */
    async fijarNftToken(id, tokenId) {
      const r = await pool.query(
        `UPDATE articulos SET nft_token_id = $2, updated_at = now() WHERE id = $1 RETURNING id, nft_token_id`,
        [Number(id), tokenId === null ? null : Number(tokenId)]
      );
      if (r.rowCount === 0) return null;
      const f = r.rows[0];
      return { id: Number(f.id), nftTokenId: f.nft_token_id !== null ? Number(f.nft_token_id) : null };
    },

    /** Reasigna el dueño de un artículo (liberación en cruz al COMPLETADO — punto 0). */
    async reasignarArticulo(id, nuevaWallet) {
      const r = await pool.query(
        `UPDATE articulos SET usuario_id = (SELECT id FROM usuarios WHERE wallet = $2),
                updated_at = now()
          WHERE id = $1 RETURNING id`,
        [Number(id), NORMALIZA_WALLET(nuevaWallet)]
      );
      return r.rowCount > 0;
    },

    /** Marca un artículo como consumido (NFT quemado — punto 2). */
    async marcarArticuloUsado(id) {
      const r = await pool.query(
        `UPDATE articulos SET disponible = FALSE, usado_el = now(), updated_at = now()
          WHERE id = $1 RETURNING id, usado_el`,
        [Number(id)]
      );
      if (r.rowCount === 0) return null;
      const f = r.rows[0];
      return { id: Number(f.id), usadoEl: f.usado_el ? f.usado_el.toISOString() : null };
    },

    async guardarImagenArticulo({ articuloId, wallet, contenido, mime }) {
      const r = await pool.query(
        `INSERT INTO imagenes_certificadas (tipo, ref_id, wallet, contenido, mime)
         VALUES ('PUBLICACION', $1, $2, $3, $4)
         RETURNING id`,
        [Number(articuloId), NORMALIZA_WALLET(wallet), Buffer.from(contenido ?? ''), mime ?? 'image/jpeg']
      );
      return Number(r.rows[0].id);
    },

    async listarImagenesArticulo(articuloId) {
      const r = await pool.query(
        `SELECT id, mime FROM imagenes_certificadas WHERE tipo='PUBLICACION' AND ref_id = $1 ORDER BY id`,
        [Number(articuloId)]
      );
      return r.rows.map((f) => ({ id: Number(f.id), mime: f.mime ?? 'image/jpeg' }));
    },

    async getImagen(id) {
      const r = await pool.query(
        `SELECT id, contenido, mime, wallet FROM imagenes_certificadas WHERE id = $1`,
        [Number(id)]
      );
      const f = r.rows[0];
      if (!f) return null;
      return { id: Number(f.id), contenido: f.contenido, mime: f.mime ?? 'image/jpeg', wallet: f.wallet.trim().toLowerCase() };
    },

    async getArticulo(id) {
      const r = await pool.query(
        `SELECT a.id, a.titulo, a.descripcion, a.rubro, a.categoria, a.nft_token_id, a.disponible, a.usado_el,
                u.wallet AS usuario_wallet
           FROM articulos a JOIN usuarios u ON u.id = a.usuario_id
          WHERE a.id = $1`,
        [Number(id)]
      );
      const f = r.rows[0];
      if (!f) return null;
      return {
        id: Number(f.id),
        titulo: f.titulo,
        descripcion: f.descripcion ?? '',
        rubro: f.rubro,
        categoria: f.categoria ?? 'ARTICULO',
        nftTokenId: f.nft_token_id !== null ? Number(f.nft_token_id) : null,
        disponible: f.disponible,
        usadoEl: f.usado_el ? f.usado_el.toISOString() : null,
        usuarioWallet: f.usuario_wallet.trim().toLowerCase(),
      };
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

    async crearOferta(o) {
      const walletA = NORMALIZA_WALLET(o.usuarioA ?? '');
      const r = await pool.query(
        `INSERT INTO truekes (escrow_id, articulo_a_id, usuario_a, estado,
                              descripcion_requerida, tipo_requerido)
         VALUES ((SELECT COALESCE(MIN(escrow_id), 0) - 1 FROM truekes WHERE escrow_id < 0),
                 $1, $2, 'PROPUESTO', $3, $4)
         RETURNING id`,
        [o.articuloAId ?? null, walletA, o.descripcionRequerida ?? null, o.tipoRequerido ?? null]
      );
      return Number(r.rows[0].id);
    },

    async listarOfertas() {
      const r = await pool.query(
        `SELECT t.*, aa.titulo AS titulo_a, ab.titulo AS titulo_b
           FROM truekes t
           LEFT JOIN articulos aa ON aa.id = t.articulo_a_id
           LEFT JOIN articulos ab ON ab.id = t.articulo_b_id
          WHERE t.estado = 'PROPUESTO'
          ORDER BY t.id DESC`
      );
      return r.rows.map(filaATrueke);
    },

    async acordarOferta(id, { usuarioB, articuloBId }) {
      const r = await pool.query(
        `UPDATE truekes
            SET usuario_b = $2, articulo_b_id = $3, estado = 'CREADO', updated_at = now()
          WHERE id = $1 AND estado = 'PROPUESTO'
          RETURNING *`,
        [Number(id), NORMALIZA_WALLET(usuarioB), articuloBId ?? null]
      );
      if (r.rowCount === 0) return null;
      return filaATrueke(r.rows[0]);
    },

    async registrarCierre(id, { lado, conforme }) {
      const col = lado === 'A' ? 'cierre_a' : 'cierre_b';
      const valor = conforme ? 'CONFORME' : 'NO_CONFORME';
      const r = await pool.query(
        `UPDATE truekes SET ${col} = $2, updated_at = now() WHERE id = $1 RETURNING *`,
        [Number(id), valor]
      );
      if (r.rowCount === 0) return null;
      return filaATrueke(r.rows[0]);
    },

    async actualizarTrueke(id, cambios) {
      const actual = await this.getTrueke(Number(id));
      if (!actual) return null;
      const estadosValidos = ['PROPUESTO','CREADO','ACTIVO','CUSTODIADO','APERTURA','EN_DISPUTA',
        'RESOLUCION_SOCIOS','COMPLETADO','ANULADO','BLOQUEADO'];
      const estado = cambios.estado && estadosValidos.includes(cambios.estado) ? cambios.estado : actual.estado;
      const hora = cambios.horaPautada ? new Date(cambios.horaPautada).toISOString() : (cambios.horaPautada === null ? null : actual.horaPautada);
      const punto = cambios.puntoEncuentroId !== undefined ? cambios.puntoEncuentroId : actual.puntoEncuentroId;
      const propone = cambios.encuentroPropuestoPor ? NORMALIZA_WALLET(cambios.encuentroPropuestoPor) : null;
      const r = await pool.query(
        `UPDATE truekes
            SET estado=$2,
                hora_pautada = COALESCE($3, hora_pautada),
                punto_encuentro_id = COALESCE($4, punto_encuentro_id),
                cierre_a = COALESCE($5, cierre_a),
                cierre_b = COALESCE($6, cierre_b),
                descripcion_requerida = COALESCE($7, descripcion_requerida),
                tipo_requerido = COALESCE($8, tipo_requerido),
                encuentro_propuesto_por = COALESCE($9, encuentro_propuesto_por),
                encuentro_estado = COALESCE($10, encuentro_estado),
                updated_at = now()
          WHERE id = $1 RETURNING *`,
        [Number(id), estado, hora ?? null, punto, cambios.cierreA ?? null, cambios.cierreB ?? null, cambios.descripcionRequerida ?? null, cambios.tipoRequerido ?? null, propone, cambios.encuentroEstado ?? null]
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

    // ------------------------------------------------------------ puntos de encuentro (CU-16, punto 5.1)
    async crearPunto({ wallet, lat, lng, direccion, radioKm = 10 }) {
      const r = await pool.query(
        `INSERT INTO puntos_encuentro (usuario_id, direccion, geog, radio_km)
         VALUES ((SELECT id FROM usuarios WHERE wallet=$1), $2,
                 ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography, $5)
         RETURNING id, direccion, radio_km, ST_Y(geog::geometry) AS lat, ST_X(geog::geometry) AS lng, created_at`,
        [NORMALIZA_WALLET(wallet), direccion ?? '', Number(lat), Number(lng), Number(radioKm)]
      );
      const f = r.rows[0];
      return {
        id: Number(f.id),
        lat: Number(f.lat),
        lng: Number(f.lng),
        direccion: f.direccion ?? '',
        radioKm: Number(f.radio_km),
        aprobadoSocios: false,
        createdAt: f.created_at.toISOString(),
      };
    },

    async getPunto(id) {
      const r = await pool.query(
        `SELECT id, usuario_id, direccion, radio_km, aprobado_socios,
                ST_Y(geog::geometry) AS lat, ST_X(geog::geometry) AS lng, created_at
           FROM puntos_encuentro WHERE id = $1`,
        [Number(id)]
      );
      const f = r.rows[0];
      if (!f) return null;
      return {
        id: Number(f.id),
        lat: Number(f.lat),
        lng: Number(f.lng),
        direccion: f.direccion ?? '',
        radioKm: Number(f.radio_km),
        aprobadoSocios: f.aprobado_socios,
        createdAt: f.created_at.toISOString(),
      };
    },

    async listarPuntosDe(wallet) {
      const r = await pool.query(
        `SELECT id, usuario_id, direccion, radio_km, aprobado_socios,
                ST_Y(geog::geometry) AS lat, ST_X(geog::geometry) AS lng, created_at
           FROM puntos_encuentro WHERE usuario_id = (SELECT id FROM usuarios WHERE wallet = $1)
          ORDER BY id DESC`,
        [NORMALIZA_WALLET(wallet)]
      );
      return r.rows.map((f) => ({
        id: Number(f.id),
        lat: Number(f.lat),
        lng: Number(f.lng),
        direccion: f.direccion ?? '',
        radioKm: Number(f.radio_km),
        aprobadoSocios: f.aprobado_socios,
        createdAt: f.created_at.toISOString(),
      }));
    },

    /** Marca un punto como usado (upsert en puntos_favoritos — punto 7). */
    async registrarUsoPunto(wallet, puntoId) {
      await pool.query(
        `INSERT INTO puntos_favoritos (usuario_id, punto_encuentro_id, ultimo_uso)
         VALUES ((SELECT id FROM usuarios WHERE wallet=$1), $2, now())
         ON CONFLICT (usuario_id, punto_encuentro_id)
         DO UPDATE SET ultimo_uso = now()`,
        [NORMALIZA_WALLET(wallet), Number(puntoId)]
      );
      const r = await pool.query(
        `SELECT punto_encuentro_id, ultimo_uso FROM puntos_favoritos
          WHERE usuario_id = (SELECT id FROM usuarios WHERE wallet = $1)
            AND punto_encuentro_id = $2`,
        [NORMALIZA_WALLET(wallet), Number(puntoId)]
      );
      const f = r.rows[0];
      return f ? { puntoId: Number(f.punto_encuentro_id), ultimoUso: f.ultimo_uso.toISOString() } : null;
    },

    /** Puntos favoritos/últimos usados del usuario, más recientes primero. */
    async listarPuntosFavoritosDe(wallet) {
      const r = await pool.query(
        `SELECT pf.punto_encuentro_id, pf.ultimo_uso, pe.direccion, pe.radio_km,
                ST_Y(pe.geog::geometry) AS lat, ST_X(pe.geog::geometry) AS lng
           FROM puntos_favoritos pf
           JOIN puntos_encuentro pe ON pe.id = pf.punto_encuentro_id
          WHERE pf.usuario_id = (SELECT id FROM usuarios WHERE wallet = $1)
          ORDER BY pf.ultimo_uso DESC`,
        [NORMALIZA_WALLET(wallet)]
      );
      return r.rows.map((f) => ({
        puntoId: Number(f.punto_encuentro_id),
        ultimoUso: f.ultimo_uso.toISOString(),
        punto: {
          id: Number(f.punto_encuentro_id),
          lat: Number(f.lat),
          lng: Number(f.lng),
          direccion: f.direccion ?? '',
          radioKm: Number(f.radio_km),
        },
      }));
    },

    // ------------------------------------------------------------ sesiones (persistidas)
    async guardarSesion(token, wallet) {
      await pool.query(
        `INSERT INTO sesiones (token, wallet, expires_at)
         VALUES ($1, $2, now() + interval '24 hours')
         ON CONFLICT (token) DO UPDATE SET expires_at = now() + interval '24 hours'`,
        [token, NORMALIZA_WALLET(wallet)]
      );
    },
    async getSesion(token) {
      const r = await pool.query(
        `SELECT wallet FROM sesiones WHERE token = $1 AND expires_at > now()`,
        [token]
      );
      if (r.rowCount === 0) return null;
      return { wallet: r.rows[0].wallet.trim().toLowerCase(), token };
    },
    crearEncargo: base.crearEncargo,
    listarEncargos: base.listarEncargos,
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
    // Oferta abierta (PROPUESTO) no tiene contraparte todavía (lógica maestra punto 3)
    usuarioB: f.usuario_b ? f.usuario_b.trim().toLowerCase() : null,
    estado: f.estado,
    descripcionRequerida: f.descripcion_requerida ?? null,
    tipoRequerido: f.tipo_requerido ?? null,
    cierreA: f.cierre_a ?? null,
    cierreB: f.cierre_b ?? null,
    encuentroPropuestoPor: f.encuentro_propuesto_por ? f.encuentro_propuesto_por.trim().toLowerCase() : null,
    encuentroEstado: f.encuentro_estado ?? null,
    puntoEncuentroId: f.punto_encuentro_id !== null && f.punto_encuentro_id !== undefined ? Number(f.punto_encuentro_id) : null,
    horaPautada: f.hora_pautada ? f.hora_pautada.toISOString() : null,
    txHash: f.tx_hash ?? null,
    bloque: f.bloque !== null ? Number(f.bloque) : null,
    updatedAt: f.updated_at ? f.updated_at.toISOString() : null,
  };
}
