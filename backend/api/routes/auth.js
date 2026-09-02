// =============================================================================
// TrueKeate — Router /auth (Ciclo 6)
// Registro/inscripción ERC-4337 (CU-01): connect (wallet), register (datos +
// consentimiento GDPR), session (firma EIP-191). Escalera D28 inicia en INSCRITO.
// =============================================================================
import { Router } from 'express';
import { recuperarFirmante, nuevoToken } from '../lib/auth.js';

export function crearRouterAuth({ almacen }) {
  const r = Router();

  // POST /auth/connect — el frontend anuncia la wallet conectada (inscripción automática RF-01.4)
  r.post('/connect', (req, res) => {
    const { wallet } = req.body;
    if (!/^0x[0-9a-fA-F]{40}$/.test(wallet || '')) {
      return res.status(400).json({ error: 'wallet_invalida' });
    }
    let u = almacen.getUsuario(wallet.toLowerCase());
    if (!u) u = almacen.crearUsuario({ wallet: wallet.toLowerCase() });
    res.json({ usuario: u });
  });

  // POST /auth/register — formaliza inscripción (correo/teléfono) + consentimiento GDPR (D17)
  r.post('/register', (req, res) => {
    const { wallet, correo, telefono, consentimientoGdpr } = req.body;
    const w = (wallet || '').toLowerCase();
    const u = almacen.getUsuario(w);
    if (!u) return res.status(404).json({ error: 'usuario_inexistente' });
    if (!consentimientoGdpr) {
      return res.status(400).json({ error: 'consentimiento_requerido', detalle: 'GDPR (D17)' });
    }
    const actualizado = almacen.actualizarUsuario(w, { correo, telefono, consentimientoGdpr: true });
    res.json({ usuario: actualizado });
  });

  // POST /auth/session — valida firma EIP-191 y emite token de sesión
  r.post('/session', (req, res) => {
    const { mensaje, firma } = req.body;
    let wallet;
    try {
      wallet = recuperarFirmante(mensaje || MENSAJE, firma || '0x').toLowerCase();
    } catch {
      return res.status(401).json({ error: 'firma_invalida' });
    }
    const u = almacen.getUsuario(wallet);
    if (!u) return res.status(404).json({ error: 'usuario_inexistente' });
    const token = nuevoToken();
    almacen.guardarSesion(token, wallet);
    res.json({ token, usuario: u });
  });

  return r;
}

const MENSAJE = 'TrueKeate: iniciar sesión';
