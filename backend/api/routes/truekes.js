// =============================================================================
// TrueKeate — Router /truekes (Ciclo 6 + persistencia)
// Orquesta la creación y avance de trueques (CU-11…15). Modelo persistido:
//   - La API crea el trueque en el espejo `truekes` con escrow_id sintético
//     negativo (sin colisión con los on-chain del indexador, RNF-01.1).
//   - Los pasos (custodiar / firmar / valorar) actualizan el espejo y, cuando hay
//     red configurada (relayer/Escrow), se delega on-chain vía EIP-712 (CU-23).
// Endpoints:
//   GET  /truekes                → mis trueques (parte A o B)
//   POST /truekes                → crear trueque (requiere Verificado/Certificado)
//   GET  /truekes/:id            → detalle
//   POST /truekes/:id/custodiar  → custodiarA/B
//   POST /truekes/:id/firma-recepcion → firmar recepción A/B
//   POST /truekes/:id/valoracion → valoración 1–5 (D18/D36)
// =============================================================================
import { Router } from 'express';
import { requiereSesion, requiereEstado } from '../lib/auth.js';

export function crearRouterTruekes({ almacen, relayer, escrowAbi, contratoEscrow, walletEmpresas }) {
  const r = Router();

  // GET /truekes — mis trueques (solo los de la wallet conectada)
  r.get('/', requiereSesion(almacen), async (req, res, next) => {
    try {
      const todos = await almacen.listarTruekes();
      const mios = todos.filter(
        (t) => t.usuarioA === req.wallet || t.usuarioB === req.wallet
      );
      res.json({ truekes: mios });
    } catch (e) { next(e); }
  });

  // POST /truekes — crear trueque (requiere Verificado/Certificado; D14)
  // Body: { articuloAId, articuloBId, parteB, horaPautada? }
  r.post('/', requiereSesion(almacen), requiereEstado(almacen, 'VERIFICADO', 'CERTIFICADO'), async (req, res, next) => {
    try {
      const u = await almacen.getUsuario(req.wallet);
      const { articuloAId, articuloBId, parteB, horaPautada } = req.body;
      if (!parteB || !articuloAId || !articuloBId) {
        return res.status(400).json({ error: 'datos_incompletos', detalle: 'articuloAId, articuloBId y parteB' });
      }
      // Verificado: máx. 3 trueques activos (RF-14.4)
      const todos = await almacen.listarTruekes();
      const activos = todos.filter(
        (t) => (t.usuarioA === req.wallet || t.usuarioB === req.wallet) && ['CREADO', 'ACTIVO', 'CUSTODIADO', 'APERTURA'].includes(t.estado)
      ).length;
      if (u.estado === 'VERIFICADO' && activos >= 3) {
        return res.status(403).json({ error: 'max_3_activos', detalle: 'RF-14.4' });
      }
      const id = await almacen.crearTrueke({
        usuarioA: req.wallet,
        parteB: parteB.toLowerCase(),
        articuloAId,
        articuloBId,
        horaPautada: horaPautada ?? null,
      });
      res.status(201).json({ trueke: await almacen.getTrueke(id) });
    } catch (e) { next(e); }
  });

  // GET /truekes/:id — detalle del trueque (CU-05.1: info de confianza)
  r.get('/:id', requiereSesion(almacen), async (req, res) => {
    const t = await almacen.getTrueke(req.params.id);
    if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
    res.json({ trueke: t });
  });

  // POST /truekes/:id/custodiar — custodiarA/B (CU-12)
  r.post('/:id/custodiar', requiereSesion(almacen), async (req, res, next) => {
    try {
      const t = await almacen.getTrueke(req.params.id);
      if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
      const lado = String(req.body.lado || '').toUpperCase();
      if (lado === 'A' && t.usuarioA !== req.wallet) return res.status(403).json({ error: 'no_autorizado' });
      if (lado === 'B' && t.usuarioB !== req.wallet) return res.status(403).json({ error: 'no_autorizado' });
      const actualizado = await almacen.actualizarTrueke(t.id, { estado: 'CUSTODIADO' });
      res.json({ trueke: actualizado });
    } catch (e) { next(e); }
  });

  // POST /truekes/:id/firma-recepcion — firmar recepción (CU-14)
  r.post('/:id/firma-recepcion', requiereSesion(almacen), async (req, res, next) => {
    try {
      const t = await almacen.getTrueke(req.params.id);
      if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
      const lado = String(req.body.lado || '').toUpperCase();
      if (lado === 'A' && t.usuarioA !== req.wallet) return res.status(403).json({ error: 'no_autorizado' });
      if (lado === 'B' && t.usuarioB !== req.wallet) return res.status(403).json({ error: 'no_autorizado' });
      const actualizado = await almacen.actualizarTrueke(t.id, { [`firma${lado}`]: true });
      res.json({ trueke: actualizado });
    } catch (e) { next(e); }
  });

  // POST /truekes/:id/valoracion — marcar valoración (D36: marcador; detalle off-chain)
  r.post('/:id/valoracion', requiereSesion(almacen), async (req, res, next) => {
    try {
      const t = await almacen.getTrueke(req.params.id);
      if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
      const { valorado, aceptacion, honestidad, seguridad, confiabilidad, compromiso } = req.body;
      const vals = [aceptacion, honestidad, seguridad, confiabilidad, compromiso];
      if (vals.some((v) => !Number.isInteger(v) || v < 1 || v > 5)) {
        return res.status(400).json({ error: 'valoraciones_1_a_5', detalle: 'D18' });
      }
      const actualizado = await almacen.actualizarTrueke(t.id, {
        valoracionDe: req.wallet,
        valorado,
        renglones: vals,
      });
      res.json({ ok: true, trueke: actualizado });
    } catch (e) { next(e); }
  });

  return r;
}
