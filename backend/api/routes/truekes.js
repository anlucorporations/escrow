// =============================================================================
// TrueKeate — Router /truekes (Ciclo 6 + persistencia)
// Orquesta la creación y avance de trueques (CU-11…15). Modelo persistido:
//   - La API crea el trueque en el espejo `truekes` con escrow_id sintético
//     negativo (sin colisión con los on-chain del indexador, RNF-01.1).
//   - Los pasos (custodiar / firmar / valorar) actualizan el espejo y, cuando hay
//     red configurada (relayer/Escrow), se delega on-chain vía EIP-712 (CU-23).
// Endpoints:
//   GET  /truekes                → mis trueques (parte A o B)
//   POST /truekes                → crear trueque (requiere Verificado/Certificado)
//   GET  /truekes/:id            → detalle
//   POST /truekes/:id/custodiar  → custodiarA/B
//   POST /truekes/:id/firma-recepcion → firmar recepción A/B
//   POST /truekes/:id/valoracion → valoración 1–5 (D18/D36)
// =============================================================================
import { Router } from 'express';
import { requiereSesion, requiereEstado } from '../lib/auth.js';

export function crearRouterTruekes({ almacen, relayer, escrowAbi, contratoEscrow, walletEmpresas }) {
  const r = Router();

  // GET /truekes — mis trueques (solo los de la wallet conectada)
  r.get('/', requiereSesion(almacen), async (req, res, next) => {
    try {
      const todos = await almacen.listarTruekes();
      const mios = todos.filter(
        (t) => t.usuarioA === req.wallet || (t.usuarioB && t.usuarioB === req.wallet)
      );
      res.json({ truekes: mios });
    } catch (e) { next(e); }
  });

  // ===========================================================================
  // Modelo abierto-publicado (lógica maestra del director, RepoTecnico/logica_trueke.md):
  //   A publica una oferta (PROPUESTO) en el Mercado con su NFT + lo que quiere recibir;
  //   B la acuerda; el de mayor nivel/reputación propone punto/fecha/hora; el día del
  //   acuerdo cada parte firma Recibido Conforme (→ valoración) o No Conforme (→ disputa).
  // ===========================================================================

  // POST /truekes/ofertas — A publica una oferta abierta (requiere Verificado/Certificado)
  // Body: { articuloAId, descripcionRequerida, tipoRequerido? }  (puntos 2-3)
  r.post('/ofertas', requiereSesion(almacen), requiereEstado(almacen, 'VERIFICADO', 'CERTIFICADO'), async (req, res, next) => {
    try {
      const { articuloAId, descripcionRequerida, tipoRequerido } = req.body;
      if (!articuloAId || !descripcionRequerida) {
        return res.status(400).json({ error: 'datos_incompletos', detalle: 'articuloAId y descripcionRequerida' });
      }
      const u = await almacen.getUsuario(req.wallet);
      const todos = await almacen.listarArticulos();
      const mio = todos.find((a) => Number(a.id) === Number(articuloAId) && (a.usuarioWallet ?? a.wallet) === req.wallet);
      if (!mio) return res.status(403).json({ error: 'no_autorizado', detalle: 'el artículo debe ser tuyo y estar publicado' });

      // Verificado: máx. 3 trueques activos contando ofertas propias abiertas (RF-14.4)
      const activos = (await almacen.listarTruekes()).filter(
        (t) => (t.usuarioA === req.wallet || (t.usuarioB && t.usuarioB === req.wallet)) && ['PROPUESTO', 'CREADO', 'ACTIVO', 'CUSTODIADO', 'APERTURA'].includes(t.estado)
      ).length;
      if (u.estado === 'VERIFICADO' && activos >= 3) {
        return res.status(403).json({ error: 'max_3_activos', detalle: 'RF-14.4' });
      }
      const id = await almacen.crearOferta({
        usuarioA: req.wallet,
        articuloAId: Number(articuloAId),
        descripcionRequerida,
        tipoRequerido: tipoRequerido ?? null,
      });
      res.status(201).json({ trueke: await almacen.getTrueke(id) });
    } catch (e) { next(e); }
  });

  // GET /truekes/ofertas — ofertas abiertas del Mercado (observable con wallet — RF-14.3)
  r.get('/ofertas', async (_req, res, next) => {
    try {
      const ofertas = await almacen.listarOfertas();
      res.json({ truekes: ofertas });
    } catch (e) { next(e); }
  });

  // POST /truekes/:id/acordar — B acuerda la oferta (requiere Verificado/Certificado)
  // Body: { articuloBId }  (B ofrece su NFT; puntos 5-5.2)
  r.post('/:id/acordar', requiereSesion(almacen), requiereEstado(almacen, 'VERIFICADO', 'CERTIFICADO'), async (req, res, next) => {
    try {
      const t = await almacen.getTrueke(req.params.id);
      if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
      if (t.estado !== 'PROPUESTO') return res.status(409).json({ error: 'estado_no_acordable', detalle: `estado actual: ${t.estado}` });
      if (t.usuarioA === req.wallet) return res.status(403).json({ error: 'no_autorizado', detalle: 'no puedes acordar tu propia oferta' });

      const { articuloBId } = req.body;
      if (!articuloBId) return res.status(400).json({ error: 'articulo_b_requerido' });
      const todos = await almacen.listarArticulos();
      const mioB = todos.find((a) => Number(a.id) === Number(articuloBId) && (a.usuarioWallet ?? a.wallet) === req.wallet);
      if (!mioB) return res.status(403).json({ error: 'no_autorizado', detalle: 'el artículo B debe ser tuyo y estar publicado' });

      const u = await almacen.getUsuario(req.wallet);
      const activos = (await almacen.listarTruekes()).filter(
        (t2) => (t2.usuarioA === req.wallet || (t2.usuarioB && t2.usuarioB === req.wallet)) && ['CREADO', 'ACTIVO', 'CUSTODIADO', 'APERTURA'].includes(t2.estado)
      ).length;
      if (u.estado === 'VERIFICADO' && activos >= 3) {
        return res.status(403).json({ error: 'max_3_activos', detalle: 'RF-14.4' });
      }

      const acordado = await almacen.acordarOferta(t.id, { usuarioB: req.wallet, articuloBId: Number(articuloBId) });
      res.json({ trueke: acordado });
    } catch (e) { next(e); }
  });

  // GET /truekes/:id — detalle del trueque (CU-05.1: info de confianza)
  r.get('/:id', requiereSesion(almacen), async (req, res) => {
    const t = await almacen.getTrueke(req.params.id);
    if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
    res.json({ trueke: t });
  });

  // POST /truekes — crear trueque (requiere Verificado/Certificado; D14)
  // Body: { articuloAId, articuloBId, parteB, horaPautada? }
  r.post('/', requiereSesion(almacen), requiereEstado(almacen, 'VERIFICADO', 'CERTIFICADO'), async (req, res, next) => {
    try {
      const u = await almacen.getUsuario(req.wallet);
      const { articuloAId, articuloBId, parteB, horaPautada } = req.body;
      if (!parteB || !articuloAId || !articuloBId) {
        return res.status(400).json({ error: 'datos_incompletos', detalle: 'articuloAId, articuloBId y parteB' });
      }
      // Verificado: máx. 3 trueques activos (RF-14.4)
      const todos = await almacen.listarTruekes();
      const activos = todos.filter(
        (t) => (t.usuarioA === req.wallet || t.usuarioB === req.wallet) && ['CREADO', 'ACTIVO', 'CUSTODIADO', 'APERTURA'].includes(t.estado)
      ).length;
      if (u.estado === 'VERIFICADO' && activos >= 3) {
        return res.status(403).json({ error: 'max_3_activos', detalle: 'RF-14.4' });
      }
      const id = await almacen.crearTrueke({
        usuarioA: req.wallet,
        parteB: parteB.toLowerCase(),
        articuloAId,
        articuloBId,
        horaPautada: horaPautada ?? null,
      });
      res.status(201).json({ trueke: await almacen.getTrueke(id) });
    } catch (e) { next(e); }
  });

  // GET /truekes/:id — detalle del trueque (CU-05.1: info de confianza)
  r.get('/:id', requiereSesion(almacen), async (req, res) => {
    const t = await almacen.getTrueke(req.params.id);
    if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
    res.json({ trueke: t });
  });

  // POST /truekes/:id/custodiar — custodiarA/B (CU-12)
  r.post('/:id/custodiar', requiereSesion(almacen), async (req, res, next) => {
    try {
      const t = await almacen.getTrueke(req.params.id);
      if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
      const lado = String(req.body.lado || '').toUpperCase();
      if (lado === 'A' && t.usuarioA !== req.wallet) return res.status(403).json({ error: 'no_autorizado' });
      if (lado === 'B' && t.usuarioB !== req.wallet) return res.status(403).json({ error: 'no_autorizado' });
      const actualizado = await almacen.actualizarTrueke(t.id, { estado: 'CUSTODIADO' });
      res.json({ trueke: actualizado });
    } catch (e) { next(e); }
  });

  // POST /truekes/:id/firma-recepcion — firmar recepción (CU-14)
  r.post('/:id/firma-recepcion', requiereSesion(almacen), async (req, res, next) => {
    try {
      const t = await almacen.getTrueke(req.params.id);
      if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
      const lado = String(req.body.lado || '').toUpperCase();
      if (lado === 'A' && t.usuarioA !== req.wallet) return res.status(403).json({ error: 'no_autorizado' });
      if (lado === 'B' && t.usuarioB !== req.wallet) return res.status(403).json({ error: 'no_autorizado' });
      const actualizado = await almacen.actualizarTrueke(t.id, { [`firma${lado}`]: true });
      res.json({ trueke: actualizado });
    } catch (e) { next(e); }
  });

  // POST /truekes/:id/valoracion — marcar valoración (D36: marcador; detalle off-chain)
  r.post('/:id/valoracion', requiereSesion(almacen), async (req, res, next) => {
    try {
      const t = await almacen.getTrueke(req.params.id);
      if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
      const { valorado, aceptacion, honestidad, seguridad, confiabilidad, compromiso } = req.body;
      const vals = [aceptacion, honestidad, seguridad, confiabilidad, compromiso];
      if (vals.some((v) => !Number.isInteger(v) || v < 1 || v > 5)) {
        return res.status(400).json({ error: 'valoraciones_1_a_5', detalle: 'D18' });
      }
      const actualizado = await almacen.actualizarTrueke(t.id, {
        valoracionDe: req.wallet,
        valorado,
        renglones: vals,
      });
      res.json({ ok: true, trueke: actualizado });
    } catch (e) { next(e); }
  });

  // POST /truekes/:id/propuesta-encuentro — propone punto/fecha/hora del encuentro (punto 5.1)
  // Decide quién propone: mayor nivel D12 → mayor reputación → quien publicó (A).
  // Body: { puntoEncuentroId, horaPautada }  — el que gana la regla puede proponer.
  r.post('/:id/propuesta-encuentro', requiereSesion(almacen), async (req, res, next) => {
    try {
      const t = await almacen.getTrueke(req.params.id);
      if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
      if (t.estado !== 'CREADO' && t.estado !== 'ACTIVO') {
        return res.status(409).json({ error: 'estado_no_proponible', detalle: `estado actual: ${t.estado}` });
      }
      if (!t.usuarioB) return res.status(409).json({ error: 'sin_contraparte', detalle: 'la oferta aún no ha sido acordada' });

      const { puntoEncuentroId, horaPautada } = req.body;
      if (!puntoEncuentroId || !horaPautada) {
        return res.status(400).json({ error: 'datos_incompletos', detalle: 'puntoEncuentroId y horaPautada' });
      }

      // ---- regla: nivel D12 → reputación → A ----
      const ORDEN_NIVEL = { INICIADO: 0, COMUN: 1, FRECUENTE: 2, SOCIO: 3 };
      const [uA, uB] = [await almacen.getUsuario(t.usuarioA), await almacen.getUsuario(t.usuarioB)];
      const nivelA = ORDEN_NIVEL[uA?.nivel ?? 'INICIADO'] ?? 0;
      const nivelB = ORDEN_NIVEL[uB?.nivel ?? 'INICIADO'] ?? 0;

      // reputación = nº de trueques COMPLETADOS de cada parte (proxy de la fórmula D12)
      const todos = await almacen.listarTruekes();
      const completados = (w) => todos.filter((x) => x.estado === 'COMPLETADO' && (x.usuarioA === w || x.usuarioB === w)).length;

      let propone;
      if (nivelA !== nivelB) propone = nivelA > nivelB ? t.usuarioA : t.usuarioB;
      else {
        const repA = completados(t.usuarioA);
        const repB = completados(t.usuarioB);
        if (repA !== repB) propone = repA > repB ? t.usuarioA : t.usuarioB;
        else propone = t.usuarioA; // desempate: quien publicó (A)
      }
      if (req.wallet !== propone) {
        return res.status(403).json({ error: 'no_autorizado', detalle: 'la propuesta de encuentro la hace la parte de mayor nivel/reputación' });
      }

      const actualizado = await almacen.actualizarTrueke(t.id, {
        puntoEncuentroId: Number(puntoEncuentroId),
        horaPautada: new Date(horaPautada).toISOString(),
      });
      res.json({ trueke: actualizado, propone });
    } catch (e) { next(e); }
  });

  // POST /truekes/:id/cierre — firma Recibido Conforme / No Conforme (punto 9)
  // Body: { lado: 'A'|'B', conforme: true|false }
  //   Conforme ✓  → cierre_a/b = CONFORME; con ambos conformes + valoraciones → COMPLETADO.
  //   No Conforme ✗ → cierre = NO_CONFORME y se abre disputa (estado EN_DISPUTA).
  r.post('/:id/cierre', requiereSesion(almacen), async (req, res, next) => {
    try {
      const t = await almacen.getTrueke(req.params.id);
      if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
      const lado = String(req.body.lado || '').toUpperCase();
      const conforme = req.body.conforme === true;
      if (lado !== 'A' && lado !== 'B') return res.status(400).json({ error: 'lado_invalido' });
      const esParte = lado === 'A' ? t.usuarioA === req.wallet : t.usuarioB === req.wallet;
      if (!esParte) return res.status(403).json({ error: 'no_autorizado' });
      if (t.estado !== 'CUSTODIADO' && t.estado !== 'APERTURA') {
        return res.status(409).json({ error: 'estado_no_cerrable', detalle: `estado actual: ${t.estado}` });
      }

      const actualizado = await almacen.registrarCierre(t.id, { lado, conforme });

      if (!conforme) {
        // No Conforme → abre el proceso de disputa (RF-06.1)
        const d = await almacen.crearDisputa({ truekeId: t.id, solicitante: req.wallet, motivo: 'No conforme con lo recibido' });
        await almacen.actualizarTrueke(t.id, { estado: 'EN_DISPUTA' });
        return res.json({ trueke: await almacen.getTrueke(t.id), disputa: d });
      }

      // Conforme: revisar si ambas partes ya firmaron conforme → COMPLETADO (invariante I7:
      // cierre exige firmas de ambas; la valoración es paso posterior marcado por el espejo).
      const trasCierre = await almacen.getTrueke(t.id);
      const otra = lado === 'A' ? trasCierre.cierreB : trasCierre.cierreA;
      if (otra === 'CONFORME') {
        await almacen.actualizarTrueke(t.id, { estado: 'COMPLETADO' });
      }
      res.json({ trueke: await almacen.getTrueke(t.id) });
    } catch (e) { next(e); }
  });

  return r;
}
