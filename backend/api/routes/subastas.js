// =============================================================================
// TrueKeate — Router /subastas (Ciclo 8, CU-25/26, D27)
// RF-17: solo Empresas crean subastas (RF-17.1); solo Certificados pujan con
// prioridad por nivel (RF-17.2); gana el mayor valor, empate → mayor nivel (D27).
// =============================================================================
import { Router } from 'express';
import { requiereSesion } from '../lib/auth.js';

const PRIORIDAD_NIVEL = { INICIADO: 0, COMUN: 1, FRECUENTE: 2, SOCIO: 3 };

export function crearRouterSubastas({ almacen }) {
  const r = Router();
  // almacenamiento local de subastas (puente a PostgreSQL en C8)
  const subastas = new Map();
  let proxId = 1;

  // POST /subastas — crear subasta (solo Empresa — RF-17.1)
  r.post('/', requiereSesion(almacen), async (req, res) => {
    const u = await almacen.getUsuario(req.wallet);
    if (u.tipo !== 'EMPRESA') {
      return res.status(403).json({ error: 'solo_empresa', detalle: 'RF-17.1' });
    }
    const { articuloId, pujaInicial, incrementoMinimo, duracionHoras } = req.body;
    if (!articuloId || !pujaInicial) {
      return res.status(400).json({ error: 'datos_incompletos' });
    }
    const id = proxId++;
    subastas.set(id, {
      id,
      empresa: req.wallet,
      articuloId,
      pujaInicial,
      incrementoMinimo: incrementoMinimo ?? 0,
      duracionHoras: duracionHoras ?? 24,
      estado: 'ABIERTA',
      pujas: [],
      createdAt: new Date().toISOString(),
      cierraEn: Date.now() + (duracionHoras ?? 24) * 3_600_000,
    });
    res.status(201).json({ subasta: subastas.get(id) });
  });

  // GET /subastas — listar abiertas
  r.get('/', (_req, res) => {
    res.json({ subastas: [...subastas.values()].filter((s) => s.estado === 'ABIERTA') });
  });

  // POST /subastas/:id/pujas — pujar (solo Certificado — RF-17.2)
  r.post('/:id/pujas', requiereSesion(almacen), async (req, res) => {
    const u = await almacen.getUsuario(req.wallet);
    if (u.estado !== 'CERTIFICADO') {
      return res.status(403).json({ error: 'solo_certificado', detalle: 'RF-17.2' });
    }
    const sub = subastas.get(Number(req.params.id));
    if (!sub || sub.estado !== 'ABIERTA') return res.status(404).json({ error: 'subasta_no_disponible' });
    const { valor } = req.body;
    if (!valor || valor < sub.pujaInicial) {
      return res.status(400).json({ error: 'puja_baja', detalle: 'debe superar la puja inicial' });
    }
    const ultima = sub.pujas[sub.pujas.length - 1];
    if (ultima && valor < ultima.valor + sub.incrementoMinimo) {
      return res.status(400).json({ error: 'incremento_minimo' });
    }
    sub.pujas.push({ wallet: req.wallet, valor, nivel: u.nivel, en: new Date().toISOString() });
    res.json({ subasta: sub });
  });

  // POST /subastas/:id/cerrar — adjudica: mayor valor, empate → mayor nivel (D27)
  r.post('/:id/cerrar', requiereSesion(almacen), (req, res) => {
    const sub = subastas.get(Number(req.params.id));
    if (!sub) return res.status(404).json({ error: 'subasta_inexistente' });
    if (sub.estado !== 'ABIERTA') return res.status(400).json({ error: 'ya_cerrada' });
    if (Date.now() < sub.cierraEn) {
      return res.status(400).json({ error: 'no_vencida', detalle: `cierra en ${Math.ceil((sub.cierraEn - Date.now()) / 60000)} min` });
    }
    if (sub.pujas.length === 0) {
      sub.estado = 'ANULADA';
      return res.json({ subasta: sub, ganador: null });
    }
    // D27: mayor valor; empate → mayor nivel (prioridad por nivel RF-17.2)
    let ganador = sub.pujas[0];
    for (const p of sub.pujas.slice(1)) {
      if (p.valor > ganador.valor) ganador = p;
      else if (p.valor === ganador.valor && (PRIORIDAD_NIVEL[p.nivel] ?? 0) > (PRIORIDAD_NIVEL[ganador.nivel] ?? 0)) {
        ganador = p;
      }
    }
    sub.estado = 'CERRADA';
    sub.ganador = ganador;
    res.json({ subasta: sub, ganador });
  });

  return r;
}
