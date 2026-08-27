/**
 * Utilidad matemática estándar para conversión de coordenadas geográficas
 * WGS-84 (Latitud / Longitud) <-> Coordenadas UTM (Universal Transverse Mercator).
 *
 * Parámetros del elipsoide WGS-84:
 *  - Semieje mayor a = 6378137.0 m
 *  - Aplanamiento f = 1 / 298.257223563
 *  - Factor de escala k0 = 0.9996
 *  - Falso Este = 500,000 m
 *  - Falso Norte (Hemisferio Sur) = 10,000,000 m
 */

export interface UtmCoordinates {
  easting: number // Metros Este (X)
  northing: number // Metros Norte (Y)
  zone: number // Zona UTM (1..60)
  isNorthern: boolean // true: Norte, false: Sur
  formatted: string // ej. 19N 729450 1159800
}

export interface LatLng {
  lat: number
  lng: number
}

const WGS84_A = 6378137.0
const WGS84_F = 1 / 298.257223563
const WGS84_B = WGS84_A * (1 - WGS84_F)
const WGS84_E2 = (WGS84_A * WGS84_A - WGS84_B * WGS84_B) / (WGS84_A * WGS84_A)
const WGS84_EPRIME2 = (WGS84_A * WGS84_A - WGS84_B * WGS84_B) / (WGS84_B * WGS84_B)
const UTM_K0 = 0.9996

function toRad(deg: number): number {
  return (deg * Math.PI) / 180.0
}

function toDeg(rad: number): number {
  return (rad * 180.0) / Math.PI
}

/**
 * Convierte Latitud y Longitud (WGS84) a Coordenadas UTM.
 */
export function latLngToUtm(lat: number, lng: number): UtmCoordinates {
  const clampedLat = Math.max(-80.0, Math.min(84.0, lat))
  let clampedLng = ((lng + 180.0) % 360.0) - 180.0
  if (clampedLng < -180.0) clampedLng += 360.0

  let zone = Math.floor((clampedLng + 180.0) / 6.0) + 1
  if (zone < 1) zone = 1
  if (zone > 60) zone = 60

  const isNorthern = clampedLat >= 0

  const centralMeridianLng = (zone - 1) * 6 - 180 + 3
  const latRad = toRad(clampedLat)
  const lngRad = toRad(clampedLng)
  const centralMeridianRad = toRad(centralMeridianLng)

  const n = WGS84_A / Math.sqrt(1 - WGS84_E2 * Math.sin(latRad) * Math.sin(latRad))
  const t = Math.tan(latRad) * Math.tan(latRad)
  const c = WGS84_EPRIME2 * Math.cos(latRad) * Math.cos(latRad)
  const a = Math.cos(latRad) * (lngRad - centralMeridianRad)

  const m =
    WGS84_A *
    ((1 - WGS84_E2 / 4 - (3 * WGS84_E2 * WGS84_E2) / 64 - (5 * WGS84_E2 * WGS84_E2 * WGS84_E2) / 256) * latRad -
      ((3 * WGS84_E2) / 8 + (3 * WGS84_E2 * WGS84_E2) / 32 + (45 * WGS84_E2 * WGS84_E2 * WGS84_E2) / 1024) *
        Math.sin(2 * latRad) +
      ((15 * WGS84_E2 * WGS84_E2) / 256 + (45 * WGS84_E2 * WGS84_E2 * WGS84_E2) / 1024) * Math.sin(4 * latRad) -
      ((35 * WGS84_E2 * WGS84_E2 * WGS84_E2) / 3072) * Math.sin(6 * latRad))

  const a2 = a * a
  const a3 = a2 * a
  const a4 = a2 * a2
  const a5 = a4 * a
  const a6 = a3 * a3

  const easting =
    UTM_K0 *
      n *
      (a +
        ((1 - t + c) * a3) / 6 +
        ((5 - 18 * t + t * t + 72 * c - 58 * WGS84_EPRIME2) * a5) / 120) +
    500000.0

  let northing =
    UTM_K0 *
    (m +
      n *
        Math.tan(latRad) *
        (a2 / 2 +
          ((5 - t + 9 * c + 4 * c * c) * a4) / 24 +
          ((61 - 58 * t + t * t + 600 * c - 330 * WGS84_EPRIME2) * a6) / 720))

  if (!isNorthern) {
    northing += 10000000.0
  }

  const roundedEasting = Math.round(easting)
  const roundedNorthing = Math.round(northing)
  const hemisphereLetter = isNorthern ? 'N' : 'S'

  return {
    easting: roundedEasting,
    northing: roundedNorthing,
    zone,
    isNorthern,
    formatted: `UTM ${zone}${hemisphereLetter} ${roundedEasting}m E, ${roundedNorthing}m N`,
  }
}

/**
 * Convierte Coordenadas UTM a Latitud y Longitud (WGS84).
 */
export function utmToLatLng(
  easting: number,
  northing: number,
  zone: number,
  isNorthern: boolean
): LatLng {
  const x = easting - 500000.0
  let y = northing
  if (!isNorthern) {
    y -= 10000000.0
  }

  const centralMeridianLng = (zone - 1) * 6 - 180 + 3
  const e1 = (1 - Math.sqrt(1 - WGS84_E2)) / (1 + Math.sqrt(1 - WGS84_E2))

  const m = y / UTM_K0
  const mu =
    m /
    (WGS84_A *
      (1 - WGS84_E2 / 4 - (3 * WGS84_E2 * WGS84_E2) / 64 - (5 * WGS84_E2 * WGS84_E2 * WGS84_E2) / 256))

  const phi1Rad =
    mu +
    ((3 * e1) / 2 - (27 * e1 * e1 * e1) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 * e1 * e1 * e1) / 32) * Math.sin(4 * mu) +
    ((151 * e1 * e1 * e1) / 96) * Math.sin(6 * mu)

  const n1 = WGS84_A / Math.sqrt(1 - WGS84_E2 * Math.sin(phi1Rad) * Math.sin(phi1Rad))
  const t1 = Math.tan(phi1Rad) * Math.tan(phi1Rad)
  const c1 = WGS84_EPRIME2 * Math.cos(phi1Rad) * Math.cos(phi1Rad)
  const r1 =
    (WGS84_A * (1 - WGS84_E2)) /
    Math.pow(1 - WGS84_E2 * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5)
  const d = x / (n1 * UTM_K0)

  const d2 = d * d
  const d3 = d2 * d
  const d4 = d2 * d2
  const d5 = d4 * d
  const d6 = d3 * d3

  const latRad =
    phi1Rad -
    ((n1 * Math.tan(phi1Rad)) / r1) *
      (d2 / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * WGS84_EPRIME2) * d4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * WGS84_EPRIME2 - 3 * c1 * c1) * d6) /
          720)

  const lngRad =
    toRad(centralMeridianLng) +
    (d -
      ((1 + 2 * t1 + c1) * d3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * WGS84_EPRIME2 + 24 * t1 * t1) * d5) / 120) /
      Math.cos(phi1Rad)

  return {
    lat: Number(toDeg(latRad).toFixed(6)),
    lng: Number(toDeg(lngRad).toFixed(6)),
  }
}
