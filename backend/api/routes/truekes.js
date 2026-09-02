// =============================================================================
// TrueKeate — Router /truekes (Ciclo 6)
// Orquesta la creación y avance de trueques (CU-11…15). En esta capa se
// construyen los intents EIP-712 hacia el Escrow y se delega el envío al
// Relayer (C5) cuando el actor es un Particular sin gas; las Empresas envían
// transacciones directas pagando su gas (R1/RF-09.3).
// La confirmación on-chain de cada paso actualiza el espejo `truekes`
// vía el indexador (C4) — aquí se registra el intent aceptado.
// =============================================================================
import { Router } from 'express';
import { requiereSesion, requiereEstado } from '../lib/auth.js';

export function crearRouterTruekes({ almacen, relayer, escrowAbi, contratoEscrow, proveedor, walletEmpresas }) {
  const r = Router();

  // Helper: firma el intent y delega al relayer (particulares) o envía directo (empresas).
  async function _enviar(req, res, operacion, args, data) {
    const u = almacen.getUsuario(req.wallet);
    const esEmpresa = u.tipo === 'EMPRESA';

    if (esEmpresa && walletEmpresas) {
      // Empresa paga su gas (R1): transacción directa al Escrow
      const signer = walletEmpresas; // en producción se resuelve por empresa
      const contrato = new (await import('ethers')).Contract(contratoEscrow, escrowAbi, signer);
      const tx = await contrato[operacion](...args);
      const rc = await tx.wait();
      return res.json({ ok: true, txHash: rc.hash });
    }

    if (relayer) {
      // Particular: firma EIP-712 (el frontend firma) y el relayer paga el gas (CU-23)
      const { signer, nonce, firma, chainId } = req.body;
      const rl = await relayer.procesarIntent({ signer, destino: contratoEscrow, valor: 0n, data, nonce, firma, chainId });
      if (!rl.ok) return res.status(422).json({ error: 'meta_tx_rechazada', detalle: rl.motivo });
      return res.json({ ok: true, txHash: rl.txHash });
    }

    // Sin red configurada (tests): registrar intención en el espejo
    return res.json({ ok: true, simulado: true });
  }

  // POST /truekes — crear trueque (requiere Verificado/Certificado; D14)
  r.post('/', requiereSesion(almacen), requiereEstado(almacen, 'VERIFICADO', 'CERTIFICADO'), async (req, res, next) => {
    try {
      const u = almacen.getUsuario(req.wallet);
      const { parteB, activoA, activoB, horaPautada } = req.body;
      if (!parteB || !activoA || !activoB) {
        return res.status(400).json({ error: 'datos_incompletos' });
      }
      // Verificado: máx. 3 trueques activos (RF-14.4)
      const activos = almacen.listarTruekes().filter(
        (t) => (t.usuarioA === req.wallet || t.usuarioB === req.wallet) && ['CREADO', 'ACTIVO', 'CUSTODIADO', 'APERTURA'].includes(t.estado)
      ).length;
      if (u.estado === 'VERIFICADO' && activos >= 3) {
        return res.status(403).json({ error: 'max_3_activos', detalle: 'RF-14.4' });
      }
      const id = almacen.crearTrueke({ usuarioA: req.wallet, parteB, activoA, activoB, horaPautada });
      res.status(201).json({ trueke: almacen.getTrueke(id) });
    } catch (e) { next(e); }
  });

  // GET /truekes/:id — detalle del trueque (CU-05.1: info de confianza)
  r.get('/:id', (req, res) => {
    const t = almacen.getTrueke(req.params.id);
    if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
    res.json({ trueke: t });
  });

  // POST /truekes/:id/custodiar — custodiarA/B (CU-12)
  r.post('/:id/custodiar', requiereSesion(almacen), (req, res, next) => {
    try {
      const t = almacen.getTrueke(req.params.id);
      if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
      const lado = req.body.lado; // 'A' o 'B'
      if (lado === 'A' && t.usuarioA !== req.wallet) return res.status(403).json({ error: 'no_autorizado' });
      if (lado === 'B' && t.parteB !== req.wallet) return res.status(403).json({ error: 'no_autorizado' });
      almacen.actualizarTrueke(t.id, { estado: 'CUSTODIADO' });
      res.json({ trueke: almacen.getTrueke(t.id) });
    } catch (e) { next(e); }
  });

  // POST /truekes/:id/firma-recepcion — firmar recepción (CU-14)
  r.post('/:id/firma-recepcion', requiereSesion(almacen), (req, res) => {
    const t = almacen.getTrueke(req.params.id);
    if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
    const lado = req.body.lado;
    if (lado === 'A' && t.usuarioA !== req.wallet) return res.status(403).json({ error: 'no_autorizado' });
    if (lado === 'B' && t.parteB !== req.wallet) return res.status(403).json({ error: 'no_autorizado' });
    almacen.actualizarTrueke(t.id, { [`firma${lado}`]: true });
    res.json({ trueke: almacen.getTrueke(t.id) });
  });

  // POST /truekes/:id/valoracion — marcar valoración (D36: marcador; detalle off-chain)
  r.post('/:id/valoracion', requiereSesion(almacen), (req, res) => {
    const t = almacen.getTrueke(req.params.id);
    if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
    const { valorado, aceptacion, honestidad, seguridad, confiabilidad, compromiso } = req.body;
    const vals = [aceptacion, honestidad, seguridad, confiabilidad, compromiso];
    if (vals.some((v) => !Number.isInteger(v) || v < 1 || v > 5)) {
      return res.status(400).json({ error: 'valoraciones_1_a_5', detalle: 'D18' });
    }
    // marcador on-chain (D36) + detalle en el espejo
    almacen.actualizarTrueke(t.id, { valoracionDe: req.wallet, valorado, renglones: vals });
    res.json({ ok: true, trueke: almacen.getTrueke(t.id) });
  });

  return r;
}
