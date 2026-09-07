// =============================================================================
// TrueKeate — Auth lib (Ciclo 6 + firma por acción)
// Sesión por firma EIP-191 (mensaje personal) + token de sesión opaco.
// Middleware `requiereSesion`, `requiereEstado` y `requiereFirmaAccion` para
// control de acceso por tipo de usuario (RF-14.x) y por firma de la billetera
// en cada operación sensible (decisión del director: seguridad por acción).
// =============================================================================
import { ethers } from 'ethers';
import { randomBytes } from 'node:crypto';

const MENSAJE_SESION = 'TrueKeate: iniciar sesión';

/** Recupera la wallet firmante de un mensaje EIP-191. */
export function recuperarFirmante(mensaje, firma) {
  return ethers.verifyMessage(mensaje, firma);
}

/** Genera un token de sesión opaco. */
export function nuevoToken() {
  return randomBytes(24).toString('hex');
}

/** Ventana anti-replay para las firmas por acción (5 minutos). */
const VENTANA_FIRMA_MS = 5 * 60 * 1000;

/**
 * Construye el mensaje canónico de una acción con timestamp anti-replay.
 * Formato: `TrueKeate: <acción> (ts=<epoch_ms>)`.
 */
export function mensajeAccion(accion, ts = Date.now()) {
  return `TrueKeate: ${accion} (ts=${Math.floor(ts)})`;
}

/**
 * Valida una firma por acción (EIP-191) contra la wallet de la sesión.
 * @param {string} accion  texto de la acción (p. ej. 'publicar artículo').
 * @param {string} mensaje mensaje firmado por el cliente (con ts).
 * @param {string} firma   firma EIP-191.
 * @param {string} wallet  wallet de la sesión (req.wallet).
 * @returns {{ok:true}|{ok:false,error:string,codigo?:string}}
 */
export function validarFirmaAccion(accion, mensaje, firma, wallet) {
  if (!mensaje || !firma) {
    return { ok: false, error: 'firma_requerida', codigo: 'firma_requerida' };
  }
  const esperadoPrefijo = `TrueKeate: ${accion} (ts=`;
  if (!String(mensaje).startsWith(esperadoPrefijo)) {
    return { ok: false, error: 'mensaje_invalido', codigo: 'mensaje_invalido' };
  }
  // anti-replay: el ts del mensaje debe estar dentro de la ventana
  const tsTexto = String(mensaje).slice(esperadoPrefijo.length, -1);
  const ts = Number(tsTexto);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > VENTANA_FIRMA_MS) {
    return { ok: false, error: 'firma_expirada', codigo: 'firma_expirada' };
  }
  let firmante;
  try {
    firmante = recuperarFirmante(mensaje, firma).toLowerCase();
  } catch {
    return { ok: false, error: 'firma_invalida', codigo: 'firma_invalida' };
  }
  if (firmante !== String(wallet).toLowerCase()) {
    return { ok: false, error: 'firma_no_corresponde', codigo: 'firma_no_corresponde' };
  }
  return { ok: true };
}

/** Middleware: exige encabezado Authorization: Bearer <token> con sesión válida. */
export function requiereSesion(almacen) {
  return async (req, res, next) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const sesion = token ? await almacen.getSesion(token) : null;
    if (!sesion) return res.status(401).json({ error: 'no_autorizado' });
    req.wallet = sesion.wallet;
    req.usuario = await almacen.getUsuario(sesion.wallet);
    next();
  };
}

/** Middleware: exige rol/tipo (PARTICULAR/EMPRESA/SOCIO) o estado de la escalera D28. */
export function requiereEstado(almacen, ...estados) {
  return async (req, _res, next) => {
    const u = await almacen.getUsuario(req.wallet);
    if (!u) return next(Object.assign(new Error('usuario inexistente'), { status: 404 }));
    if (!estados.includes(u.estado)) {
      return next(Object.assign(new Error(`estado requerido: ${estados.join('/')}`), { status: 403, code: 'estado_requerido' }));
    }
    next();
  };
}

/**
 * Middleware de FIRMA POR ACCIÓN (decisión del director):
 * exige que el body incluya `mensaje` + `firma` de la billetera (EIP-191) para
 * una acción concreta, válidos contra la wallet de la sesión (req.wallet).
 * @param {string} accion texto de la acción canónica (p. ej. 'publicar artículo').
 */
export function requiereFirmaAccion(accion) {
  return (req, res, next) => {
    const { mensaje, firma } = req.body ?? {};
    const v = validarFirmaAccion(accion, mensaje, firma, req.wallet);
    if (!v.ok) return res.status(403).json({ error: v.error, detalle: `firma requerida para: ${accion}` });
    next();
  };
}
