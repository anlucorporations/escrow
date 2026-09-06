// =============================================================================
// TrueKeate — Router /puntos-encuentro (lógica maestra punto 5.1)
// Puntos de encuentro del usuario (CU-16, RF-08, PostGIS ≤10 km) y favoritos
// ("últimos puntos de encuentro usados, reutilizables como favoritos" — punto 7).
//
// Endpoints:
//   GET  /puntos-encuentro/mios           → mis puntos guardados
//   POST /puntos-encuentro                → crear punto {lat, lng, direccion?, radioKm?}
//   GET  /puntos-encuentro/favoritos      → últimos usados (favoritos), más recientes primero
//   POST /puntos-encuentro/:id/usar       → marca el punto como usado (upsert favorito)
// =============================================================================
import { Router } from 'express';
import { requiereSesion } from '../lib/auth.js';

export function crearRouterPuntosEncuentro({ almacen }) {
  const r = Router();

  // GET /puntos-encuentro/mios — mis puntos guardados
  r.get('/mios', requiereSesion(almacen), async (req, res, next) => {
    try {
      const puntos = await almacen.listarPuntosDe(req.wallet);
      res.json({ puntos });
    } catch (e) { next(e); }
  });

  // POST /puntos-encuentro — crear un punto de encuentro { lat, lng, direccion?, radioKm? }
  r.post('/', requiereSesion(almacen), async (req, res, next) => {
    try {
      const { lat, lng, direccion, radioKm } = req.body;
      if (lat === undefined || lng === undefined || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
        return res.status(400).json({ error: 'lat_lng_requeridos', detalle: 'lat y lng numéricos (WGS84)' });
      }
      const latN = Number(lat);
      const lngN = Number(lng);
      if (latN < -90 || latN > 90 || lngN < -180 || lngN > 180) {
        return res.status(400).json({ error: 'coordenadas_invalidas' });
      }
      const punto = await almacen.crearPunto({
        wallet: req.wallet, lat: latN, lng: lngN,
        direccion: direccion ?? '', radioKm: radioKm ?? 10,
      });
      res.status(201).json({ punto });
    } catch (e) { next(e); }
  });

  // GET /puntos-encuentro/favoritos — últimos puntos usados (favoritos), más recientes primero
  r.get('/favoritos', requiereSesion(almacen), async (req, res, next) => {
    try {
      const favoritos = await almacen.listarPuntosFavoritosDe(req.wallet);
      res.json({ favoritos });
    } catch (e) { next(e); }
  });

  // POST /puntos-encuentro/:id/usar — marcar un punto como usado (upsert en favoritos)
  r.post('/:id/usar', requiereSesion(almacen), async (req, res, next) => {
    try {
      const puntoId = Number(req.params.id);
      const punto = await almacen.getPunto(puntoId);
      if (!punto) return res.status(404).json({ error: 'punto_inexistente' });
      const uso = await almacen.registrarUsoPunto(req.wallet, puntoId);
      res.json({ ok: true, uso });
    } catch (e) { next(e); }
  });

  return r;
}
