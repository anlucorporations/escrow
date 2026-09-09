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
import { crearDetectorOwner } from '../lib/es-owner.js';

const RE_WALLET = /^0x[0-9a-fA-F]{40}$/;
const MENSAJE = 'TrueKeate: iniciar sesión';

/** Deriva un username legible (handle) a partir del correo o de la wallet. */
export function derivarUsername(correo, wallet) {
  if (correo && typeof correo === 'string') {
    const local = correo.split('@')[0].trim();
    if (local) return local.replace(/[^a-zA-Z0-9_.-]/g, '.').slice(0, 40);
  }
  return `u_${(wallet || '').slice(2, 10).toLowerCase()}`;
}

/** Vista pública de un usuario (sin PII: nunca expone correo/teléfono). */
function vistaPublica(u) {
  if (!u) return null;
  return {
    wallet: u.wallet,
    username: u.username ?? null,
    tipo: u.tipo,
    nivel: u.nivel,
    estado: u.estado,
    medalla: u.medalla ?? null,
  };
}

export function crearRouterAuth({ almacen, proveedor, registryAddress, ownerWallet }) {
  const r = Router();
  const owner = crearDetectorOwner({ almacen, proveedor, registryAddress, ownerWallet });

  // GET /auth/estado?wallet=0x… — ¿está inscrita esta wallet? (guarda de acceso)
  r.get('/estado', async (req, res) => {
    const wallet = (req.query.wallet || '').toLowerCase();
    if (!RE_WALLET.test(wallet)) {
      return res.status(400).json({ error: 'wallet_invalida' });
    }
    const u = await almacen.getUsuario(wallet);
    if (!u) {
      return res.json({ inscrito: false, usuario: null, esOwner: await owner.esOwner(wallet) });
    }
    res.json({ inscrito: true, usuario: vistaPublica(u), esOwner: await owner.esOwner(wallet) });
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
      return res.json({ inscrito: true, usuario: vistaPublica(u), esOwner: await owner.esOwner(wallet) });
    }
    res.json({ inscrito: false, usuario: null, aviso: 'wallet conectada pero no inscrita (RF-01.3)' });
  });

  // POST /auth/register — inscripción formal (upsert): crea o completa el usuario
  // con correo/teléfono/dirección + consentimiento GDPR → estado INSCRITO (D28).
  r.post('/register', async (req, res) => {
    const { wallet, correo, telefono, direccionInscripcion, consentimientoGdpr, username } = req.body;
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
      // username explícito si llega; si no, derivado del correo (handle legible)
      username:
        (typeof username === 'string' && username.trim() ? username.trim().replace(/[^a-zA-Z0-9_.-]/g, '.').slice(0, 40) : null) ??
        derivarUsername(correo, w),
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
    res.json({ token, usuario: vistaPublica(u), esOwner: await owner.esOwner(wallet) });
  });

  return r;
}
