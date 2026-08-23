import { describe, it, expect } from 'vitest'
import {
  formatUnits,
  parseUnits,
  isExpired,
  toOperation,
  getFriendlyError,
  OperationStatus,
  RawOperation,
} from '@/lib/escrow'

describe('formatUnits', () => {
  it('formatea con 18 decimals', () => {
    expect(formatUnits(100n * 10n ** 18n, 18)).toBe('100')
    expect(formatUnits(123456789n, 18)).toBe('0.000000000123456789')
  })

  it('formatea tokens con 6 decimals (USDT)', () => {
    expect(formatUnits(5000000000n, 6)).toBe('5000')
    expect(formatUnits(123456n, 6)).toBe('0.123456')
  })

  it('formatea montos cero', () => {
    expect(formatUnits(0n, 18)).toBe('0')
  })
})

describe('parseUnits', () => {
  it('convierte input decimal a unidades crudas', () => {
    expect(parseUnits('100', 18)).toBe(100n * 10n ** 18n)
    expect(parseUnits('1.5', 6)).toBe(1500000n)
    expect(parseUnits('0.123456', 6)).toBe(123456n)
  })

  it('trunca decimales por encima del máximo del token', () => {
    expect(parseUnits('1.123456789', 6)).toBe(1123456n)
  })

  it('lanza error con input inválido', () => {
    expect(() => parseUnits('abc', 18)).toThrow('Invalid amount')
    expect(() => parseUnits('', 18)).toThrow('Invalid amount')
  })
})

describe('isExpired', () => {
  const base = {
    id: 1n,
    user1: '0x1',
    tokenA: '0xa',
    tokenB: '0xb',
    amountA: 100n,
    amountB: 200n,
    status: OperationStatus.Active,
    createdAt: 1000n,
    deadline: 0n,
    closedAt: 0n,
  }

  it('no está vencida sin deadline', () => {
    expect(isExpired(base, 99999999999999n)).toBe(false)
  })

  it('no está vencida antes del deadline', () => {
    const op = { ...base, deadline: 2000n } // deadline en segundos
    expect(isExpired(op, 1000n)).toBe(false) // now en ms (1 s)
  })

  it('está vencida tras el deadline', () => {
    const op = { ...base, deadline: 2000n } // deadline en segundos
    expect(isExpired(op, 3_000_000n)).toBe(true) // now en ms (3000 s)
  })

  it('no está vencida si ya se completó', () => {
    const op = { ...base, deadline: 1000n, status: OperationStatus.Completed }
    expect(isExpired(op, 5_000_000n)).toBe(false)
  })
})

describe('toOperation', () => {
  it('normaliza el struct crudo de ethers', () => {
    const raw: RawOperation = {
      id: 1,
      user1: '0xabc',
      tokenA: '0xaaa',
      tokenB: '0xbbb',
      amountA: 1000,
      amountB: '2000',
      status: 3,
      createdAt: 100,
      deadline: 0,
      closedAt: 0,
    }
    const op = toOperation(raw)
    expect(op.id).toBe(1n)
    expect(op.amountA).toBe(1000n)
    expect(op.amountB).toBe(2000n)
    expect(op.status).toBe(OperationStatus.Disputed)
  })
})

describe('getFriendlyError', () => {
  it('traduce revert reasons conocidos a español', () => {
    expect(getFriendlyError({ info: { error: { message: 'execution reverted: Token not allowed' } } })).toContain(
      'no está autorizado'
    )
    expect(getFriendlyError(new Error('execution reverted: Operation is not active'))).toContain(
      'ya no está activa'
    )
  })

  it('devuelve el mensaje original si no es traducible', () => {
    expect(getFriendlyError(new Error('some unknown error'))).toBe('some unknown error')
  })

  it('devuelve fallback para errores vacíos', () => {
    expect(getFriendlyError(null)).toBe('Transaction failed')
  })
})
