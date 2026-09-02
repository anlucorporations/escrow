// =============================================================================
// TrueKeate — Módulo de reputación y niveles (CU-20, D12/D30)
// Fórmula: puntaje = 0,5·reputación + 0,3·volumen_efectivo + 0,2·(1 − ratio_apelaciones)
// Insumos normalizados a 0–100 (D30): reputación (media 1–5) ×20; volumen relativo
// al máximo del sistema ×100; apelaciones 100×(1 − ratio). Recálculo mensual (D30).
// Medalla Oro = ≥1000 efectivos y ≥90% ratio (RF-03.4/07.4) — requisito Empresa.
// =============================================================================

export const UMBRALES = [
  { nivel: 'INICIADO', min: 0, max: 25, medalla: 'BRONCE' },
  { nivel: 'COMUN', min: 26, max: 50, medalla: 'PLATA' },
  { nivel: 'FRECUENTE', min: 51, max: 75, medalla: 'ORO' },
  { nivel: 'SOCIO', min: 76, max: 100, medalla: 'ORO' }, // + solicitud y votación
];

const PESOS = { reputacion: 0.5, volumen: 0.3, apelaciones: 0.2 };

/**
 * Calcula el puntaje normalizado (0–100) de un usuario.
 * @param {object} insumos { reputacionMedia (1–5), volumenEfectivo, volumenMaximoSistema,
 *                           apelaciones, efectivos }
 */
export function calcularPuntaje({ reputacionMedia, volumenEfectivo, volumenMaximoSistema, apelaciones, efectivos }) {
  const reputacion = Math.max(0, Math.min(100, (reputacionMedia ?? 0) * 20)); // 1–5 ×20 → 0–100
  const volumen = volumenMaximoSistema > 0
    ? Math.min(100, ((volumenEfectivo ?? 0) / volumenMaximoSistema) * 100)
    : 0;
  const ratioAp = efectivos > 0 ? Math.min(1, (apelaciones ?? 0) / efectivos) : 0;
  const apelacionesN = 100 * (1 - ratioAp);

  const puntaje = Math.round(
    PESOS.reputacion * reputacion + PESOS.volumen * volumen + PESOS.apelaciones * apelacionesN
  );
  return Math.max(0, Math.min(100, puntaje));
}

/** Clasifica el puntaje en nivel/medalla (D12). */
export function clasificarNivel(puntaje) {
  for (const u of UMBRALES) {
    if (puntaje >= u.min && puntaje <= u.max) {
      return { nivel: u.nivel, medalla: u.medalla };
    }
  }
  return { nivel: 'INICIADO', medalla: 'BRONCE' };
}

/** Medalla Oro: ≥1000 efectivos y ≥90% ratio de efectividad (RF-03.4/07.4). */
export function esOroHistorico(efectivos, efectivosTotales) {
  const ratio = efectivosTotales > 0 ? efectivos / efectivosTotales : 0;
  return efectivos >= 1000 && ratio >= 0.9;
}

/** Penalización por inactividad (D19, CU-21): 180 días sin actividad y >5% del mercado. */
export function penalizarPorInactividad({ diasInactivo, articulosEnMercado, articulosDelUsuario, totalArticulosMercado }) {
  const inactivo = diasInactivo >= 180;
  const dominio = totalArticulosMercado > 0
    ? articulosDelUsuario / totalArticulosMercado
    : articulosDelUsuario > 0 ? 1 : 0;
  const exceso = dominio > 0.05; // >5% del volumen de artículos en el mercado
  return inactivo && exceso;
}
