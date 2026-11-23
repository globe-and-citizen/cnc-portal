import { describe, expect, it } from 'vitest'
import { sumFiatValues, valueTokenAmount } from '../valuation'

describe('fiat availability', () => {
  it.each([null, undefined, NaN, Infinity, -1])(
    'keeps an unavailable or invalid quote %s unknown',
    (price) => {
      expect(valueTokenAmount(2, price)).toBeNull()
    }
  )
  it('distinguishes a true zero quote from a missing quote', () => {
    expect(valueTokenAmount(2, 0)).toBe(0)
    expect(valueTokenAmount(2, null)).toBeNull()
    expect(valueTokenAmount(0, null)).toBe(0)
  })
  it('sums known values and refuses a misleading partial total', () => {
    expect(sumFiatValues([2, 3, 0])).toBe(5)
    expect(sumFiatValues([2, null, 0])).toBeNull()
    expect(sumFiatValues([2, undefined])).toBeNull()
    expect(sumFiatValues([])).toBe(0)
  })
  it('keeps invalid quantities and overflowing valuations unknown', () => {
    expect(valueTokenAmount(NaN, 2)).toBeNull()
    expect(valueTokenAmount(Number.MAX_VALUE, 2)).toBeNull()
    expect(sumFiatValues([Number.MAX_VALUE, Number.MAX_VALUE])).toBeNull()
  })
})
