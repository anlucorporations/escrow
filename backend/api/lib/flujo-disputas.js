// =============================================================================
// TrueKeate — Motor del flujo de disputas (flujo afinado del director 2026-09-08)
// =============================================================================
// Compartido por /disputas y por POST /truekes/:id/cierre (No Conforme).
// Estados de disputa: REPORTADA → ESPERA_JUSTIFICATIVO → EN_VOTACION → RESUELTA
// Veredicto: ANULAR (trueke ANULADO, devolución total) | VALIDO (COMPLETADO, cruz)
// =============================================================================
import { ethers } from 'ethers';

const DIA_MS = 24 * 60 * 60 * 1000;
export const PLAZO_JUSTIFICATIVO_MS = 3 * DIA_MS; // director: 3 días
export const PLAZO_VOTACION_MS = 5 * DIA_MS;       // director: 5 días (D13/D21)
export const ESTADOS_ACTIVOS = ['REPORTADA', 'ESPERA_JUSTIFICATIVO', 'EN_VOTACION'];

const ABI_REGISTRY = [
  'function totalSocios() view returns (uint256)',
  'function esSocio(address) view returns (bool)',
  'function socios(uint256) view returns (address)',
];

const NW = (w) => (w || '').toLowerCase().trim();

/**
 * Crea el motor de disputas.
 * @param {object} deps { almacen, proveedor?, registryAddress? }
 */
