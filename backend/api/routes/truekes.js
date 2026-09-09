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
import { requiereSesion, requiereEstado, requiereFirmaAccion } from '../lib/auth.js';
import { crearMotorDisputas } from '../lib/flujo-disputas.js';

export function crearRouterTruekes({ almacen, relayer, escrowAbi, contratoEscrow, walletEmpresas, minteadorNft, proveedor, registryAddress }) {
  const r = Router();
  const motorDisputas = crearMotorDisputas({ almacen, proveedor, registryAddress });

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
  r.post('/ofertas', requiereSesion(almacen), requiereEstado(almacen, 'VERIFICADO', 'CERTIFICADO'), requiereFirmaAccion('publicar oferta de trueque'), async (req, res, next) => {
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
  r.post('/:id/acordar', requiereSesion(almacen), requiereEstado(almacen, 'VERIFICADO', 'CERTIFICADO'), requiereFirmaAccion('acordar trueque'), async (req, res, next) => {
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

  // GET /truekes/:id/contacto — contacto de la contraparte (punto 5 del director)
  // Solo visible mientras el trueke esté ACTIVO (CREADO..APERTURA); al cerrar se oculta.
  // Devuelve teléfono/correo de la OTRA parte, únicamente a las partes del trueke.
  r.get('/:id/contacto', requiereSesion(almacen), async (req, res, next) => {
    try {
      const t = await almacen.getTrueke(req.params.id);
      if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
      const soyParte = t.usuarioA === req.wallet || (t.usuarioB && t.usuarioB === req.wallet);
      if (!soyParte) return res.status(403).json({ error: 'no_autorizado', detalle: 'solo las partes del trueke' });
      const cerrado = ['COMPLETADO', 'ANULADO', 'BLOQUEADO'].includes(t.estado);
      if (cerrado) {
        return res.json({ contacto: null, oculto: true, detalle: 'el trueke está cerrado: contacto oculto' });
      }
      const contraparteWallet = t.usuarioA === req.wallet ? t.usuarioB : t.usuarioA;
      const u = contraparteWallet ? await almacen.getUsuario(contraparteWallet) : null;
      if (!u) return res.status(404).json({ error: 'contraparte_inexistente' });
      res.json({
        contacto: { telefono: u.telefono ?? null, correo: u.correo ?? null, wallet: contraparteWallet },
        oculto: false,
      });
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
  r.post('/', requiereSesion(almacen), requiereEstado(almacen, 'VERIFICADO', 'CERTIFICADO'), requiereFirmaAccion('crear trueque'), async (req, res, next) => {
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

  // POST /truekes/:id/custodiar — custodiarA/B (CU-12)
  r.post('/:id/custodiar', requiereSesion(almacen), requiereFirmaAccion('custodiar trueque'), async (req, res, next) => {
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
  r.post('/:id/firma-recepcion', requiereSesion(almacen), requiereFirmaAccion('firmar recepción'), async (req, res, next) => {
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
  r.post('/:id/valoracion', requiereSesion(almacen), requiereFirmaAccion('valorar trueque'), async (req, res, next) => {
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

  // ===========================================================================
  // Encuentro: regla del director — propone la parte de MAYOR NIVEL y MAYOR
  // REPUTACIÓN; la contraparte (menor) solo aprueba o rechaza (desempate: A).
  // ===========================================================================
  const ORDEN_NIVEL = { INICIADO: 0, COMUN: 1, FRECUENTE: 2, SOCIO: 3 };

  /** Decide quién propone el punto de encuentro de un trueke acordado. */
  async function quienProponeEncuentro(t) {
    const [uA, uB] = [await almacen.getUsuario(t.usuarioA), await almacen.getUsuario(t.usuarioB)];
    const nivelA = ORDEN_NIVEL[uA?.nivel ?? 'INICIADO'] ?? 0;
    const nivelB = ORDEN_NIVEL[uB?.nivel ?? 'INICIADO'] ?? 0;
    // reputación = nº de trueques COMPLETADOS de cada parte (proxy D12)
    const todos = await almacen.listarTruekes();
    const completados = (w) => todos.filter((x) => x.estado === 'COMPLETADO' && (x.usuarioA === w || x.usuarioB === w)).length;
    if (nivelA !== nivelB) return nivelA > nivelB ? t.usuarioA : t.usuarioB;
    const repA = completados(t.usuarioA);
    const repB = completados(t.usuarioB);
    if (repA !== repB) return repA > repB ? t.usuarioA : t.usuarioB;
    return t.usuarioA; // desempate: quien publicó
  }

  // GET /truekes/:id/encuentro/rol — rol del usuario actual en el encuentro
  // (propone = mayor nivel/reputación · aprueba = la contraparte).
  r.get('/:id/encuentro/rol', requiereSesion(almacen), async (req, res, next) => {
    try {
      const t = await almacen.getTrueke(req.params.id);
      if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
      if (!t.usuarioB) return res.status(409).json({ error: 'sin_contraparte' });
      const soyParte = t.usuarioA === req.wallet || t.usuarioB === req.wallet;
      if (!soyParte) return res.status(403).json({ error: 'no_autorizado' });
      const propone = await quienProponeEncuentro(t);
      const aprueba = propone === t.usuarioA ? t.usuarioB : t.usuarioA;
      res.json({
        rol: req.wallet === propone ? 'propone' : 'aprueba',
        propone,
        aprueba,
        regla: 'mayor nivel D12 → mayor reputación (trueques completados) → quien publicó (A)',
        estado: t.estado,
        encuentroEstado: t.encuentroEstado ?? null,
      });
    } catch (e) { next(e); }
  });

  // POST /truekes/:id/propuesta-encuentro — propone punto/fecha/hora del encuentro (punto 5.1)
  // Decide quién propone: mayor nivel D12 → mayor reputación → quien publicó (A).
  // Body: { puntoEncuentroId, horaPautada }  — el que gana la regla puede proponer.
  r.post('/:id/propuesta-encuentro', requiereSesion(almacen), requiereFirmaAccion('proponer encuentro'), async (req, res, next) => {
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

      // ---- regla (director): propone la parte de mayor nivel y mayor reputación ----
      const propone = await quienProponeEncuentro(t);
      if (req.wallet !== propone) {
        return res.status(403).json({ error: 'no_autorizado', detalle: 'la propuesta de encuentro la hace la parte de mayor nivel/reputación; la contraparte solo aprueba o rechaza' });
      }

      const actualizado = await almacen.actualizarTrueke(t.id, {
        puntoEncuentroId: Number(puntoEncuentroId),
        horaPautada: new Date(horaPautada).toISOString(),
        encuentroPropuestoPor: req.wallet,
        encuentroEstado: 'PROPUESTO',
      });
      // El punto usado queda en los favoritos del que propone (punto 7: últimos usados)
      try {
        if (almacen.registrarUsoPunto) await almacen.registrarUsoPunto(req.wallet, Number(puntoEncuentroId));
      } catch { /* el registro de uso es secundario */ }
      res.json({ trueke: actualizado, propone, encuentroEstado: 'PROPUESTO' });
    } catch (e) { next(e); }
  });

  // POST /truekes/:id/encuentro/aceptar — la contraparte acepta la propuesta (punto 6)
  // Al aceptar (punto 7): AMBOS NFTs pasan automáticamente a custodia del escrow
  // (estado CUSTODIADO) y se liberan/transfieren solo al cierre Conforme.
  r.post('/:id/encuentro/aceptar', requiereSesion(almacen), requiereFirmaAccion('aceptar encuentro'), async (req, res, next) => {
    try {
      const t = await almacen.getTrueke(req.params.id);
      if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
      if (t.encuentroEstado !== 'PROPUESTO' || !t.encuentroPropuestoPor) {
        return res.status(409).json({ error: 'sin_propuesta', detalle: 'no hay una propuesta de encuentro pendiente' });
      }
      // Solo la parte que NO propuso puede aceptar (la otra solo acepta, no propone otra)
      if (req.wallet === t.encuentroPropuestoPor) {
        return res.status(403).json({ error: 'no_autorizado', detalle: 'no puedes aceptar tu propia propuesta' });
      }
      const soyParte = t.usuarioA === req.wallet || (t.usuarioB && t.usuarioB === req.wallet);
      if (!soyParte) return res.status(403).json({ error: 'no_autorizado' });

      // Punto 7: custodia automática de ambos lados en el escrow
      await almacen.actualizarTrueke(t.id, { encuentroEstado: 'ACEPTADO', estado: 'CUSTODIADO' });
      const actualizado = await almacen.getTrueke(t.id);
      res.json({ trueke: actualizado, custodia: 'AUTOMATICA_AMBOS', encuentroEstado: 'ACEPTADO' });
    } catch (e) { next(e); }
  });

  // POST /truekes/:id/encuentro/rechazar — la contraparte rechaza la propuesta (punto 6)
  r.post('/:id/encuentro/rechazar', requiereSesion(almacen), requiereFirmaAccion('rechazar encuentro'), async (req, res, next) => {
    try {
      const t = await almacen.getTrueke(req.params.id);
      if (!t) return res.status(404).json({ error: 'trueke_inexistente' });
      if (t.encuentroEstado !== 'PROPUESTO' || !t.encuentroPropuestoPor) {
        return res.status(409).json({ error: 'sin_propuesta' });
      }
      if (req.wallet === t.encuentroPropuestoPor) {
        return res.status(403).json({ error: 'no_autorizado', detalle: 'no puedes rechazar tu propia propuesta' });
      }
      const soyParte = t.usuarioA === req.wallet || (t.usuarioB && t.usuarioB === req.wallet);
      if (!soyParte) return res.status(403).json({ error: 'no_autorizado' });
      await almacen.actualizarTrueke(t.id, { encuentroEstado: 'RECHAZADO' });
      res.json({ trueke: await almacen.getTrueke(t.id), encuentroEstado: 'RECHAZADO' });
    } catch (e) { next(e); }
  });

  // POST /truekes/:id/cierre — firma Recibido Conforme / No Conforme (punto 9)
  // Body: { lado: 'A'|'B', conforme: true|false, motivo?, fotos?: [{data,mime}] }
  //   Conforme ✓  → cierre_a/b = CONFORME; con ambos conformes + valoraciones → COMPLETADO.
  //   No Conforme ✗ → formulario de disputa (motivo + fotos de evidencia) → la disputa
  //     nace SOLO aquí (decisión del director): REPORTADA → (justificativo) → EN_VOTACION.
  r.post('/:id/cierre', requiereSesion(almacen), requiereFirmaAccion('cerrar trueque'), async (req, res, next) => {
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
        // No Conforme → formulario de disputa del director: motivo + fotos de evidencia
        const { motivo, fotos } = req.body ?? {};
        if (!motivo || !String(motivo).trim()) {
          return res.status(400).json({ error: 'motivo_requerido', detalle: 'describí el motivo del No Conforme (formulario de disputa)' });
        }
        const lista = Array.isArray(fotos) ? fotos.filter((f) => f && typeof f.data === 'string') : [];
        if (lista.length === 0) {
          return res.status(400).json({ error: 'fotos_requeridas', detalle: 'subí al menos una foto de evidencia de tu reclamo' });
        }
        const { disputa } = await motorDisputas.abrirDisputaDesdeCierre({
          truekeId: t.id, reclamante: req.wallet, motivo: String(motivo).trim(), fotos: lista,
        });
        return res.json({ trueke: await almacen.getTrueke(t.id), disputa });
      }

      // Conforme: revisar si ambas partes ya firmaron conforme → COMPLETADO (invariante I7:
      // cierre exige firmas de ambas; la valoración es paso posterior marcado por el espejo).
      // Si existe una disputa activa del trueke, el conforme de la contraparte NO completa:
      // la disputa pasa a ESPERA_JUSTIFICATIVO (motor) y el trueke queda EN_DISPUTA.
      const trasCierre = await almacen.getTrueke(t.id);
      const otra = lado === 'A' ? trasCierre.cierreB : trasCierre.cierreA;
      const disputas = await almacen.listarDisputas();
      const disputaActiva = disputas.find((d) => d.truekeId === t.id && ['REPORTADA', 'ESPERA_JUSTIFICATIVO', 'EN_VOTACION'].includes(d.estado));
      if (disputaActiva) {
        // el que firmó Conforme es la contraparte del reclamante → pedir su justificativo
        const esReclamante = disputaActiva.solicitante === req.wallet;
        if (!esReclamante) {
          const DIA_MS = 24 * 60 * 60 * 1000;
          const nuevo = await almacen.actualizarDisputa(disputaActiva.id, {
            estado: 'ESPERA_JUSTIFICATIVO',
            justificativoVenceAt: new Date(Date.now() + 3 * DIA_MS).toISOString(),
          });
          // eslint-disable-next-line no-unused-vars
          void nuevo;
          await almacen.actualizarTrueke(t.id, { estado: 'EN_DISPUTA' });
          const contraparte = trasCierre.usuarioA === req.wallet ? trasCierre.usuarioB : trasCierre.usuarioA;
          try {
            if (contraparte && almacen.crearNotificacion) {
              await almacen.crearNotificacion({
                wallet: contraparte, tipo: 'PEDIDO_JUSTIFICATIVO',
                titulo: '📷 Cargá tu justificativo',
                cuerpo: `Declaraste No Conforme y la contraparte firmó Conforme. Ahora la contraparte debe cargar su justificativo con fotos. Estado: esperando justificativo.`,
                refTipo: 'disputa', refId: disputaActiva.id,
              });
            }
          } catch (e) { console.error('[truekes] notificación justificativo:', e.message); }
        }
        return res.json({ trueke: await almacen.getTrueke(t.id), disputa: await almacen.getDisputa(disputaActiva.id) });
      }
      if (otra === 'CONFORME') {
        await almacen.actualizarTrueke(t.id, { estado: 'COMPLETADO' });
        // Lógica post-trueke punto 0: liberación EN CRUZ del inventario — el artículo A
        // pasa a ser del usuario B y el artículo B del usuario A (igual que el Escrow
        // transfiere los NFTs on-chain al completar). Así el receptor ve el NFT recibido
        // en su inventario y puede re-truequearlo (punto 1).
        try {
          if (trasCierre.articuloAId && trasCierre.usuarioB && almacen.reasignarArticulo) {
            await almacen.reasignarArticulo(trasCierre.articuloAId, trasCierre.usuarioB);
          }
          if (trasCierre.articuloBId && trasCierre.usuarioA && almacen.reasignarArticulo) {
            await almacen.reasignarArticulo(trasCierre.articuloBId, trasCierre.usuarioA);
          }
        } catch (e) {
          console.error('[truekes] reasignación de artículos al completar:', e.message);
        }
      }
      res.json({ trueke: await almacen.getTrueke(t.id) });
    } catch (e) { next(e); }
  });

  // POST /truekes/nft/:tokenId/usar — consumir el NFT recibido (punto 2)
  // El dueño actual del NFT (tras un trueke COMPLETADO, ya está en su inventario)
  // lo USA: se quema on-chain (TrueKeateNFT.usar) y el artículo se marca usado_el.
  // Requiere sesión; el NFT debe estar en el inventario del usuario (reasignado en el
  // punto 0) o ser el propietario on-chain. Body: { articuloId? } — opcional para
  // enlazar la fila BD; si se omite se busca por nft_token_id.
  r.post('/nft/:tokenId/usar', requiereSesion(almacen), requiereFirmaAccion('usar NFT'), async (req, res, next) => {
    try {
      const tokenId = Number(req.params.tokenId);
      const { articuloId } = req.body ?? {};

      // 1) localizar el artículo del usuario que posee este NFT
      const todos = await almacen.listarArticulos();
      const mio = todos.find((a) =>
        Number(a.nftTokenId) === tokenId &&
        (a.usuarioWallet ?? a.wallet) === req.wallet &&
        a.disponible !== false && !a.usadoEl
      );
      const articulo = articuloId
        ? todos.find((a) => Number(a.id) === Number(articuloId) && (a.usuarioWallet ?? a.wallet) === req.wallet)
        : mio;
      if (!articulo) {
        return res.status(403).json({ error: 'no_autorizado', detalle: 'el NFT debe estar en tu inventario (recibido por trueke)' });
      }

      // 2) quemar on-chain si hay red configurada (TrueKeateNFT.usar)
      let quemado = null;
      if (minteadorNft && minteadorNft.activo && minteadorNft.usar) {
        quemado = await minteadorNft.usar(tokenId);
      } else {
        // Sin red: el quemado on-chain se simula (la BD marca usado; en producción
        // con red se ejecuta TrueKeateNFT.usar real).
        quemado = { simulado: true, txHash: null };
      }

      // 3) marcar la fila BD como consumida
      await almacen.marcarArticuloUsado(articulo.id);

      res.json({
        ok: true,
        quemado: { tokenId, simulado: Boolean(quemado.simulado), txHash: quemado.txHash ?? null },
        articulo: await almacen.getArticulo?.(articulo.id) ?? { id: articulo.id, usadoEl: new Date().toISOString() },
      });
    } catch (e) { next(e); }
  });

  return r;
}
