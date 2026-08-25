import { describe, it, expect } from 'vitest'
import { Wallet } from 'ethers'
import {
  computeTrustLevel,
  itemPayload,
  verifySignature,
} from '@/server/lib'

describe('computeTrustLevel (M4)', () => {
  it('nuevo usuario sin actividad es Iniciado', () => {
    expect(computeTrustLevel({ avgRating: 0, completedCount: 0 })).toBe('iniciado')
  })

  it('con reputación >= 3.5 y >= 3 operaciones es Común', () => {
    expect(computeTrustLevel({ avgRating: 3.8, completedCount: 5 })).toBe('comun')
  })

  it('con reputación baja no asciende aunque tenga volumen', () => {
    expect(computeTrustLevel({ avgRating: 2.5, completedCount: 10 })).toBe('iniciado')
  })

  it('con reputación >= 4.2 y >= 25 operaciones es Frecuente', () => {
    expect(computeTrustLevel({ avgRating: 4.4, completedCount: 30 })).toBe('frecuente')
  })

  it('las empresas son Frecuente', () => {
    expect(computeTrustLevel({ avgRating: 0, completedCount: 0, isBusiness: true })).toBe('frecuente')
  })

  it('el rol Socio tiene prioridad', () => {
    expect(
      computeTrustLevel({ avgRating: 0, completedCount: 0, isBusiness: true, isSocio: true })
    ).toBe('socio')
  })
})

describe('itemPayload (M2 certificación)', () => {
  it('normaliza el payload canónico (owner en minúsculas, trims)', () => {
    const p = itemPayload({ owner: '0xABC', title: '  Bici  ', description: 'x', category: 'Otros', quantity: 2 })
    expect(p).toBe(
      JSON.stringify({ owner: '0xabc', title: 'Bici', description: 'x', category: 'Otros', quantity: 2 })
    )
  })
})

describe('verifySignature (M8)', () => {
  // Claves fijas (jsdom no expone crypto aleatorio para Wallet.createRandom)
  const wallet = new Wallet('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d')

  it('acepta la firma de la wallet propietaria', () => {
    const payload = itemPayload({ owner: wallet.address, title: 'Bici', description: '', category: 'general', quantity: 1 })
    const signature = wallet.signMessageSync(payload)
    expect(verifySignature(payload, signature, wallet.address)).toBe(true)
  })

  it('rechaza firma de otra wallet', () => {
    const other = new Wallet('0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a')
    const payload = itemPayload({ owner: wallet.address, title: 'Bici', description: '', category: 'general', quantity: 1 })
    const signature = other.signMessageSync(payload)
    expect(verifySignature(payload, signature, wallet.address)).toBe(false)
  })

  it('rechaza payload vacío o sin firma', () => {
    expect(verifySignature('', '0x', wallet.address)).toBe(false)
    expect(verifySignature('payload', '', wallet.address)).toBe(false)
  })
})