export function crearMotorDisputas({ almacen, proveedor, registryAddress }) {
  const dirRegistry = registryAddress || process.env.REGISTRY_ADDRESS || null;

  function _registry() {
    if (!dirRegistry || !proveedor) return null;
    return new ethers.Contract(dirRegistry, ABI_REGISTRY, proveedor);
  }

  /** Padrón on-chain (SociosRegistry); sin red → usuarios SOCIO de la BD. */
  async function padronSocios() {
    const reg = _registry();
    if (reg) {
      try {
        const total = Number(await reg.totalSocios());
        const socios = [];
        for (let i = 0; i < total; i++) socios.push(NW(await reg.socios(i)));
        if (socios.length > 0) return socios;
      } catch (e) {
        console.warn('[disputas] padrón on-chain no disponible, fallback BD:', e.message);
      }
    }
    const usuarios = (await almacen.listarUsuarios?.()) ?? [];
    return usuarios.filter((u) => u.tipo === 'SOCIO').map((u) => NW(u.wallet));
  }

  async function esSocioWallet(wallet) {
    const reg = _registry();
    if (reg) {
      try { return await reg.esSocio(wallet); } catch { /* fallback */ }
    }
    return (await padronSocios()).includes(NW(wallet));
  }

  async function notificar(wallet, tipo, titulo, cuerpo, refTipo, refId) {
    try {
      if (almacen.crearNotificacion) {
        await almacen.crearNotificacion({ wallet, tipo, titulo, cuerpo, refTipo, refId });
      }
    } catch (e) {
      console.error('[disputas] notificación:', e.message);
    }
  }

  /**
   * Ejecuta el veredicto sobre el trueke y notifica a las partes.
   * ANULAR → trueke ANULADO (devolución total). VALIDO → COMPLETADO + liberación en cruz.
   */
  async function ejecutarVeredicto(d, t, veredicto, detalle) {
    const ahora = new Date().toISOString();
    if (veredicto === 'ANULAR') {
      await almacen.actualizarTrueke(d.truekeId, { estado: 'ANULADO' });
      await almacen.actualizarDisputa(d.id, {
        estado: 'RESUELTA', veredicto: 'ANULAR', resueltaEn: ahora,
        resolucion: detalle ?? 'Veredicto ANULAR: devolución total de los NFTs en custodia',
      });
    } else {
      await almacen.actualizarTrueke(d.truekeId, { estado: 'COMPLETADO' });
      try {
        if (t?.articuloAId && t?.usuarioB && almacen.reasignarArticulo) await almacen.reasignarArticulo(t.articuloAId, t.usuarioB);
        if (t?.articuloBId && t?.usuarioA && almacen.reasignarArticulo) await almacen.reasignarArticulo(t.articuloBId, t.usuarioA);
      } catch (e) {
        console.error('[disputas] reasignación al validar trueke:', e.message);
      }
      await almacen.actualizarDisputa(d.id, {
        estado: 'RESUELTA', veredicto: 'VALIDO', resueltaEn: ahora,
        resolucion: detalle ?? 'Veredicto VALIDO: el trueke es válido y se completa',
      });
    }
    for (const parte of [t?.usuarioA, t?.usuarioB].filter(Boolean)) {
      await notificar(parte, 'VEREDICTO', 'Veredicto de tu disputa',
        `La disputa del trueke #${d.truekeId} se resolvió: ${veredicto === 'ANULAR' ? 'devolución total (trueke anulado)' : 'trueke válido (completado)'}.`,
        'trueke', d.truekeId);
    }
    return almacen.getDisputa(d.id);
  }

  /** Resuelve vencimientos automáticos y devuelve la disputa viva (si cambió, la resuelta). */
  async function resolverVencidasSiAplica(d) {
    const t = await almacen.getTrueke(d.truekeId);
    const ahora = Date.now();
    if (d.estado === 'ESPERA_JUSTIFICATIVO' && d.justificativoVenceAt && new Date(d.justificativoVenceAt).getTime() <= ahora) {
      return ejecutarVeredicto(d, t, 'ANULAR',
        'El conforme no cargó su justificativo en el plazo de 3 días → falla a favor del reclamante (ANULAR)');
    }
    if (d.estado === 'EN_VOTACION' && d.votacionVenceAt && new Date(d.votacionVenceAt).getTime() <= ahora) {
      const votos = await almacen.listarVotosDisputa(d.id);
      const a = votos.filter((v) => v.voto === 'ANULAR').length;
      const b = votos.filter((v) => v.voto === 'VALIDO').length;
      if (votos.length === 0) {
        return ejecutarVeredicto(d, t, 'ANULAR', 'La votación venció sin votos → ANULA por defecto (decisión del director)');
      }
      const final = a === b ? 'ANULAR' : (a > b ? 'ANULAR' : 'VALIDO'); // empate → ANULA por defecto
      return ejecutarVeredicto(d, t, final,
        `Votación cerrada por vencimiento: ${a} ANULAR vs ${b} VALIDO → ${final === 'ANULAR' ? 'devolución total' : 'trueke válido'}`);
    }
    return d;
  }

  /** Envía aviso de votación a todos los socios del padrón (menos las partes). */
  async function notificarSociosVotacion(d) {
    const t = await almacen.getTrueke(d.truekeId);
    const partes = new Set([NW(t?.usuarioA), NW(t?.usuarioB)].filter(Boolean));
    const padron = await padronSocios();
    for (const socio of padron) {
      if (partes.has(socio)) continue; // socio involucrado no vota (punto 4)
      await notificar(socio, 'VOTACION_ABIERTA', '⚖️ Votación abierta de disputa',
        `El trueke #${d.truekeId} tiene una votación abierta (ANULAR o VALIDO). Mirá las pruebas de ambas partes y votá.`,
        'disputa', d.id);
    }
  }

  /** Abre la votación: EN_VOTACION + trueke RESOLUCION_SOCIOS + aviso a socios. */
  async function abrirVotacion(d) {
    await almacen.actualizarDisputa(d.id, {
      estado: 'EN_VOTACION',
      votacionVenceAt: new Date(Date.now() + PLAZO_VOTACION_MS).toISOString(),
    });
    await almacen.actualizarTrueke(d.truekeId, { estado: 'RESOLUCION_SOCIOS' });
    await notificarSociosVotacion(d);
    return almacen.getDisputa(d.id);
  }

  /**
   * Abre (o continúa) la disputa desde el cierre ✗ No Conforme.
   * Guarda las fotos RECLAMO del reclamante y decide el estado inicial:
   *   - contraparte ya CONFORME → ESPERA_JUSTIFICATIVO (pedir justificativo)
   *   - contraparte ya NO_CONFORME → EN_VOTACION directo
   *   - contraparte sin cierre → REPORTADA
   * Si ya existe una disputa activa y quien firma No Conforme es la contraparte,
   * ambas partes aportaron evidencia → EN_VOTACION.
   */
  async function abrirDisputaDesdeCierre({ truekeId, reclamante, motivo, fotos }) {
    const t = await almacen.getTrueke(Number(truekeId));
    if (!t) return null;
    const todas = await almacen.listarDisputas();
    const activa = todas.find((x) => x.truekeId === Number(truekeId) && ESTADOS_ACTIVOS.includes(x.estado));

    if (activa) {
      if (activa.solicitante === NW(reclamante)) return { disputa: activa, yaExistia: true };
      // la contraparte también declara No Conforme → ambas con evidencia → votación
      for (const foto of fotos ?? []) {
        if (foto?.data) await almacen.agregarEvidenciaDisputa({ disputaId: activa.id, autor: reclamante, tipo: 'RECLAMO', contenido: Buffer.from(foto.data, 'base64'), mime: foto.mime });
      }
      return { disputa: await abrirVotacion(activa), yaExistia: true };
    }

    const d = await almacen.crearDisputa({ truekeId: Number(truekeId), solicitante: reclamante, motivo: motivo ?? 'No conforme con lo recibido' });
    for (const foto of fotos ?? []) {
      if (foto?.data) await almacen.agregarEvidenciaDisputa({ disputaId: d.id, autor: reclamante, tipo: 'RECLAMO', contenido: Buffer.from(foto.data, 'base64'), mime: foto.mime });
    }
    const esA = t.usuarioA === NW(reclamante);
    const contraparte = esA ? t.usuarioB : t.usuarioA;
    const cierreContraparte = esA ? t.cierreB : t.cierreA;
    await almacen.actualizarTrueke(d.truekeId, { estado: 'EN_DISPUTA' });

    if (cierreContraparte === 'CONFORME') {
      await almacen.actualizarDisputa(d.id, {
        estado: 'ESPERA_JUSTIFICATIVO',
        justificativoVenceAt: new Date(Date.now() + PLAZO_JUSTIFICATIVO_MS).toISOString(),
      });
      if (contraparte) {
        await notificar(contraparte, 'PEDIDO_JUSTIFICATIVO', '📷 Cargá tu justificativo',
          `La contraparte declaró No Conforme en el trueke #${truekeId}. Como estás conforme, cargá tu justificativo con fotos de evidencia (plazo 3 días).`,
          'disputa', d.id);
      }
      return { disputa: await almacen.getDisputa(d.id), yaExistia: false };
    }
    if (cierreContraparte === 'NO_CONFORME') {
      return { disputa: await abrirVotacion(d), yaExistia: false };
    }
    if (contraparte) {
      await notificar(contraparte, 'DISPUTA_REPORTADA', '⚖️ Disputa reportada',
        `Se reportó una disputa en el trueke #${truekeId} por No Conforme. Declará tu postura: conforme (con justificativo) o también No Conforme.`,
        'disputa', d.id);
    }
    return { disputa: await almacen.getDisputa(d.id), yaExistia: false };
  }

  return { padronSocios, esSocioWallet, notificar, ejecutarVeredicto, resolverVencidasSiAplica, abrirVotacion, abrirDisputaDesdeCierre };
}
