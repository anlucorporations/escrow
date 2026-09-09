// =============================================================================
// TrueKeate — Router /disputas (flujo afinado del director, 2026-09-08)
// =============================================================================
// La disputa nace SOLO desde el cierre ✗ No Conforme (POST /truekes/:id/cierre
// con conforme:false + motivo + fotos), que llama a motor.abrirDisputaDesdeCierre.
// Flujo: REPORTADA → ESPERA_JUSTIFICATIVO → EN_VOTACION → RESUELTA.
// Aquí viven: justificativo del conforme, votación de Socios y detalle con pruebas.
// =============================================================================
import { Router } from 'express';
import { requiereSesion } from '../lib/auth.js';
import { crearMotorDisputas } from '../lib/flujo-disputas.js';

export function crearRouterDisputas({ almacen, proveedor, registryAddress }) {
  const r = Router();
  const motor = crearMotorDisputas({ almacen, proveedor, registryAddress });
  const { padronSocios, esSocioWallet, resolverVencidasSiAplica } = motor;

  // GET /disputas — disputas donde la wallet es parte (resuelve vencidas primero)
  r.get('/', requiereSesion(almacen), async (req, res, next) => {
    try {
      const todas = await almacen.listarDisputas();
      const mías = todas.filter((d) => d.usuarioA === req.wallet || d.usuarioB === req.wallet);
      const resultado = [];
      for (const d of mías) resultado.push(await resolverVencidasSiAplica(d));
      res.json({ disputas: resultado });
    } catch (e) { next(e); }
  });

  // GET /disputas/padron — padrón de socios + si la wallet puede votar (UI del Socio)
  r.get('/padron', requiereSesion(almacen), async (req, res, next) => {
    try {
      const padron = await padronSocios();
      const esSocio = await esSocioWallet(req.wallet);
      res.json({ esSocio, totalSocios: padron.length, padron });
    } catch (e) { next(e); }
  });

  // GET /disputas/votaciones — disputas EN_VOTACION y RESUELTAS recientes (Socios)
  r.get('/votaciones', requiereSesion(almacen), async (req, res, next) => {
    try {
      const padron = await padronSocios();
      if (!padron.includes(req.wallet)) {
        return res.status(403).json({ error: 'solo_socio', detalle: 'solo los Socios participan de las votaciones de disputas' });
      }
      const todas = await almacen.listarDisputas();
      const votables = [];
      for (const d of todas) {
        if (!['EN_VOTACION', 'RESUELTA'].includes(d.estado)) continue;
        const viva = await resolverVencidasSiAplica(d);
        const evidencias = await almacen.listarEvidenciasDisputa(d.id);
        const votos = await almacen.listarVotosDisputa(d.id);
        const soyParte = d.usuarioA === req.wallet || d.usuarioB === req.wallet;
        const miVoto = votos.find((v) => v.socio === req.wallet)?.voto ?? null;
        votables.push({ ...viva, evidencias, votos, soyParte, miVoto, puedeVotar: !soyParte && viva.estado === 'EN_VOTACION' });
      }
      res.json({ votaciones: votables });
    } catch (e) { next(e); }
  });

  // POST /disputas/:id/justificativo — el conforme carga fotos de justificativo → EN_VOTACION
  // Body: { fotos: [{ data, mime }] }  (la contraparte conforme aporta su evidencia)
  r.post('/:id/justificativo', requiereSesion(almacen), async (req, res, next) => {
    try {
      const d = await almacen.getDisputa(req.params.id);
      if (!d) return res.status(404).json({ error: 'disputa_inexistente' });
      const { fotos } = req.body ?? {};
      if (!Array.isArray(fotos) || fotos.length === 0 || !fotos.every((f) => f && typeof f.data === 'string' && f.mime)) {
        return res.status(400).json({ error: 'fotos_requeridas', detalle: 'el justificativo exige al menos una imagen { data: base64, mime }' });
      }
      if (!['REPORTADA', 'ESPERA_JUSTIFICATIVO'].includes(d.estado)) {
        return res.status(409).json({ error: 'estado_no_justificable', detalle: `estado actual: ${d.estado}` });
      }
      const t = await almacen.getTrueke(d.truekeId);
      const esParte = t.usuarioA === req.wallet || t.usuarioB === req.wallet;
      if (!esParte) return res.status(403).json({ error: 'no_autorizado' });
      if (d.solicitante === req.wallet) {
        return res.status(403).json({ error: 'no_autorizado', detalle: 'el justificativo lo carga la parte CONFORME, no el reclamante' });
      }
      // ¿Esta parte está conforme? Si aún no firmó su cierre, lo registra CONFORME aquí.
      const esA = t.usuarioA === req.wallet;
      const miCierre = esA ? t.cierreA : t.cierreB;
      if (miCierre !== 'CONFORME') {
        await almacen.registrarCierre(d.truekeId, { lado: esA ? 'A' : 'B', conforme: true });
      }
      for (const foto of fotos) {
        await almacen.agregarEvidenciaDisputa({ disputaId: d.id, autor: req.wallet, tipo: 'JUSTIFICATIVO', contenido: Buffer.from(foto.data, 'base64'), mime: foto.mime });
      }
      const viva = await motor.abrirVotacion(d);
      res.json({ disputa: viva });
    } catch (e) { next(e); }
  });

  // POST /disputas/:id/no-conforme — la contraparte declara TAMBIÉN No Conforme
  // Body: { motivo, fotos: [{ data, mime }] } → ambas partes con evidencia → EN_VOTACION
  r.post('/:id/no-conforme', requiereSesion(almacen), async (req, res, next) => {
    try {
      const d = await almacen.getDisputa(req.params.id);
      if (!d) return res.status(404).json({ error: 'disputa_inexistente' });
      const { motivo, fotos } = req.body ?? {};
      if (!motivo || !String(motivo).trim()) {
        return res.status(400).json({ error: 'motivo_requerido', detalle: 'describí el motivo de tu No Conforme' });
      }
      const lista = Array.isArray(fotos) ? fotos.filter((f) => f && typeof f.data === 'string') : [];
      if (lista.length === 0) {
        return res.status(400).json({ error: 'fotos_requeridas', detalle: 'subí al menos una foto de evidencia de tu reclamo' });
      }
      if (!['REPORTADA', 'ESPERA_JUSTIFICATIVO'].includes(d.estado)) {
        return res.status(409).json({ error: 'estado_no_declarable', detalle: `estado actual: ${d.estado}` });
      }
      const t = await almacen.getTrueke(d.truekeId);
      const esParte = t.usuarioA === req.wallet || t.usuarioB === req.wallet;
      if (!esParte) return res.status(403).json({ error: 'no_autorizado' });
      if (d.solicitante === req.wallet) {
        return res.status(403).json({ error: 'no_autorizado', detalle: 'vos ya sos el reclamante de esta disputa' });
      }
      // registrar el cierre NO_CONFORME de la contraparte (si aún no lo firmó)
      const esA = t.usuarioA === req.wallet;
      const miCierre = esA ? t.cierreA : t.cierreB;
      if (miCierre !== 'NO_CONFORME') {
        await almacen.registrarCierre(d.truekeId, { lado: esA ? 'A' : 'B', conforme: false });
      }
      await almacen.actualizarTrueke(d.truekeId, { estado: 'EN_DISPUTA' });
      for (const foto of lista) {
        await almacen.agregarEvidenciaDisputa({ disputaId: d.id, autor: req.wallet, tipo: 'RECLAMO', contenido: Buffer.from(foto.data, 'base64'), mime: foto.mime });
      }
      const viva = await motor.abrirVotacion(d);
      res.json({ disputa: viva });
    } catch (e) { next(e); }
  });

  // POST /disputas/:id/votar — voto del Socio: { voto: 'ANULAR' | 'VALIDO' }
  r.post('/:id/votar', requiereSesion(almacen), async (req, res, next) => {
    try {
      const d = await almacen.getDisputa(req.params.id);
      if (!d) return res.status(404).json({ error: 'disputa_inexistente' });
      const voto = String(req.body?.voto ?? '').toUpperCase();
      if (!['ANULAR', 'VALIDO'].includes(voto)) return res.status(400).json({ error: 'voto_invalido', detalle: 'usa ANULAR o VALIDO' });
      if (d.estado !== 'EN_VOTACION') {
        return res.status(409).json({ error: 'no_en_votacion', detalle: `estado actual: ${d.estado}` });
      }
      if (d.votacionVenceAt && new Date(d.votacionVenceAt).getTime() <= Date.now()) {
        return res.status(409).json({ error: 'votacion_vencida' });
      }
      const esSocio = await esSocioWallet(req.wallet);
      if (!esSocio) return res.status(403).json({ error: 'solo_socio', detalle: 'tu wallet no está en el padrón de Socios' });
      const t = await almacen.getTrueke(d.truekeId);
      const soyParte = t.usuarioA === req.wallet || t.usuarioB === req.wallet;
      if (soyParte) {
        return res.status(403).json({ error: 'socio_involucrado', detalle: 'un Socio que es parte del trueke en disputa no puede votar (punto 4 del director)' });
      }
      const votosYa = await almacen.listarVotosDisputa(d.id);
      if (votosYa.some((v) => v.socio === req.wallet)) {
        return res.status(409).json({ error: 'ya_voto', detalle: '1 voto por Socio (D21)' });
      }
      await almacen.registrarVotoDisputa({ disputaId: d.id, socio: req.wallet, voto });
      // Resolución: si votaron TODOS los socios elegibles → veredicto inmediato (mayoría simple)
      const partes = new Set([(t?.usuarioA || '').toLowerCase(), (t?.usuarioB || '').toLowerCase()].filter(Boolean));
      const elegibles = (await padronSocios()).filter((s) => !partes.has(s));
      const votos = await almacen.listarVotosDisputa(d.id);
      let viva = await almacen.getDisputa(d.id);
      if (elegibles.length > 0 && votos.length >= elegibles.length) {
        const a = votos.filter((v) => v.voto === 'ANULAR').length;
        const b = votos.filter((v) => v.voto === 'VALIDO').length;
        const final = a === b ? 'ANULAR' : (a > b ? 'ANULAR' : 'VALIDO'); // empate → ANULA por defecto
        viva = await motor.ejecutarVeredicto(d, t, final, `Votación completa (${elegibles.length} socios): ${a} ANULAR vs ${b} VALIDO → ${final === 'ANULAR' ? 'devolución total' : 'trueke válido'}`);
      }
      res.json({ ok: true, disputa: viva, voto });
    } catch (e) { next(e); }
  });

  // GET /disputas/:id — detalle con evidencias y votos (parte o Socio)
  r.get('/:id', requiereSesion(almacen), async (req, res, next) => {
    try {
      let d = await almacen.getDisputa(req.params.id);
      if (!d) return res.status(404).json({ error: 'disputa_inexistente' });
      const esParte = d.usuarioA === req.wallet || d.usuarioB === req.wallet;
      const esSocio = await esSocioWallet(req.wallet);
      if (!esParte && !esSocio) return res.status(403).json({ error: 'no_autorizado' });
      d = await resolverVencidasSiAplica(d);
      const t = await almacen.getTrueke(d.truekeId);
      const evidencias = await almacen.listarEvidenciasDisputa(d.id);
      const votos = await almacen.listarVotosDisputa(d.id);
      res.json({
        disputa: d,
        trueke: t,
        evidencias,
        votos,
        esParte,
        esSocio,
        miVoto: votos.find((v) => v.socio === req.wallet)?.voto ?? null,
        puedeVotar: esSocio && !esParte && d.estado === 'EN_VOTACION',
      });
    } catch (e) { next(e); }
  });

  // GET /disputas/:id/evidencia/:evId — imagen de una evidencia (parte o Socio)
  r.get('/:id/evidencia/:evId', requiereSesion(almacen), async (req, res, next) => {
    try {
      const d = await almacen.getDisputa(req.params.id);
      if (!d) return res.status(404).json({ error: 'disputa_inexistente' });
      const esParte = d.usuarioA === req.wallet || d.usuarioB === req.wallet;
      const esSocio = await esSocioWallet(req.wallet);
      if (!esParte && !esSocio) return res.status(403).json({ error: 'no_autorizado' });
      const ev = await almacen.getEvidenciaDisputa(req.params.evId);
      if (!ev || ev.disputaId !== d.id) return res.status(404).json({ error: 'evidencia_inexistente' });
      res.setHeader('Content-Type', ev.mime || 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=60');
      res.send(ev.contenido);
    } catch (e) { next(e); }
  });

  return r;
}
