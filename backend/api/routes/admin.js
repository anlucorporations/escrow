// =============================================================================
// TrueKeate — Router /admin (Ciclo 6)
// Dashboard del Owner (RF-13.1): contratos desplegados, usuarios inscritos,
// KPIs de disputas, estado de la BD off-chain e infraestructura (relayer/indexador).
// =============================================================================
import { Router } from 'express';
import { requiereSesion } from '../lib/auth.js';

export function crearRouterAdmin({ almacen, relayer, indexador, contratos }) {
  const r = Router();

  // GET /admin/usuarios — usuarios inscritos
  r.get('/usuarios', requiereSesion(almacen), (req, res) => {
    const u = almacen.getUsuario(req.wallet);
    if (u?.tipo !== 'SOCIO' && u?.rol !== 'OWNER') {
      return res.status(403).json({ error: 'solo_owner' });
    }
    res.json({ total: almacen.listarUsuarios().length, usuarios: almacen.listarUsuarios() });
  });

  // GET /admin/contratos — direcciones de los contratos desplegados
  r.get('/contratos', requiereSesion(almacen), (req, res) => {
    res.json({ contratos: contratos ?? {} });
  });

  // GET /admin/kpis-disputas — KPIs de disputas (resumen desde el espejo)
  r.get('/kpis-disputas', requiereSesion(almacen), (_req, res) => {
    const truekes = almacen.listarTruekes();
    const disputas = truekes.filter((t) => t.estado === 'EN_DISPUTA' || t.estado === 'RESOLUCION_SOCIOS').length;
    res.json({ totalTruekes: truekes.length, disputasAbiertas: disputas });
  });

  // GET /admin/db — estado de la BD off-chain
  r.get('/db', requiereSesion(almacen), (_req, res) => {
    res.json({
      usuarios: almacen.listarUsuarios().length,
      articulos: almacen.listarArticulos().length,
      truekes: almacen.contarTruekes(),
    });
  });

  // GET /admin/infra/health — salud del relayer e indexador (D15/H-17)
  r.get('/infra/health', requiereSesion(almacen), async (_req, res) => {
    const salida = {};
    if (relayer?.health) salida.relayer = await relayer.health();
    if (relayer?.metricas) salida.relayerMetricas = relayer.metricas();
    if (indexador?.metricasLag) salida.indexador = await indexador.metricasLag();
    res.json(salida);
  });

  return r;
}
