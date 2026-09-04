// =============================================================================
// TrueKeate — Router /disputas (nuevo — integración de la suite)
// Disputas de trueques (CU-18/19, RF-14.8, D13/D21):
//   - GET /disputas            → disputas donde la wallet es parte
//   - POST /disputas           → solicitar anulación (motivo) → EN_DISPUTA
//   - GET /disputas/:id        → detalle con votos (si es parte o Socio)
// El registro de votos on-chain (SociosRegistry) se refleja en `registro_votos`.
// =============================================================================
import { Router } from 'express';
import { requiereSesion } from '../lib/auth.js';

export function crearRouterDisputas({ almacen }) {
  const r = Router();

  // GET /disputas — disputas donde la wallet es parte (A o B del trueque)
  r.get('/', requiereSesion(almacen), async (req, res, next) => {
    try {
      const todas = await almacen.listarDisputas();
      const mías = todas.filter(
        (d) => d.usuarioA === req.wallet || d.usuarioB === req.wallet
      );
      res.json({ disputas: mías });
    } catch (e) { next(e); }
  });

  // POST /disputas — solicitar anulación de un trueque propio (motivo)
  r.post('/', requiereSesion(almacen), async (req, res, next) => {
    try {
      const { truekeId, motivo } = req.body;
      if (!truekeId) return res.status(400).json({ error: 'trueke_id_requerido' });
      const t = await almacen.getTrueke(truekeId);
      if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
      const esParte = t.usuarioA === req.wallet || t.usuarioB === req.wallet;
      if (!esParte) return res.status(403).json({ error: 'no_autorizado' });
      if (t.estado !== 'CUSTODIADO' && t.estado !== 'APERTURA' && t.estado !== 'ACTIVO') {
        return res.status(409).json({ error: 'estado_no_disputable', detalle: `estado actual: ${t.estado}` });
      }
      const d = await almacen.crearDisputa({ truekeId, solicitante: req.wallet, motivo });
      res.status(201).json({ disputa: d });
    } catch (e) { next(e); }
  });

  // GET /disputas/:id — detalle (parte del trueque o Socio)
  r.get('/:id', requiereSesion(almacen), async (req, res, next) => {
    try {
      const todas = await almacen.listarDisputas();
      const d = todas.find((x) => x.id === Number(req.params.id));
      if (!d) return res.status(404).json({ error: 'disputa_inexistente' });
      const u = await almacen.getUsuario(req.wallet);
      const esParte = d.usuarioA === req.wallet || d.usuarioB === req.wallet;
      if (!esParte && u?.tipo !== 'SOCIO') {
        return res.status(403).json({ error: 'no_autorizado' });
      }
      res.json({ disputa: d });
    } catch (e) { next(e); }
  });

  return r;
}
