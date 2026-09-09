// =============================================================================
// TrueKeate — Router /admin (Ciclo 6 + endurecimiento 2026-09-09)
// Dashboard del Owner (RF-13.1): contratos desplegados, usuarios inscritos,
// KPIs de disputas, estado de la BD off-chain e infraestructura (relayer/indexador).
//
// CONTROL DE ACCESO (director): TODAS las rutas /admin/* exigen sesión Y que la
// wallet sea el OWNER real (dueño on-chain del SociosRegistry, no "tipo SOCIO").
// Ana/Bruno (SOCIO) NO acceden a Sistemas; solo la wallet owner() del registry.
// =============================================================================
import { Router } from 'express';
import { requiereSesion } from '../lib/auth.js';
import { crearDetectorOwner } from '../lib/es-owner.js';

export function crearRouterAdmin({ almacen, relayer, indexador, contratos, proveedor, registryAddress, ownerWallet }) {
  const r = Router();
  const owner = crearDetectorOwner({ almacen, proveedor, registryAddress, ownerWallet });

  // GET /admin/usuarios — usuarios inscritos (solo Owner)
  r.get('/usuarios', requiereSesion(almacen), owner.requiereOwner, async (req, res) => {
    const todos = await almacen.listarUsuarios();
    res.json({ total: todos.length, usuarios: todos });
  });

  // GET /admin/contratos — direcciones de los contratos desplegados (solo Owner)
  r.get('/contratos', requiereSesion(almacen), owner.requiereOwner, (req, res) => {
    res.json({ contratos: contratos ?? {} });
  });

  // GET /admin/kpis-disputas — KPIs de disputas (solo Owner)
  r.get('/kpis-disputas', requiereSesion(almacen), owner.requiereOwner, async (_req, res) => {
    const truekes = await almacen.listarTruekes();
    const disputas = truekes.filter((t) => t.estado === 'EN_DISPUTA' || t.estado === 'RESOLUCION_SOCIOS').length;
    res.json({ totalTruekes: truekes.length, disputasAbiertas: disputas });
  });

  // GET /admin/db — estado de la BD off-chain (solo Owner)
  r.get('/db', requiereSesion(almacen), owner.requiereOwner, async (_req, res) => {
    const [usuarios, articulos] = await Promise.all([almacen.listarUsuarios(), almacen.listarArticulos()]);
    res.json({
      usuarios: usuarios.length,
      articulos: articulos.length,
      truekes: await almacen.contarTruekes(),
    });
  });

  // GET /admin/infra/health — salud del relayer e indexador (D15/H-17, solo Owner)
  r.get('/infra/health', requiereSesion(almacen), owner.requiereOwner, async (_req, res) => {
    const salida = {};
    if (relayer?.health) salida.relayer = await relayer.health();
    if (relayer?.metricas) salida.relayerMetricas = relayer.metricas();
    if (indexador?.metricasLag) salida.indexador = await indexador.metricasLag();
    res.json(salida);
  });

  // GET /admin/owner — wallet del Owner (público: el frontend oculta el icono
  // de Sistemas a quien NO sea esa wallet; sin PII adicional)
  r.get('/owner', async (_req, res) => {
    const ownerWallet = await owner.resolverOwner();
    res.json({ owner: ownerWallet ?? null });
  });

  return r;
}
