import { describe, it, expect } from 'vitest'
import { latLngToUtm, utmToLatLng } from '@/lib/utm'

describe('UTM Coordinate Engine (web/lib/utm.ts)', () => {
  it('convierte Caracas/Barlovento (10.48, -66.90) a Zona 19N correctamente', () => {
    const utm = latLngToUtm(10.4806, -66.9036)
    expect(utm.zone).toBe(19)
    expect(utm.isNorthern).toBe(true)
    expect(utm.easting).toBeGreaterThan(720000)
    expect(utm.easting).toBeLessThan(740000)
    expect(utm.northing).toBeGreaterThan(1150000)
    expect(utm.northing).toBeLessThan(1170000)
    expect(utm.formatted).toContain('UTM 19N')
  })

  it('conversión bidireccional es consistente (LatLng -> UTM -> LatLng)', () => {
    const origLat = 10.4806
    const origLng = -66.9036

    const utm = latLngToUtm(origLat, origLng)
    const back = utmToLatLng(utm.easting, utm.northing, utm.zone, utm.isNorthern)

    expect(back.lat).toBeCloseTo(origLat, 3)
    expect(back.lng).toBeCloseTo(origLng, 3)
  })

  it('calcula correctamente zonas en otros hemisferios (e.g. Buenos Aires -34.60, -58.38)', () => {
    const utm = latLngToUtm(-34.6037, -58.3816)
    expect(utm.zone).toBe(21)
    expect(utm.isNorthern).toBe(false)
    expect(utm.northing).toBeGreaterThan(6000000)
    expect(utm.formatted).toContain('UTM 21S')
  })
})
