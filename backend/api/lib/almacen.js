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
  };
  let proxArticulo = 1;
  let proxEncargo = 1;
  let proxTrueke = 1;

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
        estado: 'ABIERTA',
        createdAt: new Date().toISOString(),
        usuarioA: t.usuarioA,
        usuarioB: t.usuarioB,
      };
      estado.disputas.set(id, d);
      t.estado = 'EN_DISPUTA';
      return d;
    },
    listarDisputas() {
      return [...(estado.disputas?.values() ?? [])];
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

    // ------------------------------------------------------------ sesiones
    guardarSesion(token, wallet) {
      estado.sesiones.set(token, { wallet, createdAt: new Date().toISOString() });
    },
    getSesion(token) {
      return estado.sesiones.get(token) ?? null;
    },
  };
}
