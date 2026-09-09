// =============================================================================
// TrueKeate — Router /notificaciones (campana in-app — decisión del director)
// Centro de avisos: disputas reportadas, pedidos de justificativo, votaciones
// abiertas para Socios y veredictos a los involucrados.
//   GET  /notificaciones            → mis avisos (últimas 50) + contador no leídas
//   POST /notificaciones/leer-todas → marcar todas como leídas
//   POST /notificaciones/:id/leida  → marcar una como leída
// =============================================================================
import { Router } from 'express';
import { requiereSesion } from '../lib/auth.js';

export function crearRouterNotificaciones({ almacen }) {
  const r = Router();

  r.get('/', requiereSesion(almacen), async (req, res, next) => {
    try {
      const notificaciones = await almacen.listarNotificaciones(req.wallet);
      const noLeidas = await almacen.contarNotificacionesNoLeidas(req.wallet);
      res.json({ notificaciones, noLeidas });
    } catch (e) { next(e); }
  });

  r.post('/leer-todas', requiereSesion(almacen), async (req, res, next) => {
    try {
      await almacen.marcarNotificacionesLeidas(req.wallet);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  r.post('/:id/leida', requiereSesion(almacen), async (req, res, next) => {
    try {
      await almacen.marcarNotificacionLeida(Number(req.params.id), req.wallet);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  return r;
}
