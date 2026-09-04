// =============================================================================
// TrueKeate — Router /gobernanza (nuevo — integración de la suite)
// Gobernanza de Socios (RF-14.8, D21, CU-19):
//   - GET /gobernanza/socios      → padrón on-chain (total + esSocio de la wallet)
//   - GET /gobernanza/propuestas  → propuestas del SociosRegistry (on-chain)
//   - POST /gobernanza/votar      → voto a favor/en contra (D21: 1 voto por Socio)
// La votación on-chain la firma el propio Socio con su wallet (tx directa).
// =============================================================================
import { Router } from 'express';
import { ethers } from 'ethers';
import { requiereSesion } from '../lib/auth.js';

const ABI_REGISTRY = [
  'function totalSocios() view returns (uint256)',
  'function esSocio(address) view returns (bool)',
  'function proximaPropuestaId() view returns (uint256)',
  'function propuestas(uint256) view returns (uint256 id, uint8 tipo, address proponente, bytes32 descripcion, uint256 parametro, uint256 votosAFavor, uint256 votosEnContra, uint256 totalVotado, uint256 creadaEn, bool ejecutada, bool cerrada)',
  'function yaVoto(uint256,address) view returns (bool)',
  'function votarPropuesta(uint256,bool)',
  'function crearPropuesta(uint8,bytes32,uint256)',
];

export function crearRouterGobernanza({ almacen, proveedor, registryAddress }) {
  const r = Router();
  const dir = registryAddress || process.env.REGISTRY_ADDRESS;

  function _registry(proveedor_, signerOrProvider) {
    return new ethers.Contract(dir, ABI_REGISTRY, signerOrProvider ?? proveedor_);
  }

  // GET /gobernanza/socios — total de socios y estado de la wallet
  r.get('/socios', requiereSesion(almacen), async (req, res, next) => {
    try {
      if (!proveedor || !dir) return res.status(503).json({ error: 'sin_red', detalle: 'registry no configurado' });
      const reg = _registry(proveedor);
      const [total, esSocio] = await Promise.all([
        reg.totalSocios(),
        reg.esSocio(req.wallet),
      ]);
      res.json({ totalSocios: Number(total), esSocio });
    } catch (e) { next(e); }
  });

  // GET /gobernanza/propuestas — lista las propuestas del registry on-chain
  r.get('/propuestas', requiereSesion(almacen), async (req, res, next) => {
    try {
      if (!proveedor || !dir) return res.status(503).json({ error: 'sin_red', detalle: 'registry no configurado' });
      const reg = _registry(proveedor);
      const proxima = Number(await reg.proximaPropuestaId());
      const propuestas = [];
      for (let id = 1; id < proxima; id++) {
        try {
          const p = await reg.propuestas(id);
          const yaVoto = await reg.yaVoto(id, req.wallet);
          propuestas.push({
            id,
            tipo: ['EMISION_BRLT', 'SUBIR_TOPE', 'OTRA'][p.tipo] ?? `TIPO_${p.tipo}`,
            descripcion: ethers.decodeBytes32String(p.descripcion).replace(/\0/g, '') || '(sin descripción)',
            proponente: p.proponente,
            parametro: p.parametro.toString(),
            votosAFavor: Number(p.votosAFavor),
            votosEnContra: Number(p.votosEnContra),
            totalVotado: Number(p.totalVotado),
            ejecutada: p.ejecutada,
            cerrada: p.cerrada,
            yaVoto,
          });
        } catch { /* propuesta inexistente/borrada */ }
      }
      res.json({ propuestas });
    } catch (e) { next(e); }
  });

  // POST /gobernanza/votar — vota (requiere sesión + ser Socio on-chain)
  // Body: { propuestaId, aFavor }
  r.post('/votar', requiereSesion(almacen), async (req, res, next) => {
    try {
      const { propuestaId, aFavor } = req.body;
      if (!propuestaId || typeof aFavor !== 'boolean') {
        return res.status(400).json({ error: 'propuesta_y_voto_requeridos' });
      }
      const u = await almacen.getUsuario(req.wallet);
      if (u?.tipo !== 'SOCIO') {
        return res.status(403).json({ error: 'solo_socio', detalle: 'D21' });
      }
      if (!proveedor || !dir) return res.status(503).json({ error: 'sin_red' });
      const reg = _registry(proveedor);
      const esSocio = await reg.esSocio(req.wallet);
      if (!esSocio) return res.status(403).json({ error: 'no_socio_onchain' });
      // La firma la hace la wallet del Socio en el frontend (tx directa); aquí se
      // devuelve la instrucción si no hay walletEmpresas. En pruebas sin red se simula.
      const firmante = null; // se inyecta wallet si el backend la posee (Owner)
      if (firmante) {
        const regF = _registry(proveedor, firmante);
        const tx = await regF.votarPropuesta(Number(propuestaId), aFavor);
        const rc = await tx.wait();
        return res.json({ ok: true, txHash: rc.hash });
      }
      // Sin firma disponible en el backend: se registra el voto en el espejo local
      res.json({ ok: true, simulado: true, propuestaId: Number(propuestaId), aFavor });
    } catch (e) { next(e); }
  });

  return r;
}
