import { describe, it, expect } from 'vitest'
import { formatCurrencyShort } from '../currencyUtil'

describe('formatCurrencyShort', () => {
  it('should format numbers less than 1,000 without a suffix', () => {
    expect(formatCurrencyShort(999)).toBe('$999')
    expect(formatCurrencyShort(-999)).toBe('-$999')
  })

  it('should format numbers in thousands with "K" suffix', () => {
    expect(formatCurrencyShort(1_000)).toBe('$1K')
    expect(formatCurrencyShort(15_500)).toBe('$15.5K')
    expect(formatCurrencyShort(-2_300)).toBe('-$2.3K')
  })

  it('should format numbers in millions with "M" suffix', () => {
    expect(formatCurrencyShort(1_000_000)).toBe('$1M')
    expect(formatCurrencyShort(25_000_000)).toBe('$25M')
    expect(formatCurrencyShort(-3_500_000)).toBe('-$3.5M')
  })

  it('should format numbers in billions with "B" suffix', () => {
    expect(formatCurrencyShort(1_000_000_000)).toBe('$1B')
    expect(formatCurrencyShort(2_500_000_000)).toBe('$2.5B')
    expect(formatCurrencyShort(-7_000_000_000)).toBe('-$7B')
  })

  it('should use the provided currency code', () => {
    expect(formatCurrencyShort(1_000, 'EUR')).toBe('€1K')
    expect(formatCurrencyShort(1_000_000, 'JPY')).toBe('¥1M')
  })

  it('should handle zero correctly', () => {
    expect(formatCurrencyShort(0)).toBe('$0')
  })
})
