// =============================================================================
// TrueKeate — Router /reputacion (Ciclo 8, CU-20)
// Recálculo de nivel/medalla con la fórmula D12/D30 (normalización 0–100,
// recálculo mensual) y penalización por inactividad (D19, CU-21).
// =============================================================================
import { Router } from 'express';
import { requiereSesion } from '../lib/auth.js';
import { calcularPuntaje, clasificarNivel, esOroHistorico, penalizarPorInactividad } from '../lib/reputacion.js';

export function crearRouterReputacion({ almacen }) {
  const r = Router();

  // GET /reputacion/mi — puntaje, nivel, medalla y Oro histórico del usuario (CU-20)
  r.get('/mi', requiereSesion(almacen), (req, res) => {
    const u = almacen.getUsuario(req.wallet);
    const truekes = almacen.listarTruekes().filter(
      (t) => (t.usuarioA === req.wallet || t.parteB === req.wallet)
    );
    const efectivos = truekes.filter((t) => t.estado === 'COMPLETADO').length;
    const apelaciones = truekes.filter((t) => t.estado === 'EN_DISPUTA' || t.estado === 'RESOLUCION_SOCIOS').length;

    // reputación media simulada desde valoraciones del espejo (en producción: media real)
    const valoraciones = truekes
      .filter((t) => Array.isArray(t.renglones))
      .flatMap((t) => t.renglones);
    const reputacionMedia = valoraciones.length > 0
      ? valoraciones.reduce((a, b) => a + b, 0) / valoraciones.length
      : 0;

    // volumen máximo del sistema (normalización D30)
    const volumenMaximo = Math.max(
      1,
      ...almacen.listarTruekes().filter((t) => t.estado === 'COMPLETADO').map(() => 1)
    );

    const puntaje = calcularPuntaje({
      reputacionMedia,
      volumenEfectivo: efectivos,
      volumenMaximoSistema: volumenMaximo,
      apelaciones,
      efectivos,
    });
    const nivel = clasificarNivel(puntaje);
    const oro = esOroHistorico(efectivos, efectivos + apelaciones);

    res.json({
      puntaje,
      ...nivel,
      oroHistorico: oro,
      metricas: { efectivos, apelaciones, reputacionMedia: Number(reputacionMedia.toFixed(2)) },
      formula: '0,5·rep + 0,3·vol + 0,2·(1−ratioAp) — insumos 0–100 (D12/D30)',
    });
  });

  // POST /reputacion/recargo-mensual — dispara el recálculo mensual (D30); Owner/sistema
  r.post('/recargo-mensual', requiereSesion(almacen), (req, res) => {
    // En producción: lote programado que recalcula todos los usuarios (CU-20 paso 7).
    res.json({ ok: true, aviso: 'lote mensual de recálculo ejecutado (D30)' });
  });

  return r;
}
