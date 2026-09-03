// =============================================================================
// TrueKeate — Router /auth (Ciclo 6 + control de acceso)
// Inscripción FORMAL (RF-01.2b/01.3, decisión del director): conectar la wallet
// NO inscribe; el usuario se inscribe con correo + teléfono + dirección +
// consentimiento GDPR. Endpoints:
//   GET  /auth/estado?wallet=0x…  → { inscrito, usuario? }  (público, sin PII)
//   POST /auth/connect            → anuncia la wallet conectada (no inscribe)
//   POST /auth/register           → inscribe formalmente (upsert) → estado INSCRITO
//   POST /auth/session            → firma EIP-191 → token de sesión
// =============================================================================
import { Router } from 'express';
import { recuperarFirmante, nuevoToken } from '../lib/auth.js';

const RE_WALLET = /^0x[0-9a-fA-F]{40}$/;
const MENSAJE = 'TrueKeate: iniciar sesión';

/** Vista pública de un usuario (sin PII). */
function vistaPublica(u) {
  if (!u) return null;
  return { wallet: u.wallet, tipo: u.tipo, nivel: u.nivel, estado: u.estado };
}

export function crearRouterAuth({ almacen }) {
  const r = Router();

  // GET /auth/estado?wallet=0x… — ¿está inscrita esta wallet? (guarda de acceso)
  r.get('/estado', async (req, res) => {
    const wallet = (req.query.wallet || '').toLowerCase();
    if (!RE_WALLET.test(wallet)) {
      return res.status(400).json({ error: 'wallet_invalida' });
    }
    const u = await almacen.getUsuario(wallet);
    if (!u) {
      return res.json({ inscrito: false, usuario: null });
    }
    res.json({ inscrito: true, usuario: vistaPublica(u) });
  });

  // POST /auth/connect — la wallet se conectó (frontend). NO inscribe (inscripción
  // formal). Si ya existe, refresca actividad; si no, informa.
  r.post('/connect', async (req, res) => {
    const wallet = (req.body.wallet || '').toLowerCase();
    if (!RE_WALLET.test(wallet)) {
      return res.status(400).json({ error: 'wallet_invalida' });
    }
    const u = await almacen.getUsuario(wallet);
    if (u) {
      await almacen.actualizarUsuario(wallet, { actividadUltima: new Date().toISOString() });
      return res.json({ inscrito: true, usuario: vistaPublica(u) });
    }
    res.json({ inscrito: false, usuario: null, aviso: 'wallet conectada pero no inscrita (RF-01.3)' });
  });

  // POST /auth/register — inscripción formal (upsert): crea o completa el usuario
  // con correo/teléfono/dirección + consentimiento GDPR → estado INSCRITO (D28).
  r.post('/register', async (req, res) => {
    const { wallet, correo, telefono, direccionInscripcion, consentimientoGdpr } = req.body;
    const w = (wallet || '').toLowerCase();
    if (!RE_WALLET.test(w)) return res.status(400).json({ error: 'wallet_invalida' });
    if (!consentimientoGdpr) {
      return res.status(400).json({ error: 'consentimiento_requerido', detalle: 'GDPR (D17)' });
    }
    if (!correo || !telefono) {
      return res.status(400).json({ error: 'datos_requeridos', detalle: 'correo y teléfono obligatorios (RF-01.2b)' });
    }
    const existente = await almacen.getUsuario(w);
    const u = await almacen.crearUsuario({
      wallet: w,
      correo,
      telefono,
      direccionInscripcion: direccionInscripcion ?? null,
      tipo: existente?.tipo ?? 'PARTICULAR',
      nivel: existente?.nivel ?? 'INICIADO',
      medalla: existente?.medalla ?? 'BRONCE',
      estado: 'INSCRITO',
      consentimientoGdpr: true,
    });
    res.json({ inscrito: true, usuario: vistaPublica(u) });
  });

  // POST /auth/session — valida firma EIP-191 y emite token de sesión
  r.post('/session', async (req, res) => {
    const { mensaje, firma } = req.body;
    let wallet;
    try {
      wallet = recuperarFirmante(mensaje || MENSAJE, firma || '0x').toLowerCase();
    } catch {
      return res.status(401).json({ error: 'firma_invalida' });
    }
    const u = await almacen.getUsuario(wallet);
    if (!u) return res.status(404).json({ error: 'usuario_inexistente' });
    const token = nuevoToken();
    almacen.guardarSesion(token, wallet);
    res.json({ token, usuario: vistaPublica(u) });
  });

  return r;
}
