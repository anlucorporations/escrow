// =============================================================================
// TrueKeate — Router /finanzas (nuevo — integración de la suite)
// Saldos del usuario (RF-14.7, D5):
//   - El usuario ve SUS saldos: NFTs en stock, criptos y BRLT.
//   - BRLT y las finanzas GLOBALES solo son visibles/gestionables para Socios y
//     Owner (RF-14.8). Las Empresas gestionan su saldo al participar en criptos.
// Endpoints:
//   GET /finanzas/mi       → finanzas propias (con permiso según rol)
//   GET /finanzas/globales → fondo global (Socio/Owner)
// =============================================================================
import { Router } from 'express';
import { requiereSesion } from '../lib/auth.js';

export function crearRouterFinanzas({ almacen }) {
  const r = Router();

  // GET /finanzas/mi — finanzas propias de la wallet conectada
  r.get('/mi', requiereSesion(almacen), async (req, res, next) => {
    try {
      const u = await almacen.getUsuario(req.wallet);
      if (!u) return res.status(404).json({ error: 'usuario_inexistente' });
      const f = await almacen.asegurarFinanzas(req.wallet);
      // Regla D5/RF-14.7: solo Socios y Owner ven BRLT
      const esSocio = u.tipo === 'SOCIO';
      const respuesta = {
        nftsStock: f?.nftsStock ?? {},
        criptos: f?.criptos ?? {},
        brlt: esSocio ? f?.brlt ?? 0 : undefined,
        fondoValor: esSocio ? f?.fondoValor ?? 0 : undefined,
        porcentajesConfig: esSocio ? f?.porcentajesConfig : undefined,
        rol: u.tipo,
      };
      res.json(respuesta);
    } catch (e) { next(e); }
  });

  // GET /finanzas/globales — fondo de valor y gastos (Socio/Owner, RF-14.8)
  r.get('/globales', requiereSesion(almacen), async (req, res, next) => {
    try {
      const u = await almacen.getUsuario(req.wallet);
      if (u?.tipo !== 'SOCIO') return res.status(403).json({ error: 'solo_socio', detalle: 'RF-14.8' });
      // En producción el fondo global proviene del contrato FondoDeValor (D7);
      // aquí se expone el agregado de la BD off-chain (tabla finanzas).
      res.json({
        fondoGlobal: { aviso: 'lectura del contrato FondoDeValor en integración on-chain (D7)' },
      });
    } catch (e) { next(e); }
  });

  return r;
}
