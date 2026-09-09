// =============================================================================
// TrueKeate — Almacén (Ciclo 6)
// Almacén en memoria que imita las tablas PostgreSQL del Ciclo 4. En la
// integración C8 se sustituye por consultas reales a mcc-postgres manteniendo
// la misma interfaz.
// =============================================================================
export function crearAlmacen() {
  const estado = {
    usuarios: new Map(),     // wallet -> usuario
    kyc: new Map(),          // wallet -> kyc
    articulos: new Map(),    // id -> articulo
    encargos: new Map(),     // id -> encargo
    truekes: new Map(),      // id -> trueke
    finanzas: new Map(),     // id(usuario) -> finanzas
    disputas: new Map(),     // id -> disputa
    sesiones: new Map(),     // token -> {wallet}
    puntos: new Map(),       // id -> punto de encuentro
    puntosFavoritos: new Map(), // "wallet:id" -> {ultimoUso}
    imagenes: new Map(),    // id -> imagen certificada
  };
  let proxArticulo = 1;
  let proxEncargo = 1;
  let proxTrueke = 1;
  let proxPunto = 1;
  let proxImagen = 1;

  return {
    // ------------------------------------------------------------ usuarios
    crearUsuario(usuario) {
      estado.usuarios.set(usuario.wallet, {
        tipo: 'PARTICULAR',
        nivel: 'INICIADO',
        medalla: 'BRONCE',
        estado: 'INSCRITO', // escalera D28
        consentimientoGdpr: false,
        smartAccount: null,
        createdAt: new Date().toISOString(),
        ...usuario,
      });
      return estado.usuarios.get(usuario.wallet);
    },
    getUsuario(wallet) {
      return estado.usuarios.get(wallet) ?? null;
    },
    actualizarUsuario(wallet, cambios) {
      const u = estado.usuarios.get(wallet);
      if (!u) return null;
      Object.assign(u, cambios);
      return u;
    },
    listarUsuarios() {
      return [...estado.usuarios.values()];
    },

    // ------------------------------------------------------------ kyc
    initKyc(wallet) {
      estado.kyc.set(wallet, { wallet, estado: 'PENDIENTE', etapa: 0, createdAt: new Date().toISOString() });
      return estado.kyc.get(wallet);
    },
    getKyc(wallet) {
      return estado.kyc.get(wallet) ?? null;
    },
    actualizarKyc(wallet, cambios) {
      const k = estado.kyc.get(wallet);
      if (!k) return null;
      Object.assign(k, cambios);
      return k;
    },

    // ------------------------------------------------------------ catálogo
    crearArticulo(a) {
      const id = proxArticulo++;
      estado.articulos.set(id, { id, createdAt: new Date().toISOString(), ...a });
      return estado.articulos.get(id);
    },
    listarArticulos() {
      return [...estado.articulos.values()];
    },
    /** Marca un artículo como no disponible (lo retira del catálogo público). */
    despublicarArticulo(id) {
      const a = estado.articulos.get(Number(id));
      if (!a) return null;
      a.disponible = false;
      return a;
    },
    /** Persiste el tokenId del NFT on-chain del artículo (lógica maestra punto 1). */
    fijarNftToken(id, tokenId) {
      const a = estado.articulos.get(Number(id));
      if (!a) return null;
      a.nftTokenId = tokenId;
      a.updatedAt = new Date().toISOString();
      return a;
    },
    /** Reasigna el dueño de un artículo (liberación en cruz al COMPLETADO — punto 0). */
    reasignarArticulo(id, nuevaWallet) {
      const a = estado.articulos.get(Number(id));
      if (!a) return null;
      a.wallet = nuevaWallet.toLowerCase();
      a.usuarioId = nuevaWallet.toLowerCase();
      a.updatedAt = new Date().toISOString();
      return a;
    },
    /** Marca un artículo como consumido (NFT quemado — punto 2). */
    marcarArticuloUsado(id) {
      const a = estado.articulos.get(Number(id));
      if (!a) return null;
      a.disponible = false;
      a.usadoEl = new Date().toISOString();
      a.updatedAt = new Date().toISOString();
      return a;
    },
    getArticulo(id) {
      return estado.articulos.get(Number(id)) ?? null;
    },
    /** Guarda una imagen del artículo (punto 1). Devuelve el id. */
    guardarImagenArticulo({ articuloId, wallet, contenido, mime }) {
      const id = proxImagen++;
      estado.imagenes.set(id, {
        id, articuloId: Number(articuloId), wallet,
        contenido: Buffer.isBuffer(contenido) ? contenido : Buffer.from(contenido ?? ''),
        mime: mime ?? 'image/jpeg',
        tipo: 'PUBLICACION',
        createdAt: new Date().toISOString(),
      });
      return id;
    },
    listarImagenesArticulo(articuloId) {
      return [...estado.imagenes.values()].filter((i) => i.articuloId === Number(articuloId));
    },
    /** Guarda una imagen genérica (KYC DNI/selfie, etc.) en el almacén. */
    guardarImagen({ tipo, refId, wallet, contenido, mime }) {
      const id = proxImagen++;
      estado.imagenes.set(id, {
        id, tipo, refId: Number(refId), wallet,
        contenido: Buffer.isBuffer(contenido) ? contenido : Buffer.from(contenido ?? ''),
        mime: mime ?? 'image/jpeg',
        createdAt: new Date().toISOString(),
      });
      return id;
    },
    /** Lista KYC pendientes de revisión (Owner). */
    listarKycPendientes() {
      return [...estado.kyc.entries()]
        .filter(([, k]) => k.estado === 'PENDIENTE')
        .map(([wallet, k]) => {
          const u = estado.usuarios.get(wallet) ?? {};
          return {
            kycId: 0,
            wallet,
            estado: k.estado,
            viaSbt: Boolean(k.viaSbt),
            documentoImgId: k.documentoImgId ?? null,
            selfieImgId: k.selfieImgId ?? null,
            tipo: u.tipo ?? null,
            nivel: u.nivel ?? null,
            medalla: u.medalla ?? null,
            createdAt: k.createdAt ?? null,
          };
        });
    },
    getImagen(id) {
      return estado.imagenes.get(Number(id)) ?? null;
    },
    crearEncargo(e) {
      const id = proxEncargo++;
      estado.encargos.set(id, { id, estado: 'ACTIVO', createdAt: new Date().toISOString(), ...e });
      return estado.encargos.get(id);
    },

    // ------------------------------------------------------------ finanzas (memoria)
    getFinanzas(wallet) {
      const u = estado.usuarios.get(wallet);
      if (!u) return null;
      const id = u.id ?? wallet;
      return estado.finanzas?.get(id) ?? null;
    },
    asegurarFinanzas(wallet) {
      const u = estado.usuarios.get(wallet);
      if (!u) return null;
      const id = u.id ?? wallet;
      if (!estado.finanzas) estado.finanzas = new Map();
      if (!estado.finanzas.has(id)) {
        estado.finanzas.set(id, {
          wallet,
          nftsStock: {},
          criptos: {},
          brlt: 0,
          fondoValor: 0,
          porcentajesConfig: { trueque: 1, suscripciones: 10, brlt: 5 },
          updatedAt: new Date().toISOString(),
        });
      }
      return estado.finanzas.get(id);
    },

    // ------------------------------------------------------------ VALOR (memoria)
    moverSaldo(wallet, { deltaCripto = {}, deltaBrlt = 0 }) {
      const f = this.asegurarFinanzas(wallet);
      if (!f) return null;
      const criptos = { ...(f.criptos ?? {}) };
      for (const [moneda, delta] of Object.entries(deltaCripto)) {
        criptos[moneda] = Math.round(((Number(criptos[moneda] ?? 0) + Number(delta)) + Number.EPSILON) * 1e6) / 1e6;
        if (criptos[moneda] < 0) throw new Error('saldo_insuficiente');
      }
      const brlt = Math.round((Number(f.brlt ?? 0) + Number(deltaBrlt) + Number.EPSILON) * 1e6) / 1e6;
      if (brlt < 0) throw new Error('saldo_insuficiente');
      f.criptos = criptos;
      f.brlt = brlt;
      f.updatedAt = new Date().toISOString();
      return { criptos, brlt };
    },
    registrarMovimientoValor({ wallet, tipo, moneda, monto, contraparte, detalle, txHash }) {
      if (!estado.movimientosValor) estado.movimientosValor = [];
      const m = {
        id: estado.movimientosValor.length + 1,
        wallet,
        tipo, moneda, monto: Number(monto),
        contraparte: contraparte.toLowerCase(),
        detalle: detalle ?? null,
        txHash: txHash ?? null,
        createdAt: new Date().toISOString(),
      };
      estado.movimientosValor.push(m);
      return m;
    },
    listarMovimientosValor(wallet, limite = 50) {
      return [...(estado.movimientosValor ?? [])]
        .filter((m) => m.wallet === wallet)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, Number(limite));
    },
    crearMovimientoBrlt({ wallet, montoBrlt, montoFiat, fiatMoneda, stripeSession }) {
      if (!estado.movimientosBrlt) estado.movimientosBrlt = [];
      const m = {
        id: estado.movimientosBrlt.length + 1,
        wallet,
        montoBrlt: Number(montoBrlt),
        montoFiat: montoFiat != null ? Number(montoFiat) : null,
        fiatMoneda: fiatMoneda ?? 'usd',
        stripeSession: stripeSession ?? null,
        stripePayment: null,
        estado: 'PENDIENTE',
        createdAt: new Date().toISOString(),
      };
      estado.movimientosBrlt.push(m);
      return m;
    },
    buscarMovimientoBrltPorSesion(stripeSession) {
      const m = [...(estado.movimientosBrlt ?? [])]
        .filter((x) => x.stripeSession === stripeSession)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (!m) return null;
      return { id: m.id, wallet: m.wallet, montoBrlt: m.montoBrlt, estado: m.estado };
    },
    confirmarMovimientoBrlt(id, { stripePayment }) {
      const m = (estado.movimientosBrlt ?? []).find((x) => x.id === Number(id) && x.estado === 'PENDIENTE');
      if (!m) return null;
      m.estado = 'PAGADO';
      m.stripePayment = stripePayment ?? null;
      m.confirmadoAt = new Date().toISOString();
      this.moverSaldo(m.wallet, { deltaBrlt: m.montoBrlt });
      return { wallet: m.wallet, montoBrlt: m.montoBrlt };
    },
    registrarValoracion({ truekeId, valorador, valorado, aceptacion, honestidad, seguridad, confiabilidad, compromiso }) {
      if (!estado.valoraciones) estado.valoraciones = [];
      const existente = estado.valoraciones.find((v) => v.truekeId === Number(truekeId) && v.valorador === valorador);
      const nueva = {
        truekeId: Number(truekeId),
        valorador,
        valorado: valorado.toLowerCase(),
        aceptacion: Number(aceptacion), honestidad: Number(honestidad), seguridad: Number(seguridad),
        confiabilidad: Number(confiabilidad), compromiso: Number(compromiso),
        createdAt: new Date().toISOString(),
      };
      if (existente) Object.assign(existente, nueva);
      else estado.valoraciones.push(nueva);
      return true;
    },
    listarValoracionesDe(wallet, limite = 10) {
      const tMap = estado.truekes;
      return [...(estado.valoraciones ?? [])]
        .filter((v) => v.valorador === wallet)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, Number(limite))
        .map((v) => {
          const t = tMap.get(Number(v.truekeId));
          const prom = (v.aceptacion + v.honestidad + v.seguridad + v.confiabilidad + v.compromiso) / 5;
          return {
            truekeId: v.truekeId,
            valorado: v.valorado,
            aceptacion: v.aceptacion, honestidad: v.honestidad, seguridad: v.seguridad,
            confiabilidad: v.confiabilidad, compromiso: v.compromiso,
            promedio: Math.round(prom * 100) / 100,
            tituloA: t?.tituloA ?? null,
            tituloB: t?.tituloB ?? null,
            createdAt: v.createdAt,
          };
        });
    },
    yaValoro(wallet, truekeId) {
      return Boolean((estado.valoraciones ?? []).some((v) => v.valorador === wallet && v.truekeId === Number(truekeId)));
    },

    // ------------------------------------------------------------ disputas (memoria)
    crearDisputa({ truekeId, solicitante, motivo }) {
      const t = estado.truekes.get(Number(truekeId));
      if (!t) return null;
      if (!estado.disputas) estado.disputas = new Map();
      const id = (estado.disputas.size || 0) + 1;
      const d = {
        id,
        truekeId: Number(truekeId),
        solicitante,
        motivo: motivo ?? null,
        estado: 'REPORTADA',
        veredicto: null,
        justificativoVenceAt: null,
        votacionVenceAt: null,
        resueltaEn: null,
        resolucion: null,
        createdAt: new Date().toISOString(),
        usuarioA: t.usuarioA,
        usuarioB: t.usuarioB,
        cierreA: t.cierreA ?? null,
        cierreB: t.cierreB ?? null,
        estadoTrueke: t.estado,
      };
      estado.disputas.set(id, d);
      t.estado = 'EN_DISPUTA';
      return d;
    },
    listarDisputas() {
      return [...(estado.disputas?.values() ?? [])].map((d) => {
        const t = estado.truekes.get(Number(d.truekeId));
        return {
          ...d,
          usuarioA: t?.usuarioA ?? d.usuarioA,
          usuarioB: t?.usuarioB ?? d.usuarioB,
          cierreA: t?.cierreA ?? null,
          cierreB: t?.cierreB ?? null,
          estadoTrueke: t?.estado ?? d.estadoTrueke,
        };
      });
    },
    async getDisputa(id) {
      const d = estado.disputas?.get(Number(id));
      if (!d) return null;
      const t = estado.truekes.get(Number(d.truekeId));
      return {
        ...d,
        usuarioA: t?.usuarioA ?? d.usuarioA,
        usuarioB: t?.usuarioB ?? d.usuarioB,
        cierreA: t?.cierreA ?? null,
        cierreB: t?.cierreB ?? null,
        estadoTrueke: t?.estado ?? d.estadoTrueke,
      };
    },
    async actualizarDisputa(id, cambios) {
      const d = estado.disputas?.get(Number(id));
      if (!d) return false;
      Object.assign(d, {
        estado: cambios.estado ?? d.estado,
        justificativoVenceAt: cambios.justificativoVenceAt
          ? new Date(cambios.justificativoVenceAt).toISOString()
          : d.justificativoVenceAt,
        votacionVenceAt: cambios.votacionVenceAt
          ? new Date(cambios.votacionVenceAt).toISOString()
          : d.votacionVenceAt,
        veredicto: cambios.veredicto ?? d.veredicto,
        resueltaEn: cambios.resueltaEn ? new Date(cambios.resueltaEn).toISOString() : d.resueltaEn,
        resolucion: cambios.resolucion ?? d.resolucion,
      });
      return true;
    },
    async agregarEvidenciaDisputa({ disputaId, autor, tipo, contenido, mime }) {
      if (!estado.evidenciasDisputa) estado.evidenciasDisputa = new Map();
      const id = (estado.evidenciasDisputa.size || 0) + 1;
      estado.evidenciasDisputa.set(id, {
        id,
        disputaId: Number(disputaId),
        autor: autor.toLowerCase(),
        tipo,
        contenido: Buffer.from(contenido),
        mime: mime ?? 'image/jpeg',
        createdAt: new Date().toISOString(),
      });
      return id;
    },
    async listarEvidenciasDisputa(disputaId) {
      return [...(estado.evidenciasDisputa?.values() ?? [])]
        .filter((e) => e.disputaId === Number(disputaId))
        .map((e) => ({ id: e.id, autor: e.autor, tipo: e.tipo, mime: e.mime, createdAt: e.createdAt }));
    },
    async getEvidenciaDisputa(id) {
      const e = estado.evidenciasDisputa?.get(Number(id));
      if (!e) return null;
      return { ...e };
    },
    async registrarVotoDisputa({ disputaId, socio, voto }) {
      if (!estado.votosDisputa) estado.votosDisputa = new Map();
      const clave = `${disputaId}:${socio.toLowerCase()}`;
      estado.votosDisputa.set(clave, { disputaId: Number(disputaId), socio: socio.toLowerCase(), voto, createdAt: new Date().toISOString() });
      return 1;
    },
    async listarVotosDisputa(disputaId) {
      return [...(estado.votosDisputa?.values() ?? [])]
        .filter((v) => v.disputaId === Number(disputaId))
        .map((v) => ({ socio: v.socio, voto: v.voto }));
    },

    // ------------------------------------------------------------ notificaciones (memoria)
    async crearNotificacion({ wallet, tipo, titulo, cuerpo, refTipo, refId }) {
      if (!estado.notificaciones) estado.notificaciones = [];
      const n = {
        id: estado.notificaciones.length + 1,
        wallet: wallet.toLowerCase(),
        tipo,
        titulo: titulo ?? '',
        cuerpo: cuerpo ?? null,
        refTipo: refTipo ?? null,
        refId: refId ?? null,
        leida: false,
        createdAt: new Date().toISOString(),
      };
      estado.notificaciones.push(n);
      return n;
    },
    async listarNotificaciones(wallet) {
      return [...(estado.notificaciones ?? [])]
        .filter((n) => n.wallet === wallet.toLowerCase())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 50);
    },
    async contarNotificacionesNoLeidas(wallet) {
      return (estado.notificaciones ?? []).filter((n) => n.wallet === wallet.toLowerCase() && !n.leida).length;
    },
    async marcarNotificacionLeida(id, wallet) {
      const n = (estado.notificaciones ?? []).find((x) => x.id === Number(id) && x.wallet === wallet.toLowerCase());
      if (n) n.leida = true;
      return true;
    },
    async marcarNotificacionesLeidas(wallet) {
      for (const n of estado.notificaciones ?? []) {
        if (n.wallet === wallet.toLowerCase()) n.leida = true;
      }
      return true;
    },

    // ------------------------------------------------------------ puntos de encuentro (CU-16, punto 5.1)
    /** Crea un punto de encuentro del usuario (PostGIS en pg; lat/lng en memoria). */
    crearPunto({ wallet, lat, lng, direccion, radioKm = 10 }) {
      const id = proxPunto++;
      const u = estado.usuarios.get(wallet);
      estado.puntos.set(id, {
        id,
        usuarioId: u?.id ?? wallet,
        wallet,
        lat: Number(lat),
        lng: Number(lng),
        direccion: direccion ?? '',
        radioKm: Number(radioKm),
        aprobadoSocios: false,
        createdAt: new Date().toISOString(),
      });
      return estado.puntos.get(id);
    },
    listarPuntos() {
      return [...estado.puntos.values()];
    },
    getPunto(id) {
      return estado.puntos.get(Number(id)) ?? null;
    },
    listarPuntosDe(wallet) {
      return [...estado.puntos.values()].filter((p) => p.wallet === wallet);
    },
    /** Marca un punto como usado (upsert en favoritos — punto 7: últimos usados). */
    registrarUsoPunto(wallet, puntoId) {
      const p = estado.puntos.get(Number(puntoId));
      if (!p) return null;
      const clave = `${wallet}:${p.id}`;
      estado.puntosFavoritos.set(clave, { wallet, puntoId: p.id, ultimoUso: new Date().toISOString() });
      return { puntoId: p.id, ultimoUso: estado.puntosFavoritos.get(clave).ultimoUso };
    },
    /** Puntos favoritos/últimos usados del usuario, más recientes primero. */
    listarPuntosFavoritosDe(wallet) {
      const filas = [...(estado.puntosFavoritos?.values() ?? [])]
        .filter((f) => f.wallet === wallet)
        .sort((a, b) => (a.ultimoUso < b.ultimoUso ? 1 : -1));
      return filas
        .map((f) => ({ ...f, punto: estado.puntos.get(f.puntoId) ?? null }))
        .filter((f) => f.punto);
    },

    // ------------------------------------------------------------ truekes (espejo de escrow)
    crearTrueke(t) {
      const id = proxTrueke++;
      // Modelo unificado: usuarioA/usuarioB (la API crea con escrowId sintético negativo)
      estado.truekes.set(id, {
        id,
        escrowId: t.escrowId ?? -id,
        usuarioA: t.usuarioA ?? null,
        usuarioB: t.usuarioB ?? (t.parteB ?? null),
        articuloAId: t.articuloAId ?? t.articulo_a_id ?? null,
        articuloBId: t.articuloBId ?? t.articulo_b_id ?? null,
        estado: 'CREADO',
        horaPautada: t.horaPautada ?? null,
        createdAt: new Date().toISOString(),
        ...t,
      });
      return id; // devuelve el id numérico
    },
    /** Oferta abierta de A en el Mercado (estado PROPUESTO, sin contraparte — punto 3). */
    crearOferta(o) {
      const id = proxTrueke++;
      estado.truekes.set(id, {
        id,
        escrowId: o.escrowId ?? -id,
        usuarioA: o.usuarioA ?? null,
        usuarioB: null,
        articuloAId: o.articuloAId ?? null,
        articuloBId: null,
        estado: 'PROPUESTO',
        descripcionRequerida: o.descripcionRequerida ?? null,
        tipoRequerido: o.tipoRequerido ?? null,
        horaPautada: null,
        cierreA: null,
        cierreB: null,
        createdAt: new Date().toISOString(),
      });
      return id;
    },
    /** Lista las ofertas abiertas del Mercado (truekes PROPUESTO). */
    listarOfertas() {
      return [...estado.truekes.values()].filter((t) => t.estado === 'PROPUESTO');
    },
    /** B acuerda una oferta: pasa de PROPUESTO a CREADO con su artículo y contraparte. */
    acordarOferta(id, { usuarioB, articuloBId }) {
      const t = estado.truekes.get(Number(id));
      if (!t) return null;
      if (t.estado !== 'PROPUESTO') return null;
      t.usuarioB = usuarioB.toLowerCase();
      t.articuloBId = articuloBId;
      t.estado = 'CREADO';
      return t;
    },
    /** Registra el cierre Conforme/No Conforme de una parte (punto 9). */
    registrarCierre(id, { lado, conforme }) {
      const t = estado.truekes.get(Number(id));
      if (!t) return null;
      if (lado === 'A') t.cierreA = conforme ? 'CONFORME' : 'NO_CONFORME';
      else if (lado === 'B') t.cierreB = conforme ? 'CONFORME' : 'NO_CONFORME';
      return t;
    },
    getTrueke(id) {
      return estado.truekes.get(Number(id)) ?? null;
    },
    actualizarTrueke(id, cambios) {
      const t = estado.truekes.get(Number(id));
      if (!t) return null;
      Object.assign(t, cambios);
      return t;
    },

    // ------------------------------------------------------------ métricas
    contarTruekes() { return estado.truekes.size; },
    listarTruekes() { return [...estado.truekes.values()]; },
    listarEncargos() { return [...estado.encargos.values()]; },

    // ------------------------------------------------------------ subastas (memoria — RF-17, CU-25/26, D27)
    crearSubasta({ empresaWallet, articuloId, pujaInicial, incrementoMinimo = 0, duracionHoras = 24 }) {
      if (!estado.subastas) estado.subastas = new Map();
      const id = estado.subastas.size + 1;
      const ahora = new Date();
      const art = estado.articulos.get(Number(articuloId)) ?? null;
      const s = {
        id,
        empresa: (empresaWallet || '').toLowerCase(),
        empresaUsername: null,
        articuloId: articuloId != null ? Number(articuloId) : null,
        articuloTitulo: art?.titulo ?? null,
        articuloRubro: art?.rubro ?? null,
        articuloCategoria: art?.categoria ?? null,
        pujaInicial: Number(pujaInicial),
        incrementoMinimo: Number(incrementoMinimo),
        duracionHoras: Number(duracionHoras),
        estado: 'ABIERTA',
        pujas: [],
        ganador: null,
        cierraEn: new Date(ahora.getTime() + Number(duracionHoras) * 3_600_000).toISOString(),
        createdAt: ahora.toISOString(),
      };
      estado.subastas.set(id, s);
      return s;
    },
    getSubasta(id) {
      return estado.subastas?.get(Number(id)) ?? null;
    },
    listarSubastas({ estado: filtro } = {}) {
      const todas = [...(estado.subastas?.values() ?? [])].sort((a, b) => b.id - a.id);
      return filtro ? todas.filter((s) => s.estado === filtro) : todas;
    },
    agregarPujaSubasta(id, { wallet, valor, nivel }) {
      const s = estado.subastas?.get(Number(id));
      if (!s || s.estado !== 'ABIERTA') return null;
      s.pujas.push({ wallet: (wallet || '').toLowerCase(), valor: Number(valor), nivel: nivel ?? 'INICIADO', en: new Date().toISOString() });
      return s;
    },
    cerrarSubasta(id, { ganadorWallet = null, valor = null, nivel = null } = {}) {
      const s = estado.subastas?.get(Number(id));
      if (!s || s.estado !== 'ABIERTA') return null;
      if (ganadorWallet) {
        s.estado = 'CERRADA';
        s.ganador = { wallet: ganadorWallet.toLowerCase(), valor: valor != null ? Number(valor) : null, nivel };
      } else {
        s.estado = 'ANULADA';
        s.ganador = null;
      }
      return s;
    },

    // ------------------------------------------------------------ sesiones
    guardarSesion(token, wallet) {
      estado.sesiones.set(token, { wallet, createdAt: new Date().toISOString() });
    },
    getSesion(token) {
      return estado.sesiones.get(token) ?? null;
    },
  };
}
