// =============================================================================
// TrueKeate — Auth lib (Ciclo 6)
// Sesión por firma EIP-191 (mensaje personal) + token de sesión opaco.
// Middleware `requiereWallet` y `requiereRol` para control de acceso por
// tipo de usuario (RF-14.x). La escalera D28 vive en el módulo kyc.
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

/** Middleware: exige encabezado Authorization: Bearer <token> con sesión válida. */
export function requiereSesion(almacen) {
  return (req, res, next) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const sesion = token ? almacen.getSesion(token) : null;
    if (!sesion) return res.status(401).json({ error: 'no_autorizado' });
    req.wallet = sesion.wallet;
    req.usuario = almacen.getUsuario(sesion.wallet);
    next();
  };
}

/** Middleware: exige rol/tipo (PARTICULAR/EMPRESA/SOCIO) o estado de la escalera D28. */
export function requiereEstado(almacen, ...estados) {
  return (req, _res, next) => {
    const u = almacen.getUsuario(req.wallet);
    if (!u) return next(Object.assign(new Error('usuario inexistente'), { status: 404 }));
    if (!estados.includes(u.estado)) {
      return next(Object.assign(new Error(`estado requerido: ${estados.join('/')}`), { status: 403, code: 'estado_requerido' }));
    }
    next();
  };
}
