// =============================================================================
// TrueKeate — Router /subastas (Ciclo 8 + persistencia PostgreSQL 2026-09-09)
// RF-17: solo Empresas crean subastas (RF-17.1); solo Certificados pujan con
// prioridad por nivel (RF-17.2); gana el mayor valor, empate → mayor nivel (D27).
//
// Las subastas se PERSISTEN en la tabla `subastas` (antes vivían en un Map local
// que se perdía al reiniciar y no se compartía entre instancias de Cloud Run).
// El cierre es AUTOMÁTICO Y PEREZOSO: al listar o ver el detalle, toda subasta
// ABIERTA ya vencida se adjudica (D27) o se ANULA si no tuvo pujas.
// =============================================================================
import { Router } from 'express';
import { requiereSesion } from '../lib/auth.js';

const PRIORIDAD_NIVEL = { INICIADO: 0, COMUN: 1, FRECUENTE: 2, SOCIO: 3 };

export function crearRouterSubastas({ almacen }) {
  const r = Router();

  /** Adjudica una subasta vencida (D27: mayor valor; empate → mayor nivel). */
  async function cerrarSiVencida(s) {
    if (!s || s.estado !== 'ABIERTA' || !s.cierraEn) return s;
    if (Date.now() < new Date(s.cierraEn).getTime()) return s;
    if (!s.pujas || s.pujas.length === 0) {
      return (await almacen.cerrarSubasta(s.id, {})) ?? s; // ANULADA (sin pujas)
    }
    let ganador = s.pujas[0];
    for (const p of s.pujas.slice(1)) {
      if (p.valor > ganador.valor) ganador = p;
      else if (p.valor === ganador.valor && (PRIORIDAD_NIVEL[p.nivel] ?? 0) > (PRIORIDAD_NIVEL[ganador.nivel] ?? 0)) {
        ganador = p;
      }
    }
    return (await almacen.cerrarSubasta(s.id, { ganadorWallet: ganador.wallet, valor: ganador.valor, nivel: ganador.nivel })) ?? s;
  }

  /** ¿La wallet puede pujar? Solo CERTIFICADO (RF-17.2). */
  async function puedePujar(wallet) {
    const u = await almacen.getUsuario(wallet);
    return u?.estado === 'CERTIFICADO';
  }

  // GET /subastas — lista (por defecto ABIERTAS + CERRADAS/ANULADAS recientes)
  // query: ?estado=ABIERTA|CERRADA|ANULADA|TODAS
  r.get('/', async (req, res, next) => {
    try {
      const filtro = String(req.query.estado || '').toUpperCase();
      const todas = await almacen.listarSubastas();
      // cierre perezoso de las vencidas antes de responder
      const vivas = [];
      for (const s of todas) vivas.push(await cerrarSiVencida(s));
      const lista = filtro && filtro !== 'TODAS'
        ? vivas.filter((s) => s.estado === filtro)
        : filtro === 'TODAS'
          ? vivas
          : vivas.filter((s) => s.estado === 'ABIERTA').concat(vivas.filter((s) => s.estado !== 'ABIERTA').slice(0, 10));
      res.json({ subastas: lista });
    } catch (e) { next(e); }
  });

  // GET /subastas/mis — subastas que creé (Empresa) + subastas donde pujé
  r.get('/mis', requiereSesion(almacen), async (req, res, next) => {
    try {
      const todas = await almacen.listarSubastas();
      const vivas = [];
      for (const s of todas) vivas.push(await cerrarSiVencida(s));
      const w = req.wallet;
      const creadas = vivas.filter((s) => s.empresa === w);
      const pujadas = vivas.filter((s) => s.empresa !== w && (s.pujas ?? []).some((p) => p.wallet === w));
      res.json({ creadas, pujadas });
    } catch (e) { next(e); }
  });

  // GET /subastas/:id — detalle con pujas (público: el catálogo de subastas es observable)
  r.get('/:id', async (req, res, next) => {
    try {
      let s = await almacen.getSubasta(req.params.id);
      if (!s) return res.status(404).json({ error: 'subasta_inexistente' });
      s = await cerrarSiVencida(s);
      res.json({ subasta: s });
    } catch (e) { next(e); }
  });

  // POST /subastas — crear subasta (solo Empresa — RF-17.1)
  // Body: { articuloId, pujaInicial, incrementoMinimo?, duracionHoras? }
  r.post('/', requiereSesion(almacen), async (req, res, next) => {
    try {
      const u = await almacen.getUsuario(req.wallet);
      if (u?.tipo !== 'EMPRESA') {
        return res.status(403).json({ error: 'solo_empresa', detalle: 'RF-17.1: solo las Empresas crean subastas' });
      }
      const { articuloId, pujaInicial, incrementoMinimo, duracionHoras } = req.body ?? {};
      const inicial = Number(pujaInicial);
      if (!articuloId || !Number.isFinite(inicial) || inicial <= 0) {
        return res.status(400).json({ error: 'datos_incompletos', detalle: 'articuloId y pujaInicial > 0 son obligatorios' });
      }
      // el artículo debe ser de la Empresa y estar publicado
      const art = await almacen.getArticulo(Number(articuloId));
      const dueno = art ? (art.usuarioWallet ?? art.wallet) : null;
      if (!art || dueno !== req.wallet) {
        return res.status(403).json({ error: 'articulo_no_autorizado', detalle: 'el artículo debe ser tuyo y estar publicado' });
      }
      if (art.disponible === false) {
        return res.status(409).json({ error: 'articulo_no_disponible', detalle: 'el artículo está retirado del mercado' });
      }
      const horas = Number.isFinite(Number(duracionHoras)) && Number(duracionHoras) > 0 ? Number(duracionHoras) : 24;
      const s = await almacen.crearSubasta({
        empresaWallet: req.wallet,
        articuloId: Number(articuloId),
        pujaInicial: inicial,
        incrementoMinimo: Number.isFinite(Number(incrementoMinimo)) && Number(incrementoMinimo) >= 0 ? Number(incrementoMinimo) : 0,
        duracionHoras: horas,
      });
      res.status(201).json({ subasta: s });
    } catch (e) { next(e); }
  });

  // POST /subastas/:id/pujas — pujar (solo Certificado — RF-17.2)
  // Body: { valor }
  r.post('/:id/pujas', requiereSesion(almacen), async (req, res, next) => {
    try {
      if (!(await puedePujar(req.wallet))) {
        return res.status(403).json({ error: 'solo_certificado', detalle: 'RF-17.2: solo usuarios Certificados pueden pujar' });
      }
      let sub = await almacen.getSubasta(req.params.id);
      if (!sub) return res.status(404).json({ error: 'subasta_inexistente' });
      sub = await cerrarSiVencida(sub);
      if (sub.estado !== 'ABIERTA') {
        return res.status(409).json({ error: 'subasta_no_disponible', detalle: `estado actual: ${sub.estado}` });
      }
      if (sub.empresa === req.wallet) {
        return res.status(403).json({ error: 'no_autorizado', detalle: 'la Empresa creadora no puede pujar en su propia subasta' });
      }
      const valor = Number(req.body?.valor);
      if (!Number.isFinite(valor) || valor <= 0) {
        return res.status(400).json({ error: 'valor_invalido' });
      }
      if (valor < sub.pujaInicial) {
        return res.status(400).json({ error: 'puja_baja', detalle: `debe ser al menos la puja inicial (${sub.pujaInicial})` });
      }
      const ultima = sub.pujas?.[sub.pujas.length - 1];
      if (ultima && valor < ultima.valor + (sub.incrementoMinimo ?? 0)) {
        return res.status(400).json({ error: 'incremento_minimo', detalle: `mínimo ${ultima.valor + (sub.incrementoMinimo ?? 0)}` });
      }
      const u = await almacen.getUsuario(req.wallet);
      const actualizada = await almacen.agregarPujaSubasta(sub.id, { wallet: req.wallet, valor, nivel: u?.nivel ?? 'INICIADO' });
      if (!actualizada) return res.status(409).json({ error: 'subasta_no_disponible' });
      res.json({ subasta: actualizada });
    } catch (e) { next(e); }
  });

  // POST /subastas/:id/cerrar — adjudicación manual (Empresa creadora) tras el vencimiento
  r.post('/:id/cerrar', requiereSesion(almacen), async (req, res, next) => {
    try {
      let sub = await almacen.getSubasta(req.params.id);
      if (!sub) return res.status(404).json({ error: 'subasta_inexistente' });
      if (sub.estado !== 'ABIERTA') return res.status(400).json({ error: 'ya_cerrada' });
      if (Date.now() < new Date(sub.cierraEn).getTime()) {
        return res.status(400).json({ error: 'no_vencida', detalle: `cierra en ${Math.ceil((new Date(sub.cierraEn).getTime() - Date.now()) / 60000)} min` });
      }
      const cerrada = await cerrarSiVencida(sub);
      res.json({ subasta: cerrada, ganador: cerrada.ganador });
    } catch (e) { next(e); }
  });

  return r;
}
