import { describe, it, expect } from 'vitest'
import { haversineKm, MAX_MEETUP_DISTANCE_KM, encryptField, decryptField } from '@/server/lib'

describe('haversineKm (M7)', () => {
  it('distancia cero entre el mismo punto', () => {
    expect(haversineKm(10.48, -66.9, 10.48, -66.9)).toBeCloseTo(0, 5)
  })

  it('Caracas → La Guaira ≈ 12-18 km', () => {
    const d = haversineKm(10.4806, -66.9036, 10.6002, -66.9344)
    expect(d).toBeGreaterThan(10)
    expect(d).toBeLessThan(20)
  })

  it('~0.5 grado de latitud ≈ 55 km (regla de oro)', () => {
    const d = haversineKm(10, -66, 10.5, -66)
    expect(d).toBeGreaterThan(50)
    expect(d).toBeLessThan(60)
  })

  it('el límite de la plataforma es 10 km', () => {
    expect(MAX_MEETUP_DISTANCE_KM).toBe(10)
  })
})

describe('KYC cifrado (M6)', () => {
  it('cifra y descifra correctamente', () => {
    const enc = encryptField('usuario@correo.com')
    expect(enc).not.toContain('usuario@correo.com')
    expect(decryptField(enc)).toBe('usuario@correo.com')
  })

  it('produce IVs aleatorios (cifrados distintos para el mismo texto)', () => {
    const a = encryptField('secreto')
    const b = encryptField('secreto')
    expect(a).not.toBe(b)
    expect(decryptField(a)).toBe('secreto')
    expect(decryptField(b)).toBe('secreto')
  })

  it('devuelve vacío si el dato no es válido', () => {
    expect(decryptField('no-es-cifrado')).toBe('')
    expect(decryptField('')).toBe('')
  })
})
