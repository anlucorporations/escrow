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
import crypto from 'node:crypto';

const NORMALIZA_WALLET = (w) => (w || '').toLowerCase();

function filaAUsuario(f) {
  if (!f) return null;
  return {
    wallet: (f.wallet || '').trim().toLowerCase(),
    username: f.username ?? null,
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
           (wallet, username, correo, telefono, direccion_inscripcion, tipo, nivel, medalla, estado,
            consentimiento_gdpr, consentimiento_fecha, smart_account)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),$11)
         ON CONFLICT (wallet) DO UPDATE SET
           username=COALESCE(EXCLUDED.username, usuarios.username),
           correo=EXCLUDED.correo, telefono=EXCLUDED.telefono,
           direccion_inscripcion=EXCLUDED.direccion_inscripcion,
           tipo=EXCLUDED.tipo, nivel=EXCLUDED.nivel, medalla=EXCLUDED.medalla,
           estado=EXCLUDED.estado, consentimiento_gdpr=EXCLUDED.consentimiento_gdpr,
           consentimiento_fecha=now(), updated_at=now()
         RETURNING *`,
        [
          wallet,
          usuario.username ?? null,
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
           username=$2, correo=$3, telefono=$4, direccion_inscripcion=$5, tipo=$6, nivel=$7,
           medalla=$8, estado=$9, consentimiento_gdpr=$10, smart_account=$11, updated_at=now()
         WHERE wallet=$1 RETURNING *`,
        [
          NORMALIZA_WALLET(wallet),
          n.username ?? null,
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
        `SELECT k.id, k.estado, k.revisado_por, k.via_sbt, k.sbt_contrato, k.sbt_token_id,
                k.documento_img_id, k.selfie_img_id, k.created_at, u.wallet
           FROM kyc k JOIN usuarios u ON u.id = k.usuario_id
          WHERE u.wallet = $1 ORDER BY k.id DESC LIMIT 1`,
        [NORMALIZA_WALLET(wallet)]
      );
      if (r.rowCount === 0) return null;
      const k = r.rows[0];
      return {
        id: Number(k.id),
        wallet: k.wallet.trim().toLowerCase(),
        estado: k.estado,
        revisadoPor: k.revisado_por ? k.revisado_por.trim().toLowerCase() : null,
        viaSbt: Boolean(k.via_sbt),
        sbtContrato: k.sbt_contrato ? k.sbt_contrato.trim().toLowerCase() : null,
        sbtTokenId: k.sbt_token_id !== null && k.sbt_token_id !== undefined ? Number(k.sbt_token_id) : null,
        documentoImgId: k.documento_img_id !== null ? Number(k.documento_img_id) : null,
        selfieImgId: k.selfie_img_id !== null ? Number(k.selfie_img_id) : null,
        createdAt: k.created_at ? k.created_at.toISOString() : null,
      };
    },

    async actualizarKyc(wallet, cambios) {
      const k = await this.getKyc(wallet);
      if (!k) return null;
      const cols = [];
      const vals = [];
      const mapa = {
        estado: 'estado',
        revisadoPor: 'revisado_por',
        viaSbt: 'via_sbt',
        sbtContrato: 'sbt_contrato',
        sbtTokenId: 'sbt_token_id',
        documentoImgId: 'documento_img_id',
        selfieImgId: 'selfie_img_id',
      };
      for (const [clave, col] of Object.entries(mapa)) {
        if (cambios[clave] !== undefined) {
          cols.push(col);
          let valor = cambios[clave];
          if (clave === 'revisadoPor' || clave === 'sbtContrato') valor = NORMALIZA_WALLET(valor);
          vals.push(valor);
        }
      }
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

    /** Guarda una imagen genérica (p. ej. KYC DNI/selfie) en imagenes_certificadas. */
    async guardarImagen({ tipo, refId, wallet, contenido, mime }) {
      const hash = crypto.createHash('sha256').update(contenido).digest();
      const r = await pool.query(
        `INSERT INTO imagenes_certificadas (tipo, ref_id, hash_sha256, wallet, contenido, mime, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())
         RETURNING id`,
        [tipo, Number(refId), hash, NORMALIZA_WALLET(wallet), Buffer.from(contenido), mime ?? 'image/jpeg']
      );
      return Number(r.rows[0].id);
    },

    /** Lista KYC pendientes de revisión (Owner) con datos del usuario. */
    async listarKycPendientes() {
      const r = await pool.query(
        `SELECT k.id AS kyc_id, k.estado, k.via_sbt, k.documento_img_id, k.selfie_img_id, k.created_at,
                u.wallet, u.tipo, u.nivel, u.medalla
           FROM kyc k JOIN usuarios u ON u.id = k.usuario_id
          WHERE k.estado = 'PENDIENTE'
          ORDER BY k.created_at ASC`
      );
      return r.rows.map((f) => ({
        kycId: Number(f.kyc_id),
        estado: f.estado,
        viaSbt: Boolean(f.via_sbt),
        documentoImgId: f.documento_img_id !== null ? Number(f.documento_img_id) : null,
        selfieImgId: f.selfie_img_id !== null ? Number(f.selfie_img_id) : null,
        wallet: f.wallet.trim().toLowerCase(),
        tipo: f.tipo,
        nivel: f.nivel,
        medalla: f.medalla,
        createdAt: f.created_at ? f.created_at.toISOString() : null,
      }));
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

    /** Suma/resta saldo de cripto (moneda) o BRLT de la wallet. `deltaCripto` es { moneda: delta }. */
    async moverSaldo(wallet, { deltaCripto = {}, deltaBrlt = 0 }) {
      const f = await this.asegurarFinanzas(wallet);
      const criptos = { ...(f.criptos ?? {}) };
      for (const [moneda, delta] of Object.entries(deltaCripto)) {
        criptos[moneda] = Math.round(((Number(criptos[moneda] ?? 0) + Number(delta)) + Number.EPSILON) * 1e6) / 1e6;
        if (criptos[moneda] < 0) throw new Error('saldo_insuficiente');
      }
      const brlt = Math.round((Number(f.brlt ?? 0) + Number(deltaBrlt) + Number.EPSILON) * 1e6) / 1e6;
      if (brlt < 0) throw new Error('saldo_insuficiente');
      await pool.query(
        `UPDATE finanzas
            SET criptos = $2, brlt = $3, updated_at = now()
          WHERE usuario_id = (SELECT id FROM usuarios WHERE wallet = $1)`,
        [NORMALIZA_WALLET(wallet), JSON.stringify(criptos), brlt]
      );
      return { criptos, brlt };
    },

    /** Auditoría append-only de movimientos de VALOR (criptos/BRLT). */
    async registrarMovimientoValor({ wallet, tipo, moneda, monto, contraparte, detalle, txHash }) {
      const r = await pool.query(
        `INSERT INTO movimientos_valor (wallet, tipo, moneda, monto, contraparte, detalle, tx_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
        [NORMALIZA_WALLET(wallet), tipo, moneda, Number(monto), NORMALIZA_WALLET(contraparte), detalle ?? null, txHash ?? null]
      );
      const f = r.rows[0];
      return { id: Number(f.id), createdAt: f.created_at.toISOString() };
    },

    async listarMovimientosValor(wallet, limite = 50) {
      const r = await pool.query(
        `SELECT id, tipo, moneda, monto, contraparte, detalle, tx_hash, created_at
           FROM movimientos_valor WHERE wallet = $1 ORDER BY id DESC LIMIT $2`,
        [NORMALIZA_WALLET(wallet), Number(limite)]
      );
      return r.rows.map((f) => ({
        id: Number(f.id),
        tipo: f.tipo,
        moneda: f.moneda,
        monto: Number(f.monto),
        contraparte: f.contraparte.trim().toLowerCase(),
        detalle: f.detalle,
        txHash: f.tx_hash ?? null,
        createdAt: f.created_at.toISOString(),
      }));
    },

    /** Registra una compra BRLT con fiat (Stripe Checkout) → estado PENDIENTE. */
    async crearMovimientoBrlt({ wallet, montoBrlt, montoFiat, fiatMoneda, stripeSession }) {
      const r = await pool.query(
        `INSERT INTO movimientos_brlt (wallet, monto_brlt, monto_fiat, fiat_moneda, stripe_session, estado)
         VALUES ($1, $2, $3, $4, $5, 'PENDIENTE') RETURNING id`,
        [NORMALIZA_WALLET(wallet), Number(montoBrlt), montoFiat != null ? Number(montoFiat) : null, fiatMoneda ?? 'usd', stripeSession ?? null]
      );
      return Number(r.rows[0].id);
    },

    /** Busca una compra BRLT por sesión de Stripe (para el webhook). */
    async buscarMovimientoBrltPorSesion(stripeSession) {
      const r = await pool.query(
        `SELECT id, wallet, monto_brlt, estado FROM movimientos_brlt WHERE stripe_session = $1 ORDER BY id DESC LIMIT 1`,
        [stripeSession]
      );
      const f = r.rows[0];
      if (!f) return null;
      return { id: Number(f.id), wallet: f.wallet.trim().toLowerCase(), montoBrlt: Number(f.monto_brlt), estado: f.estado };
    },

    /** Marca PAGADO y acredita BRLT (llamado por el webhook de Stripe). */
    async confirmarMovimientoBrlt(id, { stripePayment }) {
      const r = await pool.query(
        `UPDATE movimientos_brlt SET estado='PAGADO', stripe_payment=$2, confirmado_at=now()
          WHERE id=$1 AND estado='PENDIENTE' RETURNING wallet, monto_brlt`,
        [Number(id), stripePayment ?? null]
      );
      if (r.rowCount === 0) return null;
      const f = r.rows[0];
      const wallet = f.wallet.trim().toLowerCase();
      await this.moverSaldo(wallet, { deltaBrlt: Number(f.monto_brlt) });
      return { wallet, montoBrlt: Number(f.monto_brlt) };
    },

    /** Persiste la valoración 1-5 de un trueque (tabla valoraciones — D18/D36). */
    async registrarValoracion({ truekeId, valorador, valorado, aceptacion, honestidad, seguridad, confiabilidad, compromiso }) {
      await pool.query(
        `INSERT INTO valoraciones (trueke_id, valorador, valorado, aceptacion, honestidad, seguridad, confiabilidad, compromiso)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (trueke_id, valorador) DO UPDATE SET
           valorado=EXCLUDED.valorado,
           aceptacion=EXCLUDED.aceptacion, honestidad=EXCLUDED.honestidad,
           seguridad=EXCLUDED.seguridad, confiabilidad=EXCLUDED.confiabilidad,
           compromiso=EXCLUDED.compromiso`,
        [Number(truekeId), NORMALIZA_WALLET(valorador), NORMALIZA_WALLET(valorado),
         Number(aceptacion), Number(honestidad), Number(seguridad), Number(confiabilidad), Number(compromiso)]
      );
      return true;
    },

    /** Valoraciones que dio una wallet (con títulos del trueke) — para VALOR 4.2. */
    async listarValoracionesDe(wallet, limite = 10) {
      const r = await pool.query(
        `SELECT v.*, aa.titulo AS titulo_a, ab.titulo AS titulo_b, t.updated_at AS trueke_updated
           FROM valoraciones v
           JOIN truekes t ON t.id = v.trueke_id
           LEFT JOIN articulos aa ON aa.id = t.articulo_a_id
           LEFT JOIN articulos ab ON ab.id = t.articulo_b_id
          WHERE v.valorador = $1
          ORDER BY v.created_at DESC LIMIT $2`,
        [NORMALIZA_WALLET(wallet), Number(limite)]
      );
      return r.rows.map((f) => ({
        truekeId: Number(f.trueke_id),
        valorado: f.valorado.trim().toLowerCase(),
        aceptacion: Number(f.aceptacion),
        honestidad: Number(f.honestidad),
        seguridad: Number(f.seguridad),
        confiabilidad: Number(f.confiabilidad),
        compromiso: Number(f.compromiso),
        promedio: Number(((Number(f.aceptacion) + Number(f.honestidad) + Number(f.seguridad) + Number(f.confiabilidad) + Number(f.compromiso)) / 5).toFixed(2)),
        tituloA: f.titulo_a ?? null,
        tituloB: f.titulo_b ?? null,
        createdAt: f.created_at.toISOString(),
      }));
    },

    /** ¿La wallet ya valoró un trueke? */
    async yaValoro(wallet, truekeId) {
      const r = await pool.query(
        `SELECT 1 FROM valoraciones WHERE valorador=$1 AND trueke_id=$2`,
        [NORMALIZA_WALLET(wallet), Number(truekeId)]
      );
      return r.rowCount > 0;
    },

    // ------------------------------------------------------------ disputas (persistido)
    async crearDisputa({ truekeId, solicitante, motivo }) {
      const r = await pool.query(
        `INSERT INTO disputas (trueke_id, solicitante, motivo, estado)
         VALUES ($1, $2, $3, 'REPORTADA')
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
        `SELECT d.*, t.usuario_a, t.usuario_b, t.estado AS estado_trueke,
                t.cierre_a, t.cierre_b
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
        veredicto: f.veredicto,
        justificativoVenceAt: f.justificativo_vence_at ? f.justificativo_vence_at.toISOString() : null,
        votacionVenceAt: f.votacion_vence_at ? f.votacion_vence_at.toISOString() : null,
        resueltaEn: f.resuelta_en ? f.resuelta_en.toISOString() : null,
        sancion: f.sancion,
        registroVotos: f.registro_votos,
        usuarioA: f.usuario_a.trim().toLowerCase(),
        usuarioB: f.usuario_b ? f.usuario_b.trim().toLowerCase() : null,
        cierreA: f.cierre_a ?? null,
        cierreB: f.cierre_b ?? null,
        estadoTrueke: f.estado_trueke,
        createdAt: f.created_at.toISOString(),
      }));
    },

    async getDisputa(id) {
      const r = await pool.query(
        `SELECT d.*, t.usuario_a, t.usuario_b, t.estado AS estado_trueke,
                t.cierre_a, t.cierre_b, t.articulo_a_id, t.articulo_b_id,
                aa.titulo AS titulo_a, ab.titulo AS titulo_b
           FROM disputas d JOIN truekes t ON t.id = d.trueke_id
           LEFT JOIN articulos aa ON aa.id = t.articulo_a_id
           LEFT JOIN articulos ab ON ab.id = t.articulo_b_id
          WHERE d.id = $1`,
        [Number(id)]
      );
      const f = r.rows[0];
      if (!f) return null;
      return {
        id: Number(f.id),
        truekeId: Number(f.trueke_id),
        solicitante: f.solicitante.trim().toLowerCase(),
        motivo: f.motivo,
        estado: f.estado,
        resolucion: f.resolucion,
        veredicto: f.veredicto,
        justificativoVenceAt: f.justificativo_vence_at ? f.justificativo_vence_at.toISOString() : null,
        votacionVenceAt: f.votacion_vence_at ? f.votacion_vence_at.toISOString() : null,
        resueltaEn: f.resuelta_en ? f.resuelta_en.toISOString() : null,
        registroVotos: f.registro_votos,
        usuarioA: f.usuario_a.trim().toLowerCase(),
        usuarioB: f.usuario_b ? f.usuario_b.trim().toLowerCase() : null,
        cierreA: f.cierre_a ?? null,
        cierreB: f.cierre_b ?? null,
        estadoTrueke: f.estado_trueke,
        articuloAId: f.articulo_a_id !== null ? Number(f.articulo_a_id) : null,
        articuloBId: f.articulo_b_id !== null ? Number(f.articulo_b_id) : null,
        tituloA: f.titulo_a ?? null,
        tituloB: f.titulo_b ?? null,
        createdAt: f.created_at.toISOString(),
      };
    },

    /** Actualiza campos de la disputa (estado, vencimientos, veredicto…). */
    async actualizarDisputa(id, cambios) {
      const r = await pool.query(
        `UPDATE disputas
            SET estado = COALESCE($2, estado),
                justificativo_vence_at = COALESCE($3, justificativo_vence_at),
                votacion_vence_at = COALESCE($4, votacion_vence_at),
                veredicto = COALESCE($5, veredicto),
                resuelta_en = COALESCE($6, resuelta_en),
                resolucion = COALESCE($7, resolucion),
                updated_at = now()
          WHERE id = $1 RETURNING id`,
        [
          Number(id),
          cambios.estado ?? null,
          cambios.justificativoVenceAt ? new Date(cambios.justificativoVenceAt).toISOString() : null,
          cambios.votacionVenceAt ? new Date(cambios.votacionVenceAt).toISOString() : null,
          cambios.veredicto ?? null,
          cambios.resueltaEn ? new Date(cambios.resueltaEn).toISOString() : null,
          cambios.resolucion ?? null,
        ]
      );
      return r.rowCount > 0;
    },

    /** Guarda una foto de evidencia de una parte (RECLAMO del reclamante o JUSTIFICATIVO del conforme). */
    async agregarEvidenciaDisputa({ disputaId, autor, tipo, contenido, mime }) {
      const r = await pool.query(
        `INSERT INTO evidencias_disputa (disputa_id, autor, tipo, contenido, mime)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [Number(disputaId), NORMALIZA_WALLET(autor), tipo, Buffer.from(contenido), mime ?? 'image/jpeg']
      );
      return Number(r.rows[0].id);
    },

    /** Metadatos de las evidencias de una disputa (sin binario). */
    async listarEvidenciasDisputa(disputaId) {
      const r = await pool.query(
        `SELECT id, autor, tipo, mime, created_at FROM evidencias_disputa
          WHERE disputa_id = $1 ORDER BY id`,
        [Number(disputaId)]
      );
      return r.rows.map((f) => ({
        id: Number(f.id),
        autor: f.autor.trim().toLowerCase(),
        tipo: f.tipo,
        mime: f.mime,
        createdAt: f.created_at.toISOString(),
      }));
    },

    /** Binario de una evidencia (para servir la imagen). */
    async getEvidenciaDisputa(id) {
      const r = await pool.query(
        `SELECT id, disputa_id, autor, tipo, contenido, mime FROM evidencias_disputa WHERE id = $1`,
        [Number(id)]
      );
      const f = r.rows[0];
      if (!f) return null;
      return {
        id: Number(f.id),
        disputaId: Number(f.disputa_id),
        autor: f.autor.trim().toLowerCase(),
        tipo: f.tipo,
        contenido: f.contenido,
        mime: f.mime ?? 'image/jpeg',
      };
    },

    /** Registra el voto de un socio (1 voto por socio y disputa — UNIQUE). */
    async registrarVotoDisputa({ disputaId, socio, voto }) {
      const r = await pool.query(
        `INSERT INTO votos_disputa (disputa_id, socio, voto)
         VALUES ($1, $2, $3)
         ON CONFLICT (disputa_id, socio) DO UPDATE SET voto = EXCLUDED.voto, created_at = now()
         RETURNING id`,
        [Number(disputaId), NORMALIZA_WALLET(socio), voto]
      );
      return Number(r.rows[0].id);
    },

    async listarVotosDisputa(disputaId) {
      const r = await pool.query(
        `SELECT socio, voto FROM votos_disputa WHERE disputa_id = $1`,
        [Number(disputaId)]
      );
      return r.rows.map((f) => ({ socio: f.socio.trim().toLowerCase(), voto: f.voto }));
    },

    // ------------------------------------------------------------ notificaciones (campana)
    async crearNotificacion({ wallet, tipo, titulo, cuerpo, refTipo, refId }) {
      const r = await pool.query(
        `INSERT INTO notificaciones (wallet, tipo, titulo, cuerpo, ref_tipo, ref_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, leida, created_at`,
        [NORMALIZA_WALLET(wallet), tipo, titulo ?? '', cuerpo ?? null, refTipo ?? null, refId ?? null]
      );
      const f = r.rows[0];
      return { id: Number(f.id), leida: f.leida, createdAt: f.created_at.toISOString() };
    },

    async listarNotificaciones(wallet) {
      const r = await pool.query(
        `SELECT id, tipo, titulo, cuerpo, ref_tipo, ref_id, leida, created_at
           FROM notificaciones WHERE wallet = $1
          ORDER BY created_at DESC LIMIT 50`,
        [NORMALIZA_WALLET(wallet)]
      );
      return r.rows.map((f) => ({
        id: Number(f.id),
        tipo: f.tipo,
        titulo: f.titulo,
        cuerpo: f.cuerpo,
        refTipo: f.ref_tipo,
        refId: f.ref_id !== null ? Number(f.ref_id) : null,
        leida: f.leida,
        createdAt: f.created_at.toISOString(),
      }));
    },

    async contarNotificacionesNoLeidas(wallet) {
      const r = await pool.query(
        `SELECT count(*)::int AS n FROM notificaciones WHERE wallet = $1 AND leida = FALSE`,
        [NORMALIZA_WALLET(wallet)]
      );
      return r.rows[0].n;
    },

    async marcarNotificacionLeida(id, wallet) {
      await pool.query(
        `UPDATE notificaciones SET leida = TRUE WHERE id = $1 AND wallet = $2`,
        [Number(id), NORMALIZA_WALLET(wallet)]
      );
      return true;
    },

    async marcarNotificacionesLeidas(wallet) {
      await pool.query(
        `UPDATE notificaciones SET leida = TRUE WHERE wallet = $1`,
        [NORMALIZA_WALLET(wallet)]
      );
      return true;
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
